/**
 * Instance Cache
 * Global cache for instance detection results to improve menu performance
 */

let cachedInstances = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3000; // 3 seconds

/**
 * Get cached instances or fetch new ones
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Array>}
 */
async function getCachedInstances(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && cachedInstances && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedInstances;
  }

  const { getInstances } = require('../utils/instance-query');
  cachedInstances = await getInstances();
  cacheTimestamp = now;

  return cachedInstances;
}

/**
 * Clear instance cache
 */
function clearInstanceCache() {
  cachedInstances = null;
  cacheTimestamp = 0;
}

/**
 * Get cache status
 * @returns {Object}
 */
function getCacheStatus() {
  const now = Date.now();
  const age = cachedInstances ? now - cacheTimestamp : null;
  const valid = cachedInstances && age < CACHE_TTL;

  return {
    cached: cachedInstances !== null,
    age,
    valid,
    ttl: CACHE_TTL
  };
}

module.exports = {
  getCachedInstances,
  clearInstanceCache,
  getCacheStatus
};
