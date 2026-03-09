<script lang="ts">
import type { Bool, Str, Void } from '@/schemas/common';
import Check from '@lucide/svelte/icons/check';
import Copy from '@lucide/svelte/icons/copy';
import X from '@lucide/svelte/icons/x';
import { fade } from 'svelte/transition';
import * as Tooltip from '../tooltip/index.js';
import { cn } from '../utils.js';

/**
 * Code badge with a copy-to-clipboard button and tooltip feedback.
 *
 * Displays a monospace code badge alongside a copy icon. Clicking the
 * icon copies text to the clipboard with visual feedback (success or failure).
 * Uses `navigator.clipboard` with `document.execCommand` fallback.
 *
 * @example
 * ```svelte
 * <CopyImport text="@/ui/button" />
 * <CopyImport text="@/ui/dialog" copyText="import { Dialog } from '@/ui/dialog/index.js';" />
 * ```
 */
type CopyImportProps = {
	/** The text displayed inside the code badge. */
	text: Str;
	/** Text copied to clipboard. Defaults to `text` when omitted. */
	copyText?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const { text, copyText, class: className }: CopyImportProps = $props();

/** Copy result: 'idle' (default), 'success', or 'failed'. */
let copyState: 'idle' | 'success' | 'failed' = $state('idle');
let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

/**
 * Copy text to clipboard with legacy fallback.
 *
 * Uses `navigator.clipboard.writeText()` when available, falls back to
 * `document.execCommand('copy')` for insecure contexts / older browsers.
 *
 * @param clipText - The string to copy
 * @returns Whether the copy succeeded
 */
async function clipboardCopy(clipText: Str): Promise<Bool> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(clipText);
			return true;
		} catch {
			/* clipboard API rejected — fall through to legacy */
		}
	}
	// Legacy fallback: hidden textarea + execCommand
	try {
		const ta: HTMLTextAreaElement = document.createElement('textarea');
		ta.value = clipText;
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

/**
 * Handle copy button click — copies text and shows visual feedback.
 */
async function handleCopy(): Promise<Void> {
	const success: Bool = await clipboardCopy(copyText ?? text);
	copyState = success ? 'success' : 'failed';
	clearTimeout(copyTimeout);
	copyTimeout = setTimeout((): void => {
		copyState = 'idle';
	}, 2000);
}

const tooltipText: Str = $derived.by(() => {
	const state: typeof copyState = copyState;
	if (state === 'success') return 'Copied!';
	if (state === 'failed') return 'Copy failed';
	return 'Click to copy';
});
</script>

<span class={cn('inline-flex items-center gap-1.5', className)}>
	<code class="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
		{text}
	</code>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={300} open={copyState !== 'idle' ? true : undefined}>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onclick={handleCopy}
						aria-label="Copy to clipboard"
					>
						{#if copyState === 'success'}
							<span in:fade={{ duration: 150 }}>
								<Check class="size-3.5 text-green-500" aria-hidden="true" />
							</span>
						{:else if copyState === 'failed'}
							<span in:fade={{ duration: 150 }}>
								<X class="size-3.5 text-red-500" aria-hidden="true" />
							</span>
						{:else}
							<span in:fade={{ duration: 150 }}>
								<Copy class="size-3.5" aria-hidden="true" />
							</span>
						{/if}
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="top" sideOffset={4}>
				{tooltipText}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>

	<!-- Aria-live region for clipboard feedback -->
	<span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
		{#if copyState === 'success'}Copied!{:else if copyState === 'failed'}Copy failed{/if}
	</span>
</span>
