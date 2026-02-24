/**
 * Confirmation Helper
 * Provides detailed confirmation display for dangerous operations
 */

const { renderTable } = require('cli-menu-kit');
const { getHistory } = require('./history-service');
const { formatInstanceName } = require('./display-formatter');
const path = require('path');

/**
 * Display detailed confirmation table before dangerous operation
 * @param {Array} instances - Array of instances to operate on
 * @param {string} warningMessage - Warning message to display
 * @param {Object} tc - Translation function
 * @param {string} columnsKey - Key for column translations (e.g., 'killActive.columns')
 * @returns {void}
 */
function displayConfirmationTable(instances, warningMessage, tc, columnsKey) {
  const historyMap = getHistory();

  console.log('');
  console.log(`  \x1b[33m⚠ ${warningMessage}\x1b[0m`);
  console.log('');

  const tableData = instances.map((inst, idx) => {
    const displayName = formatInstanceName(inst, historyMap, 'with-parent');
    let shortHash;
    if (inst.stateFile) {
      const instanceHash = path.basename(path.dirname(inst.stateFile));
      shortHash = instanceHash.substring(0, 8);
    } else {
      shortHash = inst.pid ? `PID:${inst.pid}` : 'Unknown';
    }
    const type = inst.managed ? '[Multi]' : '[CCB]';

    // Show detailed status with tmux info
    let statusDisplay = inst.status || '-';
    if (inst.tmuxPane && inst.tmuxPane.title) {
      statusDisplay = `${inst.status} ✓tmux`;
    } else if (inst.status === 'active') {
      // This shouldn't happen, but flag it if it does
      statusDisplay = `${inst.status} ⚠no-tmux`;
    }

    return {
      no: idx + 1,
      project: displayName.project,
      parent: displayName.parent,
      hash: shortHash,
      type: type,
      pid: inst.pid || '-',
      status: statusDisplay
    };
  });

  renderTable({
    columns: [
      { header: '#', key: 'no', align: 'center', width: 4 },
      { header: tc(`${columnsKey}.project`), key: 'project', align: 'left', width: 18 },
      { header: tc(`${columnsKey}.parent`), key: 'parent', align: 'left', width: 16 },
      { header: tc(`${columnsKey}.hash`), key: 'hash', align: 'left', width: 10 },
      { header: tc(`${columnsKey}.type`), key: 'type', align: 'left', width: 9 },
      { header: tc(`${columnsKey}.pid`), key: 'pid', align: 'right', width: 8 },
      { header: tc(`${columnsKey}.status`), key: 'status', align: 'left', width: 15 }
    ],
    data: tableData,
    showBorders: true,
    showHeaderSeparator: true,
    borderColor: '\x1b[33m'  // Yellow border for warning
  });

  console.log('');
  console.log(`  \x1b[2m${tc('confirmation.legend')}\x1b[0m`);
  console.log('');
}

module.exports = {
  displayConfirmationTable
};
