/**
 * Unified Detector Entry Point
 * Provides centralized access to all detection capabilities
 */

// Process Detection
const ProcessDetector = require('./process-detector');

// Tmux Detection
const TmuxDetector = require('./tmux-detector');

// Daemon Detection
const DaemonDetector = require('./daemon-detector');

// CCB Process Detection
const CCBDetector = require('./ccb-detector');

/**
 * Unified detector interface
 * Provides organized access to all detection functions
 */
const Detectors = {
  /**
   * Process-related detections
   */
  process: {
    getTable: ProcessDetector.getProcessTable,
    isAlive: ProcessDetector.isProcessAlive,
    getInfo: ProcessDetector.getProcessInfo,
    getWorkDir: ProcessDetector.getProcessWorkDir,
    findByCommand: ProcessDetector.findProcessesByCommand,
    getAncestry: ProcessDetector.getProcessAncestry
  },

  /**
   * Tmux-related detections
   */
  tmux: {
    listPanes: TmuxDetector.listTmuxPanes,
    listSessions: TmuxDetector.listTmuxSessions,
    findPaneByParentPid: TmuxDetector.findTmuxPaneByParentPid,
    hasPaneInAttachedSession: TmuxDetector.hasTmuxPane,
    getSession: TmuxDetector.getTmuxSession,
    locatePid: TmuxDetector.locatePidInTmux
  },

  /**
   * Daemon (askd) related detections
   */
  daemon: {
    listStateFiles: DaemonDetector.listDaemonStateFiles,
    readState: DaemonDetector.readDaemonState,
    getAll: DaemonDetector.getAllDaemons,
    getByWorkDir: DaemonDetector.getDaemonByWorkDir,
    isAlive: DaemonDetector.isDaemonAlive,
    isPortListening: DaemonDetector.isPortListening
  },

  /**
   * CCB process related detections
   */
  ccb: {
    findAll: CCBDetector.findAllCCBProcesses,
    getByWorkDir: CCBDetector.getCCBProcessByWorkDir,
    isAlive: CCBDetector.isCCBProcessAlive,
    getProviders: CCBDetector.getCCBProviders
  }
};

module.exports = Detectors;
