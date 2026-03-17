<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WizardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type WizardProps = v.InferOutput<typeof WizardPropsSchema>;
</script>

<script lang="ts">
  /**
   * Wizard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Wizard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WizardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WizardProps = $derived.by(() => {
    const rawProps: WizardProps = stripSvelteProps(allProps);
    const result = safeParse(WizardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WizardProps;
  });
</script>

<div data-slot="wizard" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
