/**
 * Kill Active Instances Menu
 * Select and kill active CCB instances
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const { safeKillProcess } = require('../../utils/pid-validator');
const path = require('path');

async function showKillActive() {
  // Get all instances and filter active
  const instances = await getCCBInstances();
  const activeInstances = instances.filter(inst => inst.status === 'active');

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

        // Prepare table data
        const tableData = activeInstances.map((inst, idx) => {
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
            port: inst.port
          };
        });

        // Render table
        renderTable({
          columns: [
            { header: '#', key: 'no', align: 'center', width: 4 },
            { header: tc('killActive.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('killActive.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('killActive.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('killActive.columns.pid'), key: 'pid', align: 'right', width: 8 },
            { header: tc('killActive.columns.port'), key: 'port', align: 'right', width: 8 }
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
        options: [`s. ${tc('killActive.select')}`, `b. ${tc('killActive.back')}`],
        allowLetterKeys: true
      }
    }
  });

  if (result.value === 'b. Back' || result.value.startsWith('b.')) {
    return 'back';
  }

  // Show checkbox menu for selection
  const checkboxOptions = activeInstances.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    return `${idx + 1}. ${projectName} (${shortHash}) - PID ${inst.pid}`;
  });

  const checkboxResult = await menu.checkbox({
    message: tc('killActive.selectInstances'),
    options: checkboxOptions
  });

  if (!checkboxResult || !checkboxResult.indices || checkboxResult.indices.length === 0) {
    return 'back';
  }

  // Confirm before killing
  const selectedInstances = checkboxResult.indices.map(idx => activeInstances[idx]);
  const confirmResult = await menu.boolean({
    message: tc('killActive.confirmKill', { count: selectedInstances.length }),
    default: false
  });

  if (!confirmResult) {
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
