/**
 * Instance Service
 * Handles CCB instance detection and management
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const net = require('net');

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
 * Check if port is listening (lightweight check)
 */
function isPortListening(port, host = '127.0.0.1', timeout = 50) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Get tmux pane ID for work directory
 */
function getTmuxPaneInfo(workDir) {
  try {
    const result = execSync('tmux list-panes -a -F "#{pane_id}\\t#{pane_current_path}\\t#{pane_title}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.split('\\t');
      if (parts.length >= 3) {
        const paneId = parts[0];
        const panePath = parts[1];
        const paneTitle = parts[2];
        if (panePath === workDir) {
          return { id: paneId, title: paneTitle };
        }
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
    claude: { active: false, session: null, lastActive: null },
    gemini: { active: false, session: null, lastActive: null },
    opencode: { active: false, session: null, lastActive: null },
    codex: { active: false, session: null, lastActive: null }
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
          const stats = fs.statSync(sessionFile);

          if (content) {
            status[llm].active = true;

            // Get last modified time
            const lastModified = stats.mtime;
            const now = new Date();
            const diffMs = now - lastModified;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffMins < 1) {
              status[llm].lastActive = 'just now';
            } else if (diffMins < 60) {
              status[llm].lastActive = `${diffMins}m ago`;
            } else if (diffHours < 24) {
              status[llm].lastActive = `${diffHours}h ago`;
            } else {
              const diffDays = Math.floor(diffHours / 24);
              status[llm].lastActive = `${diffDays}d ago`;
            }

            // Try to parse as JSON and extract session_id (for reference)
            try {
              const sessionData = JSON.parse(content);
              if (sessionData.session_id) {
                status[llm].session = sessionData.session_id;
              }
            } catch (e) {
              // Not JSON, ignore
            }
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
 * Get running CCB processes from system
 */
function getRunningCCBProcesses() {
  try {
    // Step 1: Use pgrep to find CCB process PIDs directly (much faster than ps aux | grep)
    const result = execSync('pgrep -f "/ccb$|/ccb " 2>/dev/null || true', {
      encoding: 'utf8',
      timeout: 2000
    });

    const ccbPids = [];
    for (const line of result.split('\n')) {
      if (!line) continue;
      const pid = parseInt(line.trim());
      if (pid) ccbPids.push(pid);
    }

    if (ccbPids.length === 0) return [];

    // Step 2: Get all Python process working directories in one lsof call
    const lsofResult = execSync('lsof -a -d cwd -c Python 2>/dev/null', {
      encoding: 'utf8',
      timeout: 2000
    });

    // Build a map of PID -> workDir
    const pidWorkDirMap = new Map();
    for (const line of lsofResult.split('\n')) {
      if (!line || !line.includes('cwd')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;
      const pid = parseInt(parts[1]);
      const workDir = parts.slice(8).join(' '); // Path might contain spaces
      if (pid && workDir) {
        pidWorkDirMap.set(pid, workDir);
      }
    }

    // Step 3: Match CCB PIDs with their work directories
    const processes = [];
    for (const pid of ccbPids) {
      const workDir = pidWorkDirMap.get(pid);
      if (workDir) {
        processes.push({ pid, workDir });
      }
    }

    return processes;
  } catch (e) {
    return [];
  }
}

/**
 * Check if askd daemon is accessible for a work directory
 */
async function checkAskdConnection(workDir) {
  const askdJsonPath = path.join(os.homedir(), '.cache', 'ccb', 'projects');

  // Try to find askd.json by scanning cache directory
  try {
    const projectDirs = fs.readdirSync(askdJsonPath);
    for (const projectDir of projectDirs) {
      const stateFile = path.join(askdJsonPath, projectDir, 'askd.json');
      if (fs.existsSync(stateFile)) {
        const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        if (data.work_dir === workDir) {
          // Found matching askd.json
          const port = data.port || 0;
          const host = data.host || '127.0.0.1';
          const connected = await isPortListening(port, host);
          return {
            found: true,
            connected: connected,
            port: port,
            pid: data.pid
          };
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  return { found: false, connected: false };
}

/**
 * Get all CCB instances (from state files + running processes)
 */
async function getCCBInstances() {
  const cacheDir = path.join(os.homedir(), '.cache', 'ccb', 'projects');
  const instances = [];
  const processedWorkDirs = new Set();

  // Get all running CCB processes once (for performance)
  const ccbProcesses = getRunningCCBProcesses();

  // Get all tmux panes once (for performance)
  // Only consider panes in attached sessions
  let tmuxPanesMap = new Map();
  try {
    const tmuxResult = execSync('tmux list-panes -a -F "#{session_attached}\\\\t#{pane_id}\\\\t#{pane_current_path}\\\\t#{pane_title}"', {
      encoding: 'utf8',
      timeout: 2000
    });
    for (const line of tmuxResult.split('\n')) {
      if (!line) continue;
      const parts = line.split('\\t');
      if (parts.length >= 4) {
        const sessionAttached = parts[0];
        const paneId = parts[1];
        const panePath = parts[2];
        const paneTitle = parts[3];
        // Only include panes from attached sessions with CCB-related titles
        // CCB panes have titles like "◇  Ready (instance-name)" or "CCB-Codex"
        const isCCBPane = paneTitle.includes('Ready') || paneTitle.includes('CCB-') || paneTitle.includes('OpenCode') || paneTitle.includes('Gemini');
        if (sessionAttached === '1' && isCCBPane) {
          tmuxPanesMap.set(panePath, { id: paneId, title: paneTitle });
        }
      }
    }
  } catch (e) {
    // tmux not running or error
  }

  // Step 1: Scan state files (existing logic)
  if (fs.existsSync(cacheDir)) {
    const projectDirs = fs.readdirSync(cacheDir);

    for (const projectDir of projectDirs) {
      const stateFile = path.join(cacheDir, projectDir, 'askd.json');
      if (!fs.existsSync(stateFile)) continue;

      try {
        const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const pid = parseInt(data.pid || 0);
        const port = data.port || 0;
        const host = data.host || '127.0.0.1';
        const workDir = data.work_dir || projectDir;

        processedWorkDirs.add(workDir);

        // Determine status: Active, Orphaned, Zombie, or Dead
        let status = 'dead';
        let isAlive = false;
        const tmuxPane = tmuxPanesMap.get(workDir) || null;

        // Check if CCB process is actually running (not just askd daemon)
        const ccbProcess = ccbProcesses.find(p => p.workDir === workDir);

        if (isPidAlive(pid)) {
          // askd daemon PID exists, check if port is listening
          const portListening = await isPortListening(port, host);
          if (portListening) {
            // askd daemon running and port listening
            // But we need to check if CCB process is also running
            if (ccbProcess) {
              // CCB process is running
              if (tmuxPane) {
                status = 'active';  // Has tmux window, truly active
                isAlive = true;
              } else {
                status = 'orphaned';  // No tmux window, orphaned process
                isAlive = false;
              }
            } else {
              // askd daemon running but CCB process not running
              status = 'zombie';  // Zombie state
              isAlive = false;
            }
          } else {
            status = 'zombie';
            isAlive = false; // Zombie is considered not alive
          }
        } else {
          status = 'dead';
          isAlive = false;
        }

        instances.push({
          workDir: workDir,
          pid: pid,
          port: port,
          host: host,
          status: status,
          isAlive: isAlive,
          stateFile: stateFile,
          startedAt: data.started_at,
          parentPid: data.parent_pid,
          managed: data.managed,
          tmuxPane: tmuxPane,
          llmStatus: getLLMStatus(workDir),
          uptime: getUptime(data.started_at)
        });
      } catch (e) {
        // Skip invalid state files
      }
    }
  }

  // Step 2: Scan running CCB processes (new logic)
  // Use the ccbProcesses already fetched above

  for (const proc of ccbProcesses) {
    // Skip if already processed from state file
    if (processedWorkDirs.has(proc.workDir)) continue;

    processedWorkDirs.add(proc.workDir);

    // This is a CCB process without state file - Disconnected state
    const tmuxPane = tmuxPanesMap.get(proc.workDir) || null;
    const askdInfo = await checkAskdConnection(proc.workDir);

    instances.push({
      workDir: proc.workDir,
      pid: proc.pid,
      port: askdInfo.port || 0,
      host: '127.0.0.1',
      status: 'disconnected',  // New status!
      isAlive: false,  // Not fully functional
      stateFile: null,  // No state file
      startedAt: null,
      parentPid: null,
      managed: false,
      tmuxPane: tmuxPane,
      llmStatus: getLLMStatus(proc.workDir),
      uptime: 'Unknown',
      askdConnected: askdInfo.connected
    });
  }

  return instances;
}

module.exports = {
  isPidAlive,
  isPortListening,
  getTmuxPaneInfo,
  getLLMStatus,
  getUptime,
  getCCBInstances
};
