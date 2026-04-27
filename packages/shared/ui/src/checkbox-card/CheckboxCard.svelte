<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CheckboxCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CheckboxCard. */
  export type CheckboxCardProps = v.InferOutput<typeof CheckboxCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * CheckboxCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CheckboxCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CheckboxCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CheckboxCardProps = $derived.by(() => {
    const rawProps: CheckboxCardProps = stripSvelteProps(allProps);
    const result = safeParse(CheckboxCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CheckboxCardProps;
  });
</script>

<div data-slot="checkbox-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
