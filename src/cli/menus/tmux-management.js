/**
 * Tmux Window Management Menu
 * Level 2 - Manage tmux sessions and windows
 */

const { renderPage, renderTable } = require('cli-menu-kit');
const { execSync } = require('child_process');
const { getCCBInstances } = require('../../services/instance-service');
const path = require('path');

/**
 * Get all tmux sessions and windows, with CCB daemon mapping
 * @param {boolean} onlyAttached - Only show attached sessions
 */
async function getTmuxSessions(onlyAttached = true) {
  try {
    // Get CCB instances first
    const ccbInstances = await getCCBInstances();
    const tmuxToDaemon = {};

    // Map tmux panes to daemons
    for (const instance of ccbInstances) {
      if (instance.tmuxPane && instance.tmuxPane.id) {
        // Extract session name from pane ID (e.g., %1 -> session that contains it)
        // We'll match by work directory instead
        tmuxToDaemon[instance.workDir] = {
          pid: instance.pid,
          status: instance.status,
          project: path.basename(instance.workDir)
        };
      }
    }

    // Get session info first
    const sessionsResult = execSync('tmux list-sessions -F "#{session_name}\t#{session_attached}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    const sessionInfo = {};
    for (const line of sessionsResult.split('\n')) {
      if (!line) continue;
      const [name, attached] = line.split('\t');
      sessionInfo[name] = attached === '1';
    }

    // Get windows info with pane paths
    const result = execSync('tmux list-windows -a -F "#{session_name}\t#{window_index}\t#{window_name}\t#{window_active}\t#{window_panes}\t#{pane_current_path}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    const sessions = {};
    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.split('\t');

      if (parts.length < 6) continue;

      const [sessionName, windowIndex, windowName, windowActive, windowPanes, panePath] = parts;

      // Filter by attached status if requested
      if (onlyAttached && !sessionInfo[sessionName]) {
        continue;
      }

      if (!sessions[sessionName]) {
        sessions[sessionName] = {
          attached: sessionInfo[sessionName] || false,
          windows: []
        };
      }

      // Check if this window is running CCB
      const ccbInfo = tmuxToDaemon[panePath];

      sessions[sessionName].windows.push({
        index: windowIndex,
        name: windowName,
        active: windowActive === '1',
        panes: parseInt(windowPanes) || 1,
        path: panePath,
        isCCB: !!ccbInfo,
        ccbInfo: ccbInfo || null
      });
    }

    return sessions;
  } catch (e) {
    return { error: e.message };
  }
}

async function showTmuxManagement(lastSessions = null, showAll = false) {
  const sessions = lastSessions || await getTmuxSessions(!showAll);

  // Check for error
  if (sessions.error) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: 'Tmux Window Management'
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[31m✗ Failed to get tmux sessions: ${sessions.error}\x1b[0m`);
          console.log('  \x1b[2mMake sure tmux is running\x1b[0m');
        }
      },
      footer: {
        menu: {
          options: ['r. Refresh', 'b. Back'],
          allowLetterKeys: true
        }
      }
    });

    return { action: result.value, sessions: {}, showAll };
  }

  const sessionCount = Object.keys(sessions).length;
  let totalWindows = 0;
  let ccbWindows = 0;
  let attachedCount = 0;

  for (const [sessionName, sessionData] of Object.entries(sessions)) {
    if (sessionData.attached) attachedCount++;
    totalWindows += sessionData.windows.length;
    ccbWindows += sessionData.windows.filter(w => w.isCCB).length;
  }

  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Tmux Session Management'
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (sessionCount === 0) {
          console.log('  \x1b[33m⚠ No tmux sessions found\x1b[0m');
          return;
        }

        console.log('  Session Overview:');
        console.log(`    Total Sessions: ${sessionCount} (${attachedCount} attached)`);
        console.log(`    Total Windows: ${totalWindows}`);
        console.log(`    Running CCB: \x1b[32m${ccbWindows}\x1b[0m`);
        console.log(`    View: ${showAll ? 'All sessions' : 'Attached only'}`);
        console.log('');
        console.log('  \x1b[2mStructure: Session → Window → Panes\x1b[0m');
        console.log('');

        // Prepare table data
        const tableData = [];
        let rowNum = 1;

        for (const [sessionName, sessionData] of Object.entries(sessions)) {
          for (const window of sessionData.windows) {
            const windowDisplay = window.active
              ? `${window.index}:${window.name} ●`
              : `${window.index}:${window.name}`;

            let ccbDisplay = '-';
            if (window.ccbInfo) {
              ccbDisplay = `PID ${window.ccbInfo.pid} [${window.ccbInfo.status}]`;
            }

            tableData.push({
              no: rowNum++,
              session: sessionName + (sessionData.attached ? ' *' : ''),
              window: windowDisplay,
              panes: window.panes,
              ccb: ccbDisplay
            });
          }
        }

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: 'Tmux Session', key: 'session', align: 'left', width: 15 },
            { header: 'Window (Index:Name)', key: 'window', align: 'left', width: 25 },
            { header: 'Panes', key: 'panes', align: 'center', width: 7 },
            { header: 'CCB Daemon', key: 'ccb', align: 'left', width: 22 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });

        console.log('');
        console.log('  \x1b[2m* = attached | ● = active window | [active/zombie] = daemon status\x1b[0m');
      }
    },
    footer: {
      menu: {
        options: sessionCount > 0
          ? ['r. Refresh', 'a. Toggle All/Attached', 'k. Kill Window', 's. Kill Session', 'b. Back']
          : ['r. Refresh', 'b. Back'],
        allowLetterKeys: true
      }
    }
  });

  return { action: result.value, sessions, showAll };
}

module.exports = { showTmuxManagement, getTmuxSessions };
