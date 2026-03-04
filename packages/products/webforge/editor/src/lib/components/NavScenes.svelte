<script lang="ts">
import MapIcon from '@lucide/svelte/icons/map';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Plus from '@lucide/svelte/icons/plus';
import Copy from '@lucide/svelte/icons/copy';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import * as Collapsible from '$lib/components/ui/collapsible/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { localeStore, t } from '$lib/i18n.svelte';

type Scene = {
	title: string;
	url: string;
	isActive?: boolean;
};

let { scenes }: { scenes: Scene[] } = $props();

let open = $state(true);
</script>

<Collapsible.Root bind:open class="group/collapsible">
	<Sidebar.Group>
		<Sidebar.GroupLabel>
			{#snippet child({ props })}
				<Collapsible.Trigger {...props}>
					{t(localeStore.t.sidebar.scenes, 'Scenes')}
					<ChevronRight
						class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
					/>
				</Collapsible.Trigger>
			{/snippet}
		</Sidebar.GroupLabel>
		<Collapsible.Content>
			<Sidebar.Menu>
				{#each scenes as scene (scene.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent={scene.title}
							isActive={scene.isActive}
						>
							<MapIcon />
							<span>{scene.title}</span>
						</Sidebar.MenuButton>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Sidebar.MenuAction showOnHover {...props}>
										<MoreHorizontal />
										<span class="sr-only">More</span>
									</Sidebar.MenuAction>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-48 rounded-lg" side="bottom" align="end">
								<DropdownMenu.Item>
									<Pencil class="mr-2 size-4 text-muted-foreground" />
									<span>{t(localeStore.t.scenes.rename, 'Rename')}</span>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<Copy class="mr-2 size-4 text-muted-foreground" />
									<span>{t(localeStore.t.scenes.duplicate, 'Duplicate')}</span>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item>
									<Trash2 class="mr-2 size-4 text-muted-foreground" />
									<span>{t(localeStore.t.scenes.delete, 'Delete')}</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.MenuItem>
				{/each}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton class="text-sidebar-foreground/70">
						<Plus />
						<span>{t(localeStore.t.sidebar.newScene, 'New Scene')}</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Collapsible.Content>
	</Sidebar.Group>
</Collapsible.Root>
