<script lang="ts">
import Globe from '@lucide/svelte/icons/globe';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { getTextDirection } from '@/locale/direction';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();

const languages = [
	{ code: 'en', name: 'English' },
	{ code: 'ja', name: '日本語' },
	{ code: 'zh', name: '中文' },
	{ code: 'ko', name: '한국어' },
	{ code: 'fr', name: 'Français' },
	{ code: 'de', name: 'Deutsch' },
	{ code: 'es', name: 'Español' },
] as const;

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
</script>

<DropdownMenu.Sub>
	<DropdownMenu.SubTrigger>
		<Globe class="mr-2 size-4" />
		{t(localeStore.t.settings.language, 'Language')}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent>
		{#each languages as lang (lang.code)}
			<DropdownMenu.Item onclick={() => switchLanguage(lang.code)}>
				{#if store.app.locale === lang.code}
					<Check class="mr-2 size-4" />
				{:else}
					<span class="mr-2 size-4 inline-block"></span>
				{/if}
				{lang.name}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
