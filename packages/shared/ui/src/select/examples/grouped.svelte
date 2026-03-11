<script lang="ts">
import type { Str } from '@/schemas/common';
import * as Select from '@/ui/select';

let value: Str = $state('');
</script>

<div class="max-w-xs">
	<Select.Root type="single" bind:value>
		<Select.Trigger>
			{#if value}
				{value}
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
