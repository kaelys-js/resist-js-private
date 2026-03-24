<script lang="ts" module>
  import * as v from 'valibot';
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';

  export const avatarGroupVariants = tv({
    base: 'flex items-center',
    variants: {
      spacing: {
        tight: '-space-x-3',
        normal: '-space-x-2',
        loose: '-space-x-1',
      },
      isGrid: {
        true: 'flex-wrap gap-1 space-x-0',
        false: '',
      },
    },
    defaultVariants: {
      spacing: 'normal',
      isGrid: false,
    },
  });

  export const AvatarGroupPropsSchema = v.strictObject({
    /** Maximum visible avatars before showing "+N" overflow. @values 3, 5, 8 */
    max: v.optional(NumSchema),
    /** Total count override for "+N" badge. @values 20, 100 */
    total: v.optional(NumSchema),
    /** Overlap spacing between avatars. @values tight, normal, loose */
    spacing: v.optional(v.picklist(['tight', 'normal', 'loose']), 'normal'),
    /** Display as grid instead of stacked row. @values true, false */
    isGrid: v.optional(BoolSchema, false as Bool),
    /** Show ring on each child avatar. @values true, false */
    isBordered: v.optional(BoolSchema, true as Bool),
    /** Custom "+N" overflow render snippet. @values {#snippet renderCount(count)}{count} more{/snippet} */
    renderCount: v.optional(v.custom<Snippet<[Num]>>(() => true)),
    /** Avatar children. @values {#snippet children()}<Avatar />{/snippet} */
    children: v.optional(v.custom<Snippet>(() => true)),
    /** Additional CSS classes. @values gap-2, p-1 */
    class: v.optional(StrSchema),
  });

  /** Input props — all optional (for $props). */
  export type AvatarGroupInputProps = v.InferInput<typeof AvatarGroupPropsSchema>;
  /** Validated output — defaults filled in (after safeParse). */
  export type AvatarGroupProps = v.InferOutput<typeof AvatarGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * AvatarGroup — stacks multiple Avatar components with overlap, overflow
   * count badge, and optional grid layout.
   *
   * Consolidates features from MUI (max, total, spacing), HeroUI (max,
   * isBordered, isGrid, renderCount), Ant Design (maxCount), Mantine
   * (spacing), Chakra UI (max, spacing), Fluent UI (layout, size),
   * DaisyUI (-space-x stacking), Flowbite (stacked avatars), Primer
   * (AvatarStack), and Base Web (overrides).
   *
   * @example
   * ```svelte
   * <AvatarGroup max={3}>
   *   <Avatar src="/user1.jpg" />
   *   <Avatar src="/user2.jpg" />
   *   <Avatar src="/user3.jpg" />
   *   <Avatar src="/user4.jpg" />
   * </AvatarGroup>
   * ```
   */
  import type { Str, Bool, Num } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  const {
    max,
    total,
    spacing,
    isGrid,
    isBordered,
    renderCount,
    children,
    class: className,
    ...restProps
  }: AvatarGroupInputProps = $props();

  /** Validate data props through schema. */
  const validated: AvatarGroupProps = $derived.by(() => {
    const dataProps: Record<string, unknown> = stripSvelteProps({
      max,
      total,
      spacing,
      isGrid,
      isBordered,
      class: className,
    });
    const result = safeParse(AvatarGroupPropsSchema, {
      ...dataProps,
      renderCount,
      children,
    });
    if (!result.ok) {
      throw result.error;
    }
    return result.data as AvatarGroupProps;
  });

  /** Resolved variant classes. */
  const variantClass: Str = $derived(
    avatarGroupVariants({
      spacing: validated.spacing,
      isGrid: validated.isGrid,
    }) as Str,
  );
</script>

<div
  data-slot="avatar-group"
  role="group"
  aria-label="Avatar group"
  class={cn(variantClass, validated.class)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</div>
