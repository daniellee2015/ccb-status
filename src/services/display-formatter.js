/**
 * Instance Display Formatter
 * Provides unified formatting for instance display across all views
 */

const path = require('path');

/**
 * Format instance display name
 * @param {Object} instance - Instance object with workDir
 * @param {Object} historyMap - History map for parent lookup
 * @param {string} format - Display format: 'short', 'full', 'with-parent'
 * @returns {string} Formatted display name
 */
function formatInstanceName(instance, historyMap = null, format = 'short') {
  const projectName = path.basename(instance.workDir);
  const parentProject = getParentProjectName(instance.workDir, historyMap);

  switch (format) {
    case 'short':
      // Just the project name
      return projectName;

    case 'full':
      // Project name with parent in parentheses if available
      return parentProject ? `${projectName} (${parentProject})` : projectName;

    case 'with-parent':
      // Returns object with separate project and parent fields
      return {
        project: projectName,
        parent: parentProject || '-'
      };

    default:
      return projectName;
  }
}

/**
 * Get parent project name for a managed instance
 * @param {string} workDir - The work directory path
 * @param {Object} historyMap - Map of all history records by hash
 * @returns {string|null} Parent project name or null if not a managed instance
 */
function getParentProjectName(workDir, historyMap = null) {
  const projectName = path.basename(workDir);

  // Check if this is a managed instance (inst-<hash>-<number>)
  const managedPattern = /^inst-([a-f0-9]{8})-\d+$/;
  const match = projectName.match(managedPattern);

  if (!match) {
    // Not a managed instance
    return null;
  }

  // Extract parent hash prefix
  const parentHashPrefix = match[1];

  // Try to find parent project
  if (historyMap) {
    // Search in history for matching parent hash
    for (const [hash, record] of Object.entries(historyMap)) {
      if (hash.startsWith(parentHashPrefix) && !record.workDir.includes('.ccb-instances')) {
        return path.basename(record.workDir);
      }
    }
  }

  // Fallback: show hash prefix if parent not found
  return `[${parentHashPrefix}]`;
}

/**
 * Clean tmux pane title for display
 * Remove decorative symbols and keep meaningful text
 * @param {string} title - Raw tmux pane title
 * @returns {string} Cleaned title
 */
function cleanTmuxTitle(title) {
  if (!title) return '-';

  // Remove common decorative symbols at the start
  let cleaned = title.replace(/^[✳⠐◇⚡★☆●○◆◇▪▫■□▲△▼▽►◄]+\s*/, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  // If empty after cleaning, return original
  if (!cleaned) return title;

  return cleaned;
}

/**
 * Format tmux display for instance
 * Provides meaningful tmux information
 * @param {Object} instance - Instance object with tmuxPane
 * @returns {string} Formatted tmux display
 */
function formatTmuxDisplay(instance) {
  if (!instance.tmuxPane || !instance.tmuxPane.title) {
    return '-';
  }

  const cleaned = cleanTmuxTitle(instance.tmuxPane.title);

  // Truncate if too long
  if (cleaned.length > 20) {
    return cleaned.substring(0, 17) + '...';
  }

  return cleaned;
}

module.exports = {
  formatInstanceName,
  getParentProjectName,
  cleanTmuxTitle,
  formatTmuxDisplay
};
