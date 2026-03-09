<script lang="ts">
import DemoSection from '../demo-section/DemoSection.svelte';
import PageFadeIn from './PageFadeIn.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default Fade In" description="Content fades in with a 700ms ease-out opacity transition on mount.">
		<PageFadeIn>
			<div class="rounded-lg border bg-muted/30 p-6">
				<h4 class="text-lg font-semibold">Welcome</h4>
				<p class="mt-2 text-sm text-muted-foreground">
					This content faded in smoothly when the component mounted.
				</p>
			</div>
		</PageFadeIn>
	</DemoSection>

	<DemoSection title="Multi-Block Content" description="Multiple children fade in together as a single group.">
		<PageFadeIn>
			<div class="flex flex-col gap-4">
				<div class="rounded-lg border p-4">
					<h4 class="text-sm font-semibold">Block 1</h4>
					<p class="mt-1 text-xs text-muted-foreground">First content block</p>
				</div>
				<div class="rounded-lg border p-4">
					<h4 class="text-sm font-semibold">Block 2</h4>
					<p class="mt-1 text-xs text-muted-foreground">Second content block</p>
				</div>
				<div class="rounded-lg border p-4">
					<h4 class="text-sm font-semibold">Block 3</h4>
					<p class="mt-1 text-xs text-muted-foreground">Third content block</p>
				</div>
			</div>
		</PageFadeIn>
	</DemoSection>

	<DemoSection title="Rich Content" description="Works with any nested content including headings, text, and cards.">
		<PageFadeIn>
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
						W
					</div>
					<div>
						<p class="text-sm font-semibold">WebForge RPG Editor</p>
						<p class="text-xs text-muted-foreground">Create your dream RPG</p>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div class="rounded-md border bg-card p-3 text-center">
						<p class="text-lg font-bold">12</p>
						<p class="text-xs text-muted-foreground">Scenes</p>
					</div>
					<div class="rounded-md border bg-card p-3 text-center">
						<p class="text-lg font-bold">48</p>
						<p class="text-xs text-muted-foreground">Assets</p>
					</div>
					<div class="rounded-md border bg-card p-3 text-center">
						<p class="text-lg font-bold">6</p>
						<p class="text-xs text-muted-foreground">Characters</p>
					</div>
				</div>
			</div>
		</PageFadeIn>
	</DemoSection>
</div>
