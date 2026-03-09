<script lang="ts">
import Separator from './separator.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Horizontal" description="Default horizontal separator spanning full width.">
		<div class="max-w-md">
			<p class="text-sm">Content above the separator</p>
			<Separator class="my-4" />
			<p class="text-sm">Content below the separator</p>
		</div>
	</DemoSection>

	<DemoSection title="Vertical" description="Vertical separator between inline items. Set orientation='vertical'.">
		<div class="flex h-8 items-center gap-4">
			<span class="text-sm">Left</span>
			<Separator orientation="vertical" />
			<span class="text-sm">Center</span>
			<Separator orientation="vertical" />
			<span class="text-sm">Right</span>
		</div>
	</DemoSection>

	<DemoSection title="Decorative" description="Decorative separator (not announced by screen readers). Set decorative to true.">
		<div class="max-w-md">
			<p class="text-sm">Above decorative rule</p>
			<Separator decorative class="my-4" />
			<p class="text-sm">Below decorative rule</p>
		</div>
	</DemoSection>

	<DemoSection title="In a List" description="Separators dividing a vertical list of items.">
		<div class="max-w-sm rounded-lg border">
			<div class="px-4 py-3 text-sm">First item</div>
			<Separator />
			<div class="px-4 py-3 text-sm">Second item</div>
			<Separator />
			<div class="px-4 py-3 text-sm">Third item</div>
		</div>
	</DemoSection>

	<DemoSection title="Toolbar Layout" description="Vertical separators in a horizontal toolbar.">
		<div class="flex items-center gap-2 rounded-lg border p-2">
			<button class="rounded px-3 py-1.5 text-sm hover:bg-muted">Bold</button>
			<button class="rounded px-3 py-1.5 text-sm hover:bg-muted">Italic</button>
			<Separator orientation="vertical" class="mx-1 h-6" />
			<button class="rounded px-3 py-1.5 text-sm hover:bg-muted">Left</button>
			<button class="rounded px-3 py-1.5 text-sm hover:bg-muted">Center</button>
			<button class="rounded px-3 py-1.5 text-sm hover:bg-muted">Right</button>
			<Separator orientation="vertical" class="mx-1 h-6" />
			<button class="rounded px-3 py-1.5 text-sm hover:bg-muted">Link</button>
		</div>
	</DemoSection>
</div>
