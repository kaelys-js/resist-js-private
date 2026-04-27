<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PlaylistPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Playlist. */
  export type PlaylistProps = v.InferOutput<typeof PlaylistPropsSchema>;
</script>

<script lang="ts">
  /**
   * Playlist — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Playlist />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PlaylistProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PlaylistProps = $derived.by(() => {
    const rawProps: PlaylistProps = stripSvelteProps(allProps);
    const result = safeParse(PlaylistPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PlaylistProps;
  });
</script>

<div data-slot="playlist" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
