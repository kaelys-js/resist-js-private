<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LootDropPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LootDropProps = v.InferOutput<typeof LootDropPropsSchema>;
</script>

<script lang="ts">
  /**
   * LootDrop — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LootDrop />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LootDropProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LootDropProps = $derived.by(() => {
    const rawProps: LootDropProps = stripSvelteProps(allProps);
    const result = safeParse(LootDropPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LootDropProps;
  });
</script>

<div data-slot="loot-drop" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
