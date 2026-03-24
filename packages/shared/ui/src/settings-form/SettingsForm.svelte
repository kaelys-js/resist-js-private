<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SettingsFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SettingsFormProps = v.InferOutput<typeof SettingsFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * SettingsForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SettingsForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SettingsFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SettingsFormProps = $derived.by(() => {
    const rawProps: SettingsFormProps = stripSvelteProps(allProps);
    const result = safeParse(SettingsFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SettingsFormProps;
  });
</script>

<div data-slot="settings-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
