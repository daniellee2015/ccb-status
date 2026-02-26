# CCB Status 系统状态定义和操作逻辑审查

## 刚才的关键修复

### 问题
用户在 tmux session 41 中运行 ccb，该 session 有 5 个 windows。系统将其判定为 Orphaned 而不是 Active。

### 根本原因
`src/services/instance-service.js:237` 的逻辑：
```javascript
if (isCCBPane && session && session.attached && session.windowsCount === 1) {
  tmuxPanesMap.set(panePath, { id: paneId, title: paneTitle, session: sessionName });
}
```

要求 `session.windowsCount === 1`，这是**错误的需求**。

### 修复
移除了 window count 要求：
```javascript
if (isCCBPane && session && session.attached) {
  tmuxPanesMap.set(panePath, { id: paneId, title: paneTitle, session: sessionName, windowsCount: session.windowsCount });
}
```

## 当前状态定义

### 核心组件
1. **askd**: 守护进程，管理 LLM 会话，监听端口
2. **ccb**: 主进程，用户交互界面
3. **askd.json**: 状态文件，存储 workDir, port, pid 等
4. **tmux pane**: CCB 运行的终端窗格

### 状态定义矩阵

| 状态 | askd | ccb | port | tmux pane | 说明 |
|------|------|-----|------|-----------|------|
| **Active** | ✓ | ✓ | ✓ | ✓ (attached session) | 正常工作状态 |
| **Orphaned** | ✓ | ✓ | ✓ | ✗ (no pane) | 后台运行，无终端 |
| **Zombie** | ✓ | ✗ | ✓ | ? | ccb 崩溃，askd 还在 |
| **Disconnected** | ✗ | ✓ | ✗ | ? | askd 崩溃，ccb 还在 |
| **Dead** | ✗ | ✗ | ✗ | ? | 完全停止 |

**关键变更**: Active 状态不再要求 session 只有 1 个 window。用户在多 window session 中工作是正常场景。

## 操作逻辑定义

### Kill 操作

| 状态 | 应该 Kill | 理由 |
|------|----------|------|
| Active | askd (优雅关闭) | askd 会清理 ccb 和状态文件 |
| Orphaned | askd + ccb | 两个进程都在运行，都需要清理 |
| Zombie | askd | 清理守护进程和状态文件 |
| Disconnected | ccb | 清理残留的 ccb 进程 |
| Dead | 无需 kill | 进程已停止 |

**当前实现**:
- Kill Active: kill askd
- Kill Orphaned: kill askd + ccb (刚修复)
- Kill Zombie: kill askd
- Kill All: kill askd (对 active + zombie)

### Cleanup 操作

**定义**: 删除状态文件 (askd.json)

| 状态 | 应该 Cleanup | 理由 |
|------|-------------|------|
| Active | ✗ | 正在使用 |
| Orphaned | ✗ | 正在使用 |
| Zombie | ✓ | askd 在但 ccb 死了，清理状态文件 |
| Disconnected | ✓ | askd 死了，清理残留状态文件 |
| Dead | ✓ | 清理残留状态文件 |

**当前实现**:
- Cleanup Dead: 删除 askd.json
- Cleanup Zombie: kill askd + 删除 askd.json
- Cleanup All: 清理所有非 active 状态的文件

### Restart 操作

**定义**: Kill 进程 + 重新启动

| 状态 | 操作流程 |
|------|---------|
| Zombie | 1. Kill askd<br>2. 等待清理<br>3. 在 tmux 中启动 ccb |
| Dead | 1. 清理状态文件<br>2. 在 tmux 中启动 ccb |

**当前实现**:
- Restart Zombie: kill askd → 在现有 tmux pane 或新 window 中启动
- Restart Dead: 在现有 tmux pane 或新 window 中启动

### Recovery 操作

**定义**: 恢复异常状态

| 状态 | 操作流程 | 问题 |
|------|---------|------|
| Disconnected | 1. Kill ccb<br>2. 创建新 tmux session<br>3. 启动 ccb | ✓ 已修复：现在创建 session 而不是 window |
| Orphaned | **不应该有此操作** | Orphaned 应该 kill 后重启，不是 recover |

**当前实现**:
- Recover Disconnected: kill ccb → 创建新 session → 启动 ccb (已修复)
- Recover Orphaned: 返回错误，提示使用 Kill Orphaned (已禁用)

## 需要审查的问题

### 1. 状态定义是否正确？
- Active 不要求 session 只有 1 个 window，这样对吗？
- Orphaned 定义为"无 tmux pane"，这样对吗？
- 其他状态定义是否合理？

### 2. Kill 操作逻辑是否正确？
- Kill Active 应该 kill askd 还是 ccb？
- Kill Orphaned 应该 kill askd + ccb 吗？
- 是否应该优先 kill askd（让它级联清理）？

### 3. Cleanup 操作逻辑是否正确？
- 只清理状态文件就够了吗？
- 是否需要清理其他文件（日志等）？

### 4. Restart/Recovery 操作逻辑是否正确？
- Restart 在哪里启动 ccb（现有 pane vs 新 window vs 新 session）？
- Recover Disconnected 创建新 session 是否合理？
- Recover Orphaned 是否应该存在？

### 5. 进程关系
- askd 和 ccb 是什么关系？
- kill askd 会自动 kill ccb 吗？
- 还是需要分别 kill？

## 测试场景

### 场景 1: 用户在多 window session 中启动 ccb
```bash
# Session 41 已有 4 个 windows
tmux attach -t 41
ccb claude,gemini,codex,opencode
# 现在 session 41 有 5 个 windows
```
**期望**: 状态应该是 Active（修复后）
**实际**: 之前是 Orphaned（已修复）

### 场景 2: Kill Orphaned
```bash
# 有一个后台运行的 ccb（无 tmux pane）
ccb-status # 显示 Orphaned
# 用户选择 Kill Orphaned
```
**期望**: kill askd + ccb，清理干净
**实际**: 之前只 kill askd（已修复）

### 场景 3: Recover Disconnected
```bash
# askd 崩溃，ccb 还在运行
ccb-status # 显示 Disconnected
# 用户选择 Recover Disconnected
```
**期望**: kill ccb，创建新 session，启动 ccb
**实际**: 之前创建 window 而不是 session（已修复）

## 请审查

请 Codex、Gemini、OpenCode 审查：

1. **状态定义是否正确**？特别是 Active 不要求 window count = 1
2. **Kill 操作逻辑是否正确**？特别是 Kill Orphaned 需要 kill 两个进程
3. **Cleanup/Restart/Recovery 逻辑是否合理**？
4. **是否有遗漏或错误的地方**？
5. **如何进一步改进**？

项目路径: /Users/danlio/Repositories/claude_code_bridge_multi/ccb-status
