<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PersonaPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Persona. */
  export type PersonaProps = v.InferOutput<typeof PersonaPropsSchema>;
</script>

<script lang="ts">
  /**
   * Persona — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Persona />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PersonaProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PersonaProps = $derived.by(() => {
    const rawProps: PersonaProps = stripSvelteProps(allProps);
    const result = safeParse(PersonaPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PersonaProps;
  });
</script>

<div data-slot="persona" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
