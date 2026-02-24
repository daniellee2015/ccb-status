/**
 * Chinese (Simplified) translations
 * 中文（简体）翻译文件
 */

module.exports = {
  // Main Menu
  mainMenu: {
    title: 'CCB Status Monitor',
    description: '实时监控 CCB 实例',
    menuTitle: '选择一个选项：',
    options: {
      viewInstances: '查看活动实例',
      viewHistory: '查看实例历史',
      refreshStatus: '刷新状态',
      instanceManagement: 'CCB 实例管理',
      tmuxManagement: 'Tmux 会话管理',
      languageSettings: '语言设置',
      exit: '退出'
    }
  },

  // Language Settings
  languageSettings: {
    title: '语言设置',
    selectLanguage: '选择语言：',
    currentLanguage: '当前语言：',
    chinese: '中文',
    english: 'English',
    languageChanged: '语言已切换',
    back: '返回'
  },

  // Instance List
  instanceList: {
    title: '活动实例列表',
    noInstances: '未找到 CCB 实例。',
    pressEnter: '按 Enter 键返回...',
    legend: '✓ 活动  ⊙ 后台残留  ⚠ 僵尸/连接断开  ✗ 已停止  |  [CCB] 独立  [Multi] 托管',
    status: {
      active: '✓ 活动',
      zombie: '⚠ 僵尸',
      dead: '✗ 已停止',
      orphaned: '⊙ 后台残留',
      removed: '⊗ 已删除',
      disconnected: '⚠ 连接断开'
    },
    type: {
      ccb: '[CCB]',
      multi: '[Multi]'
    },
    back: '返回'
  },

  // Instance Details
  instanceDetails: {
    daemonStatus: '守护进程状态：',
    status: '状态：',
    statusRunning: '✓ 运行中',
    statusStopped: '✗ 已停止',
    pid: 'PID：',
    port: '端口：',
    host: '主机：',
    uptime: '运行时间：',
    started: '启动时间：',
    managed: '托管：',
    parentPid: '父进程 PID：',
    yes: '是',
    no: '否',
    na: '不适用',
    unknown: '未知',

    tmuxInfo: 'Tmux 信息：',
    paneId: '面板 ID：',
    title: '标题：',

    llmSessions: 'LLM 会话：',
    llmActive: '✓ 活动',
    llmInactive: '✗ 未活动',
    claude: 'Claude：',
    gemini: 'Gemini：',
    opencode: 'OpenCode：',
    codex: 'Codex：',

    files: '文件：',
    stateFile: '状态文件：',
    workDir: '工作目录：',

    refresh: '刷新',
    back: '返回'
  },

  // History
  history: {
    title: '实例历史',
    noHistory: '未找到历史记录。',
    legend: '✓ 活动  ⚠ 僵尸  ✗ 死亡  ⊗ 已移除  |  [CCB] 独立  [Multi] 托管',
    back: '返回',
    status: {
      active: '✓ 活动',
      zombie: '⚠ 僵尸',
      dead: '✗ 死亡',
      orphaned: '⊙ 后台残留',
      disconnected: '⚠ 连接断开',
      removed: '⊗ 已移除'
    },
    type: {
      ccb: '[CCB]',
      multi: '[Multi]'
    },
    columns: {
      number: '#',
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      status: '状态',
      type: '类型',
      tmux: 'Tmux',
      runs: '运行次数',
      first: '首次'
    }
  },

  // Zombie Detection
  // Instance Management
  instanceManagement: {
    title: 'CCB 实例管理',
    statusSummary: '状态摘要：',
    active: '✓ 活动：  {count}',
    orphaned: '⊙ 后台残留：  {count}',
    zombie: '⚠ 僵尸：  {count}',
    disconnected: '⚠ 连接断开：  {count}',
    dead: '✗ 已停止：  {count}',
    allHealthy: '✓ 所有实例都健康',
    foundOrphaned: '⊙ 发现 {count} 个后台残留进程（窗口已关闭）',
    foundZombies: '⚠ 发现 {count} 个僵尸实例',
    foundDisconnected: '⚠ 发现 {count} 个连接断开的实例（状态文件丢失）',
    foundDead: '✗ 发现 {count} 个已停止实例',

    // Menu scenarios
    killScenario: '永久停止 CCB（切换项目、释放资源）',
    cleanupScenario: '清理状态文件（手动 kill 后、系统崩溃后）',
    restartScenario: '修复卡死的 CCB（无响应、配置更改后）',

    // Menu categories
    killOpsMenu: 'Kill 操作',
    cleanupOpsMenu: 'Cleanup 操作',
    restartOpsMenu: 'Restart 操作',

    // Kill operations
    killActive: 'Kill Active Instances',
    killActiveHint: '杀死正在运行的 CCB 进程',
    killZombie: 'Kill Zombie Instances',
    killZombieHint: '杀死卡死的 CCB 进程',
    killAll: 'Kill All Instances',
    killAllHint: '杀死所有 CCB 进程',

    // Cleanup operations
    cleanupDead: 'Cleanup Dead States',
    cleanupDeadHint: '清理已退出进程的状态文件',
    cleanupZombie: 'Cleanup Zombie States',
    cleanupZombieHint: '清理卡死进程的状态文件',
    cleanupAll: 'Cleanup All States',
    cleanupAllHint: '清理所有未使用的状态文件',

    // Restart operations
    restartZombie: 'Restart Zombie Instances',
    restartZombieHint: '杀死卡死进程并重启',
    restartDead: 'Restart Dead Instances',
    restartDeadHint: '重启已退出的进程',
    recoverDisconnected: 'Recover Disconnected Instances',
    recoverDisconnectedHint: '恢复状态文件丢失的实例',
    restartAll: 'Restart All Instances',
    restartAllHint: '重启所有实例',

    // Other
    detectStatus: 'Status Detection',
    detectHint: '重新检查所有实例状态',
    back: '返回'
  },

  // Kill Operations
  killOperations: {
    title: 'Kill 操作',
    description: '杀死 CCB 进程（不重启）',
    scenario: '使用场景：',
    scenarioDesc: '当你想永久停止 CCB 实例时（例如：切换项目、释放资源）'
  },

  // Cleanup Operations
  cleanupOperations: {
    title: 'Cleanup 操作',
    description: '清理 CCB 实例的状态文件',
    scenario: '使用场景：',
    scenarioDesc: '当 CCB 已停止但状态文件仍存在时（例如：手动 kill 后、系统崩溃后）'
  },

  // Restart Operations
  restartOperations: {
    title: 'Restart 操作',
    description: '杀死并重启 CCB 实例',
    scenario: '使用场景：',
    scenarioDesc: '当 CCB 卡死/无响应或需要重新启动时（例如：无法输入、配置更改后）'
  },

  // Cleanup
  cleanup: {
    title: '清理僵尸进程',
    detectPrompt: '按 "d" 检测僵尸进程并查看清理选项',
    scenarioGuide: '使用说明：',
    zombieScenario: '重启僵尸进程：进程存在但端口未监听（kill + 重启）',
    deadScenario: '重启死亡进程：进程不存在（直接重启）',
    statusDetection: '状态检测：',
    active: '✓ 活动：  {count}',
    zombie: '⚠ 僵尸：  {count}',
    dead: '✗ 死亡：  {count}',
    noZombies: '✓ 未发现僵尸进程。所有实例都健康。',
    foundZombies: '⚠ 发现 {count} 个需要清理的僵尸进程：',
    detectStatus: '检测状态',
    reDetect: '重新检测',
    cleanupAll: '清理全部',
    restartZombie: '重启僵尸进程',
    restartDead: '重启死亡进程',
    back: '返回'
  },

  // Tmux Management
  tmuxManagement: {
    title: 'Tmux 会话管理',
    allSessions: '(所有会话)',
    attachedOnly: '(仅已连接)',
    noSessions: '⚠ 未找到 tmux 会话',
    failedToGet: '✗ 获取 tmux 会话失败：{error}',
    makeSureTmux: '请确保 tmux 正在运行',
    sessionOverview: '会话概览：',
    totalSessions: '总会话数：{count} ({attached} 个已连接)',
    totalWindows: '总窗口数：{count}',
    totalPanes: '总面板数：{count}',
    runningCCB: '运行中的 CCB：{count}',
    view: '视图：{mode}',
    viewAll: '所有会话',
    viewAttached: '仅已连接',
    legend: '* = 正在使用 | [active/zombie] = CCB daemon 状态',
    refresh: '刷新',
    toggleAll: '切换 全部/已连接',
    killWindow: '关闭窗口',
    killSession: '关闭会话',
    back: '返回'
  },

  // Restart Zombie
  restartZombie: {
    title: '重启僵尸实例',
    noZombies: '✓ 未找到僵尸实例',
    selectPrompt: '选择要重启的实例：',
    checkboxTitle: '选择僵尸实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将重启以下僵尸实例（先杀死进程再重启）',
    confirmPrompt: '确认重启 {count} 个僵尸实例？',
    restarting: '正在重启实例...',
    processing: '正在处理 {project} [{hash}]...',
    successCount: '✓ 成功重启 {count} 个实例',
    failCount: '✗ 重启失败 {count} 个实例',
    pressEnter: '按 Enter 键继续...',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      pid: 'PID',
      port: '端口',
      tmux: 'Tmux'
    }
  },

  // Restart Dead
  restartDead: {
    title: '重启死亡实例',
    noDead: '✓ 未找到死亡实例',
    selectPrompt: '选择要重启的实例：',
    checkboxTitle: '选择死亡实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将重启以下死亡实例',
    confirmPrompt: '确认重启 {count} 个死亡实例？',
    restarting: '正在重启实例...',
    processing: '正在处理 {project} [{hash}]...',
    successCount: '✓ 成功重启 {count} 个实例',
    failCount: '✗ 重启失败 {count} 个实例',
    pressEnter: '按 Enter 键继续...',
    legend: '✓ = Tmux 面板存在 | ✗ = 需要创建新窗口',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      tmux: 'Tmux',
      workDir: '工作目录'
    }
  },

  // Recover Disconnected
  recoverDisconnected: {
    title: '恢复断开连接的实例',
    noDisconnected: '✓ 未找到断开连接的实例',
    selectPrompt: '选择要恢复的实例：',
    checkboxTitle: '选择断开连接的实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将恢复以下断开连接的实例（杀死 CCB 守护进程然后重启）',
    confirmPrompt: '确认恢复 {count} 个断开连接的实例？',
    recovering: '正在恢复实例...',
    processing: '正在处理 {project} [{hash}]...',
    successCount: '✓ 成功恢复 {count} 个实例',
    failCount: '✗ 恢复失败 {count} 个实例',
    pressEnter: '按 Enter 键继续...',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      pid: 'PID',
      port: '端口',
      status: '状态',
      tmux: 'Tmux'
    }
  },

  // Kill Active
  killActive: {
    title: 'Kill Active Instances',
    noActive: '✓ 未找到活动实例',
    selectPrompt: '选择要杀死的实例：',
    selectInstances: '选择活动实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将杀死以下实例',
    confirmPrompt: '确认杀死 {count} 个活动实例？',
    killing: '正在杀死实例...',
    killed: '已杀死 PID {pid}',
    failed: '失败：{error}',
    complete: 'Kill 操作完成',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      pid: 'PID',
      port: '端口',
      status: '状态'
    }
  },

  // Cleanup Dead
  cleanupDead: {
    title: 'Cleanup Dead Instances',
    noDead: '✓ 未找到死亡实例',
    selectPrompt: '选择要清理的实例：',
    selectInstances: '选择死亡实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将清理以下死亡实例的状态文件',
    confirmPrompt: '确认清理 {count} 个死亡实例？',
    confirmCleanup: '清理 {count} 个死亡实例？',
    cleaning: '正在清理状态文件...',
    cleaned: '状态文件已删除',
    failed: '失败：{error}',
    complete: 'Cleanup 操作完成',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      workDir: '工作目录',
      tmux: 'Tmux'
    }
  },

  // Kill Zombie
  killZombie: {
    title: 'Kill Zombie Instances',
    noZombies: '✓ 未找到僵尸实例',
    selectPrompt: '选择要杀死的实例：',
    selectInstances: '选择僵尸实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将杀死以下僵尸实例',
    confirmPrompt: '确认杀死 {count} 个僵尸实例？',
    confirmKill: '杀死 {count} 个僵尸实例？',
    killing: '正在杀死实例...',
    killed: '已杀死 PID {pid}',
    failed: '失败：{error}',
    complete: 'Kill 操作完成',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      pid: 'PID',
      port: '端口',
      tmux: 'Tmux'
    }
  },

  // Cleanup Zombie
  cleanupZombie: {
    title: 'Cleanup Zombie Instances',
    noZombies: '✓ 未找到僵尸实例',
    selectPrompt: '选择要清理的实例：',
    selectInstances: '选择僵尸实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将清理以下僵尸实例',
    confirmPrompt: '确认清理 {count} 个僵尸实例？',
    cleaning: '正在清理状态文件...',
    cleaned: '状态文件已删除',
    killFailed: 'Kill 失败：{error}',
    failed: '失败：{error}',
    complete: 'Cleanup 操作完成',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      pid: 'PID',
      port: '端口',
      status: '状态'
    }
  },

  // Kill All
  killAll: {
    title: 'Kill All Instances',
    noInstances: '✓ 未找到实例',
    selectPrompt: '选择要杀死的实例：',
    selectInstances: '选择实例（空格切换，回车确认）',
    confirmKill: '杀死 {count} 个实例？',
    killing: '正在杀死实例...',
    killed: '已杀死 PID {pid}',
    failed: '失败：{error}',
    complete: 'Kill 操作完成',
    legend: '✓ = 活动 | ⚠ = 僵尸',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      hash: '哈希',
      type: '类型',
      pid: 'PID',
      port: '端口'
    }
  },

  // Cleanup All
  cleanupAll: {
    title: 'Cleanup All Instances',
    noInstances: '✓ 没有需要清理的实例',
    selectPrompt: '选择要清理的实例：',
    selectInstances: '选择实例（空格切换，回车确认）',
    confirmationWarning: '警告：即将清理以下实例（僵尸进程将被杀死）',
    confirmPrompt: '确认清理 {count} 个实例？',
    confirmCleanup: '清理 {count} 个实例？',
    cleaning: '正在清理状态文件...',
    cleaned: '状态文件已删除',
    failed: '失败：{error}',
    complete: 'Cleanup 操作完成',
    legend: '✗ = 死亡 | ⚠ = 僵尸',
    select: '选择',
    back: '返回',
    columns: {
      project: '项目',
      parent: '父项目',
      hash: '哈希',
      type: '类型',
      workDir: '工作目录',
      tmux: 'Tmux'
    }
  },

  // Common
  common: {
    cancel: '取消',
    hints: {
      navigate: '↑↓ 导航',
      select: 'Enter 选择',
      back: 'B 返回',
      refresh: 'R 刷新',
      checkboxHelp: '使用 ↑↓ 导航，空格 选择/取消，回车 确认，或选择 "0. 取消"'
    }
  },

  // Confirmation
  confirmation: {
    legend: '✓tmux = 有 tmux 窗口 | ⚠no-tmux = 无 tmux 窗口（可能是孤儿进程）'
  }
};
