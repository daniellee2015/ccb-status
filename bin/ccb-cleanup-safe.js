#!/usr/bin/env node

/**
 * CCB Cleanup - Safely cleanup orphaned CCB and askd processes
 * Only kills processes that are NOT actively working
 */

const readline = require('readline');
const {
  analyzeCCBProcesses,
  analyzeAskdProcesses,
  killOrphanedCCBProcesses,
  killOrphanedAskdProcesses
} = require('../src/services/cleanup-service');

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const yes = args.includes('--yes') || args.includes('-y');
  const forceSignal = args.includes('--force') || args.includes('-f');

  console.log('🔍 Analyzing CCB processes...\n');

  // Analyze processes
  const ccbAnalysis = analyzeCCBProcesses();
  const askdAnalysis = analyzeAskdProcesses();

  // Show CCB processes
  console.log('=== CCB Processes ===');
  if (ccbAnalysis.total === 0) {
    console.log('  No CCB processes found\n');
  } else {
    if (ccbAnalysis.active.length > 0) {
      console.log(`\n✅ Active (${ccbAnalysis.active.length}) - WILL NOT KILL:`);
      ccbAnalysis.active.forEach(p => {
        console.log(`  PID ${p.pid}: ${p.workDir}`);
        console.log(`    Reason: ${p.reason}`);
      });
    }

    if (ccbAnalysis.orphaned.length > 0) {
      console.log(`\n⚠️  Orphaned (${ccbAnalysis.orphaned.length}) - SAFE TO KILL:`);
      ccbAnalysis.orphaned.forEach(p => {
        console.log(`  PID ${p.pid}: ${p.workDir}`);
        console.log(`    Reason: ${p.reason}`);
      });
    }
  }

  // Show askd processes
  console.log('\n=== askd Daemon Processes ===');
  if (askdAnalysis.total === 0) {
    console.log('  No askd processes found\n');
  } else {
    if (askdAnalysis.active.length > 0) {
      console.log(`\n✅ Active (${askdAnalysis.active.length}) - WILL NOT KILL:`);
      askdAnalysis.active.forEach(p => {
        console.log(`  PID ${p.pid}: ${p.workDir}`);
        console.log(`    Reason: ${p.reason}`);
      });
    }

    if (askdAnalysis.orphaned.length > 0) {
      console.log(`\n⚠️  Orphaned (${askdAnalysis.orphaned.length}) - SAFE TO KILL:`);
      askdAnalysis.orphaned.forEach(p => {
        console.log(`  PID ${p.pid}: ${p.workDir}`);
        console.log(`    Reason: ${p.reason}`);
      });
    }
  }

  // Check if there's anything to clean up
  const totalOrphaned = ccbAnalysis.orphaned.length + askdAnalysis.orphaned.length;
  if (totalOrphaned === 0) {
    console.log('\n✨ No orphaned processes to clean up');
    return 0;
  }

  // Dry run mode
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No processes will be killed');
    console.log(`Would kill ${totalOrphaned} orphaned process(es)`);
    return 0;
  }

  // Ask for confirmation unless --yes flag is provided
  if (!yes) {
    const rl = createInterface();
    console.log(`\n⚠️  About to kill ${totalOrphaned} orphaned process(es)`);
    console.log('Active processes will NOT be affected');
    const answer = await askQuestion(rl, '\nProceed? (y/N): ');
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      return 1;
    }
  }

  // Kill orphaned processes
  console.log(`\n${forceSignal ? '💀 Force killing' : '🛑 Terminating'} orphaned processes...\n`);

  const ccbResult = killOrphanedCCBProcesses(forceSignal);
  const askdResult = killOrphanedAskdProcesses(forceSignal);

  // Report results
  console.log('=== CCB Processes ===');
  if (ccbResult.killed.length > 0) {
    console.log(`✅ Killed ${ccbResult.killed.length} orphaned process(es):`);
    ccbResult.killed.forEach(p => {
      console.log(`  PID ${p.pid}: ${p.workDir}`);
    });
  }
  if (ccbResult.skipped.length > 0) {
    console.log(`⏭️  Skipped ${ccbResult.skipped.length} active process(es)`);
  }
  if (ccbResult.failed.length > 0) {
    console.log(`❌ Failed to kill ${ccbResult.failed.length} process(es):`);
    ccbResult.failed.forEach(p => {
      console.log(`  PID ${p.pid}: ${p.failReason}`);
    });
  }

  console.log('\n=== askd Daemon Processes ===');
  if (askdResult.killed.length > 0) {
    console.log(`✅ Killed ${askdResult.killed.length} orphaned process(es):`);
    askdResult.killed.forEach(p => {
      console.log(`  PID ${p.pid}: ${p.workDir}`);
    });
  }
  if (askdResult.skipped.length > 0) {
    console.log(`⏭️  Skipped ${askdResult.skipped.length} active process(es)`);
  }
  if (askdResult.failed.length > 0) {
    console.log(`❌ Failed to kill ${askdResult.failed.length} process(es):`);
    askdResult.failed.forEach(p => {
      console.log(`  PID ${p.pid}: ${p.failReason}`);
    });
  }

  console.log('\n✨ Cleanup complete');

  const totalFailed = ccbResult.failed.length + askdResult.failed.length;
  return totalFailed > 0 ? 1 : 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
