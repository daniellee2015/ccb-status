/**
 * Instance List Menu
 * Level 2 - Display all CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const os = require('os');
const path = require('path');
const { getCCBInstances } = require('../../services/instance-service');

async function showInstanceList() {
  const instances = getCCBInstances();

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

    return `${idx + 1}. ${projectName} (${shortHash}) [${status}]`;
  });

  // Add 'Back' option to the main menu
  options.push('b. Back');

  const result = await renderPage({
    header: {
      type: 'simple',
      text: 'CCB Instances'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: options,
        allowNumberKeys: true,
        allowLetterKeys: true
      }
    },
    footer: {
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
