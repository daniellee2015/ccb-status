/**
 * Instance Management Menu
 * Level 2 - Manage CCB instances (detect, restart, cleanup)
 */

const { renderPage } = require('cli-menu-kit');
const { tc } = require('../../i18n');

async function showInstanceManagement(lastDetection = null) {
  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('zombieDetection.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (!lastDetection) {
          console.log(`  \x1b[2m${tc('zombieDetection.detectPrompt')}\x1b[0m`);
          console.log('');
          console.log(`  \x1b[36m${tc('cleanup.scenarioGuide')}\x1b[0m`);
          console.log(`    \x1b[2m• ${tc('cleanup.zombieScenario')}\x1b[0m`);
          console.log(`    \x1b[2m• ${tc('cleanup.deadScenario')}\x1b[0m`);
          return;
        }

        // Show detection results
        console.log(`  ${tc('zombieDetection.statusSummary')}`);
        console.log(`    \x1b[32m${tc('cleanup.active', { count: lastDetection.active.length })}\x1b[0m`);
        console.log(`    \x1b[33m${tc('cleanup.zombie', { count: lastDetection.zombies.length })}\x1b[0m`);
        console.log(`    \x1b[90m${tc('cleanup.dead', { count: lastDetection.dead.length })}\x1b[0m`);
        console.log('');

        if (lastDetection.zombies.length === 0 && lastDetection.dead.length === 0) {
          console.log(`  \x1b[32m${tc('zombieDetection.allHealthy')}\x1b[0m`);
        } else {
          if (lastDetection.zombies.length > 0) {
            console.log(`  \x1b[33m${tc('zombieDetection.foundZombies', { count: lastDetection.zombies.length })}\x1b[0m`);
          }
          if (lastDetection.dead.length > 0) {
            console.log(`  \x1b[90m${tc('zombieDetection.foundDead', { count: lastDetection.dead.length })}\x1b[0m`);
          }
        }
      }
    },
    footer: {
      menu: {
        options: [
          `d. ${tc('zombieDetection.detectStatus')}`,
          `z. ${tc('cleanup.restartZombie')}`,
          `r. ${tc('cleanup.restartDead')}`,
          `c. ${tc('zombieDetection.cleanup')}`,
          `b. ${tc('zombieDetection.back')}`
        ],
        allowLetterKeys: true
      }
    }
  });

  return result.value;
}

module.exports = { showInstanceManagement };
