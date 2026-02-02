#!/bin/bash
# Generate Android app icons from EOD logo
# This script generates all required icon sizes for Android from assets/logo.jpg

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGO_PATH="$PROJECT_ROOT/src/assets/logo.jpg"
ANDROID_RES_DIR="$PROJECT_ROOT/android/app/src/main/res"

# Icon sizes for different densities (in pixels)
# Format: density:size
# Increased sizes for better quality on modern devices
SIZES="mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192"
# Note: For adaptive icons, we need higher quality source (512x512 or larger recommended)

# Check if logo exists
if [ ! -f "$LOGO_PATH" ]; then
    echo "❌ Error: Logo file not found at $LOGO_PATH"
    exit 1
fi

echo "✓ Found logo at: $LOGO_PATH"
echo "Generating Android icons..."

# Generate icons for each density
for entry in $SIZES; do
    density=$(echo $entry | cut -d: -f1)
    size=$(echo $entry | cut -d: -f2)
    mipmap_dir="$ANDROID_RES_DIR/mipmap-${density}"
    
    # Create directory if it doesn't exist
    mkdir -p "$mipmap_dir"
    
    echo "  Generating ${density} (${size}x${size})..."
    
    # Generate temporary PNG file with proper format (RGBA, 8-bit)
    temp_png="$mipmap_dir/temp_icon.png"
    mkdir -p "$mipmap_dir"
    
    # Convert to PNG with proper format for Android (RGBA, 8-bit)
    # Use high quality settings: formatOptions 100 = best quality
    # -Z preserves aspect ratio, resizes to fit within size while maintaining quality
    # --out ensures proper PNG format
    sips -s format png -s formatOptions 100 -Z "$size" "$LOGO_PATH" --out "$temp_png" > /dev/null 2>&1
    
    # Ensure the image is exactly square by cropping if needed (required for Android icons)
    # Get dimensions
    width=$(sips -g pixelWidth "$temp_png" | tail -1 | awk '{print $2}')
    height=$(sips -g pixelHeight "$temp_png" | tail -1 | awk '{print $2}')
    
    if [ "$width" != "$height" ]; then
        # Crop to square (center crop)
        min_size=$((width < height ? width : height))
        sips --cropToHeightWidth "$min_size" "$min_size" "$temp_png" --out "$temp_png" > /dev/null 2>&1
        # Resize to exact size if needed
        sips -Z "$size" "$temp_png" --out "$temp_png" > /dev/null 2>&1
    fi
    
    # Generate ic_launcher.png (square) - copy from temp and ensure it's a valid PNG
    cp "$temp_png" "$mipmap_dir/ic_launcher.png"
    sips -s format png "$mipmap_dir/ic_launcher.png" --out "$mipmap_dir/ic_launcher.png" > /dev/null 2>&1
    
    # Generate ic_launcher_foreground.png (same as launcher for simplicity)
    cp "$temp_png" "$mipmap_dir/ic_launcher_foreground.png"
    sips -s format png "$mipmap_dir/ic_launcher_foreground.png" --out "$mipmap_dir/ic_launcher_foreground.png" > /dev/null 2>&1
    
    # Generate ic_launcher_round.png (same for round icons)
    cp "$temp_png" "$mipmap_dir/ic_launcher_round.png"
    sips -s format png "$mipmap_dir/ic_launcher_round.png" --out "$mipmap_dir/ic_launcher_round.png" > /dev/null 2>&1
    
    # Clean up temp file
    rm -f "$temp_png"
    
    if [ $? -eq 0 ]; then
        echo "    ✓ Generated ${density} icons"
    else
        echo "    ✗ Failed to generate ${density} icons"
    fi
done

echo ""
echo "✓ Android icons generated successfully!"
echo "  Icons are located in: $ANDROID_RES_DIR/mipmap-*/"
echo ""
echo "Next steps:"
echo "  1. Sync Capacitor: npm run android:build"
echo "  2. Build your app: npm run android:apk"
