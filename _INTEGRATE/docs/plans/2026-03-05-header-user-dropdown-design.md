# Header User Dropdown — Design Document

**Date:** 2026-03-05
**Scope:** Editor-only (`@webforge/editor`)
**Skill:** build-editor

---

## Goals

1. **User identity** — Avatar + name in the header for user account access
2. **Account menu** — Dropdown with account management items (Account, Subscription, Notifications, Keyboard Shortcuts, Settings, What's New, Log Out)
3. **Monogram fallback** — When no avatar image is available, show initials (e.g., "JD" for "John Doe")
4. **Feature flags** — Every element independently toggleable via 9 feature flags
5. **Locale support** — All strings in all 7 locales
6. **State-driven** — User name, email, avatar from `AppPreferencesSchema` in the editor store

---

## Architecture

### Component Tree

```
SiteHeader.svelte
  ├── Sidebar.Trigger + Tooltip (existing)
  ├── Separator (existing)
  ├── Breadcrumb (existing)
  └── div.ml-auto (existing right section)
      ├── HeaderUser.svelte ← NEW (feature-flagged)
      └── ModeToggle (existing)
```

### HeaderUser Internal Structure

```
HeaderUser.svelte
  └── DropdownMenu.Root
      ├── DropdownMenu.Trigger
      │   └── Button (variant="ghost", size="icon")
      │       └── Avatar.Root (size 32px, rounded-full)
      │           ├── Avatar.Image (src=userAvatar)
      │           └── Avatar.Fallback (monogram)
      └── DropdownMenu.Content (w-56, align="end")
          ├── DropdownMenu.Label (non-interactive)
          │   └── Avatar + name + email
          ├── DropdownMenu.Separator
          ├── DropdownMenu.Group
          │   ├── DropdownMenu.Item — Account      (User icon)        [headerUserAccount]
          │   ├── DropdownMenu.Item — Subscription  (CreditCard icon)  [headerUserSubscription]
          │   └── DropdownMenu.Item — Notifications (Bell icon)        [headerUserNotifications]
          ├── DropdownMenu.Separator
          ├── DropdownMenu.Group
          │   ├── DropdownMenu.Item — Keyboard Shortcuts (Keyboard icon)  [headerUserShortcuts]
          │   ├── DropdownMenu.Item — Settings           (Settings icon)  [headerUserSettings]
          │   └── DropdownMenu.Item — What's New         (Sparkles icon)  [headerUserWhatsNew]
          ├── DropdownMenu.Separator
          └── DropdownMenu.Group
              └── DropdownMenu.Item — Log Out (LogOut icon, destructive)  [headerUserLogout]
```

### Data Flow

```
AppPreferencesSchema (userName, userEmail, userAvatar)
  │
  ├──→ EditorStore ($state) ──→ HeaderUser.svelte (reads via useEditorStore())
  │                                  │
  │                                  ├── monogram = $derived(userName → initials)
  │                                  └── avatarSrc = $derived(userAvatar)
  │
  └──→ FeatureFlags ($state)
          │
          ├── headerUserDropdown    → show/hide entire component
          ├── headerUserAvatar      → show/hide avatar image (fallback always shows)
          ├── headerUserAccount     → show/hide Account item
          ├── headerUserSubscription → show/hide Subscription item
          ├── headerUserNotifications → show/hide Notifications item
          ├── headerUserShortcuts   → show/hide Keyboard Shortcuts item
          ├── headerUserSettings    → show/hide Settings item
          ├── headerUserWhatsNew    → show/hide What's New item
          └── headerUserLogout      → show/hide Log Out item
```

---

## Schema Changes

### `lib/schemas/editor-state.ts`

**AppPreferencesSchema** — Add 3 fields:

```typescript
userName: v.optional(v.pipe(v.string(), v.minLength(1)), 'User'),
userEmail: v.optional(v.string(), ''),
userAvatar: v.optional(v.string(), ''),
```

**FeatureFlagsSchema** — Add 9 flags:

```typescript
headerUserDropdown: v.optional(v.boolean(), true),
headerUserAvatar: v.optional(v.boolean(), true),
headerUserAccount: v.optional(v.boolean(), true),
headerUserSubscription: v.optional(v.boolean(), true),
headerUserNotifications: v.optional(v.boolean(), true),
headerUserShortcuts: v.optional(v.boolean(), true),
headerUserSettings: v.optional(v.boolean(), true),
headerUserWhatsNew: v.optional(v.boolean(), true),
headerUserLogout: v.optional(v.boolean(), true),
```

### `lib/stores/editor-state.svelte.ts`

**EditorStore type** — Add 3 methods:

```typescript
setUserName(name: string): Result<Void>;
setUserEmail(email: string): Result<Void>;
setUserAvatar(url: string): Result<Void>;
```

**APP_DEFAULTS** — Add:

```typescript
userName: 'User',
userEmail: '',
userAvatar: '',
```

**FEATURE_DEFAULTS** — Add all 9 flags as `true`.

**New setter functions** — Same pattern as `setAppName`, `setTheme`, etc. Validate via Valibot, mutate `_app`, call `save()`.

---

## Locale Changes

### Schema (`lib/locales/schema.ts`)

Add `user` namespace:

```typescript
user: v.strictObject({
    user: messageTemplate(),
    account: messageTemplate(),
    subscription: messageTemplate(),
    notifications: messageTemplate(),
    keyboardShortcuts: messageTemplate(),
    settings: messageTemplate(),
    whatsNew: messageTemplate(),
    logout: messageTemplate(),
    userMenu: messageTemplate(),
}),
```

Note: `userMenu` is for the `aria-label` on the trigger button.

### DevToolbar Labels

Add labels for the 9 new feature flags to `devToolbar.labels`:

```typescript
headerUserDropdown: messageTemplate(),
headerUserAvatar: messageTemplate(),
headerUserAccount: messageTemplate(),
headerUserSubscription: messageTemplate(),
headerUserNotifications: messageTemplate(),
headerUserShortcuts: messageTemplate(),
headerUserSettings: messageTemplate(),
headerUserWhatsNew: messageTemplate(),
headerUserLogout: messageTemplate(),
```

Add labels for the 3 new app preference fields:

```typescript
userName: messageTemplate(),   // already exists as "App Name" — need "User Name"
userEmail: messageTemplate(),
userAvatar: messageTemplate(),
```

Wait — `userName` conflicts with `appName`. Let me check... No, these go in `devToolbar.labels` which already has `appName`. We add `userName`, `userEmail`, `userAvatar` there.

### English Strings (`en.ts`)

```typescript
user: {
    user: 'User',
    account: 'Account',
    subscription: 'Subscription',
    notifications: 'Notifications',
    keyboardShortcuts: 'Keyboard Shortcuts',
    settings: 'Settings',
    whatsNew: "What's New",
    logout: 'Log Out',
    userMenu: 'User menu',
},
```

DevToolbar labels additions:

```typescript
headerUserDropdown: 'Header User Dropdown',
headerUserAvatar: 'Header User Avatar',
headerUserAccount: 'Header User Account',
headerUserSubscription: 'Header User Subscription',
headerUserNotifications: 'Header User Notifications',
headerUserShortcuts: 'Header User Shortcuts',
headerUserSettings: 'Header User Settings',
headerUserWhatsNew: "Header User What's New",
headerUserLogout: 'Header User Log Out',
userName: 'User Name',
userEmail: 'User Email',
userAvatar: 'User Avatar',
```

### All 7 Locale Files

| Key | EN | JA | ZH | KO | FR | DE | ES |
|-----|----|----|----|----|----|----|-----|
| user.user | User | ユーザー | 用户 | 사용자 | Utilisateur | Benutzer | Usuario |
| user.account | Account | アカウント | 账户 | 계정 | Compte | Konto | Cuenta |
| user.subscription | Subscription | サブスクリプション | 订阅 | 구독 | Abonnement | Abonnement | Suscripción |
| user.notifications | Notifications | 通知 | 通知 | 알림 | Notifications | Benachrichtigungen | Notificaciones |
| user.keyboardShortcuts | Keyboard Shortcuts | キーボードショートカット | 键盘快捷键 | 키보드 단축키 | Raccourcis clavier | Tastenkürzel | Atajos de teclado |
| user.settings | Settings | 設定 | 设置 | 설정 | Paramètres | Einstellungen | Configuración |
| user.whatsNew | What's New | 新機能 | 新功能 | 새로운 기능 | Nouveautés | Neuigkeiten | Novedades |
| user.logout | Log Out | ログアウト | 退出登录 | 로그아웃 | Déconnexion | Abmelden | Cerrar sesión |
| user.userMenu | User menu | ユーザーメニュー | 用户菜单 | 사용자 메뉴 | Menu utilisateur | Benutzermenü | Menú de usuario |

---

## Component: `HeaderUser.svelte`

### Props

None — reads directly from `useEditorStore()`.

### Reactive State

```typescript
const store = useEditorStore();

// Monogram from user name (same algorithm as NavUser)
const monogram: string = $derived(
    store.app.userName
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join(''),
);
```

### Lucide Icons

```typescript
import UserIcon from '@lucide/svelte/icons/user';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Bell from '@lucide/svelte/icons/bell';
import Keyboard from '@lucide/svelte/icons/keyboard';
import SettingsIcon from '@lucide/svelte/icons/settings';
import Sparkles from '@lucide/svelte/icons/sparkles';
import LogOut from '@lucide/svelte/icons/log-out';
```

### Trigger Button

Ghost button with avatar, no text label (icon-only in the header):

```svelte
<DropdownMenu.Trigger>
    {#snippet child({ props })}
        <button
            class="inline-flex items-center justify-center rounded-full
                   size-8 hover:bg-accent focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t(localeStore.t.user.userMenu, 'User menu')}
            data-testid="header-user-trigger"
            {...props}
        >
            <Avatar.Root class="size-8">
                {#if store.features.headerUserAvatar && store.app.userAvatar}
                    <Avatar.Image src={store.app.userAvatar} alt={store.app.userName} />
                {/if}
                <Avatar.Fallback class="text-xs font-medium">
                    {monogram}
                </Avatar.Fallback>
            </Avatar.Root>
        </button>
    {/snippet}
</DropdownMenu.Trigger>
```

### Dropdown Content

```svelte
<DropdownMenu.Content class="w-56" align="end" sideOffset={8}>
    <!-- User info label -->
    <DropdownMenu.Label class="p-0 font-normal">
        <div class="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
            <Avatar.Root class="size-8">
                {#if store.features.headerUserAvatar && store.app.userAvatar}
                    <Avatar.Image src={store.app.userAvatar} alt={store.app.userName} />
                {/if}
                <Avatar.Fallback class="text-xs font-medium">
                    {monogram}
                </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-medium">{store.app.userName}</span>
                {#if store.app.userEmail}
                    <span class="truncate text-xs text-muted-foreground">
                        {store.app.userEmail}
                    </span>
                {/if}
            </div>
        </div>
    </DropdownMenu.Label>
    <DropdownMenu.Separator />

    <!-- Account group -->
    <DropdownMenu.Group>
        {#if store.features.headerUserAccount}
            <DropdownMenu.Item>
                <UserIcon aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.account, 'Account')}
            </DropdownMenu.Item>
        {/if}
        {#if store.features.headerUserSubscription}
            <DropdownMenu.Item>
                <CreditCard aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.subscription, 'Subscription')}
            </DropdownMenu.Item>
        {/if}
        {#if store.features.headerUserNotifications}
            <DropdownMenu.Item>
                <Bell aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.notifications, 'Notifications')}
            </DropdownMenu.Item>
        {/if}
    </DropdownMenu.Group>
    <DropdownMenu.Separator />

    <!-- Tools group -->
    <DropdownMenu.Group>
        {#if store.features.headerUserShortcuts}
            <DropdownMenu.Item>
                <Keyboard aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.keyboardShortcuts, 'Keyboard Shortcuts')}
            </DropdownMenu.Item>
        {/if}
        {#if store.features.headerUserSettings}
            <DropdownMenu.Item>
                <SettingsIcon aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.settings, 'Settings')}
            </DropdownMenu.Item>
        {/if}
        {#if store.features.headerUserWhatsNew}
            <DropdownMenu.Item>
                <Sparkles aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.whatsNew, "What's New")}
            </DropdownMenu.Item>
        {/if}
    </DropdownMenu.Group>
    <DropdownMenu.Separator />

    <!-- Logout group -->
    <DropdownMenu.Group>
        {#if store.features.headerUserLogout}
            <DropdownMenu.Item class="text-destructive focus:text-destructive">
                <LogOut aria-hidden="true" class="mr-2 size-4" />
                {t(localeStore.t.user.logout, 'Log Out')}
            </DropdownMenu.Item>
        {/if}
    </DropdownMenu.Group>
</DropdownMenu.Content>
```

### Separators Between Groups

Separators are only rendered when the group above has at least one visible item. Use `{#if}` blocks to conditionally render separators based on the feature flags of the preceding group.

---

## Integration in `SiteHeader.svelte`

```svelte
<div class="ml-auto flex items-center gap-2">
    {#if store.features.headerUserDropdown}
        <HeaderUser />
    {/if}
    {#if store.features.modeToggle}
        <ModeToggle />
    {/if}
</div>
```

Import at the top:
```typescript
import HeaderUser from './HeaderUser.svelte';
```

---

## Accessibility

| Concern | Implementation |
|---------|---------------|
| Trigger role | `<button>` with `aria-label="User menu"` (localized) |
| Menu semantics | Handled by shadcn/bits-ui DropdownMenu (Radix pattern) |
| Keyboard nav | Arrow keys, Enter/Space to select, Escape to close |
| Focus trap | bits-ui handles focus management inside open menu |
| Screen reader | Trigger announces "User menu", items read as menu items |
| Destructive action | Log Out styled with `text-destructive` for visual distinction |
| Data test IDs | `data-testid="header-user-trigger"` on trigger button |

---

## Test Strategy

### Unit Tests (`header-user.test.ts`)

1. Renders avatar fallback with monogram
2. Monogram generates correctly for single-word name
3. Monogram generates correctly for multi-word name
4. Monogram handles empty/whitespace name gracefully
5. Renders trigger with correct aria-label
6. Renders data-testid on trigger

### Integration Tests (`feature-flags.integration.test.ts`)

Add a new `HeaderUser feature flags` describe block:

1. `headerUserDropdown` enabled → trigger visible in header
2. `headerUserDropdown` disabled → trigger hidden
3. Each of the 7 menu item flags: enabled → item visible, disabled → item hidden
4. `headerUserAvatar` disabled → avatar image hidden, monogram still shows
5. Multiple flags disabled simultaneously → correct elements hidden

### E2E Tests (`e2e/header-user.test.ts`)

1. User avatar trigger visible in header
2. Clicking trigger opens dropdown
3. All 7 menu items visible by default
4. Pressing Escape closes dropdown
5. User info label shows default user name
6. Log Out item has destructive styling

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/components/HeaderUser.svelte` | User dropdown component |
| Create | `src/lib/components/HeaderUserTest.svelte` | Unit test wrapper |
| Create | `src/lib/components/HeaderUserFlagsTest.svelte` | Feature flag test wrapper |
| Create | `src/lib/components/header-user.test.ts` | Unit tests |
| Create | `e2e/header-user.test.ts` | E2E tests |
| Modify | `src/lib/schemas/editor-state.ts` | Add user prefs + 9 flags |
| Modify | `src/lib/stores/editor-state.svelte.ts` | Add defaults, setters, type |
| Modify | `src/lib/locales/schema.ts` | Add `user` namespace + devToolbar labels |
| Modify | `src/lib/locales/en.ts` | English strings |
| Modify | `src/lib/locales/ja.ts` | Japanese strings |
| Modify | `src/lib/locales/zh.ts` | Chinese strings |
| Modify | `src/lib/locales/ko.ts` | Korean strings |
| Modify | `src/lib/locales/fr.ts` | French strings |
| Modify | `src/lib/locales/de.ts` | German strings |
| Modify | `src/lib/locales/es.ts` | Spanish strings |
| Modify | `src/lib/components/SiteHeader.svelte` | Render HeaderUser |
| Modify | `src/lib/components/feature-flags.integration.test.ts` | Add flag tests |
| Modify | `docs/ARCHITECTURE.md` | Document Header User Dropdown |

All paths relative to `packages/products/webforge/editor/`.
