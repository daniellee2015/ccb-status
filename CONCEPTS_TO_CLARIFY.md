# CCB 系统概念澄清需求

## 当前问题
用户手动退出并重启了 danlio 实例，但状态仍显示为 Orphaned 而不是 Active。

## 实际情况
- ccb 进程：PID 3487，运行在 ttys115
- askd 进程：PID 3705，工作目录 /Users/danlio
- askd.json：存在，内容正确
- tmux：Session 41, Window 5 (CCB-danlio)
- **问题**：Session 41 有 5 个 windows，不符合 Active 状态定义（1 window）

## 需要澄清的核心概念

### 1. 进程关系
- **ccb pid**: CCB 主进程，是什么？做什么？
- **askd pid**: askd 守护进程，是什么？做什么？
- **关系**: ccb 和 askd 是父子关系还是独立进程？
- **生命周期**: kill askd 会自动 kill ccb 吗？还是反过来？

### 2. tmux 层次结构
- **tmux session**: 会话，一个用户可以有多个 session
- **tmux windows**: 窗口，一个 session 可以有多个 windows
- **tmux pane**: 窗格，一个 window 可以有多个 panes
- **问题**: Active 状态要求 "1 window"，是指：
  - Session 只有 1 个 window？
  - 还是 CCB 运行在一个专用的 session 中，该 session 只有 1 个 window？

### 3. LLM Sessions
- **llm sessions**: 如 claude, gemini, codex, opencode
- **关系**: 这些是 askd 管理的会话？还是 ccb 管理的？
- **存储**: 会话状态存在哪里？

### 4. 状态文件
- **askd.json**: 存储什么信息？
- **位置**: `~/.cache/ccb/projects/{hash}/askd.json`
- **作用**: 用于什么？状态检测？进程恢复？

## 状态定义的疑问

### Active 状态
```
askd alive + ccb alive + port listening + tmux session (attached, 1 window)
```
**疑问**:
1. "tmux session (attached, 1 window)" 的准确含义是什么？
2. 如果用户在 session 41 中运行 ccb，但 session 41 有 5 个 windows，为什么不是 Active？
3. 是否应该为每个 CCB 实例创建独立的 session？

### Orphaned 状态
```
askd alive + ccb alive + port listening + no dedicated tmux
```
**疑问**:
1. "no dedicated tmux" 的准确含义是什么？
2. 当前 danlio 有 tmux (session 41, window 5)，为什么是 Orphaned？
3. 是因为 session 41 有多个 windows 所以不是 "dedicated"？

## 操作逻辑的疑问

### Kill 操作
**问题**: 对于每种状态，应该 kill 哪些进程？

| 状态 | 应该 kill 什么？ | 为什么？ |
|------|----------------|---------|
| Active | ? | ? |
| Orphaned | ? | ? |
| Zombie | ? | ? |
| Disconnected | ? | ? |
| Dead | ? | ? |

### Cleanup 操作
**问题**: 应该清理什么？

- 只清理 askd.json？
- 还要清理其他文件？
- 什么时候需要 cleanup？

### Restart 操作
**问题**: 如何重启？

- Kill 哪些进程？
- 如何启动？
- 在哪里启动（tmux session/window）？

### Recovery 操作
**问题**: 如何恢复？

- Recover Disconnected: 应该做什么？
- Recover Orphaned: 应该做什么？还是不应该有这个操作？
- 如何确保恢复后是 Active 状态？

## 具体场景

### 场景 1: 用户在 session 41 中手动启动 ccb
```bash
# Session 41 已经有 4 个 windows
tmux attach -t 41
ccb claude,gemini,codex,opencode
```
**问题**:
- 这会创建 window 5
- 状态会是 Orphaned（因为 session 有 5 个 windows）
- 这是预期行为吗？
- 用户应该如何正确启动才能得到 Active 状态？

### 场景 2: Recover Disconnected
当前实现：
1. Kill ccb 进程
2. 创建新的 tmux session（`tmux new-session -d -s CCB-danlio`）
3. 在新 session 中启动 ccb

**问题**:
- 如果用户在 session 41 中运行 ccb-status
- Recover 会创建新的 session 42
- 用户需要手动 attach 到 session 42 吗？
- 这是正确的流程吗？

### 场景 3: Kill Orphaned
当前实现：Kill askd 和 ccb 两个进程

**问题**:
- 这是正确的吗？
- 还是应该只 kill askd（让它级联 kill ccb）？
- 还是应该只 kill ccb（保留 askd）？

## 请求

请 OpenCode、Codex、Gemini 三位 AI 审查这份文档，并回答：

1. 哪些概念理解是正确的？
2. 哪些概念理解是错误的？
3. 对于每种状态，正确的 Kill/Cleanup/Restart/Recovery 操作应该是什么？
4. 如何修复当前的实现，使其符合正确的逻辑？

项目路径：/Users/danlio/Repositories/claude_code_bridge_multi/ccb-status
