# Running App on Connected Android Device

## Quick Commands

### Method 1: Direct Run (Recommended)
```bash
# Debug build (development environment)
npm run android:run:debug

# Release build (production environment)
npm run android:run
```

### Method 2: Build APK and Install
```bash
# Build debug APK
npm run android:apk:debug

# Install on connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or build release APK
npm run android:apk
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Method 3: Using Android Studio
1. Open Android Studio: `npm run android:open:debug`
2. Select your device from the device dropdown (top toolbar)
3. Click **Run** button (green play icon) or press `Shift+F10`

## Device Selection

When running `npm run android:run:debug`, you'll see a device selection prompt:
- Use **arrow keys** to select your device
- Press **Enter** to confirm
- The app will build, install, and launch automatically

## Troubleshooting

### Device Not Detected
```bash
# Check if device is connected
adb devices

# If device shows "unauthorized":
# 1. Check your phone for USB debugging authorization prompt
# 2. Accept the prompt
# 3. Run `adb devices` again
```

### "Device Offline"
- Disconnect and reconnect USB cable
- Try different USB port
- Enable "USB Debugging" in Developer Options
- Run: `adb kill-server && adb start-server`

### "Installation Failed"
- Uninstall existing app first: `adb uninstall com.expertidentification.app.debug`
- Or uninstall from device settings
- Try again

### Build Errors
- Make sure you've built the Angular app first: `npm run build` or `npm run build:prod`
- Sync with Capacitor: `npx cap sync android`
- Clean build: `cd android && ./gradlew clean`

## Differences: Debug vs Release

### Debug Build (`android:run:debug`)
- ✅ No signing required
- ✅ Development API URL (`http://localhost:8000/api`)
- ✅ Debuggable
- ✅ App ID: `com.expertidentification.app.debug`
- ✅ Can run alongside release version

### Release Build (`android:run`)
- ⚠️ Requires signing configuration
- ✅ Production API URL
- ✅ Optimized
- ✅ App ID: `com.expertidentification.app`

## Useful Commands

```bash
# Check connected devices
adb devices

# View device logs
adb logcat

# Uninstall app
adb uninstall com.expertidentification.app.debug  # Debug
adb uninstall com.expertidentification.app        # Release

# Clear app data
adb shell pm clear com.expertidentification.app.debug

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```
