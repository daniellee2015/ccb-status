/**
 * Restart Dead Menu
 * Select and restart dead instances
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { restartDead } = require('../../services/restart-service');
const { tc } = require('../../i18n');
const path = require('path');

async function showRestartDead() {
  // Get all instances and filter dead ones
  const instances = await getCCBInstances();
  const deadInstances = instances.filter(inst => inst.status === 'dead');

  if (deadInstances.length === 0) {
    const result = await renderPage({
      header: {
        type: 'section',
        text: tc('restartDead.title')
      },
      mainArea: {
        type: 'display',
        render: () => {
          console.log(`  \x1b[32m${tc('restartDead.noDead')}\x1b[0m`);
        }
      },
      footer: {
        menu: {
          options: [`b. ${tc('restartDead.back')}`],
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
      text: tc('restartDead.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('restartDead.selectPrompt')}`);
        console.log('');

        // Prepare table data
        const tableData = deadInstances.map((inst, idx) => {
          const projectName = path.basename(inst.workDir);
          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
          const type = inst.managed ? '[Multi]' : '[CCB]';
          const tmuxStatus = inst.tmuxPane ? '✓' : '✗';

          return {
            no: idx + 1,
            project: projectName,
            hash: shortHash,
            type: type,
            tmux: tmuxStatus,
            workDir: inst.workDir.length > 30 ? '...' + inst.workDir.slice(-27) : inst.workDir
          };
        });

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: tc('restartDead.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('restartDead.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('restartDead.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('restartDead.columns.tmux'), key: 'tmux', align: 'center', width: 6 },
            { header: tc('restartDead.columns.workDir'), key: 'workDir', align: 'left', width: 30 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });

        console.log('');
        console.log(`  \x1b[2m${tc('restartDead.legend')}\x1b[0m`);
      }
    },
    footer: {
      menu: {
        options: [`s. ${tc('restartDead.select')}`, `b. ${tc('restartDead.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b') {
    return 'back';
  }

  // Show checkbox menu for selection
  const checkboxOptions = deadInstances.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    const tmuxStatus = inst.tmuxPane ? '✓' : '✗';
    return `${idx + 1}. ${projectName} [${shortHash}] - Tmux: ${tmuxStatus}`;
  });

  const selectResult = await menu.checkbox({
    title: tc('restartDead.checkboxTitle'),
    options: checkboxOptions,
    minSelections: 0
  });

  if (!selectResult || selectResult.indices.length === 0) {
    return 'cancelled';
  }

  // Get selected instances
  const selectedInstances = selectResult.indices.map(idx => deadInstances[idx]);

  // Confirm restart
  const confirmed = await menu.booleanH(
    `\n  ⚠️  ${tc('restartDead.confirmPrompt', { count: selectedInstances.length })}`,
    false
  );

  if (!confirmed) {
    return 'cancelled';
  }

  // Perform restart
  console.log(`\n  ${tc('restartDead.restarting')}\n`);

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    const instanceHash = path.basename(path.dirname(instance.stateFile));
    const shortHash = instanceHash.substring(0, 8);

    console.log(`  ${tc('restartDead.processing', { project: projectName, hash: shortHash })}`);

    const result = await restartDead(instance);
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
    console.log(`  \x1b[32m${tc('restartDead.successCount', { count: successCount })}\x1b[0m`);
  }
  if (failCount > 0) {
    console.log(`  \x1b[31m${tc('restartDead.failCount', { count: failCount })}\x1b[0m`);
  }

  console.log('');
  console.log(`  ${tc('restartDead.pressEnter')}`);

  // Wait for Enter
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  return 'completed';
}

module.exports = { showRestartDead };
