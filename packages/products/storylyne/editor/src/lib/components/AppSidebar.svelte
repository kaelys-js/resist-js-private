<script lang="ts">
  /**
   * AppSidebar — editor-specific sidebar shell.
   *
   * Wraps `@/ui/app-sidebar/AppSidebar` with editor-local navigation
   * sections (NavScenes / NavProject), wires the i18n locale store
   * for tagline strings, and reads the editor-state store for the
   * current user/project/scene context.
   *
   * @module
   */
  import House from '@lucide/svelte/icons/house';
  import Settings from '@lucide/svelte/icons/settings';
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import * as Sidebar from '@/ui/sidebar/index.js';
  import SharedAppSidebar from '@/ui/app-sidebar/AppSidebar.svelte';
  import NavScenes from './NavScenes.svelte';
  import NavScenesSkeleton from './NavScenesSkeleton.svelte';
  import NavProject from './NavProject.svelte';
  import NavProjectSkeleton from '@/ui/nav-project/NavProjectSkeleton.svelte';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { APP_TAGLINE } from '$lib/config/app-meta';
  import { useEditorStore } from '$lib/stores/editor-state.svelte';
  import type { ServerUser, ServerProject, ServerScene } from '$lib/server/data/types';
  import type { Str, Bool } from '@/schemas/common';

  type AppSidebarProps = {
    /** Authenticated user, or null when logged out. */
    user?: ServerUser | null;
    /** Current project, or null when none exists. */
    project?: ServerProject | null;
    /** Resolved scene list. */
    scenes?: readonly ServerScene[];
    /** Whether project is still loading (streaming). Shows NavProjectSkeleton when true. */
    projectLoading?: Bool;
    /** Whether scenes are still loading (streaming). Shows NavScenesSkeleton when true. */
    scenesLoading?: Bool;
  };
  let {
    user = null,
    project = null,
    scenes = [],
    projectLoading = false,
    scenesLoading = false,
  }: AppSidebarProps = $props();

  const store: ReturnType<typeof useEditorStore> = useEditorStore();

  const navSecondary: Array<{ title: Str; url: Str; icon: typeof Settings }> = $derived([
    ...(store.features.settings && (!store.features.authGatedUi || user)
      ? [{ title: t(localeStore.t.common.settings, 'Settings'), url: '#settings', icon: Settings }]
      : []),
    ...(store.features.sidebarHelp
      ? [{ title: t(localeStore.t.common.help, 'Help'), url: '#help', icon: CircleHelp }]
      : []),
  ]);
</script>

<SharedAppSidebar
  appName={store.app.appName}
  tagline={t(localeStore.t.meta.tagline, APP_TAGLINE)}
  sidebarLabel={t(localeStore.t.common.sidebarLabel, 'Application sidebar')}
  showIcon={store.features.appIconInSidebar}
  showName={store.features.appNameInSidebar}
  navItems={navSecondary}
>
  {#snippet content()}
    {#if store.features.sidebarHome}
      <Sidebar.Group>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              tooltipContent={t(localeStore.t.sidebar.home, 'Home')}
              isActive={true}
              aria-current="page"
              data-testid="sidebar-home"
            >
              <House aria-hidden="true" />
              <span>{t(localeStore.t.sidebar.home, 'Home')}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
    {/if}
    {#if store.features.sceneList && (!store.features.authGatedUi || user)}
      {#if scenesLoading}
        <NavScenesSkeleton />
      {:else}
        <NavScenes {scenes} />
      {/if}
    {/if}
  {/snippet}
  {#snippet footer()}
    {#if store.features.projectDropdown && (!store.features.authGatedUi || user)}
      {#if projectLoading}
        <NavProjectSkeleton />
      {:else}
        <NavProject {project} />
      {/if}
    {/if}
  {/snippet}
</SharedAppSidebar>
