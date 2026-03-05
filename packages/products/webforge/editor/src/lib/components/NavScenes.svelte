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
import * as Popover from '$lib/components/ui/popover/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
import { localeStore, t } from '$lib/i18n.svelte';
import type { ServerScene } from '$lib/server/data/types';
import EmptyScenes from './EmptyScenes.svelte';

let { scenes }: { scenes: readonly ServerScene[] } = $props();

let open = $state(true);

const sidebar = useSidebar();
const isIconCollapsed = $derived(sidebar.state === 'collapsed' && !sidebar.isMobile);

const scenesLabel = $derived(t(localeStore.t.sidebar.scenes, 'Scenes'));
</script>

{#snippet sceneList()}
	{#if scenes.length === 0}
		<EmptyScenes />
	{:else}
		{#each scenes as scene (scene.id)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					tooltipContent={scene.title}
					isActive={scene.isActive}
					aria-current={scene.isActive ? 'page' : undefined}
				>
					<MapIcon aria-hidden="true" />
					<span>{scene.title}</span>
				</Sidebar.MenuButton>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuAction showOnHover {...props}>
								<MoreHorizontal aria-hidden="true" />
								<span class="sr-only">{t(localeStore.t.common.more, 'More')}</span>
							</Sidebar.MenuAction>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-48 rounded-lg bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]" side="bottom" align="end">
						<DropdownMenu.Label class="p-0 font-normal -m-1">
							<div class="flex items-center gap-2 px-3 py-2.5 pb-3 text-left text-sm bg-white/[0.06] border-b border-white/[0.06] rounded-t-lg">
								<div class="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
									<MapIcon aria-hidden="true" class="size-4 text-muted-foreground" />
								</div>
								<div class="grid flex-1 text-left text-sm leading-tight">
									<span class="truncate font-medium">{scene.title}</span>
								</div>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							<Pencil aria-hidden="true" class="mr-2 size-4 text-muted-foreground" />
							<span>{t(localeStore.t.scenes.rename, 'Rename')}</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<Copy aria-hidden="true" class="mr-2 size-4 text-muted-foreground" />
							<span>{t(localeStore.t.scenes.duplicate, 'Duplicate')}</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							<Trash2 aria-hidden="true" class="mr-2 size-4 text-muted-foreground" />
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
	{/if}
{/snippet}

{#if isIconCollapsed}
	<Sidebar.Group>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Popover.Root>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								data-testid="scenes-popover-trigger"
								tooltipContent={scenesLabel}
								{...props}
							>
								<MapIcon />
							</Sidebar.MenuButton>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content
						side="right"
						align="start"
						class="w-56 rounded-lg p-2"
					>
						<div class="text-sidebar-foreground/70 mb-1 px-2 text-xs font-medium">
							{scenesLabel}
						</div>
						<Sidebar.Menu>
							{@render sceneList()}
						</Sidebar.Menu>
					</Popover.Content>
				</Popover.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Group>
{:else}
	<Collapsible.Root bind:open class="group/collapsible">
		<Sidebar.Group>
			<Sidebar.GroupLabel>
				{#snippet child({ props })}
					<Collapsible.Trigger {...props}>
						{scenesLabel}
						<ChevronRight
							class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
						/>
					</Collapsible.Trigger>
				{/snippet}
			</Sidebar.GroupLabel>
			<Collapsible.Content>
				<Sidebar.Menu>
					{@render sceneList()}
				</Sidebar.Menu>
			</Collapsible.Content>
		</Sidebar.Group>
	</Collapsible.Root>
{/if}
