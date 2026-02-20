/**
 * Tmux Window Management Menu
 * Level 2 - Manage tmux sessions and windows
 */

const { renderPage, renderTable } = require('cli-menu-kit');
const { execSync } = require('child_process');

/**
 * Get all tmux sessions and windows
 */
function getTmuxSessions() {
  try {
    const result = execSync('tmux list-windows -a -F "#{session_name}\\t#{window_index}\\t#{window_name}\\t#{window_active}\\t#{window_panes}\\t#{pane_current_path}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    const sessions = {};
    for (const line of result.split('\n')) {
      if (!line) continue;
      const [sessionName, windowIndex, windowName, windowActive, windowPanes, panePath] = line.split('\t');

      if (!sessions[sessionName]) {
        sessions[sessionName] = [];
      }

      sessions[sessionName].push({
        index: windowIndex,
        name: windowName,
        active: windowActive === '1',
        panes: parseInt(windowPanes) || 1,
        path: panePath,
        isCCB: panePath && panePath.includes('.ccb-instances')
      });
    }

    return sessions;
  } catch (e) {
    return {};
  }
}

async function showTmuxManagement(lastSessions = null) {
  const sessions = lastSessions || getTmuxSessions();
  const sessionCount = Object.keys(sessions).length;
  let totalWindows = 0;
  let ccbWindows = 0;

  for (const windows of Object.values(sessions)) {
    totalWindows += windows.length;
    ccbWindows += windows.filter(w => w.isCCB).length;
  }

  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Tmux Window Management'
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (sessionCount === 0) {
          console.log('  \x1b[33m⚠ No tmux sessions found\x1b[0m');
          return;
        }

        console.log('  Session Overview:');
        console.log(`    Sessions: ${sessionCount}`);
        console.log(`    Total Windows: ${totalWindows}`);
        console.log(`    CCB Windows: \x1b[32m${ccbWindows}\x1b[0m`);
        console.log('');

        // Prepare table data
        const tableData = [];
        let rowNum = 1;

        for (const [sessionName, windows] of Object.entries(sessions)) {
          for (const window of windows) {
            tableData.push({
              no: rowNum++,
              session: sessionName,
              window: `${window.index}:${window.name}`,
              panes: window.panes,
              type: window.isCCB ? '[CCB]' : '[Other]',
              active: window.active ? '●' : '○'
            });
          }
        }

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: 'Session', key: 'session', align: 'left', width: 15 },
            { header: 'Window', key: 'window', align: 'left', width: 20 },
            { header: 'Panes', key: 'panes', align: 'center', width: 7 },
            { header: 'Type', key: 'type', align: 'left', width: 9 },
            { header: 'Active', key: 'active', align: 'center', width: 8 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });
      }
    },
    footer: {
      menu: {
        options: sessionCount > 0
          ? ['r. Refresh', 'k. Kill Window', 's. Kill Session', 'b. Back']
          : ['r. Refresh', 'b. Back'],
        allowLetterKeys: true
      }
    }
  });

  return { action: result.value, sessions };
}

module.exports = { showTmuxManagement, getTmuxSessions };
