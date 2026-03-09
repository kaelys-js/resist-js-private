<script lang="ts">
/**
 * Sidebar toggle button with a tooltip showing the label and keyboard shortcut.
 *
 * Renders the sidebar trigger wrapped in a tooltip, followed by a vertical separator.
 */
import * as Sidebar from '../sidebar/index.js';
import * as Tooltip from '../tooltip/index.js';
import { Separator } from '../separator/index.js';
import TooltipLabel from '../tooltip-label/TooltipLabel.svelte';
import type { Str } from '@/schemas/common';

/**
 * Props for the shared SidebarToggle component.
 *
 * Each product editor provides its own locale label and formatted shortcut string.
 */
type SidebarToggleProps = {
	/** Localized "Toggle Sidebar" label for the tooltip. @values Toggle Sidebar, Show/Hide Sidebar, Sidebar */
	label: Str;
	/** Formatted keyboard shortcut display string (e.g. "⌘B"). @values ⌘B, Ctrl+B, ⌘\\ */
	shortcutLabel: Str;
};

let { label, shortcutLabel }: SidebarToggleProps = $props();
</script>

<Tooltip.Root delayDuration={700}>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Sidebar.Trigger class="-ml-1" {...props} />
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="right" sideOffset={4}>
		<TooltipLabel {label} {shortcutLabel} />
	</Tooltip.Content>
</Tooltip.Root>
<Separator orientation="vertical" role="separator" class="mx-2 data-[orientation=vertical]:h-4" />
