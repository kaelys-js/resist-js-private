<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import type { Snippet } from 'svelte';

export const LensPortalScopePropsSchema = v.strictObject({
	/** Per-card color mode. @values auto, light, dark */
	mode: v.picklist(['auto', 'light', 'dark']),
	/** Per-card theme id (empty string for default). @values midnight, ocean, forest */
	theme: StrSchema,
	/** Whether the page-level dark mode is active (for auto mode mirroring). */
	pageIsDark: BoolSchema,
	/** Content to render inside the scoped portal context. */
	children: v.custom<Snippet>((val) => typeof val === 'function'),
});
export type LensPortalScopeProps = v.InferOutput<typeof LensPortalScopePropsSchema>;
</script>

<script lang="ts">
/**
 * Scopes bits-ui portal targets so portaled overlays (tooltips, popovers,
 * dropdowns) inherit per-card theme/mode CSS variables.
 *
 * Creates a body-level `<div>` with matching `.dark`/`.lens-force-light`
 * class and `data-theme` attribute, then wraps children in `<BitsConfig>`
 * to route all portals there instead of bare `document.body`.
 */
import type { Void } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { BitsConfig } from 'bits-ui';
import { cn } from '../utils.js';

const rawProps: LensPortalScopeProps = $props();
const validated: LensPortalScopeProps = $derived.by(() => {
	const result = safeParse(LensPortalScopePropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as LensPortalScopeProps;
});

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
		validated.mode === 'dark' && 'dark',
		validated.mode === 'light' && 'lens-force-light',
		validated.mode === 'auto' && validated.theme && validated.pageIsDark && 'dark',
		validated.mode === 'auto' && validated.theme && !validated.pageIsDark && 'lens-force-light',
	);
	// Sync theme attribute
	if (validated.theme) {
		portalEl.dataset.theme = validated.theme;
	} else {
		delete portalEl.dataset.theme;
	}
});
</script>

{#if portalEl}
	<BitsConfig defaultPortalTo={portalEl}>
		{@render validated.children()}
	</BitsConfig>
{:else}
	{@render validated.children()}
{/if}
