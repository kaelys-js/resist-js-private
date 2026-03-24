<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MagicCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MagicCardProps = v.InferOutput<typeof MagicCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * MagicCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MagicCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MagicCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MagicCardProps = $derived.by(() => {
    const rawProps: MagicCardProps = stripSvelteProps(allProps);
    const result = safeParse(MagicCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MagicCardProps;
  });
</script>

<div data-slot="magic-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
