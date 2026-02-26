/**
 * Instance Check Utilities
 * Basic detection functions for CCB instance components
 *
 * CRITICAL: These are atomic check functions
 * Each function checks ONE condition only
 * All menus MUST use these functions for checks
 * DO NOT duplicate check logic in other files
 */

const { execSync } = require('child_process');
const net = require('net');

/**
 * Check if a process is alive by PID
 * @param {number} pid - Process ID
 * @returns {boolean} True if process exists
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
 * Check if askd daemon process is alive
 * @param {number} askdPid - askd daemon PID
 * @returns {boolean} True if askd is running
 */
function isAskdAlive(askdPid) {
  return isPidAlive(askdPid);
}

/**
 * Check if ccb main process is alive
 * @param {number} ccbPid - ccb main process PID
 * @returns {boolean} True if ccb is running
 */
function isCcbAlive(ccbPid) {
  return isPidAlive(ccbPid);
}

/**
 * Check if port is listening (lightweight TCP connection test)
 * @param {number} port - Port number
 * @param {string} host - Host address (default: 127.0.0.1)
 * @param {number} timeout - Connection timeout in ms (default: 50)
 * @returns {Promise<boolean>} True if port is listening
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
 * Check if tmux session exists
 * @param {string} sessionName - Tmux session name
 * @returns {boolean} True if session exists
 */
function tmuxSessionExists(sessionName) {
  try {
    execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 1000
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if tmux session is attached
 * @param {string} sessionName - Tmux session name
 * @returns {boolean} True if session is attached
 */
function isTmuxSessionAttached(sessionName) {
  try {
    const result = execSync(`tmux list-sessions -F "#{session_name}\\\\t#{session_attached}" 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.split('\\t');
      if (parts.length >= 2 && parts[0] === sessionName) {
        return parts[1] === '1';
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Get number of windows in tmux session
 * @param {string} sessionName - Tmux session name
 * @returns {number} Number of windows, or 0 if session not found
 */
function getTmuxSessionWindows(sessionName) {
  try {
    const result = execSync(`tmux list-sessions -F "#{session_name}\\\\t#{session_windows}" 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.split('\\t');
      if (parts.length >= 2 && parts[0] === sessionName) {
        return parseInt(parts[1]) || 0;
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Check if tmux session has only 1 window (dedicated session)
 * @param {string} sessionName - Tmux session name
 * @returns {boolean} True if session has exactly 1 window
 */
function isTmuxSessionDedicated(sessionName) {
  return getTmuxSessionWindows(sessionName) === 1;
}

/**
 * Get work directory of a process by PID
 * @param {number} pid - Process ID
 * @returns {string|null} Work directory path, or null if not found
 */
function getProcessWorkDir(pid) {
  try {
    const result = execSync(`lsof -a -d cwd -p ${pid} 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      if (!line || !line.includes('cwd')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 9) {
        return parts.slice(8).join(' '); // Path might contain spaces
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if process work directory matches expected path
 * @param {number} pid - Process ID
 * @param {string} expectedWorkDir - Expected work directory path
 * @returns {boolean} True if work directories match
 */
function matchesWorkDir(pid, expectedWorkDir) {
  const actualWorkDir = getProcessWorkDir(pid);
  return actualWorkDir === expectedWorkDir;
}

/**
 * Find tmux pane by work directory
 * @param {string} workDir - Work directory path
 * @returns {Object|null} Pane info { session, paneId, title } or null
 */
function findTmuxPaneByWorkDir(workDir) {
  try {
    const result = execSync('tmux list-panes -a -F "#{session_name}\\\\t#{session_attached}\\\\t#{session_windows}\\\\t#{pane_id}\\\\t#{pane_current_path}\\\\t#{pane_title}"', {
      encoding: 'utf8',
      timeout: 2000
    });

    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.split('\\t');
      if (parts.length >= 6) {
        const sessionName = parts[0];
        const sessionAttached = parts[1];
        const sessionWindows = parseInt(parts[2]);
        const paneId = parts[3];
        const panePath = parts[4];
        const paneTitle = parts[5];

        // Check if this pane matches the work directory
        if (panePath === workDir) {
          // Check if it's a CCB pane
          const isCCBPane = paneTitle.includes('Ready') ||
                           paneTitle.includes('CCB-') ||
                           paneTitle.includes('OpenCode') ||
                           paneTitle.includes('Gemini') ||
                           paneTitle.includes('Codex');

          // Check if pane is in an attached session (no window count requirement)
          if (isCCBPane && sessionAttached === '1') {
            return {
              session: sessionName,
              paneId: paneId,
              title: paneTitle
            };
          }
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if instance has tmux pane in attached session
 * @param {string} workDir - Instance work directory
 * @returns {boolean} True if has tmux pane in attached session
 */
function hasDedicatedTmuxSession(workDir) {
  const pane = findTmuxPaneByWorkDir(workDir);
  return pane !== null;
}

module.exports = {
  // Basic checks
  isPidAlive,
  isAskdAlive,
  isCcbAlive,
  isPortListening,

  // Tmux checks
  tmuxSessionExists,
  isTmuxSessionAttached,
  getTmuxSessionWindows,
  isTmuxSessionDedicated,

  // Work directory checks
  getProcessWorkDir,
  matchesWorkDir,
  findTmuxPaneByWorkDir,
  hasDedicatedTmuxSession
};
