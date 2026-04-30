<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ConfigProvider — context provider for global app config
   * (locale / theme / direction). Placeholder shell awaiting
   * full implementation; ships with a `class` prop for
   * root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConfigProviderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ConfigProvider. */
  export type ConfigProviderProps = v.InferOutput<typeof ConfigProviderPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConfigProvider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConfigProvider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConfigProviderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConfigProviderProps = $derived.by(() => {
    const rawProps: ConfigProviderProps = stripSvelteProps(allProps);
    const result = safeParse(ConfigProviderPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConfigProviderProps;
  });
</script>

<div data-slot="config-provider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
