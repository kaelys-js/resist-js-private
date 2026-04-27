<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ChannelList — chat channel / room list sidebar. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChannelListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ChannelList. */
  export type ChannelListProps = v.InferOutput<typeof ChannelListPropsSchema>;
</script>

<script lang="ts">
  /**
   * ChannelList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChannelList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChannelListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChannelListProps = $derived.by(() => {
    const rawProps: ChannelListProps = stripSvelteProps(allProps);
    const result = safeParse(ChannelListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChannelListProps;
  });
</script>

<div data-slot="channel-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
