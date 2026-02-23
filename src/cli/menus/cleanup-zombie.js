/**
 * Cleanup Zombie Instances Menu
 * Select and cleanup state files for zombie CCB instances
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const { safeKillProcess, validateWorkDir } = require('../../utils/pid-validator');
const path = require('path');
const fs = require('fs').promises;

async function showCleanupZombie() {
  // Get all instances and filter zombies
  const instances = await getCCBInstances();
  const zombieInstances = instances.filter(inst => inst.status === 'zombie');

  if (zombieInstances.length === 0) {
    const result = await renderPage({
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

  // Show zombie instances and let user select
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

        // Prepare table data
        const tableData = zombieInstances.map((inst, idx) => {
          const projectName = path.basename(inst.workDir);
          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
          const type = inst.managed ? '[Multi]' : '[CCB]';

          return {
            no: idx + 1,
            project: projectName,
            hash: shortHash,
            type: type,
            pid: inst.pid,
            workDir: inst.workDir
          };
        });

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: tc('cleanupZombie.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('cleanupZombie.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('cleanupZombie.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('cleanupZombie.columns.pid'), key: 'pid', align: 'right', width: 8 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });
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

  // Show checkbox menu for selection
  const checkboxOptions = zombieInstances.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    return `${idx + 1}. ${projectName} (${shortHash}) - PID ${inst.pid}`;
  });

  const checkboxResult = await menu.checkbox({
    prompt: tc('cleanupZombie.selectInstances'),
    options: checkboxOptions,
    minSelections: 1
  });

  if (!checkboxResult || !checkboxResult.indices || checkboxResult.indices.length === 0) {
    return 'back';
  }

  // Confirm before cleanup
  const selectedInstances = checkboxResult.indices.map(idx => zombieInstances[idx]);
  const confirmResult = await menu.boolean({
    question: tc('cleanupZombie.confirmCleanup', { count: selectedInstances.length }),
    defaultValue: false
  });

  if (!confirmResult) {
    return 'back';
  }

  // Cleanup selected instances
  console.log('');
  console.log(`  ${tc('cleanupZombie.cleaning')}`);
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

      let killed = false;
      let stateRemoved = false;
      let sessionRemoved = 0;

      // First try to kill the zombie process with validation
      // For zombie processes (<defunct>), killing may fail but that's OK
      if (instance.pid) {
        const killResult = await safeKillProcess(instance.pid, instance.workDir);
        if (killResult.success) {
          killed = true;
        } else if (killResult.error.includes('Process not found')) {
          // Process already dead, that's fine
          killed = false;
        } else if (killResult.error.includes('Not a CCB process')) {
          // Might be a <defunct> zombie process, skip killing and just cleanup
          killed = false;
        } else {
          // Other errors, log but continue with cleanup
          console.log(`  \x1b[33m⚠\x1b[0m ${projectName} - Could not kill process: ${killResult.error}`);
          killed = false;
        }
      }

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

      console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('cleanupZombie.cleaned')} (killed: ${killed}, state: ${stateRemoved ? 'removed' : 'not found'}, sessions: ${sessionRemoved})`);
      results.push({ instance, success: true, killed, stateRemoved, sessionRemoved });
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('cleanupZombie.failed', { error: e.message })}`);
      results.push({ instance, success: false, error: e.message });
    }
  }

  console.log('');
  console.log(`  ${tc('cleanupZombie.complete')}`);
  console.log('');

  // Wait before returning
  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showCleanupZombie };
