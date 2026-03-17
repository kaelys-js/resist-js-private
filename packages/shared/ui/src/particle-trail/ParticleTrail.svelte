<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ParticleTrailPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ParticleTrailProps = v.InferOutput<typeof ParticleTrailPropsSchema>;
</script>

<script lang="ts">
  /**
   * ParticleTrail — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ParticleTrail />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ParticleTrailProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ParticleTrailProps = $derived.by(() => {
    const rawProps: ParticleTrailProps = stripSvelteProps(allProps);
    const result = safeParse(ParticleTrailPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ParticleTrailProps;
  });
</script>

<div data-slot="particle-trail" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
