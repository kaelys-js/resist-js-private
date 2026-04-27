<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SocialProofPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SocialProof. */
  export type SocialProofProps = v.InferOutput<typeof SocialProofPropsSchema>;
</script>

<script lang="ts">
  /**
   * SocialProof — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SocialProof />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SocialProofProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SocialProofProps = $derived.by(() => {
    const rawProps: SocialProofProps = stripSvelteProps(allProps);
    const result = safeParse(SocialProofPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SocialProofProps;
  });
</script>

<div data-slot="social-proof" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
