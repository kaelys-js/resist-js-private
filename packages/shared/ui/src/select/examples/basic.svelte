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
