<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SettingsSectionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SettingsSectionProps = v.InferOutput<typeof SettingsSectionPropsSchema>;
</script>

<script lang="ts">
  /**
   * SettingsSection — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SettingsSection />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SettingsSectionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SettingsSectionProps = $derived.by(() => {
    const rawProps: SettingsSectionProps = stripSvelteProps(allProps);
    const result = safeParse(SettingsSectionPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SettingsSectionProps;
  });
</script>

<div data-slot="settings-section" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
