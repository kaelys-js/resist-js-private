# Header User Dropdown — Implementation Plan

**Date:** 2026-03-05
**Design:** `docs/plans/2026-03-05-header-user-dropdown-design.md`
**Scope:** Editor-only (`@webforge/editor`)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Schema + Store — user preferences and feature flags

**Files:**
- `src/lib/schemas/editor-state.ts`
- `src/lib/stores/editor-state.svelte.ts`

**Changes:**

### `editor-state.ts`

Add 3 fields to `AppPreferencesSchema`:
```typescript
userName: v.optional(v.pipe(v.string(), v.minLength(1)), 'User'),
userEmail: v.optional(v.string(), ''),
userAvatar: v.optional(v.string(), ''),
```

Add 9 flags to `FeatureFlagsSchema`:
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

### `editor-state.svelte.ts`

1. Update `APP_DEFAULTS` — add `userName: 'User'`, `userEmail: ''`, `userAvatar: ''`
2. Update `FEATURE_DEFAULTS` — add all 9 flags as `true`
3. Add `EditorStore` type methods: `setUserName`, `setUserEmail`, `setUserAvatar`
4. Add setter functions (same pattern as `setAppName`):
   - `setUserName(name: string)` — validate with `v.pipe(v.string(), v.minLength(1))`
   - `setUserEmail(email: string)` — validate with `v.string()`
   - `setUserAvatar(url: string)` — validate with `v.string()`
5. Wire setters into `createEditorStore()` return object

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 2: Locale schema + all 7 locale files

**Files:**
- `src/lib/locales/schema.ts`
- `src/lib/locales/en.ts`
- `src/lib/locales/ja.ts`
- `src/lib/locales/zh.ts`
- `src/lib/locales/ko.ts`
- `src/lib/locales/fr.ts`
- `src/lib/locales/de.ts`
- `src/lib/locales/es.ts`

**Changes:**

### `schema.ts`

Add `user` namespace after `project`:
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

Add to `devToolbar.labels`:
```typescript
// Header user dropdown flags
headerUserDropdown: messageTemplate(),
headerUserAvatar: messageTemplate(),
headerUserAccount: messageTemplate(),
headerUserSubscription: messageTemplate(),
headerUserNotifications: messageTemplate(),
headerUserShortcuts: messageTemplate(),
headerUserSettings: messageTemplate(),
headerUserWhatsNew: messageTemplate(),
headerUserLogout: messageTemplate(),
// User preference labels
userName: messageTemplate(),
userEmail: messageTemplate(),
userAvatar: messageTemplate(),
```

### Locale files — `user` namespace

| Key | EN | JA | ZH | KO | FR | DE | ES |
|-----|----|----|----|----|----|----|-----|
| user | User | ユーザー | 用户 | 사용자 | Utilisateur | Benutzer | Usuario |
| account | Account | アカウント | 账户 | 계정 | Compte | Konto | Cuenta |
| subscription | Subscription | サブスクリプション | 订阅 | 구독 | Abonnement | Abonnement | Suscripción |
| notifications | Notifications | 通知 | 通知 | 알림 | Notifications | Benachrichtigungen | Notificaciones |
| keyboardShortcuts | Keyboard Shortcuts | キーボードショートカット | 键盘快捷键 | 키보드 단축키 | Raccourcis clavier | Tastenkürzel | Atajos de teclado |
| settings | Settings | 設定 | 设置 | 설정 | Paramètres | Einstellungen | Configuración |
| whatsNew | What's New | 新機能 | 新功能 | 새로운 기능 | Nouveautés | Neuigkeiten | Novedades |
| logout | Log Out | ログアウト | 退出登录 | 로그아웃 | Déconnexion | Abmelden | Cerrar sesión |
| userMenu | User menu | ユーザーメニュー | 用户菜单 | 사용자 메뉴 | Menu utilisateur | Benutzermenü | Menú de usuario |

### Locale files — `devToolbar.labels` additions

| Key | EN | JA | ZH | KO | FR | DE | ES |
|-----|----|----|----|----|----|----|-----|
| headerUserDropdown | Header User Dropdown | ヘッダーユーザードロップダウン | 头部用户下拉菜单 | 헤더 사용자 드롭다운 | Menu utilisateur en-tête | Header-Benutzermenü | Menú usuario encabezado |
| headerUserAvatar | Header User Avatar | ヘッダーユーザーアバター | 头部用户头像 | 헤더 사용자 아바타 | Avatar utilisateur en-tête | Header-Benutzeravatar | Avatar usuario encabezado |
| headerUserAccount | Header User Account | ヘッダーユーザーアカウント | 头部用户账户 | 헤더 사용자 계정 | Compte utilisateur en-tête | Header-Benutzerkonto | Cuenta usuario encabezado |
| headerUserSubscription | Header User Subscription | ヘッダーユーザーサブスクリプション | 头部用户订阅 | 헤더 사용자 구독 | Abonnement utilisateur en-tête | Header-Benutzerabonnement | Suscripción usuario encabezado |
| headerUserNotifications | Header User Notifications | ヘッダーユーザー通知 | 头部用户通知 | 헤더 사용자 알림 | Notifications utilisateur en-tête | Header-Benutzerbenachrichtigungen | Notificaciones usuario encabezado |
| headerUserShortcuts | Header User Shortcuts | ヘッダーユーザーショートカット | 头部用户快捷键 | 헤더 사용자 단축키 | Raccourcis utilisateur en-tête | Header-Benutzerkürzel | Atajos usuario encabezado |
| headerUserSettings | Header User Settings | ヘッダーユーザー設定 | 头部用户设置 | 헤더 사용자 설정 | Paramètres utilisateur en-tête | Header-Benutzereinstellungen | Configuración usuario encabezado |
| headerUserWhatsNew | Header User What's New | ヘッダーユーザー新機能 | 头部用户新功能 | 헤더 사용자 새로운 기능 | Nouveautés utilisateur en-tête | Header-Benutzerneuigkeiten | Novedades usuario encabezado |
| headerUserLogout | Header User Log Out | ヘッダーユーザーログアウト | 头部用户退出 | 헤더 사용자 로그아웃 | Déconnexion utilisateur en-tête | Header-Benutzerabmeldung | Cerrar sesión usuario encabezado |
| userName | User Name | ユーザー名 | 用户名 | 사용자 이름 | Nom d'utilisateur | Benutzername | Nombre de usuario |
| userEmail | User Email | メールアドレス | 电子邮件 | 이메일 | E-mail | E-Mail | Correo electrónico |
| userAvatar | User Avatar | アバター | 头像 | 아바타 | Avatar | Benutzerbild | Avatar |

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test` — locale validation tests will verify schema/locale alignment

---

## Task 3: HeaderUser component

**Files:**
- Create `src/lib/components/HeaderUser.svelte`

**Component structure:**

1. Import icons: `User`, `CreditCard`, `Bell`, `Keyboard`, `Settings`, `Sparkles`, `LogOut` from `@lucide/svelte/icons/*`
2. Import `Avatar`, `DropdownMenu` from `$lib/components/ui/*/index.js`
3. Import `localeStore`, `t` from `$lib/i18n.svelte`
4. Import `useEditorStore` from `$lib/stores/editor-state.svelte`
5. Derive `monogram` from `store.app.userName` (same algorithm as NavUser)
6. Build trigger: ghost-styled `<button>` wrapping `Avatar.Root` with `data-testid="header-user-trigger"`
7. Build dropdown content per design doc:
   - User info label (avatar + name + email)
   - 3 groups with separators
   - Each item gated by its feature flag
   - Log Out styled with `text-destructive`
8. Conditional separators — only render when the preceding group has at least one visible item

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 4: SiteHeader integration

**Files:**
- `src/lib/components/SiteHeader.svelte`

**Changes:**

1. Import `HeaderUser` from `./HeaderUser.svelte`
2. Add to the `ml-auto` div, BEFORE `ModeToggle`:
```svelte
{#if store.features.headerUserDropdown}
    <HeaderUser />
{/if}
```

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 5: Unit tests

**Files:**
- Create `src/lib/components/HeaderUserTest.svelte`
- Create `src/lib/components/header-user.test.ts`

### `HeaderUserTest.svelte`

Test wrapper using `TestProviders`:
```svelte
<script lang="ts">
import TestProviders from './TestProviders.svelte';
import HeaderUser from './HeaderUser.svelte';
</script>

<TestProviders>
    <HeaderUser />
</TestProviders>
```

### `header-user.test.ts`

Tests:
1. Renders trigger button with data-testid
2. Renders trigger with correct aria-label ("User menu")
3. Renders avatar fallback with monogram "U" (default userName="User")
4. Monogram generation — single word "Alice" → "A"
5. Monogram generation — two words "John Doe" → "JD"
6. Monogram generation — three words "John Michael Doe" → "JM" (takes first two)

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test`

---

## Task 6: Feature flag integration tests

**Files:**
- Create `src/lib/components/HeaderUserFlagsTest.svelte`
- Modify `src/lib/components/feature-flags.integration.test.ts`

### `HeaderUserFlagsTest.svelte`

Test wrapper using `FeatureFlagsTestProviders`:
```svelte
<script lang="ts">
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import SiteHeader from './SiteHeader.svelte';

let { disabledFlags = [] }: { disabledFlags?: string[] } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
    <SiteHeader />
</FeatureFlagsTestProviders>
```

Note: This is the same as `SiteHeaderFlagsTest.svelte`. We can reuse that wrapper. If it already covers HeaderUser (since HeaderUser is rendered inside SiteHeader), we don't need a separate wrapper. Just add tests to the existing `SiteHeader feature flags` describe block.

### `feature-flags.integration.test.ts`

Add to `SiteHeader feature flags` describe block:

1. `headerUserDropdown` enabled → trigger visible (`data-testid="header-user-trigger"`)
2. `headerUserDropdown` disabled → trigger hidden
3. Multiple header flags disabled simultaneously → correct elements hidden

Note: Individual menu item flags (headerUserAccount, etc.) are inside DropdownMenu.Content which is portalled — same limitation as ThemeSwitcher/LanguageSwitcher. Their `{#if}` wiring is verified via E2E tests.

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test`

---

## Task 7: E2E tests

**Files:**
- Create `e2e/header-user.test.ts`

**Tests:**

1. User avatar trigger is visible in header
2. Clicking trigger opens dropdown menu
3. Dropdown shows user info label with default name "User"
4. All 7 menu items visible: Account, Subscription, Notifications, Keyboard Shortcuts, Settings, What's New, Log Out
5. Pressing Escape closes dropdown
6. Log Out item has destructive styling (text-destructive class)
7. Feature flag integration: `?wf.ff.headerUserDropdown=false` hides the trigger

**QA:** `pnpm qa:test:e2e`

---

## Task 8: Documentation

**Files:**
- `docs/ARCHITECTURE.md`

**Changes:**

Add a "Header User Dropdown" subsection under the Editor section documenting:
- Component location and purpose
- Feature flags (9 flags listed)
- State fields (userName, userEmail, userAvatar)
- Locale namespace (`user`)

**QA:** N/A (documentation only)

---

## Summary

| Task | Files | Tests |
|------|-------|-------|
| 1. Schema + Store | 2 modified | Existing tests validate |
| 2. Locale schema + files | 8 modified | `pnpm qa:test` (locale validation) |
| 3. HeaderUser component | 1 created | — |
| 4. SiteHeader integration | 1 modified | — |
| 5. Unit tests | 2 created | `pnpm qa:test` |
| 6. Integration tests | 1 modified (+ optional wrapper) | `pnpm qa:test` |
| 7. E2E tests | 1 created | `pnpm qa:test:e2e` |
| 8. Documentation | 1 modified | — |
