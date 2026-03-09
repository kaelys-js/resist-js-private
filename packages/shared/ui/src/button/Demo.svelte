<script lang="ts">
import Button from './button.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Variants" description="All six button variants at default size.">
		<div class="flex flex-wrap items-center gap-3">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	</DemoSection>

	<DemoSection title="Sizes" description="Three standard sizes: sm, default, and lg.">
		<div class="flex flex-wrap items-end gap-3">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
		</div>
	</DemoSection>

	<DemoSection title="Icon Sizes" description="Square icon-only buttons in three sizes.">
		<div class="flex flex-wrap items-end gap-3">
			<Button size="icon-sm" variant="outline" aria-label="Small icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
			</Button>
			<Button size="icon" variant="outline" aria-label="Default icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
			</Button>
			<Button size="icon-lg" variant="outline" aria-label="Large icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
			</Button>
		</div>
	</DemoSection>

	<DemoSection title="Disabled" description="Disabled state across different variants.">
		<div class="flex flex-wrap items-center gap-3">
			<Button disabled>Default</Button>
			<Button variant="secondary" disabled>Secondary</Button>
			<Button variant="destructive" disabled>Destructive</Button>
			<Button variant="outline" disabled>Outline</Button>
		</div>
	</DemoSection>

	<DemoSection title="As Link" description="Buttons rendered as anchor elements via the href prop.">
		<div class="flex flex-wrap items-center gap-3">
			<Button href="#link">Default Link</Button>
			<Button href="#link" variant="outline">Outline Link</Button>
			<Button href="#link" variant="ghost">Ghost Link</Button>
		</div>
	</DemoSection>

	<DemoSection title="Variant x Size Matrix" description="Every variant combined with every standard size.">
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-end gap-3">
				<Button size="sm">Default sm</Button>
				<Button size="default">Default md</Button>
				<Button size="lg">Default lg</Button>
			</div>
			<div class="flex flex-wrap items-end gap-3">
				<Button variant="secondary" size="sm">Secondary sm</Button>
				<Button variant="secondary" size="default">Secondary md</Button>
				<Button variant="secondary" size="lg">Secondary lg</Button>
			</div>
			<div class="flex flex-wrap items-end gap-3">
				<Button variant="destructive" size="sm">Destructive sm</Button>
				<Button variant="destructive" size="default">Destructive md</Button>
				<Button variant="destructive" size="lg">Destructive lg</Button>
			</div>
			<div class="flex flex-wrap items-end gap-3">
				<Button variant="outline" size="sm">Outline sm</Button>
				<Button variant="outline" size="default">Outline md</Button>
				<Button variant="outline" size="lg">Outline lg</Button>
			</div>
			<div class="flex flex-wrap items-end gap-3">
				<Button variant="ghost" size="sm">Ghost sm</Button>
				<Button variant="ghost" size="default">Ghost md</Button>
				<Button variant="ghost" size="lg">Ghost lg</Button>
			</div>
		</div>
	</DemoSection>
</div>
