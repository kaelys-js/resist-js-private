<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ShineBorder Svelte component — decorative border with an
   * animated light sweep / shimmer travelling around an
   * element. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ShineBorderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ShineBorder. */
  export type ShineBorderProps = v.InferOutput<typeof ShineBorderPropsSchema>;
</script>

<script lang="ts">
  /**
   * ShineBorder — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ShineBorder />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ShineBorderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ShineBorderProps = $derived.by(() => {
    const rawProps: ShineBorderProps = stripSvelteProps(allProps);
    const result = safeParse(ShineBorderPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ShineBorderProps;
  });
</script>

<div data-slot="shine-border" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
