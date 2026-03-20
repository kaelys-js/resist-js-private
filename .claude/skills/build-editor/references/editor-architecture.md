# Editor Architecture Reference

## Table of Contents
- Workspace Location
- Tech Stack
- Runtime Integration
- Existing Dev Harness Panels (what to rebuild)
- Component Organization Pattern

## Workspace Location

```
packages/products/webforge/editor/
├── src/
│   ├── app.css              (Tailwind v4 entry)
│   ├── app.html             (SvelteKit shell)
│   ├── lib/
│   │   ├── components/ui/   (shadcn-svelte primitives)
│   │   ├── components/      (app components)
│   │   └── utils.ts         (cn() helper for tailwind-merge)
│   └── routes/
│       ├── +layout.svelte
│       └── +page.svelte
├── svelte.config.js
├── vite.config.ts
└── package.json
```

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Svelte | 5.x | Component framework (runes, snippets) |
| SvelteKit | 2.x | App framework + routing |
| Tailwind CSS | 4.x | Utility-first styling |
| bits-ui | 2.x | Headless UI primitives (foundation of shadcn-svelte) |
| tailwind-merge | 3.x | Class deduplication |
| tailwind-variants | 3.x | Variant-based styling |
| shadcn-svelte | CLI | Component generator (`npx shadcn-svelte@latest add <component>`) |

## Runtime Integration

The editor embeds the Babylon.js runtime canvas and controls it via the runtime API.

**Global object:** `window.__WEBFORGE__` — set by the runtime on init.
- `__WEBFORGE__.scene` — Babylon.js Scene
- `__WEBFORGE__.runtime` — RuntimeInstance
- `__WEBFORGE__.BABYLON` — Babylon.js namespace
- `__WEBFORGE__.tilemap` — RenderedTilemap
- `__WEBFORGE__.setTime(hour24)` — Day/night time
- `__WEBFORGE__.getTime()` — Current hour
- `__WEBFORGE__.switchPreset(name)` — Switch camera preset
- `__WEBFORGE__.status()` — Runtime status

**Runtime package:** `@webforge/runtime` — import functions directly:
```typescript
import { renderTilemap, updateTile, switchCameraPreset, ... } from '@webforge/runtime';
```

## Existing Dev Harness Panels

These panels exist in the vanilla dev harness (13k lines in `dev/dev.ts`). Each becomes one or more Svelte components:

1. **Camera Presets** — Preset buttons (mapeditor, isometric, 3/4, top-down, orbit, ff-tactics), transition duration slider
2. **Screen Shake** — Shake type buttons, intensity/duration sliders, trauma readout
3. **Day/Night Cycle** — Time slider (0-24), speed control, time presets dropdown, play/pause
4. **Layers** — Per-layer visibility toggle, opacity slider, layer list
5. **Screen Effects** — Tint color + intensity, flash trigger, fade in/out
6. **Rendering** — Master toggles (post-processing, shadows, fog, glow, bloom, etc.)
7. **Post-FX Details** — ~45 individual controls (bloom threshold, DoF distance, grain intensity, etc.)
8. **Fog** — Type dropdown, density/start/end sliders, color picker, advanced inscattering
9. **Camera Details** — Alpha/beta/radius sliders, FOV, ortho size, limits, panning sensitivity
10. **Glow Layer** — Enable toggle, intensity, blur kernel size, per-mesh include/exclude
11. **Lights** — Per-light controls: type, color, intensity, position, shadow toggle, flicker, VLS, lens flares
12. **Scene Info** — FPS, draw calls, mesh count, active camera info, memory

## Component Organization Pattern

```
src/lib/components/
├── ui/                     (shadcn-svelte primitives — auto-generated)
│   ├── button/
│   ├── slider/
│   ├── switch/
│   ├── select/
│   ├── collapsible/
│   ├── tooltip/
│   └── ...
├── panels/                 (editor sidebar panels)
│   ├── CameraPanel.svelte
│   ├── LightingPanel.svelte
│   ├── LayersPanel.svelte
│   ├── PostFxPanel.svelte
│   ├── FogPanel.svelte
│   └── ...
├── controls/               (reusable editor controls)
│   ├── SliderRow.svelte    (label + slider + value display)
│   ├── ColorPicker.svelte
│   ├── ToggleRow.svelte    (label + switch)
│   ├── DropdownRow.svelte  (label + select)
│   └── ...
└── layout/                 (app shell)
    ├── Sidebar.svelte
    ├── Toolbar.svelte
    ├── Canvas.svelte        (Babylon.js viewport)
    └── StatusBar.svelte
```
