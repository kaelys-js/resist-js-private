<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AgentStatus — agent thinking / busy indicator for chat-style
   * UIs. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AgentStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AgentStatus. */
  export type AgentStatusProps = v.InferOutput<typeof AgentStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * AgentStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AgentStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AgentStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AgentStatusProps = $derived.by(() => {
    const rawProps: AgentStatusProps = stripSvelteProps(allProps);
    const result = safeParse(AgentStatusPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AgentStatusProps;
  });
</script>

<div data-slot="agent-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
