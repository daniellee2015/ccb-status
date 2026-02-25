/**
 * Kill Zombie Instances Menu
 * Select and kill zombie CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const { safeKillProcess } = require('../../utils/pid-validator');
const path = require('path');
const {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
} = require('../../services/instance-operations-helper');

async function showKillZombie() {
  // Get all instances and filter zombies
  const instances = await getCCBInstances();
  const zombieInstances = filterInstancesByStatus(instances, 'zombie');

  if (zombieInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('killZombie.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('killZombie.noZombies')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('killZombie.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Display zombie instances table
  await displayInstanceTable(zombieInstances, tc, 'killZombie');

  // Select instances with cancel option
  const selectedInstances = await selectInstances(zombieInstances, tc, 'killZombie');
  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation with detailed table
  const confirmed = await confirmOperation(selectedInstances, tc, 'killZombie');
  if (!confirmed) {
    return 'back';
  }

  // Kill selected instances
  console.log('');
  console.log(`  ${tc('killZombie.killing')}`);
  console.log('');

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    try {
      // For zombie: kill askd daemon (askdPid)
      // Zombie = askd running but CCB not running or port not listening
      const pidToKill = instance.askdPid || instance.pid;
      if (pidToKill) {
        const result = await safeKillProcess(pidToKill, instance.workDir);
        if (result.success) {
          console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('killZombie.killed', { pid: pidToKill })}`);
          results.push({ instance, success: true });
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killZombie.failed', { error: result.error })}`);
          results.push({ instance, success: false, error: result.error });
        }
      }
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killZombie.failed', { error: e.message })}`);
      results.push({ instance, success: false, error: e.message });
    }
  }

  console.log('');
  console.log(`  ${tc('killZombie.complete')}`);
  console.log('');

  // Wait before returning
  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showKillZombie };
