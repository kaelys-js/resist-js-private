<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MaintenancePage Svelte component — full-page "we're under
   * maintenance" landing. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MaintenancePagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MaintenancePage. */
  export type MaintenancePageProps = v.InferOutput<typeof MaintenancePagePropsSchema>;
</script>

<script lang="ts">
  /**
   * MaintenancePage — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MaintenancePage />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MaintenancePageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MaintenancePageProps = $derived.by(() => {
    const rawProps: MaintenancePageProps = stripSvelteProps(allProps);
    const result = safeParse(MaintenancePagePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MaintenancePageProps;
  });
</script>

<div data-slot="maintenance-page" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
