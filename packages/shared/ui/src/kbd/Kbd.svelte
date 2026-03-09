<script lang="ts">
import type { Str } from '@/schemas/common';

/**
 * Styled keyboard shortcut badge.
 *
 * Renders a `<kbd>` element with consistent styling for displaying keyboard shortcuts.
 * By default hidden on mobile and shown on `md+` breakpoints; set `alwaysVisible` to override.
 */
type KbdProps = {
	/** The formatted shortcut string (e.g. "⌘B", "Ctrl+1", "Esc"). */
	label: Str;
	/** When true, the badge is always visible instead of hidden on mobile. */
	alwaysVisible?: boolean;
	/** Additional CSS classes. */
	class?: Str;
};

let { label, alwaysVisible = false, class: className = '' }: KbdProps = $props();
</script>

<kbd class="{alwaysVisible ? 'inline-flex' : 'hidden md:inline-flex'} items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm {className}">{label}</kbd>
