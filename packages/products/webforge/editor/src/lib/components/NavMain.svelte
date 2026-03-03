<script lang="ts">
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import type { Component } from 'svelte';
import * as Collapsible from '$lib/components/ui/collapsible/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';

type NavItem = {
	title: string;
	url?: string;
	icon?: Component;
	isActive?: boolean;
	items?: Array<{ title: string; url: string }>;
};

let { items }: { items: NavItem[] } = $props();
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each items as item (item.title)}
			<Collapsible.Root open={item.isActive} class="group/collapsible">
				<Sidebar.MenuItem>
					<Collapsible.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton {...props} tooltipContent={item.title}>
								{#if item.icon}
									<item.icon />
								{/if}
								<span>{item.title}</span>
								<ChevronRight
									class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
								/>
							</Sidebar.MenuButton>
						{/snippet}
					</Collapsible.Trigger>
					<Collapsible.Content>
						<Sidebar.MenuSub>
							{#each item.items ?? [] as subItem (subItem.title)}
								<Sidebar.MenuSubItem>
									<Sidebar.MenuSubButton>
										{#snippet child({ props })}
											<a href={subItem.url} {...props}>
												<span>{subItem.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuSubButton>
								</Sidebar.MenuSubItem>
							{/each}
						</Sidebar.MenuSub>
					</Collapsible.Content>
				</Sidebar.MenuItem>
			</Collapsible.Root>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
