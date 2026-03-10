<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';

/**
 * Props for the shared SidebarToggle component.
 *
 * Each product editor provides its own locale label and formatted shortcut string.
 */
export const SidebarTogglePropsSchema = v.strictObject({
	/** Localized "Toggle Sidebar" label for the tooltip. @values Toggle Sidebar, Show/Hide Sidebar, Sidebar */
	label: StrSchema,
	/** Formatted keyboard shortcut display string (e.g. "⌘B"). @values ⌘B, Ctrl+B, ⌘\\ */
	shortcutLabel: StrSchema,
});
export type SidebarToggleProps = v.InferOutput<typeof SidebarTogglePropsSchema>;
</script>

<script lang="ts">
/**
 * Sidebar toggle button with a tooltip showing the label and keyboard shortcut.
 *
 * Renders the sidebar trigger wrapped in a tooltip, followed by a vertical separator.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import * as Sidebar from '../sidebar/index.js';
import * as Tooltip from '../tooltip/index.js';
import { Separator } from '../separator/index.js';
import TooltipLabel from '../tooltip-label/TooltipLabel.svelte';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps = $props();
const validated = $derived.by(() => {
	const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
	const result = safeParse(SidebarTogglePropsSchema, rawProps);
	if (!result.ok) throw result.error;
	return result.data;
});
</script>

<Tooltip.Root delayDuration={700}>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Sidebar.Trigger class="-ml-1" {...props} />
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="right" sideOffset={4}>
		<TooltipLabel label={validated.label} shortcutLabel={validated.shortcutLabel} />
	</Tooltip.Content>
</Tooltip.Root>
<Separator orientation="vertical" role="separator" class="mx-2 data-[orientation=vertical]:h-4" />
