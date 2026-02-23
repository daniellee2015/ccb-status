/**
 * Cleanup Dead Instances Menu
 * Select and cleanup state files for dead CCB instances
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const { validateWorkDir } = require('../../utils/pid-validator');
const path = require('path');
const fs = require('fs').promises;

async function showCleanupDead() {
  // Get all instances and filter dead
  const instances = await getCCBInstances();
  const deadInstances = instances.filter(inst => inst.status === 'dead');

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

  // Show dead instances and let user select
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('cleanupDead.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('cleanupDead.selectPrompt')}`);
        console.log('');

        // Prepare table data
        const tableData = deadInstances.map((inst, idx) => {
          const projectName = path.basename(inst.workDir);
          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
          const type = inst.managed ? '[Multi]' : '[CCB]';

          return {
            no: idx + 1,
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
            { header: tc('cleanupDead.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('cleanupDead.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('cleanupDead.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('cleanupDead.columns.workDir'), key: 'workDir', align: 'left', width: 40 }
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
        options: [`s. ${tc('cleanupDead.select')}`, `b. ${tc('cleanupDead.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Show checkbox menu for selection
  const checkboxOptions = deadInstances.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    return `${idx + 1}. ${projectName} (${shortHash})`;
  });

  const checkboxResult = await menu.checkbox({
    prompt: tc('cleanupDead.selectInstances'),
    options: checkboxOptions
  });

  if (!checkboxResult || !checkboxResult.indices || checkboxResult.indices.length === 0) {
    return 'back';
  }

  // Confirm before cleanup
  const selectedInstances = checkboxResult.indices.map(idx => deadInstances[idx]);
  const confirmResult = await menu.boolean({
    question: tc('cleanupDead.confirmCleanup', { count: selectedInstances.length }),
    defaultValue: false
  });

  if (!confirmResult.value) {
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
