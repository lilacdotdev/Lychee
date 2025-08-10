# Lychee Deployment Guide

This guide covers how to build and deploy the Lychee note-taking application for Windows, Linux, and macOS platforms.

## Prerequisites

Before you can build Lychee for distribution, ensure you have the following installed:

### Required Tools
- **Node.js** (v18 or later)
- **Rust** (latest stable version)
- **Tauri CLI** (`npm install -g @tauri-apps/cli`)

### Platform-Specific Requirements

#### Windows
- **Visual Studio Build Tools** or **Visual Studio Community** with C++ development tools
- **WiX Toolset** (for MSI installer creation)
- **NSIS** (for NSIS installer creation)

#### Linux
- **Build essentials**: `sudo apt install build-essential`
- **WebKit development libraries**: `sudo apt install libwebkit2gtk-4.0-dev`
- **Additional dependencies**: 
  ```bash
  sudo apt install libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **Developer account** (for code signing and notarization)

## Building for Distribution

### 1. Prepare the Project

```bash
# Clone the repository
git clone <your-repo-url>
cd lychee

# Install dependencies
npm install

# Ensure Rust dependencies are up to date
cd src-tauri
cargo update
cd ..
```

### 2. Build for Your Platform

#### Development Build (for testing)
```bash
npm run tauri dev
```

#### Production Build
```bash
npm run tauri build
```

This command will:
- Build the frontend with Vite
- Compile the Rust backend
- Create platform-specific installers

### 3. Platform-Specific Outputs

After running `npm run tauri build`, you'll find the built applications in:

#### Windows
- **Location**: `src-tauri/target/release/bundle/`
- **Files**:
  - `msi/lychee_X.X.X_x64_en-US.msi` - MSI installer
  - `nsis/lychee_X.X.X_x64-setup.exe` - NSIS installer
- **Executable**: `src-tauri/target/release/lychee.exe`

#### Linux
- **Location**: `src-tauri/target/release/bundle/`
- **Files**:
  - `deb/lychee_X.X.X_amd64.deb` - Debian package
  - `appimage/lychee_X.X.X_amd64.AppImage` - AppImage (portable)
- **Executable**: `src-tauri/target/release/lychee`

#### macOS
- **Location**: `src-tauri/target/release/bundle/`
- **Files**:
  - `macos/lychee.app` - Application bundle
  - `dmg/lychee_X.X.X_x64.dmg` - DMG installer
- **Executable**: `src-tauri/target/release/lychee`

## Cross-Platform Building

### Building for Other Platforms

Tauri supports cross-compilation with some setup:

#### From Windows/Linux to macOS
```bash
# Install macOS target
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build for macOS (requires macOS SDK)
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target aarch64-apple-darwin
```

#### From macOS to Windows/Linux
```bash
# Install Windows target
rustup target add x86_64-pc-windows-msvc

# Install Linux target
rustup target add x86_64-unknown-linux-gnu

# Build for Windows (requires Windows SDK)
npm run tauri build -- --target x86_64-pc-windows-msvc

# Build for Linux (requires Linux toolchain)
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

**Note**: Cross-compilation can be complex and may require additional setup. For reliable builds, use the target platform or CI/CD services.

## GitHub Actions CI/CD

For automated building across all platforms, create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-20.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Rust setup
        uses: dtolnay/rust-toolchain@stable

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: Sync node version and setup cache
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install frontend dependencies
        run: npm ci

      - name: Build the app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Lychee v__VERSION__'
          releaseBody: 'See the assets below to download and install this version.'
          releaseDraft: true
          prerelease: false
```

## Code Signing & Notarization

### Windows
1. Obtain a code signing certificate
2. Set environment variables:
   ```bash
   set TAURI_PRIVATE_KEY=path/to/private-key.key
   set TAURI_KEY_PASSWORD=your-password
   ```

### macOS
1. Join the Apple Developer Program
2. Create certificates in Xcode
3. Set environment variables:
   ```bash
   export APPLE_CERTIFICATE=path/to/certificate.p12
   export APPLE_CERTIFICATE_PASSWORD=your-password
   export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"
   export APPLE_ID=your-apple-id@example.com
   export APPLE_PASSWORD=app-specific-password
   ```

## Distribution

### Direct Distribution
- Upload the built installers to your website
- Provide download links for each platform
- Include installation instructions

### Package Managers

#### Windows
- **Chocolatey**: Submit to Chocolatey community repository
- **Scoop**: Create a scoop bucket or submit to main bucket
- **Winget**: Submit to Microsoft's winget-pkgs repository

#### Linux
- **Snap Store**: Package as a snap
- **Flatpak**: Submit to Flathub
- **AUR**: Create an Arch User Repository package

#### macOS
- **Homebrew**: Create a homebrew formula
- **Mac App Store**: Submit through App Store Connect (requires additional setup)

### GitHub Releases
1. Create a new release on GitHub
2. Upload the built installers as release assets
3. Write release notes describing changes
4. Tag the release with semantic versioning (e.g., v1.0.0)

## Version Management

### Updating Version Numbers
Update version in these files before building:
- `package.json` - Frontend version
- `src-tauri/Cargo.toml` - Rust backend version
- `src-tauri/tauri.conf.json` - Tauri app version

### Automated Versioning
Consider using tools like:
- `npm version` for automatic version bumping
- `semantic-release` for automated releases
- `standard-version` for changelog generation

## Testing Before Release

### Pre-release Checklist
- [ ] Test on each target platform
- [ ] Verify all features work correctly
- [ ] Check that themes load properly
- [ ] Test plugin functionality
- [ ] Verify export/import features
- [ ] Test keybindings
- [ ] Ensure app data directory is created correctly

### Manual Testing
1. Install the built application
2. Create notes and tags
3. Test theme switching
4. Install and test plugins
5. Export notes to PDF
6. Verify settings persistence

## Troubleshooting

### Common Build Issues

#### Windows
- **MSVC not found**: Install Visual Studio Build Tools
- **WiX not found**: Install WiX Toolset and add to PATH

#### Linux
- **WebKit errors**: Install webkit2gtk development libraries
- **Missing symbols**: Install build-essential package

#### macOS
- **Code signing fails**: Check developer certificate and provisioning
- **Notarization fails**: Verify Apple ID credentials and app-specific password

### Size Optimization
- Use `cargo-bloat` to analyze binary size
- Consider `strip` for release binaries
- Optimize frontend bundle with tree-shaking

## Security Considerations

- **Code signing**: Always sign releases for user trust
- **Dependency scanning**: Regularly audit npm and cargo dependencies
- **Updater security**: Implement secure update mechanisms
- **Sandboxing**: Consider platform security restrictions

## Support

For build issues:
1. Check the [Tauri documentation](https://tauri.app/v1/guides/)
2. Search [Tauri GitHub issues](https://github.com/tauri-apps/tauri/issues)
3. Ask on [Tauri Discord](https://discord.com/invite/tauri)

---

**Note**: This deployment guide assumes you're building Lychee v0.8.0 or later. Adjust version numbers and file paths as needed for your specific version.
