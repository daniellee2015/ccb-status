#!/usr/bin/env node

/**
 * CCB Status - Status Monitor
 * Interactive CLI tool to monitor all CCB instances
 */

const { showMainMenu } = require('../src/cli/menus/main-menu');
const { showInstanceList } = require('../src/cli/menus/instance-list');
const { showInstanceDetails } = require('../src/cli/menus/instance-details');
const { showHistory } = require('../src/cli/menus/history');

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

      case 3: // Cleanup
        console.log('\n  Cleaning up zombie processes...\n');
        // TODO: Call cleanup function
        await new Promise(resolve => setTimeout(resolve, 1000));
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
