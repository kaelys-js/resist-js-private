<script lang="ts">
import HelpTooltip from './HelpTooltip.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default" description="Basic usage next to a label. Hover the icon to see the tooltip.">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium">Field Label</span>
			<HelpTooltip text="This is helpful information about this field." />
		</div>
	</DemoSection>

	<DemoSection title="Side Variants" description="Tooltip can appear on any side of the icon.">
		<div class="flex flex-wrap items-center gap-8">
			<div class="flex items-center gap-1.5">
				<span class="text-sm">Top</span>
				<HelpTooltip text="Tooltip on top" side="top" />
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-sm">Bottom</span>
				<HelpTooltip text="Tooltip on bottom" side="bottom" />
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-sm">Left</span>
				<HelpTooltip text="Tooltip on left" side="left" />
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-sm">Right</span>
				<HelpTooltip text="Tooltip on right" side="right" />
			</div>
		</div>
	</DemoSection>

	<DemoSection title="Sizes" description="The icon scales to any pixel size.">
		<div class="flex items-end gap-6">
			<div class="flex flex-col items-center gap-1.5">
				<HelpTooltip text="Small — 12px" size={12} />
				<span class="text-xs text-muted-foreground">12px</span>
			</div>
			<div class="flex flex-col items-center gap-1.5">
				<HelpTooltip text="Default — 16px" />
				<span class="text-xs text-muted-foreground">16px</span>
			</div>
			<div class="flex flex-col items-center gap-1.5">
				<HelpTooltip text="Medium — 20px" size={20} />
				<span class="text-xs text-muted-foreground">20px</span>
			</div>
			<div class="flex flex-col items-center gap-1.5">
				<HelpTooltip text="Large — 24px" size={24} />
				<span class="text-xs text-muted-foreground">24px</span>
			</div>
		</div>
	</DemoSection>

	<DemoSection title="In Context" description="Typical form-like layout with multiple help tooltips.">
		<div class="flex max-w-md flex-col gap-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-1.5">
					<span class="text-sm font-medium">Username</span>
					<HelpTooltip text="Your unique display name. 3–20 characters, letters and numbers only." />
				</div>
				<div class="h-9 w-48 rounded-md border bg-muted/50"></div>
			</div>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-1.5">
					<span class="text-sm font-medium">API Key</span>
					<HelpTooltip text="Generate a key from Settings → Developer → API Keys." side="right" />
				</div>
				<div class="h-9 w-48 rounded-md border bg-muted/50"></div>
			</div>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-1.5">
					<span class="text-sm font-medium">Webhook URL</span>
					<HelpTooltip text="We'll POST events to this URL. Must be HTTPS." side="right" />
				</div>
				<div class="h-9 w-48 rounded-md border bg-muted/50"></div>
			</div>
		</div>
	</DemoSection>
</div>
