<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ParticlesBgPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ParticlesBgProps = v.InferOutput<typeof ParticlesBgPropsSchema>;
</script>

<script lang="ts">
  /**
   * ParticlesBg — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ParticlesBg />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ParticlesBgProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ParticlesBgProps = $derived.by(() => {
    const rawProps: ParticlesBgProps = stripSvelteProps(allProps);
    const result = safeParse(ParticlesBgPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ParticlesBgProps;
  });
</script>

<div data-slot="particles-bg" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
