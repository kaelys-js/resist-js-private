# Subscription Plans + Destructive Delete Scene — Design Document

## Date: 2026-03-05

## Overview

Two related changes:

1. **Delete Scene destructive styling** — Apply `variant="destructive"` to the Delete Scene dropdown menu item (and normalize Log Out to use the same pattern)
2. **Subscription Plan → Feature Flag gating** — Add a `subscriptionPlan` picklist to AppPreferences. When the plan changes, it bulk-applies a feature flag preset. Individual flags remain overridable for dev testing.

## Issue 1: Destructive Delete Scene

### Current State

`NavScenes.svelte` renders Delete as a plain `DropdownMenu.Item` — no visual distinction from Rename/Duplicate. `HeaderUser.svelte` styles Log Out with manual `class="text-destructive focus:text-destructive"`.

### Solution

The `DropdownMenu.Item` component already supports `variant="destructive"` via its `data-variant` attribute. This automatically styles:
- Text: `--destructive` color
- Highlight: `bg-destructive/10` (light), `bg-destructive/20` (dark)
- Icons: `!text-destructive`

Both Delete Scene and Log Out should use `variant="destructive"` instead of manual classes.

### Files Changed

- `lib/components/NavScenes.svelte` — add `variant="destructive"` to Delete item
- `lib/components/HeaderUser.svelte` — replace manual class with `variant="destructive"`

## Issue 2: Subscription Plan Feature Gating

### Architecture

```
SUPPORTED_PLANS → AppPreferencesSchema.subscriptionPlan (picklist)
                         ↓
              EditorStore.setSubscriptionPlan(plan)
                         ↓
              getPresetForPlan(plan) → Partial<FeatureFlags>
                         ↓
              Bulk-update _features (spread defaults + preset)
                         ↓
              Dev toolbar auto-discovers picklist → shows in User section
              Feature flags panel shows resulting flags (still toggleable)
```

### Plan Tiers

`SUPPORTED_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const`

Default: `'pro'` (all features enabled — best dev experience)

### Plan → Feature Flag Mapping

Each plan preset lists only the flags that are **false** for that plan. Everything else defaults to `true`.

```typescript
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
```

Free locks 10 flags. Starter locks 3. Pro/Enterprise = all enabled.

### Store Integration

`setSubscriptionPlan(plan)`:
1. Validates plan against `SUPPORTED_PLANS`
2. Sets `_app.subscriptionPlan = plan`
3. Gets preset via `getPresetForPlan(plan)`
4. Resets all flags to `true`, then applies preset's `false` flags
5. Saves to localStorage

### Dev Toolbar Integration

- `subscriptionPlan` is auto-discovered as a picklist in `AppPreferencesSchema`
- `USER_KEYS` in `DevToolbarAppState.svelte` must include `'subscriptionPlan'` so it renders in the User section
- `OPTION_LABELS` in `dev-toolbar-registry.ts` provides human-readable tier names
- `devToolbar.labels.subscriptionPlan` locale key provides the control label
- Plan tier names (`planFree`, `planStarter`, `planPro`, `planEnterprise`) added to `devToolbar` namespace in all locale files

### Schema Changes

```typescript
// editor-state.ts
export const SUPPORTED_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;

// In AppPreferencesSchema:
subscriptionPlan: v.optional(v.picklist(SUPPORTED_PLANS), 'pro'),
```

### New Module: `subscription-plans.ts`

```typescript
// lib/config/subscription-plans.ts
import type { FeatureFlags } from '$lib/schemas/editor-state';
import { SUPPORTED_PLANS } from '$lib/schemas/editor-state';
import type { Str } from '@/schemas/common';

type Plan = (typeof SUPPORTED_PLANS)[number];

const PLAN_PRESETS: Record<Plan, Partial<FeatureFlags>> = { ... };

export function getPresetForPlan(plan: Str): Partial<FeatureFlags> { ... }
export function applyPlanPreset(plan: Str): FeatureFlags { ... }
```

### Locale Additions

Schema (`schema.ts`):
```
subscriptionPlan: messageTemplate()  // in devToolbar.labels
planFree: messageTemplate()          // in devToolbar
planStarter: messageTemplate()       // in devToolbar
planPro: messageTemplate()           // in devToolbar
planEnterprise: messageTemplate()    // in devToolbar
```

English values:
```
subscriptionPlan: 'Subscription Plan'
planFree: 'Free'
planStarter: 'Starter'
planPro: 'Pro'
planEnterprise: 'Enterprise'
```

### Accessibility

- Plan selector uses same Popover+Command pattern as other picklists
- Destructive items use `data-variant="destructive"` for programmatic detection
- Screen readers see plan tier names via locale system
