# CCB Status

Status monitor for Claude Code Bridge - Monitor all CCB instances and daemon health.

## Features

- 📊 **Interactive CLI** - Three-level menu system for easy navigation
- 🔍 **Instance Discovery** - Automatically finds all running CCB instances
- 💚 **Health Monitoring** - Check daemon status, PID, port, and connectivity
- 🤖 **LLM Status** - Monitor Claude, Gemini, OpenCode, and Codex sessions
- 📈 **Activity Tracking** - View communication activity and request statistics
- 🧹 **Cleanup Tools** - Remove zombie processes and stale state files

## Installation

### Standalone Installation

```bash
npm install -g ccb-status
```

### Integrated with CCB Multi

If you're using CCB Multi fork, ccb-status is already included as a submodule.

## Usage

```bash
ccb-status
```

### Menu Structure

**Level 1: Main Menu**
- View Instance List
- Refresh Status
- Cleanup Zombie Processes
- Exit

**Level 2: Instance List**
- Shows all CCB instances with status indicators
- Select an instance to view details

**Level 3: Instance Details**
- Daemon status (PID, port, host)
- LLM session status
- Communication activity
- Refresh and navigation options

## Status Indicators

- ✓ Active - Daemon is running and healthy
- ⚠ Idle - Daemon is running but idle
- ✗ Dead - Daemon process not found

## Requirements

- Node.js >= 14.0.0
- Claude Code Bridge installed

## License

MIT

## Related Projects

- [Claude Code Bridge](https://github.com/bfly123/claude_code_bridge) - Original CCB project
- [CCB Multi](https://github.com/daniellee2015/ccb-multi) - Multi-instance manager for CCB
