<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SystemStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SystemStatus. */
  export type SystemStatusProps = v.InferOutput<typeof SystemStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * SystemStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SystemStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SystemStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SystemStatusProps = $derived.by(() => {
    const rawProps: SystemStatusProps = stripSvelteProps(allProps);
    const result = safeParse(SystemStatusPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SystemStatusProps;
  });
</script>

<div data-slot="system-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
