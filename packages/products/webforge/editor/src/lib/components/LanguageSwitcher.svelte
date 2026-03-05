<script lang="ts">
import Globe from '@lucide/svelte/icons/globe';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { getTextDirection } from '@/locale/direction';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';
import { getLanguageDisplayNames, type LanguageDisplayInfo } from '$lib/utils/locale-display';

const store = useEditorStore();

const languages: readonly LanguageDisplayInfo[] = $derived.by(() => {
	const result = getLanguageDisplayNames(SUPPORTED_LOCALES, store.app.locale);
	if (!result.ok) return [];
	return result.data;
});

function switchLanguage(code: string): void {
	const apply = (): void => {
		store.setLocale(code);
		// oxlint-disable-next-line unicorn/no-document-cookie -- Cookie Store API lacks Safari/Firefox support
		document.cookie = `locale=${code};path=/;max-age=31536000;SameSite=Lax`;
		document.documentElement.lang = code;
		const dirResult = getTextDirection(code);
		document.documentElement.dir = dirResult.ok ? dirResult.data : 'ltr';
	};

	if ('startViewTransition' in document) {
		document.startViewTransition(apply);
	} else {
		apply();
	}
}

function isDuplicate(info: LanguageDisplayInfo): boolean {
	return info.endonym.localeCompare(info.exonym, undefined, { sensitivity: 'base' }) === 0;
}
</script>

<DropdownMenu.Sub>
	<DropdownMenu.SubTrigger>
		<Globe aria-hidden="true" class="mr-2 size-4" />
		{t(localeStore.t.settings.language, 'Language')}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="bg-popover/60 backdrop-blur-2xl border-border/60 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset] ring-1 ring-white/5">
		{#each languages as lang (lang.code)}
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
		{/each}
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
