<script lang="ts">
/**
 * Full-page error display with status code, icon, message, and action buttons.
 *
 * Renders a centered error layout with a status-specific icon, title, description,
 * navigation/retry actions, and an optional copyable error reference ID.
 */
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
import X from '@lucide/svelte/icons/x';
import { Button } from '../button/index.js';
import * as Tooltip from '../tooltip/index.js';

/** Localized UI labels for the ErrorPage component. */
type ErrorPageLabels = {
	/** "Go to homepage" button label. @values Go Home, Back to Home, Return Home */
	goHome: Str;
	/** "Try again" button label. @values Try Again, Retry, Reload */
	tryAgain: Str;
	/** "Copied!" confirmation text. @values Copied!, Copied to clipboard */
	copied: Str;
	/** "Copy failed" error text. @values Copy failed, Failed to copy */
	copyFailed: Str;
	/** Formatted error ID reference (e.g. "Reference: abc-123"). @values Reference: err-abc-123, Reference: err-def-456 */
	errorIdLabel: Str;
	/** Aria-label for the copy button (e.g. "Copy error ID to clipboard"). @values Copy error ID to clipboard, Copy reference ID */
	copyErrorIdAriaLabel: Str;
	/** Tooltip text when not yet copied (e.g. "Click to copy"). @values Click to copy, Copy to clipboard */
	clickToCopy: Str;
};

/**
 * Props for the shared ErrorPage component.
 *
 * Each product editor resolves locale strings and provides the announce callback.
 */
type ErrorPageProps = {
	/** HTTP status code. @values 400, 403, 404, 500 */
	status: Num;
	/** Error message (available for future use). @values Not Found, Forbidden, Internal Server Error */
	message: Str;
	/** Optional error reference ID for user support. @values err-abc-123, err-def-456 */
	errorId?: Str;
	/** Pre-resolved title for the status code. @values Bad Request, Forbidden, Not Found, Server Error */
	title: Str;
	/** Pre-resolved description for the status code. @values The page you requested could not be found., You do not have permission to access this resource. */
	description: Str;
	/** Localized UI labels. */
	labels: ErrorPageLabels;
	/** Optional callback for screen reader announcements. */
	announce?: (msg: Str) => void;
	/** Optional override for clipboard copy — returns success/failure. Used for testing. */
	copyOverride?: (text: Str) => Promise<Bool>;
};

let {
	status,
	message,
	errorId,
	title,
	description,
	labels,
	announce,
	copyOverride,
}: ErrorPageProps = $props();

/** Copy result: 'idle' (default), 'success', or 'failed'. */
let copyState: 'idle' | 'success' | 'failed' = $state('idle');
let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

/**
 * Copy text to clipboard with legacy fallback.
 *
 * Uses `navigator.clipboard.writeText()` when available, falls back to
 * `document.execCommand('copy')` for insecure contexts / older browsers.
 * Mirrors the clipboard logic in error.html.
 *
 * @param text - The string to copy
 * @returns Whether the copy succeeded
 */
async function copyToClipboard(text: Str): Promise<Bool> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			/* clipboard API rejected — fall through to legacy */
		}
	}
	// Legacy fallback: hidden textarea + execCommand
	try {
		const ta: HTMLTextAreaElement = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		// insertBefore(node, null) appends — avoids ParentNode.append vs Body.append type conflict
		document.body.insertBefore(ta, null);
		ta.select();
		const ok: Bool = document.execCommand('copy');
		ta.remove();
		return ok;
	} catch {
		/* execCommand not available — copy failed entirely */
		return false;
	}
}

async function handleCopyClick(): Promise<Void> {
	if (!errorId) return;
	const success: Bool = copyOverride ? await copyOverride(errorId) : await copyToClipboard(errorId);
	copyState = success ? 'success' : 'failed';
	announce?.(success ? labels.copied : labels.copyFailed);
	clearTimeout(copyTimeout);
	copyTimeout = setTimeout(() => {
		copyState = 'idle';
	}, 2000);
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

const tooltipText: Str = $derived.by(() => {
	const state: typeof copyState = copyState;
	if (state === 'success') return labels.copied;
	if (state === 'failed') return labels.copyFailed;
	return labels.clickToCopy;
});

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
			<Tooltip.Root delayDuration={300} open={copyState !== 'idle' ? true : undefined}>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="text-muted-foreground hover:text-foreground relative mt-8 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2.5 font-mono text-xs transition-all duration-200 hover:border-border hover:bg-muted/50"
							onclick={handleCopyClick}
							aria-label={labels.copyErrorIdAriaLabel}
							data-error-id={errorId}
						>
							{#if copyState === 'success'}
								<span
									class="inline-flex items-center gap-1.5 text-green-500"
									in:fade={{ duration: 150 }}
								>
									<Check aria-hidden="true" size={12} />
									<span>{labels.copied}</span>
								</span>
							{:else if copyState === 'failed'}
								<span
									class="inline-flex items-center gap-1.5 text-red-500"
									in:fade={{ duration: 150 }}
								>
									<X aria-hidden="true" size={12} />
									<span>{labels.copyFailed}</span>
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

	<!-- Aria-live region for clipboard feedback — announced by screen readers -->
	<div id="copy-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true">
		{#if copyState === 'success'}{labels.copied}{:else if copyState === 'failed'}{labels.copyFailed}{/if}
	</div>
</div>
