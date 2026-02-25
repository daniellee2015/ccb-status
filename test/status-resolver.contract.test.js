/**
 * Contract Tests for Status Resolver
 * Ensures status determination matches the documented rule matrix
 */

const { resolveStatus } = require('../src/utils/status-resolver');

/**
 * Test suite for status resolver contract
 */
function runContractTests() {
  const tests = [
    // Active: all components present
    {
      name: 'Active - all components present',
      snapshot: {
        askdAlive: true,
        ccbAlive: true,
        portListening: true,
        hasDedicatedTmux: true
      },
      expected: 'active'
    },

    // Orphaned: processes alive but no dedicated tmux
    {
      name: 'Orphaned - no dedicated tmux',
      snapshot: {
        askdAlive: true,
        ccbAlive: true,
        portListening: true,
        hasDedicatedTmux: false
      },
      expected: 'orphaned'
    },

    // Zombie: askd alive, ccb dead
    {
      name: 'Zombie - askd alive, ccb dead',
      snapshot: {
        askdAlive: true,
        ccbAlive: false,
        portListening: true,
        hasDedicatedTmux: false
      },
      expected: 'zombie'
    },

    // Disconnected: askd dead, ccb alive
    {
      name: 'Disconnected - askd dead, ccb alive',
      snapshot: {
        askdAlive: false,
        ccbAlive: true,
        portListening: false,
        hasDedicatedTmux: false
      },
      expected: 'disconnected'
    },

    // Dead: both processes dead
    {
      name: 'Dead - both processes dead',
      snapshot: {
        askdAlive: false,
        ccbAlive: false,
        portListening: false,
        hasDedicatedTmux: false
      },
      expected: 'dead'
    },

    // Edge case: askd alive but port not listening, ccb + tmux present
    {
      name: 'Active (startup) - port not listening yet',
      snapshot: {
        askdAlive: true,
        ccbAlive: true,
        portListening: false,
        hasDedicatedTmux: true
      },
      expected: 'active'
    },

    // Edge case: askd alive but port not listening, ccb alive, no tmux
    {
      name: 'Orphaned - port not listening, no tmux',
      snapshot: {
        askdAlive: true,
        ccbAlive: true,
        portListening: false,
        hasDedicatedTmux: false
      },
      expected: 'orphaned'
    },

    // Edge case: askd alive but port not listening, ccb dead
    {
      name: 'Zombie - port not listening, ccb dead',
      snapshot: {
        askdAlive: true,
        ccbAlive: false,
        portListening: false,
        hasDedicatedTmux: false
      },
      expected: 'zombie'
    }
  ];

  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log('Running Status Resolver Contract Tests...\n');

  tests.forEach((test, index) => {
    const actual = resolveStatus(test.snapshot);
    const success = actual === test.expected;

    if (success) {
      passed++;
      console.log(`✓ Test ${index + 1}: ${test.name}`);
    } else {
      failed++;
      console.log(`✗ Test ${index + 1}: ${test.name}`);
      console.log(`  Expected: ${test.expected}, Got: ${actual}`);
      failures.push({
        name: test.name,
        expected: test.expected,
        actual: actual,
        snapshot: test.snapshot
      });
    }
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\nFailed Tests:');
    failures.forEach(f => {
      console.log(`\n- ${f.name}`);
      console.log(`  Expected: ${f.expected}`);
      console.log(`  Actual: ${f.actual}`);
      console.log(`  Snapshot:`, JSON.stringify(f.snapshot, null, 2));
    });
    process.exit(1);
  } else {
    console.log('\n✓ All contract tests passed!');
    process.exit(0);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runContractTests();
}

module.exports = { runContractTests };
