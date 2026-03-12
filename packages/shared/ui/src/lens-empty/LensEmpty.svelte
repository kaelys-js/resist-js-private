<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  export const LensEmptyPropsSchema = v.strictObject({
    /** Primary message text. @values No variants found, No examples yet, Component not found */
    title: StrSchema,
    /** Secondary description text below the title. @values This component has no renderable variants., Add examples to see them here. */
    description: v.optional(StrSchema),
    /** Optional icon snippet — defaults to PackageOpen. @values <div>content</div> */
    icon: v.optional(v.custom<Snippet>((val) => typeof val === 'function')),
    /** Visual variant. @values default, destructive */
    variant: v.optional(v.picklist(['default', 'destructive'])),
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
   * description. Supports a `destructive` variant for error states.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { cn } from '../utils.js';
  import PackageOpen from '@lucide/svelte/icons/package-open';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const allProps: LensEmptyProps = $props();
  const validated: LensEmptyProps = $derived.by(() => {
    const rawProps: LensEmptyProps = stripSvelteProps(allProps);
    const result = safeParse(LensEmptyPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensEmptyProps;
  });
</script>

<div
  class={cn(
    'flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center',
    (validated.variant ?? 'default') === 'destructive'
      ? 'border-destructive/50 bg-destructive/5'
      : 'bg-muted/5',
    validated.class,
  )}
>
  <div
    class={cn(
      'mb-3',
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
  <p
    class={cn(
      'text-sm font-medium',
      (validated.variant ?? 'default') === 'destructive'
        ? 'text-destructive'
        : 'text-muted-foreground',
    )}
  >
    {validated.title}
  </p>
  {#if validated.description}
    <p class="mt-1 max-w-xs text-xs text-muted-foreground/70">{validated.description}</p>
  {/if}
</div>
