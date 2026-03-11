<!-- @convert-to-lens -->
<!--
@component PageFadeIn

Fade-in transition wrapper for page content.

Uses double `requestAnimationFrame` to ensure the browser paints the
transparent frame before transitioning to fully opaque. Wrap with
`{#key}` on the route path to replay the animation on each navigation.

SSR-safe: content renders fully visible on the server (no JS needed).
On hydration the layout's `{#if useResizable}` branch swap re-mounts
this component, so the fade always plays from a clean state.

@example
```svelte
{#key page.url.pathname}
	<PageFadeIn>
		{@render children()}
	</PageFadeIn>
{/key}
```
-->
<script lang="ts">
/**
 * Page enter animation wrapper that fades content in on mount.
 *
 * Uses double `requestAnimationFrame` to ensure the browser paints the transparent
 * frame before transitioning. SSR-safe: content renders fully visible on the server.
 */
import type { Bool } from '@/schemas/common';
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();

// Fade-in on client mount only. SSR renders without the animation class
// so content is immediately visible. The {#key} block swap re-mounts
// this component during navigation — applying the class via $effect
// ensures the animation plays exactly once per mount.
let animate: Bool = $state(false);
$effect(() => {
	// Double rAF ensures the browser paints the opacity-0 frame before
	// transitioning to opacity-100. A single rAF fires before the paint,
	// so the initial state would never be committed.
	let rafId: ReturnType<typeof requestAnimationFrame> = requestAnimationFrame(() => {
		rafId = requestAnimationFrame(() => {
			animate = true;
		});
	});
	return () => cancelAnimationFrame(rafId);
});
</script>

<div
	class="flex flex-1 flex-col transition-opacity duration-700 ease-out {animate
		? 'opacity-100'
		: 'opacity-0'}"
>
	{@render children()}
</div>
