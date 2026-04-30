<script lang="ts">
  /**
   * Home page for the `(app)` route group — renders the welcome
   * screen with the app logo, localized welcome text and tagline,
   * and a hint to select or create a scene from the sidebar.
   *
   * @module
   */

  import AppLogo from '@/ui/app-logo/AppLogo.svelte';
  import type { Str } from '@/schemas/common';
  import type { Result } from '@/schemas/result/result';
  import { useEditorStore, type EditorStore } from '$lib/stores/editor-state.svelte';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { log } from '@/utils/core/logger';
  import { APP_TAGLINE } from '$lib/config/app-meta';

  const store: EditorStore = useEditorStore();

  const welcomeText: Str = $derived.by(() => {
    // as (p: ...) => Result<Str> — locale template functions are typed as unknown at runtime
    const result: Result<Str> = (
      localeStore.t.home.welcome as (p: { appName: Str }) => Result<Str>
    )({
      appName: store.app.appName,
    });

    if (!result.ok) {
      log.warn(`Locale home.welcome error: ${result.error.code}`);
    }
    // UI boundary — locale error logged, fallback used
    return result.ok ? result.data : `Welcome to ${store.app.appName}`;
  });

  const tagline: Str = $derived(t(localeStore.t.meta.tagline, APP_TAGLINE));
  const selectScene: Str = $derived(
    t(localeStore.t.home.selectScene, 'Select a scene from the sidebar to start editing.'),
  );
  const orCreateNew: Str = $derived(
    t(localeStore.t.home.orCreateNew, 'Or create a new one to get started.'),
  );
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
  <div class="mb-2" aria-hidden="true">
    <AppLogo size={48} />
  </div>

  <h1 class="text-2xl font-semibold tracking-tight">{welcomeText}</h1>
  <p class="text-muted-foreground text-sm">{tagline}</p>

  <div class="mt-6 flex max-w-sm flex-col items-center gap-1">
    <p class="text-muted-foreground text-sm leading-relaxed">{selectScene}</p>
    <p class="text-muted-foreground text-sm leading-relaxed">{orCreateNew}</p>
  </div>
</div>
