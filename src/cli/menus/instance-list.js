/**
 * Instance List Menu
 * Level 2 - Display all CCB instances
 * 实例列表菜单 - 二级菜单，显示所有 CCB 实例
 *
 * Modified to use i18n for internationalization support
 * 已修改为使用 i18n 支持国际化
 */

const { renderPage } = require('cli-menu-kit');
const os = require('os');
const path = require('path');
const { getInstances } = require('../../utils/instance-query');
const { updateHistory, getHistory } = require('../../services/history-service');
const { formatInstanceName } = require('../../services/display-formatter');
const { tc } = require('../../i18n');

async function showInstanceList() {
  const instances = await getInstances();

  // Update history with current instances
  updateHistory(instances);
  const historyMap = getHistory(); // Get full history map for parent lookup

  if (instances.length === 0) {
    console.log(`\n  ${tc('instanceList.noInstances')}\n`);
    console.log(`  ${tc('instanceList.pressEnter')}`);
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    return null;
  }

  const options = instances.map((inst, idx) => {
    // Map status to display format using i18n
    // 使用 i18n 映射状态显示格式
    let statusDisplay;
    if (inst.status === 'active') {
      statusDisplay = tc('instanceList.status.active');
    } else if (inst.status === 'orphaned') {
      statusDisplay = tc('instanceList.status.orphaned');
    } else if (inst.status === 'zombie') {
      statusDisplay = tc('instanceList.status.zombie');
    } else if (inst.status === 'disconnected') {
      statusDisplay = tc('instanceList.status.disconnected');
    } else {
      statusDisplay = tc('instanceList.status.dead');
    }

    // Get formatted display name using unified formatter
    const displayName = formatInstanceName(inst, historyMap, 'full');

    // Get instance hash from stateFile path (parent directory name)
    // For disconnected instances without stateFile, use workDir hash
    let shortHash;
    if (inst.stateFile) {
      const instanceHash = path.basename(path.dirname(inst.stateFile));
      shortHash = instanceHash.substring(0, 8);
    } else {
      // For disconnected instances, use PID as identifier
      shortHash = inst.pid ? `PID:${inst.pid}` : 'Unknown';
    }

    // Determine type based on work_dir using i18n
    // 使用 i18n 根据 work_dir 确定类型
    // If work_dir contains .ccb-instances, it's managed by ccb-multi
    const type = inst.workDir.includes('.ccb-instances')
      ? tc('instanceList.type.multi')
      : tc('instanceList.type.ccb');

    return `${idx + 1}. ${displayName} (${shortHash}) [${statusDisplay}] ${type}`;
  });

  // Add 'Back' option to the main menu using i18n
  // 使用 i18n 添加"返回"选项到主菜单
  options.push(`b. ${tc('instanceList.back')}`);

  const result = await renderPage({
    header: {
      type: 'section',
      text: tc('instanceList.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(`  \x1b[2m${tc('instanceList.legend')}\x1b[0m`);
      }
    },
    footer: {
      menu: {
        options: options,
        allowNumberKeys: true,
        allowLetterKeys: true
      },
      hints: [
        tc('common.hints.navigate'),
        tc('common.hints.select'),
        tc('common.hints.back')
      ]
    }
  });

  // Check if user selected 'Back' using i18n
  // 使用 i18n 检查用户是否选择了"返回"
  if (result.value === `b. ${tc('instanceList.back')}` || result.index === instances.length) {
    return null;
  }

  return instances[result.index];
}

module.exports = { showInstanceList };
