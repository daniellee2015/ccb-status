/**
 * Instance Filter Utilities
 * Centralized filtering logic for CCB instances
 *
 * CRITICAL: All menus MUST use these functions for filtering
 * DO NOT duplicate filtering logic in menu files
 */

/**
 * Filter instances by status
 * @param {Array} instances - Array of instance objects from getCCBInstances()
 * @param {string} status - Status to filter by: 'active', 'orphaned', 'zombie', 'disconnected', 'dead'
 * @returns {Array} Filtered instances
 */
function filterByStatus(instances, status) {
  return instances.filter(inst => inst.status === status);
}

/**
 * Get active instances
 * Active = askd alive + ccb alive + port listening + tmux session (attached, 1 window)
 */
function getActiveInstances(instances) {
  return filterByStatus(instances, 'active');
}

/**
 * Get orphaned instances
 * Orphaned = askd alive + ccb alive + port listening + no dedicated tmux session
 */
function getOrphanedInstances(instances) {
  return filterByStatus(instances, 'orphaned');
}

/**
 * Get zombie instances
 * Zombie = askd alive + ccb dead + port listening
 */
function getZombieInstances(instances) {
  return filterByStatus(instances, 'zombie');
}

/**
 * Get disconnected instances
 * Disconnected = askd dead + ccb alive
 */
function getDisconnectedInstances(instances) {
  return filterByStatus(instances, 'disconnected');
}

/**
 * Get dead instances
 * Dead = askd dead + ccb dead
 */
function getDeadInstances(instances) {
  return filterByStatus(instances, 'dead');
}

/**
 * Get instances that need cleanup (zombie + disconnected + dead)
 */
function getCleanupableInstances(instances) {
  return instances.filter(inst =>
    inst.status === 'zombie' ||
    inst.status === 'disconnected' ||
    inst.status === 'dead'
  );
}

/**
 * Get instances that can be killed (active + orphaned + zombie + disconnected)
 */
function getKillableInstances(instances) {
  return instances.filter(inst => inst.status !== 'dead');
}

/**
 * Get instances that can be restarted (dead)
 */
function getRestartableInstances(instances) {
  return filterByStatus(instances, 'dead');
}

/**
 * Get instances that can be recovered (orphaned + disconnected)
 */
function getRecoverableInstances(instances) {
  return instances.filter(inst =>
    inst.status === 'orphaned' ||
    inst.status === 'disconnected'
  );
}

/**
 * Group instances by status
 * @returns {Object} { active: [], orphaned: [], zombie: [], disconnected: [], dead: [] }
 */
function groupByStatus(instances) {
  return {
    active: getActiveInstances(instances),
    orphaned: getOrphanedInstances(instances),
    zombie: getZombieInstances(instances),
    disconnected: getDisconnectedInstances(instances),
    dead: getDeadInstances(instances)
  };
}

module.exports = {
  filterByStatus,
  getActiveInstances,
  getOrphanedInstances,
  getZombieInstances,
  getDisconnectedInstances,
  getDeadInstances,
  getCleanupableInstances,
  getKillableInstances,
  getRestartableInstances,
  getRecoverableInstances,
  groupByStatus
};
