<script lang="ts">
import * as Popover from '@/ui/popover';
import Button from '@/ui/button/button.svelte';
import Input from '@/ui/input/input.svelte';
import Label from '@/ui/label/label.svelte';
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet children()}
			<Button variant="outline">Open Popover</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content>
		<div class="grid gap-4">
			<div class="space-y-2">
				<h4 class="font-medium leading-none">Dimensions</h4>
				<p class="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
			</div>
			<div class="grid gap-2">
				<div class="grid grid-cols-3 items-center gap-4">
					<Label>Width</Label>
					<Input class="col-span-2 h-8" value="100%" />
				</div>
				<div class="grid grid-cols-3 items-center gap-4">
					<Label>Height</Label>
					<Input class="col-span-2 h-8" value="25px" />
				</div>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
