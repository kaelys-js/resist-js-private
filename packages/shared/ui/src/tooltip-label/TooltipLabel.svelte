<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';

/**
 * Standardized tooltip content with optional keyboard shortcut badge.
 *
 * Use inside `<Tooltip.Content>` to render a label with an optional `<kbd>` shortcut indicator.
 */
export const TooltipLabelPropsSchema = v.strictObject({
	/** The tooltip text label. @values Toggle Sidebar, Copy to clipboard, Search */
	label: StrSchema,
	/** Optional formatted keyboard shortcut string (e.g. "⌘B"). @values ⌘B, Ctrl+K, Esc */
	shortcutLabel: v.optional(StrSchema),
	/** When true, the kbd badge is always visible instead of hidden on mobile. */
	shortcutAlwaysVisible: v.optional(BoolSchema),
});
export type TooltipLabelProps = v.InferOutput<typeof TooltipLabelPropsSchema>;
</script>

<script lang="ts">
/**
 * Standardized tooltip content with an optional keyboard shortcut badge.
 *
 * Use inside `<Tooltip.Content>` to render a label with an optional `<Kbd>` indicator.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import Kbd from '../kbd/Kbd.svelte';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: TooltipLabelProps = $props();
const validated: TooltipLabelProps = $derived.by(() => {
	const rawProps: TooltipLabelProps = stripSvelteProps(allProps);
	const result = safeParse(TooltipLabelPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as TooltipLabelProps;
});
</script>

{#if validated.shortcutLabel}
	<span class="flex items-center gap-1.5">{validated.label} <Kbd label={validated.shortcutLabel} alwaysVisible={validated.shortcutAlwaysVisible ?? false} /></span>
{:else}
	{validated.label}
{/if}
