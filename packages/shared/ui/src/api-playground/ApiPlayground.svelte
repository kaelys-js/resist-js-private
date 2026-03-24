<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ApiPlaygroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ApiPlaygroundProps = v.InferOutput<typeof ApiPlaygroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * ApiPlayground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ApiPlayground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ApiPlaygroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ApiPlaygroundProps = $derived.by(() => {
    const rawProps: ApiPlaygroundProps = stripSvelteProps(allProps);
    const result = safeParse(ApiPlaygroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ApiPlaygroundProps;
  });
</script>

<div data-slot="api-playground" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
