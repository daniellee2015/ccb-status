/**
 * Instance Service
 * Handles CCB instance detection and management
 *
 * CRITICAL: Uses atomic check functions from instance-checks.js
 * Status determination delegated to status-resolver.js
 * DO NOT duplicate check or status logic here
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { getRunningCCBProcesses } = require('../utils/process-detector');
const {
  isAskdAlive,
  isCcbAlive,
  isPortListening
} = require('../utils/instance-checks');
const { resolveStatus } = require('../utils/status-resolver');

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

  // Get all tmux panes once (for performance) - avoid repeated calls
  const { listTmuxPanes, locatePidInTmux } = require('../detectors/tmux-detector');
  const allTmuxPanes = listTmuxPanes();

  // Step 1: Scan state files
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
        const parentPid = Number(data.parent_pid) || null; // Normalize to number

        processedWorkDirs.add(workDir);

        // Determine status based on both askd daemon and CCB process
        let status = 'dead';
        let isAlive = false;

        // Check if CCB process is actually running (not just askd daemon)
        const ccbProcess = ccbProcesses.find(p => p.workDir === workDir);

        // Collect component states (snapshot)
        const askdAlive = isAskdAlive(pid);
        const ccbAlive = isCcbAlive(ccbProcess ? ccbProcess.pid : null);
        const portListening = await isPortListening(port, host);

        // Use parent PID for accurate tmux detection (reuse panes list)
        let tmuxPaneInfo = null;
        if (parentPid && allTmuxPanes.length > 0) {
          const match = locatePidInTmux(parentPid, allTmuxPanes);
          if (match) {
            tmuxPaneInfo = {
              paneId: match.pane.paneId,
              session: match.pane.sessionName,
              sessionAttached: match.pane.sessionAttached,
              panePid: match.pane.panePid,
              paneTty: match.pane.paneTty,
              matchMode: match.mode
            };
          }
        }
        const hasDedicatedTmux = tmuxPaneInfo !== null && tmuxPaneInfo.sessionAttached;

        // Delegate status determination to pure resolver
        const snapshot = {
          askdAlive,
          ccbAlive,
          portListening,
          hasDedicatedTmux
        };
        status = resolveStatus(snapshot);
        isAlive = (status === 'active');

        instances.push({
          workDir: workDir,
          // PID semantics: displayPid for UI, askdPid/ccbPid for operations
          pid: ccbProcess ? ccbProcess.pid : pid,  // Display PID (prefer CCB for user visibility)
          askdPid: pid,  // askd daemon PID (for daemon control)
          ccbPid: ccbProcess ? ccbProcess.pid : null,  // CCB process PID (for process control)
          port: port,
          host: host,
          status: status,
          isAlive: isAlive,
          stateFile: stateFile,
          startedAt: data.started_at,
          parentPid: parentPid,
          managed: data.managed,
          tmuxPane: tmuxPaneInfo,  // Full tmux info: { session, paneId, sessionAttached, matchMode }
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
    const askdInfo = await checkAskdConnection(proc.workDir);

    instances.push({
      workDir: proc.workDir,
      // For disconnected: CCB process exists but no state file
      pid: proc.pid,  // Display PID (CCB process)
      askdPid: askdInfo.pid || null,  // askd PID if found
      ccbPid: proc.pid,  // CCB process PID
      port: askdInfo.port || 0,
      host: '127.0.0.1',
      status: 'disconnected',  // New status!
      isAlive: false,  // Not fully functional
      stateFile: null,  // No state file
      startedAt: null,
      parentPid: null,
      managed: false,
      tmuxPane: null,  // No parent PID available for disconnected instances
      llmStatus: getLLMStatus(proc.workDir),
      uptime: 'Unknown',
      askdConnected: askdInfo.connected
    });
  }

  return instances;
}

module.exports = {
  getTmuxPaneInfo,
  getLLMStatus,
  getUptime,
  getCCBInstances
};
