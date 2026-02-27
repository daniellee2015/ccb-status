const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * File-based cache for CCB instances with TTL support
 * Target: < 5ms cache hit, 300ms max total time
 */

const CACHE_DIR = path.join(os.homedir(), '.cache', 'ccb');
const CACHE_FILE = path.join(CACHE_DIR, 'instances.json');
const DEFAULT_TTL = 2000; // 2 seconds - DO NOT CHANGE without performance testing
                          // This value is carefully balanced for freshness vs performance
                          // Achieves 0-1ms cache hit, 383ms cache miss

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get cached instances if valid (within TTL)
 * @param {number} ttl - Time to live in milliseconds (default: 2000ms)
 * @returns {Array|null} - Cached instances or null if cache miss/expired
 */
function getCachedInstances(ttl = DEFAULT_TTL) {
  try {
    const stat = fs.statSync(CACHE_FILE);
    const age = Date.now() - stat.mtimeMs;

    // Cache hit: within TTL
    if (age < ttl) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }

    // Cache expired
    return null;
  } catch (error) {
    // Cache miss: file doesn't exist or read error
    return null;
  }
}

/**
 * Set cached instances with atomic write
 * @param {Array} instances - Instances to cache
 */
function setCachedInstances(instances) {
  try {
    ensureCacheDir();

    // Atomic write: write to temp file then rename
    const tempFile = `${CACHE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(instances), 'utf8');
    fs.renameSync(tempFile, CACHE_FILE);
  } catch (error) {
    // Silently fail - cache write failure shouldn't break the system
    console.error('Failed to write cache:', error.message);
  }
}

/**
 * Clear the cache file
 */
function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error.message);
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats (exists, age, size)
 */
function getCacheStats() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return { exists: false };
    }

    const stat = fs.statSync(CACHE_FILE);
    return {
      exists: true,
      age: Date.now() - stat.mtimeMs,
      size: stat.size,
      mtime: stat.mtimeMs
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

module.exports = {
  getCachedInstances,
  setCachedInstances,
  clearCache,
  getCacheStats,
  DEFAULT_TTL
};
