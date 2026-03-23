<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  export const LensEmptyPropsSchema = v.strictObject({
    /** Primary message text. @values No variants found, No examples yet, Component not found, No results */
    title: StrSchema,
    /** Secondary description text below the title (plain string). @values This component has no renderable variants., Add examples to see them here. */
    description: v.optional(StrSchema),
    /** Rich description snippet — used instead of `description` when rich content (e.g. highlighted query) is needed. @values {#snippet desc()}<span>...</span>{/snippet} */
    descriptionSnippet: v.optional(v.custom<Snippet>((val) => typeof val === 'function')),
    /** Optional icon snippet — defaults to PackageOpen. @values <div>content</div> */
    icon: v.optional(v.custom<Snippet>((val) => typeof val === 'function')),
    /** Visual variant. @values default, destructive */
    variant: v.optional(v.picklist(['default', 'destructive']), 'default'),
    /** Label for the optional action button (e.g. "Clear search"). @values Clear search, Reset filters, Try again */
    actionLabel: v.optional(StrSchema),
    /** Callback fired when the action button is clicked. @values () => clearSearch() */
    onaction: v.optional(v.custom<() => void>((val) => typeof val === 'function')),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
  });
  export type LensEmptyProps = v.InferOutput<typeof LensEmptyPropsSchema>;
</script>

<script lang="ts">
  /**
   * Empty state placeholder for the Lens documentation system.
   *
   * Renders a styled dashed-border card with optional icon, title, and
   * description. Supports a `destructive` variant for error states,
   * rich description snippets, and an action button (e.g. "Clear search").
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { cn } from '../utils.js';
  import PackageOpen from '@lucide/svelte/icons/package-open';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: LensEmptyProps = $props();
  const validated: LensEmptyProps = $derived.by(() => {
    const rawProps: LensEmptyProps = stripSvelteProps(restProps);
    const result = safeParse(LensEmptyPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensEmptyProps;
  });
</script>

<div
  class={cn(
    'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center',
    (validated.variant ?? 'default') === 'destructive'
      ? 'border-destructive/50 bg-destructive/5'
      : 'bg-muted/5',
    validated.class,
  )}
  {...restProps}
>
  <div
    class={cn(
      (validated.variant ?? 'default') === 'destructive'
        ? 'text-destructive/50'
        : 'text-muted-foreground/40',
    )}
  >
    {#if validated.icon}
      {@render validated.icon()}
    {:else}
      <PackageOpen class="size-10" strokeWidth={1.5} />
    {/if}
  </div>
  <div class="flex flex-col items-center gap-1.5">
    <p
      class={cn(
        'text-sm font-semibold',
        (validated.variant ?? 'default') === 'destructive'
          ? 'text-destructive'
          : 'text-muted-foreground/60',
      )}
    >
      {validated.title}
    </p>
    {#if validated.descriptionSnippet}
      <div class="max-w-64 text-xs leading-relaxed text-muted-foreground/40">
        {@render validated.descriptionSnippet()}
      </div>
    {:else if validated.description}
      <p class="max-w-xs text-xs leading-relaxed text-muted-foreground/40">
        {validated.description}
      </p>
    {/if}
  </div>
  {#if validated.actionLabel && validated.onaction}
    <button
      type="button"
      onclick={validated.onaction}
      class="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {validated.actionLabel}
    </button>
  {/if}
</div>
