<script lang="ts">
import ScrollArea from '@/ui/scroll-area/scroll-area.svelte';
</script>

<ScrollArea class="h-48 w-64 rounded-md border">
	<div class="p-4">
		{#each Array.from({ length: 20 }, (_, i) => i + 1) as n (n)}
			<div class="py-1 text-sm">Item {n}</div>
		{/each}
	</div>
</ScrollArea>
