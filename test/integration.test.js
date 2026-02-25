#!/usr/bin/env node
/**
 * Integration Test Suite
 * Tests all critical paths and menu functions
 */

const { getInstances, getActive, getAllGrouped } = require('../src/utils/instance-query');
const { detectStatus } = require('../src/cli/menus/cleanup');

async function runTests() {
  console.log('='.repeat(60));
  console.log('CCB-Status Integration Test Suite');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: instance-query API
  try {
    console.log('Test 1: instance-query API');
    const all = await getInstances();
    const active = await getActive();
    const grouped = await getAllGrouped();

    if (!Array.isArray(all)) throw new Error('getInstances() should return array');
    if (!Array.isArray(active)) throw new Error('getActive() should return array');
    if (typeof grouped !== 'object') throw new Error('getAllGrouped() should return object');
    if (!grouped.active || !grouped.zombie) throw new Error('getAllGrouped() missing required keys');

    console.log('  ✓ All API functions return correct types');
    console.log(`  ✓ Found ${all.length} instances (${active.length} active)`);
    passed++;
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    failed++;
  }
  console.log('');

  // Test 2: detectStatus function
  try {
    console.log('Test 2: detectStatus function');
    const status = await detectStatus();

    if (typeof status !== 'object') throw new Error('detectStatus() should return object');

    const requiredKeys = ['active', 'orphaned', 'zombie', 'disconnected', 'dead'];
    for (const key of requiredKeys) {
      if (!Array.isArray(status[key])) {
        throw new Error(`detectStatus().${key} should be array, got ${typeof status[key]}`);
      }
    }

    console.log('  ✓ detectStatus() returns correct structure');
    console.log(`  ✓ Keys: ${Object.keys(status).join(', ')}`);
    passed++;
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    failed++;
  }
  console.log('');

  // Test 3: Property name consistency
  try {
    console.log('Test 3: Property name consistency');
    const grouped = await getAllGrouped();

    // Check that it's 'zombie' not 'zombies'
    if (grouped.zombies !== undefined) {
      throw new Error('Found "zombies" property - should be "zombie"');
    }
    if (grouped.zombie === undefined) {
      throw new Error('Missing "zombie" property');
    }

    console.log('  ✓ Property names are consistent (zombie, not zombies)');
    passed++;
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    failed++;
  }
  console.log('');

  // Test 4: Status resolver
  try {
    console.log('Test 4: Status resolver');
    const { resolveStatus } = require('../src/utils/status-resolver');

    const testCases = [
      {
        snapshot: { askdAlive: true, ccbAlive: true, portListening: true, hasDedicatedTmux: true },
        expected: 'active'
      },
      {
        snapshot: { askdAlive: true, ccbAlive: true, portListening: true, hasDedicatedTmux: false },
        expected: 'orphaned'
      },
      {
        snapshot: { askdAlive: true, ccbAlive: false, portListening: true, hasDedicatedTmux: false },
        expected: 'zombie'
      }
    ];

    for (const test of testCases) {
      const result = resolveStatus(test.snapshot);
      if (result !== test.expected) {
        throw new Error(`Expected ${test.expected}, got ${result}`);
      }
    }

    console.log('  ✓ Status resolver working correctly');
    passed++;
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    failed++;
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✓ All integration tests passed!');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
