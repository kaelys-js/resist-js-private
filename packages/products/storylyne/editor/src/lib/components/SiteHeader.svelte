<script lang="ts">
  import SiteHeader from '@/ui/site-header/SiteHeader.svelte';
  import * as Breadcrumb from '@/ui/breadcrumb/index.js';
  import HeaderUser from './HeaderUser.svelte';
  import ModeToggle from './ModeToggle.svelte';
  import { page } from '$app/state';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { useEditorStore } from '$lib/stores/editor-state.svelte';
  import { shortcutStore } from '$lib/stores/keyboard-shortcuts-store.svelte';
  import type { ServerUser } from '$lib/server/data/types';
  import type { Bool, Str } from '@/schemas/common';

  let {
    isError = false,
    user = null,
    activeSceneName = '',
  }: { isError?: Bool; user?: ServerUser | null; activeSceneName?: Str } = $props();

  const store: ReturnType<typeof useEditorStore> = useEditorStore();

  const homeHref: Str = $derived(page.url.search ? `/${page.url.search}` : '/');

  /** Whether to show scene-level breadcrumb segments. */
  const showSceneCrumbs: Bool = $derived(!isError && Boolean(activeSceneName));

  const toggleSidebarLabel: Str = $derived(t(localeStore.t.header.toggleSidebar, 'Toggle Sidebar'));
</script>

<SiteHeader
  showSidebarToggle={store.features.sidebarToggle}
  sidebarToggleLabel={toggleSidebarLabel}
  sidebarToggleShortcut={shortcutStore.format('TOGGLE_SIDEBAR')}
  showBreadcrumb={store.features.breadcrumb}
>
  {#snippet breadcrumbs()}
    {#if isError}
      <!-- Error: Home > Error -->
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href={homeHref}>{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{t(localeStore.t.header.error, 'Error')}</Breadcrumb.Page>
      </Breadcrumb.Item>
    {:else if showSceneCrumbs}
      <!-- Scene active: Home > Scenes > Scene Name -->
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href={homeHref}>{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href={homeHref}
          >{t(localeStore.t.sidebar.scenes, 'Scenes')}</Breadcrumb.Link
        >
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{activeSceneName}</Breadcrumb.Page>
      </Breadcrumb.Item>
    {:else}
      <!-- Home (no scene active): just Home -->
      <Breadcrumb.Item>
        <Breadcrumb.Page>{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Page>
      </Breadcrumb.Item>
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if store.features.headerUserDropdown && (!store.features.authGatedUi || user)}
      <HeaderUser />
    {/if}
    {#if store.features.modeToggle}
      <ModeToggle />
    {/if}
  {/snippet}
</SiteHeader>
