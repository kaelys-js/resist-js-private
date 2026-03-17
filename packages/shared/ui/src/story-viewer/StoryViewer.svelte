<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StoryViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StoryViewerProps = v.InferOutput<typeof StoryViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * StoryViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StoryViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StoryViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StoryViewerProps = $derived.by(() => {
    const rawProps: StoryViewerProps = stripSvelteProps(allProps);
    const result = safeParse(StoryViewerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StoryViewerProps;
  });
</script>

<div data-slot="story-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
