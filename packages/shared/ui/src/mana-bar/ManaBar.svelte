<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ManaBar Svelte component — RPG mana / energy resource
   * bar. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ManaBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ManaBar. */
  export type ManaBarProps = v.InferOutput<typeof ManaBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * ManaBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ManaBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ManaBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ManaBarProps = $derived.by(() => {
    const rawProps: ManaBarProps = stripSvelteProps(allProps);
    const result = safeParse(ManaBarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ManaBarProps;
  });
</script>

<div data-slot="mana-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
