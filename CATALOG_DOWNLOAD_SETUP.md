# Catalog Download Setup for Native Apps

## Issue
On native Capacitor apps, opening catalogs was showing a white screen or prompting for a browser.

## Solution
Using Capacitor Filesystem to save the blob to the device, then opening it using `Capacitor.convertFileSrc()` for proper WebView compatibility.

## Installation Required

If `@capacitor/filesystem` is not installed, run:

```bash
cd frontend
npm install @capacitor/filesystem
npx cap sync
```

## How It Works

1. **Blob to Base64**: Converts the received blob to base64 format
2. **Save to Filesystem**: Writes the file to Capacitor's Cache directory using `Filesystem.writeFile()`
3. **Convert File URI**: Uses `Capacitor.convertFileSrc()` to convert the file URI to a WebView-compatible URL
4. **Open in Iframe**: Opens the PDF in an embedded iframe using the converted URI

This approach:
- ✅ No browser prompt on native apps
- ✅ Works with Capacitor WebView
- ✅ Opens PDFs in-app using embedded viewer
- ✅ Properly handles file cleanup

## Fallback

If Capacitor Filesystem is not available or fails, the code falls back to using a blob URL (though this may still show issues on some devices).
