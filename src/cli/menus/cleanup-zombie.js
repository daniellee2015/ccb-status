/**
 * Cleanup Zombie Instances Menu
 * Select and cleanup state files for zombie CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { filterInstancesByStatus, displayInstanceTable, selectInstances, confirmOperation } = require('../../services/instance-operations-helper');
const { tc } = require('../../i18n');
const { safeKillProcess, validateWorkDir } = require('../../utils/pid-validator');
const path = require('path');
const fs = require('fs').promises;

async function showCleanupZombie() {
  // Get all instances and filter zombies
  const instances = await getCCBInstances();
  const zombieInstances = filterInstancesByStatus(instances, 'zombie');

  if (zombieInstances.length === 0) {
    await renderPage({
      header: {
        type: 'section',
        text: tc('cleanupZombie.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('cleanupZombie.noZombies')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('cleanupZombie.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Show zombie instances
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('cleanupZombie.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('cleanupZombie.selectPrompt')}`);
        console.log('');

        displayInstanceTable(zombieInstances, tc, 'cleanupZombie.columns');
      }
    },
    footer: {
      menu: {
        options: [`s. ${tc('cleanupZombie.select')}`, `b. ${tc('cleanupZombie.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Select instances
  const selectedInstances = await selectInstances(zombieInstances, tc, 'cleanupZombie.selectInstances');

  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation
  const confirmed = await confirmOperation(selectedInstances, tc, 'cleanupZombie');

  if (!confirmed) {
    return 'back';
  }

  // Cleanup selected instances
  console.log('');
  console.log(`  ${tc('cleanupZombie.cleaning')}`);
  console.log('');

  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    try {
      // Try to kill the process first (zombie = askd running but CCB not running)
      let killed = false;
      const pidToKill = instance.askdPid || instance.pid;
      if (pidToKill) {
        const killResult = await safeKillProcess(pidToKill, instance.workDir);
        if (killResult.success) {
          killed = true;
        } else if (killResult.error.includes('Not a CCB process')) {
          // Defunct zombie, skip killing
          killed = false;
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('cleanupZombie.killFailed', { error: killResult.error })}`);
          continue;
        }
      }

      // Remove state file
      if (instance.stateFile) {
        await fs.unlink(instance.stateFile);
        console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('cleanupZombie.cleaned')}`);
      }
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('cleanupZombie.failed', { error: e.message })}`);
    }
  }

  console.log('');
  console.log(`  ${tc('cleanupZombie.complete')}`);
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showCleanupZombie };
