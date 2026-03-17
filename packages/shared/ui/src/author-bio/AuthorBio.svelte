<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AuthorBioPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AuthorBioProps = v.InferOutput<typeof AuthorBioPropsSchema>;
</script>

<script lang="ts">
  /**
   * AuthorBio — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AuthorBio />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AuthorBioProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AuthorBioProps = $derived.by(() => {
    const rawProps: AuthorBioProps = stripSvelteProps(allProps);
    const result = safeParse(AuthorBioPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AuthorBioProps;
  });
</script>

<div data-slot="author-bio" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
