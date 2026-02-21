/**
 * Configuration Service
 * Manages persistent user configuration (language settings, etc.)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Config file location: ~/.ccb-status/config.json
const CONFIG_DIR = path.join(os.homedir(), '.ccb-status');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  language: 'en',
  version: '0.1.0'
};

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from file
 * @returns {object} Configuration object
 */
function loadConfig() {
  try {
    ensureConfigDir();

    if (!fs.existsSync(CONFIG_FILE)) {
      // Create default config file if it doesn't exist
      saveConfig(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);

    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.warn(`Failed to load config: ${error.message}`);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 * @param {object} config - Configuration object to save
 */
function saveConfig(config) {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to save config: ${error.message}`);
  }
}

/**
 * Get a configuration value
 * @param {string} key - Configuration key
 * @returns {any} Configuration value
 */
function getConfigValue(key) {
  const config = loadConfig();
  return config[key];
}

/**
 * Set a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Configuration value
 */
function setConfigValue(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

/**
 * Get language setting
 * @returns {string} Language code ('en' or 'zh')
 */
function getLanguage() {
  return getConfigValue('language') || 'en';
}

/**
 * Set language setting
 * @param {string} lang - Language code ('en' or 'zh')
 */
function setLanguage(lang) {
  setConfigValue('language', lang);
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  getLanguage,
  setLanguage
};
