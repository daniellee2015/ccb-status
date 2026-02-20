/**
 * Instance Details View
 * Level 3 - Display detailed information about a CCB instance
 */

const { renderPage } = require('cli-menu-kit');
const os = require('os');

async function showInstanceDetails(instance) {
  // Default status in case llmStatus is missing
  const defaultStatus = {
    claude: { active: false, session: null },
    gemini: { active: false, session: null },
    opencode: { active: false, session: null },
    codex: { active: false, session: null }
  };

  const result = await renderPage({
    header: {
      type: 'simple',
      text: `Instance: ${instance.workDir.replace(os.homedir(), '~')}`
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log('\n  Daemon Status:');
        console.log(`    Status:     ${instance.isAlive ? '\x1b[32m✓ Running\x1b[0m' : '\x1b[31m✗ Stopped\x1b[0m'}`);
        console.log(`    PID:        ${instance.pid}`);
        console.log(`    Port:       ${instance.port}`);
        console.log(`    Host:       ${instance.host}`);
        console.log(`    Uptime:     ${instance.uptime || 'Unknown'}`);
        console.log(`    Started:    ${instance.startedAt || 'Unknown'}`);
        console.log(`    Managed:    ${instance.managed ? 'Yes' : 'No'}`);
        console.log(`    Parent PID: ${instance.parentPid || 'N/A'}`);

        if (instance.tmuxPane) {
          console.log('\n  Tmux Info:');
          console.log(`    Pane ID:    ${instance.tmuxPane}`);
        }

        console.log('\n  LLM Sessions:');
        const llms = instance.llmStatus || defaultStatus;
        // Sanitize session text to remove newlines
        const formatLLM = (llm) => {
          if (!llm.active) return '\x1b[90m✗ Inactive\x1b[0m';
          return `\x1b[32m✓ Active\x1b[0m (${llm.lastActive || 'unknown'})`;
        };
        console.log(`    Claude:     ${formatLLM(llms.claude)}`);
        console.log(`    Gemini:     ${formatLLM(llms.gemini)}`);
        console.log(`    OpenCode:   ${formatLLM(llms.opencode)}`);
        console.log(`    Codex:      ${formatLLM(llms.codex)}`);

        console.log('\n  Files:');
        console.log(`    State:      ${instance.stateFile}`);
        console.log(`    Work Dir:   ${instance.workDir}`);
        console.log('');
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

module.exports = { showInstanceDetails };
