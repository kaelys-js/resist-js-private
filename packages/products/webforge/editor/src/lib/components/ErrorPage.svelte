<script lang="ts">
import type { Str, Num, Bool, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { Component } from 'svelte';
import { fade } from 'svelte/transition';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Check from '@lucide/svelte/icons/check';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import Copy from '@lucide/svelte/icons/copy';
import FileQuestion from '@lucide/svelte/icons/file-question';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import ServerCrash from '@lucide/svelte/icons/server-crash';
import ShieldOff from '@lucide/svelte/icons/shield-off';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import { Button } from '$lib/components/ui/button/index.js';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { announce } from '$lib/utils/announce.svelte';

let { status, message, errorId }: { status: Num; message: Str; errorId?: Str } = $props();

let copied: Bool = $state(false);
let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

async function copyErrorId(): Promise<Void> {
	if (!errorId) return;
	try {
		await navigator.clipboard.writeText(errorId);
		copied = true;
		announce(t(localeStore.t.errors.copied, 'Copied!'));
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => {
			copied = false;
		}, 2000);
	} catch {
		// Fallback: select text for manual copy
	}
}

const titleKey: Record<Num, () => Str> = {
	400: () => t(localeStore.t.errors.badRequest, 'Bad request'),
	403: () => t(localeStore.t.errors.forbidden, 'Access denied'),
	404: () => t(localeStore.t.errors.notFound, 'Page not found'),
	500: () => t(localeStore.t.errors.serverError, 'Something went wrong'),
};

const descriptionKey: Record<Num, () => Str> = {
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

const iconMap: Record<Num, Component> = {
	400: CircleAlert,
	403: ShieldOff,
	404: FileQuestion,
	500: ServerCrash,
};

const iconColorMap: Record<Num, Str> = {
	400: 'text-blue-500',
	403: 'text-amber-500',
	500: 'text-red-500',
};

const title: Str = $derived(
	(titleKey[status] ?? (() => t(localeStore.t.errors.genericTitle, 'Error')))(),
);

const description: Str = $derived(
	(
		descriptionKey[status] ??
		(() =>
			t(
				localeStore.t.errors.genericDescription,
				'Something unexpected happened while loading this page.',
			))
	)(),
);

const goHomeLabel: Str = $derived(t(localeStore.t.errors.goHome, 'Go to homepage'));
const tryAgainLabel: Str = $derived(t(localeStore.t.errors.tryAgain, 'Try again'));
const copiedLabel: Str = $derived(t(localeStore.t.errors.copied, 'Copied!'));

const errorIdLabel: Str = $derived.by(() => {
	if (!errorId) return '';
	// Locale DeepReadonly workaround — parametric locale function needs cast
	const result: Result<Str> = (localeStore.t.errors.errorId as (p: { id: Str }) => Result<Str>)({
		id: errorId,
	});
	return result.ok ? result.data : `Reference: ${errorId}`;
});

const tooltipText: Str = $derived(copied ? copiedLabel : 'Click to copy');

const showTryAgain: Bool = $derived(status >= 500);
const StatusIcon: Component = $derived(iconMap[status] ?? TriangleAlert);
const iconColor: Str = $derived(iconColorMap[status] ?? 'text-muted-foreground');
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
			<ArrowLeft aria-hidden="true" size={16} />
			{goHomeLabel}
		</Button>
		{#if showTryAgain}
			<Button variant="outline" onclick={() => window.location.reload()}>
				<RotateCw aria-hidden="true" size={16} />
				{tryAgainLabel}
			</Button>
		{/if}
	</div>

	{#if errorId}
		<Tooltip.Provider>
			<Tooltip.Root delayDuration={300} open={copied ? true : undefined}>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="text-muted-foreground hover:text-foreground relative mt-8 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2.5 font-mono text-xs transition-all duration-200 hover:border-border hover:bg-muted/50"
							onclick={copyErrorId}
							aria-label={t(localeStore.t.errors.copyErrorId, 'Copy error ID to clipboard')}
							data-error-id={errorId}
						>
							{#if copied}
								<span
									class="inline-flex items-center gap-1.5 text-green-500"
									in:fade={{ duration: 150 }}
								>
									<Check aria-hidden="true" size={12} />
									<span>{copiedLabel}</span>
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1.5"
									in:fade={{ duration: 150 }}
								>
									<Copy aria-hidden="true" size={12} />
									<span>{errorIdLabel}</span>
								</span>
							{/if}
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="bottom" sideOffset={4}>
					{tooltipText}
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{/if}
</div>
