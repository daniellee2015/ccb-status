#!/usr/bin/env node

/**
 * CCB Status - Status Monitor
 * Interactive CLI tool to monitor all CCB instances
 */

const { showMainMenu } = require('../src/cli/menus/main-menu');
const { showInstanceList } = require('../src/cli/menus/instance-list');
const { showInstanceDetails } = require('../src/cli/menus/instance-details');
const { showRestartZombie } = require('../src/cli/menus/restart-zombie');
const { showRestartDead } = require('../src/cli/menus/restart-dead');
const { showRecoverDisconnected } = require('../src/cli/menus/recover-disconnected');
const { showHistory } = require('../src/cli/menus/history');
const { showInstanceManagement } = require('../src/cli/menus/instance-management');
const { showKillOperations } = require('../src/cli/menus/kill-operations');
const { showCleanupOperations } = require('../src/cli/menus/cleanup-operations');
const { showRestartOperations } = require('../src/cli/menus/restart-operations');
const { showKillActive } = require('../src/cli/menus/kill-active');
const { showKillZombie } = require('../src/cli/menus/kill-zombie');
const { showKillAll } = require('../src/cli/menus/kill-all');
const { showCleanupDead } = require('../src/cli/menus/cleanup-dead');
const { showCleanupZombie } = require('../src/cli/menus/cleanup-zombie');
const { showCleanupAll } = require('../src/cli/menus/cleanup-all');
const { showCleanup, detectStatus } = require('../src/cli/menus/cleanup');
const { showTmuxManagement, getTmuxSessions } = require('../src/cli/menus/tmux-management');
const { showLanguageSettings } = require('../src/cli/menus/language-settings');
const { showInfo, showSuccess, showWarning } = require('cli-menu-kit');
const { startSpinner, stopSpinner } = require('../src/utils/spinner');
const { execSync, execFileSync } = require('child_process');

// Main loop
async function main() {
  while (true) {
    const mainChoice = await showMainMenu();

    switch (mainChoice) {
      case 0: // View Active Instances
        while (true) {
          const instance = await showInstanceList();
          if (!instance) break; // Back to main menu

          // Show instance details
          while (true) {
            const action = await showInstanceDetails(instance);
            if (action === 'b. Back') break; // Back to instance list
            // If 'r. Refresh', loop continues to refresh
          }
        }
        break;

      case 1: // View History
        while (true) {
          const action = await showHistory();
          if (action === 'b. Back') break;
        }
        break;

      case 2: // Refresh Status
        console.log('\n  Status refreshed!\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;

      case 3: // Instance Management
        let detectionResult = null;
        while (true) {
          const { action, detection } = await showInstanceManagement(detectionResult);
          detectionResult = detection;

          if (action === 'b. Back') break;

          // Status Detection
          if (action.startsWith('d. Status Detection')) {
            startSpinner('Detecting status...');
            detectionResult = await detectStatus();
            stopSpinner('Detection complete');
            console.log('');
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }

          // Kill Operations submenu
          if (action.startsWith('1. Kill Operations')) {
            while (true) {
              const killAction = await showKillOperations();
              if (killAction === 'b. Back' || killAction.startsWith('b.')) break;

              if (killAction.startsWith('1. Kill Active Instances')) {
                const result = await showKillActive();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (killAction.startsWith('2. Kill Zombie Instances')) {
                const result = await showKillZombie();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (killAction.startsWith('3. Kill All Instances')) {
                const result = await showKillAll();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
            continue;
          }

          // Cleanup Operations submenu
          if (action.startsWith('2. Cleanup Operations')) {
            while (true) {
              const cleanupAction = await showCleanupOperations();
              if (cleanupAction === 'b. Back' || cleanupAction.startsWith('b.')) break;

              if (cleanupAction.startsWith('1. Cleanup Dead States')) {
                const result = await showCleanupDead();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (cleanupAction.startsWith('2. Cleanup Zombie States')) {
                const result = await showCleanupZombie();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (cleanupAction.startsWith('3. Cleanup All States')) {
                const result = await showCleanupAll();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
            continue;
          }

          // Restart Operations submenu
          if (action.startsWith('3. Restart Operations')) {
            while (true) {
              const restartAction = await showRestartOperations();
              if (restartAction === 'b. Back') break;

              if (restartAction.startsWith('1. Restart Zombie Instances')) {
                const result = await showRestartZombie();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (restartAction.startsWith('2. Restart Dead Instances')) {
                const result = await showRestartDead();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (restartAction.startsWith('3. Recover Disconnected Instances')) {
                const result = await showRecoverDisconnected();
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detectionResult = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (restartAction.startsWith('4. Restart All Instances')) {
                console.log('\n  🚧 Coming soon: Restart All Instances\n');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            continue;
          }
        }
        break;

      case 4: // Tmux Window Management
        let tmuxSessions = null;
        let showAllSessions = false;  // Default to show only attached sessions (collapsed)
        while (true) {
          const { action, sessions, showAll } = await showTmuxManagement(tmuxSessions, showAllSessions);
          tmuxSessions = sessions;
          showAllSessions = showAll;

          if (action === 'b. Back') break;

          if (action === 'r. Refresh') {
            tmuxSessions = await getTmuxSessions(!showAllSessions);
            continue;
          }

          if (action === 'a. Toggle All/Attached') {
            showAllSessions = !showAllSessions;
            tmuxSessions = await getTmuxSessions(!showAllSessions);
            continue;
          }

          if (action === 'k. Kill Window') {
            // Build window list for selection
            const windowOptions = [];
            const windowMap = [];

            for (const [sessionName, sessionData] of Object.entries(tmuxSessions)) {
              for (const window of sessionData.windows) {
                const ccbInfo = window.ccbInfo ? ` [CCB: PID ${window.ccbInfo.pid}]` : '';
                const label = `Session ${sessionName}: ${window.index}:${window.name} (${window.panes} panes)${ccbInfo}`;
                windowOptions.push(label);
                windowMap.push({ session: sessionName, window: window.index });
              }
            }

            if (windowOptions.length === 0) {
              console.log('\n  No windows to kill\n');
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            // Use checkbox for multi-select
            const { menu } = require('cli-menu-kit');
            const selectResult = await menu.checkbox({
              title: 'Select Windows to Kill (Space to toggle, Enter to confirm)',
              options: windowOptions,
              minSelections: 0  // Allow empty selection to cancel
            });

            if (!selectResult || selectResult.indices.length === 0) {
              // User cancelled or selected nothing
              continue;
            }

            // Show selected windows and confirm
            const selectedWindows = selectResult.indices.map(i => windowMap[i]);
            console.log('\n  Selected windows:');
            selectedWindows.forEach(w => {
              console.log(`    - ${w.session}:${w.window}`);
            });

            const confirmed = await menu.booleanH(
              `\n  ⚠️  Kill ${selectedWindows.length} window(s)?`,
              false
            );

            if (!confirmed) {
              console.log('\n  Cancelled\n');
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            // Kill selected windows
            console.log('\n  Killing windows...\n');
            let successCount = 0;
            let failCount = 0;

            for (const target of selectedWindows) {
              try {
                execFileSync('tmux', ['kill-window', '-t', `${target.session}:${target.window}`], {
                  encoding: 'utf8',
                  stdio: 'pipe'
                });
                console.log(`  ✓ Killed window ${target.session}:${target.window}`);
                successCount++;
              } catch (e) {
                console.log(`  ✗ Failed to kill window ${target.session}:${target.window}: ${e.message}`);
                failCount++;
              }
            }

            console.log(`\n  Complete: ${successCount} succeeded, ${failCount} failed\n`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Refresh tmux sessions
            tmuxSessions = await getTmuxSessions(!showAllSessions);
            continue;
          }

          if (action === 's. Kill Session') {
            // Build session list for selection
            const sessionOptions = [];
            const sessionNames = [];

            for (const [sessionName, sessionData] of Object.entries(tmuxSessions)) {
              const attachedMark = sessionData.attached ? ' *' : '';
              const windowCount = sessionData.windows.length;
              const ccbWindows = sessionData.windows.filter(w => w.isCCB).length;
              const ccbInfo = ccbWindows > 0 ? ` [${ccbWindows} CCB window(s)]` : '';

              const label = `Session ${sessionName}${attachedMark}: ${windowCount} window(s)${ccbInfo}`;
              sessionOptions.push(label);
              sessionNames.push(sessionName);
            }

            if (sessionOptions.length === 0) {
              console.log('\n  No sessions to kill\n');
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            // Use checkbox for multi-select
            const { menu } = require('cli-menu-kit');
            const selectResult = await menu.checkbox({
              title: 'Select Sessions to Kill (Space to toggle, Enter to confirm)',
              options: sessionOptions,
              minSelections: 0  // Allow empty selection to cancel
            });

            if (!selectResult || selectResult.indices.length === 0) {
              // User cancelled or selected nothing
              continue;
            }

            // Show selected sessions and confirm
            const selectedSessions = selectResult.indices.map(i => sessionNames[i]);
            console.log('\n  Selected sessions:');
            selectedSessions.forEach(s => {
              const sessionData = tmuxSessions[s];
              const windowCount = sessionData.windows.length;
              console.log(`    - ${s} (${windowCount} window(s))`);
            });

            const confirmed = await menu.booleanH(
              `\n  ⚠️  Kill ${selectedSessions.length} session(s)? This will close all windows.`,
              false
            );

            if (!confirmed) {
              console.log('\n  Cancelled\n');
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            // Kill selected sessions
            console.log('\n  Killing sessions...\n');
            let successCount = 0;
            let failCount = 0;

            for (const targetSession of selectedSessions) {
              try {
                execFileSync('tmux', ['kill-session', '-t', targetSession], {
                  encoding: 'utf8',
                  stdio: 'pipe'
                });
                console.log(`  ✓ Killed session ${targetSession}`);
                successCount++;
              } catch (e) {
                console.log(`  ✗ Failed to kill session ${targetSession}: ${e.message}`);
                failCount++;
              }
            }

            console.log(`\n  Complete: ${successCount} succeeded, ${failCount} failed\n`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Refresh tmux sessions
            tmuxSessions = await getTmuxSessions(!showAllSessions);
            continue;
          }
        }
        break;

      case 5: // Language Settings
        while (true) {
          const action = await showLanguageSettings();
          if (action === 'b. Back' || action === 'language-changed') break;
        }
        break;

      case 6: // Exit
        console.log('\n  Goodbye!\n');
        process.exit(0);
    }
  }
}

// Run
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
