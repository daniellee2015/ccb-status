#!/usr/bin/env node

/**
 * CCB Status - Status Monitor
 * Interactive CLI tool to monitor all CCB instances
 */

const { showMainMenu } = require('../src/cli/menus/main-menu');
const { showInstanceList } = require('../src/cli/menus/instance-list');
const { showInstanceDetails } = require('../src/cli/menus/instance-details');
const { showHistory } = require('../src/cli/menus/history');
const { showZombieDetection } = require('../src/cli/menus/zombie-detection');
const { showCleanup, detectStatus } = require('../src/cli/menus/cleanup');
const { showTmuxManagement, getTmuxSessions } = require('../src/cli/menus/tmux-management');
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

              if (cleanupAction === 'r. Restart Zombie' && detection && detection.zombies.length > 0) {
                // Prompt for zombie selection
                const readline = require('readline');
                const rl = readline.createInterface({
                  input: process.stdin,
                  output: process.stdout
                });

                await new Promise((resolve) => {
                  rl.question('\n  Enter zombie number to restart (or press Enter to cancel): ', async (answer) => {
                    rl.close();
                    if (answer.trim()) {
                      const zombieNum = parseInt(answer.trim());
                      if (zombieNum > 0 && zombieNum <= detection.zombies.length) {
                        const zombie = detection.zombies[zombieNum - 1];
                        console.log(`\n  Restarting zombie PID ${zombie.pid}...`);

                        // Kill the zombie
                        try {
                          execSync(`ccb-cleanup --kill-pid ${zombie.pid}`, {
                            encoding: 'utf8',
                            stdio: 'pipe'
                          });
                          console.log(`  ✓ Killed PID ${zombie.pid}`);

                          // Show restart instructions
                          console.log(`\n  To restart the daemon, run:`);
                          console.log(`  \x1b[36mcd ${zombie.workDir}\x1b[0m`);
                          console.log(`  \x1b[36mccb <provider>\x1b[0m`);
                          console.log(`\n  Note: Replace <provider> with the appropriate provider (claude/gemini/codex/opencode)\n`);
                        } catch (e) {
                          console.log(`  ✗ Failed to kill PID ${zombie.pid}: ${e.message}\n`);
                        }
                      } else {
                        console.log('\n  ✗ Invalid zombie number\n');
                      }
                    }
                    setTimeout(resolve, 2000);
                  });
                });

                // Re-detect after restart attempt
                startSpinner('Re-detecting status...');
                detection = await detectStatus();
                stopSpinner('Detection complete');
                console.log('');
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
        }
        break;

      case 4: // Tmux Window Management
        let tmuxSessions = null;
        let showAllSessions = false;
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

            windowOptions.push('Cancel');

            const { renderPage } = require('cli-menu-kit');
            const selectResult = await renderPage({
              header: {
                type: 'simple',
                text: 'Select Window to Kill'
              },
              mainArea: {
                type: 'menu',
                menu: {
                  options: windowOptions,
                  allowNumberKeys: true
                }
              }
            });

            if (selectResult.index === windowOptions.length - 1) {
              // Cancelled
              continue;
            }

            const target = windowMap[selectResult.index];

            // Confirm before killing
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            await new Promise((resolve) => {
              rl.question(`\n  ⚠️  Kill window ${target.session}:${target.window}? (y/N): `, async (confirm) => {
                rl.close();

                if (confirm.trim().toLowerCase() === 'y') {
                  try {
                    execFileSync('tmux', ['kill-window', '-t', `${target.session}:${target.window}`], {
                      encoding: 'utf8',
                      stdio: 'pipe'
                    });
                    console.log(`\n  ✓ Killed window ${target.session}:${target.window}\n`);
                    tmuxSessions = await getTmuxSessions(!showAllSessions);
                  } catch (e) {
                    console.log(`\n  ✗ Failed to kill window: ${e.message}\n`);
                  }
                } else {
                  console.log('\n  Cancelled\n');
                }

                setTimeout(resolve, 1000);
              });
            });
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

            sessionOptions.push('Cancel');

            const { renderPage } = require('cli-menu-kit');
            const selectResult = await renderPage({
              header: {
                type: 'simple',
                text: 'Select Session to Kill'
              },
              mainArea: {
                type: 'menu',
                menu: {
                  options: sessionOptions,
                  allowNumberKeys: true
                }
              }
            });

            if (selectResult.index === sessionOptions.length - 1) {
              // Cancelled
              continue;
            }

            const targetSession = sessionNames[selectResult.index];

            // Confirm before killing
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            await new Promise((resolve) => {
              rl.question(`\n  ⚠️  Kill entire session "${targetSession}"? This will close all windows. (y/N): `, async (confirm) => {
                rl.close();

                if (confirm.trim().toLowerCase() === 'y') {
                  try {
                    execFileSync('tmux', ['kill-session', '-t', targetSession], {
                      encoding: 'utf8',
                      stdio: 'pipe'
                    });
                    console.log(`\n  ✓ Killed session ${targetSession}\n`);
                    tmuxSessions = await getTmuxSessions(!showAllSessions);
                  } catch (e) {
                    console.log(`\n  ✗ Failed to kill session: ${e.message}\n`);
                  }
                } else {
                  console.log('\n  Cancelled\n');
                }

                setTimeout(resolve, 1000);
              });
            });
            continue;
          }
        }
        break;

      case 5: // Exit
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
