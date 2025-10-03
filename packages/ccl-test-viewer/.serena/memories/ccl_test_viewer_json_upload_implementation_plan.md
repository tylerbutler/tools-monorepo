# CCL Test Viewer: Dynamic JSON Upload Implementation Plan

## Project Overview
Transform the CCL Test Viewer from a build-time static site to support runtime JSON upload with multi-file capabilities and GitHub URL loading, while maintaining Tauri desktop app compatibility.

## Current Architecture Analysis
- **Build System**: SvelteKit 2.9.1 with static adapter for Netlify
- **Data Pipeline**: `scripts/sync-data.ts` processes ccl-test-data at build time
- **Generated Assets**: Static JSON files in `src/lib/data/` and `static/data/`
- **UI Framework**: Svelte 5 with TailwindCSS and shadcn-svelte components
- **Data Flow**: Build-time JSON → TypeScript types → Static stores → Components

## Implementation Phases

### Phase 1: Svelte 5 Multi-File Upload Component
**Install Dependencies:**
- `svelte-dropzone-runes` (Svelte 5-compatible drag-and-drop)
- Additional validation utilities as needed

**Create Upload Component:**
- `src/lib/components/MultiFileUpload.svelte` - Core upload interface
- Support for multiple JSON file selection
- Drag-and-drop with file validation
- Progress indicators and error handling
- File queue management (add/remove before processing)

### Phase 2: Dynamic Data Store Architecture
**New Store Structure:**
- `src/lib/stores/uploadedDataSets.ts` - Multi-source data management
- `src/lib/stores/dataSourceManager.ts` - Source switching and merging logic

**Data Source Types:**
```typescript
type DataSourceType = 'static' | 'uploaded' | 'github' | 'url';

interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  filename?: string;
  url?: string;
  uploadedAt: Date;
  categories: TestCategory[];
  stats: TestStats;
}
```

**Smart Data Merging:**
- `src/lib/utils/dataMerger.ts` - Intelligent file combination
- Handle naming conflicts and duplicate tests
- Generate combined statistics and search indices
- Maintain source attribution for each test

### Phase 3: Enhanced UI Integration
**Upload Management Interface:**
- `src/routes/upload/+page.svelte` - Main upload page
- File source manager with active/inactive toggles
- Validation reports and error display
- Bulk operations (clear all, reload defaults)

**Browse Page Enhancements:**
- Add data source filtering to existing browse interface
- Source indicators on test cards
- Combined statistics from multiple sources
- Maintain existing search and filter functionality

**Navigation Updates:**
- Add upload route to main navigation
- Data source status in header/sidebar
- Quick source switching interface

### Phase 4: GitHub URL Loading (Stretch Feature)
**GitHub API Integration:**
- `src/lib/services/githubLoader.ts` - GitHub API client
- Support multiple URL formats:
  - Repository folders: `https://github.com/user/repo/tree/main/tests/`
  - API endpoints: `https://api.github.com/repos/user/repo/contents/`
  - Raw files: `https://raw.githubusercontent.com/user/repo/main/file.json`

**GitHub Source Management:**
- Branch/tag selection for repositories
- Automatic refresh capabilities
- Authentication for private repositories
- Repository bookmarking and favorites

**GitHub-Specific UI:**
- URL input with validation and preview
- Repository browsing interface
- Last-fetched timestamps and refresh controls

### Phase 5: Tauri Desktop Preparation
**Filesystem Integration:**
- Add `@tauri-apps/api` and `@tauri-apps/plugin-fs`
- Native file dialog integration for multi-file selection
- Local file persistence with source tracking
- File system monitoring for automatic reloading

**Adapter Configuration:**
- Update `svelte.config.js` for dual deployment (Netlify + Tauri)
- Environment-based build configuration
- Static site generation vs. desktop app builds

**Desktop-Specific Features:**
- OAuth GitHub authentication flow
- Offline mode with cached data
- Import/export functionality for file collections

## Technical Implementation Details

### File Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── MultiFileUpload.svelte (NEW)
│   │   ├── FileSourceManager.svelte (NEW)
│   │   └── GitHubUrlInput.svelte (NEW)
│   ├── stores/
│   │   ├── uploadedDataSets.ts (NEW)
│   │   └── dataSourceManager.ts (NEW)
│   ├── services/
│   │   └── githubLoader.ts (NEW)
│   └── utils/
│       ├── dataMerger.ts (NEW)
│       └── dataValidation.ts (NEW)
├── routes/
│   ├── upload/
│   │   └── +page.svelte (NEW)
│   ├── +layout.svelte (MODIFY - add upload nav)
│   ├── +page.svelte (MODIFY - show data sources)
│   └── browse/ (MODIFY - add source filtering)
```

### Recommended Svelte 5 Upload Library
**svelte-dropzone-runes** - Specifically designed for Svelte 5 with runes syntax
- GitHub: https://github.com/Truirer/svelte-dropzone-runes
- Features: Lightweight, fully-typed, performance-optimized
- Compatible with $props() and Svelte 5 patterns
- Example usage:
```svelte
<script lang="ts">
  import Dropzone, { type DropzoneEvent, type RejectedFile } from 'svelte-dropzone-runes';
  
  let files = $state({ 
    acceptedFiles: [] as File[], 
    rejectedFiles: [] as RejectedFile<File>[] 
  });
  
  function handleFilesSelect(e: DropzoneEvent<File>) {
    files = e;
  }
</script>

<Dropzone onDrop={handleFilesSelect} />
```

### Tauri File APIs
**Core Tauri Packages for File Handling:**
- `@tauri-apps/plugin-fs` - File system operations
- `@tauri-apps/plugin-upload` - HTTP-based file uploads
- `@tauri-apps/api` - Core Tauri APIs including dialogs

**File System Capabilities:**
- Read/write binary and text files
- File dialogs for native file selection
- Scoped filesystem access with base directories
- Support for standard directories ($DOCUMENT, $DOWNLOAD, etc.)

### Key Features
- **Multi-File Upload**: Handle 5-10+ JSON files simultaneously
- **Smart Merging**: Combine test categories with conflict resolution
- **Source Tracking**: Maintain attribution for each test
- **GitHub Integration**: Load data directly from repositories
- **Tauri Ready**: Desktop app compatibility foundation
- **Backward Compatibility**: Existing static data remains functional

### Development Workflow
1. Maintain existing `npm run build` and `npm run sync-data` workflows
2. Add development mode for testing uploaded data
3. Preserve all existing functionality during implementation
4. Enable progressive enhancement (start with basic upload, add features)

## Success Criteria
- ✅ Upload multiple JSON files via drag-and-drop
- ✅ View combined data from multiple sources in existing UI
- ✅ Load test data directly from GitHub URLs
- ✅ Maintain all existing static site functionality
- ✅ Prepare foundation for Tauri desktop distribution
- ✅ Preserve backward compatibility with current build system

## Implementation Priority
1. **Phase 1**: Multi-file upload component (core functionality)
2. **Phase 2**: Dynamic data stores (data management)
3. **Phase 3**: UI integration (user experience)
4. **Phase 4**: GitHub URL loading (stretch feature)
5. **Phase 5**: Tauri preparation (desktop distribution)

This plan maintains the current static site capabilities while adding dynamic data loading features that prepare the application for desktop distribution via Tauri.