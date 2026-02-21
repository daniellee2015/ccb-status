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
const { showHistory } = require('../src/cli/menus/history');
const { showZombieDetection } = require('../src/cli/menus/zombie-detection');
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

      case 3: // Zombie Detection
        let detectionResult = null;
        while (true) {
          const action = await showZombieDetection(detectionResult);
          if (action === 'b. Back') break;

          if (action === 'd. Detect Status') {
            // Start spinner
            startSpinner('Detecting status...');

            // Detect
            detectionResult = await detectStatus();

            // Stop spinner and show success
            stopSpinner('Detection complete');
            console.log('');

            // Wait a moment before re-rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            // Loop continues to show results in menu
            continue;
          }

          if (action === 'z. Restart Zombie') {
            // Show restart zombie menu
            const result = await showRestartZombie();

            // Re-detect after restart
            if (result === 'completed') {
              startSpinner('Re-detecting status...');
              detectionResult = await detectStatus();
              stopSpinner('Detection complete');
              console.log('');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            continue;
          }

          if (action === 'r. Restart Dead') {
            // Show restart dead menu
            const result = await showRestartDead();

            // Re-detect after restart
            if (result === 'completed') {
              startSpinner('Re-detecting status...');
              detectionResult = await detectStatus();
              stopSpinner('Detection complete');
              console.log('');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            continue;
          }

          if (action === 'c. Cleanup Zombie Processes') {
            // Enter cleanup submenu - auto-detect on first entry
            startSpinner('Detecting status...');
            let detection = await detectStatus();
            stopSpinner('Detection complete');
            console.log('');
            await new Promise(resolve => setTimeout(resolve, 500));

            while (true) {
              const { action: cleanupAction, lastDetection } = await showCleanup(detection);

              if (cleanupAction === 'b. Back') break;

              if (cleanupAction === 'd. Detect Status' || cleanupAction === 'd. Re-detect') {
                // Start spinner
                startSpinner('Detecting status...');

                detection = await detectStatus();

                // Stop spinner and show success
                stopSpinner('Detection complete');
                console.log('');

                // Wait a moment before re-rendering
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              }

              if (cleanupAction === 'c. Cleanup All' && detection && detection.zombies.length > 0) {
                // Confirm before cleanup
                const readline = require('readline');
                const rl = readline.createInterface({
                  input: process.stdin,
                  output: process.stdout
                });

                await new Promise((resolve) => {
                  rl.question(`\n  ⚠️  This will kill ${detection.zombies.length} zombie process(es). Continue? (y/N): `, async (answer) => {
                    rl.close();

                    if (answer.trim().toLowerCase() !== 'y') {
                      console.log('\n  Cleanup cancelled\n');
                      setTimeout(resolve, 500);
                      return;
                    }

                    console.log('\n  Cleaning up zombie processes...\n');

                    // Call ccb-cleanup to kill zombie daemons
                    const pids = detection.zombies.map(z => z.pid).join(' ');

                    try {
                      // Use ccb-cleanup to kill each zombie PID
                      for (const zombie of detection.zombies) {
                        try {
                          execSync(`ccb-cleanup --kill-pid ${zombie.pid}`, {
                            encoding: 'utf8',
                            stdio: 'pipe'
                          });
                          console.log(`  ✓ Killed PID ${zombie.pid}`);
                        } catch (e) {
                          console.log(`  ✗ Failed to kill PID ${zombie.pid}`);
                        }
                      }
                      console.log(`\n  Cleanup complete\n`);
                    } catch (e) {
                      console.log(`\n  ✗ Cleanup failed: ${e.message}\n`);
                    }

                    await new Promise(resolve2 => setTimeout(resolve2, 1000));

                    // Re-detect after cleanup
                    startSpinner('Re-detecting status...');
                    detection = await detectStatus();
                    stopSpinner('Detection complete');
                    console.log('');
                    await new Promise(resolve2 => setTimeout(resolve2, 500));

                    resolve();
                  });
                });
              }

              if (cleanupAction === 'z. Restart Zombie') {
                // Show restart zombie menu
                const result = await showRestartZombie();

                // Re-detect after restart
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detection = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }

              if (cleanupAction === 'r. Restart Dead') {
                // Show restart dead menu
                const result = await showRestartDead();

                // Re-detect after restart
                if (result === 'completed') {
                  startSpinner('Re-detecting status...');
                  detection = await detectStatus();
                  stopSpinner('Detection complete');
                  console.log('');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
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
