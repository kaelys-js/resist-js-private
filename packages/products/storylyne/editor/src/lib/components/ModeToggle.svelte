<script lang="ts">
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
