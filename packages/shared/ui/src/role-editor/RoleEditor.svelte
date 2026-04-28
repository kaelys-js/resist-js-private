<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RoleEditor Svelte component — admin form for assigning a
   * permission set to a role with grouped checkboxes.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RoleEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RoleEditor. */
  export type RoleEditorProps = v.InferOutput<typeof RoleEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * RoleEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RoleEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RoleEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RoleEditorProps = $derived.by(() => {
    const rawProps: RoleEditorProps = stripSvelteProps(allProps);
    const result = safeParse(RoleEditorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RoleEditorProps;
  });
</script>

<div data-slot="role-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
