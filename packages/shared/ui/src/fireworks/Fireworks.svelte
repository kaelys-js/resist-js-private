<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FireworksPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Fireworks. */
  export type FireworksProps = v.InferOutput<typeof FireworksPropsSchema>;
</script>

<script lang="ts">
  /**
   * Fireworks — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Fireworks />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FireworksProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FireworksProps = $derived.by(() => {
    const rawProps: FireworksProps = stripSvelteProps(allProps);
    const result = safeParse(FireworksPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FireworksProps;
  });
</script>

<div data-slot="fireworks" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
