# Collapsed Sidebar Scenes Popover — Design Document

**Date:** 2026-03-04
**Scope:** Fix NavScenes visibility when sidebar is in icon-collapsed mode

## Problem

When the sidebar is in `collapsible="icon"` mode (collapsed to 3rem width), the `Collapsible.Content` inside `NavScenes` becomes completely hidden. The "Scenes" group label disappears (CSS: `opacity-0`, `-mt-8`) and all scene items inside `Collapsible.Content` vanish — there is no way to access scenes while the sidebar is collapsed.

This is a known shadcn/ui limitation (issue #5874): `Collapsible` groups don't work in `icon` mode.

## Solution

Conditionally render a `Popover` flyout when the sidebar is collapsed, and the normal `Collapsible` accordion when expanded. This follows the community-recommended workaround pattern.

### Behavior

**Expanded sidebar (default):**
- No change. `Collapsible.Root` with group label + chevron + scene list works as before.

**Collapsed sidebar (icon mode):**
- A single `MapIcon` button appears (matching icon-mode sizing: 32×32px).
- Tooltip on hover shows "Scenes" (using existing `Sidebar.MenuButton` tooltip support).
- Clicking the button opens a `Popover` flyout to the right (`side="right"`).
- Popover contains the full scene list (name + active indicator + context menu) and "New Scene" button.
- Popover auto-closes when an item is clicked or when clicking outside.

### Component Tree

```
NavScenes
├── [expanded] Collapsible.Root (existing — no changes)
│   ├── Sidebar.GroupLabel → Collapsible.Trigger
│   └── Collapsible.Content → Sidebar.Menu → scene items
│
└── [collapsed] Sidebar.Group
    └── Sidebar.Menu
        └── Sidebar.MenuItem
            └── Popover.Root
                ├── Popover.Trigger → Sidebar.MenuButton (MapIcon, tooltip="Scenes")
                └── Popover.Content (side="right", align="start")
                    └── Sidebar.Menu (variant="sm")
                        ├── scene items (same as expanded)
                        └── "New Scene" button
```

### State Detection

Access sidebar state via `useSidebar()` context:

```typescript
import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';

const sidebar = useSidebar();
// sidebar.state === 'expanded' | 'collapsed'
// sidebar.isMobile — boolean
```

The conditional check: `sidebar.state === 'collapsed' && !sidebar.isMobile`

On mobile, the sidebar uses a sheet (offcanvas) pattern — the icon-collapse issue doesn't apply.

### Locale Keys

No new locale keys needed. The existing `sidebar.scenes` and `sidebar.newScene` keys are reused in the popover content. The tooltip uses the same `sidebar.scenes` label.

### Popover Styling

- `side="right"` — flies out to the right of the collapsed sidebar
- `align="start"` — top-aligned with the trigger button
- `class="w-56 rounded-lg p-2"` — matches dropdown menu width and styling
- Scene items use `Sidebar.MenuButton` with `size="sm"` inside the popover for compact display

## Files Modified

| File | Action |
|------|--------|
| `editor/src/lib/components/NavScenes.svelte` | Add conditional Popover/Collapsible rendering |
| `editor/src/lib/components/nav-scenes.test.ts` | Add test for collapsed state rendering |
| `editor/src/lib/components/NavScenesTest.svelte` | Add collapsed-state test wrapper variant |
| `editor/e2e/sidebar-collapsed.test.ts` | New E2E test for collapsed popover behavior |
| `docs/ARCHITECTURE.md` | Document collapsed sidebar pattern |

## Risk Assessment

- **Low risk**: Only changes `NavScenes.svelte` — no other components affected
- **Popover is already installed**: No new dependencies needed
- **Existing tests preserved**: Expanded-mode behavior unchanged
- **Mobile unaffected**: Conditional check excludes mobile (uses sheet pattern)
