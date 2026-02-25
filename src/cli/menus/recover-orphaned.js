/**
 * Recover Orphaned Menu
 * Select and recover orphaned instances
 */

const { renderPage } = require('cli-menu-kit');
const { getInstances } = require('../../utils/instance-query');
const { recoverOrphaned } = require('../../services/restart-service');
const { tc } = require('../../i18n');
const path = require('path');
const {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
} = require('../../services/instance-operations-helper');

async function showRecoverOrphaned() {
  // Get all instances and filter orphaned ones
  const instances = await getInstances();
  const orphanedInstances = filterInstancesByStatus(instances, 'orphaned');

  if (orphanedInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('recoverOrphaned.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('recoverOrphaned.noOrphaned')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('recoverOrphaned.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Display orphaned instances table
  await displayInstanceTable(orphanedInstances, tc, 'recoverOrphaned.columns');

  // Select instances with cancel option
  const selectedInstances = await selectInstances(orphanedInstances, tc, 'recoverOrphaned.checkboxTitle');
  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation with detailed table
  const confirmed = await confirmOperation(selectedInstances, tc, 'recoverOrphaned');
  if (!confirmed) {
    return 'back';
  }

  // Perform recovery
  console.log(`\n  ${tc('recoverOrphaned.recovering')}\n`);

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    const shortHash = instance.pid ? `PID:${instance.pid}` : 'Unknown';

    console.log(`  ${tc('recoverOrphaned.processing', { project: projectName, hash: shortHash })}`);

    const result = await recoverOrphaned(instance);
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
    console.log(`  \x1b[32m${tc('recoverOrphaned.successCount', { count: successCount })}\x1b[0m`);
  }
  if (failCount > 0) {
    console.log(`  \x1b[31m${tc('recoverOrphaned.failCount', { count: failCount })}\x1b[0m`);
  }

  console.log('');
  console.log(`  ${tc('recoverOrphaned.pressEnter')}`);

  // Wait for Enter
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  return 'completed';
}

module.exports = { showRecoverOrphaned };

