# Collapsed Sidebar Scenes Popover — Implementation Plan

**Date:** 2026-03-04
**Design:** `docs/plans/2026-03-04-collapsed-sidebar-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Task 1: Update NavScenes with conditional Popover/Collapsible

**File:** `packages/products/webforge/editor/src/lib/components/NavScenes.svelte`

Changes:
1. Import `useSidebar` from sidebar context
2. Import `* as Popover` from popover UI
3. Get sidebar state: `const sidebar = useSidebar()`
4. Derive collapsed check: `const isIconCollapsed = $derived(sidebar.state === 'collapsed' && !sidebar.isMobile)`
5. Extract shared scene list markup into a `{#snippet sceneList()}` block to avoid duplication
6. Wrap existing `Collapsible.Root` in `{#if !isIconCollapsed}` block
7. Add `{:else}` block with Popover pattern:
   - `Sidebar.Group` > `Sidebar.Menu` > `Sidebar.MenuItem` > `Popover.Root`
   - `Popover.Trigger` wraps a `Sidebar.MenuButton` with `MapIcon` + `tooltipContent={scenesLabel}`
   - `Popover.Content` with `side="right"` `align="start"` `class="w-56 rounded-lg p-2"` contains `{@render sceneList()}`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 2: Update unit tests

**Files:**
- `packages/products/webforge/editor/src/lib/components/NavScenesTest.svelte`
- `packages/products/webforge/editor/src/lib/components/nav-scenes.test.ts`

Changes to `NavScenesTest.svelte`:
1. Add optional `collapsed` prop (default `false`)
2. When `collapsed`, pass `open={false}` to `Sidebar.Provider` to simulate collapsed sidebar state

Changes to `nav-scenes.test.ts`:
1. Keep existing tests (they test expanded state)
2. Add new `describe('collapsed sidebar')` block:
   - Test that popover trigger button renders when sidebar is collapsed
   - Test that scene items are NOT directly visible (inside popover content, hidden until opened)

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test --project editor` — all editor tests must pass

## Task 3: Add E2E test for collapsed sidebar popover

**File:** `packages/products/webforge/editor/e2e/sidebar-collapsed.test.ts`

Tests:
1. Collapse the sidebar using Cmd/Ctrl+B keyboard shortcut
2. Verify a map icon button is visible in the collapsed sidebar
3. Click the map icon — verify popover opens with scene names
4. Click a scene in the popover — verify popover closes
5. Expand sidebar — verify normal collapsible Scenes section returns

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test:e2e` — all E2E tests must pass

## Task 4: Update ARCHITECTURE.md

Add a note under the sidebar section about the collapsed sidebar pattern:
- Icon-mode uses `Popover` flyout for sections with nested content
- Conditional rendering based on `useSidebar().state`
- Known shadcn/ui limitation and workaround

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 5: Run full QA suite

- `pnpm -w run qa:lint --tools` — 0 errors
- `pnpm qa:lint` — 0 errors
- `pnpm qa:format` — clean
- `pnpm qa:test` — all unit tests pass
- `pnpm qa:test:e2e` — all E2E tests pass
