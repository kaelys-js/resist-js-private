<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Taskbar Svelte component — Windows-style taskbar with
   * pinned and active app icons. Placeholder shell awaiting
   * full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TaskbarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Taskbar. */
  export type TaskbarProps = v.InferOutput<typeof TaskbarPropsSchema>;
</script>

<script lang="ts">
  /**
   * Taskbar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Taskbar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TaskbarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TaskbarProps = $derived.by(() => {
    const rawProps: TaskbarProps = stripSvelteProps(allProps);
    const result = safeParse(TaskbarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TaskbarProps;
  });
</script>

<div data-slot="taskbar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
