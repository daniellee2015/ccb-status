# Confirmation Enhancement TODO

## Status
- ✅ kill-active.js - DONE (with detailed confirmation table)
- 🔄 cleanup-zombie.js - IN PROGRESS (imports added)
- ⏳ Other files - PENDING

## Files to Update

### Kill Operations
- ✅ kill-active.js
- ⏳ kill-zombie.js
- ⏳ kill-all.js

### Cleanup Operations
- 🔄 cleanup-zombie.js
- ⏳ cleanup-dead.js
- ⏳ cleanup-all.js

### Restart Operations
- ⏳ restart-zombie.js
- ⏳ restart-dead.js

### Tmux Management
- ⏳ tmux-management.js (kill window/session operations)

## Changes Needed for Each File

1. Add imports:
   ```javascript
   const { getHistory } = require('../../services/history-service');
   const { formatInstanceName } = require('../../services/display-formatter');
   const { displayConfirmationTable } = require('../../services/confirmation-helper');
   ```

2. Get history map:
   ```javascript
   const historyMap = getHistory();
   ```

3. Update table display to use formatInstanceName with 'with-parent' format

4. Add confirmation table before dangerous operation:
   ```javascript
   displayConfirmationTable(
     selectedInstances,
     tc('operationName.confirmationWarning'),
     tc,
     'operationName.columns'
   );
   ```

5. Add i18n translations:
   - confirmationWarning
   - parent column

## I18n Updates Needed

For each operation (killZombie, cleanupZombie, etc.), add:
```javascript
{
  confirmationWarning: '警告：即将操作以下实例',
  columns: {
    project: '项目',
    parent: '父项目',
    hash: '哈希',
    type: '类型',
    pid: 'PID',
    status: '状态'
  }
}
```
