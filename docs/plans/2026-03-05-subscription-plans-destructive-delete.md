# Subscription Plans + Destructive Delete Scene — Implementation Plan

**For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Overview

8 tasks. TDD: tests first, then implementation. QA after every file edit.

All paths relative to `packages/products/webforge/editor/src/`.

QA command: `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 1: Destructive Delete Scene + Log Out normalization

### 1a: Update NavScenes.svelte

Add `variant="destructive"` to Delete Scene dropdown item (line 73):

```svelte
<!-- BEFORE -->
<DropdownMenu.Item>
    <Trash2 aria-hidden="true" class="mr-2 size-4 text-muted-foreground" />
    <span>{t(localeStore.t.scenes.delete, 'Delete')}</span>
</DropdownMenu.Item>

<!-- AFTER -->
<DropdownMenu.Item variant="destructive">
    <Trash2 aria-hidden="true" class="mr-2 size-4" />
    <span>{t(localeStore.t.scenes.delete, 'Delete')}</span>
</DropdownMenu.Item>
```

Note: Remove `text-muted-foreground` from icon — the destructive variant auto-styles icons via `data-[variant=destructive]:*:[svg]:!text-destructive`.

### 1b: Update HeaderUser.svelte

Replace manual class with variant (line 144):

```svelte
<!-- BEFORE -->
<DropdownMenu.Item class="text-destructive focus:text-destructive" onclick={handleLogOut}>

<!-- AFTER -->
<DropdownMenu.Item variant="destructive" onclick={handleLogOut}>
```

### 1c: Tests

- `nav-scenes.test.ts` — add test: Delete menu item renders with `data-variant="destructive"`
- `header-user.test.ts` — add test: Log Out renders with `data-variant="destructive"`

### QA: Run after all edits.

---

## Task 2: Schema — add SUPPORTED_PLANS + subscriptionPlan field

### File: `lib/schemas/editor-state.ts`

1. Add after `SUPPORTED_MODES`:
```typescript
/**
 * Supported subscription plan tiers.
 * Controls which feature flags are enabled by default.
 */
export const SUPPORTED_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;
```

2. Add to `AppPreferencesSchema` (after `userAvatar`, before `mockDataDelay`):
```typescript
/** User's subscription plan tier. Controls default feature flag availability. */
subscriptionPlan: v.optional(v.picklist(SUPPORTED_PLANS), 'pro'),
```

### File: `lib/stores/editor-state.svelte.ts`

3. Add `subscriptionPlan: 'pro'` to `APP_DEFAULTS`
4. Add to `EditorStore` type:
```typescript
/** Set the user's subscription plan. Bulk-applies feature flag preset. */
setSubscriptionPlan(plan: Str): Result<Void>;
```

### QA: Run after edits. May need to update editor-state.test.ts snapshot if it checks defaults.

---

## Task 3: Subscription plan presets module (TDD)

### Test first: `lib/config/subscription-plans.test.ts` (NEW)

Tests:
- `getPresetForPlan('free')` returns object with 10 false flags
- `getPresetForPlan('starter')` returns object with 3 false flags
- `getPresetForPlan('pro')` returns empty object
- `getPresetForPlan('enterprise')` returns empty object
- `applyPlanPreset('free')` returns full FeatureFlags with 10 false, rest true
- `applyPlanPreset('pro')` returns all-true FeatureFlags
- `getPresetForPlan('invalid')` returns empty object (unknown plan = no restrictions)

### Implementation: `lib/config/subscription-plans.ts` (NEW)

```typescript
/**
 * Subscription plan → feature flag preset mapping.
 *
 * Each plan defines which flags are disabled. Missing flags default to true.
 * Used by EditorStore.setSubscriptionPlan() to bulk-apply presets.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import {
    SUPPORTED_PLANS,
    type FeatureFlags,
} from '$lib/schemas/editor-state';

type Plan = (typeof SUPPORTED_PLANS)[number];

const PlanSchema = v.picklist([...SUPPORTED_PLANS]);

/** Feature flags disabled per plan. Missing = enabled (true). */
const PLAN_PRESETS: Record<Plan, Partial<FeatureFlags>> = {
    free: {
        settings: false,
        themeSelection: false,
        languageSelection: false,
        resizableSidebar: false,
        projectDropdown: false,
        projectDropdownSettings: false,
        projectDropdownIcon: false,
        headerUserNotifications: false,
        headerUserShortcuts: false,
        headerUserSettings: false,
    },
    starter: {
        projectDropdownSettings: false,
        headerUserShortcuts: false,
        headerUserSettings: false,
    },
    pro: {},
    enterprise: {},
};

/** All-true feature flags baseline. */
const ALL_ENABLED: FeatureFlags = Object.fromEntries(
    Object.keys(/* FeatureFlagsSchema.entries */).map(k => [k, true])
) as FeatureFlags;
// NOTE: actual implementation will import and iterate FeatureFlagsSchema entries

/**
 * Returns the partial feature flag overrides for a plan.
 * Unknown plans return empty object (no restrictions).
 */
export function getPresetForPlan(plan: Str): Partial<FeatureFlags> { ... }

/**
 * Returns a complete FeatureFlags object with the plan's restrictions applied.
 * All flags start true, then plan's false flags are applied.
 */
export function applyPlanPreset(plan: Str): FeatureFlags { ... }
```

### QA: Run after implementation.

---

## Task 4: Store — setSubscriptionPlan implementation

### File: `lib/stores/editor-state.svelte.ts`

1. Import `SUPPORTED_PLANS` from editor-state schema
2. Import `applyPlanPreset` from `subscription-plans.ts`
3. Implement `setSubscriptionPlan`:

```typescript
function setSubscriptionPlan(plan: Str): Result<Void> {
    const planSchema = v.picklist([...SUPPORTED_PLANS]);
    const result = safeParse(planSchema, plan);
    if (!result.ok) return result;

    _app = { ..._app, subscriptionPlan: result.data };
    _features = applyPlanPreset(result.data);
    return save();
}
```

4. Add `setSubscriptionPlan` to the store object in `createEditorStore()`

### Test: `lib/stores/editor-state.test.ts`

- `setSubscriptionPlan('free')` → sets plan + disables 10 flags
- `setSubscriptionPlan('pro')` → sets plan + all flags true
- `setSubscriptionPlan('invalid')` → returns error
- After `setSubscriptionPlan('free')`, individual `setFeature` still works

### QA: Run after edits.

---

## Task 5: Dev toolbar integration

### File: `lib/components/DevToolbarAppState.svelte`

Add `'subscriptionPlan'` to `USER_KEYS` Set:

```typescript
const USER_KEYS = new Set<Str>(['userName', 'userEmail', 'userAvatar', 'subscriptionPlan']);
```

No other changes needed — the picklist is auto-discovered from the schema and rendered by the existing `prefControl` snippet.

### File: `lib/debug/dev-toolbar-registry.ts`

Add plan tier labels to `OPTION_LABELS`:

```typescript
const OPTION_LABELS: Record<Str, Record<Str, Str>> = {
    theme: { '': 'Default' },
    locale: { en: 'English', ja: 'Japanese', ... },
    subscriptionPlan: {
        free: 'Free',
        starter: 'Starter',
        pro: 'Pro',
        enterprise: 'Enterprise',
    },
};
```

### Test: `lib/debug/dev-toolbar-registry.test.ts`

- `humanizeOption('subscriptionPlan', 'free')` → 'Free'
- `humanizeOption('subscriptionPlan', 'enterprise')` → 'Enterprise'
- `discoverAppPreferences()` includes `subscriptionPlan` with type 'picklist'

### QA: Run after edits.

---

## Task 6: Locale strings — schema + English

### File: `lib/locales/schema.ts`

In `devToolbar.labels`, add:
```typescript
subscriptionPlan: messageTemplate(),
```

In `devToolbar` (top level), add:
```typescript
planFree: messageTemplate(),
planStarter: messageTemplate(),
planPro: messageTemplate(),
planEnterprise: messageTemplate(),
```

### File: `lib/locales/en.ts`

In `devToolbar.labels`, add:
```
subscriptionPlan: 'Subscription Plan',
```

In `devToolbar` (top level), add:
```
planFree: 'Free',
planStarter: 'Starter',
planPro: 'Pro',
planEnterprise: 'Enterprise',
```

### QA: Run after edits.

---

## Task 7: Locale strings — ja, zh, ko, fr, de, es

Add the same 5 keys to all 6 non-English locale files with translated values.

### QA: Run after all edits. Run `pnpm qa:test` — locale validation tests check all files match schema.

---

## Task 8: Final QA + update DevToolbarAppState plan-change behavior

### Special behavior: Plan change should visually update Feature Flags panel

When `callSetter('subscriptionPlan', value)` is called from the dev toolbar, it calls `editorStore.setSubscriptionPlan(value)` which bulk-updates flags. The Feature Flags panel reads from `editorStore.features` reactively, so it updates automatically.

BUT: `callSetter` in DevToolbarAppState uses dynamic method dispatch. It constructs `setSubscriptionPlan` from the key. This already works since the setter naming convention matches.

Verify: The dynamic dispatch `set${key.charAt(0).toUpperCase()}${key.slice(1)}` for key `subscriptionPlan` → `setSubscriptionPlan`. ✓

### Final QA checklist:
- `pnpm qa:type-check` — 0 errors
- `pnpm -w run qa:lint` — 0 errors
- `pnpm -w run qa:format:check` — clean
- `pnpm qa:test` — all pass (including locale schema validation)
- `pnpm qa:test:e2e` — all pass

---

## Verification Checklist

After all tasks:
- [ ] Delete Scene has `variant="destructive"` in NavScenes.svelte
- [ ] Log Out uses `variant="destructive"` (not manual class) in HeaderUser.svelte
- [ ] `SUPPORTED_PLANS` exported from editor-state.ts
- [ ] `subscriptionPlan` field in AppPreferencesSchema
- [ ] `subscription-plans.ts` exists with `getPresetForPlan` + `applyPlanPreset`
- [ ] `setSubscriptionPlan` in EditorStore type + implementation
- [ ] `subscriptionPlan` in `USER_KEYS` in DevToolbarAppState
- [ ] Plan labels in `OPTION_LABELS` in dev-toolbar-registry
- [ ] Locale schema has `subscriptionPlan` label + 4 plan tier keys
- [ ] All 7 locale files have the 5 new keys
- [ ] All tests pass
