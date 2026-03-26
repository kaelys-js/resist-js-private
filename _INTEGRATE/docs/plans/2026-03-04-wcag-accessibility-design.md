# WCAG 2.2 AA Accessibility — Design Document

**Date:** 2026-03-04
**Scope:** Editor components (`src/lib/components/` excluding `src/lib/components/ui/`), `+layout.svelte`, `app.css`
**Skill:** build-editor
**Standard:** WCAG 2.2 Level AA (56 success criteria)

---

## Goals

1. **Skip navigation** — keyboard users can bypass sidebar and jump to main content
2. **Landmark regions** — screen readers can navigate between sidebar, header, and main content
3. **Live regions** — status changes (copy, save, search counts) announced to screen readers
4. **Motion safety** — `prefers-reduced-motion` disables all CSS animations globally
5. **Contrast compliance** — fix opacity-based contrast failures, improve focus ring visibility
6. **Target size compliance** — all interactive elements meet 24x24px minimum (SC 2.5.8)
7. **Keyboard completeness** — DevToolbar implements WAI-ARIA toolbar pattern with roving tabindex
8. **ARIA correctness** — decorative icons hidden, active states announced, labels localized
9. **Zero visual regression** — all changes are structural/ARIA-only or behind `prefers-reduced-motion`

---

## Architecture

### Global Live Region

A single shared `aria-live="polite"` region in `+layout.svelte` handles all status announcements. Components announce via a shared `announce()` function exported from a new utility module.

```
+layout.svelte
  │
  ├─ <a href="#main-content" class="skip-link">Skip to main content</a>
  │
  ├─ <Sidebar.Provider>
  │    ├─ <AppSidebar />           ← aria-label="Application sidebar"
  │    └─ <Sidebar.Inset>
  │         ├─ <SiteHeader />
  │         └─ <main id="main-content" tabindex="-1">
  │              {@render children()}
  │           </main>
  │
  ├─ <DevToolbar />
  │
  └─ <div aria-live="polite" aria-atomic="true" class="sr-only">
       {announceMessage}
     </div>
```

### Announce Utility (`src/lib/utils/announce.svelte.ts`)

```typescript
// Svelte 5 runes-based announcement system
let message: string = $state('');

export function announce(text: string): void {
  message = '';
  // requestAnimationFrame ensures screen readers detect the change
  requestAnimationFrame(() => { message = text; });
}

export function getAnnouncement(): string {
  return message;
}
```

Components call `announce('Copied!')` and the layout's live region reactively renders it. The `requestAnimationFrame` gap ensures screen readers detect the DOM mutation as a change (clearing then setting prevents "same value" being ignored).

---

## Component Changes

### 1. `+layout.svelte`

**Skip link:** First focusable element. Visually hidden until focused. Links to `#main-content`.

```svelte
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999]
         focus:rounded-md focus:bg-background focus:text-foreground focus:border-2
         focus:border-ring focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
>
  {t(localeStore.t.common.skipToContent, 'Skip to main content')}
</a>
```

**Main landmark:** Wrap `{@render children()}` in `<main id="main-content" tabindex="-1">`.

**Live region:** Add at end of layout, before closing `</Sidebar.Provider>`:
```svelte
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {getAnnouncement()}
</div>
```

**Sidebar landmark:** Add `aria-label` prop to `Sidebar.Provider` or `AppSidebar`.

### 2. `app.css` — Motion & Contrast

**`prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This is the standard approach from `prefers-reduced-motion: reduce` best practices. Uses `0.01ms` rather than `0s` to ensure animation events still fire (preventing JS breakage) while making motion imperceptible.

**Focus ring contrast fix:**
```css
:root {
  --ring: oklch(0.556 0 0);   /* was 0.708 — now matches muted-foreground for 4.73:1 */
}
.dark {
  --ring: oklch(0.556 0 0);   /* was 0.439 — now 4.04:1 against dark bg (above 3:1) */
}
```

Themed `--ring` overrides already use the `--primary` color which has adequate contrast. Only the default light/dark need fixing.

### 3. `AppLogo.svelte`

Add `prefers-reduced-motion` to the component's `<style>` block:
```css
@media (prefers-reduced-motion: reduce) {
  .logo-img { animation: none; opacity: 1; }
  .logo-sparkle::after { animation: none; opacity: 0; }
}
```

### 4. `ModeToggle.svelte`

- Localize `aria-label`: `aria-label={t(localeStore.t.common.toggleMode, 'Toggle mode')}`
- Add `aria-hidden="true"` to Sun and Moon `<svelte:component>` icons

### 5. `NavUser.svelte`

- Add accessible name to trigger: screen reader text inside the button (e.g., `<span class="sr-only">{user.name}</span>`)
- Add `aria-hidden="true"` to ChevronsUpDown, LogOut, and other decorative icons

### 6. `ThemeSwitcher.svelte`

- Add `data-current={isActive}` and `aria-current={isActive ? 'true' : undefined}` on active theme item
- Add `aria-hidden="true"` on color dot `<span>` elements
- Add `textValue` prop to each `DropdownMenu.RadioItem`

### 7. `LanguageSwitcher.svelte`

- Add `aria-current={isActive ? 'true' : undefined}` on active language item
- Add `aria-hidden="true"` on Globe icon
- Add `textValue` prop to each `DropdownMenu.RadioItem`

### 8. `NavScenes.svelte`

- Localize sr-only text: `{t(localeStore.t.common.more, 'More')}` instead of hardcoded `"More"`
- Add `aria-hidden="true"` to Folder, MoreHorizontal icons
- Add `aria-current="page"` on active scene's link

### 9. `AppSidebar.svelte`

- Add localized `aria-label` to `Sidebar.Root`: `aria-label={t(localeStore.t.common.sidebar, 'Application sidebar')}`

### 10. `NavSecondary.svelte`

- Add `aria-hidden="true"` to `<item.icon />` elements (link text provides name)

### 11. `SiteHeader.svelte`

- Add explicit `role="separator"` to the `Separator` component (overrides Bits UI bug that sets `role="group"`)

### 12. `ErrorPage.svelte`

- Add localized `aria-label` on copy button: `aria-label={t(localeStore.t.errors.copyErrorId, 'Copy error reference')}`
- Call `announce(copiedLabel)` on successful copy
- Add `aria-hidden="true"` on StatusIcon and Copy/Check icons

### 13. `DevToolbar.svelte` — Roving Tabindex

The toolbar currently has `role="toolbar"` but all 6 buttons are individually tabbable. WAI-ARIA requires roving tabindex.

**State:**
```typescript
let focusedIndex: number = $state(0);
const toolbarButtons: string[] = ['flags', 'state', 'debug', 'theme', 'copy', 'reset'];
```

**Button rendering:**
```svelte
<Button
  tabindex={focusedIndex === i ? 0 : -1}
  onkeydown={handleToolbarKeydown}
  ...
/>
```

**Key handler:**
```typescript
function handleToolbarKeydown(e: KeyboardEvent): void {
  const len = toolbarButtons.length;
  switch (e.key) {
    case 'ArrowRight': focusedIndex = (focusedIndex + 1) % len; break;
    case 'ArrowLeft': focusedIndex = (focusedIndex - 1 + len) % len; break;
    case 'Home': focusedIndex = 0; break;
    case 'End': focusedIndex = len - 1; break;
    default: return;
  }
  e.preventDefault();
  // Focus the button at the new index
  tick().then(() => { /* querySelector + focus */ });
}
```

**Additional keyboard fixes:**
- Escape closes toolbar when no panel active: `if (e.key === 'Escape' && !activePanel) toolbarOpen = false;`
- Panel open focuses first element: `tick().then(() => panelEl?.querySelector('input, button')?.focus())`
- Add localized `aria-label` on toolbar and trigger pill

**Keyboard repositioning:**
- Shift+Arrow on trigger pill moves position (left/right/center)
- Three positions: left (20%), center (50%), right (80%) — arrow keys cycle between them

### 14. `DevToolbarFeatureFlags.svelte` — Target Size & Contrast

- **Remove `scale-75`** from Switch — accept default size (fits the compact toolbar layout at full scale-1)
- **Add `size-6`** to clear search button wrapper for 24px minimum target
- **Remove `opacity-40`** from SearchX: use `text-muted-foreground` without opacity
- **Remove `opacity-70`** from hint text: use `text-muted-foreground` without opacity
- Add `aria-label` to search input
- Add live region: call `announce()` with result count after search filtering

### 15. `DevToolbarAppState.svelte` — Target Size

- **Remove `scale-75`** from Switch
- Add `aria-label` to search input
- Add live region for search results count

### 16. `DevToolbarDebug.svelte` — Target Size

- **Remove `scale-75`** from Switch

### 17. `DevToolbar.svelte` — `<kbd>` Contrast

The `<kbd>` elements displaying shortcut hints use `text-xs text-muted-foreground` on `bg-muted`, measuring 4.28:1 in light mode (needs 4.5:1). Fix by using `text-muted-foreground/80` → plain `text-muted-foreground` (already sufficient) and changing `bg-muted` to `bg-muted/70` to lighten the background, or adding a slightly darker foreground class.

Simplest fix: remove `bg-muted` from `<kbd>` and use `bg-secondary` which has lighter background in light mode, giving better contrast.

---

## Locale Keys

New keys needed in the `common` namespace of `EditorLocaleSchema`:

```typescript
skipToContent: messageTemplate(),
toggleMode: messageTemplate(),
sidebar: messageTemplate(),
more: messageTemplate(),
copyErrorId: messageTemplate(),
```

The DevToolbar keys already exist from the previous locale work. The `errors.copyErrorId` key is new.

---

## Files Modified

| File | Action |
|------|--------|
| `src/app.css` | Add `prefers-reduced-motion`, fix `--ring` values |
| `src/routes/+layout.svelte` | Add skip link, `<main>` landmark, live region |
| `src/lib/utils/announce.svelte.ts` | NEW: shared announce utility |
| `src/lib/locales/schema.ts` | Add `skipToContent`, `toggleMode`, `sidebar`, `more`, `copyErrorId` keys |
| `src/lib/locales/en.ts` | English strings |
| `src/lib/locales/ja.ts` | Japanese strings |
| `src/lib/locales/zh.ts` | Chinese strings |
| `src/lib/locales/ko.ts` | Korean strings |
| `src/lib/locales/fr.ts` | French strings |
| `src/lib/locales/de.ts` | German strings |
| `src/lib/locales/es.ts` | Spanish strings |
| `src/lib/components/AppLogo.svelte` | Add reduced-motion styles |
| `src/lib/components/ModeToggle.svelte` | Localize aria-label, aria-hidden on icons |
| `src/lib/components/NavUser.svelte` | Add accessible name, aria-hidden on icons |
| `src/lib/components/ThemeSwitcher.svelte` | aria-current, aria-hidden on dots, textValue |
| `src/lib/components/LanguageSwitcher.svelte` | aria-current, aria-hidden, textValue |
| `src/lib/components/NavScenes.svelte` | Localize sr-only, aria-hidden, aria-current |
| `src/lib/components/AppSidebar.svelte` | Add aria-label to sidebar |
| `src/lib/components/NavSecondary.svelte` | aria-hidden on icons |
| `src/lib/components/SiteHeader.svelte` | role="separator" on Separator |
| `src/lib/components/ErrorPage.svelte` | aria-label on copy, announce on copy, aria-hidden |
| `src/lib/components/DevToolbar.svelte` | Roving tabindex, Escape, focus management, kbd contrast, keyboard repositioning, aria-labels |
| `src/lib/components/DevToolbarFeatureFlags.svelte` | Remove scale-75, fix target sizes, fix contrast, aria-label, announce |
| `src/lib/components/DevToolbarAppState.svelte` | Remove scale-75, aria-label, announce |
| `src/lib/components/DevToolbarDebug.svelte` | Remove scale-75 |

**Total: 25 files** (1 new, 24 modified)

---

## Risk Assessment

- **Zero visual regression risk** for ARIA attribute additions (aria-hidden, aria-label, aria-current, role) — these are invisible to sighted users
- **Low risk** for `prefers-reduced-motion` — only affects users who opt in via OS settings
- **Low risk** for `--ring` change — subtle lightness shift, only visible on focus
- **Medium risk** for removing `scale-75` from Switch — switches will appear slightly larger in the DevToolbar panels. Acceptable tradeoff for accessibility compliance
- **Low risk** for skip link — only visible on keyboard focus, invisible otherwise
- **Low risk** for roving tabindex — keyboard-only change, no visual impact

---

## Out of Scope (Documented)

These are in `src/lib/components/ui/` (shadcn-managed) and NOT modified:
- `--border` contrast at ~1.3:1 (SC 1.4.11)
- `opacity-50` on icons in `command-input.svelte`, `select-trigger.svelte`
- `sidebar-menu-action.svelte` "More" button at 20x20px (SC 2.5.8)
- Bits UI Separator `role="group"` bug (worked around in SiteHeader)
- Dark `--destructive` bg contrast (theme design decision)

## Known Upstream Issues (Cannot Fix)

- NVDA+Firefox: Cannot open DropdownMenu with Enter (Radix #2700)
- VoiceOver+Firefox/Safari: Cannot use VO+Space on DropdownMenu (Radix #1963)
- NVDA/VoiceOver iOS: Switch announced as "checkbox" (NVDA #11310)
