/**
 * Main Menu
 * Level 1 - Main entry point
 * 主菜单 - 一级入口
 *
 * Modified to use i18n for internationalization support
 * 已修改为使用 i18n 支持国际化
 */

const { renderPage, generateMenuHints } = require('cli-menu-kit');
const { tc } = require('../../i18n');

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
      title: tc('mainMenu.title'),
      description: tc('mainMenu.description'),
      version: '0.1.0',
      url: 'https://github.com/daniellee2015/ccb-status',
      menuTitle: tc('mainMenu.menuTitle')
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: [
          `1. ${tc('mainMenu.options.viewInstances')}`,
          `2. ${tc('mainMenu.options.viewHistory')}`,
          `3. ${tc('mainMenu.options.refreshStatus')}`,
          `4. ${tc('mainMenu.options.instanceManagement')}`,
          `5. ${tc('mainMenu.options.tmuxManagement')}`,
          `6. ${tc('mainMenu.options.languageSettings')}`,
          `7. ${tc('mainMenu.options.exit')}`
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
