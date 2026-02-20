/**
 * Instance List Menu
 * Level 2 - Display all CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const os = require('os');
const path = require('path');
const { getCCBInstances } = require('../../services/instance-service');
const { updateHistory } = require('../../services/history-service');

async function showInstanceList() {
  const instances = getCCBInstances();

  // Update history with current instances
  updateHistory(instances);

  if (instances.length === 0) {
    console.log('\n  No CCB instances found.\n');
    console.log('  Press Enter to return...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    return null;
  }

  const options = instances.map((inst, idx) => {
    const status = inst.isAlive ? '✓ Active' : '✗ Dead';

    // Get project name from work_dir
    // work_dir format: /path/to/project/.ccb-instances/inst-xxx
    // We want to extract "project" name
    let projectName = path.basename(inst.workDir);

    // If workDir contains .ccb-instances, get the parent's parent directory name
    if (inst.workDir.includes('.ccb-instances')) {
      const parts = inst.workDir.split(path.sep);
      const ccbIndex = parts.indexOf('.ccb-instances');
      if (ccbIndex > 0) {
        projectName = parts[ccbIndex - 1];
      }
    }

    // Get instance hash from stateFile path (parent directory name)
    const instanceHash = path.basename(path.dirname(inst.stateFile));
    const shortHash = instanceHash.substring(0, 8);

    // Determine type based on work_dir
    // If work_dir contains .ccb-instances, it's managed by ccb-multi
    const type = inst.workDir.includes('.ccb-instances') ? '[Multi]' : '[CCB]';

    return `${idx + 1}. ${projectName} (${shortHash}) [${status}] ${type}`;
  });

  // Add 'Back' option to the main menu
  options.push('b. Back');

  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Active Instances'
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log('  ✓ Active  ✗ Dead  |  [CCB] Standalone  [Multi] Managed\n');
      }
    },
    footer: {
      menu: {
        options: options,
        allowNumberKeys: true,
        allowLetterKeys: true
      },
      hints: ['↑↓ Navigate', 'Enter Select', 'B Back']
    }
  });

  // Check if user selected 'Back'
  if (result.value === 'b. Back' || result.index === instances.length) {
    return null;
  }

  return instances[result.index];
}

module.exports = { showInstanceList };
