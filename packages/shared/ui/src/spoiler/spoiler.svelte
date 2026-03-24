<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpoilerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SpoilerProps = v.InferOutput<typeof SpoilerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Spoiler — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Spoiler />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpoilerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpoilerProps = $derived.by(() => {
    const rawProps: SpoilerProps = stripSvelteProps(allProps);
    const result = safeParse(SpoilerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpoilerProps;
  });
</script>

<div data-slot="spoiler" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
