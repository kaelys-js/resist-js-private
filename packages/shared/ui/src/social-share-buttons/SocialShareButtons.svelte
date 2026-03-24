<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SocialShareButtonsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SocialShareButtonsProps = v.InferOutput<typeof SocialShareButtonsPropsSchema>;
</script>

<script lang="ts">
  /**
   * SocialShareButtons — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SocialShareButtons />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SocialShareButtonsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SocialShareButtonsProps = $derived.by(() => {
    const rawProps: SocialShareButtonsProps = stripSvelteProps(allProps);
    const result = safeParse(SocialShareButtonsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SocialShareButtonsProps;
  });
</script>

<div data-slot="social-share-buttons" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
