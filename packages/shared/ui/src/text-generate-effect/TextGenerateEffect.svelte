<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TextGenerateEffect Svelte component — word-by-word text
   * reveal animation. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TextGenerateEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TextGenerateEffect. */
  export type TextGenerateEffectProps = v.InferOutput<typeof TextGenerateEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * TextGenerateEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TextGenerateEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TextGenerateEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TextGenerateEffectProps = $derived.by(() => {
    const rawProps: TextGenerateEffectProps = stripSvelteProps(allProps);
    const result = safeParse(TextGenerateEffectPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TextGenerateEffectProps;
  });
</script>

<div data-slot="text-generate-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
