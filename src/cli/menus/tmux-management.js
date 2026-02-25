/**
 * Tmux Window Management Menu
 * Level 2 - Manage tmux sessions and windows
 */

const { renderPage, renderTable } = require('cli-menu-kit');
const { execSync } = require('child_process');
const { getInstances } = require('../../utils/instance-query');
const { getHistory } = require('../../services/history-service');
const { formatInstanceName } = require('../../services/display-formatter');
const { tc } = require('../../i18n');
const path = require('path');

/**
 * Get all tmux sessions and windows, with CCB daemon mapping
 * @param {boolean} onlyAttached - Only show attached sessions
 */
/**
 * Get all tmux sessions with CCB daemon mapping
 * @param {boolean} onlyAttached - Only show attached sessions
 */
async function getTmuxSessions(onlyAttached = true) {
  try {
    // Get CCB instances first
    const ccbInstances = await getInstances();

    // First, get list of attached sessions if needed
    const attachedSessions = new Set();
    if (onlyAttached) {
      const sessionsResult = execSync('tmux list-sessions -F "#{session_name}\t#{session_attached}"', {
        encoding: 'utf8',
        timeout: 2000
      });
      for (const line of sessionsResult.split('\n')) {
        if (!line) continue;
        const [name, attached] = line.split('\t');
        if (attached === '1') {
          attachedSessions.add(name);
        }
      }
    }

    // Build a map: for each active CCB, find which session it's in
    const sessionToCCB = {};

    for (const instance of ccbInstances) {
      const projectName = path.basename(instance.workDir);

      // Get all panes and find the one with matching "Ready (project-name)" title
      try {
        const panesResult = execSync('tmux list-panes -a -F "#{session_name}\t#{pane_id}\t#{pane_title}"', {
          encoding: 'utf8',
          timeout: 2000
        });

        for (const line of panesResult.split('\n')) {
          if (!line) continue;
          const [sessionName, paneId, paneTitle] = line.split('\t');

          // Match "Ready (project-name)" for this specific CCB instance
          if (paneTitle && paneTitle.includes(`Ready (${projectName})`)) {
            // If we're filtering by attached, only consider attached sessions
            if (onlyAttached && !attachedSessions.has(sessionName)) {
              continue;
            }

            sessionToCCB[sessionName] = {
              pid: instance.pid,
              status: instance.status,
              project: projectName,
              workDir: instance.workDir
            };
            break; // Found the session for this daemon
          }
        }
      } catch (e) {
        // Ignore errors in pane listing
      }
    }

    // Get session info with window and pane counts
    const sessionsResult = execSync('tmux list-sessions -F "#{session_name}\t#{session_attached}\t#{session_windows}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    const sessions = {};
    for (const line of sessionsResult.split('\n')) {
      if (!line) continue;
      const [name, attached, windowCount] = line.split('\t');

      // Filter by attached status if requested
      if (onlyAttached && attached !== '1') {
        continue;
      }

      // Count total panes in this session
      let paneCount = 0;
      try {
        const paneResult = execSync(`tmux list-panes -t ${name} -s`, {
          encoding: 'utf8',
          timeout: 2000
        });
        paneCount = paneResult.split('\n').filter(l => l).length;
      } catch (e) {
        paneCount = parseInt(windowCount) || 1;
      }

      // Get detailed window information for this session
      const windows = [];
      try {
        const windowsResult = execSync(`tmux list-windows -t ${name} -F "#{window_index}\\t#{window_name}\\t#{window_panes}"`, {
          encoding: 'utf8',
          timeout: 2000
        });

        for (const windowLine of windowsResult.split('\n')) {
          if (!windowLine) continue;
          const [index, windowName, panes] = windowLine.split('\t');

          // Check if this window contains a CCB instance
          const ccbInfo = sessionToCCB[name] || null;
          const isCCB = ccbInfo !== null && parseInt(windowCount) === 1; // CCB sessions have only 1 window

          windows.push({
            index: parseInt(index),
            name: windowName,
            panes: parseInt(panes),
            ccbInfo: isCCB ? ccbInfo : null,
            isCCB: isCCB
          });
        }
      } catch (e) {
        // If we can't get window details, create a minimal entry
        windows.push({
          index: 0,
          name: 'unknown',
          panes: paneCount,
          ccbInfo: sessionToCCB[name] || null,
          isCCB: sessionToCCB[name] !== null
        });
      }

      sessions[name] = {
        attached: attached === '1',
        windowCount: parseInt(windowCount) || 1,
        paneCount: paneCount,
        ccbInfo: sessionToCCB[name] || null,
        windows: windows
      };
    }

    return sessions;
  } catch (e) {
    return { error: e.message };
  }
}

async function showTmuxManagement(lastSessions = null, showAll = false) {
  const sessions = lastSessions || await getTmuxSessions(!showAll);
  const historyMap = getHistory(); // Get history for parent project lookup

  // Check for error
  if (sessions.error) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('tmuxManagement.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[31m${tc('tmuxManagement.failedToGet', { error: sessions.error })}\x1b[0m`);
          console.log(`  \x1b[2m${tc('tmuxManagement.makeSureTmux')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`r. ${tc('tmuxManagement.refresh')}`, `b. ${tc('tmuxManagement.back')}`],
          allowLetterKeys: true
        }
      }
    });

    return { action: result.value, sessions: {}, showAll };
  }

  const sessionCount = Object.keys(sessions).length;
  let totalWindows = 0;
  let totalPanes = 0;
  let ccbSessions = 0;
  let attachedCount = 0;

  for (const [sessionName, sessionData] of Object.entries(sessions)) {
    if (sessionData.attached) attachedCount++;
    totalWindows += sessionData.windowCount;
    totalPanes += sessionData.paneCount;
    if (sessionData.ccbInfo) ccbSessions++;
  }

  const result = await renderPage({
    header: {
      type: 'section',
      text: `${tc('tmuxManagement.title')} ${showAll ? tc('tmuxManagement.allSessions') : tc('tmuxManagement.attachedOnly')}`
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (sessionCount === 0) {
          console.log(`  \x1b[33m${tc('tmuxManagement.noSessions')}\x1b[0m`);
          return;
        }

        console.log(`  ${tc('tmuxManagement.sessionOverview')}`);
        console.log(`    ${tc('tmuxManagement.totalSessions', { count: sessionCount, attached: attachedCount })}`);
        console.log(`    ${tc('tmuxManagement.totalWindows', { count: totalWindows })}`);
        console.log(`    ${tc('tmuxManagement.totalPanes', { count: totalPanes })}`);
        console.log(`    ${tc('tmuxManagement.runningCCB', { count: ccbSessions })}`);
        console.log(`    ${tc('tmuxManagement.view', { mode: showAll ? tc('tmuxManagement.viewAll') : tc('tmuxManagement.viewAttached') })}`);
        console.log('');

        // Prepare table data
        const tableData = [];
        let rowNum = 1;

        for (const [sessionName, sessionData] of Object.entries(sessions)) {
          let pid = '-';
          let status = '-';
          let project = '-';
          let parent = '-';

          if (sessionData.ccbInfo) {
            // Format project name using unified formatter
            const displayName = formatInstanceName(
              { workDir: sessionData.ccbInfo.workDir },
              historyMap,
              'with-parent'
            );
            pid = sessionData.ccbInfo.pid.toString();
            status = sessionData.ccbInfo.status;
            project = displayName.project;
            parent = displayName.parent;
          }

          tableData.push({
            no: rowNum++,
            session: sessionName + (sessionData.attached ? ' *' : ''),
            windows: sessionData.windowCount,
            panes: sessionData.paneCount,
            pid: pid,
            status: status,
            project: project,
            parent: parent
          });
        }

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: 'Tmux Session', key: 'session', align: 'left', width: 15 },
            { header: 'Windows', key: 'windows', align: 'center', width: 9 },
            { header: 'Panes', key: 'panes', align: 'center', width: 7 },
            { header: 'PID', key: 'pid', align: 'left', width: 8 },
            { header: 'Status', key: 'status', align: 'left', width: 10 },
            { header: 'Project', key: 'project', align: 'left', width: 18 },
            { header: 'Parent', key: 'parent', align: 'left', width: 16 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });

        console.log('');
        console.log(`  \x1b[2m${tc('tmuxManagement.legend')}\x1b[0m`);
      }
    },
    footer: {
      menu: {
        options: sessionCount > 0
          ? [`r. ${tc('tmuxManagement.refresh')}`, `a. ${tc('tmuxManagement.toggleAll')}`, `k. ${tc('tmuxManagement.killWindow')}`, `s. ${tc('tmuxManagement.killSession')}`, `b. ${tc('tmuxManagement.back')}`]
          : [`r. ${tc('tmuxManagement.refresh')}`, `b. ${tc('tmuxManagement.back')}`],
        allowLetterKeys: true
      }
    }
  });

  return { action: result.value, sessions, showAll };
}

module.exports = { showTmuxManagement, getTmuxSessions };
