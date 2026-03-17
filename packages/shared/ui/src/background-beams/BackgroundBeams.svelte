<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BackgroundBeamsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BackgroundBeamsProps = v.InferOutput<typeof BackgroundBeamsPropsSchema>;
</script>

<script lang="ts">
  /**
   * BackgroundBeams — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BackgroundBeams />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BackgroundBeamsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BackgroundBeamsProps = $derived.by(() => {
    const rawProps: BackgroundBeamsProps = stripSvelteProps(allProps);
    const result = safeParse(BackgroundBeamsPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BackgroundBeamsProps;
  });
</script>

<div data-slot="background-beams" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
