# Tauri Desktop Application Setup Guide

This guide covers how to set up, build, and test the CCL Test Viewer as a Tauri desktop application.

## Prerequisites

### System Requirements

**Rust Installation:**
```bash
# Install Rust (required for Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

**Platform-Specific Dependencies:**

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

**Windows:**
```powershell
# Install Microsoft Visual Studio C++ Build tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

## Tauri Project Initialization

### 1. Install Tauri CLI

```bash
# Install Tauri CLI globally
cargo install tauri-cli

# Or using npm (alternative)
npm install -g @tauri-apps/cli
```

### 2. Initialize Tauri Project

```bash
# Navigate to the project directory
cd /path/to/ccl-test-viewer

# Initialize Tauri project
cargo tauri init

# Follow the prompts:
# App name: CCL Test Viewer
# Window title: CCL Test Suite Viewer
# Web assets: ../build
# Dev server: http://localhost:4173
# Frontend dev command: npm run dev
# Frontend build command: npm run build
```

### 3. Configure Tauri

Create or update `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema.json",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:4173",
    "distDir": "../build",
    "withGlobalTauri": true
  },
  "package": {
    "productName": "CCL Test Viewer",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": true,
        "ask": true,
        "confirm": true,
        "message": true,
        "open": true,
        "save": true
      },
      "fs": {
        "all": true,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "copyFile": true,
        "createDir": true,
        "removeDir": true,
        "removeFile": true,
        "renameFile": true,
        "exists": true,
        "scope": ["$APPDATA", "$APPLOCALDATA", "$APPCONFIG", "$APPLOG", "$DOCUMENT"]
      },
      "path": {
        "all": true
      },
      "os": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.tylerbutler.ccl-test-viewer",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: https:",
        "font-src": "'self' data:",
        "connect-src": "'self' https: tauri:"
      }
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "CCL Test Suite Viewer",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "center": true,
        "decorations": true,
        "alwaysOnTop": false,
        "skipTaskbar": false,
        "fileDropEnabled": true,
        "theme": "Auto"
      }
    ]
  }
}
```

### 4. Update Cargo.toml

Edit `src-tauri/Cargo.toml`:

```toml
[package]
name = "ccl-test-viewer"
version = "0.1.0"
description = "CCL Test Suite Viewer - Interactive test result visualization"
authors = ["Tyler Butler <tyler@tylerbutler.com>"]
license = "MIT"
repository = "https://github.com/tylerbutler/tools-monorepo"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[build-dependencies]
tauri-build = { version = "1.0", features = [] }

[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "1.0", features = ["api-all", "dialog-all", "fs-all", "path-all", "shell-open"] }

[features]
# this feature is used for production builds or when `devPath` points to the filesystem and the built-in dev server is disabled.
# If you use cargo directly instead of tauri's cli you can use this feature flag to switch between tauri's `dev` and `build` modes.
# DO NOT REMOVE!!
custom-protocol = [ "tauri/custom-protocol" ]
```

### 5. Configure Package.json Scripts

Add Tauri scripts to `package.json`:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug",
    "build:tauri": "BUILD_TARGET=tauri npm run build && tauri build",
    "dev:tauri": "BUILD_TARGET=tauri tauri dev"
  }
}
```

## Building the Application

### Development Build

```bash
# Method 1: Using Tauri CLI directly
npm run tauri:dev

# Method 2: Using custom script with environment variable
npm run dev:tauri

# This will:
# 1. Build the web assets with Tauri target
# 2. Start the Rust backend
# 3. Open the desktop application in development mode
```

### Production Build

```bash
# Method 1: Full production build
npm run tauri:build

# Method 2: Using custom script
npm run build:tauri

# Method 3: Debug build (faster compilation)
npm run tauri:build:debug

# This will:
# 1. Build optimized web assets
# 2. Compile Rust backend in release mode
# 3. Create platform-specific binaries in src-tauri/target/release/bundle/
```

### Build Output Locations

**macOS:**
- App Bundle: `src-tauri/target/release/bundle/macos/CCL Test Viewer.app`
- DMG Installer: `src-tauri/target/release/bundle/dmg/CCL Test Viewer_0.1.0_x64.dmg`

**Windows:**
- Executable: `src-tauri/target/release/bundle/msi/CCL Test Viewer_0.1.0_x64_en-US.msi`
- Portable: `src-tauri/target/release/ccl-test-viewer.exe`

**Linux:**
- AppImage: `src-tauri/target/release/bundle/appimage/ccl-test-viewer_0.1.0_amd64.AppImage`
- Debian: `src-tauri/target/release/bundle/deb/ccl-test-viewer_0.1.0_amd64.deb`

## Testing the Desktop Application

### 1. Development Testing

```bash
# Start development server
npm run tauri:dev

# Test desktop-specific features:
# 1. Native file dialogs (File Upload tab)
# 2. Local data persistence
# 3. Collection import/export
# 4. Offline mode capabilities
```

### 2. Feature Testing Checklist

**Native File Operations:**
- [ ] Native file dialog opens on "Browse Files" button
- [ ] Multi-file selection works correctly
- [ ] JSON validation happens in real-time
- [ ] File paths are correctly displayed
- [ ] Large files (>10MB) are handled appropriately

**Data Persistence:**
- [ ] Data sources persist between app restarts
- [ ] Collections can be exported to local files
- [ ] Collections can be imported from local files
- [ ] Auto-save functionality works
- [ ] Local storage respects size limits

**Offline Mode:**
- [ ] App works when internet is disconnected
- [ ] Cached data loads correctly
- [ ] Data syncs when connection is restored
- [ ] Cache statistics are accurate

**UI/UX:**
- [ ] Desktop-specific UI elements appear
- [ ] Collections tab is available in desktop mode
- [ ] Native upload replaces web upload
- [ ] Progress indicators work correctly
- [ ] Error messages are clear and helpful

### 3. Cross-Platform Testing

**Test on each target platform:**
- [ ] **macOS**: Intel and Apple Silicon
- [ ] **Windows**: x64 and x86
- [ ] **Linux**: Ubuntu, Debian, Fedora

**Platform-specific features:**
- [ ] Native file dialogs match OS style
- [ ] Window management behaves correctly
- [ ] File associations work (if configured)
- [ ] App icon displays correctly

### 4. Performance Testing

```bash
# Build with release optimizations
npm run tauri:build

# Test performance metrics:
# - App startup time (<3 seconds)
# - File processing speed
# - Memory usage
# - Bundle size
```

### 5. Security Testing

**Verify security policies:**
- [ ] CSP policies prevent unauthorized network requests
- [ ] File system access is properly scoped
- [ ] No sensitive data in logs
- [ ] Native dialogs can't access restricted directories

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear Rust cache
cargo clean

# Clear Node modules and rebuild
rm -rf node_modules
pnpm install

# Update Rust
rustup update

# Update Tauri CLI
cargo install tauri-cli --force
```

**Development Server Issues:**
```bash
# Ensure preview server is running
pnpm preview

# Check if port 4173 is available
lsof -i :4173

# Use different port if needed
pnpm preview --port 4174
```

**File Dialog Not Working:**
- Check that `dialog` permissions are enabled in `tauri.conf.json`
- Verify platform-specific dependencies are installed
- Check console for Tauri-related errors

**Local Storage Issues:**
- Verify `fs` permissions in allowlist
- Check that app data directory has write permissions
- Clear app data: `~/.local/share/ccl-test-viewer/` (Linux) or equivalent

### Debug Mode

```bash
# Enable Rust debug logs
RUST_LOG=debug npm run tauri:dev

# Enable Tauri debug mode
npm run tauri:build:debug
```

### Development Tools

**Rust Development:**
```bash
# Install useful Rust tools
cargo install cargo-edit    # Manage dependencies
cargo install cargo-audit   # Security audit
cargo install cargo-tree    # Dependency tree
```

**Tauri Development:**
```bash
# Check Tauri info
npm run tauri info

# Generate app icons
npm run tauri icon path/to/source-icon.png
```

## Distribution

### Code Signing (Production)

**macOS:**
```bash
# Sign the app (requires Apple Developer account)
codesign --deep --force --verify --verbose --sign "Developer ID" "CCL Test Viewer.app"
```

**Windows:**
```bash
# Sign with certificate (requires code signing certificate)
signtool sign /f certificate.p12 /p password "CCL Test Viewer.exe"
```

### Release Process

1. **Update Version**: Update version in `package.json` and `src-tauri/tauri.conf.json`
2. **Build Release**: `npm run tauri:build`
3. **Test Binaries**: Test on clean systems
4. **Sign Binaries**: Apply code signing for production
5. **Create Release**: Upload to GitHub releases or distribution platform

## Documentation Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Tauri API Reference](https://tauri.app/v1/api/js/)
- [Rust Documentation](https://doc.rust-lang.org/)
- [Cargo Book](https://doc.rust-lang.org/cargo/)

## Support

For issues specific to the CCL Test Viewer desktop application:
1. Check this troubleshooting guide
2. Review Tauri logs in development mode
3. Test in web mode to isolate desktop-specific issues
4. Check the [CCL Test Viewer issues](https://github.com/tylerbutler/tools-monorepo/issues)

This setup guide provides everything needed to build and test the CCL Test Viewer as a native desktop application using Tauri.