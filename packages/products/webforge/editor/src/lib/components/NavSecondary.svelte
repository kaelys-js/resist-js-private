<script lang="ts">
import type { Component } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import type { Str } from '@/schemas/common';

type NavItem = {
	title: Str;
	url: Str;
	icon: Component;
};

let { items, ...restProps }: { items: NavItem[] } & Record<Str, unknown> = $props();
</script>

<Sidebar.Group {...restProps}>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								<item.icon aria-hidden="true" />
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>
