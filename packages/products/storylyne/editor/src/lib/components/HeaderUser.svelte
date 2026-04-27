<script lang="ts">
  /**
   * Editor wrapper around the shared `@/ui/header-user` avatar
   * dropdown. Wires the i18n store for menu labels, the editor-state
   * store for the current user, and SvelteKit `goto`/`page` for
   * sign-in / sign-out URL routing.
   *
   * @module
   */
  import HeaderUser from '@/ui/header-user/HeaderUser.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { useEditorStore } from '$lib/stores/editor-state.svelte';
  import { URL_PARAM_PREFIX } from '$lib/config/app-meta';
  import type { Bool, Str, Void } from '@/schemas/common';

  const store: ReturnType<typeof useEditorStore> = useEditorStore();

  /**
   * Handles Log Out click: navigates to the current page with `?${URL_PARAM_PREFIX}auth=false`
   * to simulate a logged-out state in dev mode.
   */
  function handleLogOut(): Void {
    const url: URL = new URL(page.url);
    url.searchParams.set(`${URL_PARAM_PREFIX}auth`, 'false');
    goto(url.toString());
  }

  const features: {
    avatar: Bool;
    account: Bool;
    subscription: Bool;
    notifications: Bool;
    shortcuts: Bool;
    settings: Bool;
    whatsNew: Bool;
    logout: Bool;
  } = $derived({
    avatar: store.features.headerUserAvatar,
    account: store.features.headerUserAccount,
    subscription: store.features.headerUserSubscription,
    notifications: store.features.headerUserNotifications,
    shortcuts: store.features.headerUserShortcuts,
    settings: store.features.headerUserSettings,
    whatsNew: store.features.headerUserWhatsNew,
    logout: store.features.headerUserLogout,
  });

  const labels: {
    userMenu: Str;
    account: Str;
    subscription: Str;
    notifications: Str;
    keyboardShortcuts: Str;
    settings: Str;
    whatsNew: Str;
    logout: Str;
  } = $derived({
    userMenu: t(localeStore.t.user.userMenu, 'User menu'),
    account: t(localeStore.t.user.account, 'Account'),
    subscription: t(localeStore.t.user.subscription, 'Subscription'),
    notifications: t(localeStore.t.user.notifications, 'Notifications'),
    keyboardShortcuts: t(localeStore.t.user.keyboardShortcuts, 'Keyboard Shortcuts'),
    settings: t(localeStore.t.user.settings, 'Settings'),
    whatsNew: t(localeStore.t.user.whatsNew, "What's New"),
    logout: t(localeStore.t.user.logout, 'Log Out'),
  });
</script>

<HeaderUser
  userName={store.app.userName}
  userEmail={store.app.userEmail}
  userAvatar={store.app.userAvatar}
  onLogOut={handleLogOut}
  {features}
  {labels}
/>
