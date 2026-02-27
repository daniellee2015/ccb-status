/**
 * Process Detector
 * Centralized process detection and information gathering
 */

const { execSync } = require('child_process');

// Cache for process table
let cachedProcessTable = null;
let cacheTime = 0;
const DEFAULT_CACHE_TTL = 5000; // 5 seconds

/**
 * Get complete process table with optional caching
 * @param {number} ttl - Cache time-to-live in milliseconds (0 to disable cache)
 * @returns {Map<number, ProcessInfo>} Map of PID to process info
 */
function getProcessTable(ttl = DEFAULT_CACHE_TTL) {
  const now = Date.now();

  // Return cached result if still valid
  if (ttl > 0 && cachedProcessTable && (now - cacheTime) < ttl) {
    return cachedProcessTable;
  }

  try {
    // Use -o with specific fields for faster execution
    const result = execSync('ps -Ao pid=,ppid=,tty=,comm=', {
      encoding: 'utf8',
      timeout: 3000
    });

    const map = new Map();
    for (const raw of result.split('\n')) {
      const line = raw.trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 4) continue;

      const pid = Number(parts[0]);
      const ppid = Number(parts[1]);
      const tty = parts[2];
      const command = parts.slice(3).join(' ');

      map.set(pid, { pid, ppid, tty, command });
    }

    // Update cache
    if (ttl > 0) {
      cachedProcessTable = map;
      cacheTime = now;
    }

    return map;
  } catch (e) {
    return new Map();
  }
}

/**
 * Clear process table cache
 */
function clearProcessCache() {
  cachedProcessTable = null;
  cacheTime = 0;
}

/**
 * Check if process is alive
 * @param {number} pid - Process ID
 * @returns {boolean}
 */
function isProcessAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get process info by PID
 * @param {number} pid - Process ID
 * @returns {ProcessInfo|null}
 */
function getProcessInfo(pid) {
  const procTable = getProcessTable();
  return procTable.get(pid) || null;
}

/**
 * Get process work directory
 * @param {number} pid - Process ID
 * @returns {string|null}
 */
function getProcessWorkDir(pid) {
  if (!pid || pid <= 0) return null;
  try {
    const result = execSync(`lsof -p ${pid} | grep cwd`, {
      encoding: 'utf8',
      timeout: 1000
    });
    const match = result.match(/\s+(\/.+)$/);
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Find processes by command pattern
 * @param {string} pattern - Command pattern to match
 * @returns {ProcessInfo[]}
 */
function findProcessesByCommand(pattern) {
  const procTable = getProcessTable();
  const results = [];

  for (const proc of procTable.values()) {
    if (proc.command.includes(pattern)) {
      results.push(proc);
    }
  }

  return results;
}

/**
 * Get process ancestry chain
 * @param {number} pid - Process ID
 * @returns {ProcessInfo[]} Array of ancestors from child to root
 */
function getProcessAncestry(pid) {
  const procTable = getProcessTable();
  const ancestry = [];
  let current = pid;
  const seen = new Set();

  while (current > 1 && !seen.has(current)) {
    seen.add(current);
    const proc = procTable.get(current);
    if (!proc) break;

    ancestry.push(proc);
    current = proc.ppid;
  }

  return ancestry;
}

module.exports = {
  getProcessTable,
  clearProcessCache,
  isProcessAlive,
  getProcessInfo,
  getProcessWorkDir,
  findProcessesByCommand,
  getProcessAncestry
};
