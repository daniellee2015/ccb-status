# Bug Fixes

## Critical Bugs Fixed

### 1. Menu API Misuse (Runtime Error)

**Error**: `TypeError: menu is not a function`

**Root Cause**: Incorrect usage of `cli-menu-kit` API. The `menu` export is an object with methods (`checkbox`, `boolean`, etc.), not a function that accepts a config object.

**Wrong Usage**:
```javascript
const selected = await menu({
  type: 'checkbox',
  message: 'Select instances',
  options: checkboxOptions
});

const confirmed = await menu({
  type: 'confirm',
  message: 'Confirm?',
  default: false
});
```

**Correct Usage**:
```javascript
const selected = await menu.checkbox({
  message: 'Select instances',
  options: checkboxOptions
});

const confirmed = await menu.boolean({
  message: 'Confirm?',
  default: false
});
```

**Files Fixed**:
- `src/cli/menus/kill-active.js`
- `src/cli/menus/kill-zombie.js`
- `src/cli/menus/kill-all.js`
- `src/cli/menus/cleanup-dead.js`
- `src/cli/menus/cleanup-zombie.js`
- `src/cli/menus/cleanup-all.js`

### 2. Checkbox Options Format Error

**Problem**: Checkbox menu only displayed numbers (0, 1, 2) without project names, making it impossible to identify which instance to select.

**Root Cause**: Incorrect options format. The `menu.checkbox` API expects a string array, not an object array with `label` and `value` properties.

**Wrong Approach**:
```javascript
const checkboxOptions = instances.map((inst, idx) => ({
  label: `${idx + 1}. ${projectName} (${shortHash}) - PID ${inst.pid}`,
  value: idx.toString()
}));

const selected = await menu.checkbox({ options: checkboxOptions });
// Returns array of value strings: ['0', '1']
```

**Correct Approach**:
```javascript
const checkboxOptions = instances.map((inst, idx) =>
  `${idx + 1}. ${projectName} (${shortHash}) - PID ${inst.pid}`
);

const result = await menu.checkbox({ options: checkboxOptions });
// Returns object with indices array: { indices: [0, 1], values: [...] }
const selectedInstances = result.indices.map(idx => instances[idx]);
```

**Key Changes**:
1. Options are now plain strings (not objects)
2. Use `result.indices` to get selected item indices
3. Map indices directly to instances array (no need for `parseInt`)

**Impact**: Users can now see full instance information (project name, hash, PID) when selecting items.

**Files Fixed**:
- `src/cli/menus/kill-active.js`
- `src/cli/menus/kill-zombie.js`
- `src/cli/menus/kill-all.js`
- `src/cli/menus/cleanup-dead.js`
- `src/cli/menus/cleanup-zombie.js`
- `src/cli/menus/cleanup-all.js`

### 3. Table Status Column Empty

**Problem**: Status symbols (✓, ⚠, ✗) not displaying in table "S" column.

**Root Cause**: ANSI color codes in cell values break `renderTable` width calculation. The table tries to measure string length but ANSI escape sequences confuse the measurement.

**Wrong Approach**:
```javascript
const status = inst.status === 'active' ? '\x1b[32m✓\x1b[0m' : '\x1b[33m⚠\x1b[0m';
```

**Fixed Approach**:
```javascript
const status = inst.status === 'active' ? '✓' : '⚠';
```

**Impact**: Status symbols now display correctly in tables. Colors can be added later using a different rendering approach if needed.

**Files Fixed**:
- `src/cli/menus/kill-all.js`
- `src/cli/menus/cleanup-all.js`

## Testing

All 46 tests pass after fixes:
```bash
bash test-kill-cleanup.sh
```

## Lessons Learned

1. **Always check API documentation**: The `menu` object structure was not obvious from the import statement
2. **Test with actual data**: The ANSI code issue only appeared with real table rendering
3. **Avoid premature optimization**: Adding colors to table cells caused more problems than value
4. **Use type checking**: TypeScript would have caught the `menu()` vs `menu.checkbox()` issue at compile time

## Related Issues

These bugs were discovered during user testing after implementing security improvements. The security features (PID validation, async file ops) are working correctly - these were purely UI/API usage bugs.
