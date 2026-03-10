<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, type Str } from '@/schemas/common';

/** Schema for a single language option with endonym/exonym display names. */
export const LanguageOptionSchema = v.strictObject({
	/** BCP-47 locale code (e.g. "en", "ja"). @values en, ja, de, fr, es, ko, zh */
	code: StrSchema,
	/** Native name of the language (e.g. "日本語"). @values English, 日本語, Deutsch, Français */
	endonym: StrSchema,
	/** Name of the language in the current locale (e.g. "Japanese"). @values English, Japanese, German, French */
	exonym: StrSchema,
});
/** A single language option. */
export type LanguageOption = v.InferOutput<typeof LanguageOptionSchema>;

/** Schema for localized UI labels in the LanguageSwitcher. */
export const LanguageSwitcherLabelsSchema = v.strictObject({
	/** Sub-menu trigger label (e.g. "Language"). @values Language, Locale, Display Language */
	language: StrSchema,
	/** Search input placeholder (e.g. "Search languages…"). @values Search languages…, Find a language…, Filter languages */
	searchLanguages: StrSchema,
	/** Clear search button aria-label (e.g. "Clear search"). @values Clear search, Reset search, Clear */
	clearSearch: StrSchema,
	/** Empty state heading (e.g. "No languages found"). @values No languages found, No results, No matching languages */
	noLanguagesFound: StrSchema,
	/** Empty state hint (e.g. "Try a different search term"). @values Try a different search term, Adjust your search, Clear the filter */
	noResultsHint: StrSchema,
});
/** Localized UI labels for the LanguageSwitcher. */
export type LanguageSwitcherLabels = v.InferOutput<typeof LanguageSwitcherLabelsSchema>;

/** Schema for the LanguageSwitcher component props. */
export const LanguageSwitcherPropsSchema = v.strictObject({
	/** Current active locale code. @values en, ja, de, fr, es, ko, zh */
	locale: StrSchema,
	/** Callback to switch locale — wrapper handles cookie/document side effects. */
	switchLanguage: v.custom<(code: Str) => void>((val: unknown): boolean => typeof val === 'function'),
	/** Available language options with pre-resolved display names. */
	languages: v.array(LanguageOptionSchema),
	/** Localized UI labels. */
	labels: LanguageSwitcherLabelsSchema,
});
/** Props for the LanguageSwitcher component. */
export type LanguageSwitcherProps = v.InferOutput<typeof LanguageSwitcherPropsSchema>;
</script>

<script lang="ts">
/**
 * Language/locale selector rendered as a searchable dropdown sub-menu.
 *
 * Displays language options with endonym and exonym names, a search filter,
 * and a checkmark on the currently active locale.
 */
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import Globe from '@lucide/svelte/icons/globe';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '../dropdown-menu/index.js';
import type { Bool, Void } from '@/schemas/common';

// Reactive props — locale changes when user switches language
let { locale, switchLanguage, languages, labels }: LanguageSwitcherProps = $props();

let searchQuery: Str = $state('');

const filteredLanguages: readonly LanguageOption[] = $derived(
	searchQuery.length === 0
		? languages
		: languages.filter(
				(lang: LanguageOption) =>
					lang.endonym.toLowerCase().includes(searchQuery.toLowerCase()) ||
					lang.exonym.toLowerCase().includes(searchQuery.toLowerCase()) ||
					lang.code.toLowerCase().includes(searchQuery.toLowerCase()),
			),
);

function isDuplicate(info: LanguageOption): Bool {
	return info.endonym.localeCompare(info.exonym, undefined, { sensitivity: 'base' }) === 0;
}

function handleSubOpenChange(open: Bool): Void {
	if (!open) searchQuery = '';
}
</script>

<DropdownMenu.Sub onOpenChange={handleSubOpenChange}>
	<DropdownMenu.SubTrigger>
		<Globe aria-hidden="true" class="mr-2 size-4" />
		{labels.language}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 flex flex-col overflow-hidden bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]">
		<!-- Search input (fixed above scrollable list) -->
		<div class="shrink-0 px-2 pt-1.5 pb-2 border-b border-border/50">
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder={labels.searchLanguages}
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
						aria-label={labels.clearSearch}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable item list -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#each filteredLanguages as lang (lang.code)}
				<DropdownMenu.Item onclick={() => switchLanguage(lang.code)} aria-current={locale === lang.code ? 'true' : undefined} textValue={lang.endonym}>
					{#if locale === lang.code}
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
						<p class="text-xs font-medium">{labels.noLanguagesFound}</p>
						<p class="text-[11px]">{labels.noResultsHint}</p>
					</div>
				</div>
			{/each}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
