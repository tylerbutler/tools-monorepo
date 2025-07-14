# Repopo Project Analysis & Implementation Plan

## Project Overview

Repopo is an extensible tool for enforcing file-based policies across git repositories. It serves as a "lint tool for any file in your git repo" with a straightforward way to write custom policies.

## Key Architecture Patterns

### Policy Definition Structure
- **File**: `src/policies/*.ts` - Individual policy implementations
- **Pattern**: Policies use `makePolicyDefinition(name, regex, handler)` or specialized definers
- **Handler**: Returns `true` (pass), `PolicyFailure`, or `PolicyFixResult`
- **Auto-fix**: Policies can optionally fix violations when `resolve: true`

### Policy Types
1. **File-based policies**: Use `makePolicyDefinition` with regex matching
2. **Package.json policies**: Use `definePackagePolicy` helper
3. **File header policies**: Use `defineFileHeaderPolicy` helper

### Existing Policy Categories
- **File Headers**: `JsTsFileHeaders`, `HtmlFileHeaders` - copyright/license enforcement
- **Package.json**: `PackageJsonProperties`, `PackageJsonSorted`, `PackageReadmeExists` - metadata consistency
- **File Extensions**: `NoJsFileExtensions` - enforce explicit `.mjs`/`.cjs` extensions

## Implementation Guidelines

### Policy Creation Process
1. Create policy file in `src/policies/`
2. Use appropriate policy definer (`makePolicyDefinition`, `definePackagePolicy`, etc.)
3. Export policy definition
4. Add to `src/policies.ts` exports (alphabetical order)
5. Create comprehensive tests in `test/policies/`
6. Handle file path resolution: use `root ? \`${root}/${file}\` : file`
7. Keep complexity low - extract helper functions to reduce cognitive complexity

### Auto-fix Capabilities
- Policies should implement auto-fix when feasible
- Return `PolicyFixResult` with `resolved: boolean`
- Use existing utilities like `updatePackageJsonFile` for common operations

### Configuration
- Policies can accept configuration through `PolicyConfig.policySettings`
- Configuration is passed as `config` parameter to handler function
- Use TypeScript interfaces to define settings structure

## Implemented Policies

### Repository Structure & Security

#### 1. `RequiredGitignorePatterns` ✅
- **Purpose**: Ensure standard gitignore entries exist (node_modules, .env*, dist/, etc.)
- **File**: `src/policies/RequiredGitignorePatterns.ts`
- **Match**: `/^\.gitignore$/`
- **Auto-fix**: Yes - append missing patterns with comments
- **Config**: Array of required patterns with optional comments
- **Implementation Notes**: Refactored for low complexity using helper functions

#### 2. `LicenseFileExists` ✅
- **Purpose**: Verify LICENSE file exists in repository root
- **File**: `src/policies/LicenseFileExists.ts`
- **Match**: Repository root files (triggers on package.json, *.md files)
- **Auto-fix**: No (requires user decision on license type)
- **Config**: Optional - accepted license file names (supports LICENSE, LICENCE variants)

#### 3. `NoLargeBinaryFiles` ✅
- **Purpose**: Prevent large binary files from being committed
- **File**: `src/policies/NoLargeBinaryFiles.ts`  
- **Match**: All files (`/.*/)
- **Auto-fix**: No (suggests git-lfs or removal)
- **Config**: Size threshold (default 10MB), file type exclusions, glob patterns
- **Implementation Notes**: Uses `k ** i` instead of `Math.pow`, handles unused variables with `_error`

### Future Policy Ideas

#### 4. `ReadmeStructure`
- **Purpose**: Ensure README.md contains required sections
- **File**: `src/policies/ReadmeStructure.ts`
- **Match**: `/README\.md$/i`
- **Auto-fix**: Partial (can add missing sections with templates)
- **Config**: Required sections, section order

#### 5. `RequiredConfigFiles`
- **Purpose**: Ensure essential config files exist
- **File**: `src/policies/RequiredConfigFiles.ts`
- **Match**: Repository root
- **Auto-fix**: Yes (create from templates)
- **Config**: List of required files (.editorconfig, tsconfig.json, etc.)

#### 6. `SecurityTxtExists`
- **Purpose**: Ensure `.well-known/security.txt` exists for security disclosure
- **Auto-fix**: Yes (create from template)

## Implementation Notes & Lessons Learned

### Common Gotchas
1. **File Path Resolution**: Always use `root ? \`${root}/${file}\` : file` pattern
2. **Unused Variables**: Prefix with `_` for catch blocks: `catch (_error: unknown)`
3. **Template Literals**: Biome prefers `\`${pattern} \`` over `pattern + " "`
4. **Block Statements**: Wrap single-line if returns in braces
5. **Complexity**: Extract helper functions to keep cognitive complexity under 15
6. **Test Imports**: Include `afterEach` in imports for cleanup

### Code Quality Standards
- Use `k ** i` instead of `Math.pow(k, i)`
- Use `for...of` loops instead of `forEach` in tests
- Always clean up temporary directories in tests
- Test file path edge cases and missing file scenarios
- Include comprehensive error handling tests

### Architecture Patterns
- Break large policy handlers into focused helper functions
- Use descriptive function names that explain intent
- Keep the main policy handler simple and delegating
- Follow existing naming conventions in codebase

## Key Considerations

### ESLint Overlap Avoidance
Focus on file-system level concerns that ESLint cannot address:
- Non-JavaScript files (.gitignore, LICENSE, README)
- Repository structure and organization
- Binary file management
- Cross-project standardization

### Testing Strategy
- Use Vitest framework with `afterEach`, `beforeEach`, `describe`, `expect`, `it`
- Create temporary directories in tests: `tmpdir()` + unique names
- Clean up with `rmSync(testDir, { recursive: true, force: true })`
- Test both policy detection and auto-fix functionality
- Include edge cases (missing files, malformed content, file path resolution)
- Use `for...of` loops instead of `forEach` for test generation
- Test configuration variations and error handling

### Documentation Requirements
- Update README.md with new policy descriptions
- Add configuration examples
- Document auto-fix capabilities
- Include migration notes for existing repositories

## File Locations

### Key Files for Implementation
- `src/policies/` - New policy implementations
- `src/policies.ts` - Policy exports (alphabetical order)
- `src/makePolicy.ts` - Core policy definition utilities
- `src/policyDefiners/` - Specialized policy helpers
- `test/policies/` - Comprehensive test suites
- `vitest.config.ts` - Test configuration

### Configuration
- `repopo.config.ts` - User configuration file
- Policies configured via `policySettings` object
- Support for file exclusions via `excludeFiles` arrays
- Interface definitions for type safety

### Quality Assurance Checklist
- [ ] Run `npm run compile` - no TypeScript errors
- [ ] Run `npm run lint` - no linting errors  
- [ ] Run `npx vitest run` - all tests pass
- [ ] Test file path resolution edge cases
- [ ] Test auto-fix functionality where applicable
- [ ] Keep cognitive complexity under 15
- [ ] Update exports in `src/policies.ts`