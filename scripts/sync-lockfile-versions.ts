#!/usr/bin/env tsx
/**
 * Syncs package.json dependency versions to match what's installed in the lockfile.
 *
 * This script addresses a Dependabot bug where versioning-strategy: increase doesn't
 * update package.json for dependencies with caret ranges (^) that already satisfy
 * the new version. See: https://github.com/dependabot/dependabot-core/issues/9020
 *
 * Supports multiple package managers: pnpm, npm, yarn
 *
 * Usage:
 *   pnpm tsx scripts/sync-lockfile-versions.ts [--dry-run] [--verbose]
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

// CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
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
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
  throw new Error('No lockfile found. Supported: pnpm-lock.yaml, yarn.lock, package-lock.json');
}

/**
 * Get installed versions from package manager
 */
function getInstalledVersions(packageManager: PackageManager): ProjectInfo[] {
  log(`Getting installed versions using ${packageManager}...`);

  let command: string;
  switch (packageManager) {
    case 'pnpm':
      command = 'pnpm list --json --depth 0 --recursive';
      break;
    case 'npm':
      command = 'npm list --json --depth 0 --workspaces --all';
      break;
    case 'yarn':
      command = 'yarn list --json --depth 0';
      break;
  }

  const output = execSync(command, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  return parseListOutput(packageManager, output);
}

/**
 * Parse package manager list output to unified format
 */
function parseListOutput(packageManager: PackageManager, output: string): ProjectInfo[] {
  const parsed = JSON.parse(output);

  switch (packageManager) {
    case 'pnpm':
      return parsePnpmList(parsed);
    case 'npm':
      return parseNpmList(parsed);
    case 'yarn':
      return parseYarnList(parsed);
  }
}

function parsePnpmList(data: any[]): ProjectInfo[] {
  return data.map((project) => ({
    name: project.name,
    path: project.path,
    dependencies: project.dependencies || {},
    devDependencies: project.devDependencies || {},
  }));
}

function parseNpmList(data: any): ProjectInfo[] {
  // npm list with workspaces returns nested structure
  const projects: ProjectInfo[] = [];

  function extractProject(pkg: any, pkgPath: string) {
    projects.push({
      name: pkg.name,
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
      if (typeof info === 'object' && (info as any).version) {
        extractProject(info, (info as any).path || path.join(process.cwd(), 'node_modules', name));
      }
    }
  }

  return projects;
}

function convertNpmDeps(deps: Record<string, any>): Record<string, DependencyInfo> {
  const result: Record<string, DependencyInfo> = {};
  for (const [name, info] of Object.entries(deps)) {
    if (typeof info === 'object' && info.version) {
      result[name] = { version: info.version };
    }
  }
  return result;
}

function parseYarnList(data: any): ProjectInfo[] {
  // Yarn list output varies by version, implement as needed
  // For now, basic implementation
  const trees = Array.isArray(data) ? data : data.data?.trees || [];

  const rootDeps: Record<string, DependencyInfo> = {};
  for (const tree of trees) {
    const match = tree.name?.match(/^(.+)@(.+)$/);
    if (match) {
      rootDeps[match[1]] = { version: match[2] };
    }
  }

  return [{
    name: 'root',
    path: process.cwd(),
    dependencies: rootDeps,
    devDependencies: {},
  }];
}

/**
 * Sync a package.json file to lockfile versions
 */
function syncPackageJson(
  packageJsonPath: string,
  installedDeps: Record<string, DependencyInfo>,
  installedDevDeps: Record<string, DependencyInfo>
): SyncResult {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  const changes: SyncResult['changes'] = [];

  // Sync dependencies
  if (pkg.dependencies) {
    for (const [dep, currentRange] of Object.entries(pkg.dependencies)) {
      const installed = installedDeps[dep];
      if (installed && !installed.version.startsWith('link:')) {
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
      if (installed && !installed.version.startsWith('link:')) {
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
    console.log('💡 Run without --dry-run to apply changes');
    process.exit(0);
  }

  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
  console.log(`✅ Synced ${totalChanges} dependencies across ${results.length} package(s)`);
}

main();
