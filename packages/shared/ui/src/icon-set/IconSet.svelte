<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * IconSet Svelte component — icon collection browser /
   * picker for selecting from a curated set. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IconSetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for IconSet. */
  export type IconSetProps = v.InferOutput<typeof IconSetPropsSchema>;
</script>

<script lang="ts">
  /**
   * IconSet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IconSet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IconSetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IconSetProps = $derived.by(() => {
    const rawProps: IconSetProps = stripSvelteProps(allProps);
    const result = safeParse(IconSetPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IconSetProps;
  });
</script>

<div data-slot="icon-set" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
