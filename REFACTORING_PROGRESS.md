# CCB-Status 重构进度报告

## 已完成的改进

### 1. 统一的显示格式化器 (`display-formatter.js`)
- ✅ `formatInstanceName()` - 统一的实例名称格式化
- ✅ `getParentProjectName()` - 父项目识别
- ✅ `cleanTmuxTitle()` - 清理 tmux 标题
- ✅ `formatTmuxDisplay()` - 统一的 tmux 显示

### 2. 统一的操作助手 (`instance-operations-helper.js`)
- ✅ `filterInstancesByStatus()` - 统一的状态过滤
- ✅ `displayInstanceTable()` - 统一的表格显示
- ✅ `selectInstances()` - 统一的 checkbox 选择（带取消选项）
- ✅ `confirmOperation()` - 统一的确认显示

### 3. 确认助手 (`confirmation-helper.js`)
- ✅ `displayConfirmationTable()` - 详细的确认表格
- ✅ 显示 tmux 窗口状态（✓tmux / ⚠no-tmux）
- ✅ 黄色警告边框

### 4. Checkbox 菜单改进
- ✅ 添加 "0. 取消" 选项在列表末尾
- ✅ 显示帮助提示（包括取消说明）
- ✅ 支持三种取消方式：
  1. 选择 "0. 取消" 选项
  2. 不选择任何选项直接回车
  3. 按 ESC 键

### 5. 已重构的菜单文件（2/12）
1. ✅ `kill-active.js` - 减少 60 行代码
2. ✅ `cleanup-zombie.js` - 减少 86 行代码

**总计减少：146 行重复代码**

## 待重构的菜单文件（10/12）

### Kill Operations
- ⏳ `kill-zombie.js`
- ⏳ `kill-all.js`

### Cleanup Operations
- ⏳ `cleanup-dead.js`
- ⏳ `cleanup-all.js`

### Restart Operations
- ⏳ `restart-zombie.js`
- ⏳ `restart-dead.js`

### 其他
- ⏳ 其他需要确认的操作菜单

## 重构模板

每个菜单文件的重构模式：

```javascript
// 1. 导入统一助手
const { filterInstancesByStatus, displayInstanceTable, selectInstances, confirmOperation } = require('../../services/instance-operations-helper');

// 2. 过滤实例
const instances = await getCCBInstances();
const filteredInstances = filterInstancesByStatus(instances, 'status');

// 3. 显示表格
displayInstanceTable(filteredInstances, tc, 'operationName.columns');

// 4. 选择实例（带取消选项）
const selected = await selectInstances(filteredInstances, tc, 'operationName.selectInstances');
if (!selected) return 'back';

// 5. 确认操作（带详细表格）
const confirmed = await confirmOperation(selected, tc, 'operationName');
if (!confirmed) return 'back';

// 6. 执行操作
// ... 具体的 kill/cleanup/restart 逻辑
```

## 需要的 i18n 翻译

每个操作需要添加：
```javascript
{
  confirmationWarning: '警告：即将操作以下实例',
  confirmPrompt: '确认操作 {count} 个实例？',
  columns: {
    project: '项目',
    parent: '父项目',
    hash: '哈希',
    type: '类型',
    pid: 'PID',
    port: '端口',
    status: '状态'
  }
}
```

## 预期收益

完成所有 12 个文件的重构后：
- 预计减少 **600-800 行重复代码**
- 所有操作的 UX 保持一致
- 更容易维护和更新
- 明确的取消选项，更好的用户体验
