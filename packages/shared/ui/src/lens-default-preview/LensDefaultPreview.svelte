<script lang="ts">
/**
 * Default variant preview card for Lens documentation pages.
 *
 * Renders a single component instance with default (base) props inside
 * a card matching the VariantGrid visual style. Includes an error
 * boundary with LensError fallback, and per-card code expand/collapse
 * with copy-to-clipboard.
 *
 * @example
 * ```svelte
 * <LensDefaultPreview component={Button} props={extractedProps} tagName="Button" />
 * ```
 */
import type { Bool, Str, Void } from '@/schemas/common';
import type { PropMeta } from '../lens/types.js';
import type { Component } from 'svelte';
import { buildBaseProps } from '../lens/extract-props.js';
import LensError from '../lens-error/LensError.svelte';
import CopyButton from '../copy-button/CopyButton.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Code from '@lucide/svelte/icons/code';
import * as Tooltip from '../tooltip/index.js';
import { slide } from 'svelte/transition';
import { cn } from '../utils.js';

type LensDefaultPreviewProps = {
	/** The Svelte component to render with default props. */
	component: Component;
	/** Full prop metadata for building base props from defaults/mock values. */
	props?: PropMeta[];
	/** PascalCase tag name for generating the code snippet. @values Button, Input, Badge */
	tagName?: Str;
	/** Default slot content text for the rendered component. @values Example, Click me, Label */
	label?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const {
	component: Target,
	props: propsMeta = [],
	tagName,
	label = 'Example',
	class: className,
}: LensDefaultPreviewProps = $props();

const baseProps: Record<Str, unknown> = $derived(buildBaseProps(propsMeta));

/** Whether the code panel is visible. */
let codeOpen: Bool = $state(false);

/** Code snippet for the default usage. */
const snippet: Str = $derived(tagName ? `<${tagName}>${label}</${tagName}>` : '');

/**
 * Toggle the code panel visibility.
 */
function toggleCode(): Void {
	codeOpen = !codeOpen;
}
</script>

<div class={cn('overflow-hidden rounded-md border bg-background', className)}>
	<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
		<code class="text-xs text-muted-foreground">default</code>
		{#if tagName}
			<div class="flex items-center gap-1">
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: tipProps })}
								<button
									type="button"
									{...tipProps}
									class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									onclick={toggleCode}
									aria-expanded={codeOpen}
								>
									<Code class="size-3" aria-hidden="true" />
									<ChevronDown
										class={cn('size-2.5 transition-transform', codeOpen && 'rotate-180')}
										aria-hidden="true"
									/>
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="top" sideOffset={4}>
							{codeOpen ? 'Collapse code' : 'Expand code'}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<CopyButton text={snippet} label="Copy code" class="size-5 [&_svg]:size-2.5" />
			</div>
		{/if}
	</div>
	<div class="flex w-full items-center justify-center p-4">
		<svelte:boundary>
			<Target {...baseProps}>{label}</Target>
			{#snippet failed()}
				<LensError
					title="Preview unavailable"
					description="This component could not be rendered with default props."
					class="w-full rounded-none border-0 py-4"
				/>
			{/snippet}
		</svelte:boundary>
	</div>
	{#if tagName && codeOpen}
		<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
			<div class="min-w-0 overflow-x-auto p-3 text-sm">
				<CodeBlock code={snippet} lang="svelte" />
			</div>
		</div>
	{/if}
</div>
