# CCB Status Architecture

## 概述

CCB Status 采用分层架构，将所有检测逻辑系统化地封装和组织。

## 架构层次

```
┌─────────────────────────────────────────┐
│         应用层 (Menus/CLI)              │
│  - main-menu.js                         │
│  - tmux-management.js                   │
│  - restart-operations.js                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         查询层 (Query Builder)          │
│  - instance-query-builder.js            │
│  - 提供流式 API 查询接口                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         服务层 (Services)               │
│  - instance-service.js                  │
│  - restart-service.js                   │
│  - cleanup-service.js                   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         检测器层 (Detectors)            │
│  - process-detector.js                  │
│  - tmux-detector.js                     │
│  - daemon-detector.js                   │
│  - ccb-detector.js                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         类型层 (Types)                  │
│  - instance-types.js                    │
│  - 定义所有数据结构                     │
└─────────────────────────────────────────┘
```

## 核心概念

### 1. 类型定义 (`types/instance-types.js`)

定义所有数据结构：
- `ProcessInfo` - 进程信息
- `TmuxPaneInfo` - Tmux pane 信息
- `DaemonInfo` - Daemon (askd) 信息
- `CCBProcessInfo` - CCB 进程信息
- `CCBInstance` - 完整的 CCB 实例信息

### 2. 检测器层 (`detectors/`)

#### Process Detector
- `getProcessTable()` - 获取完整进程表
- `isProcessAlive(pid)` - 检查进程是否存活
- `getProcessInfo(pid)` - 获取进程信息
- `getProcessWorkDir(pid)` - 获取进程工作目录
- `findProcessesByCommand(pattern)` - 按命令查找进程
- `getProcessAncestry(pid)` - 获取进程祖先链

#### Tmux Detector
- `listTmuxPanes()` - 列出所有 tmux panes
- `listTmuxSessions()` - 列出所有 tmux sessions
- `findTmuxPaneByParentPid(parentPid)` - 通过父进程 PID 查找 tmux pane
- `hasTmuxPane(parentPid)` - 检查是否有 tmux pane
- `getTmuxSession(sessionName)` - 获取 session 信息

#### Daemon Detector
- `getAllDaemons()` - 获取所有 daemon 实例
- `getDaemonByWorkDir(workDir)` - 按工作目录查找 daemon
- `isDaemonAlive(pid)` - 检查 daemon 是否存活
- `isPortListening(port, host)` - 检查端口是否监听

#### CCB Detector
- `findAllCCBProcesses()` - 查找所有 CCB 进程
- `getCCBProcessByWorkDir(workDir)` - 按工作目录查找 CCB 进程
- `isCCBProcessAlive(pid)` - 检查 CCB 进程是否存活
- `getCCBProviders(pid)` - 获取 CCB 提供商列表

### 3. 查询构建器 (`query/instance-query-builder.js`)

提供流式 API 进行条件查询：

```javascript
const { query, queries } = require('./query/instance-query-builder');

// 流式查询
const activeInstances = await query()
  .whereStatus('active')
  .whereTmux(true)
  .execute();

// 快捷查询
const orphaned = await queries.orphaned();
const withTmux = await queries.withTmux();
const instance = await queries.byWorkDir('/path/to/workdir');
```

#### 查询方法

- `whereStatus(...statuses)` - 按状态过滤
- `whereTmux(hasTmux)` - 按 tmux 存在性过滤
- `whereAlive(isAlive)` - 按存活状态过滤
- `whereWorkDir(...workDirs)` - 按工作目录过滤
- `wherePid(...pids)` - 按 PID 过滤
- `whereSession(...sessionNames)` - 按 tmux session 过滤

#### 执行方法

- `execute()` - 返回所有匹配的实例
- `first()` - 返回第一个匹配的实例
- `count()` - 返回匹配数量

#### 快捷查询

- `queries.active()` - 所有 active 实例
- `queries.orphaned()` - 所有 orphaned 实例
- `queries.withTmux()` - 所有有 tmux 的实例
- `queries.withoutTmux()` - 所有没有 tmux 的实例
- `queries.byWorkDir(workDir)` - 按工作目录查找
- `queries.byPid(pid)` - 按 PID 查找
- `queries.inSession(sessionName)` - 在指定 session 中的实例

## 使用示例

### 1. 使用统一检测器

```javascript
const Detectors = require('./detectors');

// 进程检测
const procTable = Detectors.process.getTable();
const isAlive = Detectors.process.isAlive(12345);

// Tmux 检测
const panes = Detectors.tmux.listPanes();
const pane = Detectors.tmux.findPaneByParentPid(12345);

// Daemon 检测
const daemons = Detectors.daemon.getAll();
const daemon = Detectors.daemon.getByWorkDir('/path/to/workdir');

// CCB 进程检测
const ccbProcesses = Detectors.ccb.findAll();
const ccb = Detectors.ccb.getByWorkDir('/path/to/workdir');
```

### 2. 使用查询构建器

```javascript
const { query, queries } = require('./query/instance-query-builder');

// 查找所有 active 且有 tmux 的实例
const instances = await query()
  .whereStatus('active')
  .whereTmux(true)
  .execute();

// 查找特定工作目录的实例
const instance = await queries.byWorkDir('/Users/danlio');

// 查找在特定 tmux session 中的实例
const sessionInstances = await queries.inSession('39');

// 统计 orphaned 实例数量
const count = await query().whereStatus('orphaned').count();
```

### 3. 在菜单中使用

```javascript
const { queries } = require('../query/instance-query-builder');

async function showOrphanedMenu() {
  // 获取所有 orphaned 实例
  const orphaned = await queries.orphaned();

  // 显示菜单...
}
```

## 优势

1. **单一数据源**：所有检测逻辑集中在检测器层
2. **类型安全**：完整的 JSDoc 类型定义
3. **易于测试**：每个检测器可以独立测试
4. **可组合**：查询构建器支持灵活的条件组合
5. **可维护**：清晰的分层架构，职责明确
6. **性能优化**：避免重复检测，统一缓存策略

## 迁移指南

### 旧代码
```javascript
const instances = await getInstances();
const orphaned = instances.filter(i => i.status === 'orphaned');
```

### 新代码
```javascript
const { queries } = require('./query/instance-query-builder');
const orphaned = await queries.orphaned();
```

## 未来扩展

- 添加缓存层提升性能
- 支持实时监控和事件通知
- 添加更多查询条件和聚合函数
- 支持批量操作
