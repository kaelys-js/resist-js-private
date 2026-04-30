<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PreferencesPane Svelte component — settings preferences
   * panel. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PreferencesPanePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PreferencesPane. */
  export type PreferencesPaneProps = v.InferOutput<typeof PreferencesPanePropsSchema>;
</script>

<script lang="ts">
  /**
   * PreferencesPane — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PreferencesPane />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PreferencesPaneProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PreferencesPaneProps = $derived.by(() => {
    const rawProps: PreferencesPaneProps = stripSvelteProps(allProps);
    const result = safeParse(PreferencesPanePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PreferencesPaneProps;
  });
</script>

<div data-slot="preferences-pane" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
