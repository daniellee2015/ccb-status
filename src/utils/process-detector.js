/**
 * Process Detector Utility
 * Encapsulates CCB process detection logic
 */

const { execSync } = require('child_process');
const { isPidAlive } = require('./instance-checks');

/**
 * Get all running CCB processes with their work directories
 * @returns {Array<{pid: number, workDir: string}>} Array of CCB processes
 */
function getRunningCCBProcesses() {
  try {
    // Use ps + awk for reliable detection (pgrep has limitations)
    // Filter by exact path to avoid false matches
    const result = execSync('ps aux | awk \'$11 ~ /Python/ && $12 ~ /\\.local\\/bin\\/ccb$/ {print $2}\'', {
      encoding: 'utf8',
      timeout: 5000
    });

    const ccbPids = [];
    for (const line of result.split('\n')) {
      if (!line) continue;
      const pid = parseInt(line.trim());
      if (pid) ccbPids.push(pid);
    }

    if (ccbPids.length === 0) return [];

    // Step 2: Get work directories for each CCB PID using pwdx (much faster than lsof)
    const processes = [];

    // Try to get all work dirs in one command (much faster)
    try {
      const pwdxResult = execSync(`pwdx ${ccbPids.join(' ')} 2>/dev/null`, {
        encoding: 'utf8',
        timeout: 2000
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
      // Fallback to lsof if pwdx not available (slower)
      for (const pid of ccbPids) {
        try {
          const lsofResult = execSync(`lsof -a -d cwd -p ${pid} 2>/dev/null`, {
            encoding: 'utf8',
            timeout: 1000
          });

          for (const line of lsofResult.split('\n')) {
            if (!line || !line.includes('cwd')) continue;
            const parts = line.trim().split(/\s+/);
            if (parts.length < 9) continue;
            const workDir = parts.slice(8).join(' ');
            if (workDir) {
              processes.push({ pid, workDir });
              break;
            }
          }
        } catch (e) {
          // Process might have exited
        }
      }
    }

    return processes;
  } catch (e) {
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
