<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ClassSchedulePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ClassSchedule. */
  export type ClassScheduleProps = v.InferOutput<typeof ClassSchedulePropsSchema>;
</script>

<script lang="ts">
  /**
   * ClassSchedule — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ClassSchedule />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ClassScheduleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ClassScheduleProps = $derived.by(() => {
    const rawProps: ClassScheduleProps = stripSvelteProps(allProps);
    const result = safeParse(ClassSchedulePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ClassScheduleProps;
  });
</script>

<div data-slot="class-schedule" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
