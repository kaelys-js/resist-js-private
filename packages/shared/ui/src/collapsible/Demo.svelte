<script lang="ts">
import * as Collapsible from './index.js';
import Button from '../button/button.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

let isOpen: boolean = $state(false);
let isOpenControlled: boolean = $state(true);
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default (Closed)" description="A collapsible section starting in the closed state. Click the trigger to expand.">
		<Collapsible.Root bind:open={isOpen} class="w-80 space-y-2">
			<div class="flex items-center justify-between space-x-4">
				<h4 class="text-sm font-semibold">3 items tagged</h4>
				<Collapsible.Trigger>
					{#snippet children()}
						<Button variant="ghost" size="sm">
							<ChevronsUpDownIcon class="size-4" />
							<span class="sr-only">Toggle</span>
						</Button>
					{/snippet}
				</Collapsible.Trigger>
			</div>
			<div class="rounded-md border px-4 py-2 text-sm font-mono">@radix-ui/primitives</div>
			<Collapsible.Content>
				<div class="space-y-2">
					<div class="rounded-md border px-4 py-2 text-sm font-mono">
						@radix-ui/colors
					</div>
					<div class="rounded-md border px-4 py-2 text-sm font-mono">
						@stitches/react
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	</DemoSection>

	<DemoSection title="Open by Default" description="A collapsible that starts expanded. Content is visible immediately.">
		<Collapsible.Root bind:open={isOpenControlled} class="w-80 space-y-2">
			<div class="flex items-center justify-between space-x-4">
				<h4 class="text-sm font-semibold">Project files</h4>
				<Collapsible.Trigger>
					{#snippet children()}
						<Button variant="ghost" size="sm">
							<ChevronsUpDownIcon class="size-4" />
							<span class="sr-only">Toggle</span>
						</Button>
					{/snippet}
				</Collapsible.Trigger>
			</div>
			<div class="rounded-md border px-4 py-2 text-sm font-mono">src/index.ts</div>
			<Collapsible.Content>
				<div class="space-y-2">
					<div class="rounded-md border px-4 py-2 text-sm font-mono">
						src/utils.ts
					</div>
					<div class="rounded-md border px-4 py-2 text-sm font-mono">
						src/types.ts
					</div>
					<div class="rounded-md border px-4 py-2 text-sm font-mono">
						src/config.ts
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	</DemoSection>

	<DemoSection title="Disabled" description="A collapsible with the disabled prop set. The trigger is not interactive.">
		<Collapsible.Root disabled class="w-80 space-y-2">
			<div class="flex items-center justify-between space-x-4">
				<h4 class="text-sm font-semibold">Locked section</h4>
				<Collapsible.Trigger>
					{#snippet children()}
						<Button variant="ghost" size="sm" disabled>
							<ChevronsUpDownIcon class="size-4" />
							<span class="sr-only">Toggle</span>
						</Button>
					{/snippet}
				</Collapsible.Trigger>
			</div>
			<div class="rounded-md border px-4 py-2 text-sm font-mono opacity-50">
				This content cannot be expanded.
			</div>
		</Collapsible.Root>
	</DemoSection>
</div>
