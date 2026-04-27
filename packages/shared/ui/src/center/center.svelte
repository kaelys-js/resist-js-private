<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CenterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Center. */
  export type CenterProps = v.InferOutput<typeof CenterPropsSchema>;
</script>

<script lang="ts">
  /**
   * Center — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Center />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CenterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CenterProps = $derived.by(() => {
    const rawProps: CenterProps = stripSvelteProps(allProps);
    const result = safeParse(CenterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CenterProps;
  });
</script>

<div data-slot="center" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
