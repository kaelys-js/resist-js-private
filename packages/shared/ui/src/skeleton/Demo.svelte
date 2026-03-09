<script lang="ts">
import Skeleton from './skeleton.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Text Lines" description="Skeleton placeholders for text content at varying widths.">
		<div class="flex flex-col gap-2">
			<Skeleton class="h-4 w-[250px]" />
			<Skeleton class="h-4 w-[200px]" />
			<Skeleton class="h-4 w-[150px]" />
		</div>
	</DemoSection>

	<DemoSection title="Circle" description="Round skeleton for avatar or icon placeholders.">
		<div class="flex items-center gap-4">
			<Skeleton class="size-8 rounded-full" />
			<Skeleton class="size-10 rounded-full" />
			<Skeleton class="size-12 rounded-full" />
		</div>
	</DemoSection>

	<DemoSection title="Card Shape" description="Skeleton mimicking a card with header and body content.">
		<div class="flex max-w-sm flex-col gap-4 rounded-xl border p-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-10 rounded-full" />
				<div class="flex flex-col gap-2">
					<Skeleton class="h-4 w-[120px]" />
					<Skeleton class="h-3 w-[80px]" />
				</div>
			</div>
			<Skeleton class="h-32 w-full rounded-lg" />
			<div class="flex flex-col gap-2">
				<Skeleton class="h-4 w-full" />
				<Skeleton class="h-4 w-4/5" />
			</div>
		</div>
	</DemoSection>

	<DemoSection title="List Items" description="Skeleton pattern for list-style content.">
		<div class="flex max-w-sm flex-col gap-3">
			{#each [1, 2, 3] as _}
				<div class="flex items-center gap-3">
					<Skeleton class="size-8 rounded-full" />
					<div class="flex flex-1 flex-col gap-1.5">
						<Skeleton class="h-4 w-3/4" />
						<Skeleton class="h-3 w-1/2" />
					</div>
				</div>
			{/each}
		</div>
	</DemoSection>

	<DemoSection title="Form Placeholder" description="Skeleton mimicking a form layout.">
		<div class="flex max-w-sm flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Skeleton class="h-4 w-[60px]" />
				<Skeleton class="h-9 w-full rounded-md" />
			</div>
			<div class="flex flex-col gap-2">
				<Skeleton class="h-4 w-[80px]" />
				<Skeleton class="h-9 w-full rounded-md" />
			</div>
			<Skeleton class="h-9 w-[100px] rounded-md" />
		</div>
	</DemoSection>
</div>
