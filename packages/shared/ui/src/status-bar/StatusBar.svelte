<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * StatusBar Svelte component — OS-style bottom status bar
   * showing icons, breadcrumbs, and live counters.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StatusBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StatusBar. */
  export type StatusBarProps = v.InferOutput<typeof StatusBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * StatusBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StatusBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StatusBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StatusBarProps = $derived.by(() => {
    const rawProps: StatusBarProps = stripSvelteProps(allProps);
    const result = safeParse(StatusBarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StatusBarProps;
  });
</script>

<div data-slot="status-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
