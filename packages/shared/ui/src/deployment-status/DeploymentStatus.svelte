<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DeploymentStatus — deployment health / status display.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DeploymentStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DeploymentStatus. */
  export type DeploymentStatusProps = v.InferOutput<typeof DeploymentStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * DeploymentStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DeploymentStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DeploymentStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DeploymentStatusProps = $derived.by(() => {
    const rawProps: DeploymentStatusProps = stripSvelteProps(allProps);
    const result = safeParse(DeploymentStatusPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DeploymentStatusProps;
  });
</script>

<div data-slot="deployment-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
