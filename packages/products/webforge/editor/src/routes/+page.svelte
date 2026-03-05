<script lang="ts">
import Sparkles from '@lucide/svelte/icons/sparkles';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { APP_TAGLINE } from '$lib/config/app-meta';

const store = useEditorStore();

const welcomeText: string = $derived.by(() => {
	const result: Result<Str> = (
		localeStore.t.home.welcome as (p: { appName: string }) => Result<Str>
	)({ appName: store.app.appName });
	return result.ok ? result.data : `Welcome to ${store.app.appName}`;
});

const tagline: string = $derived(t(localeStore.t.meta.tagline, APP_TAGLINE));
const selectScene: string = $derived(
	t(localeStore.t.home.selectScene, 'Select a scene from the sidebar to start editing.'),
);
const orCreateNew: string = $derived(
	t(localeStore.t.home.orCreateNew, 'Or create a new one to get started.'),
);
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
	<div class="mb-2 text-primary/60" aria-hidden="true">
		<Sparkles size={48} strokeWidth={1.5} />
	</div>

	<h1 class="text-2xl font-semibold tracking-tight">{welcomeText}</h1>
	<p class="text-muted-foreground text-sm">{tagline}</p>

	<div class="mt-6 flex max-w-sm flex-col items-center gap-1">
		<p class="text-muted-foreground text-sm leading-relaxed">{selectScene}</p>
		<p class="text-muted-foreground text-sm leading-relaxed">{orCreateNew}</p>
	</div>
</div>
