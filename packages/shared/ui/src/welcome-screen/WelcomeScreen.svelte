<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WelcomeScreenPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type WelcomeScreenProps = v.InferOutput<typeof WelcomeScreenPropsSchema>;
</script>

<script lang="ts">
  /**
   * WelcomeScreen — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WelcomeScreen />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WelcomeScreenProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WelcomeScreenProps = $derived.by(() => {
    const rawProps: WelcomeScreenProps = stripSvelteProps(allProps);
    const result = safeParse(WelcomeScreenPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WelcomeScreenProps;
  });
</script>

<div data-slot="welcome-screen" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
