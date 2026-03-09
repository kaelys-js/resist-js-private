<script lang="ts">
/**
 * Component gallery landing page.
 *
 * Displays a welcome placeholder prompting the user to select a component
 * from the sidebar. The sidebar (in the parent layout) handles discovery,
 * search, and navigation.
 */
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
	<div class="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
		<LayoutGrid class="size-8 text-primary" />
	</div>
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Component Gallery</h1>
		<p class="mt-2 max-w-sm text-sm text-muted-foreground">
			Select a component from the sidebar to view its interactive demo.
		</p>
	</div>
</div>
