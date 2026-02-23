# 快速重构指南

## 已完成（3/12）
- ✅ kill-active.js
- ✅ cleanup-zombie.js  
- ✅ kill-all.js

## 待重构（9/12）
- ⏳ kill-zombie.js
- ⏳ cleanup-dead.js
- ⏳ cleanup-all.js
- ⏳ restart-zombie.js
- ⏳ restart-dead.js
- ⏳ 其他相关文件

## 重构步骤（5 分钟/文件）

### 1. 替换导入
```javascript
// 旧的
const { renderPage, renderTable, menu } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');

// 新的
const { renderPage } = require('cli-menu-kit');
const { getCCBInstances } = require('../../services/instance-service');
const { filterInstancesByStatus, displayInstanceTable, selectInstances, confirmOperation } = require('../../services/instance-operations-helper');
```

### 2. 替换过滤逻辑
```javascript
// 旧的
const zombies = instances.filter(inst => inst.status === 'zombie');

// 新的
const zombies = filterInstancesByStatus(instances, 'zombie');
// 或多个状态
const killable = filterInstancesByStatus(instances, ['active', 'zombie']);
```

### 3. 替换表格显示
```javascript
// 旧的 - 删除整个 tableData 和 renderTable 代码块

// 新的 - 一行搞定
displayInstanceTable(instances, tc, 'operationName.columns');
```

### 4. 替换 checkbox 选择
```javascript
// 旧的 - 删除整个 checkboxOptions 和 menu.checkbox 代码块

// 新的
const selected = await selectInstances(instances, tc, 'operationName.selectInstances');
if (!selected) return 'back';
```

### 5. 替换确认逻辑
```javascript
// 旧的 - 删除 displayConfirmationTable 和 menu.boolean 代码块

// 新的
const confirmed = await confirmOperation(selected, tc, 'operationName');
if (!confirmed) return 'back';
```

## 需要添加的 i18n 翻译

每个操作添加：
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

## 测试

重构后测试：
1. 进入菜单
2. 选择 "s. Select"
3. 确认看到 "0. 取消" 选项
4. 测试取消功能
5. 测试正常选择和确认流程
