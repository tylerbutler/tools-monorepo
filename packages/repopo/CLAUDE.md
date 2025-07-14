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
4. Add to `src/policies.ts` exports
5. Create tests following existing patterns

### Auto-fix Capabilities
- Policies should implement auto-fix when feasible
- Return `PolicyFixResult` with `resolved: boolean`
- Use existing utilities like `updatePackageJsonFile` for common operations

### Configuration
- Policies can accept configuration through `PolicyConfig.policySettings`
- Configuration is passed as `config` parameter to handler function
- Use TypeScript interfaces to define settings structure

## Planned New Policies

### High Priority - Repository Structure & Security

#### 1. `RequiredGitignorePatterns`
- **Purpose**: Ensure standard gitignore entries exist (node_modules, .env*, dist/, etc.)
- **File**: `src/policies/RequiredGitignorePatterns.ts`
- **Match**: `/.gitignore$/`
- **Auto-fix**: Yes - append missing patterns
- **Config**: Array of required patterns with optional comments

#### 2. `LicenseFileExists`
- **Purpose**: Verify LICENSE file exists in repository root
- **File**: `src/policies/LicenseFileExists.ts`
- **Match**: Repository root only
- **Auto-fix**: No (requires user decision on license type)
- **Config**: Optional - accepted license file names

#### 3. `NoLargeBinaryFiles`
- **Purpose**: Prevent large binary files from being committed
- **File**: `src/policies/NoLargeBinaryFiles.ts`
- **Match**: All files
- **Auto-fix**: No (suggests git-lfs or removal)
- **Config**: Size threshold (default 10MB), file type exclusions

### Medium Priority - Documentation & Standards

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

## Implementation Plan

### Phase 1: Core Infrastructure Policies
1. **`RequiredGitignorePatterns`** - Foundation for repository security
2. **`LicenseFileExists`** - Essential for open source compliance
3. Create comprehensive tests for both policies

### Phase 2: File Management
1. **`NoLargeBinaryFiles`** - Prevent repository bloat
2. **`RequiredConfigFiles`** - Standardize project setup
3. Integration testing and documentation updates

### Phase 3: Documentation Standards
1. **`ReadmeStructure`** - Improve project documentation
2. Performance optimization and policy refinement
3. Update exports in `src/policies.ts`

## Key Considerations

### ESLint Overlap Avoidance
Focus on file-system level concerns that ESLint cannot address:
- Non-JavaScript files (.gitignore, LICENSE, README)
- Repository structure and organization
- Binary file management
- Cross-project standardization

### Testing Strategy
- Follow existing test patterns in project
- Test both policy detection and auto-fix functionality
- Include edge cases (missing files, malformed content)
- Performance tests for large repositories

### Documentation Requirements
- Update README.md with new policy descriptions
- Add configuration examples
- Document auto-fix capabilities
- Include migration notes for existing repositories

## File Locations

### Key Files for Implementation
- `src/policies/` - New policy implementations
- `src/policies.ts` - Policy exports
- `src/makePolicy.ts` - Core policy definition utilities
- `src/policyDefiners/` - Specialized policy helpers
- Test files following existing patterns

### Configuration
- `repopo.config.ts` - User configuration file
- Policies configured via `policySettings` object
- Support for file exclusions via `excludeFiles` arrays