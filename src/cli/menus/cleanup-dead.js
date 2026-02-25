/**
 * Cleanup Dead Instances Menu
 * Select and cleanup state files for dead CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { getInstances } = require('../../utils/instance-query');
const { tc } = require('../../i18n');
const { validateWorkDir } = require('../../utils/pid-validator');
const path = require('path');
const fs = require('fs').promises;
const {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
} = require('../../services/instance-operations-helper');

async function showCleanupDead() {
  // Get all instances and filter dead
  const instances = await getInstances();
  const deadInstances = filterInstancesByStatus(instances, 'dead');

  if (deadInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('cleanupDead.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('cleanupDead.noDead')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('cleanupDead.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Display dead instances table
  await displayInstanceTable(deadInstances, tc, 'cleanupDead');

  // Select instances with cancel option
  const selectedInstances = await selectInstances(deadInstances, tc, 'cleanupDead');
  if (!selectedInstances) {
    return 'back';
  }

  // Confirm operation with detailed table
  const confirmed = await confirmOperation(selectedInstances, tc, 'cleanupDead');
  if (!confirmed) {
    return 'back';
  }

  // Cleanup selected instances
  console.log('');
  console.log(`  ${tc('cleanupDead.cleaning')}`);
  console.log('');

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    const ccbDir = path.join(instance.workDir, '.ccb');

    try {
      // Validate work directory
      const workDirValidation = await validateWorkDir(instance.workDir);
      if (!workDirValidation.valid) {
        throw new Error(`Invalid work directory: ${workDirValidation.reason}`);
      }

      let stateRemoved = false;
      let sessionRemoved = 0;

      // Remove the actual state file (source of truth)
      try {
        await fs.unlink(instance.stateFile);
        stateRemoved = true;
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }

      // Remove per-project session files (optional)
      try {
        await fs.access(ccbDir);

        // Remove session files
        const sessionFiles = ['.claude-session', '.gemini-session', '.codex-session', '.opencode-session'];
        for (const file of sessionFiles) {
          const filePath = path.join(ccbDir, file);
          try {
            await fs.unlink(filePath);
            sessionRemoved++;
          } catch (e) {
            if (e.code !== 'ENOENT') throw e;
          }
        }
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }

      console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('cleanupDead.cleaned')} (state: ${stateRemoved ? 'removed' : 'not found'}, sessions: ${sessionRemoved})`);
      results.push({ instance, success: true, stateRemoved, sessionRemoved });
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('cleanupDead.failed', { error: e.message })}`);
      results.push({ instance, success: false, error: e.message });
    }
  }

  console.log('');
  console.log(`  ${tc('cleanupDead.complete')}`);
  console.log('');

  // Wait before returning
  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showCleanupDead };
