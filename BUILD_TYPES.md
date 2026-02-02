# Android Build Types: Debug vs Release

## Overview

Android builds have two main build types:

- **Debug** - For development and testing (no signing required, includes debug symbols)
- **Release** - For production (requires signing, optimized, minified)

## Quick Reference

### Debug Builds (Development)
```bash
# Build debug APK
npm run android:apk:debug

# Build debug AAB
npm run android:aab:debug

# Build, sync, and open in Android Studio (debug)
npm run android:open:debug

# Build, sync, and run on device (debug)
npm run android:run:debug
```

### Release Builds (Production)
```bash
# Build release APK
npm run android:apk

# Build release AAB (for Play Store)
npm run android:aab

# Build, sync, and open in Android Studio (release)
npm run android:open

# Build, sync, and run on device (release)
npm run android:run
```

## Differences

| Feature | Debug | Release |
|---------|-------|---------|
| **Signing** | Not required | Required |
| **Minification** | Disabled | Enabled |
| **Shrinking** | Disabled | Enabled |
| **Debuggable** | Yes | No |
| **App ID Suffix** | `.debug` | None |
| **Version Suffix** | `-debug` | None |
| **Environment** | Development | Production |
| **API URL** | `http://localhost:8000/api` | Production URL |
| **Performance** | Slower | Optimized |
| **Size** | Larger | Smaller |

## Build Commands Explained

### Using NPM Scripts

#### Debug Builds:
- `npm run android:build:debug` - Builds Angular app (development) and syncs with Android
- `npm run android:apk:debug` - Creates debug APK
- `npm run android:aab:debug` - Creates debug AAB
- `npm run android:open:debug` - Opens Android Studio with debug build
- `npm run android:run:debug` - Runs debug build on device/emulator

#### Release Builds:
- `npm run android:build` - Builds Angular app (production) and syncs with Android
- `npm run android:apk` - Creates release APK
- `npm run android:aab` - Creates release AAB
- `npm run android:open` - Opens Android Studio with release build
- `npm run android:run` - Runs release build on device/emulator

### Using Gradle Directly

```bash
cd android

# Debug builds
./gradlew assembleDebug      # Debug APK
./gradlew bundleDebug        # Debug AAB

# Release builds
./gradlew assembleRelease    # Release APK
./gradlew bundleRelease      # Release AAB
```

## Output Locations

### Debug Builds:
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- AAB: `android/app/build/outputs/bundle/debug/app-debug.aab`

### Release Builds:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Environment Configuration

### Debug Build (Development)
Uses: `src/environments/environment.ts`
```typescript
apiUrl: 'http://localhost:8000/api'  // Local development
```

### Release Build (Production)
Uses: `src/environments/environment.prod.ts`
```typescript
apiUrl: 'https://your-production-api.com/api'  // Production
```

## When to Use Each

### Use Debug When:
- ✅ Developing and testing
- ✅ Need to debug with breakpoints
- ✅ Testing on local development server
- ✅ Quick iteration and testing
- ✅ Don't need signing

### Use Release When:
- ✅ Preparing for production
- ✅ Publishing to Play Store
- ✅ Testing production build
- ✅ Need optimized performance
- ✅ Need smaller app size

## Building in Android Studio

1. Open Android Studio: `npm run android:open` or `npm run android:open:debug`

2. Select Build Variant:
   - Click **Build Variants** tab (bottom left)
   - Select `debug` or `release` for `app` module

3. Build:
   - **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Or **Build** → **Generate Signed Bundle / APK**

## Switching Build Types

### Method 1: NPM Scripts (Recommended)
```bash
# For debug
npm run android:apk:debug

# For release
npm run android:apk
```

### Method 2: Gradle Commands
```bash
cd android

# Debug
./gradlew assembleDebug

# Release
./gradlew assembleRelease
```

### Method 3: Android Studio
1. Open **Build Variants** panel
2. Select variant: `debug` or `release`
3. Build from menu or toolbar

## Troubleshooting

### "Signing config not found" (Release)
- Release builds require signing configuration
- See `ANDROID_BUILD.md` for signing setup
- Or use debug build for testing: `npm run android:apk:debug`

### "Cannot find debug APK"
- Make sure you built debug variant: `npm run android:apk:debug`
- Check: `android/app/build/outputs/apk/debug/`

### "App won't install" (Debug)
- Debug builds have `.debug` suffix in app ID
- Uninstall any release version first
- Or use different device/emulator

### "API calls failing" (Release)
- Check `environment.prod.ts` has correct production API URL
- Release builds use production environment

## Quick Commands Cheat Sheet

```bash
# Debug (Development)
npm run android:build:debug    # Build & sync
npm run android:apk:debug     # Create debug APK
npm run android:open:debug    # Open in Android Studio

# Release (Production)
npm run android:build          # Build & sync
npm run android:apk            # Create release APK
npm run android:aab            # Create release AAB
npm run android:open          # Open in Android Studio
```
