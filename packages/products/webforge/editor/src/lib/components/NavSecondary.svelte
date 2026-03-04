<script lang="ts">
import type { Component } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';

type NavItem = {
	title: string;
	url: string;
	icon: Component;
};

let { items, ...restProps }: { items: NavItem[] } & Record<string, unknown> = $props();
</script>

<Sidebar.Group {...restProps}>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton size="sm">
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								<span aria-hidden="true"><item.icon /></span>
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>
