/**
 * Recover Disconnected Menu
 * Select and recover disconnected instances
 */

const { renderPage } = require('cli-menu-kit');
const { getInstances } = require('../../utils/instance-query');
const { recoverDisconnected } = require('../../services/restart-service');
const { tc } = require('../../i18n');
const path = require('path');
const {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
} = require('../../services/instance-operations-helper');

async function showRecoverDisconnected() {
  // Get all instances and filter disconnected ones
  const instances = await getInstances();
  const disconnectedInstances = filterInstancesByStatus(instances, 'disconnected');

  if (disconnectedInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('recoverDisconnected.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('recoverDisconnected.noDisconnected')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('recoverDisconnected.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Display disconnected instances table
  await displayInstanceTable(disconnectedInstances, tc, 'recoverDisconnected');

  // Select instances with cancel option
  const selectedInstances = await selectInstances(disconnectedInstances, tc, 'recoverDisconnected');
  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation with detailed table
  const confirmed = await confirmOperation(selectedInstances, tc, 'recoverDisconnected');
  if (!confirmed) {
    return 'back';
  }

  // Perform recovery
  console.log(`\n  ${tc('recoverDisconnected.recovering')}\n`);

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    const shortHash = instance.pid ? `PID:${instance.pid}` : 'Unknown';

    console.log(`  ${tc('recoverDisconnected.processing', { project: projectName, hash: shortHash })}`);

    const result = await recoverDisconnected(instance);
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
    console.log(`  \x1b[32m${tc('recoverDisconnected.successCount', { count: successCount })}\x1b[0m`);
  }
  if (failCount > 0) {
    console.log(`  \x1b[31m${tc('recoverDisconnected.failCount', { count: failCount })}\x1b[0m`);
  }

  console.log('');
  console.log(`  ${tc('recoverDisconnected.pressEnter')}`);

  // Wait for Enter
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  return 'completed';
}

module.exports = { showRecoverDisconnected };

