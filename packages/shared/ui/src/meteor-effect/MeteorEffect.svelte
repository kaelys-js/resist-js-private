<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MeteorEffect Svelte component — animated meteor / streak
   * particle effect. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MeteorEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MeteorEffect. */
  export type MeteorEffectProps = v.InferOutput<typeof MeteorEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * MeteorEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MeteorEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MeteorEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MeteorEffectProps = $derived.by(() => {
    const rawProps: MeteorEffectProps = stripSvelteProps(allProps);
    const result = safeParse(MeteorEffectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MeteorEffectProps;
  });
</script>

<div data-slot="meteor-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
