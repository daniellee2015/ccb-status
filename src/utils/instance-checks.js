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
 * Normalize TTY path
 * @param {string} tty - TTY path
 * @returns {string|null} Normalized TTY
 */
function normalizeTty(tty) {
  if (!tty) return null;
  return tty.replace(/^\/dev\//, '');
}

/**
 * Get process table with PID, PPID, TTY
 * @returns {Map<number, Object>} Map of PID to process info
 */
function getProcessTable() {
  try {
    const result = execSync('ps -Ao pid=,ppid=,tty=,command=', {
      encoding: 'utf8',
      timeout: 5000
    });

    const map = new Map();
    for (const raw of result.split('\n')) {
      const line = raw.trim();
      if (!line) continue;

      const m = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!m) continue;

      const pid = Number(m[1]);
      const ppid = Number(m[2]);
      const tty = m[3];
      const command = m[4] || '';

      map.set(pid, { pid, ppid, tty, command });
    }

    return map;
  } catch (e) {
    return new Map();
  }
}

/**
 * List all tmux panes with metadata
 * @returns {Array<Object>} Array of pane info
 */
function listTmuxPanes() {
  try {
    const format = '#{pane_id}\\t#{session_name}\\t#{session_attached}\\t#{pane_pid}\\t#{pane_tty}';
    const result = execSync(`tmux list-panes -a -F "${format}"`, {
      encoding: 'utf8',
      timeout: 2000
    });

    return result
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [paneId, sessionName, attachedRaw, panePidRaw, paneTty] = line.split('\t');
        return {
          paneId,
          sessionName,
          sessionAttached: Number(attachedRaw) > 0,
          panePid: Number(panePidRaw),
          paneTty
        };
      })
      .filter(p => p.paneId && p.sessionName && Number.isFinite(p.panePid));
  } catch (e) {
    return [];
  }
}

/**
 * Locate PID in tmux by checking PID lineage and TTY
 * @param {number} probePid - PID to locate
 * @param {Map} procMap - Process table
 * @param {Array} panes - Tmux panes
 * @returns {Object|null} Match result with pane and mode
 */
function locatePidInTmux(probePid, procMap, panes) {
  const paneByPid = new Map();
  const paneByTty = new Map();

  for (const p of panes) {
    paneByPid.set(p.panePid, p);
    const ttyKey = normalizeTty(p.paneTty);
    if (ttyKey) paneByTty.set(ttyKey, p);
  }

  // 1) Exact pane root PID match
  if (paneByPid.has(probePid)) {
    return { pane: paneByPid.get(probePid), mode: 'pane_pid_exact' };
  }

  // 2) Walk parent chain and try ancestor pane PID / tty match
  let cur = probePid;
  const seen = new Set();

  while (cur > 1 && !seen.has(cur)) {
    seen.add(cur);

    const proc = procMap.get(cur);
    if (!proc) break;

    if (paneByPid.has(cur)) {
      return { pane: paneByPid.get(cur), mode: 'ancestor_pane_pid' };
    }

    const ttyKey = normalizeTty(proc.tty);
    if (ttyKey && ttyKey !== '?' && paneByTty.has(ttyKey)) {
      return { pane: paneByTty.get(ttyKey), mode: 'tty_match' };
    }

    if (!proc.ppid || proc.ppid === cur) break;
    cur = proc.ppid;
  }

  return null;
}

/**
 * Find tmux pane by parent PID (shell that started CCB)
 * Uses PID lineage matching, not path/title matching
 * @param {number} parentPid - Parent PID from askd.json
 * @returns {Object|null} Pane info { session, paneId, sessionAttached } or null
 */
function findTmuxPaneByParentPid(parentPid) {
  try {
    if (!Number.isFinite(parentPid) || parentPid <= 0) {
      return null;
    }

    const panes = listTmuxPanes();
    if (panes.length === 0) {
      return null;
    }

    const procMap = getProcessTable();
    if (!procMap.has(parentPid)) {
      return null;
    }

    const match = locatePidInTmux(parentPid, procMap, panes);
    if (!match) {
      return null;
    }

    return {
      session: match.pane.sessionName,
      paneId: match.pane.paneId,
      sessionAttached: match.pane.sessionAttached,
      matchMode: match.mode
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if instance has tmux pane in attached session
 * Uses parent PID from askd.json for accurate detection
 * @param {number} parentPid - Parent PID from askd.json
 * @returns {boolean} True if has tmux pane in attached session
 */
function hasDedicatedTmuxSession(parentPid) {
  const pane = findTmuxPaneByParentPid(parentPid);
  return pane !== null && pane.sessionAttached;
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
  findTmuxPaneByParentPid,
  hasDedicatedTmuxSession
};
