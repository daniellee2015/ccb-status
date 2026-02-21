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
    legend: '✓ 活动  ⚠ 僵尸  ✗ 死亡  |  [CCB] 独立  [Multi] 托管',
    status: {
      active: '✓ 活动',
      zombie: '⚠ 僵尸',
      dead: '✗ 死亡'
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
      removed: '⊗ 已移除'
    },
    type: {
      ccb: '[CCB]',
      multi: '[Multi]'
    },
    columns: {
      number: '#',
      project: '项目',
      hash: '哈希',
      status: '状态',
      type: '类型',
      tmux: 'Tmux',
      runs: '运行次数',
      first: '首次'
    }
  },

  // Zombie Detection
  zombieDetection: {
    title: 'CCB 实例管理',
    statusSummary: '状态摘要：',
    allHealthy: '✓ 所有实例都健康',
    foundZombies: '⚠ 发现 {count} 个僵尸实例',
    foundDead: '✗ 发现 {count} 个死亡实例',
    detectPrompt: '按 "d" 检测实例状态',
    detectStatus: '检测状态',
    cleanup: '清理全部',
    back: '返回'
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
    confirmPrompt: '重启 {count} 个僵尸实例？',
    restarting: '正在重启实例...',
    processing: '正在处理 {project} [{hash}]...',
    successCount: '✓ 成功重启 {count} 个实例',
    failCount: '✗ 重启失败 {count} 个实例',
    pressEnter: '按 Enter 键继续...',
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

  // Restart Dead
  restartDead: {
    title: '重启死亡实例',
    noDead: '✓ 未找到死亡实例',
    selectPrompt: '选择要重启的实例：',
    checkboxTitle: '选择死亡实例（空格切换，回车确认）',
    confirmPrompt: '重启 {count} 个死亡实例？',
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
      hash: '哈希',
      type: '类型',
      tmux: 'Tmux',
      workDir: '工作目录'
    }
  },

  // Common
  common: {
    hints: {
      navigate: '↑↓ 导航',
      select: 'Enter 选择',
      back: 'B 返回',
      refresh: 'R 刷新'
    }
  }
};
