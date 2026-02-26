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
    const result = execSync('ps aux | grep "[c]cb" | grep -v grep', {
      encoding: 'utf8',
      timeout: 2000
    });

    const processes = [];
    for (const line of result.split('\n')) {
      if (!line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;

      const pid = parseInt(parts[1]);
      const ppid = parseInt(parts[2]) || null;
      const command = parts.slice(10).join(' ');

      // Only include actual CCB commands
      if (!command.includes('/ccb') && !command.includes('ccb ')) continue;

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
