# Sail Refactoring Action Plan

## Phase 1: Testing Foundation (2-3 weeks)

### 1.1 Setup Testing Infrastructure
- [x] Configure test environment for complex build scenarios
- [x] Add test data builders and mock utilities
- [x] Set up test coverage reporting and CI integration
- [x] Create testing guidelines document

### 1.2 Core Module Unit Tests
- [ ] **buildGraph.ts**: Test BuildGraphPackage class methods
  - [ ] Task creation logic
  - [ ] Dependency resolution algorithms
  - [ ] Package matching functionality
  - [ ] Build execution flow
- [ ] **taskDefinitions.ts**: Test configuration parsing
  - [ ] `getTaskDefinitions()` function
  - [ ] Configuration merging logic
  - [ ] Validation rules
  - [ ] Default value handling
- [ ] **taskFactory.ts**: Test task creation
  - [ ] Command type detection
  - [ ] Task handler resolution
  - [ ] Group task creation

### 1.3 Integration Tests
- [ ] End-to-end build scenarios
- [ ] Multi-package dependency scenarios
- [ ] Error handling and recovery
- [ ] Performance benchmarks

## Phase 2: Core Refactoring (4-6 weeks)

### 2.1 BuildGraphPackage Decomposition (`src/core/buildGraph.ts`)
**Target**: Break 881-line file into focused modules

#### 2.1.1 Extract TaskManager Class
- [x] Create `src/core/tasks/TaskManager.ts`
- [x] Move task creation methods
- [x] Move task lifecycle management
- [x] Move task matching logic
- [x] Update imports and dependencies

#### 2.1.2 Extract DependencyResolver Class  
- [x] Create `src/core/dependencies/DependencyResolver.ts`
- [x] Move dependency resolution algorithms
- [x] Move package matching logic
- [x] Move dependency validation
- [x] Create interfaces for dependency operations

#### 2.1.3 Extract BuildExecutor Class
- [x] Create `src/core/execution/BuildExecutor.ts`
- [x] Move build execution logic
- [x] Move worker pool management
- [x] Move file hash caching
- [x] Implement proper error handling

#### 2.1.4 Refactor BuildGraphPackage
- [x] Remove extracted responsibilities
- [x] Focus on graph structure management
- [x] Reduce constructor parameters (< 5)
- [x] Implement dependency injection
- [x] Add comprehensive tests

### 2.2 TaskDefinitions Refactoring (`src/core/taskDefinitions.ts`)
**Target**: Break down 454-line file with 135-line function

#### 2.2.1 Extract Configuration Parser
- [x] Create `src/core/config/ConfigurationParser.ts`
- [x] Move configuration parsing logic
- [x] Create focused parsing methods (< 30 lines each)
- [x] Add input validation

#### 2.2.2 Extract Configuration Merger
- [x] Create `src/core/config/ConfigurationMerger.ts`
- [x] Move configuration merging logic
- [x] Implement strategy pattern for merge types
- [x] Add conflict resolution

#### 2.2.3 Extract Script Analyzer
- [x] Create `src/core/analysis/ScriptAnalyzer.ts`
- [x] Move script analysis logic
- [x] Simplify command detection
- [x] Add dependency extraction

#### 2.2.4 Refactor getTaskDefinitions()
- [x] Split into 5-7 focused functions
- [x] Reduce nesting levels (< 3)
- [x] Improve error handling
- [x] Add comprehensive tests

### 2.3 TaskFactory Redesign (`src/core/tasks/taskFactory.ts`)
**Target**: Replace static anti-pattern with proper factory

#### 2.3.1 Create Command Strategy Interface
- [ ] Define `ICommandStrategy` interface
- [ ] Create strategy implementations:
  - [ ] `NpmRunStrategy.ts`
  - [ ] `ConcurrentlyStrategy.ts`
  - [ ] `SimpleCommandStrategy.ts`
  - [ ] `GroupTaskStrategy.ts`

#### 2.3.2 Implement Factory Pattern
- [ ] Create `TaskFactory` class (non-static)
- [ ] Implement strategy registration
- [ ] Add command type detection
- [ ] Simplify creation logic

#### 2.3.3 Extract Command Parser
- [ ] Create `src/core/parsing/CommandParser.ts`
- [ ] Move regex patterns and documentation
- [ ] Simplify concurrent command parsing
- [ ] Add comprehensive parsing tests

## Phase 3: Architecture Improvements (2-3 weeks)

### 3.1 Dependency Injection Setup
- [x] Choose DI container (or implement simple one)
- [x] Create service interfaces
- [x] Implement service registration
- [x] Update core classes to use DI

### 3.2 Interface Extraction
- [x] Create `src/core/interfaces/` directory
- [x] Extract interfaces for:
  - [x] `ITaskManager`
  - [x] `IDependencyResolver`
  - [x] `IBuildExecutor`
  - [x] `IConfigurationParser`
  - [x] `IScriptAnalyzer`

### 3.3 Error Handling Standardization
- [x] Create custom error classes
- [x] Implement error handling strategy
- [x] Add proper error propagation
- [x] Improve error messages and logging

### 3.4 Performance Optimization
- [x] Profile build performance
- [x] Optimize hot paths
- [x] Implement build caching improvements
- [x] Add performance monitoring

## Phase 4: Quality Assurance (1-2 weeks)

### 4.1 Code Quality Checks
- [ ] Run full test suite
- [ ] Verify code coverage > 80%
- [ ] Check cyclomatic complexity < 10
- [ ] Validate no files > 300 lines

### 4.2 Integration Testing
- [ ] Test with real monorepo scenarios
- [ ] Verify backward compatibility
- [ ] Performance regression testing
- [ ] Error scenario testing

### 4.3 Documentation Updates
- [ ] Update architecture documentation
- [ ] Create developer onboarding guide
- [ ] Document new interfaces and patterns
- [ ] Update README with changes

## Implementation Guidelines

### Development Standards
- **File Size Limit**: 300 lines maximum
- **Function Size Limit**: 50 lines maximum  
- **Nesting Limit**: 3 levels maximum
- **Test Coverage**: 80% minimum
- **Documentation**: JSDoc for all public interfaces

### Refactoring Safety
- **One change at a time**: Complete each task before moving to next
- **Test-driven**: Write tests before refactoring
- **Backward compatibility**: Maintain existing API contracts
- **Incremental commits**: Small, focused commits for easy rollback

### Progress Tracking
- [ ] Create GitHub issues for each major task
- [ ] Use pull requests for code review
- [ ] Track test coverage metrics
- [ ] Monitor build performance impact

## Risk Mitigation

### High-Risk Tasks
- **BuildGraphPackage refactoring**: Create comprehensive tests first
- **Task execution changes**: Extensive integration testing required
- **Dependency resolution**: Algorithm correctness critical

### Rollback Plan
- [ ] Tag current state before major changes
- [ ] Maintain feature flags for new implementations
- [ ] Keep old implementations until new ones are proven
- [ ] Document rollback procedures

## Success Criteria

### Code Quality Metrics
- ✅ No file exceeds 300 lines
- ✅ No function exceeds 50 lines  
- ✅ Test coverage above 80%
- ✅ Cyclomatic complexity below 10

### Architecture Goals
- ✅ Clear separation of concerns
- ✅ Dependency injection implemented
- ✅ Interface-based abstractions
- ✅ Reduced coupling between modules

### Performance Targets
- ✅ Build time not increased > 10%
- ✅ Memory usage not increased > 20%
- ✅ Test suite runs in < 30 seconds

---

**Estimated Total Effort**: 8-12 weeks (senior developer)
**Generated**: 2025-06-28
**Status**: Ready for execution