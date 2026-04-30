<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ProfileHeader Svelte component — hero banner header with
   * avatar, display name, and short bio for a user profile
   * page. Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProfileHeaderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ProfileHeader. */
  export type ProfileHeaderProps = v.InferOutput<typeof ProfileHeaderPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProfileHeader — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProfileHeader />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProfileHeaderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProfileHeaderProps = $derived.by(() => {
    const rawProps: ProfileHeaderProps = stripSvelteProps(allProps);
    const result = safeParse(ProfileHeaderPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProfileHeaderProps;
  });
</script>

<div data-slot="profile-header" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
