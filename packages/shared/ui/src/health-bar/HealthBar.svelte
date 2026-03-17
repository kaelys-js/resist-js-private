<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HealthBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type HealthBarProps = v.InferOutput<typeof HealthBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * HealthBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HealthBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HealthBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HealthBarProps = $derived.by(() => {
    const rawProps: HealthBarProps = stripSvelteProps(allProps);
    const result = safeParse(HealthBarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HealthBarProps;
  });
</script>

<div data-slot="health-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
