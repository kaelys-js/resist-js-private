<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CronEditor — visual cron-expression builder. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CronEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CronEditor. */
  export type CronEditorProps = v.InferOutput<typeof CronEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * CronEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CronEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CronEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CronEditorProps = $derived.by(() => {
    const rawProps: CronEditorProps = stripSvelteProps(allProps);
    const result = safeParse(CronEditorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CronEditorProps;
  });
</script>

<div data-slot="cron-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
