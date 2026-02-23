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
    // Check cmdline and cwd to ensure it's a CCB process
    const psOutput = execSync(
      `ps -p ${pid} -o command=,cwd= 2>/dev/null || true`,
      { encoding: 'utf8', timeout: 2000 }
    ).trim();

    if (!psOutput) {
      return { valid: false, reason: 'Cannot get process info' };
    }

    const lines = psOutput.split('\n');
    if (lines.length === 0) {
      return { valid: false, reason: 'Process not found' };
    }

    const processInfo = lines[0];

    // Check if it's a node process (CCB runs on Node.js)
    if (!processInfo.includes('node') && !processInfo.includes('Node')) {
      return { valid: false, reason: 'Not a Node.js process' };
    }

    // Check if command line contains CCB-related keywords
    const isCCBProcess = processInfo.includes('ccb') ||
                         processInfo.includes('askd') ||
                         processInfo.includes('claude-code-bridge');

    if (!isCCBProcess) {
      return { valid: false, reason: 'Not a CCB process' };
    }

    // Validate work directory if provided
    if (expectedWorkDir) {
      const normalizedExpected = path.resolve(expectedWorkDir);

      // Check if process cwd matches expected work directory
      // Note: ps output format varies, so we do a contains check
      if (!processInfo.includes(normalizedExpected)) {
        return { valid: false, reason: 'Work directory mismatch' };
      }
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
