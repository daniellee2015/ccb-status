/**
 * Instance List Menu
 * Level 2 - Display all CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const os = require('os');
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
    const dir = inst.workDir.replace(os.homedir(), '~');
    return `${idx + 1}. ${dir} [${status}]`;
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
