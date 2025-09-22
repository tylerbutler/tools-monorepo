# Drag-and-Drop Upload Issue Resolution

## Problem Summary
Files upload successfully via drag-and-drop on the data page but don't appear in the "Current Data Sources" list and are removed on navigation.

## Root Cause Identified
**Validation Format Mismatch**: The upload validation system expects a different data format than what users provide according to the CCL schema.

### Technical Details

**Current Validation Expectation** (`validateTestData()` in `src/lib/utils/dataMerger.ts`):
```javascript
// Expects: Array of test objects directly
[
  {
    "name": "test_name",
    "input": "ccl input",
    "expected": { "count": 1, ... },
    ...
  }
]
```

**Actual CCL Schema Format** (`../../../ccl-test-data/schemas/generated-format.json`):
```json
{
  "$schema": "ccl-test-current-flat-format",
  "tests": [
    {
      "name": "test_name",
      "input": "ccl input", 
      "validation": "parse",
      "expected": { "count": 1, ... },
      "behaviors": [],
      "variants": [],
      "features": []
    }
  ]
}
```

### Issue Flow
1. User uploads schema-compliant CCL file
2. `validateTestData()` receives object with `$schema` and `tests` properties
3. Validation fails because it expects array directly, not wrapped object
4. File processing fails silently, returns `success: false`
5. Data source not added to `dataSources` array in localStorage
6. UI shows "No Data Sources" despite successful file upload

### Evidence
- localStorage shows: `{"dataSources":[],"timestamp":"2025-09-21T23:30:53.666Z"}`
- Upload section shows "1 successful" with file details
- Console logs "File processing results: [Object]" but validation fails
- Files tested: schema-compliant format still fails validation

## Required Fix

Update `validateTestData()` function to handle CCL schema format:

```javascript
export function validateTestData(jsonData: any, filename: string): UploadValidationResult {
  // Handle CCL schema format
  if (jsonData && typeof jsonData === 'object' && jsonData.tests && Array.isArray(jsonData.tests)) {
    // Extract tests array from schema format
    jsonData = jsonData.tests;
  }
  
  // Continue with existing validation logic for array of tests
  if (!Array.isArray(jsonData)) {
    errors.push("JSON must contain an array of test objects or CCL schema format with tests array");
    // ...
  }
  // ... rest of validation
}
```

## Files Affected
- `src/lib/utils/dataMerger.ts` - `validateTestData()` function needs schema format support
- `src/lib/stores/dataSourceManager.svelte.ts` - Validation processing pipeline
- Validation should accept both formats for backward compatibility

## User Experience Impact
- Upload UI works perfectly, showing progress and success states
- Data persistence fails silently due to validation mismatch
- Users see successful upload but data disappears on navigation
- No error feedback about format expectations

## Test Cases Validated
1. ✅ Upload component accepts files and processes them
2. ✅ Files show as "successful" in upload section
3. ❌ Files don't persist to localStorage due to validation failure
4. ❌ Data sources list remains empty despite uploads
5. ✅ Schema-compliant CCL format created and tested

## Resolution Status
**IDENTIFIED** - Root cause is validation format mismatch between expected array format and CCL schema wrapper format. Fix requires updating validation logic to handle both formats.