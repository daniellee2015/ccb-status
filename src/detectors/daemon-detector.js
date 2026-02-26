/**
 * Daemon Detector
 * Centralized daemon (askd) detection and information gathering
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { isProcessAlive } = require('./process-detector');

/**
 * Get cache directory for CCB state files
 * @returns {string}
 */
function getCacheDir() {
  return path.join(os.homedir(), '.cache', 'ccb', 'projects');
}

/**
 * List all daemon state files
 * @returns {string[]} Array of askd.json file paths
 */
function listDaemonStateFiles() {
  const cacheDir = getCacheDir();
  if (!fs.existsSync(cacheDir)) {
    return [];
  }

  const stateFiles = [];
  const projectDirs = fs.readdirSync(cacheDir);

  for (const projectDir of projectDirs) {
    const stateFile = path.join(cacheDir, projectDir, 'askd.json');
    if (fs.existsSync(stateFile)) {
      stateFiles.push(stateFile);
    }
  }

  return stateFiles;
}

/**
 * Read daemon state file
 * @param {string} stateFile - Path to askd.json
 * @returns {DaemonInfo|null}
 */
function readDaemonState(stateFile) {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return {
      pid: parseInt(data.pid || 0),
      parentPid: data.parent_pid || null,
      port: data.port || 0,
      host: data.host || '127.0.0.1',
      workDir: data.work_dir || path.dirname(path.dirname(stateFile)),
      startedAt: data.started_at || null,
      managed: data.managed || false,
      stateFile: stateFile
    };
  } catch (e) {
    return null;
  }
}

/**
 * Get all daemon instances
 * @returns {DaemonInfo[]}
 */
function getAllDaemons() {
  const stateFiles = listDaemonStateFiles();
  const daemons = [];

  for (const stateFile of stateFiles) {
    const daemon = readDaemonState(stateFile);
    if (daemon) {
      daemons.push(daemon);
    }
  }

  return daemons;
}

/**
 * Get daemon by work directory
 * @param {string} workDir - Work directory
 * @returns {DaemonInfo|null}
 */
function getDaemonByWorkDir(workDir) {
  const daemons = getAllDaemons();
  return daemons.find(d => d.workDir === workDir) || null;
}

/**
 * Check if daemon is alive
 * @param {number} pid - Daemon PID
 * @returns {boolean}
 */
function isDaemonAlive(pid) {
  return isProcessAlive(pid);
}

/**
 * Check if port is listening
 * @param {number} port - Port number
 * @param {string} host - Host address
 * @returns {Promise<boolean>}
 */
async function isPortListening(port, host = '127.0.0.1') {
  if (!port || port <= 0) return false;

  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

module.exports = {
  getCacheDir,
  listDaemonStateFiles,
  readDaemonState,
  getAllDaemons,
  getDaemonByWorkDir,
  isDaemonAlive,
  isPortListening
};
