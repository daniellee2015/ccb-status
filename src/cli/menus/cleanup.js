/**
 * Cleanup Menu
 * Level 2 - Detect and cleanup zombie processes
 */

const { renderPage, renderTable } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const path = require('path');

async function showCleanup(lastDetection = null) {
  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Cleanup Zombie Processes'
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (!lastDetection) {
          // No detection yet, show prompt
          console.log('  \x1b[2mPress "d" to detect zombie processes and view cleanup options\x1b[0m');
          return;
        }

        const { active, zombies, dead } = lastDetection;

        // Show detection summary
        console.log('  Status Detection:');
        console.log(`    \x1b[32m✓ Active:  ${active.length}\x1b[0m`);
        console.log(`    \x1b[33m⚠ Zombie:  ${zombies.length}\x1b[0m`);
        console.log(`    \x1b[90m✗ Dead:    ${dead.length}\x1b[0m`);
        console.log('');

        if (zombies.length === 0) {
          console.log('  \x1b[32m✓ No zombie processes found. All instances are healthy.\x1b[0m');
          return;
        }

        console.log(`  \x1b[33m⚠ Found ${zombies.length} zombie process(es) that need cleanup:\x1b[0m`);
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

          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
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
        options: !lastDetection
          ? ['d. Detect Status', 'b. Back']
          : lastDetection.zombies.length > 0
            ? ['d. Re-detect', 'c. Cleanup All', 'r. Restart Zombie', 'b. Back']
            : ['d. Re-detect', 'b. Back'],
        allowLetterKeys: true,
        preserveOnSelect: true
      }
    }
  });

  return { action: result.value, lastDetection };
}

async function detectStatus() {
  const instances = await getCCBInstances();

  const zombies = instances.filter(inst => inst.status === 'zombie');
  const active = instances.filter(inst => inst.status === 'active');
  const dead = instances.filter(inst => inst.status === 'dead');

  return { active, zombies, dead };
}

module.exports = { showCleanup, detectStatus };
