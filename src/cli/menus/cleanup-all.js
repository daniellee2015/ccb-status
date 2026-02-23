/**
 * Cleanup All Instances Menu
 * Select and cleanup state files for all non-active CCB instances (dead + zombie)
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const { safeKillProcess, validateWorkDir } = require('../../utils/pid-validator');
const path = require('path');
const fs = require('fs').promises;

async function showCleanupAll() {
  // Get all instances (dead + zombie)
  const instances = await getCCBInstances();
  const cleanableInstances = instances.filter(inst => inst.status === 'dead' || inst.status === 'zombie');

  if (cleanableInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('cleanupAll.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('cleanupAll.noInstances')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('cleanupAll.back')}`],
          allowLetterKeys: true
        }
      }
    });
    return 'back';
  }

  // Show all instances and let user select
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('cleanupAll.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('cleanupAll.selectPrompt')}`);
        console.log('');

        // Prepare table data
        const tableData = cleanableInstances.map((inst, idx) => {
          const projectName = path.basename(inst.workDir);
          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
          const type = inst.managed ? '[Multi]' : '[CCB]';
          const status = inst.status === 'dead' ? '✗' : '⚠';

          return {
            no: idx + 1,
            status: status,
            project: projectName,
            hash: shortHash,
            type: type,
            workDir: inst.workDir
          };
        });

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: 'S', key: 'status', align: 'center', width: 3 },
            { header: tc('cleanupAll.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('cleanupAll.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('cleanupAll.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('cleanupAll.columns.workDir'), key: 'workDir', align: 'left', width: 35 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });

        console.log('');
        console.log(`  \x1b[2m${tc('cleanupAll.legend')}\x1b[0m`);
      }
    },
    footer: {
      menu: {
        options: [`s. ${tc('cleanupAll.select')}`, `b. ${tc('cleanupAll.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Show checkbox menu for selection
  const checkboxOptions = cleanableInstances.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    const statusLabel = inst.status === 'dead' ? 'Dead' : 'Zombie';
    return `${idx + 1}. ${projectName} (${shortHash}) - ${statusLabel}`;
  });

  const checkboxResult = await menu.checkbox({
    prompt: tc('cleanupAll.selectInstances'),
    options: checkboxOptions,
    minSelections: 1
  });

  if (!checkboxResult || !checkboxResult.indices || checkboxResult.indices.length === 0) {
    return 'back';
  }

  // Confirm before cleanup
  const selectedInstances = checkboxResult.indices.map(idx => cleanableInstances[idx]);
  const confirmResult = await menu.boolean({
    question: tc('cleanupAll.confirmCleanup', { count: selectedInstances.length }),
    defaultValue: false
  });

  if (!confirmResult) {
    return 'back';
  }

  // Cleanup selected instances
  console.log('');
  console.log(`  ${tc('cleanupAll.cleaning')}`);
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

      // If zombie, kill the process first with validation
      if (instance.status === 'zombie' && instance.pid) {
        const killResult = await safeKillProcess(instance.pid, instance.workDir);
        if (killResult.success) {
          killed = true;
        } else if (!killResult.error.includes('Process not found')) {
          throw new Error(`Failed to kill process: ${killResult.error}`);
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

      const statusInfo = instance.status === 'zombie' ? `killed: ${killed}, ` : '';
      console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('cleanupAll.cleaned')} (${statusInfo}state: ${stateRemoved ? 'removed' : 'not found'}, sessions: ${sessionRemoved})`);
      results.push({ instance, success: true, killed, stateRemoved, sessionRemoved });
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('cleanupAll.failed', { error: e.message })}`);
      results.push({ instance, success: false, error: e.message });
    }
  }

  console.log('');
  console.log(`  ${tc('cleanupAll.complete')}`);
  console.log('');

  // Wait before returning
  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showCleanupAll };
