#!/usr/bin/env node

/**
 * CCB Status - Status Monitor
 * Interactive CLI tool to monitor all CCB instances
 */

const { renderPage, generateMenuHints } = require('cli-menu-kit');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check if PID is alive
function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

// Get all CCB instances
function getCCBInstances() {
  const cacheDir = path.join(os.homedir(), '.cache', 'ccb', 'projects');
  if (!fs.existsSync(cacheDir)) {
    return [];
  }

  const instances = [];
  const projectDirs = fs.readdirSync(cacheDir);

  for (const projectDir of projectDirs) {
    const stateFile = path.join(cacheDir, projectDir, 'askd.json');
    if (!fs.existsSync(stateFile)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      const pid = parseInt(data.pid || 0);
      const isAlive = isPidAlive(pid);

      instances.push({
        workDir: data.work_dir || projectDir,
        pid: pid,
        port: data.port || 0,
        host: data.host || '127.0.0.1',
        isAlive: isAlive,
        stateFile: stateFile
      });
    } catch (e) {
      // Skip invalid state files
    }
  }

  return instances;
}

// Main menu (Level 1)
async function showMainMenu() {
  const result = await renderPage({
    header: {
      type: 'full',
      title: 'CCB Status Monitor',
      version: '0.1.0',
      menuTitle: 'Select an option:'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: [
          '1. View Instance List',
          '2. Refresh Status',
          '3. Cleanup Zombie Processes',
          '4. Exit'
        ],
        allowNumberKeys: true,
        allowLetterKeys: false
      }
    },
    footer: {
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true
      })
    }
  });

  return result.index;
}

// Instance list menu (Level 2)
async function showInstanceList() {
  const instances = getCCBInstances();

  if (instances.length === 0) {
    console.log('\n  No CCB instances found.\n');
    console.log('  Press Enter to return...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    return null;
  }

  const options = instances.map((inst, idx) => {
    const status = inst.isAlive ? '✓ Active' : '✗ Dead';
    const dir = inst.workDir.replace(os.homedir(), '~');
    return `${idx + 1}. ${dir} [${status}]`;
  });

  const result = await renderPage({
    header: {
      type: 'simple',
      text: 'CCB Instances'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: options,
        allowNumberKeys: true
      }
    },
    footer: {
      menu: {
        options: ['b. Back'],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: ['↑↓ Navigate', 'Enter Select', 'B Back']
    }
  });

  if (result.value === 'b. Back') {
    return null;
  }

  return instances[result.index];
}

// Instance details view (Level 3)
async function showInstanceDetails(instance) {
  const result = await renderPage({
    header: {
      type: 'simple',
      text: `Instance: ${instance.workDir.replace(os.homedir(), '~')}`
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log('\n  Daemon Status:');
        console.log(`    Status: ${instance.isAlive ? '✓ Running' : '✗ Stopped'}`);
        console.log(`    PID: ${instance.pid}`);
        console.log(`    Port: ${instance.port}`);
        console.log(`    Host: ${instance.host}`);

        console.log('\n  State File:');
        console.log(`    ${instance.stateFile}`);

        console.log('\n  LLM Status:');
        console.log('    Claude:   (checking...)');
        console.log('    Gemini:   (checking...)');
        console.log('    OpenCode: (checking...)');
        console.log('    Codex:    (checking...)');

        console.log('\n');
      }
    },
    footer: {
      menu: {
        options: ['r. Refresh', 'b. Back'],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: ['R Refresh', 'B Back']
    }
  });

  return result.value;
}

// Main loop
async function main() {
  while (true) {
    const mainChoice = await showMainMenu();

    switch (mainChoice) {
      case 0: // View Instance List
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

      case 1: // Refresh Status
        console.log('\n  Status refreshed!\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;

      case 2: // Cleanup
        console.log('\n  Cleaning up zombie processes...\n');
        // TODO: Call cleanup function
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;

      case 3: // Exit
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

