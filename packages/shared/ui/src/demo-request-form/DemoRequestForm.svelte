<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DemoRequestForm — sales demo / contact request form.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DemoRequestFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DemoRequestForm. */
  export type DemoRequestFormProps = v.InferOutput<typeof DemoRequestFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * DemoRequestForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DemoRequestForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DemoRequestFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DemoRequestFormProps = $derived.by(() => {
    const rawProps: DemoRequestFormProps = stripSvelteProps(allProps);
    const result = safeParse(DemoRequestFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DemoRequestFormProps;
  });
</script>

<div data-slot="demo-request-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
