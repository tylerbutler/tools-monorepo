# Issue #3 Lifecycle Error Investigation Summary

## Problem Statement
Svelte `lifecycle_outside_component` error occurring when navigating to the browse page in ccl-test-viewer, causing the page to get stuck on "Loading test data..." with console errors.

## Investigation Results

### Initial Misdiagnosis
- **Incorrect Fix Attempted**: Modified DataSourceManager constructor to remove `$effect.root()` and `$effect()` calls
- **Assumption**: Believed the lifecycle error was coming from the DataSourceManager class constructor being called at module level
- **Result**: Fix was completely ineffective - error persisted in exactly the same location

### Actual Error Source
**Stack Trace Analysis** (confirmed identical in both original and "fixed" versions):
```
Error: https://svelte.dev/e/lifecycle_outside_component
    at a (chunks/166naCj2.js:3:93)
    at o (chunks/166naCj2.js:7:323) 
    at v (chunks/166naCj2.js:7:135)
    at Tt.getOr (nodes/3.DNp2Vufv.js:349:1085)
    at ls (nodes/3.DNp2Vufv.js:349:6659)
```

**Key Findings**:
- Error originates from `Tt.getOr` function, not DataSourceManager
- Error occurs during browse page component rendering/initialization
- `ls` function appears to be calling lifecycle functions incorrectly
- Page successfully shows initialization logs but fails during final rendering

### Current Status
- **Issue #3**: UNRESOLVED - original error still occurs
- **False Fix**: Dropped stashed changes that didn't address root cause
- **Next Steps**: Need to investigate the actual `Tt.getOr` / `ls` function source

### Technical Environment
- **Framework**: Svelte 5 with runes
- **Error Context**: Browse page navigation and component initialization
- **Symptom**: Page stuck on "Loading test data..." despite successful initialization logs
- **Bundle Analysis**: Error consistent across different chunk names (build-dependent)

### Lessons Learned
1. **Verify fixes thoroughly** - Test with stash/restore to confirm actual effectiveness
2. **Stack trace analysis** - Focus on exact error location, not assumptions
3. **Build determinism** - Chunk names change but error locations remain consistent
4. **Component vs module scope** - Lifecycle errors can come from various sources, not just obvious module-level calls

### Investigation Techniques Used
- Git stash/restore to compare original vs modified behavior
- Stack trace comparison across builds
- Console log analysis and timing
- Playwright browser automation for consistent testing
- Build output analysis for chunk identification

## Recommended Next Steps
1. Investigate the compiled `Tt.getOr` function source
2. Search for any components using lifecycle functions in incorrect contexts
3. Check for third-party library compatibility issues with Svelte 5
4. Consider examining the `ls` function that appears in the stack trace