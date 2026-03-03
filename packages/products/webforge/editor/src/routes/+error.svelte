<script lang="ts">
import { page } from '$app/state';
import ErrorPage from '$lib/components/ErrorPage.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();

const titleMap: Record<number, () => string> = {
	400: () => t(localeStore.t.errors.badRequest, 'Bad request'),
	403: () => t(localeStore.t.errors.forbidden, 'Access denied'),
	404: () => t(localeStore.t.errors.notFound, 'Page not found'),
	500: () => t(localeStore.t.errors.serverError, 'Something went wrong'),
};

const errorTitle: string = $derived(
	(titleMap[page.status] ?? (() => t(localeStore.t.errors.genericTitle, 'Error')))(),
);
</script>

<svelte:head>
	<title>{errorTitle} — {page.status} | {store.app.appName}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<ErrorPage status={page.status} message={page.error?.message ?? ''} errorId={page.error?.errorId} />
