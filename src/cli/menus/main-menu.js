/**
 * Main Menu
 * Level 1 - Main entry point
 */

const { renderPage, generateMenuHints } = require('cli-menu-kit');

async function showMainMenu() {
  const result = await renderPage({
    header: {
      type: 'full',
      asciiArt: [
        '██╗    ██╗ █████╗  ██████╗  ██████╗  ██████╗  ██████╗ ',
        '██║    ██║██╔══██╗██╔═══██╗██╔═══██╗██╔═══██╗██╔═══██╗',
        '██║ █╗ ██║███████║██║   ██║██║   ██║██║   ██║██║   ██║',
        '██║███╗██║██╔══██║██║   ██║██║   ██║██║   ██║██║   ██║',
        '╚███╔███╔╝██║  ██║╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝',
        ' ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝ '
      ],
      title: 'CCB Status Monitor',
      description: 'Real-time monitoring for CCB instances',
      version: '0.1.0',
      url: 'https://github.com/daniellee2015/ccb-status',
      menuTitle: 'Select an option:'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: [
          '1. View Active Instances',
          '2. View Instance History',
          '3. Refresh Status',
          '4. Cleanup Zombie Processes',
          '5. Exit'
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
