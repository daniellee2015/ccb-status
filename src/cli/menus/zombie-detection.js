/**
 * Zombie Detection Menu
 * Level 2 - Zombie detection and cleanup options
 */

const { renderPage } = require('cli-menu-kit');

async function showZombieDetection(lastDetection = null) {
  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Zombie Detection'
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (!lastDetection) {
          return;
        }

        // Show detection results
        console.log('  Status Summary:');
        console.log(`    \x1b[32m✓ Active:  ${lastDetection.active.length}\x1b[0m`);
        console.log(`    \x1b[33m⚠ Zombie:  ${lastDetection.zombies.length}\x1b[0m`);
        console.log(`    \x1b[90m✗ Dead:    ${lastDetection.dead.length}\x1b[0m`);
        console.log('');

        if (lastDetection.zombies.length === 0) {
          console.log('  \x1b[32m✓ All instances are healthy\x1b[0m');
        } else {
          console.log(`  \x1b[33m⚠ Found ${lastDetection.zombies.length} zombie process(es)\x1b[0m`);
        }
      }
    },
    footer: {
      menu: {
        options: [
          'd. Detect Status',
          'c. Cleanup Zombie Processes',
          'b. Back'
        ],
        allowLetterKeys: true
      }
    }
  });

  return result.value;
}

module.exports = { showZombieDetection };
