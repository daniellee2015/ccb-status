# Performance Optimization

## Performance Standards

### Target Metrics
- **Cache Hit**: < 5ms (Achieved: 0-1ms ✅)
- **Cache Miss**: < 500ms (Achieved: 383ms ✅)
- **Overall**: 10x improvement from baseline

### Baseline vs Optimized
- **Before**: 4000ms (4 seconds)
- **After**: 383ms cache miss, 0-1ms cache hit
- **Improvement**: 10.4x faster (90% reduction)

## Architecture

### Caching Strategy
- **Type**: File-based cache with TTL
- **Location**: `~/.cache/ccb/instances.json`
- **TTL**: 2 seconds (balance between freshness and performance)
- **Pattern**: Read-through cache with atomic writes

### Optimization Techniques

1. **File Cache (file-cache.js)**
   - Atomic writes using temp file + rename
   - TTL-based expiration (2s default)
   - Graceful degradation on cache failures

2. **Fast Process Discovery**
   - Use `pgrep -f` instead of `ps aux | awk`
   - 20x faster: 111ms vs 2404ms
   - Pattern: `\.local/bin/ccb` (matches processes with/without args)

3. **Batch System Calls**
   - Batch lsof: `lsof -a -d cwd -p PID1,PID2,PID3`
   - 3x faster: 152ms vs 438ms (3 separate calls)
   - Single tmux list-panes call reused for all instances

4. **Parallel Port Checks**
   - Use `Promise.all()` for concurrent port listening checks
   - Reduces sequential wait time

## Performance Breakdown

### Cache Miss (383ms total)
```
pgrep:           111ms (29%)  - Process discovery
lsof (batch):    152ms (40%)  - Working directory detection
tmux:             20ms (5%)   - Tmux pane listing
ps commands:      46ms (12%)  - Process info queries
Other:            54ms (14%)  - File I/O, parsing, logic
```

### Cache Hit (0-1ms)
- Direct file read from `~/.cache/ccb/instances.json`
- No system commands executed
- Minimal overhead

## Testing

### Performance Test Suite
```bash
# Full test with cache hit/miss
node test-performance.js

# Fresh test (no cache)
node test-fresh.js

# Detailed profiling
node profile-clean.js
```

### Expected Results
- Cache hit: 0-1ms
- Cache miss: 300-400ms
- Multiple cache hits: consistently 0-1ms

## Maintenance Notes

### Do NOT Change
- Cache TTL (2s) - carefully balanced for freshness vs performance
- pgrep pattern - tested to catch all CCB processes
- Batch lsof approach - critical for performance

### Safe to Modify
- Cache file location (update CACHE_DIR constant)
- Timeout values (if needed for slower systems)
- Error handling and logging

### Performance Regression Prevention
- Run `test-performance.js` before committing changes
- Cache miss should stay under 500ms
- Cache hit should stay under 5ms

## History

### Optimization Rounds
1. **Round 1**: Added in-memory cache (3s TTL) - 4s → 4s (no improvement, cache not persisted)
2. **Round 2**: File cache + TTL - 4s → 2.6s (35% improvement)
3. **Round 3**: Parallel port checks - 2.6s → 2.4s (8% improvement)
4. **Round 4**: pgrep + batch lsof - 2.4s → 0.38s (84% improvement)

### Final Result
- **Total improvement**: 10.4x faster
- **User experience**: Instant response with cache (0-1ms)
- **Acceptable**: Cache miss at 383ms meets practical needs
