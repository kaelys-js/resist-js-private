<script lang="ts">
import type { Num } from '@/schemas/common';
import * as ScrollArea from './index.js';
import DemoSection from '../demo-section/DemoSection.svelte';

const verticalItems: Num[] = Array.from({ length: 50 }, (_: unknown, i: Num): Num => i + 1);
const tags: string[] = [
	'TypeScript',
	'Svelte',
	'Valibot',
	'Babylon.js',
	'SvelteKit',
	'Tailwind CSS',
	'Vitest',
	'pnpm',
	'Turborepo',
	'Biome',
	'WebGPU',
	'WebGL',
	'shadcn-svelte',
	'bits-ui',
];
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Vertical Scroll" description="Scrollable area with vertical overflow and a visible scrollbar.">
		<ScrollArea.Root class="h-72 w-full max-w-sm rounded-md border" orientation="vertical">
			<div class="p-4">
				<h4 class="mb-4 text-sm font-medium">50 Items</h4>
				{#each verticalItems as item (item)}
					<div class="border-b py-2 text-sm">Item {item}</div>
				{/each}
			</div>
		</ScrollArea.Root>
	</DemoSection>

	<DemoSection title="Horizontal Scroll" description="Scrollable area with horizontal overflow for wide content.">
		<ScrollArea.Root class="w-full max-w-lg rounded-md border" orientation="horizontal">
			<div class="flex gap-4 p-4">
				{#each tags as tag (tag)}
					<div class="shrink-0 rounded-md border bg-muted/50 px-4 py-2 text-sm font-medium">
						{tag}
					</div>
				{/each}
			</div>
		</ScrollArea.Root>
	</DemoSection>

	<DemoSection title="Both Directions" description="Scroll area with both vertical and horizontal scrollbars using orientation='both'.">
		<ScrollArea.Root class="h-48 w-full max-w-md rounded-md border" orientation="both">
			<div class="w-[800px] p-4">
				<p class="mb-2 text-sm font-medium">Wide and tall content</p>
				{#each verticalItems.slice(0, 20) as item (item)}
					<div class="border-b py-2 text-sm whitespace-nowrap">
						Row {item} — This content is intentionally wide to demonstrate horizontal scrolling alongside vertical scrolling.
					</div>
				{/each}
			</div>
		</ScrollArea.Root>
	</DemoSection>

	<DemoSection title="Compact List" description="Small scroll area for a dropdown-like list.">
		<ScrollArea.Root class="h-40 w-56 rounded-md border" orientation="vertical">
			<div class="p-2">
				{#each tags as tag (tag)}
					<div class="cursor-default rounded-sm px-3 py-1.5 text-sm hover:bg-accent">
						{tag}
					</div>
				{/each}
			</div>
		</ScrollArea.Root>
	</DemoSection>
</div>
