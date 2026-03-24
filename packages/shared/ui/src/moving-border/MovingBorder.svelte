<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MovingBorderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MovingBorderProps = v.InferOutput<typeof MovingBorderPropsSchema>;
</script>

<script lang="ts">
  /**
   * MovingBorder — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MovingBorder />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MovingBorderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MovingBorderProps = $derived.by(() => {
    const rawProps: MovingBorderProps = stripSvelteProps(allProps);
    const result = safeParse(MovingBorderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MovingBorderProps;
  });
</script>

<div data-slot="moving-border" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
