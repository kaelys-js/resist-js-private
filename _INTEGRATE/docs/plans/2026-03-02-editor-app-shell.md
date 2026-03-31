# Editor App Shell — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Task 1: Initialize shadcn-svelte CLI

```bash
cd packages/products/webforge/editor
pnpm dlx shadcn-svelte@latest init
```

Select: TypeScript, default style, base color neutral, CSS variables yes. This creates `components.json`.

Install `lucide-svelte` for icons:
```bash
pnpm add lucide-svelte
```

QA: `pnpm -w run qa:lint --tools`

## Task 2: Install shadcn-svelte components

```bash
cd packages/products/webforge/editor
pnpm dlx shadcn-svelte@latest add sidebar button separator tooltip breadcrumb avatar dropdown-menu collapsible
```

This populates `src/lib/components/ui/` with all needed primitives.

QA: `pnpm -w run qa:lint --tools`

## Task 3: Create nav-main.svelte

File: `src/lib/components/nav-main.svelte`

Collapsible navigation groups. Each group has a title, icon, and sub-items. Uses Sidebar.Group, Sidebar.Menu, Sidebar.MenuButton, Collapsible, and Sidebar.MenuSub components.

Props: `items: Array<{ title: string, icon: Component, isActive?: boolean, items: Array<{ title: string, url: string }> }>`

QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

## Task 4: Create nav-secondary.svelte

File: `src/lib/components/nav-secondary.svelte`

Simple flat nav list for bottom of sidebar. Uses Sidebar.Group, Sidebar.Menu, Sidebar.MenuButton.

Props: `items: Array<{ title: string, icon: Component, url: string }>`, `class?: string`

QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

## Task 5: Create nav-user.svelte

File: `src/lib/components/nav-user.svelte`

Project avatar + name in sidebar footer with dropdown menu. Uses Sidebar.Menu, Sidebar.MenuButton, DropdownMenu, Avatar.

Props: `user: { name: string, avatar: string }`

QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

## Task 6: Create app-sidebar.svelte

File: `src/lib/components/app-sidebar.svelte`

Main sidebar component. Contains nav data definition, renders Sidebar.Root with Header (logo/title), Content (NavMain + NavSecondary), Footer (NavUser).

Uses variant="inset", collapsible="icon".

Navigation data:
- Scene: Camera, Lighting, Fog, Sky
- Rendering: Post-FX, Glow, Shadows
- Tilemap: Layers, Tile Picker, Inspector
- Effects: Screen Effects, Screen Shake
- Secondary: Settings, Help
- User: "WebForge Project"

QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

## Task 7: Create site-header.svelte

File: `src/lib/components/site-header.svelte`

Top header bar inside Sidebar.Inset. Contains Sidebar.Trigger, vertical Separator, Breadcrumb (Editor > Section > Panel).

QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

## Task 8: Update layout and page

Update `src/routes/+layout.svelte`:
- Import Sidebar.Provider, AppSidebar, Sidebar.Inset, SiteHeader
- Wrap in Sidebar.Provider
- Render AppSidebar + Sidebar.Inset containing SiteHeader + children

Update `src/routes/+page.svelte`:
- Simple placeholder with "Canvas will go here" centered text
- Dark background matching editor aesthetic

QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

## Task 9: Final QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

Fix any issues.
