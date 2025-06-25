# Sail Project - Claude Context

## Outstanding Issues Todo List

### High Priority
1. **Fix TypeScript compilation errors in build.ts** - Missing Timer import and type compatibility issues
2. **Fix biome linting errors** - Remove incorrect suppression comments and add missing accessibility modifiers

### Medium Priority  
3. **Add numeric separators** to improve readability of large numbers (60000 -> 60_000)
4. **Add default case** to switch statement in buildResultString function
5. **Replace process global usage** with explicit import from node:process
6. **Add missing test files** - no test files found in test directory
7. **Fix package.json dependency versions** compatibility issues

### Low Priority
8. **Replace .length !== 0 with .length > 0** for better readability

## Project Notes
- This is a CLI tool built with oclif
- Uses TypeScript and biome for linting
- Currently has compilation errors that prevent building
- Missing test coverage entirely