<script lang="ts">
/**
 * Standardized tooltip content with an optional keyboard shortcut badge.
 *
 * Use inside `<Tooltip.Content>` to render a label with an optional `<Kbd>` indicator.
 */
import type { Str } from '@/schemas/common';
import Kbd from '../kbd/Kbd.svelte';

/**
 * Standardized tooltip content with optional keyboard shortcut badge.
 *
 * Use inside `<Tooltip.Content>` to render a label with an optional `<kbd>` shortcut indicator.
 */
type TooltipLabelProps = {
	/** The tooltip text label. @values Toggle Sidebar, Copy to clipboard, Search */
	label: Str;
	/** Optional formatted keyboard shortcut string (e.g. "⌘B"). @values ⌘B, Ctrl+K, Esc */
	shortcutLabel?: Str;
	/** When true, the kbd badge is always visible instead of hidden on mobile. */
	shortcutAlwaysVisible?: boolean;
};

let { label, shortcutLabel, shortcutAlwaysVisible = false }: TooltipLabelProps = $props();
</script>

{#if shortcutLabel}
	<span class="flex items-center gap-1.5">{label} <Kbd label={shortcutLabel} alwaysVisible={shortcutAlwaysVisible} /></span>
{:else}
	{label}
{/if}
