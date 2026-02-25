/**
 * Cleanup Menu
 * Level 2 - Detect and cleanup zombie processes
 */

const { renderPage, renderTable } = require('cli-menu-kit');
const { getInstances } = require('../../utils/instance-query');
const { groupByStatus } = require('../../utils/instance-filters');
const { tc } = require('../../i18n');
const path = require('path');

async function showCleanup(lastDetection = null) {
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('cleanup.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (!lastDetection) {
          // No detection yet, show prompt
          console.log(`  \x1b[2m${tc('cleanup.detectPrompt')}\x1b[0m`);
          console.log('');
          console.log(`  \x1b[36m${tc('cleanup.scenarioGuide')}\x1b[0m`);
          console.log(`    \x1b[2m• ${tc('cleanup.zombieScenario')}\x1b[0m`);
          console.log(`    \x1b[2m• ${tc('cleanup.deadScenario')}\x1b[0m`);
          return;
        }

        const { active, zombies, dead } = lastDetection;

        // Show detection summary
        console.log(`  ${tc('cleanup.statusDetection')}`);
        console.log(`    \x1b[32m${tc('cleanup.active', { count: active.length })}\x1b[0m`);
        console.log(`    \x1b[33m${tc('cleanup.zombie', { count: zombies.length })}\x1b[0m`);
        console.log(`    \x1b[90m${tc('cleanup.dead', { count: dead.length })}\x1b[0m`);
        console.log('');

        if (zombies.length === 0) {
          console.log(`  \x1b[32m${tc('cleanup.noZombies')}\x1b[0m`);
          return;
        }

        console.log(`  \x1b[33m${tc('cleanup.foundZombies', { count: zombies.length })}\x1b[0m`);
        console.log('');

        // Prepare table data
        const tableData = zombies.map((inst, idx) => {
          let projectName = path.basename(inst.workDir);
          if (inst.workDir.includes('.ccb-instances')) {
            const parts = inst.workDir.split(path.sep);
            const ccbIndex = parts.indexOf('.ccb-instances');
            if (ccbIndex > 0) {
              projectName = parts[ccbIndex - 1];
            }
          }

          let shortHash;
          if (inst.stateFile) {
            const instanceHash = path.basename(path.dirname(inst.stateFile));
            shortHash = instanceHash.substring(0, 8);
          } else {
            shortHash = inst.pid ? `PID:${inst.pid}` : 'Unknown';
          }
          const type = inst.workDir.includes('.ccb-instances') ? '[Multi]' : '[CCB]';

          return {
            no: idx + 1,
            project: projectName,
            hash: shortHash,
            type: type,
            pid: inst.pid,
            port: inst.port
          };
        });

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: 'Project', key: 'project', align: 'left', width: 20 },
            { header: 'Hash', key: 'hash', align: 'left', width: 10 },
            { header: 'Type', key: 'type', align: 'left', width: 9 },
            { header: 'PID', key: 'pid', align: 'right', width: 8 },
            { header: 'Port', key: 'port', align: 'right', width: 8 }
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
        options: [`d. ${tc('cleanup.detectStatus')}`, `z. ${tc('cleanup.restartZombie')}`, `r. ${tc('cleanup.restartDead')}`, `c. ${tc('cleanup.cleanupAll')}`, `b. ${tc('cleanup.back')}`],
        allowLetterKeys: true,
        preserveOnSelect: true
      }
    }
  });

  return { action: result.value, lastDetection };
}

async function detectStatus() {
  const instances = await getInstances();
  return groupByStatus(instances);
}

module.exports = { showCleanup, detectStatus };
