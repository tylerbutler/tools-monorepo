# Performance Monitoring Setup Guide

Complete performance measurement and benchmarking system for the CCL Test Viewer SvelteKit application.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Performance Check

```bash
# Quick check (bundle analysis only)
npm run perf:quick

# Full audit (includes Lighthouse)
npm run perf:audit

# Open performance dashboard
npm run perf:dashboard
```

### 3. Development Workflow

```bash
# Watch mode - runs checks on file changes
npm run perf:watch

# Compare branches
npm run perf:compare main feature-branch
```

## System Overview

### Components

1. **Lighthouse CI** - Automated performance auditing
2. **Bundle Analyzer** - Build size tracking and optimization
3. **Web Vitals Monitoring** - Runtime performance metrics
4. **Performance Dashboard** - Visualization and reporting
5. **CI/CD Integration** - Automated regression detection
6. **Development Tools** - Local performance workflows

### Performance Budgets

| Metric | Target | Threshold |
|--------|--------|-----------|
| Performance Score | ≥90 | <85 fails CI |
| Bundle Size | <1MB | >1MB fails CI |
| LCP | <2.5s | >4s fails CI |
| CLS | <0.1 | >0.25 fails CI |
| FID | <100ms | >300ms fails CI |

## Usage Guide

### Development Commands

```bash
# Performance checks
npm run perf:check        # Basic check (build + bundle)
npm run perf:quick        # Quick check (no Lighthouse)
npm run perf:audit        # Full audit with Lighthouse
npm run perf:watch        # Watch mode for development

# Analysis tools
npm run perf:bundle       # Bundle analysis only
npm run perf:report       # Generate detailed report
npm run perf:dashboard    # Open dashboard

# Comparison tools
npm run perf:compare      # Compare current with main
npm run perf:compare main feature-branch  # Compare specific branches
```

### CI/CD Integration

The GitHub Actions workflow automatically:

- Runs performance audits on PRs and main branch pushes
- Detects performance regressions
- Comments on PRs with performance results
- Stores historical performance data
- Sends alerts for critical regressions

### SvelteKit Integration

Performance monitoring is automatically integrated into your SvelteKit app:

```javascript
// In your components
import { markTestDataLoaded, timeOperation, CCLPerformance } from '$lib/performance.js';

// Mark when data is loaded
markTestDataLoaded();

// Time expensive operations
const results = await timeOperation('search-tests', () => searchTests(query));

// CCL-specific helpers
const filteredTests = CCLPerformance.trackFilter('category', () => filterByCategory(tests));
```

## File Structure

```
performance/
├── scripts/
│   ├── analyze-bundle.js       # Bundle size analysis
│   ├── collect-metrics.js      # Runtime metrics collection
│   ├── performance-ci.js       # CI regression detection
│   ├── generate-report.js      # Report generation
│   └── dev-workflow.js         # Development tools
├── configs/
│   └── budgets.json           # Performance budgets
├── dashboard/
│   ├── index.html             # Performance dashboard
│   ├── dashboard.js           # Dashboard logic
│   └── styles.css             # Dashboard styles
└── utils/                     # Utility functions

perf-data/                     # Historical performance data
├── lighthouse-reports/        # Lighthouse audit results
├── bundles/                   # Bundle analysis data
├── reports/                   # Generated reports
└── vitals/                    # Web vitals data

src/lib/performance.js         # SvelteKit integration
src/hooks.client.js           # Client-side initialization
.lighthouserc.js              # Lighthouse CI configuration
.github/workflows/performance.yml  # CI/CD workflow
```

## Configuration

### Performance Budgets

Edit `performance/configs/budgets.json`:

```json
{
  "resourceSizes": [
    {"resourceType": "script", "budget": 400},
    {"resourceType": "total", "budget": 1000}
  ],
  "timings": [
    {"metric": "largest-contentful-paint", "budget": 2500},
    {"metric": "cumulative-layout-shift", "budget": 0.1}
  ]
}
```

### Lighthouse Configuration

Edit `.lighthouserc.js`:

```javascript
module.exports = {
  ci: {
    collect: {
      staticDistDir: './build',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}]
      }
    }
  }
};
```

### CI/CD Secrets

Required GitHub secrets:

- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI GitHub app token
- `SLACK_WEBHOOK_URL` - Optional Slack notifications

## Dashboard

Access the performance dashboard at `performance/dashboard/index.html` or run:

```bash
npm run perf:dashboard
```

### Dashboard Features

- **Current Metrics** - Latest performance scores
- **Historical Trends** - Performance over time
- **Bundle Analysis** - Size breakdown and trends
- **Performance Budgets** - Budget compliance status
- **Recommendations** - Optimization suggestions
- **Static Data Analysis** - CCL-specific metrics

## Optimization Recommendations

### For CCL Test Viewer (436KB Static Data)

1. **Data Loading Optimization**
   ```javascript
   // Implement progressive loading
   const categories = await CCLPerformance.trackCategoryLoad('main', loadCategories);

   // Lazy load search index
   const searchIndex = await import('./search-index.json');
   ```

2. **Bundle Optimization**
   ```javascript
   // Code splitting for routes
   export const load = async () => {
     const { heavyComponent } = await import('./HeavyComponent.svelte');
     return { component: heavyComponent };
   };
   ```

3. **Caching Strategy**
   ```javascript
   // Service worker for static data
   self.addEventListener('fetch', event => {
     if (event.request.url.includes('categories.json')) {
       event.respondWith(caches.match(event.request));
     }
   });
   ```

## Troubleshooting

### Common Issues

1. **Server not starting for Lighthouse**
   ```bash
   # Check if port 4173 is available
   lsof -i :4173

   # Kill existing process
   kill -9 $(lsof -ti:4173)
   ```

2. **Bundle analysis failing**
   ```bash
   # Ensure build exists
   npm run build

   # Run bundle analysis
   npm run perf:bundle
   ```

3. **Dashboard not loading data**
   ```bash
   # Generate sample data
   npm run perf:audit

   # Check data files
   ls -la perf-data/
   ```

### Debug Mode

Enable debug logging:

```bash
DEBUG=performance:* npm run perf:audit
```

## Performance Targets

### CCL Test Viewer Specific

Given the 366 tests across 12 categories with 436KB static data:

- **Initial Load**: <3s on 3G
- **Test Search**: <200ms for any query
- **Category Switch**: <150ms
- **Test Render**: <100ms for 50 tests
- **Bundle Size**: <500KB (excluding static data)

### Monitoring Schedule

- **PR Checks**: Every pull request
- **Daily Audits**: 6 AM UTC
- **Weekly Reports**: Monday 6 AM UTC
- **Regression Alerts**: Immediate via Slack

## Advanced Configuration

### Custom Metrics

Add CCL-specific metrics:

```javascript
// In your components
import { performanceCollector } from '$lib/performance.js';

// Custom timing
performanceCollector.startMeasure('test-parsing');
parseTestResults(data);
performanceCollector.endMeasure('test-parsing');
```

### Performance Budgets

Define custom budgets:

```javascript
import { PerformanceBudget } from '$lib/performance.js';

const customBudget = new PerformanceBudget({
  testParsingTime: 50,
  searchResponseTime: 100,
  categoryLoadTime: 200
});
```

### CI/CD Customization

Modify `.github/workflows/performance.yml` for:

- Different audit frequency
- Custom performance thresholds
- Integration with other tools
- Deployment-specific checks

---

This performance monitoring system provides comprehensive tracking and optimization guidance for the CCL Test Viewer application, ensuring optimal user experience while maintaining development velocity.