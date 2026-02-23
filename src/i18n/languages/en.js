/**
 * English translations
 * 英文翻译文件
 */

module.exports = {
  // Main Menu
  mainMenu: {
    title: 'CCB Status Monitor',
    description: 'Real-time monitoring for CCB instances',
    menuTitle: 'Select an option:',
    options: {
      viewInstances: 'View Active Instances',
      viewHistory: 'View Instance History',
      refreshStatus: 'Refresh Status',
      instanceManagement: 'CCB Instance Management',
      tmuxManagement: 'Tmux Session Management',
      languageSettings: 'Language Settings',
      exit: 'Exit'
    }
  },

  // Language Settings
  languageSettings: {
    title: 'Language Settings',
    selectLanguage: 'Select Language:',
    currentLanguage: 'Current Language:',
    chinese: '中文',
    english: 'English',
    languageChanged: 'Language changed',
    back: 'Back'
  },

  // Instance List
  instanceList: {
    title: 'Active Instances List',
    noInstances: 'No CCB instances found.',
    pressEnter: 'Press Enter to return...',
    legend: '✓ Active  ⊙ Orphaned  ⚠ Zombie  ✗ Dead  |  [CCB] Standalone  [Multi] Managed',
    status: {
      active: '✓ Active',
      zombie: '⚠ Zombie',
      dead: '✗ Dead',
      orphaned: '⊙ Orphaned',
      removed: '⊗ Removed'
    },
    type: {
      ccb: '[CCB]',
      multi: '[Multi]'
    },
    back: 'Back'
  },

  // Instance Details
  instanceDetails: {
    daemonStatus: 'Daemon Status:',
    status: 'Status:',
    statusRunning: '✓ Running',
    statusStopped: '✗ Stopped',
    pid: 'PID:',
    port: 'Port:',
    host: 'Host:',
    uptime: 'Uptime:',
    started: 'Started:',
    managed: 'Managed:',
    parentPid: 'Parent PID:',
    yes: 'Yes',
    no: 'No',
    na: 'N/A',
    unknown: 'Unknown',

    tmuxInfo: 'Tmux Info:',
    paneId: 'Pane ID:',
    title: 'Title:',

    llmSessions: 'LLM Sessions:',
    llmActive: '✓ Active',
    llmInactive: '✗ Inactive',
    claude: 'Claude:',
    gemini: 'Gemini:',
    opencode: 'OpenCode:',
    codex: 'Codex:',

    files: 'Files:',
    stateFile: 'State:',
    workDir: 'Work Dir:',

    refresh: 'Refresh',
    back: 'Back'
  },

  // History
  history: {
    title: 'Instance History',
    noHistory: 'No history records found.',
    legend: '✓ Active  ⚠ Zombie  ✗ Dead  ⊗ Removed  |  [CCB] Standalone  [Multi] Managed',
    back: 'Back',
    status: {
      active: '✓ Active',
      zombie: '⚠ Zombie',
      dead: '✗ Dead',
      removed: '⊗ Removed'
    },
    type: {
      ccb: '[CCB]',
      multi: '[Multi]'
    },
    columns: {
      number: '#',
      project: 'Project',
      parent: 'Parent',
      hash: 'Hash',
      status: 'Status',
      type: 'Type',
      tmux: 'Tmux',
      runs: 'Runs',
      first: 'First'
    }
  },

  // Zombie Detection
  // Instance Management
  instanceManagement: {
    title: 'CCB Instance Management',
    statusSummary: 'Status Summary:',
    active: '✓ Active:  {count}',
    orphaned: '⊙ Orphaned:  {count}',
    zombie: '⚠ Zombie:  {count}',
    dead: '✗ Dead:    {count}',
    allHealthy: '✓ All instances are healthy',
    foundOrphaned: '⊙ Found {count} orphaned process(es) (window closed)',
    foundZombies: '⚠ Found {count} zombie instance(s)',
    foundDead: '✗ Found {count} dead instance(s)',

    // Menu scenarios
    killScenario: 'Stop CCB permanently (switching projects, freeing resources)',
    cleanupScenario: 'Remove state files after CCB stopped (manual kill, crash)',
    restartScenario: 'Fix stuck/frozen CCB (unresponsive, config changes)',

    // Menu categories
    killOpsMenu: 'Kill Operations',
    cleanupOpsMenu: 'Cleanup Operations',
    restartOpsMenu: 'Restart Operations',

    // Kill operations
    killActive: 'Kill Active Instances',
    killActiveHint: 'Kill running CCB processes',
    killZombie: 'Kill Zombie Instances',
    killZombieHint: 'Kill stuck CCB processes',
    killAll: 'Kill All Instances',
    killAllHint: 'Kill all CCB processes',

    // Cleanup operations
    cleanupDead: 'Cleanup Dead States',
    cleanupDeadHint: 'Remove state files for exited processes',
    cleanupZombie: 'Cleanup Zombie States',
    cleanupZombieHint: 'Remove state files for stuck processes',
    cleanupAll: 'Cleanup All States',
    cleanupAllHint: 'Remove all unused state files',

    // Restart operations
    restartZombie: 'Restart Zombie Instances',
    restartZombieHint: 'Kill stuck processes and restart',
    restartDead: 'Restart Dead Instances',
    restartDeadHint: 'Restart exited processes',
    restartAll: 'Restart All Instances',
    restartAllHint: 'Restart all instances',

    // Other
    detectStatus: 'Status Detection',
    detectHint: 'Re-check all instance status',
    back: 'Back'
  },

  // Kill Operations
  killOperations: {
    title: 'Kill Operations',
    description: 'Kill CCB processes without restarting',
    scenario: 'When to use:',
    scenarioDesc: 'When you want to stop CCB instances permanently (e.g., switching projects, freeing resources)'
  },

  // Cleanup Operations
  cleanupOperations: {
    title: 'Cleanup Operations',
    description: 'Remove state files for CCB instances',
    scenario: 'When to use:',
    scenarioDesc: 'When CCB has stopped but state files remain (e.g., after manual kill, system crash)'
  },

  // Restart Operations
  restartOperations: {
    title: 'Restart Operations',
    description: 'Kill and restart CCB instances',
    scenario: 'When to use:',
    scenarioDesc: 'When CCB is stuck/frozen or needs a fresh start (e.g., unresponsive, config changes)'
  },

  // Cleanup
  cleanup: {
    title: 'Cleanup Zombie Processes',
    detectPrompt: 'Press "d" to detect zombie processes and view cleanup options',
    scenarioGuide: 'Usage Guide:',
    zombieScenario: 'Restart Zombie: Process exists but port not listening (kill + restart)',
    deadScenario: 'Restart Dead: Process not exists (direct restart)',
    statusDetection: 'Status Detection:',
    active: '✓ Active:  {count}',
    zombie: '⚠ Zombie:  {count}',
    dead: '✗ Dead:    {count}',
    noZombies: '✓ No zombie processes found. All instances are healthy.',
    foundZombies: '⚠ Found {count} zombie process(es) that need cleanup:',
    detectStatus: 'Detect Status',
    reDetect: 'Re-detect',
    cleanupAll: 'Cleanup All',
    restartZombie: 'Restart Zombie',
    restartDead: 'Restart Dead',
    back: 'Back'
  },

  // Tmux Management
  tmuxManagement: {
    title: 'Tmux Session Management',
    allSessions: '(All Sessions)',
    attachedOnly: '(Attached Only)',
    noSessions: '⚠ No tmux sessions found',
    failedToGet: '✗ Failed to get tmux sessions: {error}',
    makeSureTmux: 'Make sure tmux is running',
    sessionOverview: 'Session Overview:',
    totalSessions: 'Total Sessions: {count} ({attached} attached)',
    totalWindows: 'Total Windows: {count}',
    totalPanes: 'Total Panes: {count}',
    runningCCB: 'Running CCB: {count}',
    view: 'View: {mode}',
    viewAll: 'All sessions',
    viewAttached: 'Attached only',
    legend: '* = In use | [active/zombie] = CCB daemon status',
    refresh: 'Refresh',
    toggleAll: 'Toggle All/Attached',
    killWindow: 'Kill Window',
    killSession: 'Kill Session',
    back: 'Back'
  },

  // Restart Zombie
  restartZombie: {
    title: 'Restart Zombie Instances',
    noZombies: '✓ No zombie instances found',
    selectPrompt: 'Select instances to restart:',
    checkboxTitle: 'Select Zombie Instances (Space to toggle, Enter to confirm)',
    confirmPrompt: 'Restart {count} zombie instance(s)?',
    restarting: 'Restarting instances...',
    processing: 'Processing {project} [{hash}]...',
    successCount: '✓ Successfully restarted {count} instance(s)',
    failCount: '✗ Failed to restart {count} instance(s)',
    pressEnter: 'Press Enter to continue...',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      pid: 'PID',
      port: 'Port'
    }
  },

  // Restart Dead
  restartDead: {
    title: 'Restart Dead Instances',
    noDead: '✓ No dead instances found',
    selectPrompt: 'Select instances to restart:',
    checkboxTitle: 'Select Dead Instances (Space to toggle, Enter to confirm)',
    confirmPrompt: 'Restart {count} dead instance(s)?',
    restarting: 'Restarting instances...',
    processing: 'Processing {project} [{hash}]...',
    successCount: '✓ Successfully restarted {count} instance(s)',
    failCount: '✗ Failed to restart {count} instance(s)',
    pressEnter: 'Press Enter to continue...',
    legend: '✓ = Tmux pane exists | ✗ = Need to create new window',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      tmux: 'Tmux',
      workDir: 'Work Directory'
    }
  },

  // Kill Active
  killActive: {
    title: 'Kill Active Instances',
    noActive: '✓ No active instances found',
    selectPrompt: 'Select instances to kill:',
    selectInstances: 'Select Active Instances (Space to toggle, Enter to confirm)',
    confirmKill: 'Kill {count} active instance(s)?',
    killing: 'Killing instances...',
    killed: 'Killed PID {pid}',
    failed: 'Failed: {error}',
    complete: 'Kill operation complete',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      pid: 'PID',
      port: 'Port'
    }
  },

  // Cleanup Dead
  cleanupDead: {
    title: 'Cleanup Dead Instances',
    noDead: '✓ No dead instances found',
    selectPrompt: 'Select instances to cleanup:',
    selectInstances: 'Select Dead Instances (Space to toggle, Enter to confirm)',
    confirmCleanup: 'Cleanup {count} dead instance(s)?',
    cleaning: 'Cleaning up state files...',
    cleaned: 'State files removed',
    failed: 'Failed: {error}',
    complete: 'Cleanup operation complete',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      workDir: 'Work Directory'
    }
  },

  // Kill Zombie
  killZombie: {
    title: 'Kill Zombie Instances',
    noZombies: '✓ No zombie instances found',
    selectPrompt: 'Select instances to kill:',
    selectInstances: 'Select Zombie Instances (Space to toggle, Enter to confirm)',
    confirmKill: 'Kill {count} zombie instance(s)?',
    killing: 'Killing instances...',
    killed: 'Killed PID {pid}',
    failed: 'Failed: {error}',
    complete: 'Kill operation complete',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      pid: 'PID',
      port: 'Port'
    }
  },

  // Cleanup Zombie
  cleanupZombie: {
    title: 'Cleanup Zombie Instances',
    noZombies: '✓ No zombie instances found',
    selectPrompt: 'Select instances to cleanup:',
    selectInstances: 'Select Zombie Instances (Space to toggle, Enter to confirm)',
    confirmCleanup: 'Cleanup {count} zombie instance(s)?',
    cleaning: 'Cleaning up state files...',
    cleaned: 'State files removed',
    failed: 'Failed: {error}',
    complete: 'Cleanup operation complete',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      pid: 'PID'
    }
  },

  // Kill All
  killAll: {
    title: 'Kill All Instances',
    noInstances: '✓ No instances found',
    selectPrompt: 'Select instances to kill:',
    selectInstances: 'Select Instances (Space to toggle, Enter to confirm)',
    confirmKill: 'Kill {count} instance(s)?',
    killing: 'Killing instances...',
    killed: 'Killed PID {pid}',
    failed: 'Failed: {error}',
    complete: 'Kill operation complete',
    legend: '✓ = Active | ⚠ = Zombie',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      pid: 'PID',
      port: 'Port'
    }
  },

  // Cleanup All
  cleanupAll: {
    title: 'Cleanup All Instances',
    noInstances: '✓ No instances to cleanup',
    selectPrompt: 'Select instances to cleanup:',
    selectInstances: 'Select Instances (Space to toggle, Enter to confirm)',
    confirmCleanup: 'Cleanup {count} instance(s)?',
    cleaning: 'Cleaning up state files...',
    cleaned: 'State files removed',
    failed: 'Failed: {error}',
    complete: 'Cleanup operation complete',
    legend: '✗ = Dead | ⚠ = Zombie',
    select: 'Select',
    back: 'Back',
    columns: {
      project: 'Project',
      hash: 'Hash',
      type: 'Type',
      workDir: 'Work Directory'
    }
  },

  // Common
  common: {
    hints: {
      navigate: '↑↓ Navigate',
      select: 'Enter Select',
      back: 'B Back',
      refresh: 'R Refresh'
    }
  }
};
