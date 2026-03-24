<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OrbitPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type OrbitProps = v.InferOutput<typeof OrbitPropsSchema>;
</script>

<script lang="ts">
  /**
   * Orbit — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Orbit />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OrbitProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OrbitProps = $derived.by(() => {
    const rawProps: OrbitProps = stripSvelteProps(allProps);
    const result = safeParse(OrbitPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OrbitProps;
  });
</script>

<div data-slot="orbit" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
