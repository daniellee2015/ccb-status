/**
 * Process Detector Utility
 * Encapsulates CCB process detection logic
 */

const { execSync } = require('child_process');
const { isPidAlive } = require('./instance-checks');

/**
 * Get all running CCB processes with their work directories
 * Optimized for performance: uses pgrep + batch lsof
 * @returns {Array<{pid: number, workDir: string}>} Array of CCB processes
 */
function getRunningCCBProcesses() {
  try {
    // Step 1: Use pgrep for fast process discovery (10-100x faster than ps aux)
    // PERFORMANCE CRITICAL: pgrep takes ~111ms vs ps aux ~2404ms (20x faster)
    // Pattern matches processes with/without arguments (no $ anchor)
    const result = execSync('pgrep -f \'\\.local/bin/ccb\'', {
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

    // Step 2: Get work directories for all PIDs in one batch call
    const processes = [];

    // Try pwdx first (Linux) - fastest option
    try {
      const pwdxResult = execSync(`pwdx ${ccbPids.join(' ')} 2>/dev/null`, {
        encoding: 'utf8',
        timeout: 1000
      });

      for (const line of pwdxResult.split('\n')) {
        if (!line) continue;
        const match = line.match(/^(\d+):\s+(.+)$/);
        if (match) {
          const pid = parseInt(match[1]);
          const workDir = match[2].trim();
          processes.push({ pid, workDir });
        }
      }
    } catch (e) {
      // Fallback to lsof (macOS) - call once with all PIDs for better performance
      // PERFORMANCE CRITICAL: Batch lsof takes ~152ms vs 3x separate calls ~438ms (3x faster)
      try {
        const lsofResult = execSync(`lsof -a -d cwd -p ${ccbPids.join(',')} 2>/dev/null`, {
          encoding: 'utf8',
          timeout: 2000
        });

        for (const line of lsofResult.split('\n')) {
          if (!line || !line.includes('cwd')) continue;
          const parts = line.trim().split(/\s+/);
          if (parts.length < 9) continue;

          // Extract PID and work directory
          const pid = parseInt(parts[1]);
          const workDir = parts.slice(8).join(' ');
          if (pid && workDir) {
            processes.push({ pid, workDir });
          }
        }
      } catch (e) {
        // If batch lsof fails, return PIDs without work dirs
        // Better to have partial data than fail completely
        return ccbPids.map(pid => ({ pid, workDir: null }));
      }
    }

    return processes;
  } catch (e) {
    // pgrep failed - no CCB processes running
    return [];
  }
}

/**
 * Check if a process is a CCB process
 * @param {number} pid - Process ID to check
 * @returns {boolean} True if the process is a CCB process
 */
function isCCBProcess(pid) {
  if (!isPidAlive(pid)) return false;

  try {
    const result = execSync(`ps -p ${pid} -o command=`, {
      encoding: 'utf8',
      timeout: 1000
    });

    return result.includes('.local/bin/ccb');
  } catch (e) {
    return false;
  }
}

module.exports = {
  getRunningCCBProcesses,
  isCCBProcess
};
