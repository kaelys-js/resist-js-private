<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TieredMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TieredMenuProps = v.InferOutput<typeof TieredMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * TieredMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TieredMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TieredMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TieredMenuProps = $derived.by(() => {
    const rawProps: TieredMenuProps = stripSvelteProps(allProps);
    const result = safeParse(TieredMenuPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TieredMenuProps;
  });
</script>

<div data-slot="tiered-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
