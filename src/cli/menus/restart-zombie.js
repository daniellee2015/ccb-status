/**
 * Restart Zombie Menu
 * Select and restart zombie instances
 */

const { renderPage } = require('cli-menu-kit');
const { getInstances } = require('../../utils/instance-query');
const { restartZombie } = require('../../services/restart-service');
const { tc } = require('../../i18n');
const path = require('path');
const {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
} = require('../../services/instance-operations-helper');

async function showRestartZombie() {
  // Get all instances and filter zombies
  const instances = await getInstances();
  const zombies = filterInstancesByStatus(instances, 'zombie');

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

  // Display zombie instances table
  await displayInstanceTable(zombies, tc, 'restartZombie');

  // Select instances with cancel option
  const selectedInstances = await selectInstances(zombies, tc, 'restartZombie');
  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation with detailed table
  const confirmed = await confirmOperation(selectedInstances, tc, 'restartZombie');
  if (!confirmed) {
    return 'back';
  }

  // Perform restart
  console.log(`\n  ${tc('restartZombie.restarting')}\n`);

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    let shortHash;
    if (instance.stateFile) {
      const instanceHash = path.basename(path.dirname(instance.stateFile));
      shortHash = instanceHash.substring(0, 8);
    } else {
      shortHash = instance.pid ? `PID:${instance.pid}` : 'Unknown';
    }

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
