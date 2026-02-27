/**
 * Lightweight Process Utilities
 * Optimized for performance - avoids full process table scans
 */

const { execSync } = require('child_process');

/**
 * Get process ancestry for a specific PID (much faster than full table)
 * @param {number} pid - Process ID
 * @returns {Array<Object>} Array of ancestors from child to root
 */
function getProcessAncestryFast(pid) {
  const ancestry = [];
  let current = pid;
  const seen = new Set();

  while (current > 1 && !seen.has(current)) {
    seen.add(current);

    try {
      // Get only this specific process info (very fast)
      const result = execSync(`ps -p ${current} -o pid=,ppid=,tty=,comm=`, {
        encoding: 'utf8',
        timeout: 500
      });

      const line = result.trim();
      if (!line) break;

      const parts = line.split(/\s+/);
      if (parts.length < 4) break;

      const proc = {
        pid: Number(parts[0]),
        ppid: Number(parts[1]),
        tty: parts[2],
        command: parts.slice(3).join(' ')
      };

      ancestry.push(proc);

      if (!proc.ppid || proc.ppid === current) break;
      current = proc.ppid;
    } catch (e) {
      break;
    }
  }

  return ancestry;
}

/**
 * Check if process is alive (very fast)
 * @param {number} pid - Process ID
 * @returns {boolean}
 */
function isProcessAliveFast(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get process info for specific PID (fast)
 * @param {number} pid - Process ID
 * @returns {Object|null}
 */
function getProcessInfoFast(pid) {
  try {
    const result = execSync(`ps -p ${pid} -o pid=,ppid=,tty=,comm=`, {
      encoding: 'utf8',
      timeout: 500
    });

    const line = result.trim();
    if (!line) return null;

    const parts = line.split(/\s+/);
    if (parts.length < 4) return null;

    return {
      pid: Number(parts[0]),
      ppid: Number(parts[1]),
      tty: parts[2],
      command: parts.slice(3).join(' ')
    };
  } catch (e) {
    return null;
  }
}

module.exports = {
  getProcessAncestryFast,
  isProcessAliveFast,
  getProcessInfoFast
};
