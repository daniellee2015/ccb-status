# CCB Status - Kill & Cleanup 功能设计审查

## 背景

我们为 ccb-status 实现了 Kill 和 Cleanup 功能，用于管理多实例 CCB 环境。

## 原始需求

1. **多实例支持**：ccb-multi 支持多个项目同时运行 CCB，每个项目一个实例
2. **精确控制**：不能使用 `ccb kill` 等全局命令（会杀死所有实例）
3. **三种状态**：
   - Active: Daemon 存活 + Port 监听
   - Zombie: Daemon 存活但 Port 不监听（卡死）
   - Dead: Daemon 不存在（已退出）

## 实现的功能

### 1. Kill Operations（杀死进程）
- **Kill Active Instances** - 杀死活动的 CCB 实例
- **Kill Zombie Instances** - 杀死僵尸 CCB 实例
- **Kill All Instances** - 杀死所有实例（Active + Zombie）

### 2. Cleanup Operations（清理状态文件）
- **Cleanup Dead States** - 清理死亡实例的状态文件
- **Cleanup Zombie States** - 清理僵尸实例的状态文件（先杀进程再清理）
- **Cleanup All States** - 清理所有状态文件（Dead + Zombie）

### 3. Restart Operations（已有功能）
- **Restart Zombie Instances** - 重启僵尸实例
- **Restart Dead Instances** - 重启死亡实例

## 技术实现

### Kill 操作
```javascript
// 使用 process.kill(pid, 'SIGKILL') 精确杀死指定进程
if (instance.pid) {
  process.kill(instance.pid, 'SIGKILL');
}
```

### Cleanup 操作
```javascript
// 删除 .ccb/ 目录下的状态文件
const ccbDir = path.join(instance.workDir, '.ccb');
// 删除 askd.json
fs.unlinkSync(path.join(ccbDir, 'askd.json'));
// 删除 session 文件
fs.unlinkSync(path.join(ccbDir, '.claude-session'));
// ... 其他 session 文件
```

### 菜单结构
```
CCB Instance Management
├── 1. Kill Operations
│   ├── 1. Kill Active Instances
│   ├── 2. Kill Zombie Instances
│   └── 3. Kill All Instances
├── 2. Cleanup Operations
│   ├── 1. Cleanup Dead States
│   ├── 2. Cleanup Zombie States
│   └── 3. Cleanup All States
├── 3. Restart Operations
│   ├── 1. Restart Zombie Instances
│   ├── 2. Restart Dead Instances
│   └── 3. Restart All Instances
└── d. Status Detection
```

## 设计决策

### 1. 不使用 CCB 原生命令
- ❌ `ccb kill` - 会杀死所有实例
- ❌ `ccb-cleanup --kill-zombies` - 会杀死所有僵尸进程
- ✅ `process.kill(pid)` - 精确杀死指定 PID

### 2. 用户交互流程
1. 显示实例列表（表格）
2. 多选界面（checkbox）
3. 确认对话框
4. 执行操作
5. 显示结果
6. 自动重新检测状态

### 3. Cleanup Zombie 的特殊处理
Cleanup Zombie 会先杀死进程，再清理状态文件：
```javascript
// 先杀进程
if (instance.pid) {
  process.kill(instance.pid, 'SIGKILL');
}
// 再清理文件
fs.unlinkSync(askdFile);
```

## 使用场景

| 场景 | 操作 | 说明 |
|------|------|------|
| CCB 卡死无响应 | Kill Zombie → Restart Zombie | 杀死卡死进程并重启 |
| CCB 已退出，状态文件残留 | Cleanup Dead | 清理状态文件 |
| 想永久停止某个 CCB | Kill Active | 只杀进程，不重启 |
| 切换项目，释放资源 | Kill All | 杀死所有 CCB |
| 系统崩溃后清理 | Cleanup All | 清理所有残留文件 |

## 测试结果

✅ 所有 40 个测试通过：
- 文件存在性检查
- 函数导出检查
- 翻译完整性检查
- 关键实现检查
- 菜单集成检查

## 请审查以下方面

1. **设计合理性**：菜单结构和功能分类是否合理？
2. **实现正确性**：使用 `process.kill(pid)` 和 `fs.unlinkSync()` 是否正确？
3. **用户体验**：交互流程是否清晰？
4. **边界情况**：是否考虑了所有边界情况？
5. **安全性**：是否有潜在的安全风险？
6. **完整性**：是否遗漏了重要功能？

## 关键问题

1. Cleanup Zombie 是否应该先杀进程再清理文件？还是只清理文件？
2. Kill All 是否应该包含 Dead 实例？（目前只包含 Active + Zombie）
3. 是否需要添加 "Restart All" 功能？
4. 确认对话框的默认值是 false，是否合适？
