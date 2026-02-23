/**
 * Instance Management Menu
 * Level 2 - Manage CCB instances (kill, cleanup, restart)
 */

const { renderPage } = require('cli-menu-kit');
const { tc } = require('../../i18n');
const { detectStatus } = require('./cleanup');

async function showInstanceManagement(lastDetection = null) {
  // Auto-detect on first entry
  if (!lastDetection) {
    lastDetection = await detectStatus();
  }

  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('instanceManagement.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        // Show detection results
        console.log(`  ${tc('instanceManagement.statusSummary')}`);
        console.log(`    \\x1b[32m${tc('instanceManagement.active', { count: lastDetection.active.length })}\\x1b[0m`);
        console.log(`    \\x1b[36m${tc('instanceManagement.orphaned', { count: lastDetection.orphaned.length })}\\x1b[0m`);
        console.log(`    \\x1b[33m${tc('instanceManagement.zombie', { count: lastDetection.zombies.length })}\\x1b[0m`);
        console.log(`    \\x1b[90m${tc('instanceManagement.dead', { count: lastDetection.dead.length })}\\x1b[0m`);
        console.log('');

        if (lastDetection.orphaned.length === 0 && lastDetection.zombies.length === 0 && lastDetection.dead.length === 0) {
          console.log(`  \\x1b[32m${tc('instanceManagement.allHealthy')}\\x1b[0m`);
        } else {
          if (lastDetection.orphaned.length > 0) {
            console.log(`  \\x1b[36m${tc('instanceManagement.foundOrphaned', { count: lastDetection.orphaned.length })}\\x1b[0m`);
          }
          if (lastDetection.zombies.length > 0) {
            console.log(`  \\x1b[33m${tc('instanceManagement.foundZombies', { count: lastDetection.zombies.length })}\\x1b[0m`);
          }
          if (lastDetection.dead.length > 0) {
            console.log(`  \\x1b[90m${tc('instanceManagement.foundDead', { count: lastDetection.dead.length })}\\x1b[0m`);
          }
        }
      }
    },
    },
    footer: {
      menu: {
        options: [
          `1. ${tc('instanceManagement.killOpsMenu')} - \x1b[2m${tc('instanceManagement.killScenario')}\x1b[0m`,
          `2. ${tc('instanceManagement.cleanupOpsMenu')} - \x1b[2m${tc('instanceManagement.cleanupScenario')}\x1b[0m`,
          `3. ${tc('instanceManagement.restartOpsMenu')} - \x1b[2m${tc('instanceManagement.restartScenario')}\x1b[0m`,
          `d. ${tc('instanceManagement.detectStatus')} - \x1b[2m${tc('instanceManagement.detectHint')}\x1b[0m`,
          `b. ${tc('instanceManagement.back')}`
        ],
        allowLetterKeys: true
      }
    }
  });

  return { action: result.value, detection: lastDetection };
}

module.exports = { showInstanceManagement };
