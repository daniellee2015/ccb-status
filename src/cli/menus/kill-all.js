/**
 * Kill All Instances Menu
 * Select and kill all CCB instances (active + zombie)
 */

const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { tc } = require('../../i18n');
const { safeKillProcess } = require('../../utils/pid-validator');
const path = require('path');

async function showKillAll() {
  // Get all instances (active + zombie)
  const instances = await getCCBInstances();
  const killableInstances = instances.filter(inst => inst.status === 'active' || inst.status === 'zombie');

  if (killableInstances.length === 0) {
    const result = await renderPage({
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
    return result.value;
  }

  // Show all instances and let user select
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

        // Prepare table data
        const tableData = killableInstances.map((inst, idx) => {
          const projectName = path.basename(inst.workDir);
          const instanceHash = path.basename(path.dirname(inst.stateFile));
          const shortHash = instanceHash.substring(0, 8);
          const type = inst.managed ? '[Multi]' : '[CCB]';
          const status = inst.status === 'active' ? '✓' : '⚠';

          return {
            no: idx + 1,
            status: status,
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
            { header: 'S', key: 'status', align: 'center', width: 3 },
            { header: tc('killAll.columns.project'), key: 'project', align: 'left', width: 20 },
            { header: tc('killAll.columns.hash'), key: 'hash', align: 'left', width: 10 },
            { header: tc('killAll.columns.type'), key: 'type', align: 'left', width: 9 },
            { header: tc('killAll.columns.pid'), key: 'pid', align: 'right', width: 8 },
            { header: tc('killAll.columns.port'), key: 'port', align: 'right', width: 8 }
          ],
          data: tableData,
          showBorders: true,
          showHeaderSeparator: true,
          borderColor: '\x1b[2m'
        });

        console.log('');
        console.log(`  \x1b[2m${tc('killAll.legend')}\x1b[0m`);
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

  // Show checkbox menu for selection
  const checkboxOptions = killableInstances.map((inst, idx) => {
    const projectName = path.basename(inst.workDir);
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);
    const statusLabel = inst.status === 'active' ? 'Active' : 'Zombie';
    return `${idx + 1}. ${projectName} (${shortHash}) - ${statusLabel} - PID ${inst.pid}`;
  });

  const checkboxResult = await menu.checkbox({
    message: tc('killAll.selectInstances'),
    options: checkboxOptions
  });

  if (!checkboxResult || !checkboxResult.indices || checkboxResult.indices.length === 0) {
    return 'back';
  }

  // Confirm before killing
  const selectedInstances = checkboxResult.indices.map(idx => killableInstances[idx]);
  const confirmResult = await menu.boolean({
    message: tc('killAll.confirmKill', { count: selectedInstances.length }),
    default: false
  });

  if (!confirmResult) {
    return 'back';
  }

  // Kill selected instances
  console.log('');
  console.log(`  ${tc('killAll.killing')}`);
  console.log('');

  const results = [];
  for (const instance of selectedInstances) {
    const projectName = path.basename(instance.workDir);
    try {
      // Kill daemon process with validation
      if (instance.pid) {
        const result = await safeKillProcess(instance.pid, instance.workDir);
        if (result.success) {
          console.log(`  \x1b[32m✓\x1b[0m ${projectName} - ${tc('killAll.killed', { pid: instance.pid })}`);
          results.push({ instance, success: true });
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killAll.failed', { error: result.error })}`);
          results.push({ instance, success: false, error: result.error });
        }
      }
    } catch (e) {
      console.log(`  \x1b[31m✗\x1b[0m ${projectName} - ${tc('killAll.failed', { error: e.message })}`);
      results.push({ instance, success: false, error: e.message });
    }
  }

  console.log('');
  console.log(`  ${tc('killAll.complete')}`);
  console.log('');

  // Wait before returning
  await new Promise(resolve => setTimeout(resolve, 2000));

  return 'completed';
}

module.exports = { showKillAll };
