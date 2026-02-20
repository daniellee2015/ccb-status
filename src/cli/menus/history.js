/**
 * History Menu
 * Display historical records of all CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { getHistoryArray } = require('../../services/history-service');
const path = require('path');
const os = require('os');

async function showHistory() {
  const history = getHistoryArray();

  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Instance History'
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (history.length === 0) {
          console.log('  No history records found.\n');
          return;
        }

        console.log('  Status Legend:');
        console.log('    ✓ Active   - Instance is currently running');
        console.log('    ✗ Dead     - Instance stopped but askd.json exists');
        console.log('    ⊗ Removed  - Instance deleted (askd.json removed)');
        console.log('');
        console.log('  Type Legend:');
        console.log('    [CCB]   - Standalone CCB instance');
        console.log('    [Multi] - Managed by ccb-multi');
        console.log('');

        // Display history table
        console.log('  Recent Instances:');
        console.log('  ' + '─'.repeat(70));

        for (const record of history.slice(0, 20)) {
          const projectName = path.basename(record.workDir);
          const shortHash = record.instanceHash.substring(0, 8);
          const type = record.managed ? '[Multi]' : '[CCB]  ';
          const lastSeen = new Date(record.lastSeen).toLocaleString();

          console.log(`  ${projectName.padEnd(20)} ${shortHash} ${type} ${lastSeen}`);
        }

        console.log('  ' + '─'.repeat(70));
        console.log('');
      }
    },
    footer: {
      menu: {
        options: ['b. Back'],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: ['B Back']
    }
  });

  return result.value;
}

module.exports = { showHistory };
