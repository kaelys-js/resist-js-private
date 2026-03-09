<script lang="ts">
import Folder from '@lucide/svelte/icons/folder';
import SettingsIcon from '@lucide/svelte/icons/settings';
import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
import NavProject from '@/ui/nav-project/NavProject.svelte';
import ThemeSwitcher from './ThemeSwitcher.svelte';
import LanguageSwitcher from './LanguageSwitcher.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import type { ServerProject } from '$lib/server/data/types';
import type { Str } from '@/schemas/common';

let { project = null }: { project?: ServerProject | null } = $props();

const store: ReturnType<typeof useEditorStore> = useEditorStore();

/** Display name from project or fallback. */
const projectName: Str = $derived(project?.name ?? 'Project');

/** Subtitle from project or fallback dash. */
const projectSubtitle: Str = $derived(project?.subtitle || '\u2014');
</script>

<NavProject
	name={projectName}
	subtitle={projectSubtitle}
	avatarSrc=""
	showIcon={store.features.projectDropdownIcon}
>
	{#snippet menuItems()}
		<DropdownMenu.Item>
			<Folder aria-hidden="true" class="mr-2 size-4" />
			{t(localeStore.t.project.openProject, 'Open Project')}
		</DropdownMenu.Item>
		{#if store.features.themeSelection}
			<ThemeSwitcher />
		{/if}
		{#if store.features.languageSelection}
			<LanguageSwitcher />
		{/if}
		{#if store.features.projectDropdownSettings}
			<DropdownMenu.Item>
				<SettingsIcon aria-hidden="true" class="mr-2 size-4" />
				{t(localeStore.t.common.settings, 'Settings')}
			</DropdownMenu.Item>
		{/if}
	{/snippet}
</NavProject>
