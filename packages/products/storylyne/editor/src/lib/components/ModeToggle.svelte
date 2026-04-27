<script lang="ts">
  /**
   * Editor wrapper around the shared `@/ui/mode-toggle` light/dark
   * switcher. Pulls localized labels (`Toggle theme`, `Light`, `Dark`,
   * `System`) from the i18n store and reads/writes the mode via the
   * editor-state store.
   *
   * @module
   */
  import ModeToggle from '@/ui/mode-toggle/ModeToggle.svelte';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { useEditorStore } from '$lib/stores/editor-state.svelte';
  import type { Str } from '@/schemas/common';

  const store: ReturnType<typeof useEditorStore> = useEditorStore();

  const labels: { toggleTheme: Str; toggleMode: Str; light: Str; dark: Str; system: Str } =
    $derived({
      toggleTheme: t(localeStore.t.settings.toggleTheme, 'Toggle theme'),
      toggleMode: t(localeStore.t.common.toggleMode, 'Toggle mode'),
      light: t(localeStore.t.settings.light, 'Light'),
      dark: t(localeStore.t.settings.dark, 'Dark'),
      system: t(localeStore.t.settings.system, 'System'),
    });
</script>

<ModeToggle mode={store.app.mode} setMode={store.setMode} {labels} />
