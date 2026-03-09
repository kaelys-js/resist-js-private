<script lang="ts">
/**
 * Secondary navigation link list rendered as a sidebar menu group.
 *
 * Accepts an array of icon+title+url items and renders them as sidebar menu buttons.
 */
import type { Component } from 'svelte';
import * as Sidebar from '../sidebar/index.js';
import type { Str } from '@/schemas/common';

type NavItem = {
	/** Display label. @values Settings, Help, Support, Feedback */
	title: Str;
	/** Link href. @values /settings, /help, /support, /feedback */
	url: Str;
	/** Lucide icon component. */
	icon: Component;
};

let {
	/** Array of navigation item objects to render. */
	items,
	...restProps
}: { items: NavItem[] } & Record<Str, unknown> = $props();
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
