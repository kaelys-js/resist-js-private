<script lang="ts">
  /**
   * Editor wrapper around `@/ui/theme-switcher`. Builds the localized
   * theme list (default / slate / violet / midnight / etc.) with their
   * preview color dots, and routes the user's selection through the
   * editor-state store so the choice persists across reloads.
   *
   * @module
   */
  import ThemeSwitcher from '@/ui/theme-switcher/ThemeSwitcher.svelte';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { useEditorStore } from '$lib/stores/editor-state.svelte';
  import type { Str } from '@/schemas/common';

  const store: ReturnType<typeof useEditorStore> = useEditorStore();

  const themes: Array<{ id: Str; label: Str; dots: Str[] }> = $derived([
    {
      id: '',
      label: t(localeStore.t.settings.themeDefault, 'Default'),
      dots: ['oklch(0.55 0 0)', 'oklch(0.55 0 0)', 'oklch(0.97 0 0)', 'oklch(0.55 0 0)'],
    },
    {
      id: 'midnight',
      label: t(localeStore.t.settings.themeMidnight, 'Midnight'),
      dots: [
        'oklch(0.55 0.22 260)',
        'oklch(0.22 0.06 260)',
        'oklch(0.96 0.02 260)',
        'oklch(0.50 0.20 260)',
      ],
    },
    {
      id: 'warm',
      label: t(localeStore.t.settings.themeWarm, 'Warm'),
      dots: [
        'oklch(0.50 0.16 50)',
        'oklch(0.23 0.04 50)',
        'oklch(0.97 0.01 70)',
        'oklch(0.50 0.16 50)',
      ],
    },
    {
      id: 'forest',
      label: t(localeStore.t.settings.themeForest, 'Forest'),
      dots: [
        'oklch(0.50 0.16 155)',
        'oklch(0.22 0.04 155)',
        'oklch(0.97 0.01 150)',
        'oklch(0.50 0.16 155)',
      ],
    },
    {
      id: 'ocean',
      label: t(localeStore.t.settings.themeOcean, 'Ocean'),
      dots: [
        'oklch(0.52 0.15 200)',
        'oklch(0.22 0.05 200)',
        'oklch(0.96 0.02 200)',
        'oklch(0.50 0.14 200)',
      ],
    },
    {
      id: 'rose',
      label: t(localeStore.t.settings.themeRose, 'Rose'),
      dots: [
        'oklch(0.55 0.18 350)',
        'oklch(0.22 0.05 350)',
        'oklch(0.97 0.01 350)',
        'oklch(0.55 0.16 350)',
      ],
    },
    {
      id: 'lavender',
      label: t(localeStore.t.settings.themeLavender, 'Lavender'),
      dots: [
        'oklch(0.52 0.20 290)',
        'oklch(0.22 0.06 290)',
        'oklch(0.96 0.02 290)',
        'oklch(0.52 0.18 290)',
      ],
    },
    {
      id: 'sunset',
      label: t(localeStore.t.settings.themeSunset, 'Sunset'),
      dots: [
        'oklch(0.55 0.20 30)',
        'oklch(0.23 0.05 30)',
        'oklch(0.97 0.01 30)',
        'oklch(0.55 0.18 30)',
      ],
    },
    {
      id: 'slate',
      label: t(localeStore.t.settings.themeSlate, 'Slate'),
      dots: [
        'oklch(0.48 0.08 240)',
        'oklch(0.23 0.02 240)',
        'oklch(0.96 0.01 240)',
        'oklch(0.48 0.06 240)',
      ],
    },
    {
      id: 'copper',
      label: t(localeStore.t.settings.themeCopper, 'Copper'),
      dots: [
        'oklch(0.52 0.16 60)',
        'oklch(0.23 0.04 60)',
        'oklch(0.97 0.01 60)',
        'oklch(0.52 0.14 60)',
      ],
    },
    {
      id: 'aurora',
      label: t(localeStore.t.settings.themeAurora, 'Aurora'),
      dots: [
        'oklch(0.52 0.15 170)',
        'oklch(0.22 0.04 170)',
        'oklch(0.96 0.02 170)',
        'oklch(0.52 0.14 170)',
      ],
    },
    {
      id: 'amethyst',
      label: t(localeStore.t.settings.themeAmethyst, 'Amethyst'),
      dots: [
        'oklch(0.52 0.22 310)',
        'oklch(0.22 0.06 310)',
        'oklch(0.96 0.02 310)',
        'oklch(0.52 0.20 310)',
      ],
    },
  ]);

  const labels: {
    theme: Str;
    searchThemes: Str;
    clearSearch: Str;
    noThemesFound: Str;
    noResultsHint: Str;
  } = $derived({
    theme: t(localeStore.t.settings.theme, 'Theme'),
    searchThemes: t(localeStore.t.settings.searchThemes, 'Search themes…'),
    clearSearch: t(localeStore.t.devToolbar.clearSearch, 'Clear search'),
    noThemesFound: t(localeStore.t.settings.noThemesFound, 'No themes found'),
    noResultsHint: t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term'),
  });
</script>

<ThemeSwitcher theme={store.app.theme} setTheme={store.setTheme} {themes} {labels} />
