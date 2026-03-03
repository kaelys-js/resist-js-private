<script lang="ts">
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { Component } from 'svelte';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import FileQuestion from '@lucide/svelte/icons/file-question';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import ServerCrash from '@lucide/svelte/icons/server-crash';
import ShieldOff from '@lucide/svelte/icons/shield-off';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import { Button } from '$lib/components/ui/button/index.js';
import { localeStore, t } from '$lib/i18n.svelte';

let { status, message, errorId }: { status: number; message: string; errorId?: string } = $props();

const titleKey: Record<number, () => string> = {
	400: () => t(localeStore.t.errors.badRequest, 'Bad request'),
	403: () => t(localeStore.t.errors.forbidden, 'Access denied'),
	404: () => t(localeStore.t.errors.notFound, 'Page not found'),
	500: () => t(localeStore.t.errors.serverError, 'Something went wrong'),
};

const descriptionKey: Record<number, () => string> = {
	400: () =>
		t(
			localeStore.t.errors.badRequestDescription,
			"Something in that request didn't look right. Double-check and try again.",
		),
	403: () =>
		t(
			localeStore.t.errors.forbiddenDescription,
			"You don't have permission to access this page. Try signing in with a different account.",
		),
	404: () =>
		t(
			localeStore.t.errors.notFoundDescription,
			'We looked everywhere, but this page seems to have wandered off. It may have been moved or deleted.',
		),
	500: () =>
		t(
			localeStore.t.errors.serverErrorDescription,
			"Oops! Something broke on our end. We're looking into it — please try again in a moment.",
		),
};

const iconMap: Record<number, Component> = {
	400: CircleAlert,
	403: ShieldOff,
	404: FileQuestion,
	500: ServerCrash,
};

const iconColorMap: Record<number, string> = {
	400: 'text-blue-500',
	403: 'text-amber-500',
	500: 'text-red-500',
};

const title: string = $derived(
	(titleKey[status] ?? (() => t(localeStore.t.errors.genericTitle, 'Error')))(),
);

const description: string = $derived(
	(
		descriptionKey[status] ??
		(() =>
			t(
				localeStore.t.errors.genericDescription,
				'Something unexpected happened while loading this page.',
			))
	)(),
);

const goHomeLabel: string = $derived(t(localeStore.t.errors.goHome, 'Go to homepage'));
const tryAgainLabel: string = $derived(t(localeStore.t.errors.tryAgain, 'Try again'));

const errorIdLabel: string = $derived.by(() => {
	if (!errorId) return '';
	const result: Result<Str> = (localeStore.t.errors.errorId as (p: { id: string }) => Result<Str>)({
		id: errorId,
	});
	return result.ok ? result.data : `Error ID: ${errorId}`;
});

const showTryAgain: boolean = $derived(status >= 500);
const StatusIcon: Component = $derived(iconMap[status] ?? TriangleAlert);
const iconColor: string = $derived(iconColorMap[status] ?? 'text-muted-foreground');
</script>

<div
	class="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center animate-in fade-in duration-300"
	role="alert"
>
	<div class="{iconColor} mb-2" aria-hidden="true">
		<StatusIcon size={48} strokeWidth={1.5} />
	</div>

	<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
	<p class="text-muted-foreground mt-1 max-w-md text-sm leading-relaxed">{description}</p>

	<div class="mt-8 flex gap-3">
		<Button variant="default" href="/">
			<ArrowLeft size={16} />
			{goHomeLabel}
		</Button>
		{#if showTryAgain}
			<Button variant="outline" onclick={() => window.location.reload()}>
				<RotateCw size={16} />
				{tryAgainLabel}
			</Button>
		{/if}
	</div>

	{#if errorId}
		<p class="text-muted-foreground mt-8 font-mono text-xs">{errorIdLabel}</p>
	{/if}
</div>
