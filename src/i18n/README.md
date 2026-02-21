# i18n 国际化实施说明

## 目录结构

```
src/i18n/
├── index.js           # i18n 初始化模块，导出 tc 函数
└── languages/
    ├── zh.js          # 中文（简体）翻译
    └── en.js          # 英文翻译
```

## 使用方法

### 1. 导入 tc 函数

```javascript
const { tc } = require('../../i18n');
```

### 2. 使用翻译键

```javascript
// 简单翻译
const title = tc('mainMenu.title');

// 带参数的翻译（未来扩展）
const message = tc('someKey', { count: 5, name: 'John' });
```

### 3. 切换语言

默认语言为中文（zh），可以通过以下方式切换：

#### 方法 1：环境变量
```bash
export CCB_LANG=en
ccb-status
```

#### 方法 2：代码中切换
```javascript
const { setLanguage } = require('./i18n');
setLanguage('en');
```

## 翻译键结构

### mainMenu（主菜单）
- `mainMenu.title` - 标题
- `mainMenu.description` - 描述
- `mainMenu.menuTitle` - 菜单标题
- `mainMenu.options.viewInstances` - 查看活动实例
- `mainMenu.options.viewHistory` - 查看实例历史
- `mainMenu.options.refreshStatus` - 刷新状态
- `mainMenu.options.instanceManagement` - CCB 实例管理
- `mainMenu.options.tmuxManagement` - Tmux 会话管理
- `mainMenu.options.exit` - 退出

### instanceList（实例列表）
- `instanceList.title` - 标题
- `instanceList.noInstances` - 无实例提示
- `instanceList.pressEnter` - 按键提示
- `instanceList.legend` - 图例说明
- `instanceList.status.active` - 活动状态 (✓ 活动)
- `instanceList.status.zombie` - 僵尸状态 (⚠ 僵尸)
- `instanceList.status.dead` - 死亡状态 (✗ 死亡)
- `instanceList.type.ccb` - CCB 类型 ([CCB])
- `instanceList.type.multi` - Multi 类型 ([Multi])
- `instanceList.back` - 返回

### instanceDetails（实例详情）
- `instanceDetails.daemonStatus` - 守护进程状态
- `instanceDetails.status` - 状态
- `instanceDetails.statusRunning` - 运行中 (✓ 运行中)
- `instanceDetails.statusStopped` - 已停止 (✗ 已停止)
- `instanceDetails.pid` - PID
- `instanceDetails.port` - 端口
- `instanceDetails.host` - 主机
- `instanceDetails.uptime` - 运行时间
- `instanceDetails.started` - 启动时间
- `instanceDetails.managed` - 托管
- `instanceDetails.parentPid` - 父进程 PID
- `instanceDetails.yes` - 是
- `instanceDetails.no` - 否
- `instanceDetails.na` - 不适用
- `instanceDetails.unknown` - 未知
- `instanceDetails.tmuxInfo` - Tmux 信息
- `instanceDetails.paneId` - 面板 ID
- `instanceDetails.title` - 标题
- `instanceDetails.llmSessions` - LLM 会话
- `instanceDetails.llmActive` - 活动 (✓ 活动)
- `instanceDetails.llmInactive` - 未活动 (✗ 未活动)
- `instanceDetails.claude` - Claude
- `instanceDetails.gemini` - Gemini
- `instanceDetails.opencode` - OpenCode
- `instanceDetails.codex` - Codex
- `instanceDetails.files` - 文件
- `instanceDetails.stateFile` - 状态文件
- `instanceDetails.workDir` - 工作目录
- `instanceDetails.refresh` - 刷新
- `instanceDetails.back` - 返回

### common（通用）
- `common.hints.navigate` - 导航提示 (↑↓ 导航)
- `common.hints.select` - 选择提示 (Enter 选择)
- `common.hints.back` - 返回提示 (B 返回)
- `common.hints.refresh` - 刷新提示 (R 刷新)

## 已修改的文件

1. `/Users/danlio/Repositories/claude_code_bridge_multi/ccb-status/src/cli/menus/main-menu.js`
   - 导入 tc 函数
   - 所有硬编码文本替换为 tc() 调用

2. `/Users/danlio/Repositories/claude_code_bridge_multi/ccb-status/src/cli/menus/instance-list.js`
   - 导入 tc 函数
   - 状态显示、类型标签、提示文本等使用 i18n

3. `/Users/danlio/Repositories/claude_code_bridge_multi/ccb-status/src/cli/menus/instance-details.js`
   - 导入 tc 函数
   - 所有标签、状态、提示文本使用 i18n

## 特性

- ✓ 支持中文和英文双语
- ✓ 默认语言为中文
- ✓ 保持所有状态符号一致（✓、⚠、✗、⊗）
- ✓ 支持参数替换（预留功能）
- ✓ 环境变量控制语言切换
- ✓ 键未找到时返回键路径并警告

## 测试

运行以下命令测试 i18n 功能：

```bash
# 测试中文（默认）
node -e "const { tc } = require('./src/i18n'); console.log(tc('mainMenu.title'));"

# 测试英文
node -e "const { tc, setLanguage } = require('./src/i18n'); setLanguage('en'); console.log(tc('mainMenu.title'));"
```

## 未来扩展

如需添加新语言：

1. 在 `src/i18n/languages/` 目录下创建新的语言文件（如 `ja.js`）
2. 复制 `zh.js` 或 `en.js` 的结构
3. 翻译所有文本
4. 在 `src/i18n/index.js` 中导入并注册新语言

```javascript
const ja = require('./languages/ja');

const languages = {
  zh,
  en,
  ja  // 添加新语言
};
```
