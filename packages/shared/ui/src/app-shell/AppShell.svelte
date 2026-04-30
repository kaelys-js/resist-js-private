<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AppShell — sidebar-plus-header scaffold layout for full
   * applications. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AppShellPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AppShell. */
  export type AppShellProps = v.InferOutput<typeof AppShellPropsSchema>;
</script>

<script lang="ts">
  /**
   * AppShell — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AppShell />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AppShellProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AppShellProps = $derived.by(() => {
    const rawProps: AppShellProps = stripSvelteProps(allProps);
    const result = safeParse(AppShellPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AppShellProps;
  });
</script>

<div data-slot="app-shell" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
