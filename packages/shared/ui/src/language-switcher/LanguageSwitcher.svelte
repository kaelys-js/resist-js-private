<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, type Str } from '@/schemas/common';

/** Schema for a single language option with endonym/exonym display names. */
export const LanguageOptionSchema = v.strictObject({
	/** BCP-47 locale code (e.g. "en", "ja"). @values en, ja, de, fr, es, ko, zh */
	code: v.pipe(StrSchema, v.minLength(2), v.maxLength(5)),
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
import type { Bool, Num, Void } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import Globe from '@lucide/svelte/icons/globe';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '../dropdown-menu/index.js';

const allProps: LanguageSwitcherProps = $props();
const validated: LanguageSwitcherProps = $derived.by(() => {
	const rawProps: LanguageSwitcherProps = stripSvelteProps(allProps);
	const result = safeParse(LanguageSwitcherPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as LanguageSwitcherProps;
});

let searchQuery: Str = $state('');

// Inferred type — validated.languages is deeply readonly from safeParse
const filteredLanguages = $derived(
	searchQuery.length === 0
		? validated.languages
		: validated.languages.filter(
				(lang) =>
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

/**
 * Svelte action that locks an element's height to its initial rendered value.
 * Prevents SubContent from shrinking when filtering, avoiding GraceArea close.
 *
 * @param node - The scrollable container element
 * @returns Action lifecycle with destroy cleanup
 */
function lockHeight(node: HTMLElement): { destroy: () => void } {
	const raf: Num = requestAnimationFrame((): void => {
		node.style.minHeight = `${node.offsetHeight}px`;
	});
	return {
		destroy(): void {
			cancelAnimationFrame(raf);
			node.style.minHeight = '';
		},
	};
}
</script>

<DropdownMenu.Sub onOpenChange={handleSubOpenChange}>
	<DropdownMenu.SubTrigger>
		<Globe aria-hidden="true" class="mr-2 size-4" />
		{validated.labels.language}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 flex flex-col overflow-hidden bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]">
		<!-- Search input (fixed above scrollable list) -->
		<div class="shrink-0 px-2 pt-1.5 pb-2 border-b border-border/50">
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder={validated.labels.searchLanguages}
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
						aria-label={validated.labels.clearSearch}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable item list -->
		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
			{#each filteredLanguages as lang (lang.code)}
				<DropdownMenu.Item onclick={() => validated.switchLanguage(lang.code)} aria-current={validated.locale === lang.code ? 'true' : undefined} textValue={lang.endonym}>
					{#if validated.locale === lang.code}
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
				<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
					<SearchX class="size-6" />
					<div class="flex flex-col items-center gap-0.5">
						<p class="text-xs font-medium">{validated.labels.noLanguagesFound}</p>
						<p class="text-[11px]">{validated.labels.noResultsHint}</p>
					</div>
				</div>
			{/each}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
