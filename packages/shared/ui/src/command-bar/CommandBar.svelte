<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CommandBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CommandBar. */
  export type CommandBarProps = v.InferOutput<typeof CommandBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * CommandBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CommandBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CommandBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CommandBarProps = $derived.by(() => {
    const rawProps: CommandBarProps = stripSvelteProps(allProps);
    const result = safeParse(CommandBarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CommandBarProps;
  });
</script>

<div data-slot="command-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
