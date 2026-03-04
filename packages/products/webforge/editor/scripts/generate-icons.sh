#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# generate-icons.sh
#
# Generates all static icon assets from the master branding SVG.
# Source: branding/logo.svg → static/favicon.svg, favicon-32.png, apple-touch-icon.png
#
# Requirements: rsvg-convert (librsvg)
#   macOS:  brew install librsvg
#   Linux:  apt install librsvg2-bin
#
# To add new sizes, append entries to the RASTER_SIZES array below.
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EDITOR_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MASTER_SVG="$EDITOR_DIR/branding/logo.svg"
STATIC_DIR="$EDITOR_DIR/static"

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

# ── SVG (copy master → static) ───────────────────────────────

echo "  favicon.svg ← branding/logo.svg"
cp "$MASTER_SVG" "$STATIC_DIR/favicon.svg"

# ── Raster sizes ─────────────────────────────────────────────
# Format: "filename:widthxheight"
# Add new entries here to generate additional sizes.

RASTER_SIZES=(
  "favicon-32.png:32x32"
  "apple-touch-icon.png:180x180"
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

echo ""
echo "Done. Generated $(( ${#RASTER_SIZES[@]} + 1 )) assets in static/"
