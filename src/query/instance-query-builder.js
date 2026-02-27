/**
 * Query Builder for CCB Instances
 * Provides fluent API for querying and filtering CCB instances
 */

const { getCachedInstances } = require('../cache/instance-cache');

class InstanceQueryBuilder {
  constructor() {
    this.conditions = {
      statuses: null,
      hasTmux: null,
      isAlive: null,
      workDirs: null,
      pids: null,
      sessionNames: null
    };
  }

  /**
   * Filter by status
   * @param {...string} statuses - Status values ('active', 'orphaned', 'zombie', 'disconnected', 'dead')
   * @returns {InstanceQueryBuilder}
   */
  whereStatus(...statuses) {
    this.conditions.statuses = statuses;
    return this;
  }

  /**
   * Filter by tmux presence
   * @param {boolean} hasTmux - Whether instance has tmux
   * @returns {InstanceQueryBuilder}
   */
  whereTmux(hasTmux) {
    this.conditions.hasTmux = hasTmux;
    return this;
  }

  /**
   * Filter by alive status
   * @param {boolean} isAlive - Whether instance is alive
   * @returns {InstanceQueryBuilder}
   */
  whereAlive(isAlive) {
    this.conditions.isAlive = isAlive;
    return this;
  }

  /**
   * Filter by work directories
   * @param {...string} workDirs - Work directory paths
   * @returns {InstanceQueryBuilder}
   */
  whereWorkDir(...workDirs) {
    this.conditions.workDirs = workDirs;
    return this;
  }

  /**
   * Filter by PIDs
   * @param {...number} pids - Process IDs
   * @returns {InstanceQueryBuilder}
   */
  wherePid(...pids) {
    this.conditions.pids = pids;
    return this;
  }

  /**
   * Filter by tmux session names
   * @param {...string} sessionNames - Tmux session names
   * @returns {InstanceQueryBuilder}
   */
  whereSession(...sessionNames) {
    this.conditions.sessionNames = sessionNames;
    return this;
  }

  /**
   * Execute query and return filtered instances
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<CCBInstance[]>}
   */
  async execute(forceRefresh = false) {
    const instances = await getCachedInstances(forceRefresh);
    return this._applyFilters(instances);
  }

  /**
   * Execute query and return first matching instance
   * @returns {Promise<CCBInstance|null>}
   */
  async first() {
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute query and return count
   * @returns {Promise<number>}
   */
  async count() {
    const results = await this.execute();
    return results.length;
  }

  /**
   * Apply filters to instances
   * @private
   * @param {CCBInstance[]} instances
   * @returns {CCBInstance[]}
   */
  _applyFilters(instances) {
    let filtered = instances;

    if (this.conditions.statuses) {
      filtered = filtered.filter(i => this.conditions.statuses.includes(i.status));
    }

    if (this.conditions.hasTmux !== null) {
      filtered = filtered.filter(i => (i.tmuxPane !== null) === this.conditions.hasTmux);
    }

    if (this.conditions.isAlive !== null) {
      filtered = filtered.filter(i => i.isAlive === this.conditions.isAlive);
    }

    if (this.conditions.workDirs) {
      filtered = filtered.filter(i => this.conditions.workDirs.includes(i.workDir));
    }

    if (this.conditions.pids) {
      filtered = filtered.filter(i =>
        this.conditions.pids.includes(i.pid) ||
        this.conditions.pids.includes(i.askdPid) ||
        this.conditions.pids.includes(i.ccbPid)
      );
    }

    if (this.conditions.sessionNames) {
      filtered = filtered.filter(i =>
        i.tmuxPane && this.conditions.sessionNames.includes(i.tmuxPane.session)
      );
    }

    return filtered;
  }
}

/**
 * Create a new query builder
 * @returns {InstanceQueryBuilder}
 */
function query() {
  return new InstanceQueryBuilder();
}

/**
 * Common query shortcuts
 */
const queries = {
  /**
   * Get all active instances
   * @returns {Promise<CCBInstance[]>}
   */
  active: () => query().whereStatus('active').execute(),

  /**
   * Get all orphaned instances
   * @returns {Promise<CCBInstance[]>}
   */
  orphaned: () => query().whereStatus('orphaned').execute(),

  /**
   * Get all instances with tmux
   * @returns {Promise<CCBInstance[]>}
   */
  withTmux: () => query().whereTmux(true).execute(),

  /**
   * Get all instances without tmux
   * @returns {Promise<CCBInstance[]>}
   */
  withoutTmux: () => query().whereTmux(false).execute(),

  /**
   * Get instance by work directory
   * @param {string} workDir
   * @returns {Promise<CCBInstance|null>}
   */
  byWorkDir: (workDir) => query().whereWorkDir(workDir).first(),

  /**
   * Get instance by PID
   * @param {number} pid
   * @returns {Promise<CCBInstance|null>}
   */
  byPid: (pid) => query().wherePid(pid).first(),

  /**
   * Get instances in tmux session
   * @param {string} sessionName
   * @returns {Promise<CCBInstance[]>}
   */
  inSession: (sessionName) => query().whereSession(sessionName).execute()
};

module.exports = {
  query,
  queries,
  InstanceQueryBuilder
};
