/**
 * Restart Operations Menu
 * Level 3 - Restart CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { tc } = require('../../i18n');

async function showRestartOperations() {
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('restartOperations.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('restartOperations.description')}`);
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          `1. ${tc('instanceManagement.restartZombie')} - \x1b[2m${tc('instanceManagement.restartZombieHint')}\x1b[0m`,
          `2. ${tc('instanceManagement.restartDead')} - \x1b[2m${tc('instanceManagement.restartDeadHint')}\x1b[0m`,
          `3. ${tc('instanceManagement.restartAll')} - \x1b[2m${tc('instanceManagement.restartAllHint')}\x1b[0m`,
          `b. ${tc('instanceManagement.back')}`
        ],
        allowLetterKeys: true
      }
    }
  });

  return result.value;
}

module.exports = { showRestartOperations };
