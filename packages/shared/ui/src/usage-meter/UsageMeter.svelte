<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UsageMeterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type UsageMeterProps = v.InferOutput<typeof UsageMeterPropsSchema>;
</script>

<script lang="ts">
  /**
   * UsageMeter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UsageMeter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UsageMeterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UsageMeterProps = $derived.by(() => {
    const rawProps: UsageMeterProps = stripSvelteProps(allProps);
    const result = safeParse(UsageMeterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UsageMeterProps;
  });
</script>

<div data-slot="usage-meter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
