/**
 * Tmux Detector
 * Centralized tmux detection and information gathering
 */

const { execSync } = require('child_process');
const { getProcessTable } = require('./process-detector');

/**
 * Normalize TTY path
 * @param {string} tty - TTY path
 * @returns {string|null}
 */
function normalizeTty(tty) {
  if (!tty) return null;
  return tty.replace(/^\/dev\//, '');
}

/**
 * List all tmux panes with metadata
 * @returns {TmuxPaneInfo[]}
 */
function listTmuxPanes() {
  try {
    const format = '#{pane_id}\t#{session_name}\t#{session_attached}\t#{pane_pid}\t#{pane_tty}';
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
 * List all tmux sessions
 * @returns {Object[]} Array of session info
 */
function listTmuxSessions() {
  try {
    const format = '#{session_name}\t#{session_attached}\t#{session_windows}';
    const result = execSync(`tmux list-sessions -F "${format}"`, {
      encoding: 'utf8',
      timeout: 2000
    });

    return result
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [name, attached, windows] = line.split('\t');
        return {
          name,
          attached: attached === '1',
          windowCount: Number(windows)
        };
      });
  } catch (e) {
    return [];
  }
}

/**
 * Locate PID in tmux by checking PID lineage and TTY
 * @param {number} probePid - PID to locate
 * @param {Map} procMap - Process table
 * @param {TmuxPaneInfo[]} panes - Tmux panes
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

  // 2) Check probePid's TTY first
  const probeProc = procMap.get(probePid);
  if (probeProc) {
    const probeTtyKey = normalizeTty(probeProc.tty);
    if (probeTtyKey && probeTtyKey !== '?' && paneByTty.has(probeTtyKey)) {
      return { pane: paneByTty.get(probeTtyKey), mode: 'tty_match' };
    }
  }

  // 3) Walk parent chain and try ancestor pane PID / tty match
  let cur = probePid;
  const seen = new Set(); // Start with empty set - probePid already checked above

  while (cur > 1 && !seen.has(cur)) {
    seen.add(cur);

    const proc = procMap.get(cur);
    if (!proc || !proc.ppid || proc.ppid === cur) break;

    cur = proc.ppid;

    if (paneByPid.has(cur)) {
      return { pane: paneByPid.get(cur), mode: 'ancestor_pane_pid' };
    }

    const ttyKey = normalizeTty(proc.tty);
    if (ttyKey && ttyKey !== '?' && paneByTty.has(ttyKey)) {
      return { pane: paneByTty.get(ttyKey), mode: 'tty_match' };
    }
  }

  return null;
}

/**
 * Find tmux pane by parent PID (shell that started process)
 * Uses PID lineage matching, not path/title matching
 * @param {number} parentPid - Parent PID
 * @returns {TmuxPaneInfo|null}
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
      paneId: match.pane.paneId,
      session: match.pane.sessionName,
      sessionAttached: match.pane.sessionAttached,
      panePid: match.pane.panePid,
      paneTty: match.pane.paneTty,
      matchMode: match.mode
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if process has tmux pane in attached session
 * @param {number} parentPid - Parent PID
 * @returns {boolean}
 */
function hasTmuxPane(parentPid) {
  const pane = findTmuxPaneByParentPid(parentPid);
  return pane !== null && pane.sessionAttached;
}

/**
 * Get tmux session info
 * @param {string} sessionName - Session name
 * @returns {Object|null}
 */
function getTmuxSession(sessionName) {
  const sessions = listTmuxSessions();
  return sessions.find(s => s.name === sessionName) || null;
}

module.exports = {
  normalizeTty,
  listTmuxPanes,
  listTmuxSessions,
  locatePidInTmux,
  findTmuxPaneByParentPid,
  hasTmuxPane,
  getTmuxSession
};
