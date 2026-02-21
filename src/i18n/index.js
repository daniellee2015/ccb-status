/**
 * i18n initialization module
 * 国际化初始化模块
 *
 * Provides translation function (tc) with parameter substitution support
 * 提供带参数替换支持的翻译函数 (tc)
 */

const zh = require('./languages/zh');
const en = require('./languages/en');
const { setLanguage: setCliMenuKitLanguage } = require('cli-menu-kit');
const configService = require('../services/config-service');

// Default language: English (en)
// 默认语言：英文 (en)
const DEFAULT_LANG = 'en';

// Available languages
// 可用语言
const languages = {
  zh,
  en
};

// Current language (load from config, fallback to env var or default)
// 当前语言（从配置加载，回退到环境变量或默认值）
let currentLang = configService.getLanguage() || process.env.CCB_LANG || DEFAULT_LANG;

// Initialize cli-menu-kit language to match ccb-status language
// 初始化 cli-menu-kit 语言以匹配 ccb-status 语言
setCliMenuKitLanguage(currentLang);

/**
 * Get translation by key path
 * 通过键路径获取翻译
 *
 * @param {string} keyPath - Dot-separated key path (e.g., 'mainMenu.title')
 * @param {object} params - Optional parameters for substitution (e.g., {count: 5})
 * @returns {string} Translated text
 *
 * @example
 * tc('mainMenu.title') // Returns: 'CCB Status Monitor'
 * tc('instanceList.status.active') // Returns: '✓ 活动'
 */
function tc(keyPath, params = {}) {
  const keys = keyPath.split('.');
  const langData = languages[currentLang] || languages[DEFAULT_LANG];

  // Navigate through the translation object
  // 遍历翻译对象
  let value = langData;
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      // Key not found, return the key path itself
      // 键未找到，返回键路径本身
      console.warn(`Translation key not found: ${keyPath}`);
      return keyPath;
    }
  }

  // If value is not a string, return key path
  // 如果值不是字符串，返回键路径
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${keyPath}`);
    return keyPath;
  }

  // Replace parameters in the format {paramName}
  // 替换格式为 {paramName} 的参数
  let result = value;
  for (const [key, val] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), val);
  }

  return result;
}

/**
 * Set current language
 * 设置当前语言
 *
 * @param {string} lang - Language code ('zh' or 'en')
 */
function setLanguage(lang) {
  if (languages[lang]) {
    currentLang = lang;
    // Save to config file for persistence
    // 保存到配置文件以持久化
    configService.setLanguage(lang);
    // Also set cli-menu-kit language
    // 同时设置 cli-menu-kit 语言
    setCliMenuKitLanguage(lang);
  } else {
    console.warn(`Language not supported: ${lang}, using default: ${DEFAULT_LANG}`);
    currentLang = DEFAULT_LANG;
    configService.setLanguage(DEFAULT_LANG);
    setCliMenuKitLanguage(DEFAULT_LANG);
  }
}

/**
 * Get current language
 * 获取当前语言
 *
 * @returns {string} Current language code
 */
function getLanguage() {
  return currentLang;
}

module.exports = {
  tc,
  setLanguage,
  getLanguage
};
