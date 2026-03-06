<script lang="ts">
import AppLogo from '$lib/components/AppLogo.svelte';
import type { Str, Bool } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { useEditorStore, type EditorStore } from '$lib/stores/editor-state.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { log } from '@/utils/core/logger';
import { APP_TAGLINE } from '$lib/config/app-meta';

const store: EditorStore = useEditorStore();

// Fade-in on client mount only. SSR renders without the animation class so
// content is immediately visible. The layout's {#if useResizable} branch swap
// re-mounts this component during hydration — applying the class via $effect
// ensures the animation plays exactly once on the final mount.
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

const welcomeText: Str = $derived.by(() => {
	// as (p: ...) => Result<Str> — locale template functions are typed as unknown at runtime
	const result: Result<Str> = (localeStore.t.home.welcome as (p: { appName: Str }) => Result<Str>)({
		appName: store.app.appName,
	});
	if (!result.ok) {
		log.warn(`Locale home.welcome error: ${result.error.code}`);
	}
	// UI boundary — locale error logged, fallback used
	return result.ok ? result.data : `Welcome to ${store.app.appName}`;
});

const tagline: Str = $derived(t(localeStore.t.meta.tagline, APP_TAGLINE));
const selectScene: Str = $derived(
	t(localeStore.t.home.selectScene, 'Select a scene from the sidebar to start editing.'),
);
const orCreateNew: Str = $derived(
	t(localeStore.t.home.orCreateNew, 'Or create a new one to get started.'),
);
</script>

<div
	class="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center transition-opacity duration-700 ease-out {animate ? 'opacity-100' : 'opacity-0'}"
>
	<div class="mb-2" aria-hidden="true">
		<AppLogo size={48} />
	</div>

	<h1 class="text-2xl font-semibold tracking-tight">{welcomeText}</h1>
	<p class="text-muted-foreground text-sm">{tagline}</p>

	<div class="mt-6 flex max-w-sm flex-col items-center gap-1">
		<p class="text-muted-foreground text-sm leading-relaxed">{selectScene}</p>
		<p class="text-muted-foreground text-sm leading-relaxed">{orCreateNew}</p>
	</div>
</div>
