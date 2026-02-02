# Icon Quality Improvement Guide

## Issue
The APK app icon appears low quality. This is typically caused by:
1. Low-resolution source image (`assets/logo.jpg`)
2. Compression during icon generation
3. Missing adaptive icon resources

## Solution

### 1. Use High-Quality Source Image
**Important:** The source logo at `src/assets/logo.jpg` should be:
- **Minimum size:** 1024x1024 pixels (recommended: 512x512 or larger)
- **Format:** PNG preferred, or high-quality JPEG
- **Square aspect ratio:** 1:1 (required for Android icons)
- **No compression artifacts**

### 2. Regenerate Icons
After ensuring you have a high-quality source image:

```bash
cd frontend
chmod +x scripts/generate-android-icons.sh
./scripts/generate-android-icons.sh
```

This will regenerate all Android icons with improved quality settings.

### 3. Verify Icon Generation
Check that icons were generated in:
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

### 4. Rebuild App
After regenerating icons:

```bash
# Sync Capacitor
npm run android:build

# Or build APK
npm run android:apk
```

## Current Icon Sizes Generated
- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

## Recommendations
1. **Replace `src/assets/logo.jpg`** with a high-quality version (1024x1024 or larger PNG)
2. **Run the icon generation script** to regenerate all sizes
3. **Rebuild the app** to see the improved icon quality

## Notes
- The script now uses `-Z` flag which preserves quality better than `-z`
- Icons are automatically cropped to square format if needed
- Adaptive icons are supported via `mipmap-anydpi-v26/` resources
