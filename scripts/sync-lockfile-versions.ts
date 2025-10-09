#!/usr/bin/env tsx
/**
 * Syncs package.json dependency versions to match what's installed in the lockfile.
 *
 * This script addresses a Dependabot bug where versioning-strategy: increase doesn't
 * update package.json for dependencies with caret ranges (^) that already satisfy
 * the new version. See: https://github.com/dependabot/dependabot-core/issues/9020
 *
 * Supported package managers: pnpm, npm
 * Note: Yarn support is not yet implemented - contributions welcome!
 *
 * Usage:
 *   pnpm deps:sync                      # Preview changes (dry-run, default)
 *   pnpm deps:sync --execute            # Apply changes
 *   pnpm deps:sync --verbose            # Show detailed output
 *
 * By default, runs in dry-run mode. Use --execute to apply changes.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';

// Types
interface DependencyInfo {
  version: string;
  [key: string]: unknown;
}

interface ProjectInfo {
  name: string;
  path: string;
  dependencies?: Record<string, DependencyInfo>;
  devDependencies?: Record<string, DependencyInfo>;
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface SyncResult {
  packagePath: string;
  changes: Array<{
    dep: string;
    type: 'dependencies' | 'devDependencies';
    from: string;
    to: string;
  }>;
}

type PackageManager = 'pnpm' | 'npm' | 'yarn';

// Package manager output types
interface PnpmProject {
  name: string;
  path: string;
  dependencies?: Record<string, DependencyInfo>;
  devDependencies?: Record<string, DependencyInfo>;
}

interface NpmDependency {
  version: string;
  path?: string;
  dependencies?: Record<string, NpmDependency>;
  devDependencies?: Record<string, NpmDependency>;
}

interface NpmListOutput {
  name: string;
  path?: string;
  version?: string;
  dependencies?: Record<string, NpmDependency>;
  devDependencies?: Record<string, NpmDependency>;
}


// CLI arguments
const args = process.argv.slice(2);
const execute = args.includes('--execute');
const dryRun = !execute; // Dry-run is now the default
const verbose = args.includes('--verbose') || dryRun;

function log(message: string) {
  if (verbose) {
    console.log(message);
  }
}

/**
 * Detect which package manager is being used
 */
function detectPackageManager(): PackageManager {
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) {
    console.error('❌ Yarn is not yet supported by this script.');
    console.error('   Contributions welcome! See: https://github.com/tylerbutler/tools-monorepo');
    process.exit(1);
  }
  if (fs.existsSync('package-lock.json')) return 'npm';
  throw new Error('No lockfile found. Supported: pnpm-lock.yaml, package-lock.json');
}

/**
 * Get installed versions from package manager
 */
function getInstalledVersions(packageManager: PackageManager): ProjectInfo[] {
  log(`Getting installed versions using ${packageManager}...`);

  const command = packageManager === 'pnpm'
    ? 'pnpm list --json --depth 0 --recursive'
    : 'npm list --json --depth 0 --workspaces --all';

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    return parseListOutput(packageManager, output);
  } catch (error) {
    console.error(`Failed to get installed versions from ${packageManager}:`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Parse package manager list output to unified format
 */
function parseListOutput(packageManager: PackageManager, output: string): ProjectInfo[] {
  try {
    const parsed = JSON.parse(output);
    return packageManager === 'pnpm' ? parsePnpmList(parsed) : parseNpmList(parsed);
  } catch (error) {
    console.error(`Failed to parse ${packageManager} list output:`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function parsePnpmList(data: PnpmProject[]): ProjectInfo[] {
  return data.map((project) => ({
    name: project.name,
    path: project.path,
    dependencies: project.dependencies || {},
    devDependencies: project.devDependencies || {},
  }));
}

function parseNpmList(data: NpmListOutput): ProjectInfo[] {
  // npm list with workspaces returns nested structure
  const projects: ProjectInfo[] = [];

  function extractProject(pkg: NpmListOutput | NpmDependency, pkgPath: string) {
    projects.push({
      name: 'name' in pkg ? pkg.name : '',
      path: pkgPath,
      dependencies: pkg.dependencies ? convertNpmDeps(pkg.dependencies) : {},
      devDependencies: pkg.devDependencies ? convertNpmDeps(pkg.devDependencies) : {},
    });
  }

  // Root project
  extractProject(data, data.path || process.cwd());

  // Workspace projects
  if (data.dependencies) {
    for (const [name, info] of Object.entries(data.dependencies)) {
      if (typeof info === 'object' && info.version) {
        extractProject(info, info.path || path.join(process.cwd(), 'node_modules', name));
      }
    }
  }

  return projects;
}

function convertNpmDeps(deps: Record<string, NpmDependency>): Record<string, DependencyInfo> {
  const result: Record<string, DependencyInfo> = {};
  for (const [name, info] of Object.entries(deps)) {
    if (typeof info === 'object' && info.version) {
      result[name] = { version: info.version };
    }
  }
  return result;
}

/**
 * Check if version should be skipped (special protocols)
 */
function shouldSkipVersion(version: string): boolean {
  const SKIP_PROTOCOLS = ['link:', 'file:', 'git:', 'git+', 'http:', 'https:'];
  return SKIP_PROTOCOLS.some(protocol => version.startsWith(protocol));
}

/**
 * Validate if a version string is a valid semver
 */
function isValidSemver(version: string): boolean {
  return semver.valid(version) !== null;
}

/**
 * Sync a package.json file to lockfile versions
 */
function syncPackageJson(
  packageJsonPath: string,
  installedDeps: Record<string, DependencyInfo>,
  installedDevDeps: Record<string, DependencyInfo>
): SyncResult {
  let pkg: PackageJson;
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  } catch (error) {
    console.error(`Failed to read or parse ${packageJsonPath}:`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const changes: SyncResult['changes'] = [];

  // Sync dependencies
  if (pkg.dependencies) {
    for (const [dep, currentRange] of Object.entries(pkg.dependencies)) {
      const installed = installedDeps[dep];
      if (installed && !shouldSkipVersion(installed.version)) {
        const newRange = updateVersionRange(currentRange, installed.version);
        if (newRange !== currentRange) {
          changes.push({
            dep,
            type: 'dependencies',
            from: currentRange,
            to: newRange,
          });
          pkg.dependencies[dep] = newRange;
        }
      }
    }
  }

  // Sync devDependencies
  if (pkg.devDependencies) {
    for (const [dep, currentRange] of Object.entries(pkg.devDependencies)) {
      const installed = installedDevDeps[dep];
      if (installed && !shouldSkipVersion(installed.version)) {
        const newRange = updateVersionRange(currentRange, installed.version);
        if (newRange !== currentRange) {
          changes.push({
            dep,
            type: 'devDependencies',
            from: currentRange,
            to: newRange,
          });
          pkg.devDependencies[dep] = newRange;
        }
      }
    }
  }

  // Write back if changes and not dry run
  if (changes.length > 0 && !dryRun) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t') + '\n');
  }

  return {
    packagePath: packageJsonPath,
    changes,
  };
}

/**
 * Update version range while preserving the range type
 */
function updateVersionRange(currentRange: string, installedVersion: string): string {
  // Validate installed version is valid semver
  if (!isValidSemver(installedVersion)) {
    // Skip non-semver versions (e.g., git URLs, special tags)
    return currentRange;
  }

  // Handle workspace protocol
  if (currentRange.startsWith('workspace:')) {
    return currentRange;
  }

  // Handle npm/catalog/other protocols
  if (currentRange.includes(':')) {
    return currentRange;
  }

  // Detect the range type and update accordingly
  if (currentRange.startsWith('^')) {
    return `^${installedVersion}`;
  } else if (currentRange.startsWith('~')) {
    return `~${installedVersion}`;
  } else if (
    currentRange.startsWith('>=') ||
    currentRange.startsWith('<=') ||
    currentRange.startsWith('>') ||
    currentRange.startsWith('<')
  ) {
    // Keep complex ranges as-is (too risky to auto-update)
    return currentRange;
  } else if (currentRange === '*' || currentRange === 'latest') {
    return currentRange;
  } else {
    // Exact version (pinned)
    return installedVersion;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Syncing package.json versions to lockfile...\n');

  const packageManager = detectPackageManager();
  log(`Detected package manager: ${packageManager}`);

  const projects = getInstalledVersions(packageManager);
  log(`Found ${projects.length} project(s)\n`);

  const results: SyncResult[] = [];

  for (const project of projects) {
    const packageJsonPath = path.join(project.path, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      log(`⚠️  Skipping ${project.name}: package.json not found`);
      continue;
    }

    const result = syncPackageJson(
      packageJsonPath,
      project.dependencies || {},
      project.devDependencies || {}
    );

    if (result.changes.length > 0) {
      results.push(result);
    }
  }

  // Report results
  if (results.length === 0) {
    console.log('✅ All package.json files are already in sync with lockfile');
    process.exit(0);
  }

  console.log(
    `${dryRun ? '🔍 DRY RUN:' : '✅'} Updated ${results.length} package.json file(s):\n`
  );

  for (const result of results) {
    const relativePath = path.relative(process.cwd(), result.packagePath);
    console.log(`📦 ${relativePath}`);

    for (const change of result.changes) {
      const prefix = change.type === 'devDependencies' ? 'dev' : '   ';
      console.log(`   ${prefix} ${change.dep}: ${change.from} → ${change.to}`);
    }
    console.log();
  }

  if (dryRun) {
    console.log('💡 Run with --execute to apply changes');
    process.exit(0);
  }

  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
  console.log(`✅ Synced ${totalChanges} dependencies across ${results.length} package(s)`);
}

main();
