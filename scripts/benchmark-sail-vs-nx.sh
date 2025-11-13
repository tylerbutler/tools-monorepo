#!/usr/bin/env bash

# Benchmark script for comparing Sail vs Nx build systems
# Tests three cache scenarios:
#   1. Cold cache - No cache at all
#   2. Warm remote/cold local - Remote/shared cache populated, local cache cleared
#   3. Hot cache - Full cache from previous run

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SAIL_BIN="${REPO_ROOT}/packages/sail/bin/dev.js"
SAIL_CACHE_DIR="${REPO_ROOT}/.sail-cache"
NX_CACHE_DIR="${REPO_ROOT}/.nx/cache"
RESULTS_DIR="${REPO_ROOT}/benchmark-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Benchmark parameters
WARMUP_RUNS=1
BENCHMARK_RUNS=5
BUILD_TASK="build"

# Parse command line arguments
SCENARIO="all"
EXPORT_FORMAT="markdown"
while [[ $# -gt 0 ]]; do
	case $1 in
		--scenario)
			SCENARIO="$2"
			shift 2
			;;
		--warmup)
			WARMUP_RUNS="$2"
			shift 2
			;;
		--runs)
			BENCHMARK_RUNS="$2"
			shift 2
			;;
		--task)
			BUILD_TASK="$2"
			shift 2
			;;
		--export)
			EXPORT_FORMAT="$2"
			shift 2
			;;
		--help)
			echo "Usage: $0 [OPTIONS]"
			echo ""
			echo "Options:"
			echo "  --scenario <cold|warm|hot|all>  Which scenario to benchmark (default: all)"
			echo "  --warmup <N>                     Number of warmup runs (default: 1)"
			echo "  --runs <N>                       Number of benchmark runs (default: 5)"
			echo "  --task <task>                    Task to build (default: build)"
			echo "  --export <format>                Export format: markdown, json, csv (default: markdown)"
			echo "  --help                           Show this help message"
			exit 0
			;;
		*)
			echo "Unknown option: $1"
			echo "Run with --help for usage information"
			exit 1
			;;
	esac
done

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Sail vs Nx Benchmark${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Check dependencies
check_dependencies() {
	echo -e "${YELLOW}Checking dependencies...${NC}"

	if ! command -v hyperfine &> /dev/null; then
		echo -e "${RED}Error: hyperfine is not installed${NC}"
		echo "Install with: cargo install hyperfine"
		echo "Or on macOS: brew install hyperfine"
		exit 1
	fi

	if ! command -v pnpm &> /dev/null; then
		echo -e "${RED}Error: pnpm is not installed${NC}"
		exit 1
	fi

	if [[ ! -f "${SAIL_BIN}" ]]; then
		echo -e "${RED}Error: Sail binary not found at ${SAIL_BIN}${NC}"
		exit 1
	fi

	echo -e "${GREEN}✓ All dependencies found${NC}"
	echo ""
}

# Build sail itself (needed for benchmarking)
build_sail() {
	echo -e "${YELLOW}Building Sail...${NC}"
	cd "${REPO_ROOT}"
	pnpm nx run sail:build > /dev/null 2>&1
	echo -e "${GREEN}✓ Sail built successfully${NC}"
	echo ""
}

# Cache management functions
clear_nx_cache() {
	echo -e "${YELLOW}Clearing Nx cache...${NC}"
	if [[ -d "${NX_CACHE_DIR}" ]]; then
		rm -rf "${NX_CACHE_DIR}"
		echo -e "${GREEN}✓ Nx cache cleared${NC}"
	else
		echo -e "${BLUE}ℹ Nx cache directory not found${NC}"
	fi
}

clear_sail_local_cache() {
	echo -e "${YELLOW}Clearing Sail local cache (donefiles)...${NC}"
	cd "${REPO_ROOT}"
	local count=$(find packages -type f -name "*.done.*.log" | wc -l)
	find packages -type f -name "*.done.*.log" -delete
	echo -e "${GREEN}✓ Removed ${count} Sail donefile(s)${NC}"
}

clear_sail_shared_cache() {
	echo -e "${YELLOW}Clearing Sail shared cache...${NC}"
	if [[ -d "${SAIL_CACHE_DIR}" ]]; then
		rm -rf "${SAIL_CACHE_DIR}"
		echo -e "${GREEN}✓ Sail shared cache cleared${NC}"
	else
		echo -e "${BLUE}ℹ Sail shared cache directory not found${NC}"
	fi
}

clear_all_build_artifacts() {
	echo -e "${YELLOW}Clearing all build artifacts...${NC}"
	cd "${REPO_ROOT}"
	# Clear compiled outputs
	find packages -type d -name "esm" -exec rm -rf {} + 2>/dev/null || true
	find packages -type f -name "*.tsbuildinfo" -delete 2>/dev/null || true
	echo -e "${GREEN}✓ Build artifacts cleared${NC}"
}

clear_all_caches() {
	clear_nx_cache
	clear_sail_local_cache
	clear_sail_shared_cache
	clear_all_build_artifacts
}

# Populate shared cache for "warm remote" scenario
populate_sail_shared_cache() {
	echo -e "${YELLOW}Populating Sail shared cache...${NC}"
	cd "${REPO_ROOT}"
	"${SAIL_BIN}" build --task "${BUILD_TASK}" --cache-dir "${SAIL_CACHE_DIR}" > /dev/null 2>&1
	echo -e "${GREEN}✓ Sail shared cache populated${NC}"
}

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Benchmark scenarios
benchmark_cold_cache() {
	echo -e "${BLUE}====================================${NC}"
	echo -e "${BLUE}Scenario 1: Cold Cache${NC}"
	echo -e "${BLUE}====================================${NC}"
	echo "No cache available for either system"
	echo ""

	local output_file="${RESULTS_DIR}/cold-cache-${TIMESTAMP}"

	hyperfine \
		--warmup 0 \
		--runs "${BENCHMARK_RUNS}" \
		--prepare 'clear_all_caches' \
		--export-markdown "${output_file}.md" \
		--export-json "${output_file}.json" \
		--command-name "Nx (cold)" \
		"pnpm nx run-many -t ${BUILD_TASK} --skip-nx-cache" \
		--command-name "Sail (cold)" \
		"${SAIL_BIN} build --task ${BUILD_TASK} --force --cache-dir ${SAIL_CACHE_DIR}"

	echo ""
	echo -e "${GREEN}Results saved to: ${output_file}.{md,json}${NC}"
	echo ""
}

benchmark_warm_remote_cold_local() {
	echo -e "${BLUE}====================================${NC}"
	echo -e "${BLUE}Scenario 2: Warm Remote/Cold Local${NC}"
	echo -e "${BLUE}====================================${NC}"
	echo "Shared/remote cache populated, local cache cleared"
	echo ""

	# First, ensure shared cache is populated
	clear_all_caches
	echo -e "${YELLOW}Populating caches for warm scenario...${NC}"
	cd "${REPO_ROOT}"

	# Populate Nx cache
	pnpm nx run-many -t "${BUILD_TASK}" > /dev/null 2>&1
	echo -e "${GREEN}✓ Nx cache populated${NC}"

	# Populate Sail shared cache
	populate_sail_shared_cache

	echo ""

	local output_file="${RESULTS_DIR}/warm-remote-cold-local-${TIMESTAMP}"

	# For Nx: clear local .nx/cache but keep remote (simulated by rebuilding cache)
	# For Sail: keep shared cache but clear donefiles
	hyperfine \
		--warmup "${WARMUP_RUNS}" \
		--runs "${BENCHMARK_RUNS}" \
		--prepare 'clear_sail_local_cache' \
		--export-markdown "${output_file}.md" \
		--export-json "${output_file}.json" \
		--command-name "Nx (warm)" \
		"pnpm nx run-many -t ${BUILD_TASK}" \
		--command-name "Sail (warm)" \
		"${SAIL_BIN} build --task ${BUILD_TASK} --cache-dir ${SAIL_CACHE_DIR}"

	echo ""
	echo -e "${GREEN}Results saved to: ${output_file}.{md,json}${NC}"
	echo ""
}

benchmark_hot_cache() {
	echo -e "${BLUE}====================================${NC}"
	echo -e "${BLUE}Scenario 3: Hot Cache${NC}"
	echo -e "${BLUE}====================================${NC}"
	echo "Full cache from previous run (best case)"
	echo ""

	# Warm up both systems
	echo -e "${YELLOW}Warming up caches...${NC}"
	cd "${REPO_ROOT}"
	pnpm nx run-many -t "${BUILD_TASK}" > /dev/null 2>&1
	"${SAIL_BIN}" build --task "${BUILD_TASK}" --cache-dir "${SAIL_CACHE_DIR}" > /dev/null 2>&1
	echo -e "${GREEN}✓ Caches warmed up${NC}"
	echo ""

	local output_file="${RESULTS_DIR}/hot-cache-${TIMESTAMP}"

	hyperfine \
		--warmup "${WARMUP_RUNS}" \
		--runs "${BENCHMARK_RUNS}" \
		--export-markdown "${output_file}.md" \
		--export-json "${output_file}.json" \
		--command-name "Nx (hot)" \
		"pnpm nx run-many -t ${BUILD_TASK}" \
		--command-name "Sail (hot)" \
		"${SAIL_BIN} build --task ${BUILD_TASK} --cache-dir ${SAIL_CACHE_DIR}"

	echo ""
	echo -e "${GREEN}Results saved to: ${output_file}.{md,json}${NC}"
	echo ""
}

# Export shell functions for hyperfine --prepare
export -f clear_nx_cache
export -f clear_sail_local_cache
export -f clear_sail_shared_cache
export -f clear_all_build_artifacts
export -f clear_all_caches
export NX_CACHE_DIR
export REPO_ROOT

# Main execution
main() {
	check_dependencies
	build_sail

	case "${SCENARIO}" in
		cold)
			benchmark_cold_cache
			;;
		warm)
			benchmark_warm_remote_cold_local
			;;
		hot)
			benchmark_hot_cache
			;;
		all)
			benchmark_cold_cache
			benchmark_warm_remote_cold_local
			benchmark_hot_cache
			;;
		*)
			echo -e "${RED}Unknown scenario: ${SCENARIO}${NC}"
			echo "Valid scenarios: cold, warm, hot, all"
			exit 1
			;;
	esac

	echo -e "${BLUE}====================================${NC}"
	echo -e "${GREEN}Benchmark Complete!${NC}"
	echo -e "${BLUE}====================================${NC}"
	echo ""
	echo "Results saved to: ${RESULTS_DIR}"
	echo ""
	echo "Summary of scenarios tested:"
	echo "  1. Cold cache - No cache (worst case)"
	echo "  2. Warm remote/cold local - Remote cache available"
	echo "  3. Hot cache - Full local cache (best case)"
	echo ""
}

main
