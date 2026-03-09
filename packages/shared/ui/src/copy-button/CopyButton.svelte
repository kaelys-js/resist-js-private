<script lang="ts">
/**
 * Copy-to-clipboard button with tooltip feedback and accessible status.
 *
 * Encapsulates the clipboard copy lifecycle: idle → success/failed → idle.
 * Renders a small icon button with Tooltip feedback and an `aria-live`
 * region for screen readers. Shared by CopyImport and LensSection.
 *
 * @example
 * ```svelte
 * <CopyButton text="npm install @/ui/button" />
 * <CopyButton text={rawSource} label="Copy source" />
 * ```
 */
import type { Bool, Str, Void } from '@/schemas/common';
import Check from '@lucide/svelte/icons/check';
import Copy from '@lucide/svelte/icons/copy';
import X from '@lucide/svelte/icons/x';
import { fade } from 'svelte/transition';
import * as Tooltip from '../tooltip/index.js';
import { clipboardCopy } from '../lens/clipboard.js';
import { cn } from '../utils.js';

type CopyButtonProps = {
	/** The text to copy to the clipboard when clicked. @values npm install valibot, <Button>Click me</Button>, const x = 42 */
	text: Str;
	/** Accessible label for the button. @values Copy code, Copy to clipboard, Copy import */
	label?: Str;
	/** Additional CSS classes for the button element. */
	class?: Str;
};

const { text, label = 'Copy to clipboard', class: className }: CopyButtonProps = $props();

/** Copy result: 'idle' (default), 'success', or 'failed'. */
let copyState: 'idle' | 'success' | 'failed' = $state('idle');
let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

/** Tooltip text derived from the current copy state. */
const tooltipText: Str = $derived.by((): Str => {
	const state: typeof copyState = copyState;
	if (state === 'success') return 'Copied!';
	if (state === 'failed') return 'Copy failed';
	return label;
});

/**
 * Handle click — copies text and shows visual feedback for 2 seconds.
 */
async function handleCopy(): Promise<Void> {
	const success: Bool = await clipboardCopy(text);
	copyState = success ? 'success' : 'failed';
	clearTimeout(copyTimeout);
	copyTimeout = setTimeout((): void => {
		copyState = 'idle';
	}, 2000);
}
</script>

<Tooltip.Provider>
	<Tooltip.Root delayDuration={300} open={copyState !== 'idle' ? true : undefined}>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					class={cn(
						'rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
						className,
					)}
					onclick={handleCopy}
					aria-label={label}
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
