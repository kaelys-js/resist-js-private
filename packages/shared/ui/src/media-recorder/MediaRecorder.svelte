<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MediaRecorderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MediaRecorderProps = v.InferOutput<typeof MediaRecorderPropsSchema>;
</script>

<script lang="ts">
  /**
   * MediaRecorder — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MediaRecorder />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MediaRecorderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MediaRecorderProps = $derived.by(() => {
    const rawProps: MediaRecorderProps = stripSvelteProps(allProps);
    const result = safeParse(MediaRecorderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MediaRecorderProps;
  });
</script>

<div data-slot="media-recorder" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
