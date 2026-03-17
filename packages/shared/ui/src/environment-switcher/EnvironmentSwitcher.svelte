<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EnvironmentSwitcherPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type EnvironmentSwitcherProps = v.InferOutput<typeof EnvironmentSwitcherPropsSchema>;
</script>

<script lang="ts">
  /**
   * EnvironmentSwitcher — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EnvironmentSwitcher />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EnvironmentSwitcherProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EnvironmentSwitcherProps = $derived.by(() => {
    const rawProps: EnvironmentSwitcherProps = stripSvelteProps(allProps);
    const result = safeParse(EnvironmentSwitcherPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EnvironmentSwitcherProps;
  });
</script>

<div data-slot="environment-switcher" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
