<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Sonner Svelte component — non-blocking toast notification
   * surface (sonner-style) for brief status messages.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SonnerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Sonner. */
  export type SonnerProps = v.InferOutput<typeof SonnerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Sonner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Sonner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SonnerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SonnerProps = $derived.by(() => {
    const rawProps: SonnerProps = stripSvelteProps(allProps);
    const result = safeParse(SonnerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SonnerProps;
  });
</script>

<div data-slot="sonner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
