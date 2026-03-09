<script lang="ts">
import Map from '@lucide/svelte/icons/map';
import Plus from '@lucide/svelte/icons/plus';
import * as Sidebar from '@/ui/sidebar/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store: ReturnType<typeof useEditorStore> = useEditorStore();
</script>

{#if store.features.emptyScenePlaceholder}
	<Sidebar.MenuItem>
		<div class="flex flex-col items-center gap-2 px-4 py-6 text-center" data-testid="empty-scenes">
			<Map aria-hidden="true" class="size-8 text-muted-foreground/50" />
			<div class="space-y-1">
				<p class="text-xs font-medium text-muted-foreground">
					{t(localeStore.t.data.noScenes, 'No scenes yet')}
				</p>
				<p class="text-xs text-muted-foreground/70">
					{t(localeStore.t.data.noScenesDescription, 'Create your first scene to start building.')}
				</p>
			</div>
		</div>
	</Sidebar.MenuItem>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton class="text-sidebar-foreground/70">
			<Plus />
			<span>{t(localeStore.t.data.newScene, 'New Scene')}</span>
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
{/if}
