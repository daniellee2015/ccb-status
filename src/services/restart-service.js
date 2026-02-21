/**
 * Restart Service
 * Handles CCB instance restart operations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Get active LLMs by checking session files
 * Priority: askd.json > active sessions > ccb.config
 * @param {string} workDir - Work directory
 * @param {object} instanceData - Instance data from askd.json (optional)
 * @returns {string|null} - Comma-separated LLM list or null
 */
function getActiveLLMs(workDir, instanceData = null) {
  // Priority 1: Check if askd.json has llm_providers field
  if (instanceData && instanceData.llm_providers) {
    return instanceData.llm_providers.join(',');
  }

  // Priority 2: Check active session files
  const ccbDir = path.join(workDir, '.ccb');
  if (!fs.existsSync(ccbDir)) {
    return null;
  }

  const sessionFiles = {
    'claude': '.claude-session',
    'gemini': '.gemini-session',
    'codex': '.codex-session',
    'opencode': '.opencode-session'
  };

  const activeLLMs = [];

  for (const [llm, filename] of Object.entries(sessionFiles)) {
    const filePath = path.join(ccbDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        // If file has content, consider this LLM active
        if (content) {
          activeLLMs.push(llm);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  if (activeLLMs.length > 0) {
    return activeLLMs.join(',');
  }

  // Priority 3: Check ccb.config file
  const configFile = path.join(ccbDir, 'ccb.config');
  if (fs.existsSync(configFile)) {
    try {
      return fs.readFileSync(configFile, 'utf8').trim();
    } catch (e) {
      // Ignore errors
    }
  }

  // Priority 4: Return null (will use default 'ccb' command)
  return null;
}

/**
 * Get restart command for an instance
 * @param {object} instance - Instance object
 * @returns {string} - Restart command
 */
function getRestartCommand(instance) {
  const llmConfig = getActiveLLMs(instance.workDir, instance);
  return llmConfig ? `ccb ${llmConfig}` : 'ccb';
}

/**
 * Check if tmux pane exists
 * @param {string} paneId - Tmux pane ID
 * @returns {boolean} - True if pane exists
 */
function tmuxPaneExists(paneId) {
  if (!paneId) return false;
  try {
    execSync(`tmux list-panes -a -F "#{pane_id}" | grep -q "^${paneId}$"`, {
      encoding: 'utf8',
      timeout: 2000
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Restart a zombie instance
 * Steps: kill daemon -> exit CCB -> restart CCB
 * @param {object} instance - Instance object
 * @returns {object} - Result object {success, message}
 */
async function restartZombie(instance) {
  try {
    const projectName = path.basename(instance.workDir);
    
    // Step 1: Kill askd daemon process
    if (instance.pid) {
      try {
        process.kill(instance.pid, 'SIGKILL');
        console.log(`  Killed daemon PID ${instance.pid}`);
      } catch (e) {
        // Process might already be dead
        console.log(`  Daemon PID ${instance.pid} already dead`);
      }
    }

    // Step 2: Check if tmux pane exists
    if (!instance.tmuxPane || !tmuxPaneExists(instance.tmuxPane.id)) {
      return {
        success: false,
        message: 'Tmux pane not found'
      };
    }

    const paneId = instance.tmuxPane.id;

    // Step 3: Send Ctrl+C to exit CCB
    execSync(`tmux send-keys -t ${paneId} C-c`, {
      encoding: 'utf8',
      timeout: 2000
    });
    console.log(`  Sent Ctrl+C to pane ${paneId}`);

    // Step 4: Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Restart CCB with correct command
    const command = getRestartCommand(instance);
    execSync(`tmux send-keys -t ${paneId} "${command}" Enter`, {
      encoding: 'utf8',
      timeout: 2000
    });
    console.log(`  Restarted with command: ${command}`);

    return {
      success: true,
      message: 'Restarted successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Restart a dead instance
 * Steps: restart CCB in tmux (or create new tmux window)
 * @param {object} instance - Instance object
 * @returns {object} - Result object {success, message}
 */
async function restartDead(instance) {
  try {
    const projectName = path.basename(instance.workDir);
    const command = getRestartCommand(instance);

    // Check if tmux pane exists
    if (instance.tmuxPane && tmuxPaneExists(instance.tmuxPane.id)) {
      // Pane exists, just send command
      const paneId = instance.tmuxPane.id;
      execSync(`tmux send-keys -t ${paneId} "${command}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
      console.log(`  Restarted in existing pane ${paneId}`);

      return {
        success: true,
        message: 'Restarted in existing tmux pane'
      };
    } else {
      // Pane doesn't exist, create new window
      const windowName = `CCB-${projectName}`;
      execSync(`tmux new-window -n "${windowName}"`, {
        encoding: 'utf8',
        timeout: 2000
      });
      
      // Change to work directory
      execSync(`tmux send-keys "cd ${instance.workDir}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Start CCB
      execSync(`tmux send-keys "${command}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
      console.log(`  Created new window and started CCB`);

      return {
        success: true,
        message: 'Created new tmux window and restarted'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  getActiveLLMs,
  getRestartCommand,
  tmuxPaneExists,
  restartZombie,
  restartDead
};
