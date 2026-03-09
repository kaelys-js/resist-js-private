<script lang="ts">
import * as Popover from './index.js';
import Button from '../button/button.svelte';
import Input from '../input/input.svelte';
import Label from '../label/label.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic Popover" description="A simple popover with a trigger button and text content.">
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
						<p class="text-sm text-muted-foreground">
							Set the dimensions for the layer.
						</p>
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
	</DemoSection>

	<DemoSection title="With Close Button" description="Popover content with an explicit close button inside.">
		<Popover.Root>
			<Popover.Trigger>
				{#snippet children()}
					<Button variant="outline">Notifications</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content>
				<div class="grid gap-4">
					<div class="space-y-2">
						<h4 class="font-medium leading-none">Notifications</h4>
						<p class="text-sm text-muted-foreground">
							You have 3 unread messages.
						</p>
					</div>
					<Popover.Close>
						{#snippet children()}
							<Button variant="outline" size="sm" class="w-full">Dismiss</Button>
						{/snippet}
					</Popover.Close>
				</div>
			</Popover.Content>
		</Popover.Root>
	</DemoSection>

	<DemoSection title="Alignment" description="Popovers aligned to start, center, and end of the trigger.">
		<div class="flex flex-wrap items-center gap-4">
			<Popover.Root>
				<Popover.Trigger>
					{#snippet children()}
						<Button variant="outline" size="sm">Align Start</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content align="start">
					<p class="text-sm">Aligned to the start of the trigger.</p>
				</Popover.Content>
			</Popover.Root>

			<Popover.Root>
				<Popover.Trigger>
					{#snippet children()}
						<Button variant="outline" size="sm">Align Center</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content align="center">
					<p class="text-sm">Aligned to the center of the trigger (default).</p>
				</Popover.Content>
			</Popover.Root>

			<Popover.Root>
				<Popover.Trigger>
					{#snippet children()}
						<Button variant="outline" size="sm">Align End</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content align="end">
					<p class="text-sm">Aligned to the end of the trigger.</p>
				</Popover.Content>
			</Popover.Root>
		</div>
	</DemoSection>
</div>
