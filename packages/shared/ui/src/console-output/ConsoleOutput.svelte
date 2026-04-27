<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ConsoleOutput — terminal-style log output panel. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConsoleOutputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ConsoleOutput. */
  export type ConsoleOutputProps = v.InferOutput<typeof ConsoleOutputPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConsoleOutput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConsoleOutput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConsoleOutputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConsoleOutputProps = $derived.by(() => {
    const rawProps: ConsoleOutputProps = stripSvelteProps(allProps);
    const result = safeParse(ConsoleOutputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConsoleOutputProps;
  });
</script>

<div data-slot="console-output" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
