<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DamageNumberPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DamageNumberProps = v.InferOutput<typeof DamageNumberPropsSchema>;
</script>

<script lang="ts">
  /**
   * DamageNumber — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DamageNumber />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DamageNumberProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DamageNumberProps = $derived.by(() => {
    const rawProps: DamageNumberProps = stripSvelteProps(allProps);
    const result = safeParse(DamageNumberPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DamageNumberProps;
  });
</script>

<div data-slot="damage-number" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
