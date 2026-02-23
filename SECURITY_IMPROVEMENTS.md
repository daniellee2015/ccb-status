# Security Improvements

## Overview

This document describes the security improvements implemented in ccb-status based on peer review feedback from Gemini, Codex, and OpenCode.

## Critical Bug Fix (Codex Review)

### Cleanup Targeting Wrong State File

**Problem**: Detection reads from `~/.cache/ccb/projects/*/askd.json` (the source of truth), but cleanup was only deleting `workDir/.ccb/askd.json`. This caused cleanup operations to be ineffective - the state file remained in cache, and instances would still be detected as dead/zombie.

**Solution**: Updated all cleanup operations to:
1. Delete `instance.stateFile` (the actual cache file) first
2. Optionally delete per-project session files in `workDir/.ccb/`
3. Report detailed results: `stateRemoved`, `sessionRemoved`, `killed` (for zombies)

**Impact**: Cleanup operations now actually work - instances are properly removed from detection after cleanup.

## Changes Made

### 1. PID Validation (`src/utils/pid-validator.js`)

**Problem**: Original implementation killed processes by PID without validation, risking killing wrong processes if PID was reused.

**Solution**: Created comprehensive PID validation utility:

```javascript
// Validates PID belongs to CCB process
async function validatePid(pid, expectedWorkDir)

// Validates work directory path (prevents path traversal)
async function validateWorkDir(workDir)

// Safe kill with validation
async function safeKillProcess(pid, workDir, signal = 'SIGKILL')
```

**Features**:
- Checks if PID exists using `process.kill(pid, 0)`
- Uses `ps` command to verify process is Node.js
- Checks command line contains CCB-related keywords
- Validates work directory matches expected path
- Prevents path traversal attacks (checks for `..` and `~`)
- Returns detailed error messages for debugging

### 2. Async File Operations

**Problem**: Used synchronous file operations (`fs.unlinkSync`) which block event loop.

**Solution**: Converted all file operations to async:

```javascript
// Before
fs.unlinkSync(askdFile);

// After
await fs.unlink(askdFile);
```

**Benefits**:
- Non-blocking I/O
- Better error handling with try-catch
- Graceful handling of ENOENT errors

### 3. Improved Error Handling

**Problem**: Basic error handling, silent failures.

**Solution**: Comprehensive error handling:

```javascript
try {
  const result = await safeKillProcess(pid, workDir);
  if (result.success) {
    // Success
  } else {
    // Handle specific error
    console.log(`Failed: ${result.error}`);
  }
} catch (e) {
  // Handle unexpected errors
}
```

**Features**:
- Distinguishes between ESRCH (process not found) and EPERM (permission denied)
- Handles ENOENT (file not found) gracefully
- Provides user-friendly error messages
- Continues processing other instances on failure

### 4. Work Directory Validation

**Problem**: No validation of work directory paths, potential path traversal.

**Solution**: Added path validation:

```javascript
const workDirValidation = await validateWorkDir(instance.workDir);
if (!workDirValidation.valid) {
  throw new Error(`Invalid work directory: ${workDirValidation.reason}`);
}
```

**Checks**:
- Path is a string
- Path exists and is a directory
- No path traversal attempts (`..`, `~`)
- Resolves to absolute path

## Files Modified

### Kill Operations
- `src/cli/menus/kill-active.js` - Uses `safeKillProcess`
- `src/cli/menus/kill-zombie.js` - Uses `safeKillProcess`
- `src/cli/menus/kill-all.js` - Uses `safeKillProcess`

### Cleanup Operations
- `src/cli/menus/cleanup-dead.js` - Uses async fs + `validateWorkDir`
- `src/cli/menus/cleanup-zombie.js` - Uses async fs + `safeKillProcess` + `validateWorkDir`
- `src/cli/menus/cleanup-all.js` - Uses async fs + `safeKillProcess` + `validateWorkDir`

### New Files
- `src/utils/pid-validator.js` - PID and path validation utilities

### Test Updates
- `test-kill-cleanup.sh` - Updated to check for security features

## Testing

All 46 tests pass:
```bash
bash test-kill-cleanup.sh
```

Tests verify:
- File existence
- Function exports
- Translation completeness
- Security implementation (safeKillProcess, validateWorkDir, async fs)
- Menu integration

## Security Benefits

1. **Prevents killing wrong processes**: PID validation ensures we only kill CCB processes
2. **Prevents path traversal**: Work directory validation blocks malicious paths
3. **Better error handling**: Graceful degradation, clear error messages
4. **Non-blocking operations**: Async file I/O improves responsiveness
5. **Audit trail**: Detailed error messages for debugging

## Future Improvements

Based on Gemini's suggestions, potential future enhancements:

1. **PID timestamp validation**: Check process start time to detect PID reuse
2. **Restart All functionality**: Orchestrated restart of all instances
3. **Rate limiting**: Prevent rapid kill/restart cycles
4. **Logging**: Persistent log of kill/cleanup operations
5. **Dry-run mode**: Preview operations before execution

## Review Scores

### Initial Implementation
- **OpenCode**: 7.5/10 (identified need for PID validation and error handling)
- **Gemini**: Provided detailed security recommendations

### After Security Improvements
- **All security features implemented**: PID validation, async file ops, path validation
- **Critical bug fixed**: Cleanup now targets correct state file (Codex finding)
- **All 46 tests passing**: Including security feature checks

### Codex Critical Findings (Addressed)
1. ✅ **[Critical] Cleanup targeting wrong state file** - Fixed to delete `instance.stateFile`
2. ⚠️ **[High] Menu dispatch hardcoded to English** - Known issue, uses `startsWith()` for partial mitigation
3. ✅ **[High] PID validation missing** - Implemented comprehensive validation
4. ✅ **[Medium] Kill errors swallowed in cleanup** - Now surfaces errors except ESRCH
5. ✅ **[Medium] Path trust/symlink safety** - Added path validation

### Remaining Improvements (Future)
- Replace string-based menu routing with stable action keys (i18n independence)
- Add behavioral tests with mocked `process.kill`/`fs` and fixture states
- Implement SIGTERM → wait → SIGKILL fallback for graceful shutdown
- Add "Restart All Recoverable" functionality

## References

- Original design: `DESIGN_REVIEW.md`
- Test script: `test-kill-cleanup.sh`
- PID validator: `src/utils/pid-validator.js`
