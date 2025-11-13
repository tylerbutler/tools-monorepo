# Sail vs Nx Benchmark

This directory contains scripts for benchmarking Sail against Nx to compare build performance under different caching scenarios.

## Prerequisites

Install hyperfine (the benchmarking tool):

```bash
# macOS
brew install hyperfine

# Linux (cargo)
cargo install hyperfine

# Linux (Debian/Ubuntu)
sudo apt install hyperfine
```

## Usage

### Run All Scenarios

```bash
./scripts/benchmark-sail-vs-nx.sh
```

This will run three benchmark scenarios:

1. **Cold Cache** - No cache available (worst case scenario)
   - All caches cleared
   - All build artifacts removed
   - Full rebuild from scratch

2. **Warm Remote/Cold Local** - Remote/shared cache populated, local cache cleared
   - Nx: Uses its standard cache
   - Sail: Uses shared cache directory, but local donefiles are cleared
   - Simulates a fresh checkout with remote cache available

3. **Hot Cache** - Full cache from previous run (best case scenario)
   - All caches fully populated
   - Immediate cache hits
   - Simulates running `build` twice in a row

### Run Specific Scenario

```bash
# Only cold cache
./scripts/benchmark-sail-vs-nx.sh --scenario cold

# Only warm remote/cold local
./scripts/benchmark-sail-vs-nx.sh --scenario warm

# Only hot cache
./scripts/benchmark-sail-vs-nx.sh --scenario hot
```

### Customize Benchmark Parameters

```bash
# Run more iterations for more accurate results
./scripts/benchmark-sail-vs-nx.sh --runs 10

# Increase warmup runs
./scripts/benchmark-sail-vs-nx.sh --warmup 2

# Benchmark a different task
./scripts/benchmark-sail-vs-nx.sh --task test

# Combine options
./scripts/benchmark-sail-vs-nx.sh --scenario hot --runs 10 --warmup 2
```

### Options

- `--scenario <cold|warm|hot|all>` - Which scenario to benchmark (default: all)
- `--warmup <N>` - Number of warmup runs before benchmarking (default: 1)
- `--runs <N>` - Number of benchmark runs to average (default: 5)
- `--task <task>` - Task to build (default: build)
- `--export <format>` - Export format: markdown, json, csv (default: markdown)
- `--help` - Show help message

## Results

Results are saved to `benchmark-results/` directory with timestamps:

```
benchmark-results/
├── cold-cache-20250113-143022.md
├── cold-cache-20250113-143022.json
├── warm-remote-cold-local-20250113-143045.md
├── warm-remote-cold-local-20250113-143045.json
├── hot-cache-20250113-143108.md
└── hot-cache-20250113-143108.json
```

Each scenario produces:
- `.md` file - Markdown formatted table for easy reading
- `.json` file - Detailed JSON data for further analysis

## Understanding the Results

### Cold Cache
This shows the absolute worst-case performance when building from scratch with no cache. This scenario helps understand:
- Initial build times for new developers
- CI builds on fresh environments
- Impact of cache poisoning/corruption

### Warm Remote/Cold Local
This simulates having a shared cache (like Nx Cloud or Sail's shared cache) but no local cache:
- Fresh clone of repository
- New CI runner with remote cache enabled
- Cache restoration after cleanup

For Nx, this uses the standard `.nx/cache` directory.
For Sail, this uses the shared cache directory (`.sail-cache/`) while clearing local donefiles.

### Hot Cache
This shows the best-case performance when everything is cached:
- Incremental builds with no changes
- Running build commands multiple times
- Cache hit ratio at 100%

## Cache Mechanisms

### Nx Caching
- **Local cache**: `.nx/cache/` directory
- **Cache key**: Based on inputs defined in `nx.json` (source files, dependencies, etc.)
- **Cache clear**: `rm -rf .nx/cache` or `pnpm nx reset`

### Sail Caching

Sail uses two caching mechanisms:

1. **Local donefile cache** (incremental builds)
   - Files: `*.done.*.log` in each package directory
   - Contains: File hashes for inputs and outputs
   - Clear: `find packages -type f -name "*.done.*.log" -delete`

2. **Shared cache** (distributed builds)
   - Directory: `.sail-cache/` (configurable via `--cache-dir`)
   - Contains: Cache entries with manifests and outputs
   - Cache key: SHA-256 of inputs, platform, Node version, lockfile
   - Clear: `rm -rf .sail-cache`

## Example Output

```
Command 'Nx (hot)': benchmark completed
  Time (mean ± σ):      1.234 s ±  0.045 s    [User: 0.823 s, System: 0.412 s]
  Range (min … max):    1.187 s …  1.289 s    10 runs

Command 'Sail (hot)': benchmark completed
  Time (mean ± σ):      0.987 s ±  0.038 s    [User: 0.654 s, System: 0.334 s]
  Range (min … max):    0.945 s …  1.034 s    10 runs

Summary
  'Sail (hot)' ran 1.25 ± 0.06 times faster than 'Nx (hot)'
```

## Notes

- The script automatically builds Sail before benchmarking
- Each scenario uses hyperfine's `--prepare` option to reset caches between runs
- Build artifacts (esm/, *.tsbuildinfo) are cleared for cold cache scenarios
- The script preserves Sail's shared cache for the warm scenario to simulate remote cache
