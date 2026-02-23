/**
 * Restart Dead Menu
 * Select and restart dead instances
 */

const { renderPage } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { restartDead } = require('../../services/restart-service');
const { tc } = require('../../i18n');
const path = require('path');
const {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
} = require('../../services/instance-operations-helper');

async function showRestartDead() {
  // Get all instances and filter dead ones
  const instances = await getCCBInstances();
  const deadInstances = filterInstancesByStatus(instances, 'dead');

  if (deadInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('restartDead.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('restartDead.noDead')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('restartDead.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Display dead instances table
  await displayInstanceTable(deadInstances, tc, 'restartDead');

  // Select instances with cancel option
  const selectedInstances = await selectInstances(deadInstances, tc, 'restartDead');
  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation with detailed table
  const confirmed = await confirmOperation(selectedInstances, tc, 'restartDead');
  if (!confirmed) {
    return 'back';
  }

  // Perform restart
  console.log(`\n  ${tc('restartDead.restarting')}\n`);

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    const instanceHash = path.basename(path.dirname(instance.stateFile));
    const shortHash = instanceHash.substring(0, 8);

    console.log(`  ${tc('restartDead.processing', { project: projectName, hash: shortHash })}`);

    const result = await restartDead(instance);
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
    console.log(`  \x1b[32m${tc('restartDead.successCount', { count: successCount })}\x1b[0m`);
  }
  if (failCount > 0) {
    console.log(`  \x1b[31m${tc('restartDead.failCount', { count: failCount })}\x1b[0m`);
  }

  console.log('');
  console.log(`  ${tc('restartDead.pressEnter')}`);

  // Wait for Enter
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  return 'completed';
}

module.exports = { showRestartDead };
