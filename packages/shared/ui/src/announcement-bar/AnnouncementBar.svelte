<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnnouncementBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnnouncementBar. */
  export type AnnouncementBarProps = v.InferOutput<typeof AnnouncementBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnnouncementBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnnouncementBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnnouncementBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnnouncementBarProps = $derived.by(() => {
    const rawProps: AnnouncementBarProps = stripSvelteProps(allProps);
    const result = safeParse(AnnouncementBarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnnouncementBarProps;
  });
</script>

<div data-slot="announcement-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
