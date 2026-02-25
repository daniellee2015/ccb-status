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

/**
 * Recover a disconnected instance
 * Steps: kill CCB daemon -> wait -> cd to work dir -> restart CCB in tmux
 * @param {object} instance - Instance object
 * @returns {object} - Result object {success, message}
 */
async function recoverDisconnected(instance) {
  try {
    const projectName = path.basename(instance.workDir);

    // Step 1: Kill CCB daemon process
    if (instance.pid) {
      try {
        process.kill(instance.pid, 'SIGTERM'); // Use SIGTERM first for graceful shutdown
        console.log(`  Sent SIGTERM to CCB daemon PID ${instance.pid}`);

        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if still alive, force kill if needed
        try {
          process.kill(instance.pid, 0); // Check if process exists
          process.kill(instance.pid, 'SIGKILL'); // Force kill
          console.log(`  Force killed CCB daemon PID ${instance.pid}`);
        } catch (e) {
          console.log(`  CCB daemon PID ${instance.pid} terminated gracefully`);
        }
      } catch (e) {
        console.log(`  CCB daemon PID ${instance.pid} already dead`);
      }
    }

    // Step 2: Wait for process cleanup
    console.log(`  Waiting for cleanup...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Get restart command
    const command = getRestartCommand(instance);

    // Step 4: Check if tmux pane exists
    if (instance.tmuxPane && tmuxPaneExists(instance.tmuxPane.id)) {
      // Pane exists, restart in existing pane
      const paneId = instance.tmuxPane.id;
      console.log(`  Using existing tmux pane ${paneId}`);

      // Clear any existing input
      execSync(`tmux send-keys -t ${paneId} C-c`, {
        encoding: 'utf8',
        timeout: 2000
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Change to work directory
      console.log(`  Changing to work directory: ${instance.workDir}`);
      execSync(`tmux send-keys -t ${paneId} "cd ${instance.workDir}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Restart CCB
      console.log(`  Restarting with command: ${command}`);
      execSync(`tmux send-keys -t ${paneId} "${command}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
    } else {
      // Pane doesn't exist, create new window
      console.log(`  Tmux pane not found, creating new window`);
      const windowName = `CCB-${projectName}`;
      execSync(`tmux new-window -n "${windowName}"`, {
        encoding: 'utf8',
        timeout: 2000
      });

      // Change to work directory
      console.log(`  Changing to work directory: ${instance.workDir}`);
      execSync(`tmux send-keys "cd ${instance.workDir}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Start CCB
      console.log(`  Starting with command: ${command}`);
      execSync(`tmux send-keys "${command}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
    }

    // Step 5: Wait for CCB to start
    console.log(`  Waiting for CCB to start...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      message: 'Recovered successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Recover an orphaned instance
 * Orphaned = CCB process running but tmux session detached
 * Steps: Find or create tmux window -> attach to session
 * @param {object} instance - Instance object
 * @returns {object} - Result object {success, message}
 */
async function recoverOrphaned(instance) {
  try {
    const projectName = path.basename(instance.workDir);

    // Step 1: Find detached tmux sessions with CCB panes for this work directory
    let detachedPanes = [];
    try {
      const result = execSync('tmux list-panes -a -F "#{session_attached}\\\\\\\\t#{pane_id}\\\\\\\\t#{pane_current_path}\\\\\\\\t#{pane_title}\\\\\\\\t#{session_name}"', {
        encoding: 'utf8',
        timeout: 2000
      });

      for (const line of result.split('\n')) {
        if (!line) continue;
        const parts = line.split('\\t');
        if (parts.length >= 5) {
          const sessionAttached = parts[0];
          const paneId = parts[1];
          const panePath = parts[2];
          const paneTitle = parts[3];
          const sessionName = parts[4];

          // Check if this is a detached CCB pane for our work directory
          const isCCBPane = paneTitle.includes('Ready') || paneTitle.includes('CCB-') || paneTitle.includes('OpenCode') || paneTitle.includes('Gemini');
          if (sessionAttached === '0' && isCCBPane && panePath === instance.workDir) {
            detachedPanes.push({ paneId, sessionName, paneTitle });
          }
        }
      }
    } catch (e) {
      console.log(`  Warning: Could not list tmux panes: ${e.message}`);
    }

    // Step 2: If found detached panes, attach to the session
    if (detachedPanes.length > 0) {
      const pane = detachedPanes[0]; // Use the first one
      console.log(`  Found detached CCB pane ${pane.paneId} in session ${pane.sessionName}`);
      console.log(`  To reconnect, run: tmux attach -t ${pane.sessionName}`);

      return {
        success: true,
        message: `Found detached session ${pane.sessionName}. Run: tmux attach -t ${pane.sessionName}`
      };
    }

    // Step 3: No detached panes found, create new window
    console.log(`  No detached CCB panes found, creating new window`);
    const windowName = `CCB-${projectName}`;

    try {
      execSync(`tmux new-window -n \"${windowName}\"`, {
        encoding: 'utf8',
        timeout: 2000
      });
      console.log(`  Created new tmux window: ${windowName}`);
    } catch (e) {
      return {
        success: false,
        message: `Failed to create tmux window: ${e.message}`
      };
    }

    // Step 4: Change to work directory
    console.log(`  Changing to work directory: ${instance.workDir}`);
    execSync(`tmux send-keys \"cd ${instance.workDir}\" Enter`, {
      encoding: 'utf8',
      timeout: 2000
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 5: Attach to the running CCB process
    // Since the process is already running, we just need to provide a shell
    // The user can manually check the running CCB with `ps` or use ccb commands
    console.log(`  CCB process (PID ${instance.pid}) is already running`);
    console.log(`  You can interact with it using ccb commands in this window`);

    return {
      success: true,
      message: `Created new window. CCB process (PID ${instance.pid}) is already running.`
    };
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
  restartDead,
  recoverDisconnected,
  recoverOrphaned
};
