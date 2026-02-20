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
            tmuxSessions = getTmuxSessions(!showAllSessions);
            continue;
          }

          if (action === 'a. Toggle All/Attached') {
            showAllSessions = !showAllSessions;
            tmuxSessions = getTmuxSessions(!showAllSessions);
            continue;
          }

          if (action === 'k. Kill Window') {
            // Prompt for window selection
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            await new Promise((resolve) => {
              rl.question('\n  Enter window number to kill (or press Enter to cancel): ', (answer) => {
                rl.close();
                if (answer.trim()) {
                  const windowNum = parseInt(answer.trim());
                  if (windowNum > 0 && !isNaN(windowNum)) {
                    // Find the window
                    let currentNum = 1;
                    let targetSession = null;
                    let targetWindow = null;

                    for (const [sessionName, sessionData] of Object.entries(tmuxSessions)) {
                      for (const window of sessionData.windows) {
                        if (currentNum === windowNum) {
                          targetSession = sessionName;
                          targetWindow = window.index;
                          break;
                        }
                        currentNum++;
                      }
                      if (targetSession) break;
                    }

                    if (targetSession && targetWindow !== null) {
                      // Confirm before killing
                      const rl2 = require('readline').createInterface({
                        input: process.stdin,
                        output: process.stdout
                      });

                      rl2.question(`\n  ⚠️  Kill window ${targetSession}:${targetWindow}? (y/N): `, (confirm) => {
                        rl2.close();

                        if (confirm.trim().toLowerCase() === 'y') {
                          try {
                            execFileSync('tmux', ['kill-window', '-t', `${targetSession}:${targetWindow}`], {
                              encoding: 'utf8',
                              stdio: 'pipe'
                            });
                            console.log(`\n  ✓ Killed window ${targetSession}:${targetWindow}\n`);
                            tmuxSessions = getTmuxSessions(!showAllSessions);
                          } catch (e) {
                            console.log(`\n  ✗ Failed to kill window: ${e.message}\n`);
                          }
                        } else {
                          console.log('\n  Cancelled\n');
                        }

                        setTimeout(resolve, 1000);
                      });
                    } else {
                      console.log('\n  ✗ Invalid window number\n');
                      setTimeout(resolve, 1000);
                    }
                  } else {
                    console.log('\n  ✗ Invalid window number\n');
                    setTimeout(resolve, 1000);
                  }
                } else {
                  setTimeout(resolve, 500);
                }
              });
            });
            continue;
          }

          if (action === 's. Kill Session') {
            // Prompt for session selection
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            await new Promise((resolve) => {
              rl.question('\n  Enter session name to kill (or press Enter to cancel): ', (answer) => {
                rl.close();
                if (answer.trim()) {
                  const sessionName = answer.trim();
                  if (tmuxSessions[sessionName]) {
                    // Confirm before killing
                    const rl2 = require('readline').createInterface({
                      input: process.stdin,
                      output: process.stdout
                    });

                    rl2.question(`\n  ⚠️  Kill entire session "${sessionName}"? This will close all windows. (y/N): `, (confirm) => {
                      rl2.close();

                      if (confirm.trim().toLowerCase() === 'y') {
                        try {
                          execFileSync('tmux', ['kill-session', '-t', sessionName], {
                            encoding: 'utf8',
                            stdio: 'pipe'
                          });
                          console.log(`\n  ✓ Killed session ${sessionName}\n`);
                          tmuxSessions = getTmuxSessions(!showAllSessions);
                        } catch (e) {
                          console.log(`\n  ✗ Failed to kill session: ${e.message}\n`);
                        }
                      } else {
                        console.log('\n  Cancelled\n');
                      }

                      setTimeout(resolve, 1000);
                    });
                  } else {
                    console.log('\n  ✗ Session not found\n');
                    setTimeout(resolve, 1000);
                  }
                } else {
                  setTimeout(resolve, 500);
                }
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
