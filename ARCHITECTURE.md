# CCB Status Architecture

## Abstract Model

### Entity Hierarchy

```
Instance (实例)
  ├─ Daemon (守护进程) - askd
  │   ├─ PID
  │   ├─ Port
  │   └─ State File
  ├─ Process (主进程) - ccb
  │   └─ PID
  └─ Terminal (终端) - tmux pane
      ├─ Session
      ├─ Window
      └─ Pane
```

### State Machine

```
         ┌─────────────┐
         │   Active    │ ◄─── Normal state
         └──────┬──────┘
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Orphaned│ │ Zombie │ │  Dead  │
   └────────┘ └────────┘ └────────┘
        │       │       │
        └───────┼───────┘
                ▼
         ┌─────────────┐
         │Disconnected │
         └─────────────┘
```

### Detection Strategy

**Principle**: Work Directory is the Single Source of Truth

**CRITICAL: Unified Detection Logic**
- ALL menus and operations MUST use the same detection function
- NO duplicate detection logic in different files
- Detection logic is centralized in `instance-service.js`
- All other modules import and use `getCCBInstances()`

**Detection Steps**:
1. **Scan state files** (`~/.cache/ccb/projects/*/askd.json`)
   - Extract: work_dir, askd PID, ccb PID (parent_pid), port
2. **Scan running processes**
   - Find all CCB processes: `ps aux | awk '$11 ~ /Python/ && $12 ~ /\.local\/bin\/ccb$/'`
   - Find all askd processes: `ps aux | awk '$11 ~ /Python/ && $12 ~ /\/askd$/'`
   - Get work_dir for each PID: `lsof -a -d cwd -p {pid}`
3. **Scan tmux sessions**
   - Get session info: `tmux list-sessions -F "#{session_name}\t#{session_attached}\t#{session_windows}"`
   - Get pane info: `tmux list-panes -a -F "#{session_name}\t#{pane_id}\t#{pane_current_path}\t#{pane_title}"`
   - Filter: session_attached = 1 AND session_windows = 1 AND pane has CCB title
4. **Match by work_dir**
   - For each work_dir, find matching askd process, ccb process, and tmux pane
5. **Determine state** using Component Availability Matrix

**State Determination Algorithm**:
```javascript
if (askdAlive && ccbAlive && portListening && tmuxPane && sessionWindows === 1) {
  status = 'active';
} else if (askdAlive && ccbAlive && portListening && (!tmuxPane || sessionWindows > 1)) {
  status = 'orphaned';
} else if (askdAlive && !ccbAlive && portListening) {
  status = 'zombie';
} else if (!askdAlive && ccbAlive) {
  status = 'disconnected';
} else {
  status = 'dead';
}
```

### Component Availability Matrix

| State | Daemon (askd) | Process (ccb) | Tmux Session | Port | Session Windows |
|-------|---------------|---------------|--------------|------|-----------------|
| Active | ✓ alive | ✓ alive | ✓ attached + 1 window | ✓ listening | = 1 |
| Orphaned | ✓ alive | ✓ alive | ✗ no session OR multi-window | ✓ listening | > 1 or none |
| Zombie | ✓ alive | ✗ dead | ? | ✓ listening | ? |
| Disconnected | ✗ dead | ✓ alive | ? | ✗ not listening | ? |
| Dead | ✗ dead | ✗ dead | ? | ✗ not listening | ? |

Legend: ✓ = must satisfy condition, ✗ = must not satisfy, ? = don't care

**CRITICAL: Active State Requirements (ALL must be true)**
1. askd daemon process is alive (PID exists)
2. ccb main process is alive (PID exists)
3. Port is listening (TCP connection succeeds)
4. Tmux session exists AND is attached (session_attached = 1)
5. Tmux session has ONLY 1 window (session_windows = 1)
6. Instance work_dir matches tmux pane current_path

**Orphaned State**: Process alive but no dedicated tmux session (multi-window session or detached)

## Core Concepts

### Process Architecture

CCB 采用双进程架构：

1. **askd (daemon process)**
   - Python 守护进程
   - 监听端口提供 API 服务
   - 管理 LLM 会话
   - PID 存储在 `~/.cache/ccb/projects/{hash}/askd.json`
   - 工作目录：实例的工作目录（如 `/Users/danlio` 或 `.ccb-instances/inst-xxx`）

2. **ccb (main process)**
   - Python 主进程
   - 用户交互界面
   - 调用 askd API
   - PID 是 askd.json 中的 `parent_pid`
   - 工作目录：与 askd 相同

### Tmux Architecture

1. **Session**
   - Tmux 会话，一个独立的终端会话
   - 可以 attached（当前活动）或 detached（后台运行）
   - 一个 CCB 实例可能在一个 session 中

2. **Window**
   - Session 中的一个标签页
   - 一个 session 可以有多个 windows

3. **Pane**
   - Window 中的一个分屏
   - CCB 实例运行在特定的 pane 中
   - Pane 有 ID（如 `%190`）和 title（如 `CCB-Codex`）
   - Pane 的 current_path 对应 CCB 的工作目录

### State Files

1. **askd.json**
   - 位置：`~/.cache/ccb/projects/{hash}/askd.json`
   - 内容：
     ```json
     {
       "pid": 12345,           // askd daemon PID
       "parent_pid": 12344,    // ccb main process PID
       "port": 64319,          // askd 监听端口
       "host": "127.0.0.1",
       "work_dir": "/path/to/workdir",
       "started_at": "2026-02-25 13:56:51",
       "managed": true
     }
     ```
   - 当 askd 启动时创建，正常退出时删除
   - 如果进程异常退出，文件可能残留

2. **Hash 目录命名**
   - Hash 是基于某种规则生成的（具体规则待确认）
   - 同一个 work_dir 可能对应不同的 hash（历史遗留）
   - 检测时应该以 work_dir 为准，而不是 hash

## Instance States

### State Definitions

| State | Symbol | Definition | Detection Logic |
|-------|--------|------------|-----------------|
| **Active** | ✓ | 完全正常运行 | askd alive + port listening + ccb alive + tmux pane exists (in attached session) |
| **Orphaned** | ⊙ | 进程运行但无 tmux 窗口 | askd alive + port listening + ccb alive + NO tmux pane |
| **Zombie** | ⚠ | askd 运行但 ccb 已死 | askd alive + port listening + ccb dead |
| **Disconnected** | ⚠ | ccb 运行但 askd 已死 | askd dead + ccb alive |
| **Dead** | ✗ | 完全停止 | askd dead + ccb dead |

### Detection Algorithm

```javascript
// Step 1: Get all running processes
const askdProcesses = getRunningAskdProcesses();  // via pgrep -f "/askd$"
const ccbProcesses = getRunningCCBProcesses();    // via pgrep -f "\.local/bin/ccb"

// Step 2: Get all tmux panes (only from attached sessions)
const tmuxPanes = getTmuxPanes();  // via tmux list-panes -a
// Filter: only panes with CCB-related titles AND in attached sessions

// Step 3: Scan state files
for each askd.json in ~/.cache/ccb/projects/*/askd.json:
  - Read work_dir, pid (askd), parent_pid (ccb), port
  - Find matching askd process by work_dir
  - Find matching ccb process by work_dir
  - Find matching tmux pane by work_dir
  - Determine state based on table above

// Step 4: Scan orphaned processes (no state file)
for each ccb process not in processed work_dirs:
  - Try to find matching askd.json by work_dir
  - If found: use that state file (hash mismatch case)
  - If not found: mark as Disconnected
```

### Key Rules

1. **Work Directory is the Primary Key**
   - 所有匹配都基于 work_dir，不是 PID 或 hash
   - 同一个 work_dir 只能有一个活动实例

2. **Tmux Pane Requirements**
   - 只考虑 attached session 中的 panes
   - Pane title 必须包含 CCB 相关关键词：`Ready`, `CCB-`, `OpenCode`, `Gemini`, `Codex`
   - Pane 的 current_path 必须匹配 work_dir

3. **Port Listening Check**
   - 使用 TCP socket 连接测试
   - 超时时间：50ms
   - 如果 port 不 listening 但 ccb 进程存在，仍可能是 Active（启动中）

4. **Process Detection**
   - 使用 `pgrep` 而不是 `ps aux | grep`（性能问题）
   - askd: `pgrep -f "/askd$"`
   - ccb: `pgrep -f "\.local/bin/ccb"`
   - 使用 `lsof -a -d cwd -p {pid}` 获取工作目录

## PID Semantics

在代码中使用三种 PID：

1. **displayPid** (instance.pid)
   - 用于 UI 显示
   - 优先显示 ccb PID（用户可见的主进程）
   - 如果 ccb 不存在，显示 askd PID

2. **askdPid** (instance.askdPid)
   - askd daemon 的 PID
   - 用于守护进程控制（如检查端口）
   - 来源：askd.json 的 `pid` 字段

3. **ccbPid** (instance.ccbPid)
   - ccb main process 的 PID
   - 用于进程控制（如 kill）
   - 来源：askd.json 的 `parent_pid` 或进程扫描

## Operations

### Kill Operations

- **kill-active**: Kill Active 状态的实例
  - 使用 `askdPid` 发送 SIGTERM
  - askd 会自动清理 ccb 进程和状态文件

- **kill-zombie**: Kill Zombie/Disconnected 状态的实例
  - 使用 `askdPid` 如果存在
  - 使用 `ccbPid` 如果 askd 不存在

- **kill-all**: Kill 所有非 Dead 状态的实例
  - 组合上述逻辑

### Cleanup Operations

- **cleanup-zombie**: 清理 Zombie/Disconnected 的状态文件
  - 先尝试 kill
  - 如果 kill 成功或进程已死，删除状态文件
  - 如果 kill 失败（真实错误），跳过清理

- **cleanup-all**: 清理所有 Dead 状态的状态文件
  - 只删除文件，不 kill 进程

### Restart Operations

- **restart-dead**: 重启 Dead 状态的实例
  - 在原 tmux pane 中重新启动
  - 如果 pane 不存在，创建新 pane

- **recover-orphaned**: 恢复 Orphaned 状态的实例
  - 创建新 tmux pane
  - 将进程"附加"到新 pane（通过 send-keys）

## Common Issues

### Issue 1: Hash Mismatch
- **现象**：work_dir 对应的 hash 目录变化
- **原因**：askd 重启时可能生成新 hash
- **解决**：检测时扫描所有 askd.json，按 work_dir 匹配

### Issue 2: Process Detection Timeout
- **现象**：`ps aux | grep` 超时
- **原因**：系统进程过多（>1000）
- **解决**：使用 `pgrep` 代替

### Issue 3: Stale State Files
- **现象**：askd.json 存在但进程已死
- **原因**：进程异常退出未清理
- **解决**：检测时验证进程是否存活

### Issue 4: Multiple Instances Same WorkDir
- **现象**：同一个 work_dir 有多个进程
- **原因**：启动时未检查已有实例
- **解决**：启动前检查，或 kill 旧实例

## Testing Checklist

在修改检测逻辑后，必须验证：

1. ✅ Active 实例正确显示
2. ✅ Orphaned 实例正确识别
3. ✅ Zombie 实例正确识别
4. ✅ Dead 实例正确识别
5. ✅ Hash mismatch 情况正确处理
6. ✅ 进程检测不超时（大量进程时）
7. ✅ Kill 操作使用正确的 PID
8. ✅ Cleanup 操作不误删活动实例
9. ✅ Restart 操作在正确的 pane 中执行
10. ✅ 不会误杀用户的业务进程
