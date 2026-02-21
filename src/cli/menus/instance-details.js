/**
 * Instance Details View
 * Level 3 - Display detailed information about a CCB instance
 * 实例详情视图 - 三级菜单，显示 CCB 实例的详细信息
 *
 * Modified to use i18n for internationalization support
 * 已修改为使用 i18n 支持国际化
 */

const { renderPage } = require('cli-menu-kit');
const os = require('os');
const path = require('path');
const { tc } = require('../../i18n');

async function showInstanceDetails(instance) {
  // Default status in case llmStatus is missing
  const defaultStatus = {
    claude: { active: false, session: null },
    gemini: { active: false, session: null },
    opencode: { active: false, session: null },
    codex: { active: false, session: null }
  };

  // Format title same as list: projectName (shortHash)
  let projectName = path.basename(instance.workDir);
  if (instance.workDir.includes('.ccb-instances')) {
    const parts = instance.workDir.split(path.sep);
    const ccbIndex = parts.indexOf('.ccb-instances');
    if (ccbIndex > 0) {
      projectName = parts[ccbIndex - 1];
    }
  }
  const instanceHash = path.basename(path.dirname(instance.stateFile));
  const shortHash = instanceHash.substring(0, 8);
  const title = `${projectName} (${shortHash})`;

  const result = await renderPage({
    header: {
      type: 'simple',
      text: title
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  ${tc('instanceDetails.daemonStatus')}`);
        console.log(`    ${tc('instanceDetails.status')}     ${instance.isAlive ? `\x1b[32m${tc('instanceDetails.statusRunning')}\x1b[0m` : `\x1b[31m${tc('instanceDetails.statusStopped')}\x1b[0m`}`);
        console.log(`    ${tc('instanceDetails.pid')}        ${instance.pid}`);
        console.log(`    ${tc('instanceDetails.port')}       ${instance.port}`);
        console.log(`    ${tc('instanceDetails.host')}       ${instance.host}`);
        console.log(`    ${tc('instanceDetails.uptime')}     ${instance.uptime || tc('instanceDetails.unknown')}`);
        console.log(`    ${tc('instanceDetails.started')}    ${instance.startedAt || tc('instanceDetails.unknown')}`);
        console.log(`    ${tc('instanceDetails.managed')}    ${instance.managed ? tc('instanceDetails.yes') : tc('instanceDetails.no')}`);
        console.log(`    ${tc('instanceDetails.parentPid')} ${instance.parentPid || tc('instanceDetails.na')}`);

        if (instance.tmuxPane) {
          console.log(`\n  ${tc('instanceDetails.tmuxInfo')}`);
          if (instance.tmuxPane.id) {
            console.log(`    ${tc('instanceDetails.paneId')}    ${instance.tmuxPane.id}`);
          }
          if (instance.tmuxPane.title) {
            console.log(`    ${tc('instanceDetails.title')}      ${instance.tmuxPane.title}`);
          }
        }

        console.log(`\n  ${tc('instanceDetails.llmSessions')}`);
        const llms = instance.llmStatus || defaultStatus;
        // Sanitize session text to remove newlines
        // Format LLM status using i18n
        // 使用 i18n 格式化 LLM 状态
        const formatLLM = (llm) => {
          if (!llm.active) return `\x1b[90m${tc('instanceDetails.llmInactive')}\x1b[0m`;
          return `\x1b[32m${tc('instanceDetails.llmActive')}\x1b[0m (${llm.lastActive || tc('instanceDetails.unknown')})`;
        };
        console.log(`    ${tc('instanceDetails.claude')}     ${formatLLM(llms.claude)}`);
        console.log(`    ${tc('instanceDetails.gemini')}     ${formatLLM(llms.gemini)}`);
        console.log(`    ${tc('instanceDetails.opencode')}   ${formatLLM(llms.opencode)}`);
        console.log(`    ${tc('instanceDetails.codex')}      ${formatLLM(llms.codex)}`);

        console.log(`\n  ${tc('instanceDetails.files')}`);
        console.log(`    ${tc('instanceDetails.stateFile')}      ${instance.stateFile}`);
        console.log(`    ${tc('instanceDetails.workDir')}   ${instance.workDir}`);
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          `r. ${tc('instanceDetails.refresh')}`,
          `b. ${tc('instanceDetails.back')}`
        ],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: [
        tc('common.hints.refresh'),
        tc('common.hints.back')
      ]
    }
  });

  return result.value;
}

module.exports = { showInstanceDetails };
