<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UpgradePromptPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for UpgradePrompt. */
  export type UpgradePromptProps = v.InferOutput<typeof UpgradePromptPropsSchema>;
</script>

<script lang="ts">
  /**
   * UpgradePrompt — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UpgradePrompt />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UpgradePromptProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UpgradePromptProps = $derived.by(() => {
    const rawProps: UpgradePromptProps = stripSvelteProps(allProps);
    const result = safeParse(UpgradePromptPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UpgradePromptProps;
  });
</script>

<div data-slot="upgrade-prompt" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
