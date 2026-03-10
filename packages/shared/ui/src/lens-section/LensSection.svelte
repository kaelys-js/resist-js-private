<script module lang="ts">
import * as v from 'valibot';
import type { Snippet } from 'svelte';

export const LensSectionPropsSchema = v.strictObject({
	/** Section heading. @values Basic Usage, With Form, Custom Styles */
	title: v.string(),
	/** Optional description text below the heading. @values Default configuration., Advanced usage with custom props., Responsive layout example. */
	description: v.optional(v.string()),
	/** The demo content to render inside the preview area. */
	children: v.optional(v.custom<Snippet>((val: unknown): boolean => typeof val === 'function')),
	/** Optional code snippet to show in a collapsible panel. */
	code: v.optional(v.custom<Snippet>((val: unknown): boolean => typeof val === 'function')),
	/** Raw code text for clipboard copy. @values <Button>Click me</Button>, <Input placeholder="..." />, const x = 1 */
	codeText: v.optional(v.string()),
	/** Prop name to display as a Badge. @values variant, size, disabled */
	propName: v.optional(v.string()),
	/** Additional CSS classes for the root element. */
	class: v.optional(v.string()),
});
/** Props for the LensSection component. */
export type LensSectionProps = v.InferOutput<typeof LensSectionPropsSchema>;
</script>

<script lang="ts">
/**
 * Section card for the Lens component documentation system.
 *
 * Provides a consistent card layout with title, optional description,
 * preview area, and a collapsible code block. The code block is toggled
 * via a button in the header, with a copy-to-clipboard button alongside.
 *
 * @example
 * ```svelte
 * <LensSection title="Default" description="Basic usage." codeText={rawSource}>
 *   {#snippet code()}...{/snippet}
 *   <Button>Click me</Button>
 * </LensSection>
 * ```
 */
import type { Bool, Str, Void } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import Badge from '../badge/badge.svelte';
import CopyButton from '../copy-button/CopyButton.svelte';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Code from '@lucide/svelte/icons/code';
import { slide } from 'svelte/transition';
import { cn } from '../utils.js';

const rawProps = $props();
const validated = safeParse(LensSectionPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { title, description, children, code, codeText, propName, class: className }: LensSectionProps =
	validated.data;

/** Whether the code panel is visible. */
let codeOpen: Bool = $state(false);

/** Reference to the code panel for extracting text content as fallback. */
let codeRef: HTMLDivElement | undefined = $state(undefined);

/** Text to copy — prefers codeText prop, falls back to DOM text. */
const copyText: Str = $derived.by((): Str => {
	if (codeText) return codeText;
	const ref: HTMLDivElement | undefined = codeRef;
	return ref?.textContent ?? '';
});

/**
 * Toggle the code panel visibility.
 */
function toggleCode(): Void {
	codeOpen = !codeOpen;
}
</script>

<section class={cn('overflow-hidden rounded-lg border bg-card', className)}>
	<div class="flex items-center justify-between border-b bg-muted/50 px-5 py-3">
		<div>
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-semibold">{title}</h3>
				{#if propName}
					<Badge variant="outline" class="rounded-md font-mono text-[10px]">{propName}</Badge>
				{/if}
			</div>
			{#if description}
				<p class="mt-0.5 text-xs text-muted-foreground">{description}</p>
			{/if}
		</div>
		{#if code}
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onclick={toggleCode}
					aria-expanded={codeOpen}
				>
					<Code class="size-3.5" aria-hidden="true" />
					<span>{codeOpen ? 'Collapse Code' : 'Expand Code'}</span>
					<ChevronDown
						class={cn('size-3 transition-transform', codeOpen && 'rotate-180')}
						aria-hidden="true"
					/>
				</button>
				{#if copyText}
					<CopyButton text={copyText} label="Copy code" />
				{/if}
			</div>
		{/if}
	</div>

	{#if children}
		<div class="p-6">
			{@render children()}
		</div>
	{/if}

	{#if code && codeOpen}
		<div class="overflow-hidden border-t" transition:slide={{ duration: 200 }}>
			<div bind:this={codeRef} class="min-w-0 overflow-x-auto p-4 text-sm">
				{@render code()}
			</div>
		</div>
	{/if}
</section>
