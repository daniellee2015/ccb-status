/**
 * Language Settings Menu
 * 语言设置菜单
 */

const { renderPage } = require('cli-menu-kit');
const { tc, setLanguage, getLanguage } = require('../../i18n');

async function showLanguageSettings() {
  const currentLang = getLanguage();

  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('languageSettings.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('languageSettings.currentLanguage')} ${currentLang === 'zh' ? tc('languageSettings.chinese') : tc('languageSettings.english')}`);
        console.log('');
        console.log(`  ${tc('languageSettings.selectLanguage')}`);
      }
    },
    footer: {
      menu: {
        options: [
          `1. ${tc('languageSettings.english')}`,
          `2. ${tc('languageSettings.chinese')}`,
          `b. ${tc('languageSettings.back')}`
        ],
        allowNumberKeys: true,
        allowLetterKeys: true
      }
    }
  });

  // Handle language selection
  if (result.index === 0) {
    // English
    setLanguage('en');
    console.log(`\n  ${tc('languageSettings.languageChanged')}: ${tc('languageSettings.english')}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'language-changed';
  } else if (result.index === 1) {
    // Chinese
    setLanguage('zh');
    console.log(`\n  ${tc('languageSettings.languageChanged')}: ${tc('languageSettings.chinese')}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'language-changed';
  }

  return result.value;
}

module.exports = { showLanguageSettings };
