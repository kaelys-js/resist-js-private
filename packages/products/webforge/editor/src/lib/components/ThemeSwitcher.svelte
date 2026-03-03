<script lang="ts">
import Palette from '@lucide/svelte/icons/palette';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();

/* Dots: [primary, accent/secondary, sidebar, sidebar-primary] */
const themes = [
	{
		id: '',
		label: () => t(localeStore.t.settings.themeDefault, 'Default'),
		dots: ['oklch(0.55 0 0)', 'oklch(0.55 0 0)', 'oklch(0.97 0 0)', 'oklch(0.55 0 0)'],
	},
	{
		id: 'midnight',
		label: () => t(localeStore.t.settings.themeMidnight, 'Midnight'),
		dots: [
			'oklch(0.55 0.22 260)',
			'oklch(0.22 0.06 260)',
			'oklch(0.96 0.02 260)',
			'oklch(0.50 0.20 260)',
		],
	},
	{
		id: 'warm',
		label: () => t(localeStore.t.settings.themeWarm, 'Warm'),
		dots: [
			'oklch(0.50 0.16 50)',
			'oklch(0.23 0.04 50)',
			'oklch(0.97 0.01 70)',
			'oklch(0.50 0.16 50)',
		],
	},
	{
		id: 'forest',
		label: () => t(localeStore.t.settings.themeForest, 'Forest'),
		dots: [
			'oklch(0.50 0.16 155)',
			'oklch(0.22 0.04 155)',
			'oklch(0.97 0.01 150)',
			'oklch(0.50 0.16 155)',
		],
	},
	{
		id: 'ocean',
		label: () => t(localeStore.t.settings.themeOcean, 'Ocean'),
		dots: [
			'oklch(0.52 0.15 200)',
			'oklch(0.22 0.05 200)',
			'oklch(0.96 0.02 200)',
			'oklch(0.50 0.14 200)',
		],
	},
	{
		id: 'rose',
		label: () => t(localeStore.t.settings.themeRose, 'Rose'),
		dots: [
			'oklch(0.55 0.18 350)',
			'oklch(0.22 0.05 350)',
			'oklch(0.97 0.01 350)',
			'oklch(0.55 0.16 350)',
		],
	},
	{
		id: 'lavender',
		label: () => t(localeStore.t.settings.themeLavender, 'Lavender'),
		dots: [
			'oklch(0.52 0.20 290)',
			'oklch(0.22 0.06 290)',
			'oklch(0.96 0.02 290)',
			'oklch(0.52 0.18 290)',
		],
	},
	{
		id: 'sunset',
		label: () => t(localeStore.t.settings.themeSunset, 'Sunset'),
		dots: [
			'oklch(0.55 0.20 30)',
			'oklch(0.23 0.05 30)',
			'oklch(0.97 0.01 30)',
			'oklch(0.55 0.18 30)',
		],
	},
	{
		id: 'slate',
		label: () => t(localeStore.t.settings.themeSlate, 'Slate'),
		dots: [
			'oklch(0.48 0.08 240)',
			'oklch(0.23 0.02 240)',
			'oklch(0.96 0.01 240)',
			'oklch(0.48 0.06 240)',
		],
	},
	{
		id: 'copper',
		label: () => t(localeStore.t.settings.themeCopper, 'Copper'),
		dots: [
			'oklch(0.52 0.16 60)',
			'oklch(0.23 0.04 60)',
			'oklch(0.97 0.01 60)',
			'oklch(0.52 0.14 60)',
		],
	},
	{
		id: 'aurora',
		label: () => t(localeStore.t.settings.themeAurora, 'Aurora'),
		dots: [
			'oklch(0.52 0.15 170)',
			'oklch(0.22 0.04 170)',
			'oklch(0.96 0.02 170)',
			'oklch(0.52 0.14 170)',
		],
	},
	{
		id: 'amethyst',
		label: () => t(localeStore.t.settings.themeAmethyst, 'Amethyst'),
		dots: [
			'oklch(0.52 0.22 310)',
			'oklch(0.22 0.06 310)',
			'oklch(0.96 0.02 310)',
			'oklch(0.52 0.20 310)',
		],
	},
] as const;
</script>

<DropdownMenu.Sub>
	<DropdownMenu.SubTrigger>
		<Palette class="mr-2 size-4" />
		{t(localeStore.t.settings.theme, 'Theme')}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 overflow-y-auto">
		{#each themes as th (th.id)}
			<DropdownMenu.Item onclick={() => store.setTheme(th.id)}>
				{#if store.app.theme === th.id}
					<Check class="mr-2 size-4 shrink-0" />
				{:else}
					<span class="mr-2 size-4 inline-block shrink-0"></span>
				{/if}
				<span class="mr-2 flex gap-1 shrink-0">
					{#each th.dots as color}
						<span
							class="size-2.5 rounded-full border border-border"
							style="background-color: {color}"
						></span>
					{/each}
				</span>
				{th.label()}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
