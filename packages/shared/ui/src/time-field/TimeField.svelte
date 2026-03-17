<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimeFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TimeFieldProps = v.InferOutput<typeof TimeFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * TimeField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TimeField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimeFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimeFieldProps = $derived.by(() => {
    const rawProps: TimeFieldProps = stripSvelteProps(allProps);
    const result = safeParse(TimeFieldPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimeFieldProps;
  });
</script>

<div data-slot="time-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
