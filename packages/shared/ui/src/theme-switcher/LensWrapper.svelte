<script lang="ts">
/**
 * Lens context wrapper for ThemeSwitcher.
 *
 * Provides the DropdownMenu.Root + Content context required by DropdownMenu.Sub.
 */
import type { Snippet } from 'svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';

const { children }: { children: Snippet } = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button type="button" class="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent" {...props}>
				Open Menu
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" sideOffset={4}>
		{@render children()}
	</DropdownMenu.Content>
</DropdownMenu.Root>
