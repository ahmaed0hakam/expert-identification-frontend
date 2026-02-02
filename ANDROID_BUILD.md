# Android Build Guide

This guide will help you build Android APK and AAB files for the Expert Identification app.

## Prerequisites

1. **Android Studio** - Download and install from [developer.android.com](https://developer.android.com/studio)
2. **Java Development Kit (JDK)** - Android Studio includes JDK, or install JDK 17 separately
3. **Android SDK** - Installed via Android Studio
4. **Environment Variables** - Set `ANDROID_HOME` and `JAVA_HOME` if needed

## Quick Build Commands

### Build and Sync
```bash
# Build production Angular app and sync with Capacitor
npm run android:build
```

### Open in Android Studio
```bash
# Build, sync, and open Android Studio
npm run android:open
```

### Run on Connected Device/Emulator
```bash
# Build, sync, and run on device
npm run android:run
```

### Build APK (Debug)
```bash
cd android
./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Build APK (Release)
```bash
npm run android:apk
# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

### Build AAB (for Google Play Store)
```bash
npm run android:aab
# AAB will be at: android/app/build/outputs/bundle/release/app-release.aab
```

## Step-by-Step Build Process

### 1. Update Production API URL

Before building, make sure your production API URL is set in `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api', // Update this!
  // ... rest of config
};
```

### 2. Build Angular App for Production

```bash
npm run build:prod
```

This creates optimized production files in `dist/expert-identification/`.

### 3. Sync with Capacitor

```bash
npx cap sync android
```

This copies your web assets to the Android project.

### 4. Open in Android Studio

```bash
npx cap open android
```

Or use the npm script:
```bash
npm run android:open
```

### 5. Build APK/AAB in Android Studio

#### For APK (Direct Install):
1. In Android Studio, go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. Click **locate** in the notification to find your APK
4. APK location: `android/app/build/outputs/apk/release/app-release.apk`

#### For AAB (Google Play Store):
1. In Android Studio, go to **Build** → **Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Follow the signing wizard (create keystore if first time)
4. AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

### 6. Build from Command Line (No Android Studio)

#### Debug APK:
```bash
cd android
./gradlew assembleDebug
```

#### Release APK (requires signing):
```bash
cd android
./gradlew assembleRelease
```

#### Release AAB (requires signing):
```bash
cd android
./gradlew bundleRelease
```

## Signing Your App (Required for Release)

### Create a Keystore (First Time Only)

```bash
keytool -genkey -v -keystore expert-identification-release.keystore -alias expert-identification -keyalg RSA -keysize 2048 -validity 10000
```

**Important:** Save the keystore file and password securely! You'll need it for all future updates.

### Configure Signing in Android Studio

1. Open `android/app/build.gradle`
2. Add signing config:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/your/expert-identification-release.keystore')
            storePassword 'your-keystore-password'
            keyAlias 'expert-identification'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ... existing config
        }
    }
}
```

**Security Note:** For production, use environment variables or a `keystore.properties` file (add to `.gitignore`).

## Troubleshooting

### "SDK location not found"
- Open Android Studio
- Go to **File** → **Project Structure** → **SDK Location**
- Copy the Android SDK path
- Set environment variable: `export ANDROID_HOME=/path/to/sdk`

### "Gradle sync failed"
- Open Android Studio
- Go to **File** → **Sync Project with Gradle Files**
- Or run: `cd android && ./gradlew clean`

### "Build failed: minSdkVersion"
- Check `android/app/build.gradle` for `minSdkVersion`
- Should be at least 22 (Android 5.1)

### "Capacitor sync failed"
- Make sure you've built the Angular app first: `npm run build:prod`
- Then sync: `npx cap sync android`

## Testing Your Build

### Install APK on Device

1. Enable **Developer Options** on your Android device:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect device via USB
4. Install APK:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

### Test on Emulator

1. Create an Android Virtual Device (AVD) in Android Studio
2. Start the emulator
3. Run: `npm run android:run`

## Publishing to Google Play Store

1. Build AAB: `npm run android:aab`
2. Go to [Google Play Console](https://play.google.com/console)
3. Create a new app or select existing
4. Upload the AAB file
5. Fill in store listing, screenshots, etc.
6. Submit for review

## Version Management

Update version in `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2  // Increment for each release
    versionName "1.0.1"  // User-facing version
}
```

Then rebuild and sync:
```bash
npm run android:build
```

## Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Build Guide](https://developer.android.com/studio/build)
- [Google Play Console](https://play.google.com/console)
