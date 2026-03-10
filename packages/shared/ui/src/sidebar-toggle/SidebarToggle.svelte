<script module lang="ts">
import * as v from 'valibot';

/**
 * Props for the shared SidebarToggle component.
 *
 * Each product editor provides its own locale label and formatted shortcut string.
 */
export const SidebarTogglePropsSchema = v.strictObject({
	/** Localized "Toggle Sidebar" label for the tooltip. @values Toggle Sidebar, Show/Hide Sidebar, Sidebar */
	label: v.string(),
	/** Formatted keyboard shortcut display string (e.g. "⌘B"). @values ⌘B, Ctrl+B, ⌘\\ */
	shortcutLabel: v.string(),
});
export type SidebarToggleProps = v.InferOutput<typeof SidebarTogglePropsSchema>;
</script>

<script lang="ts">
/**
 * Sidebar toggle button with a tooltip showing the label and keyboard shortcut.
 *
 * Renders the sidebar trigger wrapped in a tooltip, followed by a vertical separator.
 */
import { safeParse } from '@/utils/result/safe';
import * as Sidebar from '../sidebar/index.js';
import * as Tooltip from '../tooltip/index.js';
import { Separator } from '../separator/index.js';
import TooltipLabel from '../tooltip-label/TooltipLabel.svelte';

const rawProps = $props();
const validated = safeParse(SidebarTogglePropsSchema, rawProps);
if (!validated.ok) throw validated.error;
let { label, shortcutLabel }: SidebarToggleProps = validated.data;
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
