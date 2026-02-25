/**
 * Instance Query API
 * Single entry point for all instance queries
 *
 * CRITICAL: All menus MUST import from this file
 * DO NOT import directly from instance-service or instance-filters
 */

const { getCCBInstances } = require('../services/instance-service');
const {
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
} = require('./instance-filters');

/**
 * Get instances with optional filtering
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by single status ('active', 'orphaned', etc.)
 * @param {Array<string>} options.statuses - Filter by multiple statuses
 * @returns {Promise<Array>} Filtered instances
 */
async function getInstances(options = {}) {
  const instances = await getCCBInstances();
  const { status, statuses } = options;

  if (status) {
    return filterByStatus(instances, status);
  }
  if (statuses) {
    return instances.filter(inst => statuses.includes(inst.status));
  }
  return instances;
}

/**
 * Get active instances
 * @returns {Promise<Array>} Active instances
 */
async function getActive() {
  const instances = await getCCBInstances();
  return getActiveInstances(instances);
}

/**
 * Get orphaned instances
 * @returns {Promise<Array>} Orphaned instances
 */
async function getOrphaned() {
  const instances = await getCCBInstances();
  return getOrphanedInstances(instances);
}

/**
 * Get zombie instances
 * @returns {Promise<Array>} Zombie instances
 */
async function getZombie() {
  const instances = await getCCBInstances();
  return getZombieInstances(instances);
}

/**
 * Get disconnected instances
 * @returns {Promise<Array>} Disconnected instances
 */
async function getDisconnected() {
  const instances = await getCCBInstances();
  return getDisconnectedInstances(instances);
}

/**
 * Get dead instances
 * @returns {Promise<Array>} Dead instances
 */
async function getDead() {
  const instances = await getCCBInstances();
  return getDeadInstances(instances);
}

/**
 * Get instances that need cleanup
 * @returns {Promise<Array>} Cleanupable instances
 */
async function getCleanupable() {
  const instances = await getCCBInstances();
  return getCleanupableInstances(instances);
}

/**
 * Get instances that can be killed
 * @returns {Promise<Array>} Killable instances
 */
async function getKillable() {
  const instances = await getCCBInstances();
  return getKillableInstances(instances);
}

/**
 * Get instances that can be restarted
 * @returns {Promise<Array>} Restartable instances
 */
async function getRestartable() {
  const instances = await getCCBInstances();
  return getRestartableInstances(instances);
}

/**
 * Get instances that can be recovered
 * @returns {Promise<Array>} Recoverable instances
 */
async function getRecoverable() {
  const instances = await getCCBInstances();
  return getRecoverableInstances(instances);
}

/**
 * Get all instances grouped by status
 * @returns {Promise<Object>} { active: [], orphaned: [], zombie: [], disconnected: [], dead: [] }
 */
async function getAllGrouped() {
  const instances = await getCCBInstances();
  return groupByStatus(instances);
}

module.exports = {
  // Main query function
  getInstances,

  // Convenience functions (async versions)
  getActive,
  getOrphaned,
  getZombie,
  getDisconnected,
  getDead,
  getCleanupable,
  getKillable,
  getRestartable,
  getRecoverable,
  getAllGrouped
};
