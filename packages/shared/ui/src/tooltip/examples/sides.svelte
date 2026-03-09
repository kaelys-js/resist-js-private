<script lang="ts">
import Button from '@/ui/button/button.svelte';
import * as Tooltip from '@/ui/tooltip';
</script>

<div class="flex flex-wrap items-center gap-6">
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Button variant="outline" size="sm">Top</Button>
			</Tooltip.Trigger>
			<Tooltip.Content side="top">Appears on top</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>

	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Button variant="outline" size="sm">Bottom</Button>
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">Appears on bottom</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>

	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Button variant="outline" size="sm">Left</Button>
			</Tooltip.Trigger>
			<Tooltip.Content side="left">Appears on left</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>

	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Button variant="outline" size="sm">Right</Button>
			</Tooltip.Trigger>
			<Tooltip.Content side="right">Appears on right</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
