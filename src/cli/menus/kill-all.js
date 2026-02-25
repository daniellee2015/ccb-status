/**
 * Kill All Instances Menu
 * Select and kill all CCB instances (active + zombie)
 */

const { renderPage } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { filterInstancesByStatus, displayInstanceTable, selectInstances, confirmOperation } = require('../../services/instance-operations-helper');
const { tc } = require('../../i18n');
const { safeKillProcess } = require('../../utils/pid-validator');
const path = require('path');

async function showKillAll() {
  // Get all instances (active + zombie)
  const instances = await getCCBInstances();
  const killableInstances = filterInstancesByStatus(instances, ['active', 'zombie']);

  if (killableInstances.length === 0) {
    await renderPage({
      header: {
        type: 'section',
        text: tc('killAll.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('killAll.noInstances')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('killAll.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Show instances
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('killAll.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('killAll.selectPrompt')}`);
        console.log('');

        displayInstanceTable(killableInstances, tc, 'killAll.columns');
      }
    },
    footer: {
      menu: {
        options: [`s. ${tc('killAll.select')}`, `b. ${tc('killAll.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Select instances
  const selectedInstances = await selectInstances(killableInstances, tc, 'killAll.selectInstances');

  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation
  const confirmed = await confirmOperation(selectedInstances, tc, 'killAll');

  if (!confirmed) {
    return 'back';
  }

  // Kill selected instances
  console.log('');
  console.log(`  ${tc('killAll.killing')}`);
  console.log('');

  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    try {
      // For kill-all: prefer askdPid for graceful shutdown, fallback to pid
      const pidToKill = instance.askdPid || instance.pid;
      if (pidToKill) {
        const result = await safeKillProcess(pidToKill, instance.workDir);
        if (result.success) {
          console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('killAll.killed', { pid: pidToKill })}`);
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killAll.failed', { error: result.error })}`);
        }
      }
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killAll.failed', { error: e.message })}`);
    }
  }

  console.log('');
  console.log(`  ${tc('killAll.complete')}`);
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showKillAll };
