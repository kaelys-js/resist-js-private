<script lang="ts">
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import Globe from '@lucide/svelte/icons/globe';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { getTextDirection, type TextDirection } from '@/locale/direction';
import type { Bool, Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore, type EditorStore } from '$lib/stores/editor-state.svelte';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';
import { getLanguageDisplayNames, type LanguageDisplayInfo } from '$lib/utils/locale-display';

const store: EditorStore = useEditorStore();

let searchQuery: Str = $state('');

const languages: readonly LanguageDisplayInfo[] = $derived.by(() => {
	const result: Result<LanguageDisplayInfo[]> = getLanguageDisplayNames(
		SUPPORTED_LOCALES,
		store.app.locale,
	);
	if (!result.ok) return [];
	return result.data;
});

const filteredLanguages: readonly LanguageDisplayInfo[] = $derived(
	searchQuery.length === 0
		? languages
		: languages.filter(
				(lang: LanguageDisplayInfo) =>
					lang.endonym.toLowerCase().includes(searchQuery.toLowerCase()) ||
					lang.exonym.toLowerCase().includes(searchQuery.toLowerCase()) ||
					lang.code.toLowerCase().includes(searchQuery.toLowerCase()),
			),
);

function switchLanguage(code: Str): Void {
	const apply: () => Void = (): Void => {
		store.setLocale(code);
		// oxlint-disable-next-line unicorn/no-document-cookie -- Cookie Store API lacks Safari/Firefox support
		document.cookie = `locale=${code};path=/;max-age=31536000;SameSite=Lax`;
		document.documentElement.lang = code;
		const dirResult: Result<TextDirection> = getTextDirection(code);
		document.documentElement.dir = dirResult.ok ? dirResult.data : 'ltr';
	};

	if ('startViewTransition' in document) {
		document.startViewTransition(apply);
	} else {
		apply();
	}
}

function isDuplicate(info: LanguageDisplayInfo): Bool {
	return info.endonym.localeCompare(info.exonym, undefined, { sensitivity: 'base' }) === 0;
}

function handleSubOpenChange(open: Bool): Void {
	if (!open) searchQuery = '';
}
</script>

<DropdownMenu.Sub onOpenChange={handleSubOpenChange}>
	<DropdownMenu.SubTrigger>
		<Globe aria-hidden="true" class="mr-2 size-4" />
		{t(localeStore.t.settings.language, 'Language')}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 flex flex-col overflow-hidden bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]">
		<!-- Search input (fixed above scrollable list) -->
		<div class="shrink-0 px-2 pt-1.5 pb-2 border-b border-border/50">
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder={t(localeStore.t.settings.searchLanguages, 'Search languages…')}
					class="h-8 w-full rounded-md bg-background/50 pl-8 {searchQuery ? 'pr-8' : 'pr-3'} text-xs outline-none border border-border/50 focus:border-ring transition-colors"
					value={searchQuery}
					oninput={(e: Event) => { searchQuery = (e.target as HTMLInputElement).value; }}
					onkeydown={(e: KeyboardEvent) => { e.stopPropagation(); }}
				/>
				{#if searchQuery}
					<button
						type="button"
						class="absolute right-1.5 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
						onclick={() => { searchQuery = ''; }}
						aria-label={t(localeStore.t.devToolbar.clearSearch, 'Clear search')}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable item list -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#each filteredLanguages as lang (lang.code)}
				<DropdownMenu.Item onclick={() => switchLanguage(lang.code)} aria-current={store.app.locale === lang.code ? 'true' : undefined} textValue={lang.endonym}>
					{#if store.app.locale === lang.code}
						<Check aria-hidden="true" class="mr-2 size-4" />
					{:else}
						<span class="mr-2 size-4 inline-block"></span>
					{/if}
					<span lang={lang.code}>{lang.endonym}</span>
					{#if !isDuplicate(lang)}
						<span class="text-muted-foreground ml-1">({lang.exonym})</span>
					{/if}
				</DropdownMenu.Item>
			{:else}
				<div class="flex flex-col items-center gap-2 py-6 text-muted-foreground">
					<SearchX class="size-6" />
					<div class="flex flex-col items-center gap-0.5">
						<p class="text-xs font-medium">{t(localeStore.t.settings.noLanguagesFound, 'No languages found')}</p>
						<p class="text-[11px]">{t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term')}</p>
					</div>
				</div>
			{/each}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
