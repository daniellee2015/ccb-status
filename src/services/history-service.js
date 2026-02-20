/**
 * History Service
 * Manages persistent history of CCB instances
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HISTORY_DIR = path.join(os.homedir(), '.ccb-status');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');

/**
 * Ensure history directory exists
 */
function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

/**
 * Load history from file
 */
function loadHistory() {
  ensureHistoryDir();

  if (!fs.existsSync(HISTORY_FILE)) {
    return {};
  }

  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to load history:', e.message);
    return {};
  }
}

/**
 * Save history to file
 */
function saveHistory(history) {
  ensureHistoryDir();

  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save history:', e.message);
  }
}

/**
 * Update history with current instances
 */
function updateHistory(instances) {
  const history = loadHistory();
  const now = new Date().toISOString();

  for (const inst of instances) {
    const key = path.basename(path.dirname(inst.stateFile)); // instance hash

    if (!history[key]) {
      // New instance
      history[key] = {
        instanceHash: key,
        workDir: inst.workDir,
        firstSeen: now,
        lastSeen: now,
        lastAlive: inst.isAlive ? now : null,
        totalRuns: 1,
        managed: inst.workDir.includes('.ccb-instances') // Based on work_dir
      };
    } else {
      // Existing instance
      history[key].lastSeen = now;
      history[key].workDir = inst.workDir; // Update in case it changed
      history[key].managed = inst.workDir.includes('.ccb-instances');

      if (inst.isAlive) {
        history[key].lastAlive = now;
      }
    }
  }

  saveHistory(history);
  return history;
}

/**
 * Get all history records
 */
function getHistory() {
  return loadHistory();
}

/**
 * Get history as array sorted by last seen
 */
function getHistoryArray() {
  const history = loadHistory();
  return Object.values(history).sort((a, b) => {
    return new Date(b.lastSeen) - new Date(a.lastSeen);
  });
}

module.exports = {
  updateHistory,
  getHistory,
  getHistoryArray
};
