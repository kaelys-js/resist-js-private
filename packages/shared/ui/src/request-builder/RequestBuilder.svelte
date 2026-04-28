<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RequestBuilder Svelte component — composes an HTTP
   * request (method, URL, headers, body) for API testing.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RequestBuilderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RequestBuilder. */
  export type RequestBuilderProps = v.InferOutput<typeof RequestBuilderPropsSchema>;
</script>

<script lang="ts">
  /**
   * RequestBuilder — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RequestBuilder />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RequestBuilderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RequestBuilderProps = $derived.by(() => {
    const rawProps: RequestBuilderProps = stripSvelteProps(allProps);
    const result = safeParse(RequestBuilderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RequestBuilderProps;
  });
</script>

<div data-slot="request-builder" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
