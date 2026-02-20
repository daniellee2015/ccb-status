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
const { showInfo, showSuccess, showWarning } = require('cli-menu-kit');
const { startSpinner, stopSpinner } = require('../src/utils/spinner');

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
                console.log('\n  Cleaning up zombie processes...');
                let cleaned = 0;
                for (const zombie of detection.zombies) {
                  try {
                    process.kill(zombie.pid, 'SIGTERM');
                    console.log(`  ✓ Killed PID ${zombie.pid}`);
                    cleaned++;
                  } catch (e) {
                    console.log(`  ✗ Failed to kill PID ${zombie.pid}: ${e.message}`);
                  }
                }
                console.log(`\n  Cleaned up ${cleaned}/${detection.zombies.length} zombie process(es).\n`);
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Re-detect after cleanup
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

      case 4: // Exit
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
