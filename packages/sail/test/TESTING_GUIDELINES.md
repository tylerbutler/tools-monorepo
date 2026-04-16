# Testing Guidelines for Sail

## Overview
This document outlines the testing standards and practices for the Sail project during refactoring.

## Testing Framework
- **Unit Tests**: Vitest for fast, isolated unit tests
- **Integration Tests**: Mocha for complex integration scenarios
- **Coverage**: Minimum 80% line coverage required

## Test Structure

### Directory Organization
```
test/
├── helpers/           # Test utilities and builders
│   └── testUtils.ts   # Mock objects and helper functions
├── unit/              # Unit tests (1:1 with src files)
│   ├── core/
│   │   ├── buildGraph.test.ts
│   │   ├── taskDefinitions.test.ts
│   │   └── tasks/
│   │       └── taskFactory.test.ts
│   └── common/
├── integration/       # Integration tests
│   ├── build-scenarios/
│   └── error-handling/
└── fixtures/          # Test data and mock files
    ├── package-examples/
    └── config-examples/
```

## Naming Conventions
- Unit test files: `*.test.ts`
- Integration test files: `*.integration.test.ts`
- Mock files: `*.mock.ts`
- Test data: `*.fixture.ts`

## Test Standards

### Unit Tests
- **Isolation**: Each test should be independent
- **Fast**: Unit tests should run quickly (< 100ms each)
- **Focused**: Test one specific behavior per test
- **Descriptive**: Use clear test names that describe the behavior

### Test Structure Pattern
```typescript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should behave correctly when given valid input", () => {
      // Arrange
      const input = TestDataBuilder.createValidInput();
      
      // Act
      const result = component.methodName(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });

    it("should throw error when given invalid input", () => {
      // Arrange
      const invalidInput = TestDataBuilder.createInvalidInput();
      
      // Act & Assert
      expect(() => component.methodName(invalidInput))
        .toThrow("Expected error message");
    });
  });
});
```

## Mock Strategy

### When to Mock
- External dependencies (file system, network, git)
- Complex internal dependencies between modules
- Time-dependent operations
- Resource-intensive operations

### Mock Creation
- Use TestDataBuilder class for consistent mock objects
- Keep mocks simple and focused
- Document mock behavior when complex

### Test Data
- Use TestDataBuilder for creating test objects
- Keep test data minimal but realistic
- Use fixtures for complex test scenarios

## Coverage Requirements

### Minimum Coverage
- **Line Coverage**: 80%
- **Function Coverage**: 90%
- **Branch Coverage**: 75%

### Critical Areas (90%+ coverage required)
- BuildGraphPackage class
- Task creation and dependency resolution
- Configuration parsing and merging
- Error handling paths

## Testing During Refactoring

### Approach
1. **Test First**: Write tests for existing behavior before refactoring
2. **Incremental**: Test each extracted class/function separately
3. **Regression**: Ensure existing functionality remains intact
4. **Integration**: Test new interfaces work correctly together

### Refactoring Safety
- Keep existing tests passing during extraction
- Add new tests for extracted components
- Update tests only when behavior intentionally changes
- Use feature flags for major changes

## Performance Testing

### Unit Test Performance
- Individual tests should complete in < 100ms
- Full test suite should complete in < 30 seconds
- Use test.concurrent for independent tests

### Integration Test Performance
- Focus on realistic scenarios
- Mock slow operations when possible
- Use timeouts appropriately

## Error Testing

### Error Scenarios to Test
- Invalid configuration files
- Missing dependencies
- File system errors
- Git repository issues
- Build failures
- Circular dependencies

### Error Assertion Pattern
```typescript
await expect(async () => {
  await functionThatShouldThrow();
}).rejects.toThrow("Expected error message");
```

## Continuous Integration

### Test Execution
- All tests must pass before merge
- Coverage reports generated for each PR
- Performance regression detection

### Test Categories
- **Fast Tests**: Unit tests (run on every commit)
- **Slow Tests**: Integration tests (run on PR)
- **Smoke Tests**: Basic functionality (run on deploy)

## Best Practices

### Do's
- ✅ Write tests before refactoring
- ✅ Use descriptive test names
- ✅ Test edge cases and error conditions
- ✅ Keep tests simple and focused
- ✅ Use mocks for external dependencies
- ✅ Maintain high coverage on critical paths

### Don'ts
- ❌ Don't test implementation details
- ❌ Don't write overly complex tests
- ❌ Don't ignore flaky tests
- ❌ Don't skip error testing
- ❌ Don't mock everything (test real behavior when safe)

## Example Test Files

See the following for examples:
- `test/unit/core/buildGraph.test.ts` - Complex class testing
- `test/unit/core/taskDefinitions.test.ts` - Function testing
- `test/integration/build-scenarios/` - End-to-end testing

## Tools and Utilities

### Available Test Utilities
- `TestDataBuilder` - Creates mock objects and test data
- `TestHelpers` - Common assertion and utility functions
- Coverage reports via Vitest
- Debug logging for test failures

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:vitest

# Integration tests only  
npm run test:mocha

# Coverage report
npm run test:coverage

# Watch mode for development
npm run test:vitest -- --watch
```

---
*This document should be updated as testing practices evolve during the refactoring process.*