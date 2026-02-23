/**
 * Cleanup Operations Menu
 * Level 3 - Cleanup CCB instance states
 */

const { renderPage } = require('cli-menu-kit');
const { tc } = require('../../i18n');

async function showCleanupOperations() {
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('cleanupOperations.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('cleanupOperations.description')}`);
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          `1. ${tc('instanceManagement.cleanupDead')} - \x1b[2m${tc('instanceManagement.cleanupDeadHint')}\x1b[0m`,
          `2. ${tc('instanceManagement.cleanupZombie')} - \x1b[2m${tc('instanceManagement.cleanupZombieHint')}\x1b[0m`,
          `3. ${tc('instanceManagement.cleanupAll')} - \x1b[2m${tc('instanceManagement.cleanupAllHint')}\x1b[0m`,
          `b. ${tc('instanceManagement.back')}`
        ],
        allowLetterKeys: true
      }
    }
  });

  return result.value;
}

module.exports = { showCleanupOperations };
