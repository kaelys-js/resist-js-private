<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ModelSelector Svelte component — AI model picker (eg
   * GPT-4 / Claude / Llama). Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ModelSelectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ModelSelector. */
  export type ModelSelectorProps = v.InferOutput<typeof ModelSelectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * ModelSelector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ModelSelector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ModelSelectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ModelSelectorProps = $derived.by(() => {
    const rawProps: ModelSelectorProps = stripSvelteProps(allProps);
    const result = safeParse(ModelSelectorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ModelSelectorProps;
  });
</script>

<div data-slot="model-selector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
