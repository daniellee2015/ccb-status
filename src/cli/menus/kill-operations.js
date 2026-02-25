/**
 * Kill Operations Menu
 * Level 3 - Kill CCB instances
 */

const { renderPage } = require('cli-menu-kit');
const { tc } = require('../../i18n');

async function showKillOperations() {
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('killOperations.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('killOperations.description')}`);
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          `1. ${tc('instanceManagement.killActive')} - \x1b[2m${tc('instanceManagement.killActiveHint')}\x1b[0m`,
          `2. ${tc('instanceManagement.killZombie')} - \x1b[2m${tc('instanceManagement.killZombieHint')}\x1b[0m`,
          `3. ${tc('instanceManagement.killOrphaned')} - \x1b[2m${tc('instanceManagement.killOrphanedHint')}\x1b[0m`,
          `4. ${tc('instanceManagement.killAll')} - \x1b[2m${tc('instanceManagement.killAllHint')}\x1b[0m`,
          `b. ${tc('instanceManagement.back')}`
        ],
        allowLetterKeys: true
      }
    }
  });

  return result.value;
}

module.exports = { showKillOperations };
