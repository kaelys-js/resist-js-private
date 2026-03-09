<script lang="ts">
/**
 * Scopes bits-ui portal targets so portaled overlays (tooltips, popovers,
 * dropdowns) inherit per-card theme/mode CSS variables.
 *
 * Creates a body-level `<div>` with matching `.dark`/`.lens-force-light`
 * class and `data-theme` attribute, then wraps children in `<BitsConfig>`
 * to route all portals there instead of bare `document.body`.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import type { Snippet } from 'svelte';
import { BitsConfig } from 'bits-ui';
import { cn } from '../utils.js';

type LensPortalScopeProps = {
	/** Per-card color mode. @values auto, light, dark */
	mode: Str;
	/** Per-card theme id (empty string for default). @values midnight, ocean, forest */
	theme: Str;
	/** Whether the page-level dark mode is active (for auto mode mirroring). */
	pageIsDark: Bool;
	/** Content to render inside the scoped portal context. */
	children: Snippet;
};

const { mode, theme, pageIsDark, children }: LensPortalScopeProps = $props();

/** Body-level div that serves as the portal target. */
let portalEl: HTMLDivElement | undefined = $state(undefined);

$effect(() => {
	const div: HTMLDivElement = document.createElement('div');
	// Position off-flow so it doesn't affect layout
	div.style.position = 'absolute';
	div.style.top = '0';
	div.style.left = '0';
	div.style.width = '0';
	div.style.height = '0';
	div.style.overflow = 'visible';
	div.style.pointerEvents = 'none';
	div.dataset.lensPortal = '';
	document.body.insertBefore(div, null);
	portalEl = div;

	return (): Void => {
		portalEl = undefined;
		div.remove();
	};
});

/** Sync mode class + data-theme attribute on the body-level portal div. */
$effect(() => {
	if (!portalEl) return;
	// Reset classes — mirror page dark state when mode is auto + theme is set
	portalEl.className = cn(
		mode === 'dark' && 'dark',
		mode === 'light' && 'lens-force-light',
		mode === 'auto' && theme && pageIsDark && 'dark',
		mode === 'auto' && theme && !pageIsDark && 'lens-force-light',
	);
	// Sync theme attribute
	if (theme) {
		portalEl.dataset.theme = theme;
	} else {
		delete portalEl.dataset.theme;
	}
});
</script>

{#if portalEl}
	<BitsConfig defaultPortalTo={portalEl}>
		{@render children()}
	</BitsConfig>
{:else}
	{@render children()}
{/if}
