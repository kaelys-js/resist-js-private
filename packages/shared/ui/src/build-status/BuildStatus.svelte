<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BuildStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BuildStatusProps = v.InferOutput<typeof BuildStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * BuildStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BuildStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BuildStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BuildStatusProps = $derived.by(() => {
    const rawProps: BuildStatusProps = stripSvelteProps(allProps);
    const result = safeParse(BuildStatusPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BuildStatusProps;
  });
</script>

<div data-slot="build-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
