/**
 * Type Definitions for CCB Status System
 * Centralized type definitions for all CCB-related entities
 */

/**
 * @typedef {Object} ProcessInfo
 * @property {number} pid - Process ID
 * @property {number} ppid - Parent Process ID
 * @property {string} tty - Terminal device
 * @property {string} command - Command line
 */

/**
 * @typedef {Object} TmuxPaneInfo
 * @property {string} paneId - Tmux pane ID (e.g., '%180')
 * @property {string} session - Tmux session name
 * @property {boolean} sessionAttached - Whether session is attached
 * @property {number} panePid - Root process PID of the pane
 * @property {string} paneTty - TTY of the pane
 * @property {string} matchMode - How the match was found ('pane_pid_exact'|'ancestor_pane_pid'|'tty_match')
 */

/**
 * @typedef {Object} DaemonInfo
 * @property {number} pid - Daemon process ID
 * @property {number} parentPid - Parent process ID (shell that started daemon)
 * @property {number} port - Listening port
 * @property {string} host - Host address
 * @property {string} workDir - Working directory
 * @property {string} startedAt - Start timestamp
 * @property {boolean} managed - Whether daemon is managed
 * @property {string} stateFile - Path to askd.json
 */

/**
 * @typedef {Object} CCBProcessInfo
 * @property {number} pid - CCB process ID
 * @property {number} parentPid - Parent process ID
 * @property {string} workDir - Working directory
 * @property {string[]} providers - LLM providers (e.g., ['claude', 'gemini'])
 * @property {string} command - Full command line
 */

/**
 * @typedef {Object} LLMSessionInfo
 * @property {string} provider - Provider name
 * @property {string} status - Session status
 * @property {string} sessionId - Session identifier
 */

/**
 * @typedef {Object} ComponentSnapshot
 * @property {boolean} askdAlive - Askd daemon is running
 * @property {boolean} ccbAlive - CCB process is running
 * @property {boolean} portListening - Port is listening
 * @property {boolean} hasDedicatedTmux - Has tmux pane in attached session
 */

/**
 * @typedef {Object} CCBInstance
 * @property {string} workDir - Working directory (unique identifier)
 * @property {number} pid - Display PID (prefer CCB for visibility)
 * @property {number|null} askdPid - Askd daemon PID
 * @property {number|null} ccbPid - CCB process PID
 * @property {number|null} parentPid - Parent process PID
 * @property {number} port - Listening port
 * @property {string} host - Host address
 * @property {string} status - Instance status ('active'|'orphaned'|'zombie'|'disconnected'|'dead')
 * @property {boolean} isAlive - Whether instance is functional
 * @property {string|null} stateFile - Path to askd.json
 * @property {string|null} startedAt - Start timestamp
 * @property {boolean} managed - Whether daemon is managed
 * @property {TmuxPaneInfo|null} tmuxPane - Tmux pane information
 * @property {LLMSessionInfo[]} llmStatus - LLM session statuses
 * @property {string} uptime - Human-readable uptime
 * @property {boolean} askdConnected - Whether askd is connected (for disconnected instances)
 */

/**
 * @typedef {Object} TmuxMatchResult
 * @property {TmuxPaneInfo} pane - Matched pane
 * @property {string} mode - Match mode ('pane_pid_exact'|'ancestor_pane_pid'|'tty_match')
 */

/**
 * @typedef {Object} QueryConditions
 * @property {string[]} statuses - Filter by status
 * @property {boolean} hasTmux - Filter by tmux presence
 * @property {boolean} isAlive - Filter by alive status
 * @property {string[]} workDirs - Filter by work directories
 * @property {number[]} pids - Filter by PIDs
 */

module.exports = {
  // Type definitions are exported for JSDoc usage
  // No runtime exports needed
};
