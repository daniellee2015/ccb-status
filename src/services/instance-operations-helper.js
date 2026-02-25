/**
 * Instance Operations Helper
 * Provides common operations for instance management menus
 */

const { renderTable, menu } = require('cli-menu-kit');
const { getHistory } = require('./history-service');
const { formatInstanceName } = require('./display-formatter');
const { displayConfirmationTable } = require('./confirmation-helper');
const path = require('path');

/**
 * Filter instances by status
 * @param {Array} instances - All instances
 * @param {string|Array} status - Status to filter by (or array of statuses)
 * @returns {Array} Filtered instances
 */
function filterInstancesByStatus(instances, status) {
  if (Array.isArray(status)) {
    return instances.filter(inst => status.includes(inst.status));
  }
  return instances.filter(inst => inst.status === status);
}

/**
 * Display instance selection table
 * @param {Array} instances - Instances to display
 * @param {Object} tc - Translation function
 * @param {string} columnsKey - Key for column translations
 * @returns {void}
 */
function displayInstanceTable(instances, tc, columnsKey) {
  const historyMap = getHistory();

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

    return {
      no: idx + 1,
      project: displayName.project,
      parent: displayName.parent,
      hash: shortHash,
      type: type,
      pid: inst.pid || '-',
      port: inst.port || '-',
      status: inst.status || '-'
    };
  });

  renderTable({
    columns: [
      { header: '#', key: 'no', align: 'center', width: 4 },
      { header: tc(`${columnsKey}.columns.project`), key: 'project', align: 'left', width: 18 },
      { header: tc(`${columnsKey}.columns.parent`), key: 'parent', align: 'left', width: 16 },
      { header: tc(`${columnsKey}.columns.hash`), key: 'hash', align: 'left', width: 10 },
      { header: tc(`${columnsKey}.columns.type`), key: 'type', align: 'left', width: 9 },
      { header: tc(`${columnsKey}.columns.pid`), key: 'pid', align: 'right', width: 8 },
      { header: tc(`${columnsKey}.columns.port`), key: 'port', align: 'right', width: 8 }
    ],
    data: tableData,
    showBorders: true,
    showHeaderSeparator: true,
    borderColor: '\x1b[2m'
  });
}

/**
 * Show checkbox menu for instance selection
 * @param {Array} instances - Instances to select from
 * @param {Object} tc - Translation function
 * @param {string} promptKey - Key for prompt translation
 * @returns {Promise<Array|null>} Selected instances or null if cancelled
 */
async function selectInstances(instances, tc, promptKey) {
  const historyMap = getHistory();

  console.log('');
  console.log(`  \x1b[33mℹ ${tc('common.hints.checkboxHelp')}\x1b[0m`);
  console.log('');

  const checkboxOptions = instances.map((inst, idx) => {
    const displayName = formatInstanceName(inst, historyMap, 'full');
    let shortHash;
    if (inst.stateFile) {
      const instanceHash = path.basename(path.dirname(inst.stateFile));
      shortHash = instanceHash.substring(0, 8);
    } else {
      shortHash = inst.pid ? `PID:${inst.pid}` : 'Unknown';
    }
    return `${idx + 1}. ${displayName} (${shortHash}) - PID ${inst.pid || 'N/A'}`;
  });

  // Add cancel option at the end
  checkboxOptions.push(`0. ${tc('common.cancel')}`);

  const checkboxResult = await menu.checkbox({
    prompt: tc(promptKey),
    options: checkboxOptions,
    minSelections: 0  // Allow 0 selections to enable cancel
  });

  // Check if user cancelled or selected nothing
  if (!checkboxResult || !checkboxResult.indices || checkboxResult.indices.length === 0) {
    return null;
  }

  // Check if user selected the cancel option (last option)
  const cancelIndex = checkboxOptions.length - 1;
  if (checkboxResult.indices.includes(cancelIndex)) {
    return null;
  }

  return checkboxResult.indices.map(idx => instances[idx]);
}

/**
 * Confirm operation with detailed instance table
 * @param {Array} instances - Instances to operate on
 * @param {Object} tc - Translation function
 * @param {string} operationKey - Key for operation translations
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
async function confirmOperation(instances, tc, operationKey) {
  // Display detailed confirmation table
  displayConfirmationTable(
    instances,
    tc(`${operationKey}.confirmationWarning`),
    tc,
    `${operationKey}.columns`
  );

  // Ask for confirmation
  const confirmResult = await menu.boolean({
    question: tc(`${operationKey}.confirmPrompt`, { count: instances.length }),
    defaultValue: false
  });

  return confirmResult === true;
}

module.exports = {
  filterInstancesByStatus,
  displayInstanceTable,
  selectInstances,
  confirmOperation
};
