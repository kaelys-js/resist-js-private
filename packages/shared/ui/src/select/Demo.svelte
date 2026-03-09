<script lang="ts">
import type { Str } from '@/schemas/common';
import * as Select from './index.js';
import DemoSection from '../demo-section/DemoSection.svelte';

let basicValue: Str = $state('');
let groupedValue: Str = $state('');
let sizedValue: Str = $state('');
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic" description="Simple select with a flat list of options.">
		<div class="max-w-xs">
			<Select.Root bind:value={basicValue}>
				<Select.Trigger>
					{#if basicValue}
						{basicValue}
					{:else}
						<span class="text-muted-foreground">Select a fruit...</span>
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple" label="Apple" />
					<Select.Item value="banana" label="Banana" />
					<Select.Item value="cherry" label="Cherry" />
					<Select.Item value="grape" label="Grape" />
					<Select.Item value="orange" label="Orange" />
				</Select.Content>
			</Select.Root>
		</div>
	</DemoSection>

	<DemoSection title="With Groups" description="Options organized into groups with headings and separators.">
		<div class="max-w-xs">
			<Select.Root bind:value={groupedValue}>
				<Select.Trigger>
					{#if groupedValue}
						{groupedValue}
					{:else}
						<span class="text-muted-foreground">Pick a food...</span>
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.GroupHeading>Fruits</Select.GroupHeading>
						<Select.Item value="apple" label="Apple" />
						<Select.Item value="banana" label="Banana" />
						<Select.Item value="cherry" label="Cherry" />
					</Select.Group>
					<Select.Separator />
					<Select.Group>
						<Select.GroupHeading>Vegetables</Select.GroupHeading>
						<Select.Item value="carrot" label="Carrot" />
						<Select.Item value="broccoli" label="Broccoli" />
						<Select.Item value="spinach" label="Spinach" />
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
	</DemoSection>

	<DemoSection title="Disabled" description="Select in the disabled state.">
		<div class="max-w-xs">
			<Select.Root disabled>
				<Select.Trigger>
					<span class="text-muted-foreground">Cannot select...</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="a" label="Option A" />
				</Select.Content>
			</Select.Root>
		</div>
	</DemoSection>

	<DemoSection title="Small Size" description="Trigger with size='sm' for compact layouts.">
		<div class="max-w-xs">
			<Select.Root bind:value={sizedValue}>
				<Select.Trigger size="sm">
					{#if sizedValue}
						{sizedValue}
					{:else}
						<span class="text-muted-foreground">Small trigger...</span>
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="xs" label="Extra Small" />
					<Select.Item value="sm" label="Small" />
					<Select.Item value="md" label="Medium" />
					<Select.Item value="lg" label="Large" />
				</Select.Content>
			</Select.Root>
		</div>
	</DemoSection>

	<DemoSection title="With Disabled Items" description="Individual items can be disabled within the list.">
		<div class="max-w-xs">
			<Select.Root>
				<Select.Trigger>
					<span class="text-muted-foreground">Choose a plan...</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="free" label="Free" />
					<Select.Item value="pro" label="Pro" />
					<Select.Item value="enterprise" label="Enterprise" disabled />
				</Select.Content>
			</Select.Root>
		</div>
	</DemoSection>
</div>
