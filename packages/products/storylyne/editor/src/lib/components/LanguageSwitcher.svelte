<script lang="ts">
  import LanguageSwitcher from '@/ui/language-switcher/LanguageSwitcher.svelte';
  import { getTextDirection, type TextDirection } from '@/locale/direction';
  import type { Str, Void } from '@/schemas/common';
  import type { Result } from '@/schemas/result/result';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { log } from '@/utils/core/logger';
  import { useEditorStore, type EditorStore } from '$lib/stores/editor-state.svelte';
  import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';
  import { getLanguageDisplayNames, type LanguageDisplayInfo } from '@/locale/display';
  import { setPreferenceCookie } from '@/utils/core/preference-cookie';
  import { STORAGE_PREFIX } from '$lib/config/app-meta';

  const store: EditorStore = useEditorStore();

  const languages: LanguageDisplayInfo[] = $derived.by(() => {
    const result: Result<LanguageDisplayInfo[]> = getLanguageDisplayNames(
      SUPPORTED_LOCALES,
      store.app.locale,
    );
    if (!result.ok) {
      return [];
    }
    // Spread to unfreeze — Result.data is deep-frozen via Object.freeze
    return [...result.data];
  });

  const labels: {
    language: Str;
    searchLanguages: Str;
    clearSearch: Str;
    noLanguagesFound: Str;
    noResultsHint: Str;
  } = $derived({
    language: t(localeStore.t.settings.language, 'Language'),
    searchLanguages: t(localeStore.t.settings.searchLanguages, 'Search languages…'),
    clearSearch: t(localeStore.t.devToolbar.clearSearch, 'Clear search'),
    noLanguagesFound: t(localeStore.t.settings.noLanguagesFound, 'No languages found'),
    noResultsHint: t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term'),
  });

  function switchLanguage(code: Str): Void {
    const apply: () => Void = (): Void => {
      store.setLocale(code);
      setPreferenceCookie(STORAGE_PREFIX, 'locale', code);
      document.documentElement.lang = code;
      const dirResult: Result<TextDirection> = getTextDirection(code);
      if (!dirResult.ok) {
        log.warn(`Locale direction error: ${dirResult.error.code}`);
      }
      // UI boundary — locale/direction error logged, fallback used
      document.documentElement.dir = dirResult.ok ? dirResult.data : 'ltr';
    };

    if ('startViewTransition' in document) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }
</script>

<LanguageSwitcher locale={store.app.locale} {switchLanguage} {languages} {labels} />
