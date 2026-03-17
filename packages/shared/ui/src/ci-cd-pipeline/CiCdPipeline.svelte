<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CiCdPipelinePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CiCdPipelineProps = v.InferOutput<typeof CiCdPipelinePropsSchema>;
</script>

<script lang="ts">
  /**
   * CiCdPipeline — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CiCdPipeline />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CiCdPipelineProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CiCdPipelineProps = $derived.by(() => {
    const rawProps: CiCdPipelineProps = stripSvelteProps(allProps);
    const result = safeParse(CiCdPipelinePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CiCdPipelineProps;
  });
</script>

<div data-slot="ci-cd-pipeline" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
