#!/usr/bin/env bash
# Benchmark: repopo TypeScript (check) vs Rust (check-native)
#
# Compares wall-clock performance of the pure TypeScript policy engine
# against the hybrid Rust+Node.js engine using hyperfine.
#
# Usage:
#   ./packages/repopo/benchmark.sh           # Run full benchmark
#   ./packages/repopo/benchmark.sh --quick   # Fewer iterations for a quick comparison
#
# Prerequisites:
#   - hyperfine (cargo binstall hyperfine)
#   - Rust binary built (cargo build --manifest-path packages/repopo/crates/core/Cargo.toml)
#   - Release binary built (cargo build --release --manifest-path packages/repopo/crates/core/Cargo.toml)
#   - TypeScript compiled (pnpm nx run repopo:build:compile)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPOPO_PKG="$REPO_ROOT/packages/repopo"
SIDECAR="$REPOPO_PKG/sidecar/sidecar.mjs"
RUST_DEBUG="$REPOPO_PKG/crates/core/target/debug/repopo-core"
RUST_RELEASE="$REPOPO_PKG/crates/core/target/release/repopo-core"
TS_BIN="$REPOPO_PKG/bin/run.js"

# NODE_PATH needed for pnpm strict hoisting - sidecar can't resolve
# workspace dependencies without it when run from the monorepo root
export NODE_PATH="$REPOPO_PKG/node_modules"

# Parse args
QUICK=false
EXPORT_JSON=""
for arg in "$@"; do
	case "$arg" in
		--quick) QUICK=true ;;
		--json=*) EXPORT_JSON="${arg#--json=}" ;;
		--json) EXPORT_JSON="benchmark-results.json" ;;
	esac
done

# Validation
errors=()
command -v hyperfine >/dev/null 2>&1 || errors+=("hyperfine not found. Install: cargo binstall hyperfine")
[[ -x "$TS_BIN" ]] || errors+=("TypeScript binary not found at $TS_BIN. Run: pnpm nx run repopo:build:compile")
[[ -x "$RUST_DEBUG" ]] || errors+=("Rust debug binary not found. Run: cargo build --manifest-path $REPOPO_PKG/crates/core/Cargo.toml")

if [[ ${#errors[@]} -gt 0 ]]; then
	echo "ERROR: Missing prerequisites:"
	for e in "${errors[@]}"; do
		echo "  - $e"
	done
	exit 1
fi

# Check for release binary (optional)
HAS_RELEASE=false
if [[ -x "$RUST_RELEASE" ]]; then
	HAS_RELEASE=true
fi

# Configure iterations
if $QUICK; then
	WARMUP=1
	RUNS=3
else
	WARMUP=3
	RUNS=10
fi

echo "=== repopo benchmark ==="
echo "Working directory: $REPO_ROOT"
echo "Warmup runs: $WARMUP"
echo "Timed runs: $RUNS"
echo "Release binary: $($HAS_RELEASE && echo 'yes' || echo 'no (skipping release benchmark)')"
echo ""

# Detect bun
HAS_BUN=false
if command -v bun >/dev/null 2>&1; then
	HAS_BUN=true
fi
echo "Bun runtime: $($HAS_BUN && echo "yes ($(bun --version))" || echo 'no (skipping bun benchmarks)')"

# Build the command list
# Note: Both commands may produce policy violations to stderr/stdout.
# We redirect to /dev/null to measure pure execution time without I/O variance.
CMDS=(
	-n "TypeScript (check)"
	"$TS_BIN check --quiet 2>/dev/null; true"
	-n "Rust+node debug"
	"$RUST_DEBUG check --sidecar-path $SIDECAR --runtime node --quiet 2>/dev/null; true"
)

if $HAS_RELEASE; then
	CMDS+=(
		-n "Rust+node release"
		"$RUST_RELEASE check --sidecar-path $SIDECAR --runtime node --quiet 2>/dev/null; true"
	)
fi

if $HAS_BUN; then
	CMDS+=(
		-n "Rust+bun debug"
		"$RUST_DEBUG check --sidecar-path $SIDECAR --runtime bun --quiet 2>/dev/null; true"
	)
	if $HAS_RELEASE; then
		CMDS+=(
			-n "Rust+bun release"
			"$RUST_RELEASE check --sidecar-path $SIDECAR --runtime bun --quiet 2>/dev/null; true"
		)
	fi
fi

# Build export args
EXPORT_ARGS=()
if [[ -n "$EXPORT_JSON" ]]; then
	EXPORT_ARGS=(--export-json "$EXPORT_JSON")
fi

# Run benchmark from the monorepo root
cd "$REPO_ROOT"

hyperfine \
	--warmup "$WARMUP" \
	--runs "$RUNS" \
	--shell=bash \
	"${EXPORT_ARGS[@]+"${EXPORT_ARGS[@]}"}" \
	"${CMDS[@]}"
