/**
 * PID Validation Utility
 * Validates that a PID belongs to a CCB process before killing
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Validate that PID belongs to a CCB process
 * @param {number} pid - Process ID to validate
 * @param {string} expectedWorkDir - Expected work directory for the CCB instance
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
async function validatePid(pid, expectedWorkDir) {
  if (!pid || pid <= 0) {
    return { valid: false, reason: 'Invalid PID' };
  }

  try {
    // Check if process exists
    try {
      process.kill(pid, 0);
    } catch (e) {
      if (e.code === 'ESRCH') {
        return { valid: false, reason: 'Process not found' };
      }
      throw e;
    }

    // Get process info using ps command
    // Check cmdline to ensure it's a CCB process
    const psOutput = execSync(
      `ps -p ${pid} -o command= 2>/dev/null || true`,
      { encoding: 'utf8', timeout: 2000 }
    ).trim();

    if (!psOutput) {
      return { valid: false, reason: 'Cannot get process info' };
    }

    // Check if command line contains CCB-related keywords
    // Note: CCB process can be the main ccb command or askd daemon
    // The ccb command line typically ends with '/ccb' or contains 'ccb'
    // The askd daemon contains 'askd' or 'claude-code-bridge'
    const isCCBProcess = psOutput.includes('ccb') ||
                         psOutput.includes('askd') ||
                         psOutput.includes('claude-code-bridge') ||
                         psOutput.match(/\/ccb(\s|$)/) ||  // Matches '/ccb' at end or followed by space
                         psOutput.includes('node') && psOutput.includes('ccb');

    if (!isCCBProcess) {
      return { valid: false, reason: 'Not a CCB process' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, reason: `Validation error: ${e.message}` };
  }
}

/**
 * Validate work directory path
 * Prevents path traversal attacks
 * @param {string} workDir - Work directory to validate
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
async function validateWorkDir(workDir) {
  if (!workDir || typeof workDir !== 'string') {
    return { valid: false, reason: 'Invalid work directory' };
  }

  try {
    // Resolve to absolute path
    const resolved = path.resolve(workDir);

    // Check if path exists
    try {
      const stats = await fs.stat(resolved);
      if (!stats.isDirectory()) {
        return { valid: false, reason: 'Not a directory' };
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        return { valid: false, reason: 'Directory does not exist' };
      }
      throw e;
    }

    // Check for path traversal attempts
    if (workDir.includes('..') || workDir.includes('~')) {
      return { valid: false, reason: 'Path traversal detected' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, reason: `Validation error: ${e.message}` };
  }
}

/**
 * Safe kill process with validation
 * @param {number} pid - Process ID to kill
 * @param {string} workDir - Expected work directory
 * @param {string} signal - Signal to send (default: SIGKILL)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function safeKillProcess(pid, workDir, signal = 'SIGKILL') {
  // Validate PID
  const pidValidation = await validatePid(pid, workDir);
  if (!pidValidation.valid) {
    return { success: false, error: `PID validation failed: ${pidValidation.reason}` };
  }

  // Validate work directory
  const workDirValidation = await validateWorkDir(workDir);
  if (!workDirValidation.valid) {
    return { success: false, error: `Work directory validation failed: ${workDirValidation.reason}` };
  }

  // Kill process
  try {
    process.kill(pid, signal);
    return { success: true };
  } catch (e) {
    if (e.code === 'ESRCH') {
      return { success: false, error: 'Process not found' };
    }
    if (e.code === 'EPERM') {
      return { success: false, error: 'Permission denied' };
    }
    return { success: false, error: e.message };
  }
}

module.exports = {
  validatePid,
  validateWorkDir,
  safeKillProcess
};
