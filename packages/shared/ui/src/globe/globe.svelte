<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GlobePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GlobeProps = v.InferOutput<typeof GlobePropsSchema>;
</script>

<script lang="ts">
  /**
   * Globe — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Globe />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GlobeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GlobeProps = $derived.by(() => {
    const rawProps: GlobeProps = stripSvelteProps(allProps);
    const result = safeParse(GlobePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GlobeProps;
  });
</script>

<div data-slot="globe" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
