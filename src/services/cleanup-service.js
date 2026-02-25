/**
 * Cleanup Service
 * Handles cleanup of orphaned CCB and askd processes with safety checks
 */

const { execSync } = require('child_process');
const { getRunningCCBProcesses, getRunningAskdProcesses, isPidAlive } = require('../utils/process-detector');

/**
 * Check if a tmux pane is active (has recent activity)
 * @param {string} paneId - Tmux pane ID
 * @returns {boolean} True if pane has recent activity
 */
function isTmuxPaneActive(paneId) {
  try {
    // Get pane activity time (seconds since last activity)
    const result = execSync(`tmux display-message -p -t ${paneId} '#{pane_active}'`, {
      encoding: 'utf8',
      timeout: 1000
    }).trim();

    // If pane is currently active (focused), consider it active
    if (result === '1') return true;

    // Check if there's been recent activity (within last 5 minutes)
    const activityResult = execSync(`tmux display-message -p -t ${paneId} '#{pane_last_activity}'`, {
      encoding: 'utf8',
      timeout: 1000
    }).trim();

    const lastActivity = parseInt(activityResult);
    const now = Math.floor(Date.now() / 1000);
    const inactiveSeconds = now - lastActivity;

    // Consider active if activity within last 5 minutes (300 seconds)
    return inactiveSeconds < 300;
  } catch (e) {
    // If we can't determine, assume it's active to be safe
    return true;
  }
}

/**
 * Find tmux pane for a work directory
 * @param {string} workDir - Work directory path
 * @returns {string|null} Pane ID or null
 */
function findTmuxPaneByWorkDir(workDir) {
  try {
    const result = execSync('tmux list-panes -a -F "#{pane_id}\\\\t#{pane_current_path}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.split('\\t');
      if (parts.length >= 2) {
        const paneId = parts[0];
        const panePath = parts[1];
        if (panePath === workDir) {
          return paneId;
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a process is safe to kill (not actively working)
 * @param {number} pid - Process ID
 * @param {string} workDir - Work directory
 * @returns {{safe: boolean, reason: string}}
 */
function isProcessSafeToKill(pid, workDir) {
  // Check if process exists
  if (!isPidAlive(pid)) {
    return { safe: true, reason: 'Process already dead' };
  }

  // Check if there's an associated tmux pane
  const paneId = findTmuxPaneByWorkDir(workDir);
  if (!paneId) {
    return { safe: true, reason: 'No tmux pane (orphaned)' };
  }

  // Check if pane is active
  if (isTmuxPaneActive(paneId)) {
    return { safe: false, reason: 'Tmux pane has recent activity' };
  }

  return { safe: true, reason: 'Tmux pane inactive' };
}

/**
 * Kill a process by PID with safety check
 * @param {number} pid - Process ID
 * @param {string} workDir - Work directory
 * @param {boolean} force - Skip safety checks
 * @param {boolean} forceSignal - Use SIGKILL instead of SIGTERM
 * @returns {{success: boolean, reason: string}}
 */
function killProcess(pid, workDir, force = false, forceSignal = false) {
  if (!pid || pid <= 0) {
    return { success: false, reason: 'Invalid PID' };
  }

  // Safety check unless force is true
  if (!force) {
    const safetyCheck = isProcessSafeToKill(pid, workDir);
    if (!safetyCheck.safe) {
      return { success: false, reason: safetyCheck.reason };
    }
  }

  // Check if process exists
  if (!isPidAlive(pid)) {
    return { success: true, reason: 'Process already dead' };
  }

  try {
    const signal = forceSignal ? 9 : 15; // SIGKILL or SIGTERM
    process.kill(pid, signal);

    // Wait a bit and check if process is gone
    setTimeout(() => {}, 100);

    if (!isPidAlive(pid)) {
      return { success: true, reason: 'Killed successfully' };
    } else {
      return { success: false, reason: 'Process still alive after kill signal' };
    }
  } catch (e) {
    // ESRCH means process doesn't exist - that's success
    if (e.code === 'ESRCH') {
      return { success: true, reason: 'Process already dead' };
    }
    return { success: false, reason: e.message };
  }
}

/**
 * Analyze all CCB processes and categorize them
 * @returns {{active: Array, orphaned: Array, total: number}}
 */
function analyzeCCBProcesses() {
  const processes = getRunningCCBProcesses();
  const active = [];
  const orphaned = [];

  for (const proc of processes) {
    const safetyCheck = isProcessSafeToKill(proc.pid, proc.workDir);
    if (safetyCheck.safe) {
      orphaned.push({ ...proc, reason: safetyCheck.reason });
    } else {
      active.push({ ...proc, reason: safetyCheck.reason });
    }
  }

  return { active, orphaned, total: processes.length };
}

/**
 * Analyze all askd processes and categorize them
 * @returns {{active: Array, orphaned: Array, total: number}}
 */
function analyzeAskdProcesses() {
  const processes = getRunningAskdProcesses();
  const active = [];
  const orphaned = [];

  for (const proc of processes) {
    const safetyCheck = isProcessSafeToKill(proc.pid, proc.workDir);
    if (safetyCheck.safe) {
      orphaned.push({ ...proc, reason: safetyCheck.reason });
    } else {
      active.push({ ...proc, reason: safetyCheck.reason });
    }
  }

  return { active, orphaned, total: processes.length };
}

/**
 * Kill only orphaned CCB processes (safe to kill)
 * @param {boolean} forceSignal - Use SIGKILL instead of SIGTERM
 * @returns {{killed: Array, failed: Array, skipped: Array}}
 */
function killOrphanedCCBProcesses(forceSignal = false) {
  const analysis = analyzeCCBProcesses();
  const killed = [];
  const failed = [];
  const skipped = analysis.active;

  for (const proc of analysis.orphaned) {
    const result = killProcess(proc.pid, proc.workDir, true, forceSignal);
    if (result.success) {
      killed.push({ ...proc, killReason: result.reason });
    } else {
      failed.push({ ...proc, failReason: result.reason });
    }
  }

  return { killed, failed, skipped };
}

/**
 * Kill only orphaned askd processes (safe to kill)
 * @param {boolean} forceSignal - Use SIGKILL instead of SIGTERM
 * @returns {{killed: Array, failed: Array, skipped: Array}}
 */
function killOrphanedAskdProcesses(forceSignal = false) {
  const analysis = analyzeAskdProcesses();
  const killed = [];
  const failed = [];
  const skipped = analysis.active;

  for (const proc of analysis.orphaned) {
    const result = killProcess(proc.pid, proc.workDir, true, forceSignal);
    if (result.success) {
      killed.push({ ...proc, killReason: result.reason });
    } else {
      failed.push({ ...proc, failReason: result.reason });
    }
  }

  return { killed, failed, skipped };
}

module.exports = {
  killProcess,
  isProcessSafeToKill,
  analyzeCCBProcesses,
  analyzeAskdProcesses,
  killOrphanedCCBProcesses,
  killOrphanedAskdProcesses
};
