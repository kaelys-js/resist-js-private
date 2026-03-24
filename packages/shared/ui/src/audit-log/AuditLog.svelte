<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AuditLogPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AuditLogProps = v.InferOutput<typeof AuditLogPropsSchema>;
</script>

<script lang="ts">
  /**
   * AuditLog — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AuditLog />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AuditLogProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AuditLogProps = $derived.by(() => {
    const rawProps: AuditLogProps = stripSvelteProps(allProps);
    const result = safeParse(AuditLogPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AuditLogProps;
  });
</script>

<div data-slot="audit-log" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
