<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  // @convert-to-lens — internal lens component, stripSvelteProps not needed
  export const LensSectionPropsSchema = v.strictObject({
    /** Section heading. @values Basic Usage, With Form, Custom Styles */
    title: StrSchema,
    /** Optional description text below the heading. @values Default configuration., Advanced usage with custom props., Responsive layout example. */
    description: v.optional(StrSchema),
    /** The demo content to render inside the preview area. */
    children: v.optional(v.custom<Snippet>((val: unknown): boolean => typeof val === 'function')),
    /** Optional code snippet to show in a collapsible panel. @values <div>content</div> */
    code: v.optional(v.custom<Snippet>((val: unknown): boolean => typeof val === 'function')),
    /** Raw code text for clipboard copy. @values <Button>Click me</Button>, <Input placeholder="..." />, const x = 1 */
    codeText: v.optional(StrSchema),
    /** Prop name to display as a Badge. @values variant, size, disabled */
    propName: v.optional(StrSchema),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
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

  const rawProps: LensSectionProps = $props();
  const validated: LensSectionProps = $derived.by(() => {
    const result = safeParse(LensSectionPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensSectionProps;
  });

  /** Whether the code panel is visible. */
  let codeOpen: Bool = $state(false);

  /** Reference to the code panel for extracting text content as fallback. */
  let codeRef: HTMLDivElement | undefined = $state(undefined);

  /** Text to copy — prefers codeText prop, falls back to DOM text. */
  const copyText: Str = $derived.by((): Str => {
    if (validated.codeText) return validated.codeText;
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

<section class={cn('overflow-hidden rounded-lg border bg-card', validated.class)}>
  <div class="flex items-center justify-between border-b bg-muted/50 px-5 py-3">
    <div>
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">{validated.title}</h3>
        {#if validated.propName}
          <Badge variant="outline" class="rounded-md font-mono text-[10px]"
            >{validated.propName}</Badge
          >
        {/if}
      </div>
      {#if validated.description}
        <p class="mt-0.5 text-xs text-muted-foreground">{validated.description}</p>
      {/if}
    </div>
    {#if validated.code}
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

  {#if validated.children}
    <div class="p-6">
      {@render validated.children()}
    </div>
  {/if}

  {#if validated.code && codeOpen}
    <div class="overflow-hidden border-t" transition:slide={{ duration: 200 }}>
      <div bind:this={codeRef} class="min-w-0 overflow-x-auto p-4 text-sm">
        {@render validated.code()}
      </div>
    </div>
  {/if}
</section>
