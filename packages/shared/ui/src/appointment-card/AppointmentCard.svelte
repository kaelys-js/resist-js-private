<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AppointmentCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AppointmentCard. */
  export type AppointmentCardProps = v.InferOutput<typeof AppointmentCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * AppointmentCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AppointmentCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AppointmentCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AppointmentCardProps = $derived.by(() => {
    const rawProps: AppointmentCardProps = stripSvelteProps(allProps);
    const result = safeParse(AppointmentCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AppointmentCardProps;
  });
</script>

<div data-slot="appointment-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
