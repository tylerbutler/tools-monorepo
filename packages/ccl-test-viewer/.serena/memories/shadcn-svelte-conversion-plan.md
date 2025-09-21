# shadcn-svelte Conversion - Updated Executable Task Plan

## 🎯 Epic Overview
**Convert ccl-test-viewer from custom UI components to shadcn-svelte**
- **Total Estimated Effort**: 11-16 hours (updated)
- **Complexity**: Medium-High
- **Risk Level**: Medium (updated due to Tailwind v4 upgrade)
- **Strategy**: Systematic (comprehensive validation at each phase)

---

## 🚀 Phase 0: Tailwind v4 Upgrade (NEW)
**Duration**: 2-3 hours | **Dependencies**: None | **Risk**: Medium

### 0.1 Pre-upgrade Assessment
- [ ] **T0.1.1** - Backup current Tailwind configuration
  - `cp tailwind.config.js tailwind.config.js.backup`
  - `cp src/app.css src/app.css.backup`
  - **Effort**: 5 minutes | **Complexity**: Low

- [ ] **T0.1.2** - Audit current Tailwind usage
  - Document custom classes and configurations
  - Check for Tailwind v3-specific features
  - **Effort**: 30 minutes | **Complexity**: Medium

### 0.2 Tailwind v4 Installation
- [ ] **T0.2.1** - Install Tailwind v4
  - `pnpm remove tailwindcss autoprefixer postcss`
  - `pnpm add -D tailwindcss@next @tailwindcss/vite@next`
  - **Effort**: 15 minutes | **Complexity**: Medium

- [ ] **T0.2.2** - Update Vite configuration
  - Modify vite.config.ts for Tailwind v4
  - Remove PostCSS configuration if needed
  - **Effort**: 20 minutes | **Complexity**: Medium

- [ ] **T0.2.3** - Update CSS import
  - Replace Tailwind directives with v4 syntax
  - Update app.css or global CSS files
  - **Effort**: 15 minutes | **Complexity**: Medium

### 0.3 Configuration Migration
- [ ] **T0.3.1** - Convert tailwind.config.js to CSS
  - Migrate custom theme to CSS custom properties
  - Convert custom utilities to CSS
  - **Effort**: 45 minutes | **Complexity**: High

- [ ] **T0.3.2** - Update plugin configurations
  - Migrate @tailwindcss/typography and @tailwindcss/forms
  - Update any custom plugin configurations
  - **Effort**: 30 minutes | **Complexity**: Medium

### 0.4 Build System Integration
- [ ] **T0.4.1** - Test development build
  - `pnpm dev` or use build-preview workflow
  - Verify Tailwind v4 compiles correctly
  - **Effort**: 15 minutes | **Complexity**: Medium

- [ ] **T0.4.2** - Test production build
  - `pnpm build` and verify successful compilation
  - Check for any breaking changes
  - **Effort**: 15 minutes | **Complexity**: Medium

- [ ] **T0.4.3** - Visual regression testing
  - Test all pages for visual consistency
  - Fix any broken styles from v4 migration
  - **Effort**: 45 minutes | **Complexity**: High

**Phase 0 Checkpoint**: ✅ Tailwind v4 successfully installed and working

---

## 📦 Phase 1: Preparation & Setup
**Duration**: 1-2 hours | **Dependencies**: Phase 0 complete | **Risk**: Low

### 1.1 Environment Preparation
- [ ] **T1.1.1** - ~~Create feature branch for conversion~~ (COMPLETED)
- [ ] **T1.1.2** - ~~Commit current state as baseline~~ (COMPLETED)

### 1.2 shadcn-svelte Installation
- [ ] **T1.2.1** - ~~Install shadcn-svelte CLI globally~~ (COMPLETED)

- [ ] **T1.2.2** - Initialize shadcn-svelte in project
  - `npx shadcn-svelte@latest init` (now with Tailwind v4 support)
  - Configure components.json with project paths
  - **Effort**: 20 minutes | **Complexity**: Low

- [ ] **T1.2.3** - Install core dependencies
  - `pnpm install bits-ui -D`
  - Verify all peer dependencies
  - **Effort**: 15 minutes | **Complexity**: Low

### 1.3 Configuration Validation
- [ ] **T1.3.1** - Verify components.json configuration
  - Check aliases match project structure
  - Validate Tailwind CSS v4 integration
  - **Effort**: 15 minutes | **Complexity**: Low

- [ ] **T1.3.2** - Test basic shadcn-svelte installation
  - `npx shadcn-svelte@latest add button`
  - Verify component generates correctly
  - **Effort**: 15 minutes | **Complexity**: Low

**Phase 1 Checkpoint**: ✅ shadcn-svelte successfully installed and configured

---

## 🔄 Phase 2: Component Replacement
**Duration**: 4-6 hours | **Dependencies**: Phase 1 complete | **Risk**: Medium

### 2.1 Core Components (Sequential Replacement)

#### 2.1.1 Button Component
- [ ] **T2.1.1.1** - Backup existing button component
  - `cp src/lib/components/ui/button.svelte src/lib/components/ui/button.svelte.backup`
  - **Effort**: 2 minutes | **Complexity**: Low

- [ ] **T2.1.1.2** - Install shadcn-svelte button
  - `npx shadcn-svelte@latest add button --overwrite`
  - **Effort**: 5 minutes | **Complexity**: Low

- [ ] **T2.1.1.3** - Compare and adjust button API
  - Compare Props interfaces between old/new
  - Update any custom styling or variants
  - **Effort**: 20 minutes | **Complexity**: Medium

- [ ] **T2.1.1.4** - Test button in isolation
  - Create test page with all button variants
  - Verify visual consistency
  - **Effort**: 15 minutes | **Complexity**: Low

#### 2.1.2 Card Components
- [ ] **T2.1.2.1** - Backup existing card components
  - Backup card.svelte, card-header.svelte, etc.
  - **Effort**: 5 minutes | **Complexity**: Low

- [ ] **T2.1.2.2** - Install shadcn-svelte card
  - `npx shadcn-svelte@latest add card --overwrite`
  - **Effort**: 5 minutes | **Complexity**: Low

- [ ] **T2.1.2.3** - Update card component structure
  - Verify Card, CardHeader, CardContent, etc. match usage
  - **Effort**: 25 minutes | **Complexity**: Medium

- [ ] **T2.1.2.4** - Test card components
  - Test all card variations used in app
  - **Effort**: 15 minutes | **Complexity**: Low

#### 2.1.3 Form Components (Input, Checkbox)
- [ ] **T2.1.3.1** - Replace input component
  - `npx shadcn-svelte@latest add input --overwrite`
  - **Effort**: 15 minutes | **Complexity**: Low

- [ ] **T2.1.3.2** - Replace checkbox component
  - `npx shadcn-svelte@latest add checkbox --overwrite`
  - **Effort**: 15 minutes | **Complexity**: Low

- [ ] **T2.1.3.3** - Test form components
  - Verify form behavior and styling
  - **Effort**: 20 minutes | **Complexity**: Medium

#### 2.1.4 Badge Component
- [ ] **T2.1.4.1** - Replace badge component
  - `npx shadcn-svelte@latest add badge --overwrite`
  - **Effort**: 10 minutes | **Complexity**: Low

- [ ] **T2.1.4.2** - Test badge variants
  - Verify all badge styles work correctly
  - **Effort**: 10 minutes | **Complexity**: Low

### 2.2 Component Index Updates
- [ ] **T2.2.1** - Update src/lib/components/ui/index.ts
  - Ensure all new components are properly exported
  - **Effort**: 10 minutes | **Complexity**: Low

**Phase 2 Checkpoint**: ✅ All UI components replaced with shadcn-svelte versions

---

## 🔗 Phase 3: Application Integration
**Duration**: 2-3 hours | **Dependencies**: Phase 2 complete | **Risk**: Medium

### 3.1 Import Statement Updates

#### 3.1.1 Systematic Import Replacement
- [ ] **T3.1.1.1** - Find all UI component imports
  - `grep -r "from.*components/ui" src/` to find all imports
  - **Effort**: 15 minutes | **Complexity**: Low

- [ ] **T3.1.1.2** - Update component imports (Batch 1)
  - Update 5 application components with new imports
  - **Effort**: 30 minutes | **Complexity**: Medium

- [ ] **T3.1.1.3** - Update component imports (Batch 2)
  - Update remaining 10 application components
  - **Effort**: 45 minutes | **Complexity**: Medium

### 3.2 Component Usage Validation
- [ ] **T3.2.1** - Test component props compatibility
  - Verify all existing props work with new components
  - **Effort**: 30 minutes | **Complexity**: Medium

- [ ] **T3.2.2** - Fix prop mismatches
  - Update any incompatible prop usage
  - **Effort**: 20 minutes | **Complexity**: Medium

### 3.3 Build System Integration
- [ ] **T3.3.1** - Test development build
  - Use build-preview workflow to verify no build errors
  - **Effort**: 10 minutes | **Complexity**: Low

- [ ] **T3.3.2** - Test production build
  - `pnpm build` and verify successful compilation
  - **Effort**: 10 minutes | **Complexity**: Low

**Phase 3 Checkpoint**: ✅ Application successfully uses shadcn-svelte components

---

## 🧪 Phase 4: Testing & Validation
**Duration**: 2-3 hours | **Dependencies**: Phase 3 complete | **Risk**: Low

### 4.1 Visual Testing
- [ ] **T4.1.1** - Component visual regression testing
  - Test all pages for visual consistency
  - **Effort**: 45 minutes | **Complexity**: Medium

- [ ] **T4.1.2** - Mobile responsiveness validation
  - Test responsive behavior on mobile devices
  - **Effort**: 30 minutes | **Complexity**: Medium

- [ ] **T4.1.3** - Browser compatibility testing
  - Test in Chrome, Firefox, Safari
  - **Effort**: 30 minutes | **Complexity**: Low

### 4.2 Functional Testing
- [ ] **T4.2.1** - Manual user flow testing
  - Test critical user journeys
  - **Effort**: 30 minutes | **Complexity**: Medium

- [ ] **T4.2.2** - Run existing test suites
  - `pnpm test` (unit tests)
  - `pnpm test:e2e` (E2E tests)
  - **Effort**: 20 minutes | **Complexity**: Low

### 4.3 Performance Validation
- [ ] **T4.3.1** - Bundle size comparison
  - Compare before/after bundle sizes
  - **Effort**: 15 minutes | **Complexity**: Low

- [ ] **T4.3.2** - Performance metrics validation
  - Verify no performance regressions
  - **Effort**: 15 minutes | **Complexity**: Low

**Phase 4 Checkpoint**: ✅ All tests pass and performance is maintained

---

## 🧹 Phase 5: Cleanup & Finalization
**Duration**: 1 hour | **Dependencies**: Phase 4 complete | **Risk**: Low

### 5.1 Code Cleanup
- [ ] **T5.1.1** - Remove backup files
  - Delete all .backup files created during conversion
  - **Effort**: 10 minutes | **Complexity**: Low

- [ ] **T5.1.2** - Update documentation
  - Update any component documentation
  - **Effort**: 20 minutes | **Complexity**: Low

### 5.2 Final Validation
- [ ] **T5.2.1** - Run complete test suite
  - Final validation of all functionality
  - **Effort**: 15 minutes | **Complexity**: Low

- [ ] **T5.2.2** - Code quality checks
  - `pnpm check` (TypeScript + Svelte + formatting)
  - **Effort**: 10 minutes | **Complexity**: Low

### 5.3 Git Integration
- [ ] **T5.3.1** - Commit conversion changes
  - `git add . && git commit -m "feat: convert to shadcn-svelte components with Tailwind v4"`
  - **Effort**: 5 minutes | **Complexity**: Low

**Phase 5 Checkpoint**: ✅ Conversion complete and ready for merge

---

## 🛡️ Risk Mitigation & Rollback Strategy

### Updated Rollback Points
1. **After Phase 0**: Revert to baseline commit (before Tailwind v4)
2. **After Phase 1**: Rollback Tailwind v4 changes, restore v3
3. **After Phase 2**: Restore individual component backups
4. **After Phase 3**: Git branch reset to Phase 2 completion
5. **After Phase 4**: Full branch rollback available

### Critical Dependencies
- Ensure Tailwind v4 compatibility with existing build system
- Verify `bits-ui` compatibility with current Svelte version
- Maintain existing component API contracts where possible
- Test Tailwind v4 migration thoroughly before shadcn-svelte installation

### Quality Gates
- Each phase must pass its checkpoint before proceeding
- Build must succeed after Tailwind v4 upgrade
- Visual regression testing at each major milestone
- Use build-preview workflow for all testing (dev server has issues)

## 📊 Updated Task Summary
- **Total Tasks**: 50+ discrete, actionable tasks
- **Phases**: 6 sequential phases (added Phase 0)
- **Effort Range**: 11-16 hours total (updated)
- **Complexity Distribution**: 60% Low, 30% Medium, 10% High
- **Risk Mitigation**: Multiple rollback points and validation checkpoints

## 🚀 Execution Notes
- Execute phases sequentially, completing all tasks in a phase before proceeding
- Phase 0 (Tailwind v4) is now critical prerequisite for shadcn-svelte latest
- Use build-preview workflow (`pnpm build && pnpm preview`) instead of dev server for testing
- Maintain frequent commits for granular rollback capability
- Validate each checkpoint before proceeding to next phase
- Pay special attention to Tailwind v4 migration - this is the highest risk phase