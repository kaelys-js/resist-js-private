<script lang="ts">
import type { Bool, Str, Void } from '@/schemas/common';
import Check from '@lucide/svelte/icons/check';
import Copy from '@lucide/svelte/icons/copy';
import { fade } from 'svelte/transition';
import * as Tooltip from '../tooltip/index.js';
import { cn } from '../utils.js';

/**
 * Code badge with a copy-to-clipboard button and tooltip feedback.
 *
 * Displays a monospace code badge alongside a copy icon. Clicking the
 * icon copies text to the clipboard and shows a brief "Copied!" tooltip.
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

let copied: Bool = $state(false);
let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

/**
 * Copy text to the clipboard and show visual feedback.
 *
 * Uses `navigator.clipboard.writeText` with a 2-second reset timer.
 * The tooltip switches to "Copied!" while the icon transitions to a
 * green check mark.
 */
async function copyToClipboard(): Promise<Void> {
	try {
		await navigator.clipboard.writeText(copyText ?? text);
		copied = true;
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout((): void => {
			copied = false;
		}, 2000);
	} catch {
		/* clipboard API unavailable (SSR, insecure context, or denied permission) — user sees no feedback */
	}
}

const tooltipText: Str = $derived(copied ? 'Copied!' : 'Click to copy');
</script>

<span class={cn('inline-flex items-center gap-1.5', className)}>
	<code class="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
		{text}
	</code>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={300} open={copied ? true : undefined}>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onclick={copyToClipboard}
						aria-label="Copy to clipboard"
					>
						{#if copied}
							<span in:fade={{ duration: 150 }}>
								<Check class="size-3.5 text-green-500" aria-hidden="true" />
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
</span>
