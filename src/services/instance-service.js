/**
 * Instance Service
 * Handles CCB instance detection and management
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Check if PID is alive
 */
function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get tmux pane ID for work directory
 */
function getTmuxPaneId(workDir) {
  try {
    const result = execSync('tmux list-panes -a -F "#{pane_id}\\t#{pane_current_path}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      const [paneId, panePath] = line.split('\t');
      if (panePath === workDir) {
        return paneId;
      }
    }
  } catch (e) {
    // tmux not running or error
  }
  return null;
}

/**
 * Get LLM session status
 */
function getLLMStatus(workDir) {
  const status = {
    claude: { active: false, session: null },
    gemini: { active: false, session: null },
    opencode: { active: false, session: null },
    codex: { active: false, session: null }
  };

  try {
    // Check for session files in work directory
    const ccbDir = path.join(workDir, '.ccb');
    if (!fs.existsSync(ccbDir)) return status;

    // Check each LLM session file
    const sessionFiles = {
      claude: '.claude-session',
      gemini: '.gemini-session',
      opencode: '.opencode-session',
      codex: '.codex-session'
    };

    for (const [llm, filename] of Object.entries(sessionFiles)) {
      const sessionFile = path.join(ccbDir, filename);
      if (fs.existsSync(sessionFile)) {
        try {
          const content = fs.readFileSync(sessionFile, 'utf8').trim();
          if (content) {
            status[llm].active = true;
            status[llm].session = content.substring(0, 20) + '...';
          }
        } catch (e) {
          // Skip
        }
      }
    }
  } catch (e) {
    // Skip
  }

  return status;
}

/**
 * Calculate uptime
 */
function getUptime(startedAt) {
  if (!startedAt) return 'Unknown';

  try {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = now - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Get all CCB instances
 */
function getCCBInstances() {
  const cacheDir = path.join(os.homedir(), '.cache', 'ccb', 'projects');
  if (!fs.existsSync(cacheDir)) {
    return [];
  }

  const instances = [];
  const projectDirs = fs.readdirSync(cacheDir);

  for (const projectDir of projectDirs) {
    const stateFile = path.join(cacheDir, projectDir, 'askd.json');
    if (!fs.existsSync(stateFile)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      const pid = parseInt(data.pid || 0);
      const isAlive = isPidAlive(pid);
      const workDir = data.work_dir || projectDir;

      instances.push({
        workDir: workDir,
        pid: pid,
        port: data.port || 0,
        host: data.host || '127.0.0.1',
        isAlive: isAlive,
        stateFile: stateFile,
        startedAt: data.started_at,
        parentPid: data.parent_pid,
        managed: data.managed,
        tmuxPane: getTmuxPaneId(workDir),
        llmStatus: getLLMStatus(workDir),
        uptime: getUptime(data.started_at)
      });
    } catch (e) {
      // Skip invalid state files
    }
  }

  return instances;
}

module.exports = {
  isPidAlive,
  getTmuxPaneId,
  getLLMStatus,
  getUptime,
  getCCBInstances
};
