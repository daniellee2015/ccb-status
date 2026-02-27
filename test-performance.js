#!/usr/bin/env node

/**
 * Performance test for ccb-status
 * Measures cache hit and cache miss performance
 */

const { getCCBInstances } = require('./src/services/instance-service');
const { clearCache, getCacheStats } = require('./src/cache/file-cache');

async function measurePerformance(label, fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  console.log(`${label}: ${duration}ms`);
  return { duration, result };
}

async function runTests() {
  console.log('=== CCB Status Performance Test ===\n');

  // Test 1: Cache miss (first call)
  console.log('Test 1: Cache miss (first call)');
  clearCache();
  const test1 = await measurePerformance('  Duration', getCCBInstances);
  console.log(`  Instances found: ${test1.result.length}`);
  console.log();

  // Test 2: Cache hit (second call)
  console.log('Test 2: Cache hit (immediate second call)');
  const test2 = await measurePerformance('  Duration', getCCBInstances);
  console.log(`  Instances found: ${test2.result.length}`);
  const cacheStats = getCacheStats();
  console.log(`  Cache age: ${cacheStats.age}ms`);
  console.log();

  // Test 3: Multiple cache hits
  console.log('Test 3: Multiple cache hits');
  for (let i = 1; i <= 5; i++) {
    await measurePerformance(`  Call ${i}`, getCCBInstances);
  }
  console.log();

  // Summary
  console.log('=== Summary ===');
  console.log(`Cache miss: ${test1.duration}ms`);
  console.log(`Cache hit:  ${test2.duration}ms`);
  console.log(`Target:     < 300ms (cache miss), < 5ms (cache hit)`);
  console.log();

  if (test2.duration < 5) {
    console.log('✅ Cache hit performance: EXCELLENT');
  } else if (test2.duration < 50) {
    console.log('✅ Cache hit performance: GOOD');
  } else {
    console.log('⚠️  Cache hit performance: NEEDS IMPROVEMENT');
  }

  if (test1.duration < 300) {
    console.log('✅ Cache miss performance: ACCEPTABLE');
  } else if (test1.duration < 1000) {
    console.log('⚠️  Cache miss performance: SLOW');
  } else {
    console.log('❌ Cache miss performance: TOO SLOW');
  }
}

runTests().catch(console.error);
