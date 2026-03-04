#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# generate-icons.sh
#
# Generates ALL static icon assets from the master branding SVG.
# Source of truth: branding/logo.svg
#
# Output (static/):
#   favicon.svg          — SVG copy (modern browsers)
#   favicon.ico          — 32x32 ICO (legacy browsers)
#   favicon-32.png       — 32x32 PNG (fallback)
#   apple-touch-icon.png — 180x180 PNG (iOS home screen)
#   icon-192.png         — 192x192 PNG (Android / PWA)
#   icon-512.png         — 512x512 PNG (Android splash / PWA install)
#   icon-maskable-192.png — 192x192 maskable (Android adaptive)
#   icon-maskable-512.png — 512x512 maskable (Android adaptive)
#
# Requirements:
#   rsvg-convert (librsvg)  — macOS: brew install librsvg
#                             Linux: apt install librsvg2-bin
#   magick (ImageMagick 7)  — macOS: brew install imagemagick
#                             Linux: apt install imagemagick
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EDITOR_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MASTER_SVG="$EDITOR_DIR/branding/logo.svg"
STATIC_DIR="$EDITOR_DIR/static"

# Background color for maskable icons (dark blue matching crystal base)
MASKABLE_BG="#0f172a"

# ── Preflight ────────────────────────────────────────────────

if [[ ! -f "$MASTER_SVG" ]]; then
  echo "ERROR: Master SVG not found at $MASTER_SVG" >&2
  exit 1
fi

if ! command -v rsvg-convert &>/dev/null; then
  echo "ERROR: rsvg-convert not found." >&2
  echo "  macOS:  brew install librsvg" >&2
  echo "  Linux:  apt install librsvg2-bin" >&2
  exit 1
fi

if ! command -v magick &>/dev/null; then
  echo "ERROR: ImageMagick (magick) not found." >&2
  echo "  macOS:  brew install imagemagick" >&2
  echo "  Linux:  apt install imagemagick" >&2
  exit 1
fi

echo "Generating icons from branding/logo.svg..."

# ── SVG (copy master → static) ───────────────────────────────

echo "  favicon.svg"
cp "$MASTER_SVG" "$STATIC_DIR/favicon.svg"

# ── Standard raster icons ────────────────────────────────────
# Format: "filename:widthxheight"

RASTER_SIZES=(
  "favicon-32.png:32x32"
  "apple-touch-icon.png:180x180"
  "icon-192.png:192x192"
  "icon-512.png:512x512"
)

for entry in "${RASTER_SIZES[@]}"; do
  filename="${entry%%:*}"
  dimensions="${entry##*:}"
  width="${dimensions%%x*}"
  height="${dimensions##*x}"

  echo "  $filename (${width}x${height})"
  rsvg-convert \
    -w "$width" \
    -h "$height" \
    --background-color transparent \
    "$MASTER_SVG" \
    -o "$STATIC_DIR/$filename"
done

# ── Maskable icons (crystal on solid background, 80% safe zone) ──
# Android adaptive icons need content within the safe zone (central 80%).
# We render the crystal at 75% of target size and composite onto a
# solid background so the icon looks correct in any mask shape.

MASKABLE_SIZES=(192 512)
TEMP_CRYSTAL=$(mktemp /tmp/wf-crystal-XXXXXX.png)

for size in "${MASKABLE_SIZES[@]}"; do
  crystal_size=$((size * 75 / 100))
  filename="icon-maskable-${size}.png"

  echo "  $filename (${size}x${size}, maskable)"
  rsvg-convert \
    -w "$crystal_size" \
    -h "$crystal_size" \
    --background-color transparent \
    "$MASTER_SVG" \
    -o "$TEMP_CRYSTAL"

  magick -size "${size}x${size}" "xc:${MASKABLE_BG}" \
    "$TEMP_CRYSTAL" -gravity center -composite \
    "$STATIC_DIR/$filename"
done

rm -f "$TEMP_CRYSTAL"

# ── favicon.ico (legacy browsers) ────────────────────────────

echo "  favicon.ico (32x32 ICO)"
magick "$STATIC_DIR/favicon-32.png" "$STATIC_DIR/favicon.ico"

# ── Summary ──────────────────────────────────────────────────

TOTAL=$(( ${#RASTER_SIZES[@]} + ${#MASKABLE_SIZES[@]} + 2 ))  # +2 for SVG and ICO
echo ""
echo "Done. Generated $TOTAL assets in static/"
