/**
 * History Menu
 * Display historical records of all CCB instances
 */

const { renderPage, renderTable } = require('cli-menu-kit');
const { getHistoryArray } = require('../../services/history-service');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const path = require('path');
const os = require('os');

async function showHistory() {
  const history = getHistoryArray();
  const currentInstances = await getCCBInstances();

  // Create a map of current instances by hash for quick lookup
  const instanceMap = new Map();
  for (const inst of currentInstances) {
    const hash = path.basename(path.dirname(inst.stateFile));
    instanceMap.set(hash, inst);
  }

  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('history.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (history.length === 0) {
          console.log(`  ${tc('history.noHistory')}\n`);
          return;
        }

        console.log(`  \x1b[2m${tc('history.legend')}\x1b[0m`);
        console.log('');

        // Prepare table data
        const tableData = history.slice(0, 20).map((record, idx) => {
          const projectName = path.basename(record.workDir);
          const shortHash = record.instanceHash.substring(0, 8);
          const type = record.managed ? tc('history.type.multi') : tc('history.type.ccb');

          // Format date more compactly: MM/DD HH:MM
          const date = new Date(record.firstSeen);
          const firstSeen = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

          // Check if instance exists in current instances
          const currentInst = instanceMap.get(record.instanceHash);
          let statusDisplay;
          let tmuxPane = '-';

          if (currentInst) {
            // Instance exists, get current status
            if (currentInst.status === 'active') {
              statusDisplay = tc('history.status.active');
            } else if (currentInst.status === 'zombie') {
              statusDisplay = tc('history.status.zombie');
            } else {
              statusDisplay = tc('history.status.dead');
            }
            // Get tmux pane title if available, truncate if too long
            if (currentInst.tmuxPane && currentInst.tmuxPane.title) {
              tmuxPane = currentInst.tmuxPane.title;
              if (tmuxPane.length > 20) {
                tmuxPane = tmuxPane.substring(0, 17) + '...';
              }
            } else {
              tmuxPane = '-';
            }
          } else {
            // Instance removed (not in current instances)
            statusDisplay = tc('history.status.removed');
          }

          return {
            no: idx + 1,
            project: projectName,
            hash: shortHash,
            status: statusDisplay,
            type: type,
            tmux: tmuxPane,
            firstSeen: firstSeen,
            runs: record.totalRuns || 1
          };
        });

        // Render table
        renderTable({
          columns: [
            { header: tc('history.columns.number'), key: 'no', align: 'center', width: 4 },
            { header: tc('history.columns.project'), key: 'project', align: 'left', width: 18 },
            { header: tc('history.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('history.columns.status'), key: 'status', align: 'left', width: 10 },
            { header: tc('history.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('history.columns.tmux'), key: 'tmux', align: 'left', width: 22 },
            { header: tc('history.columns.runs'), key: 'runs', align: 'center', width: 6 },
            { header: tc('history.columns.first'), key: 'firstSeen', align: 'left', width: 12 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'  // Dim/gray color for borders
        });
      }
    },
    footer: {
      menu: {
        options: [`b. ${tc('history.back')}`],
        allowLetterKeys: true,
        preserveOnSelect: true
      }
    }
  });

  return result.value;
}

module.exports = { showHistory };
