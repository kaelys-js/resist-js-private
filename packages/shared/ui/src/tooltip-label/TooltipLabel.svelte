<script module lang="ts">
import * as v from 'valibot';

/**
 * Standardized tooltip content with optional keyboard shortcut badge.
 *
 * Use inside `<Tooltip.Content>` to render a label with an optional `<kbd>` shortcut indicator.
 */
export const TooltipLabelPropsSchema = v.strictObject({
	/** The tooltip text label. @values Toggle Sidebar, Copy to clipboard, Search */
	label: v.string(),
	/** Optional formatted keyboard shortcut string (e.g. "⌘B"). @values ⌘B, Ctrl+K, Esc */
	shortcutLabel: v.optional(v.string()),
	/** When true, the kbd badge is always visible instead of hidden on mobile. */
	shortcutAlwaysVisible: v.optional(v.boolean()),
});
export type TooltipLabelProps = v.InferOutput<typeof TooltipLabelPropsSchema>;
</script>

<script lang="ts">
/**
 * Standardized tooltip content with an optional keyboard shortcut badge.
 *
 * Use inside `<Tooltip.Content>` to render a label with an optional `<Kbd>` indicator.
 */
import { safeParse } from '@/utils/result/safe';
import Kbd from '../kbd/Kbd.svelte';

const rawProps = $props();
const validated = safeParse(TooltipLabelPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
let { label, shortcutLabel, shortcutAlwaysVisible = false }: TooltipLabelProps = validated.data;
</script>

{#if shortcutLabel}
	<span class="flex items-center gap-1.5">{label} <Kbd label={shortcutLabel} alwaysVisible={shortcutAlwaysVisible} /></span>
{:else}
	{label}
{/if}
