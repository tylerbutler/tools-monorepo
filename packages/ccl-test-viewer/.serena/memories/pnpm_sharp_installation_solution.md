# pnpm Sharp Installation Solution

## Problem
Sharp package fails to install with `pnpm i` on macOS due to global libvips detection causing C++ compilation errors:
- Error: `'cstdlib' file not found`
- Sharp attempts to build from source against global libvips instead of using prebuilt binaries
- Unlike npm, pnpm cannot automatically set environment variables for dependency installation scripts

## Root Cause Analysis
- Sharp expects `SHARP_IGNORE_GLOBAL_LIBVIPS=1` environment variable during installation
- pnpm lacks npm's automatic `npm_config_*` environment variable translation
- Standard pnpm configuration (.npmrc, package.json config) doesn't inject env vars into dependency scripts
- Preinstall hooks don't persist environment variables to dependency installation phase

## Solution: .pnpmfile.cjs
**File**: `.pnpmfile.cjs`
```javascript
module.exports = {
  hooks: {
    updateConfig(config) {
      // Set environment variable for Sharp during dependency installation
      process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = '1';
      return config;
    }
  }
};
```

**Why this works**:
- pnpmfile hooks run during pnpm's configuration phase, before dependency scripts
- Environment variables set in updateConfig hook persist through dependency installation
- Automatic execution - no user intervention required
- Cross-platform compatible

## Failed Approaches
1. **`.npmrc` config values**: pnpm doesn't translate to environment variables
2. **package.json env config**: Not supported by pnpm
3. **preinstall hooks**: Environment variables don't persist to dependency phase
4. **shell-emulator**: Doesn't affect dependency installation environment

## Implementation Files
- `.pnpmfile.cjs`: Core solution with updateConfig hook
- `README.md`: Simplified to just "pnpm i"
- `.npmrc`: Comment referencing automatic configuration
- `package.json`: Added cross-env dependency (for earlier attempts)

## Verification
- `pnpm i` now works without errors
- Sharp output: "sharp: Detected SHARP_IGNORE_GLOBAL_LIBVIPS, skipping search for globally-installed libvips"
- No compilation errors, uses prebuilt binaries

## Key Discovery
pnpm's `.pnpmfile.cjs` with updateConfig hook is the only reliable way to automatically set environment variables that dependency installation scripts can access, enabling transparent `pnpm i` operation without user intervention.