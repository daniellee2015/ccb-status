/**
 * Restart Zombie Menu
 * Select and restart zombie instances
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { restartZombie } = require('../../services/restart-service');
const { tc } = require('../../i18n');
const path = require('path');

async function showRestartZombie() {
  // Get all instances and filter zombies
  const instances = await getCCBInstances();
  const zombies = instances.filter(inst => inst.status === 'zombie');

  if (zombies.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('restartZombie.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('restartZombie.noZombies')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('restartZombie.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Show zombie instances and let user select
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('restartZombie.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('restartZombie.selectPrompt')}`);
        console.log('');

        // Prepare table data
        const tableData = zombies.map((inst, idx) => {
          const projectName = path.basename(inst.workDir);
          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
          const type = inst.managed ? '[Multi]' : '[CCB]';

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
            { header: tc('restartZombie.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('restartZombie.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('restartZombie.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('restartZombie.columns.pid'), key: 'pid', align: 'right', width: 8 },
            { header: tc('restartZombie.columns.port'), key: 'port', align: 'right', width: 8 }
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
        options: [`s. ${tc('restartZombie.select')}`, `b. ${tc('restartZombie.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b') {
    return 'back';
  }

  // Show checkbox menu for selection
  const checkboxOptions = zombies.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    return `${idx + 1}. ${projectName} [${shortHash}] - PID ${inst.pid}`;
  });

  const selectResult = await menu.checkbox({
    title: tc('restartZombie.checkboxTitle'),
    options: checkboxOptions,
    minSelections: 0
  });

  if (!selectResult || selectResult.indices.length === 0) {
    return 'cancelled';
  }

  // Get selected instances
  const selectedInstances = selectResult.indices.map(idx => zombies[idx]);

  // Confirm restart
  const confirmed = await menu.booleanH(
    `\n  ⚠️  ${tc('restartZombie.confirmPrompt', { count: selectedInstances.length })}`,
    false
  );

  if (!confirmed) {
    return 'cancelled';
  }

  // Perform restart
  console.log(`\n  ${tc('restartZombie.restarting')}\n`);

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    const instanceHash = path.basename(path.dirname(instance.stateFile));
    const shortHash = instanceHash.substring(0, 8);

    console.log(`  ${tc('restartZombie.processing', { project: projectName, hash: shortHash })}`);

    const result = await restartZombie(instance);
    results.push({
      project: projectName,
      hash: shortHash,
      success: result.success,
      message: result.message
    });

    if (result.success) {
      console.log(`    \x1b[32m✓ ${result.message}\x1b[0m`);
    } else {
      console.log(`    \x1b[31m✗ ${result.message}\x1b[0m`);
    }
  }

  // Show summary
  console.log('');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  if (successCount > 0) {
    console.log(`  \x1b[32m${tc('restartZombie.successCount', { count: successCount })}\x1b[0m`);
  }
  if (failCount > 0) {
    console.log(`  \x1b[31m${tc('restartZombie.failCount', { count: failCount })}\x1b[0m`);
  }

  console.log('');
  console.log(`  ${tc('restartZombie.pressEnter')}`);

  // Wait for Enter
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  return 'completed';
}

module.exports = { showRestartZombie };
