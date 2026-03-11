# Dev Harness

Interactive testing UI for the WebForge runtime. Provides real-time controls for every configurable option across all runtime systems.

## Overview

The dev harness (`runtime/dev/`) renders a sample tilemap and exposes collapsible sidebar panels with controls for every runtime system. It serves as both a visual regression tool and the primary way to manually test new features.

## Running

```bash
cd packages/products/storylyne/runtime
pnpm dev    # Starts Vite dev server on http://localhost:3100
```

## Sections

The sidebar contains 12 collapsible sections:

| # | Section | Controls | Description |
|---|---------|----------|-------------|
| 1 | **Camera Presets** | 16 preset buttons | One-click camera switching |
| 2 | **Screen Shake** | 18 preset buttons + custom config | Trigger shake presets or custom configs |
| 3 | **Day/Night Cycle** | Time slider, speed, season, moon, indoor | Full day/night control |
| 4 | **Layers** | Per-layer visibility, opacity, tint | Toggle/adjust tile layers |
| 5 | **Screen Effects** | Tint color, flash, fade | Trigger screen overlays |
| 6 | **Rendering** | Master toggles | Global enable/disable for major systems |
| 7 | **Post-FX Details** | 45+ sliders/toggles/selects | Per-effect controls for all 12 post-FX |
| 8 | **Fog** | 77+ options across all 3 tiers | Full fog configuration |
| 9 | **Camera Details** | Per-field overrides | Fine-grained camera adjustment |
| 10 | **Glow Layer** | Intensity, blur, samples | Glow layer configuration |
| 11 | **Lights** | Per-light expanded controls (47+) | Shadow (8 filters, 14 props), 13 flicker modes, god rays, lens flares (4 presets), distance fade |
| 12 | **Scene Info** | Read-only | FPS, draw calls, active meshes, memory |

## Control Types

| Type | DOM Pattern | Description |
|------|-------------|-------------|
| Toggle | `.toggle-switch` div (class `on` when enabled) | Boolean on/off |
| Slider | `input[type="range"]` in `.control-row` | Numeric range with label |
| Select | `<select>` in `.control-row` | Dropdown enum |
| Button | `<button>` | Trigger action |
| Color | Color picker input | RGBA color selection |

## DOM Structure

```
#sidebar
├── .panel
│   ├── .panel-header (click to collapse)
│   │   └── span (section name)
│   └── .panel-body#<section>-body
│       ├── .cg (control group / sub-section)
│       │   ├── .cg-header
│       │   │   └── span (sub-section name)
│       │   └── .cg-body
│       │       └── .control-row (individual controls)
│       └── .control-row (flat controls)
```

## Tile Inspector

Clicking a tile on the map opens an inspector overlay showing:
- Tile coordinates (col, row)
- Layer name and type
- Global tile ID and local tile ID
- Tileset name
- Tile properties (passability, terrain, etc.)

The inspector includes a pencil icon to open the **Tile Picker** panel for editing.

## Tile Picker

The Tile Picker is a floating panel for selecting tiles to paint onto the map:

- **Tileset Tabs**: Switch between tilesets
- **Zoom**: 1x--6x zoom slider with pixel-perfect rendering
- **Grid Overlay**: Toggleable grid lines between tiles
- **Hover Highlight**: Tile highlight with tooltip showing tile ID and position
- **Keyboard Navigation**: Arrow keys to move cursor, Enter to place, Escape to close
- **Recently Used**: Strip of last 12 placed tiles for quick re-selection
- **Status Bar**: Shows hovered and selected tile info
- **Resizable**: Drag bottom-right corner to resize

## Global Runtime Object

The dev harness exposes `window.__WEBFORGE__` for debugging:

| Property | Description |
|----------|-------------|
| `scene` | Babylon.js Scene instance |
| `runtime` | Full runtime handle |
| `BABYLON` | Babylon.js namespace |
| `tilemap` | Tilemap handle |
| `setTime(hour)` | Set day/night time [0, 24) |
| `getTime()` | Get current time |
| `switchPreset(name)` | Switch fog/camera preset |
| `status()` | Print runtime status |

## Files

| File | Purpose |
|------|---------|
| `dev/index.html` | Entry point, CSS styles |
| `dev/dev.ts` | All 12 sections, ~9200 lines |
