<script lang="ts">
/**
 * Lens landing page.
 *
 * Displays a welcome screen prompting the user to select a component
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
		<h1 class="text-2xl font-bold tracking-tight">Lens</h1>
		<p class="mt-2 max-w-sm text-sm text-muted-foreground">
			Select a component from the sidebar to view its auto-generated documentation.
		</p>
	</div>
</div>
