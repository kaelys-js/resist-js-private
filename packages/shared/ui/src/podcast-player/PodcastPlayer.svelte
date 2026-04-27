<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PodcastPlayerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PodcastPlayer. */
  export type PodcastPlayerProps = v.InferOutput<typeof PodcastPlayerPropsSchema>;
</script>

<script lang="ts">
  /**
   * PodcastPlayer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PodcastPlayer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PodcastPlayerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PodcastPlayerProps = $derived.by(() => {
    const rawProps: PodcastPlayerProps = stripSvelteProps(allProps);
    const result = safeParse(PodcastPlayerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PodcastPlayerProps;
  });
</script>

<div data-slot="podcast-player" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
