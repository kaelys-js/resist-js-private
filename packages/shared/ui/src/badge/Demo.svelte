<script lang="ts">
import Badge from './badge.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Variants" description="All four badge variants: default, secondary, destructive, and outline.">
		<div class="flex flex-wrap items-center gap-3">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	</DemoSection>

	<DemoSection title="As Link" description="Badges render as anchor elements when an href is provided.">
		<div class="flex flex-wrap items-center gap-3">
			<Badge href="#default">Default Link</Badge>
			<Badge href="#secondary" variant="secondary">Secondary Link</Badge>
			<Badge href="#destructive" variant="destructive">Destructive Link</Badge>
			<Badge href="#outline" variant="outline">Outline Link</Badge>
		</div>
	</DemoSection>

	<DemoSection title="Use Cases" description="Common real-world badge patterns.">
		<div class="flex flex-wrap items-center gap-3">
			<Badge>v2.1.0</Badge>
			<Badge variant="secondary">Beta</Badge>
			<Badge variant="destructive">Breaking</Badge>
			<Badge variant="outline">TypeScript</Badge>
			<Badge variant="outline">Svelte 5</Badge>
			<Badge variant="secondary">New</Badge>
		</div>
	</DemoSection>
</div>
