/**
 * Process Detector Utility
 * Encapsulates CCB process detection logic
 */

const { execSync } = require('child_process');

/**
 * Get all running CCB processes with their work directories
 * @returns {Array<{pid: number, workDir: string}>} Array of CCB processes
 */
function getRunningCCBProcesses() {
  try {
    // Step 1: Use ps + grep to find CCB process PIDs
    const result = execSync('ps aux | grep -E "/ccb$|/ccb " | grep -v grep', {
      encoding: 'utf8',
      timeout: 2000
    });

    const ccbPids = [];
    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;
      const pid = parseInt(parts[1]);
      if (pid) ccbPids.push(pid);
    }

    if (ccbPids.length === 0) return [];

    // Step 2: Get work directories for each CCB PID
    const processes = [];
    for (const pid of ccbPids) {
      try {
        const lsofResult = execSync(`lsof -a -d cwd -p ${pid} 2>/dev/null`, {
          encoding: 'utf8',
          timeout: 2000
        });

        // Parse lsof output to get work directory
        for (const line of lsofResult.split('\n')) {
          if (!line || !line.includes('cwd')) continue;
          const parts = line.trim().split(/\s+/);
          if (parts.length < 9) continue;
          const workDir = parts.slice(8).join(' '); // Path might contain spaces
          if (workDir) {
            processes.push({ pid, workDir });
            break; // Found the work directory for this PID
          }
        }
      } catch (e) {
        // Process might have exited
      }
    }
    return processes;
  } catch (e) {
    return [];
  }
}

/**
 * Get all running askd daemon processes with their work directories
 * @returns {Array<{pid: number, workDir: string}>} Array of askd processes
 */
function getRunningAskdProcesses() {
  try {
    // Find all askd processes
    const result = execSync('ps aux | grep -E "/askd$|/askd " | grep -v grep', {
      encoding: 'utf8',
      timeout: 2000
    });

    const askdPids = [];
    for (const line of result.split('\n')) {
      if (!line) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;
      const pid = parseInt(parts[1]);
      if (pid) askdPids.push(pid);
    }

    if (askdPids.length === 0) return [];

    // Get work directories for each askd PID
    const processes = [];
    for (const pid of askdPids) {
      try {
        const lsofResult = execSync(`lsof -a -d cwd -p ${pid} 2>/dev/null`, {
          encoding: 'utf8',
          timeout: 2000
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
    return processes;
  } catch (e) {
    return [];
  }
}

/**
 * Find CCB process for a specific work directory
 * @param {string} workDir - Work directory path
 * @returns {{pid: number, workDir: string} | null} CCB process or null
 */
function findCCBProcessByWorkDir(workDir) {
  const processes = getRunningCCBProcesses();
  return processes.find(p => p.workDir === workDir) || null;
}

/**
 * Find askd process for a specific work directory
 * @param {string} workDir - Work directory path
 * @returns {{pid: number, workDir: string} | null} askd process or null
 */
function findAskdProcessByWorkDir(workDir) {
  const processes = getRunningAskdProcesses();
  return processes.find(p => p.workDir === workDir) || null;
}

/**
 * Check if a PID is alive
 * @param {number} pid - Process ID
 * @returns {boolean} True if process is alive
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

module.exports = {
  getRunningCCBProcesses,
  getRunningAskdProcesses,
  findCCBProcessByWorkDir,
  findAskdProcessByWorkDir,
  isPidAlive
};
