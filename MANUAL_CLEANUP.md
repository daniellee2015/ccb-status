# 手动清理和重启 danlio 实例

## 步骤 1: 完全清理当前状态

```bash
# 1. Kill askd 进程（会自动清理 ccb）
kill 3705

# 2. 如果 ccb 还在，强制 kill
kill -9 3487

# 3. 等待 2 秒
sleep 2

# 4. 删除状态文件
rm -f ~/.cache/ccb/projects/f3f1bce3d1ad778a/askd.json

# 5. 验证进程已清理
ps aux | grep -E "3487|3705" | grep -v grep
```

## 步骤 2: 在新的专用 session 中启动

```bash
# 方案 A: 创建新的专用 session（推荐）
tmux new-session -s danlio-ccb
ccb claude,gemini,codex,opencode

# 方案 B: 如果你想在当前窗口启动
# 注意：这会让 danlio 显示为 Orphaned（因为 session 41 有多个 windows）
ccb claude,gemini,codex,opencode
```

## 步骤 3: 验证状态

```bash
# 运行 ccb-status 检查
ccb-status

# 应该看到 danlio 显示为 Active（如果用方案 A）
# 或 Orphaned（如果用方案 B）
```

## 为什么当前操作都失败？

### Kill Orphaned 的问题
- 当前实现 kill 了 askd 和 ccb
- 但没有清理 askd.json
- 导致状态检测混乱

### Cleanup 的问题
- Cleanup 只清理 Dead 状态的实例
- Orphaned 状态不会被 cleanup

### Restart/Recovery 的问题
- Recover 创建新 session，但你在旧 session 中
- 需要手动 attach 到新 session
- 流程不完整

## 根本问题

**Active 状态的定义**：
- 要求 tmux session 只有 1 个 window
- 你的 Session 41 有 5 个 windows
- 所以任何在 Session 41 中启动的 ccb 都会是 Orphaned

**解决方案**：
1. 为每个 CCB 实例创建独立的 session
2. 或者清理 Session 41 的其他 windows（但会影响其他工作）
