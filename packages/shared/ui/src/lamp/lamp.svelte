<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Lamp Svelte component — animated light-beam glow effect
   * (e.g. spotlight backdrop). Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LampPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Lamp. */
  export type LampProps = v.InferOutput<typeof LampPropsSchema>;
</script>

<script lang="ts">
  /**
   * Lamp — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Lamp />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LampProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LampProps = $derived.by(() => {
    const rawProps: LampProps = stripSvelteProps(allProps);
    const result = safeParse(LampPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LampProps;
  });
</script>

<div data-slot="lamp" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
