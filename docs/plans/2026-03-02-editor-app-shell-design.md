# Editor App Shell Design

## Overview

Adapt shadcn-svelte dashboard-01 block as the WebForge editor foundation. Provides sidebar navigation, header, and main content area. Panel contents come in subsequent builds.

## Layout Architecture

```
Sidebar.Provider (manages sidebar state)
├── AppSidebar (variant="inset", collapsible="icon", side="left")
│   ├── Sidebar.Header
│   │   └── Project name + logo
│   ├── Sidebar.Content
│   │   ├── NavMain (collapsible groups: Scene, Rendering, Tilemap, Effects)
│   │   └── NavSecondary (Settings, Help links)
│   └── Sidebar.Footer
│       └── NavUser (project avatar + dropdown)
└── Sidebar.Inset
    ├── SiteHeader
    │   ├── Sidebar.Trigger (hamburger toggle)
    │   ├── Separator (vertical)
    │   └── Breadcrumb (dynamic based on active panel)
    └── main
        └── +page.svelte (Babylon.js canvas placeholder)
```

## Component Tree

### `+layout.svelte`
- Wraps everything in `Sidebar.Provider`
- Renders `AppSidebar` + `Sidebar.Inset`
- `Sidebar.Inset` contains `SiteHeader` + `{@render children()}`

### `app-sidebar.svelte`
- Props: none (reads nav data from inline config)
- Uses `Sidebar.Root` with `variant="inset"`, `collapsible="icon"`
- Three sections: Header (logo), Content (nav groups), Footer (user)

### `nav-main.svelte`
- Props: `items` array of `{ title, icon, isActive, items: subItems[] }`
- Each top-level item is a `Collapsible` inside `Sidebar.Group`
- Sub-items are `Sidebar.MenuSubButton` links
- Active state tracked by which panel is open

### `nav-secondary.svelte`
- Props: `items` array of `{ title, icon, url }`
- Simple flat list at sidebar bottom (Settings, Help)
- Uses `Sidebar.Group` with `Sidebar.MenuButton`

### `nav-user.svelte`
- Props: `user` object `{ name, avatar }`
- Shows project avatar + name in sidebar footer
- `DropdownMenu` on click with project actions

### `site-header.svelte`
- Fixed top header inside `Sidebar.Inset`
- Contains: `Sidebar.Trigger`, vertical `Separator`, `Breadcrumb`
- Breadcrumb shows: Editor > [Active Section] > [Active Panel]

## Navigation Data

```typescript
const navMain = [
  {
    title: 'Scene',
    icon: Clapperboard,
    isActive: true,
    items: [
      { title: 'Camera', url: '#camera' },
      { title: 'Lighting', url: '#lighting' },
      { title: 'Fog', url: '#fog' },
      { title: 'Sky', url: '#sky' },
    ],
  },
  {
    title: 'Rendering',
    icon: Layers,
    items: [
      { title: 'Post-FX', url: '#postfx' },
      { title: 'Glow', url: '#glow' },
      { title: 'Shadows', url: '#shadows' },
    ],
  },
  {
    title: 'Tilemap',
    icon: Grid3x3,
    items: [
      { title: 'Layers', url: '#layers' },
      { title: 'Tile Picker', url: '#tilepicker' },
      { title: 'Inspector', url: '#inspector' },
    ],
  },
  {
    title: 'Effects',
    icon: Sparkles,
    items: [
      { title: 'Screen Effects', url: '#screeneffects' },
      { title: 'Screen Shake', url: '#screenshake' },
    ],
  },
];
```

## CSS Variables

Dashboard-01 uses these sidebar CSS variables (already in `app.css`):
- `--sidebar-width: calc(var(--spacing) * 72)` (18rem)
- `--header-height: calc(var(--spacing) * 12)` (3rem)

## shadcn-svelte Components Required

Install via CLI: `sidebar`, `button`, `separator`, `tooltip`, `breadcrumb`, `avatar`, `dropdown-menu`, `collapsible`

## Icons

Use `lucide-svelte` (peer dep of shadcn-svelte sidebar).

## Dark Theme

Already configured in `app.css` with `.dark` wrapper in layout. All shadcn components respect the CSS variables automatically.
