<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LightboxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LightboxProps = v.InferOutput<typeof LightboxPropsSchema>;
</script>

<script lang="ts">
  /**
   * Lightbox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Lightbox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LightboxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LightboxProps = $derived.by(() => {
    const rawProps: LightboxProps = stripSvelteProps(allProps);
    const result = safeParse(LightboxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LightboxProps;
  });
</script>

<div data-slot="lightbox" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
