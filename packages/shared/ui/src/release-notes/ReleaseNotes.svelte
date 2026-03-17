<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReleaseNotesPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ReleaseNotesProps = v.InferOutput<typeof ReleaseNotesPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReleaseNotes — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReleaseNotes />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReleaseNotesProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReleaseNotesProps = $derived.by(() => {
    const rawProps: ReleaseNotesProps = stripSvelteProps(allProps);
    const result = safeParse(ReleaseNotesPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReleaseNotesProps;
  });
</script>

<div data-slot="release-notes" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
