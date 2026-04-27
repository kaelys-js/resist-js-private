<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CursorPresence — multiplayer cursor presence indicator
   * (Figma-style). Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CursorPresencePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CursorPresence. */
  export type CursorPresenceProps = v.InferOutput<typeof CursorPresencePropsSchema>;
</script>

<script lang="ts">
  /**
   * CursorPresence — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CursorPresence />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CursorPresenceProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CursorPresenceProps = $derived.by(() => {
    const rawProps: CursorPresenceProps = stripSvelteProps(allProps);
    const result = safeParse(CursorPresencePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CursorPresenceProps;
  });
</script>

<div data-slot="cursor-presence" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
