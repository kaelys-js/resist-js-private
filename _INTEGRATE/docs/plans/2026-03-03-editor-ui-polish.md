# Editor UI Polish — Implementation Plan

**Date:** 2026-03-03
**Design:** [2026-03-03-editor-ui-polish-design.md](2026-03-03-editor-ui-polish-design.md)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Add `resizableSidebar` feature flag

**Files:**
- `src/lib/schemas/editor-state.ts` — add `resizableSidebar` to `FeatureFlagsSchema`
- `src/lib/stores/editor-state.svelte.ts` — add to `FEATURE_DEFAULTS`
- `src/lib/stores/editor-state.test.ts` — add test for new flag

### 1a. Schema change

In `src/lib/schemas/editor-state.ts`, add to `FeatureFlagsSchema`:

```typescript
resizableSidebar: v.optional(v.boolean(), true),
```

### 1b. Store defaults

In `src/lib/stores/editor-state.svelte.ts`, add to `FEATURE_DEFAULTS`:

```typescript
resizableSidebar: true,
```

Also add to `EditorStore` type if needed (the `features` getter already returns the full `FeatureFlags` type, so it picks up the new field automatically).

### 1c. Test

In `src/lib/stores/editor-state.test.ts`, add test:

```typescript
it('has resizableSidebar feature flag defaulting to true', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    expect(result.data.features.resizableSidebar).toBe(true);
});
```

### QA
```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 2: Create locale-display utility

**Files:**
- `src/lib/utils/locale-display.ts` — new utility
- `src/lib/utils/locale-display.test.ts` — unit tests

### 2a. Write tests first

`src/lib/utils/locale-display.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getLanguageDisplayName, getLanguageDisplayNames } from './locale-display';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';

describe('getLanguageDisplayName', () => {
    it('returns endonym and exonym for Japanese viewed from English', () => {
        const result = getLanguageDisplayName('ja', 'en');
        if (!result.ok) throw new Error(result.error.message);
        expect(result.data.code).toBe('ja');
        expect(result.data.endonym).toBe('日本語');
        expect(result.data.exonym).toBe('Japanese');
    });

    it('returns matching endonym/exonym for English viewed from English', () => {
        const result = getLanguageDisplayName('en', 'en');
        if (!result.ok) throw new Error(result.error.message);
        expect(result.data.endonym).toBe('English');
        expect(result.data.exonym).toBe('English');
    });

    it('returns French exonym when viewed from French locale', () => {
        const result = getLanguageDisplayName('ja', 'fr');
        if (!result.ok) throw new Error(result.error.message);
        expect(result.data.exonym).toBe('japonais');
    });

    it('returns error for empty code', () => {
        const result = getLanguageDisplayName('', 'en');
        expect(result.ok).toBe(false);
    });
});

describe('getLanguageDisplayNames', () => {
    it('returns display info for all supported locales', () => {
        const result = getLanguageDisplayNames(SUPPORTED_LOCALES, 'en');
        if (!result.ok) throw new Error(result.error.message);
        expect(result.data).toHaveLength(SUPPORTED_LOCALES.length);
    });

    it('each entry has code, endonym, and exonym', () => {
        const result = getLanguageDisplayNames(SUPPORTED_LOCALES, 'en');
        if (!result.ok) throw new Error(result.error.message);
        for (const entry of result.data) {
            expect(entry.code).toBeTruthy();
            expect(entry.endonym).toBeTruthy();
            expect(entry.exonym).toBeTruthy();
        }
    });
});
```

### 2b. Implement utility

`src/lib/utils/locale-display.ts`:

```typescript
import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import { ERRORS, err, type Result, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

const LanguageDisplayInfoSchema = v.strictObject({
    code: v.string(),
    endonym: v.string(),
    exonym: v.string(),
});

export type LanguageDisplayInfo = v.InferOutput<typeof LanguageDisplayInfoSchema>;

export function getLanguageDisplayName(code: Str, currentLocale: Str): Result<LanguageDisplayInfo> {
    const codeResult = safeParse(v.pipe(v.string(), v.minLength(1)), code);
    if (!codeResult.ok) return err(ERRORS.VALIDATION.INVALID_FORMAT, 'Language code must be non-empty');

    const localeResult = safeParse(v.pipe(v.string(), v.minLength(1)), currentLocale);
    if (!localeResult.ok) return err(ERRORS.VALIDATION.INVALID_FORMAT, 'Current locale must be non-empty');

    const endonymDisplay = new Intl.DisplayNames([code], { type: 'language' });
    const exonymDisplay = new Intl.DisplayNames([currentLocale], { type: 'language' });

    const endonym: string | undefined = endonymDisplay.of(code);
    const exonym: string | undefined = exonymDisplay.of(code);

    if (!endonym || !exonym) {
        return err(ERRORS.LOCALE.UNSUPPORTED, `Cannot resolve display name for: ${code}`);
    }

    return okUnchecked<LanguageDisplayInfo>({ code, endonym, exonym });
}

export function getLanguageDisplayNames(
    codes: readonly Str[],
    currentLocale: Str,
): Result<LanguageDisplayInfo[]> {
    const results: LanguageDisplayInfo[] = [];
    for (const code of codes) {
        const result = getLanguageDisplayName(code, currentLocale);
        if (!result.ok) return result;
        results.push(result.data);
    }
    return okUnchecked<LanguageDisplayInfo[]>(results);
}
```

### QA
```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test --run src/lib/utils/locale-display.test.ts
```

---

## Task 3: Update LanguageSwitcher for dual display names

**Files:**
- `src/lib/components/LanguageSwitcher.svelte` — use Intl.DisplayNames
- `src/lib/components/language-switcher.test.ts` — update tests

### 3a. Update tests

Add to `src/lib/components/language-switcher.test.ts`:

```typescript
it('renders endonym for each language', () => {
    render(LanguageSwitcherTest);
    // Japanese endonym should appear
    expect(screen.getByText('日本語', { exact: false })).toBeInTheDocument();
});

it('renders exonym in parentheses when different from endonym', () => {
    render(LanguageSwitcherTest);
    // Japanese viewed from English default locale should show "(Japanese)"
    expect(screen.getByText(/Japanese/)).toBeInTheDocument();
});

it('renders lang attribute on language items', () => {
    const { container } = render(LanguageSwitcherTest);
    const langElements = container.querySelectorAll('[lang]');
    expect(langElements.length).toBeGreaterThan(0);
});
```

### 3b. Update LanguageSwitcher.svelte

Replace hardcoded `languages` array with dynamic computation:

```svelte
<script lang="ts">
import Globe from '@lucide/svelte/icons/globe';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { getTextDirection } from '@/locale/direction';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';
import { getLanguageDisplayNames, type LanguageDisplayInfo } from '$lib/utils/locale-display';

const store = useEditorStore();

const languages: LanguageDisplayInfo[] = $derived.by(() => {
    const result = getLanguageDisplayNames(SUPPORTED_LOCALES, store.app.locale);
    if (!result.ok) return [];
    return result.data;
});

function switchLanguage(code: string): void {
    // ... existing implementation unchanged
}

function isDuplicate(info: LanguageDisplayInfo): boolean {
    return info.endonym.localeCompare(info.exonym, undefined, { sensitivity: 'base' }) === 0;
}
</script>

<DropdownMenu.Sub>
    <DropdownMenu.SubTrigger>
        <Globe class="mr-2 size-4" />
        {t(localeStore.t.settings.language, 'Language')}
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent>
        {#each languages as lang (lang.code)}
            <DropdownMenu.Item onclick={() => switchLanguage(lang.code)}>
                {#if store.app.locale === lang.code}
                    <Check class="mr-2 size-4" />
                {:else}
                    <span class="mr-2 size-4 inline-block"></span>
                {/if}
                <span lang={lang.code}>{lang.endonym}</span>
                {#if !isDuplicate(lang)}
                    <span class="text-muted-foreground ml-1">({lang.exonym})</span>
                {/if}
            </DropdownMenu.Item>
        {/each}
    </DropdownMenu.SubContent>
</DropdownMenu.Sub>
```

### QA
```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test --run src/lib/components/language-switcher.test.ts
```

---

## Task 4: Remove ModeToggle from NavUser + gate SiteHeader

**Files:**
- `src/lib/components/NavUser.svelte` — remove ModeToggle
- `src/lib/components/SiteHeader.svelte` — gate ModeToggle behind feature flag
- `src/lib/components/nav-user.test.ts` — update tests
- `src/lib/components/site-header.test.ts` — add feature flag tests

### 4a. Update NavUser tests

Add to `src/lib/components/nav-user.test.ts`:

```typescript
it('does NOT render ModeToggle', () => {
    render(NavUserTest);
    expect(screen.queryByRole('button', { name: /toggle mode/i })).not.toBeInTheDocument();
});
```

### 4b. Update SiteHeader tests

Add to `src/lib/components/site-header.test.ts`:

```typescript
it('renders mode toggle button (feature flag defaults to true)', () => {
    // Existing test — already passes
    render(SiteHeaderTest);
    expect(screen.getByRole('button', { name: /toggle mode/i })).toBeInTheDocument();
});
```

Note: Testing the flag=false case requires a custom test wrapper that sets the feature flag. Create `SiteHeaderTestNoModeToggle.svelte` that initializes store with `modeToggle: false`, or modify `TestProviders` to accept feature overrides.

### 4c. Remove ModeToggle from NavUser.svelte

Remove lines 81–83:
```svelte
{#if store.features.modeToggle}
    <ModeToggle />
{/if}
```

Remove the `ModeToggle` import (line 11) since it's no longer used.

### 4d. Gate ModeToggle in SiteHeader.svelte

Wrap the existing `<ModeToggle />` (line 47):

```svelte
{#if store.features.modeToggle}
    <ModeToggle />
{/if}
```

Add import for `useEditorStore`:
```typescript
import { useEditorStore } from '$lib/stores/editor-state.svelte';
const store = useEditorStore();
```

### QA
```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test --run src/lib/components/nav-user.test.ts src/lib/components/site-header.test.ts
```

---

## Task 5: Install shadcn-svelte resizable + integrate into layout

**Files:**
- `src/lib/components/ui/resizable/` — auto-generated by shadcn-svelte CLI
- `src/routes/+layout.svelte` — wrap in PaneGroup/Pane/PaneResizer

### 5a. Install

```bash
cd packages/products/webforge/editor && npx shadcn-svelte@latest add resizable
```

### 5b. Update +layout.svelte

Import PaneForge components (from the shadcn-svelte resizable wrapper or directly from paneforge):

```svelte
<script lang="ts">
// ... existing imports ...
import { PaneGroup, Pane, PaneResizer } from 'paneforge';

// ... existing store/locale setup ...

// Resizable sidebar state
let sidebarPaneRef: ReturnType<typeof Pane> | undefined = $state();
let providerRef: HTMLDivElement | null = $state(null);

// Sync PaneForge resize → CSS variable
function handleSidebarResize(size: number): void {
    if (!providerRef) return;
    // PaneForge gives size as percentage of group
    // Convert to pixels for the CSS variable
    const groupEl = providerRef.querySelector('[data-pane-group]');
    if (!groupEl) return;
    const widthPx = groupEl.clientWidth * (size / 100);
    providerRef.style.setProperty('--sidebar-width', `${widthPx}px`);
}

// Sync PaneForge collapse ↔ sidebar state
function handleCollapse(): void {
    if (store.app.sidebarOpen) store.setSidebarOpen(false);
}

function handleExpand(): void {
    if (!store.app.sidebarOpen) store.setSidebarOpen(true);
}

// Sync sidebar toggle (Ctrl+B) → PaneForge
function handleSidebarOpenChange(open: boolean): void {
    if (open) {
        sidebarPaneRef?.expand();
    } else {
        sidebarPaneRef?.collapse();
    }
}

// Double-click handle to reset
function handleDoubleClick(): void {
    sidebarPaneRef?.resize(20);
}
</script>

<!-- In template -->
<Sidebar.Provider
    bind:ref={providerRef}
    open={store.app.sidebarOpen}
    onOpenChange={store.features.resizableSidebar ? handleSidebarOpenChange : undefined}
    style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
    {#if store.features.resizableSidebar}
        <PaneGroup direction="horizontal" autoSaveId="webforge:sidebar-width">
            <Pane
                bind:this={sidebarPaneRef}
                defaultSize={20}
                minSize={12}
                maxSize={40}
                collapsible={true}
                collapsedSize={3}
                onResize={handleSidebarResize}
                onCollapse={handleCollapse}
                onExpand={handleExpand}
            >
                <AppSidebar />
            </Pane>
            <PaneResizer
                class="w-1.5 bg-transparent hover:bg-border active:bg-ring transition-colors"
                ondblclick={handleDoubleClick}
            />
            <Pane defaultSize={80}>
                <Sidebar.Inset>
                    <SiteHeader isError={Boolean(page.error)} />
                    <div class="flex flex-1 flex-col">
                        {@render children()}
                    </div>
                </Sidebar.Inset>
            </Pane>
        </PaneGroup>
    {:else}
        <AppSidebar />
        <Sidebar.Inset>
            <SiteHeader isError={Boolean(page.error)} />
            <div class="flex flex-1 flex-col">
                {@render children()}
            </div>
        </Sidebar.Inset>
    {/if}
</Sidebar.Provider>
```

### 5c. ResizeObserver for viewport changes

Add a ResizeObserver that fires when the PaneGroup element resizes (e.g., window resize), keeping `--sidebar-width` in sync:

```typescript
$effect(() => {
    if (!store.features.resizableSidebar || !providerRef) return;
    const groupEl = providerRef.querySelector('[data-pane-group]');
    if (!groupEl) return;

    const observer = new ResizeObserver(() => {
        const size = sidebarPaneRef?.getSize();
        if (size !== undefined) {
            const widthPx = groupEl.clientWidth * (size / 100);
            providerRef?.style.setProperty('--sidebar-width', `${widthPx}px`);
        }
    });
    observer.observe(groupEl);
    return () => observer.disconnect();
});
```

### QA
```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 6: E2E tests

**Files:**
- `e2e/sidebar.test.ts` — add resize E2E tests
- `e2e/language-switcher.test.ts` — update for dual display format
- `e2e/theme-mode.test.ts` — verify no ModeToggle in NavUser dropdown

### 6a. Sidebar resize E2E

Add to `e2e/sidebar.test.ts`:

```typescript
test('resize handle is visible between sidebar and content', async ({ page }) => {
    await page.goto('/');
    const resizer = page.locator('[data-pane-group] [data-resize-handle]');
    await expect(resizer).toBeAttached();
});

test('sidebar can be resized by dragging handle', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-pane-group] [data-pane]').first();
    const initialWidth = await sidebar.boundingBox().then(b => b?.width ?? 0);

    const handle = page.locator('[data-resize-handle]');
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 100, handleBox.y + handleBox.height / 2);
    await page.mouse.up();

    const newWidth = await sidebar.boundingBox().then(b => b?.width ?? 0);
    expect(newWidth).toBeGreaterThan(initialWidth);
});

test('sidebar resize persists across reload', async ({ page }) => {
    await page.goto('/');
    const handle = page.locator('[data-resize-handle]');
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');

    // Drag to resize
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 100, handleBox.y + handleBox.height / 2);
    await page.mouse.up();

    const sidebar = page.locator('[data-pane-group] [data-pane]').first();
    const widthBefore = await sidebar.boundingBox().then(b => b?.width ?? 0);

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const widthAfter = await sidebar.boundingBox().then(b => b?.width ?? 0);
    // Should be approximately the same (PaneForge autoSaveId persistence)
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(5);
});

test('Ctrl+B still toggles sidebar with resizable layout', async ({ page }) => {
    await page.goto('/');
    const sidebarSlot = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebarSlot).toHaveAttribute('data-state', 'expanded');

    await page.locator('body').click();
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebarSlot).toHaveAttribute('data-state', 'collapsed');
});
```

### 6b. Language switcher E2E updates

Update `e2e/language-switcher.test.ts`:

```typescript
test('language sub-menu shows dual display names', async ({ page }) => {
    await page.goto('/');
    const userButton = page.getByText('WebForge Project');
    await userButton.click();
    await expect(page.getByText('Language')).toBeVisible();
    await page.getByText('Language').hover();
    await page.waitForTimeout(300);
    // Should show endonym + exonym for non-English languages
    await expect(page.getByText('日本語')).toBeVisible();
    await expect(page.getByText(/Japanese/)).toBeVisible();
});

test('switching locale updates language display format', async ({ page }) => {
    await page.goto('/');
    // Switch to French
    await page.getByText('WebForge Project').click();
    await page.getByText('Language').hover();
    await page.waitForTimeout(300);
    await page.getByText('Français').click();
    await page.waitForTimeout(200);

    // Re-open and check Japanese shows French exonym
    await page.getByText('WebForge Project').click();
    // "Langue" is French for "Language"
    const langTrigger = page.locator('[role="menuitem"]').filter({ hasText: /Langue|Language/ });
    await langTrigger.hover();
    await page.waitForTimeout(300);
    // Japanese exonym in French is "japonais"
    await expect(page.getByText(/japonais/i)).toBeVisible();
});
```

### 6c. NavUser ModeToggle removal E2E

Add to `e2e/theme-mode.test.ts`:

```typescript
test('NavUser dropdown does NOT contain mode toggle', async ({ page }) => {
    await page.goto('/');
    await page.getByText('WebForge Project').click();
    await page.waitForTimeout(200);
    // ModeToggle renders a button with aria-label "Toggle mode"
    // It should NOT be inside the dropdown
    const dropdown = page.locator('[role="menu"]');
    await expect(dropdown.getByRole('button', { name: /toggle mode/i })).not.toBeVisible();
});
```

### QA
```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm exec playwright test
```

---

## Task 7: Final QA sweep

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test && pnpm exec playwright test
```

Fix any failures.

---

## Implementation Order

1. Task 1 → Task 2 → Task 3 → Task 4 (independent of PaneForge)
2. Task 5 (install + layout integration)
3. Task 6 (E2E tests)
4. Task 7 (final QA)
