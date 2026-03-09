<script lang="ts">
import AspectRatio from '@/ui/aspect-ratio/aspect-ratio.svelte';
</script>

<div class="w-[300px] overflow-hidden rounded-md border">
	<AspectRatio ratio={16 / 9}>
		<div
			class="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground"
		>
			16:9
		</div>
	</AspectRatio>
</div>
