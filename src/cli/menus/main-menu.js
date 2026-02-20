/**
 * Main Menu
 * Level 1 - Main entry point
 */

const { renderPage, generateMenuHints } = require('cli-menu-kit');

async function showMainMenu() {
  const result = await renderPage({
    header: {
      type: 'full',
      title: 'CCB Status Monitor',
      version: '0.1.0',
      menuTitle: 'Select an option:'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: [
          '1. View Instance List',
          '2. Refresh Status',
          '3. Cleanup Zombie Processes',
          '4. Exit'
        ],
        allowNumberKeys: true,
        allowLetterKeys: false
      }
    },
    footer: {
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true
      })
    }
  });

  return result.index;
}

module.exports = { showMainMenu };
