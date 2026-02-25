/**
 * Status Resolver
 * Pure function for determining instance status based on component availability
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for status determination
 * All status logic MUST be defined here
 * DO NOT duplicate status logic elsewhere
 */

/**
 * Status determination rule matrix
 *
 * | Status       | askd | ccb  | port | tmux session |
 * |--------------|------|------|------|--------------|
 * | Active       | ✓    | ✓    | ✓    | ✓ (1 window) |
 * | Orphaned     | ✓    | ✓    | ✓    | ✗ or >1 win  |
 * | Zombie       | ✓    | ✗    | ✓    | ?            |
 * | Disconnected | ✗    | ✓    | ✗    | ?            |
 * | Dead         | ✗    | ✗    | ✗    | ?            |
 */

/**
 * Resolve instance status based on component availability
 * Pure function - no side effects, deterministic output
 *
 * @param {Object} snapshot - Instance snapshot with component states
 * @param {boolean} snapshot.askdAlive - Is askd daemon alive
 * @param {boolean} snapshot.ccbAlive - Is ccb main process alive
 * @param {boolean} snapshot.portListening - Is port listening
 * @param {boolean} snapshot.hasDedicatedTmux - Has dedicated tmux session (attached, 1 window)
 * @returns {string} Status: 'active' | 'orphaned' | 'zombie' | 'disconnected' | 'dead'
 */
function resolveStatus(snapshot) {
  const { askdAlive, ccbAlive, portListening, hasDedicatedTmux } = snapshot;

  // Rule 1: Active - all components present
  if (askdAlive && ccbAlive && portListening && hasDedicatedTmux) {
    return 'active';
  }

  // Rule 2: Orphaned - processes alive but no dedicated tmux
  if (askdAlive && ccbAlive && portListening && !hasDedicatedTmux) {
    return 'orphaned';
  }

  // Rule 3: Zombie - askd alive, ccb dead
  if (askdAlive && !ccbAlive && portListening) {
    return 'zombie';
  }

  // Rule 4: Disconnected - askd dead, ccb alive
  if (!askdAlive && ccbAlive) {
    return 'disconnected';
  }

  // Rule 5: Dead - both processes dead
  if (!askdAlive && !ccbAlive) {
    return 'dead';
  }

  // Edge case: askd alive but port not listening
  // This can happen during startup or transient issues
  if (askdAlive && !portListening) {
    if (ccbAlive && hasDedicatedTmux) {
      // Treat as active if CCB + tmux present (startup phase)
      return 'active';
    } else if (ccbAlive) {
      // CCB alive but no tmux
      return 'orphaned';
    } else {
      // askd alive but CCB dead and port not listening
      return 'zombie';
    }
  }

  // Fallback: should not reach here if all cases are covered
  return 'dead';
}

/**
 * Validate snapshot has all required fields
 * @param {Object} snapshot - Instance snapshot
 * @returns {boolean} True if valid
 */
function isValidSnapshot(snapshot) {
  return (
    snapshot !== null &&
    typeof snapshot === 'object' &&
    typeof snapshot.askdAlive === 'boolean' &&
    typeof snapshot.ccbAlive === 'boolean' &&
    typeof snapshot.portListening === 'boolean' &&
    typeof snapshot.hasDedicatedTmux === 'boolean'
  );
}

/**
 * Resolve status with validation
 * @param {Object} snapshot - Instance snapshot
 * @returns {string} Status
 * @throws {Error} If snapshot is invalid
 */
function resolveStatusSafe(snapshot) {
  if (!isValidSnapshot(snapshot)) {
    throw new Error('Invalid snapshot: missing required fields (askdAlive, ccbAlive, portListening, hasDedicatedTmux)');
  }
  return resolveStatus(snapshot);
}

/**
 * Get human-readable explanation for status
 * @param {string} status - Instance status
 * @returns {string} Explanation
 */
function getStatusExplanation(status) {
  const explanations = {
    active: 'All components running with dedicated tmux session',
    orphaned: 'Processes running but no dedicated tmux session',
    zombie: 'askd daemon running but ccb process dead',
    disconnected: 'ccb process running but askd daemon dead',
    dead: 'All processes stopped'
  };
  return explanations[status] || 'Unknown status';
}

module.exports = {
  resolveStatus,
  resolveStatusSafe,
  isValidSnapshot,
  getStatusExplanation
};
