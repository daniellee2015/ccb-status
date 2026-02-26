/**
 * Restart Service
 * Handles CCB instance restart operations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Verify that restart/recover operation succeeded
 * @param {string} workDir - Work directory
 * @param {number} maxWaitMs - Maximum wait time in milliseconds
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function verifyRestartSuccess(workDir, maxWaitMs = 10000) {
  const startTime = Date.now();
  const cacheDir = path.join(os.homedir(), '.cache', 'ccb', 'projects');

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Check if state file exists
      const projectDirs = fs.readdirSync(cacheDir);
      for (const projectDir of projectDirs) {
        const stateFile = path.join(cacheDir, projectDir, 'askd.json');
        if (fs.existsSync(stateFile)) {
          const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          if (data.work_dir === workDir) {
            // State file exists, check if port is listening
            const port = data.port || 0;
            const host = data.host || '127.0.0.1';

            // Simple port check
            const net = require('net');
            const portListening = await new Promise((resolve) => {
              const socket = new net.Socket();
              socket.setTimeout(100);
              socket.on('connect', () => {
                socket.destroy();
                resolve(true);
              });
              socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
              });
              socket.on('error', () => {
                resolve(false);
              });
              socket.connect(port, host);
            });

            if (portListening) {
              return {
                success: true,
                message: `Verified: state file exists and port ${port} is listening`
              };
            }
          }
        }
      }
    } catch (e) {
      // Continue waiting
    }

    // Wait 500ms before next check
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    success: false,
    message: `Verification timeout: no active state file found after ${maxWaitMs}ms`
  };
}

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

    // Step 1: Kill askd daemon process (zombie = askd running but CCB not running)
    const askdPid = instance.askdPid || instance.pid;
    if (askdPid) {
      try {
        process.kill(askdPid, 'SIGKILL');
        console.log(`  Killed daemon PID ${askdPid}`);
      } catch (e) {
        // Process might already be dead
        console.log(`  Daemon PID ${askdPid} already dead`);
      }
    }

    // Step 2: Check if tmux pane exists
    if (!instance.tmuxPane || !tmuxPaneExists(instance.tmuxPane.id)) {
      // Pane doesn't exist, create new window (fallback)
      console.log(`  Tmux pane not found, creating new window`);
      const windowName = `CCB-${projectName}`;
      execSync(`tmux new-window -n "${windowName}"`, {
        encoding: 'utf8',
        timeout: 2000
      });

      // Get the new pane ID
      const newPaneId = execSync(`tmux display-message -p '#{pane_id}'`, {
        encoding: 'utf8',
        timeout: 2000
      }).trim();

      // Change to work directory
      execSync(`tmux send-keys -t ${newPaneId} "cd ${instance.workDir}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Restart CCB with correct command
      const command = getRestartCommand(instance);
      execSync(`tmux send-keys -t ${newPaneId} "${command}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
      console.log(`  Created new window and restarted with command: ${command}`);

      // Verify restart success
      console.log(`  Verifying restart...`);
      const verification = await verifyRestartSuccess(instance.workDir, 10000);
      if (!verification.success) {
        return {
          success: false,
          message: `Restart command sent but verification failed: ${verification.message}`
        };
      }
      console.log(`  ${verification.message}`);

      return {
        success: true,
        message: 'Created new window and restarted successfully'
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

    // Step 6: Verify restart success
    console.log(`  Verifying restart...`);
    const verification = await verifyRestartSuccess(instance.workDir, 10000);
    if (!verification.success) {
      return {
        success: false,
        message: `Restart command sent but verification failed: ${verification.message}`
      };
    }
    console.log(`  ${verification.message}`);

    return {
      success: true,
      message: 'Restarted and verified successfully'
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

    // Check if tmux pane exists AND is a CCB pane (not a regular shell)
    if (instance.tmuxPane && tmuxPaneExists(instance.tmuxPane.id)) {
      const paneId = instance.tmuxPane.id;
      const paneTitle = instance.tmuxPane.title || '';

      // Only reuse pane if it's clearly a CCB pane (has CCB-related title)
      const isCCBPane = paneTitle.includes('Ready') ||
                        paneTitle.includes('CCB-') ||
                        paneTitle.includes('OpenCode') ||
                        paneTitle.includes('Gemini') ||
                        paneTitle.includes('Codex');

      if (isCCBPane) {
        // This is a CCB pane, safe to reuse
        execSync(`tmux send-keys -t ${paneId} "${command}" Enter`, {
          encoding: 'utf8',
          timeout: 2000
        });
        console.log(`  Restarted in existing CCB pane ${paneId}`);

        // Verify restart success
        console.log(`  Verifying restart...`);
        const verification = await verifyRestartSuccess(instance.workDir, 10000);
        if (!verification.success) {
          return {
            success: false,
            message: `Restart command sent but verification failed: ${verification.message}`
          };
        }
        console.log(`  ${verification.message}`);

        return {
          success: true,
          message: 'Restarted in existing tmux pane successfully'
        };
      }
    }

    // Pane doesn't exist or is not a CCB pane, create new window
    const windowName = `CCB-${projectName}`;
    execSync(`tmux new-window -n "${windowName}"`, {
      encoding: 'utf8',
      timeout: 2000
    });

    // Get the new pane ID
    const newPaneId = execSync(`tmux display-message -p '#{pane_id}'`, {
      encoding: 'utf8',
      timeout: 2000
    }).trim();

    // Change to work directory with explicit target
    execSync(`tmux send-keys -t ${newPaneId} "cd ${instance.workDir}" Enter`, {
      encoding: 'utf8',
      timeout: 2000
    });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start CCB with explicit target
    execSync(`tmux send-keys -t ${newPaneId} "${command}" Enter`, {
      encoding: 'utf8',
      timeout: 2000
    });
    console.log(`  Created new window and started CCB`);

    // Verify restart success
    console.log(`  Verifying restart...`);
    const verification = await verifyRestartSuccess(instance.workDir, 10000);
    if (!verification.success) {
      return {
        success: false,
        message: `Restart command sent but verification failed: ${verification.message}`
      };
    }
    console.log(`  ${verification.message}`);

    return {
      success: true,
      message: 'Created new tmux window and restarted successfully'
    };
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

    // Step 1: Kill CCB process (disconnected = CCB alive but askd dead)
    const ccbPid = instance.ccbPid || instance.pid;
    if (ccbPid) {
      try {
        process.kill(ccbPid, 'SIGTERM'); // Use SIGTERM first for graceful shutdown
        console.log(`  Sent SIGTERM to CCB process PID ${ccbPid}`);

        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if still alive, force kill if needed
        try {
          process.kill(ccbPid, 0); // Check if process exists
          process.kill(ccbPid, 'SIGKILL'); // Force kill
          console.log(`  Force killed CCB process PID ${ccbPid}`);
        } catch (e) {
          console.log(`  CCB process PID ${ccbPid} terminated gracefully`);
        }
      } catch (e) {
        console.log(`  CCB process PID ${ccbPid} already dead`);
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
      // Pane doesn't exist, create new dedicated session
      console.log(`  Tmux pane not found, creating new dedicated session`);
      const windowName = `CCB-${projectName}`;
      const sessionName = `CCB-${projectName}`;

      // Create new detached session with single window
      execSync(`tmux new-session -d -s "${sessionName}" -n "${windowName}"`, {
        encoding: 'utf8',
        timeout: 2000
      });

      console.log(`  Created new session: ${sessionName}`);
      console.log(`  To attach to this session, run: tmux attach -t ${sessionName}`);

      // Get the pane ID from the new session
      const newPaneId = execSync(`tmux list-panes -t "${sessionName}" -F '#{pane_id}'`, {
        encoding: 'utf8',
        timeout: 2000
      }).trim();

      // Change to work directory with explicit target
      console.log(`  Changing to work directory: ${instance.workDir}`);
      execSync(`tmux send-keys -t ${newPaneId} "cd ${instance.workDir}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Start CCB with explicit target
      console.log(`  Starting with command: ${command}`);
      execSync(`tmux send-keys -t ${newPaneId} "${command}" Enter`, {
        encoding: 'utf8',
        timeout: 2000
      });
    }

    // Step 5: Verify recovery success
    console.log(`  Verifying recovery...`);
    const verification = await verifyRestartSuccess(instance.workDir, 15000);
    if (!verification.success) {
      return {
        success: false,
        message: `Recovery command sent but verification failed: ${verification.message}`
      };
    }
    console.log(`  ${verification.message}`);

    return {
      success: true,
      message: 'Recovered and verified successfully'
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
 * Orphaned = CCB process running but no tmux pane
 * Steps: Kill processes → Create new tmux session → Restart CCB
 * @param {object} instance - Instance object
 * @returns {object} - Result object {success, message}
 */

async function recoverOrphaned(instance) {
  try {
    const projectName = path.basename(instance.workDir);

    // Step 1: Kill both askd and ccb processes
    console.log(`  Killing orphaned processes...`);
    const pidsToKill = [];
    if (instance.askdPid) pidsToKill.push(instance.askdPid);
    if (instance.ccbPid) pidsToKill.push(instance.ccbPid);

    for (const pid of pidsToKill) {
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`  Sent SIGTERM to PID ${pid}`);
      } catch (e) {
        console.log(`  PID ${pid} already dead`);
      }
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Create new tmux session
    const sessionName = `CCB-${projectName}`;
    const windowName = `CCB-${projectName}`;

    console.log(`  Creating new tmux session: ${sessionName}`);
    try {
      // Try to create new session
      execSync(`tmux new-session -d -s "${sessionName}" -n "${windowName}"`, {
        encoding: 'utf8',
        timeout: 2000
      });
    } catch (e) {
      // Session might already exist, that's ok
      console.log(`  Session ${sessionName} already exists, using it`);
    }

    // Get the pane ID
    const paneId = execSync(`tmux list-panes -t "${sessionName}" -F '#{pane_id}'`, {
      encoding: 'utf8',
      timeout: 2000
    }).trim().split('\n')[0]; // Get first pane

    // Step 3: Change to work directory
    console.log(`  Changing to work directory: ${instance.workDir}`);
    execSync(`tmux send-keys -t ${paneId} "cd '${instance.workDir}'" Enter`, {
      encoding: 'utf8',
      timeout: 2000
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 4: Restart CCB with the same command
    const command = getRestartCommand(instance);
    console.log(`  Starting CCB: ${command}`);
    execSync(`tmux send-keys -t ${paneId} "${command}" Enter`, {
      encoding: 'utf8',
      timeout: 2000
    });

    // Step 5: Verify recovery
    console.log(`  Verifying recovery...`);
    const result = await verifyRestartSuccess(instance.workDir, 10000);

    if (result.success) {
      console.log(`  ✓ Recovered successfully`);
      console.log(`  To attach to session: tmux attach -t ${sessionName}`);
      return {
        success: true,
        message: `Recovered successfully. Attach with: tmux attach -t ${sessionName}`
      };
    } else {
      return {
        success: false,
        message: `Recovery started but verification failed: ${result.message}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Recovery failed: ${error.message}`
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
