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
const { getCachedInstances, setCachedInstances } = require('../cache/file-cache');

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
  // Try cache first (target: < 5ms)
  const cached = getCachedInstances();
  if (cached !== null) {
    return cached;
  }

  // Cache miss: perform full scan
  const instances = await getCCBInstancesUncached();

  // Update cache for next call
  setCachedInstances(instances);

  return instances;
}

/**
 * Get CCB instances without cache (internal function)
 * This is the original logic, now wrapped by getCCBInstances with caching
 * Optimized with parallel port checks for better performance
 */
async function getCCBInstancesUncached() {
  const cacheDir = path.join(os.homedir(), '.cache', 'ccb', 'projects');
  const instances = [];
  const processedWorkDirs = new Set();

  // Get all running CCB processes once (for performance)
  const ccbProcesses = getRunningCCBProcesses();

  // Get all tmux panes once (for performance) - avoid repeated calls
  const { listTmuxPanes, locatePidInTmux } = require('../detectors/tmux-detector');
  const allTmuxPanes = listTmuxPanes();

  // Collect all instance data first (without async port checks)
  const instanceDataList = [];

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
        const parentPid = Number(data.parent_pid) || null;

        processedWorkDirs.add(workDir);

        // Check if CCB process is actually running
        const ccbProcess = ccbProcesses.find(p => p.workDir === workDir);

        // Collect component states (snapshot) - sync checks only
        const askdAlive = isAskdAlive(pid);
        const ccbAlive = isCcbAlive(ccbProcess ? ccbProcess.pid : null);

        // Use parent PID for accurate tmux detection
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

        instanceDataList.push({
          workDir,
          pid,
          port,
          host,
          askdAlive,
          ccbAlive,
          ccbProcess,
          tmuxPaneInfo,
          stateFile,
          data
        });
      } catch (e) {
        // Skip invalid state files
      }
    }
  }

  // Step 2: Parallel port checks for all instances
  const portCheckPromises = instanceDataList.map(inst =>
    isPortListening(inst.port, inst.host)
  );
  const portResults = await Promise.all(portCheckPromises);

  // Step 3: Assemble instances with port check results
  for (let i = 0; i < instanceDataList.length; i++) {
    const inst = instanceDataList[i];
    const portListening = portResults[i];

    const hasDedicatedTmux = inst.tmuxPaneInfo !== null && inst.tmuxPaneInfo.sessionAttached;

    // Delegate status determination to pure resolver
    const snapshot = {
      askdAlive: inst.askdAlive,
      ccbAlive: inst.ccbAlive,
      portListening,
      hasDedicatedTmux
    };
    const status = resolveStatus(snapshot);
    const isAlive = (status === 'active');

    instances.push({
      workDir: inst.workDir,
      pid: inst.ccbProcess ? inst.ccbProcess.pid : inst.pid,
      askdPid: inst.pid,
      ccbPid: inst.ccbProcess ? inst.ccbProcess.pid : null,
      port: inst.port,
      host: inst.host,
      status,
      isAlive,
      stateFile: inst.stateFile,
      startedAt: inst.data.started_at,
      parentPid: inst.data.parent_pid,
      managed: inst.data.managed,
      tmuxPane: inst.tmuxPaneInfo,
      llmStatus: getLLMStatus(inst.workDir),
      uptime: getUptime(inst.data.started_at)
    });
  }

  // Step 4: Scan running CCB processes (disconnected instances)
  for (const proc of ccbProcesses) {
    if (processedWorkDirs.has(proc.workDir)) continue;

    processedWorkDirs.add(proc.workDir);

    const askdInfo = await checkAskdConnection(proc.workDir);

    instances.push({
      workDir: proc.workDir,
      pid: proc.pid,
      askdPid: askdInfo.pid || null,
      ccbPid: proc.pid,
      port: askdInfo.port || 0,
      host: '127.0.0.1',
      status: 'disconnected',
      isAlive: false,
      stateFile: null,
      startedAt: null,
      parentPid: null,
      managed: false,
      tmuxPane: null,
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
