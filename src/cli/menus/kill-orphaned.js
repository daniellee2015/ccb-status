/**
 * Kill Orphaned Instances Menu
 * Kill orphaned CCB instances (running without dedicated tmux session)
 */

const { renderPage } = require('cli-menu-kit');
const { getOrphaned } = require('../../utils/instance-query');
const { displayInstanceTable, selectInstances, confirmOperation } = require('../../services/instance-operations-helper');
const { tc } = require('../../i18n');
const { safeKillProcess } = require('../../utils/pid-validator');
const path = require('path');

async function showKillOrphaned() {
  const orphanedInstances = await getOrphaned();

  if (orphanedInstances.length === 0) {
    await renderPage({
      header: {
        type: 'section',
        text: tc('killOrphaned.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('killOrphaned.noInstances')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('killOrphaned.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Show orphaned instances
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('killOrphaned.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('killOrphaned.selectPrompt')}`);
        console.log('');

        displayInstanceTable(orphanedInstances, tc, 'killOrphaned');
      }
    },
    footer: {
      menu: {
        options: [`s. ${tc('killOrphaned.select')}`, `b. ${tc('killOrphaned.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Select instances
  const selectedInstances = await selectInstances(orphanedInstances, tc, 'killOrphaned');

  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation
  const confirmed = await confirmOperation(selectedInstances, tc, 'killOrphaned');

  if (!confirmed) {
    return 'back';
  }

  // Kill selected instances
  console.log('');
  console.log(`  ${tc('killOrphaned.killing')}`);
  console.log('');

  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    try {
      // For orphaned instances, kill both askd and ccb
      // Orphaned = both running but no dedicated tmux
      const pidsToKill = [];
      if (instance.askdPid) pidsToKill.push(instance.askdPid);
      if (instance.ccbPid) pidsToKill.push(instance.ccbPid);

      if (pidsToKill.length === 0) {
        console.log(`  \x1b[33m⚠\x1b[0m ${projectName} - No PIDs found`);
        continue;
      }

      let allSuccess = true;
      for (const pid of pidsToKill) {
        const result = await safeKillProcess(pid, instance.workDir);
        if (result.success) {
          console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('killOrphaned.killed', { pid: pid })}`);
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killOrphaned.failed', { error: result.error })}`);
          allSuccess = false;
        }
      }
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killOrphaned.failed', { error: e.message })}`);
    }
  }

  console.log('');
  console.log(`  ${tc('killOrphaned.complete')}`);
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showKillOrphaned };
