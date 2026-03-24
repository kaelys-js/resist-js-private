<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WeekViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type WeekViewProps = v.InferOutput<typeof WeekViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * WeekView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WeekView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WeekViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WeekViewProps = $derived.by(() => {
    const rawProps: WeekViewProps = stripSvelteProps(allProps);
    const result = safeParse(WeekViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WeekViewProps;
  });
</script>

<div data-slot="week-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
