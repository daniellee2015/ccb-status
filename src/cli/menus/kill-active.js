/**
 * Kill Active Instances Menu
 * Select and kill active CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { filterInstancesByStatus, displayInstanceTable, selectInstances, confirmOperation } = require('../../services/instance-operations-helper');
const { tc } = require('../../i18n');
const { safeKillProcess } = require('../../utils/pid-validator');
const path = require('path');

async function showKillActive() {
  // Get all instances and filter active
  const instances = await getCCBInstances();
  const activeInstances = filterInstancesByStatus(instances, 'active');

  if (activeInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('killActive.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('killActive.noActive')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('killActive.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Show active instances and let user select
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('killActive.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('killActive.selectPrompt')}`);
        console.log('');

        displayInstanceTable(activeInstances, tc, 'killActive.columns');
      }
    },
    footer: {
      menu: {
        options: [`s. ${tc('killActive.select')}`, `b. ${tc('killActive.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Show checkbox menu for selection
  const selectedInstances = await selectInstances(activeInstances, tc, 'killActive.selectInstances');

  if (!selectedInstances) {
    return 'back';
  }

  // Confirm before killing
  const confirmed = await confirmOperation(selectedInstances, tc, 'killActive');

  if (!confirmed) {
    return 'back';
  }

  // Kill selected instances
  console.log('');
  console.log(`  ${tc('killActive.killing')}`);
  console.log('');

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    try {
      // Kill daemon process with validation
      if (instance.pid) {
        const result = await safeKillProcess(instance.pid, instance.workDir);
        if (result.success) {
          console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('killActive.killed', { pid: instance.pid })}`);
          results.push({ instance, success: true });
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killActive.failed', { error: result.error })}`);
          results.push({ instance, success: false, error: result.error });
        }
      }
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killActive.failed', { error: e.message })}`);
      results.push({ instance, success: false, error: e.message });
    }
  }

  console.log('');
  console.log(`  ${tc('killActive.complete')}`);
  console.log('');

  // Wait before returning
  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showKillActive };
