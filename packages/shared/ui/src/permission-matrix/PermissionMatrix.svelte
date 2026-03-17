<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PermissionMatrixPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PermissionMatrixProps = v.InferOutput<typeof PermissionMatrixPropsSchema>;
</script>

<script lang="ts">
  /**
   * PermissionMatrix — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PermissionMatrix />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PermissionMatrixProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PermissionMatrixProps = $derived.by(() => {
    const rawProps: PermissionMatrixProps = stripSvelteProps(allProps);
    const result = safeParse(PermissionMatrixPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PermissionMatrixProps;
  });
</script>

<div data-slot="permission-matrix" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
