<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TypographyPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TypographyProps = v.InferOutput<typeof TypographyPropsSchema>;
</script>

<script lang="ts">
  /**
   * Typography — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Typography />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TypographyProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TypographyProps = $derived.by(() => {
    const rawProps: TypographyProps = stripSvelteProps(allProps);
    const result = safeParse(TypographyPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TypographyProps;
  });
</script>

<div data-slot="typography" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
