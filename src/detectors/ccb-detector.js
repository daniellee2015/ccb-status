/**
 * CCB Process Detector
 * Centralized CCB process detection and information gathering
 */

const { execSync } = require('child_process');
const { getProcessWorkDir, isProcessAlive } = require('./process-detector');

/**
 * Find all running CCB processes
 * @returns {CCBProcessInfo[]}
 */
function findAllCCBProcesses() {
  try {
    // Use ps -Ao for correct PPID parsing
    const result = execSync('ps -Ao pid=,ppid=,command= | grep "[c]cb"', {
      encoding: 'utf8',
      timeout: 2000
    });

    const processes = [];
    for (const line of result.split('\n')) {
      if (!line.trim()) continue;

      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
      if (!match) continue;

      const pid = parseInt(match[1]);
      const ppid = parseInt(match[2]);
      const command = match[3];

      // Only include actual CCB commands (not ccb-status, ccb-ping, etc.)
      if (!command.match(/\/ccb\s+/) && !command.match(/\/ccb$/)) continue;

      const workDir = getProcessWorkDir(pid);
      if (!workDir) continue;

      // Extract providers from command
      const providers = [];
      const providerMatch = command.match(/ccb\s+([a-z,]+)/);
      if (providerMatch) {
        providers.push(...providerMatch[1].split(','));
      }

      processes.push({
        pid,
        parentPid: ppid,
        workDir,
        providers,
        command
      });
    }

    return processes;
  } catch (e) {
    return [];
  }
}

/**
 * Get CCB process by work directory
 * @param {string} workDir - Work directory
 * @returns {CCBProcessInfo|null}
 */
function getCCBProcessByWorkDir(workDir) {
  const processes = findAllCCBProcesses();
  return processes.find(p => p.workDir === workDir) || null;
}

/**
 * Check if CCB process is alive
 * @param {number} pid - CCB process PID
 * @returns {boolean}
 */
function isCCBProcessAlive(pid) {
  return isProcessAlive(pid);
}

/**
 * Get CCB process providers
 * @param {number} pid - CCB process PID
 * @returns {string[]}
 */
function getCCBProviders(pid) {
  try {
    const result = execSync(`ps -p ${pid} -o command=`, {
      encoding: 'utf8',
      timeout: 1000
    });

    const providerMatch = result.match(/ccb\s+([a-z,]+)/);
    if (providerMatch) {
      return providerMatch[1].split(',');
    }

    return [];
  } catch (e) {
    return [];
  }
}

module.exports = {
  findAllCCBProcesses,
  getCCBProcessByWorkDir,
  isCCBProcessAlive,
  getCCBProviders
};
