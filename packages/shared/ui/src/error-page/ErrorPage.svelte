<script lang="ts">
import type { Str, Num, Bool, Void } from '@/schemas/common';
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
import { Button } from '../button/index.js';
import * as Tooltip from '../tooltip/index.js';

/**
 * Props for the shared ErrorPage component.
 *
 * Each product editor resolves locale strings and provides the announce callback.
 */
type ErrorPageProps = {
	/** HTTP status code. */
	status: Num;
	/** Error message (available for future use). */
	message: Str;
	/** Optional error reference ID for user support. */
	errorId?: Str;
	/** Pre-resolved title for the status code. */
	title: Str;
	/** Pre-resolved description for the status code. */
	description: Str;
	/** Localized UI labels. */
	labels: {
		/** "Go to homepage" button label. */
		goHome: Str;
		/** "Try again" button label. */
		tryAgain: Str;
		/** "Copied!" confirmation text. */
		copied: Str;
		/** Formatted error ID reference (e.g. "Reference: abc-123"). */
		errorIdLabel: Str;
		/** Aria-label for the copy button (e.g. "Copy error ID to clipboard"). */
		copyErrorIdAriaLabel: Str;
		/** Tooltip text when not yet copied (e.g. "Click to copy"). */
		clickToCopy: Str;
	};
	/** Optional callback for screen reader announcements. */
	announce?: (msg: Str) => void;
};

let { status, message, errorId, title, description, labels, announce }: ErrorPageProps = $props();

let copied: Bool = $state(false);
let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

async function copyErrorId(): Promise<Void> {
	if (!errorId) return;
	try {
		await navigator.clipboard.writeText(errorId);
		copied = true;
		announce?.(labels.copied);
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => {
			copied = false;
		}, 2000);
	} catch {
		// Fallback: select text for manual copy
	}
}

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

const tooltipText: Str = $derived(copied ? labels.copied : labels.clickToCopy);

const showTryAgain: Bool = $derived(status >= 500);
const StatusIcon: Component = $derived(iconMap[status] ?? TriangleAlert);
const iconColor: Str = $derived(iconColorMap[status] ?? 'text-muted-foreground');
</script>

<div
	class="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center"
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
			{labels.goHome}
		</Button>
		{#if showTryAgain}
			<Button variant="outline" onclick={() => window.location.reload()}>
				<RotateCw aria-hidden="true" size={16} />
				{labels.tryAgain}
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
							aria-label={labels.copyErrorIdAriaLabel}
							data-error-id={errorId}
						>
							{#if copied}
								<span
									class="inline-flex items-center gap-1.5 text-green-500"
									in:fade={{ duration: 150 }}
								>
									<Check aria-hidden="true" size={12} />
									<span>{labels.copied}</span>
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1.5"
									in:fade={{ duration: 150 }}
								>
									<Copy aria-hidden="true" size={12} />
									<span>{labels.errorIdLabel}</span>
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
