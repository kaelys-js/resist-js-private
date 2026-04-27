<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ResourceCalendarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ResourceCalendar. */
  export type ResourceCalendarProps = v.InferOutput<typeof ResourceCalendarPropsSchema>;
</script>

<script lang="ts">
  /**
   * ResourceCalendar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ResourceCalendar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ResourceCalendarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ResourceCalendarProps = $derived.by(() => {
    const rawProps: ResourceCalendarProps = stripSvelteProps(allProps);
    const result = safeParse(ResourceCalendarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ResourceCalendarProps;
  });
</script>

<div data-slot="resource-calendar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
