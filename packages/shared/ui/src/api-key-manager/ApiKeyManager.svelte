<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ApiKeyManagerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ApiKeyManagerProps = v.InferOutput<typeof ApiKeyManagerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ApiKeyManager — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ApiKeyManager />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ApiKeyManagerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ApiKeyManagerProps = $derived.by(() => {
    const rawProps: ApiKeyManagerProps = stripSvelteProps(allProps);
    const result = safeParse(ApiKeyManagerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ApiKeyManagerProps;
  });
</script>

<div data-slot="api-key-manager" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
