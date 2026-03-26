# WCAG 2.2 AA Accessibility — Implementation Plan

**Date:** 2026-03-04
**Design doc:** `docs/plans/2026-03-04-wcag-accessibility-design.md`
**Scope:** 45 accessibility items across 25 files

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Global CSS — Motion Safety & Ring Contrast

**Files:**
- `packages/products/webforge/editor/src/app.css`

**Tests:** `packages/products/webforge/editor/src/app-css.test.ts` (NEW)
- Test: `prefers-reduced-motion` rule exists in CSS
- Test: light `--ring` value is `oklch(0.556 0 0)`
- Test: dark `--ring` value is `oklch(0.556 0 0)`

**Implementation:**
1. Add at end of `app.css`, after the view-transition rules:
```css
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```
2. Change `:root` `--ring` from `oklch(0.708 0 0)` to `oklch(0.556 0 0)`
3. Change `.dark` `--ring` from `oklch(0.439 0 0)` to `oklch(0.556 0 0)`

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 2: Announce Utility & Locale Keys

**Files:**
- `packages/products/webforge/editor/src/lib/utils/announce.svelte.ts` (NEW)
- `packages/products/webforge/editor/src/lib/locales/schema.ts`
- `packages/products/webforge/editor/src/lib/locales/en.ts`
- `packages/products/webforge/editor/src/lib/locales/ja.ts`
- `packages/products/webforge/editor/src/lib/locales/zh.ts`
- `packages/products/webforge/editor/src/lib/locales/ko.ts`
- `packages/products/webforge/editor/src/lib/locales/fr.ts`
- `packages/products/webforge/editor/src/lib/locales/de.ts`
- `packages/products/webforge/editor/src/lib/locales/es.ts`

**Tests:** `packages/products/webforge/editor/src/lib/utils/announce.svelte.test.ts` (NEW)
- Test: `announce()` sets message
- Test: `getAnnouncement()` returns current message
- Test: existing locale validation tests pass (they auto-check all locales match schema)

**Implementation:**
1. Create `announce.svelte.ts`:
   - `let message: string = $state('')`
   - `export function announce(text: string): void` — clears then sets via rAF
   - `export function getAnnouncement(): string` — returns current message
2. Add to `common` namespace in locale schema:
   - `skipToContent: messageTemplate()`
   - `toggleMode: messageTemplate()`
   - `sidebar: messageTemplate()`
   - `more: messageTemplate()`
3. Add to `errors` namespace:
   - `copyErrorId: messageTemplate()`
4. Add translations to all 7 locale files

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test`

---

## Task 3: Layout — Skip Link, Main Landmark, Live Region

**Files:**
- `packages/products/webforge/editor/src/routes/+layout.svelte`

**Tests:** `packages/products/webforge/editor/e2e/accessibility.test.ts` (NEW)
- Test: skip link exists and is first focusable element
- Test: skip link becomes visible on focus
- Test: `<main id="main-content">` landmark exists
- Test: `aria-live="polite"` region exists in DOM
- Test: sidebar has `aria-label`

**Implementation:**
1. Import `{ getAnnouncement }` from announce utility and locale helpers
2. Add skip link as first child inside `<Sidebar.Provider>`:
   ```svelte
   <a href="#main-content" class="sr-only focus:not-sr-only ...">
     {t(localeStore.t.common.skipToContent, 'Skip to main content')}
   </a>
   ```
3. Wrap `{@render children()}` in `<main id="main-content" tabindex="-1">`
4. Add live region before closing of layout:
   ```svelte
   <div aria-live="polite" aria-atomic="true" class="sr-only">{getAnnouncement()}</div>
   ```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 4: AppLogo — Reduced Motion

**Files:**
- `packages/products/webforge/editor/src/lib/components/AppLogo.svelte`

**Tests:** Visual only (CSS media query — not testable in unit tests)

**Implementation:**
1. Add inside existing `<style>` block:
```css
@media (prefers-reduced-motion: reduce) {
  .logo-img { animation: none; opacity: 1; }
  .logo-sparkle::after { animation: none; opacity: 0; }
}
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 5: Simple ARIA Fixes — SiteHeader, NavSecondary, AppSidebar

**Files:**
- `packages/products/webforge/editor/src/lib/components/SiteHeader.svelte`
- `packages/products/webforge/editor/src/lib/components/NavSecondary.svelte`
- `packages/products/webforge/editor/src/lib/components/AppSidebar.svelte`

**Tests:** `packages/products/webforge/editor/e2e/accessibility.test.ts` (extend)
- Test: Separator in SiteHeader has `role="separator"`
- Test: AppSidebar has `aria-label`

**Implementation:**
1. **SiteHeader:** Add `role="separator"` to `<Separator>` component
2. **NavSecondary:** Add `aria-hidden="true"` to `<item.icon />`:
   ```svelte
   <span aria-hidden="true"><item.icon /></span>
   ```
3. **AppSidebar:** Add `aria-label={t(localeStore.t.common.sidebar, 'Application sidebar')}` to `<Sidebar.Root>`

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 6: ModeToggle & NavUser — Labels & ARIA

**Files:**
- `packages/products/webforge/editor/src/lib/components/ModeToggle.svelte`
- `packages/products/webforge/editor/src/lib/components/NavUser.svelte`

**Tests:** `packages/products/webforge/editor/e2e/accessibility.test.ts` (extend)
- Test: ModeToggle button has localized `aria-label`
- Test: NavUser trigger has accessible name

**Implementation:**
1. **ModeToggle:** Import `localeStore, t`. Change `aria-label="Toggle mode"` to `aria-label={t(localeStore.t.common.toggleMode, 'Toggle mode')}`. Add `aria-hidden="true"` to Sun/Moon icons.
2. **NavUser:** Add `<span class="sr-only">{user.name}</span>` inside the trigger button. Add `aria-hidden="true"` to ChevronsUpDown and other decorative icons.

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 7: ThemeSwitcher & LanguageSwitcher — Active State & ARIA

**Files:**
- `packages/products/webforge/editor/src/lib/components/ThemeSwitcher.svelte`
- `packages/products/webforge/editor/src/lib/components/LanguageSwitcher.svelte`

**Tests:** `packages/products/webforge/editor/e2e/accessibility.test.ts` (extend)
- Test: Active theme item has `aria-current="true"`
- Test: Active language item has `aria-current="true"`

**Implementation:**
1. **ThemeSwitcher:** On each `DropdownMenu.RadioItem`, add `aria-current={isActive ? 'true' : undefined}`. Add `aria-hidden="true"` on color dot spans. Add `textValue` prop to items.
2. **LanguageSwitcher:** On each `DropdownMenu.RadioItem`, add `aria-current={isActive ? 'true' : undefined}`. Add `aria-hidden="true"` on Globe icon. Add `textValue` prop to items.

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 8: NavScenes — Localize & ARIA

**Files:**
- `packages/products/webforge/editor/src/lib/components/NavScenes.svelte`

**Tests:** `packages/products/webforge/editor/e2e/accessibility.test.ts` (extend)
- Test: Active scene has `aria-current="page"`

**Implementation:**
1. Import `localeStore, t`
2. Localize sr-only "More" text: `{t(localeStore.t.common.more, 'More')}`
3. Add `aria-hidden="true"` to Folder, MoreHorizontal icons
4. Add `aria-current={scene.isActive ? 'page' : undefined}` on active scene link

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 9: ErrorPage — Accessible Copy & ARIA

**Files:**
- `packages/products/webforge/editor/src/lib/components/ErrorPage.svelte`

**Tests:** `packages/products/webforge/editor/e2e/accessibility.test.ts` (extend)
- Test: Copy button has `aria-label`
- Test: Status icon has `aria-hidden`

**Implementation:**
1. Import `announce` from announce utility
2. Add `aria-label={t(localeStore.t.errors.copyErrorId, 'Copy error reference')}` to copy button
3. Call `announce(copiedLabel)` after successful clipboard write
4. Add `aria-hidden="true"` to StatusIcon, Copy, and Check icons

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 10: DevToolbar — Roving Tabindex, Keyboard, Labels

**Files:**
- `packages/products/webforge/editor/src/lib/components/DevToolbar.svelte`

**Tests:** `packages/products/webforge/editor/e2e/dev-toolbar.test.ts` (extend existing)
- Test: Only one toolbar button has `tabindex="0"`
- Test: ArrowRight moves focus to next button
- Test: Escape closes toolbar when no panel active
- Test: Toolbar has `aria-label`

**Implementation:**
1. Add `focusedIndex` state and toolbar button ID array
2. Set `tabindex={focusedIndex === i ? 0 : -1}` on each toolbar button
3. Add `handleToolbarKeydown` for ArrowLeft/ArrowRight/Home/End
4. Add Escape handler: close toolbar when no panel active
5. Move focus into panel content when panel opens (via `tick()`)
6. Add `aria-label={t(localeStore.t.devToolbar.title, 'Developer Toolbar')}` on toolbar container
7. Add `aria-label={t(localeStore.t.devToolbar.expandToolbar, 'Expand developer toolbar')}` on trigger pill
8. Add keyboard repositioning: Shift+Arrow cycles trigger between left/center/right positions
9. Fix `<kbd>` contrast: replace `bg-muted` with `bg-secondary` on shortcut badges

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 11: DevToolbar Panels — Target Size, Contrast, Search A11y

**Files:**
- `packages/products/webforge/editor/src/lib/components/DevToolbarFeatureFlags.svelte`
- `packages/products/webforge/editor/src/lib/components/DevToolbarAppState.svelte`
- `packages/products/webforge/editor/src/lib/components/DevToolbarDebug.svelte`

**Tests:** `packages/products/webforge/editor/e2e/dev-toolbar.test.ts` (extend existing)
- Test: Switch elements do NOT have `scale-75` class
- Test: Clear search button has minimum 24px size (`size-6`)
- Test: Search inputs have `aria-label`

**Implementation:**
1. **All three files:** Remove `class="scale-75"` from all `<Switch>` components
2. **FeatureFlags:**
   - Add `size-6 flex items-center justify-center` to clear search button
   - Remove `opacity-40` from SearchX icon — use plain `text-muted-foreground`
   - Remove `opacity-70` from hint text — use plain `text-muted-foreground`
   - Add `aria-label={t(localeStore.t.devToolbar.searchFlags, 'Search flags…')}` on search input
   - Add `announce()` call with filtered count after search
3. **AppState:**
   - Add `aria-label` on search input
   - Add `announce()` call with filtered count after search
4. **Debug:** Remove `scale-75` only (no search input in this panel)

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 12: E2E Tests & Final QA

**Files:**
- `packages/products/webforge/editor/e2e/accessibility.test.ts` (finalize)

**Tests:** All E2E tests from tasks 3-11 consolidated into `accessibility.test.ts`

**Implementation:**
1. Ensure all accessibility E2E tests pass
2. Run full test suite: `pnpm qa:test && pnpm qa:test:e2e`
3. Run full QA: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Summary

| Task | Files | Focus |
|------|-------|-------|
| 1 | 1 | CSS motion safety, ring contrast |
| 2 | 9 | Announce utility, locale keys |
| 3 | 1 | Layout skip link, main landmark, live region |
| 4 | 1 | AppLogo reduced motion |
| 5 | 3 | SiteHeader, NavSecondary, AppSidebar ARIA |
| 6 | 2 | ModeToggle, NavUser labels |
| 7 | 2 | ThemeSwitcher, LanguageSwitcher active state |
| 8 | 1 | NavScenes localize, ARIA |
| 9 | 1 | ErrorPage accessible copy |
| 10 | 1 | DevToolbar roving tabindex, keyboard |
| 11 | 3 | DevToolbar panels target size, contrast |
| 12 | 1 | E2E consolidation, final QA |
| **Total** | **25 files** | **12 tasks** |
