<script lang="ts" module>
  import * as v from 'valibot';
  import type { Snippet } from 'svelte';
  import { type VariantProps, tv } from 'tailwind-variants';
  import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';

  export const avatarVariants = tv({
    base: 'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
    variants: {
      size: {
        xs: 'size-6 text-[10px] [&>svg]:size-3',
        sm: 'size-8 text-xs [&>svg]:size-4',
        md: 'size-10 text-sm [&>svg]:size-5',
        lg: 'size-12 text-base [&>svg]:size-6',
        xl: 'size-14 text-lg [&>svg]:size-7',
        '2xl': 'size-16 text-xl [&>svg]:size-8',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-none',
        rounded: 'rounded-lg',
      },
      variant: {
        default: 'bg-muted text-muted-foreground',
        solid: 'bg-primary text-primary-foreground',
        soft: 'bg-primary/10 text-primary',
        outlined: 'border-2 border-border bg-transparent text-foreground',
        plain: 'bg-transparent text-foreground',
      },
      color: {
        default: '',
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-emerald-500 text-white',
        warning: 'bg-amber-500 text-white',
        destructive: 'bg-destructive text-white',
        muted: 'bg-muted text-muted-foreground',
      },
      isBordered: {
        true: 'ring-2 ring-offset-2 ring-offset-background ring-primary',
        false: '',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
      variant: 'default',
      color: 'default',
      isBordered: false,
      disabled: false,
    },
  });

  export type AvatarSize = VariantProps<typeof avatarVariants>['size'];
  export type AvatarShape = VariantProps<typeof avatarVariants>['shape'];
  export type AvatarVariant = VariantProps<typeof avatarVariants>['variant'];

  export const AvatarPropsSchema = v.strictObject({
    /** Image source URL. @values https://i.pravatar.cc/150, /images/user.jpg */
    src: v.optional(StrSchema),
    /** Image alt text for accessibility. @values User avatar, Profile picture */
    alt: v.optional(StrSchema, '' as Str),
    /** User name for automatic initials fallback. @values John Doe, Jane Smith */
    name: v.optional(StrSchema),
    /** Avatar size. @values xs, sm, md, lg, xl, 2xl */
    size: v.optional(v.picklist(['xs', 'sm', 'md', 'lg', 'xl', '2xl']), 'md'),
    /** Avatar shape. @values circle, square, rounded */
    shape: v.optional(v.picklist(['circle', 'square', 'rounded']), 'circle'),
    /** Visual style variant. @values default, solid, soft, outlined, plain */
    variant: v.optional(v.picklist(['default', 'solid', 'soft', 'outlined', 'plain']), 'default'),
    /** Fallback background color. @values default, primary, secondary, success, warning, destructive, muted */
    color: v.optional(
      v.picklist(['default', 'primary', 'secondary', 'success', 'warning', 'destructive', 'muted']),
      'default',
    ),
    /** Show ring/border around avatar. @values true, false */
    isBordered: v.optional(BoolSchema, false as Bool),
    /** Force fallback display, skip image loading. @values true, false */
    showFallback: v.optional(BoolSchema, false as Bool),
    /** Delay in ms before showing fallback. @values 600, 1000, 2000 */
    delayMs: v.optional(NumSchema),
    /** Border radius override. @values none, sm, md, lg, full */
    radius: v.optional(v.picklist(['none', 'sm', 'md', 'lg', 'full']), 'full'),
    /** Disabled/dimmed state. @values true, false */
    disabled: v.optional(BoolSchema, false as Bool),
    /** Online status indicator. @values active, inactive, unset */
    active: v.optional(v.picklist(['active', 'inactive', 'unset']), 'unset'),
    /** Custom fallback icon snippet. @values {#snippet icon()}<User class="size-5" />{/snippet} */
    icon: v.optional(v.custom<Snippet>(() => true)),
    /** Custom fallback content snippet. @values {#snippet fallback()}AB{/snippet} */
    fallback: v.optional(v.custom<Snippet>(() => true)),
    /** Badge/status overlay snippet. @values {#snippet badge()}<span class="size-3 bg-green-500 rounded-full" />{/snippet} */
    badge: v.optional(v.custom<Snippet>(() => true)),
    /** Content override. @values {#snippet children()}<img src="..." />{/snippet} */
    children: v.optional(v.custom<Snippet>(() => true)),
    /** Additional CSS classes. @values ring-2, shadow-lg */
    class: v.optional(StrSchema),
  });

  /** Input props — all optional (for $props). */
  export type AvatarInputProps = v.InferInput<typeof AvatarPropsSchema>;
  /** Validated output — defaults filled in (after safeParse). */
  export type AvatarProps = v.InferOutput<typeof AvatarPropsSchema>;
</script>

<script lang="ts">
  /**
   * Avatar — user profile image with automatic initials fallback, status
   * indicators, size/shape/color variants, and badge overlay.
   *
   * Consolidates features from Radix/Bits UI (image load tracking, delay),
   * Mantine (size, radius, color, initials), Chakra UI (name, size, icon),
   * MUI (variant, children, imgProps), HeroUI (isBordered, showFallback,
   * color), Fluent UI (active status, shape), Ant Design (icon, badge),
   * Joy UI (variant), DaisyUI (mask shapes), Flowbite (dot indicator),
   * Carbon (size scale), Polaris (initials), Primer (size, square),
   * Atlassian (size, appearance), Gestalt (name, size), Base Web (overrides).
   *
   * Wraps the Bits UI Avatar primitive for image load state management.
   *
   * @example
   * ```svelte
   * <Avatar src="/user.jpg" alt="John Doe" />
   * <Avatar name="Jane Smith" size="lg" color="primary" />
   * <Avatar shape="square" variant="outlined" isBordered />
   * ```
   */
  import type { Str, Bool, Num } from '@/schemas/common';
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';
  import User from '@lucide/svelte/icons/user';

  const {
    src,
    alt,
    name,
    size,
    shape,
    variant,
    color,
    isBordered,
    showFallback,
    delayMs,
    radius,
    disabled,
    active,
    icon,
    fallback,
    badge,
    children,
    class: className,
    ...restProps
  }: AvatarInputProps = $props();

  /** Bindable loading status for Bits UI primitive. */
  let loadingStatus: 'loading' | 'loaded' | 'error' = $state('loading');

  /** Validate data props through schema. */
  const validated: AvatarProps = $derived.by(() => {
    const dataProps: Record<string, unknown> = stripSvelteProps({
      src,
      alt,
      name,
      size,
      shape,
      variant,
      color,
      isBordered,
      showFallback,
      delayMs,
      radius,
      disabled,
      active,
      class: className,
    });
    const result = safeParse(AvatarPropsSchema, {
      ...dataProps,
      icon,
      fallback,
      badge,
      children,
    });
    if (!result.ok) throw result.error;
    return result.data as AvatarProps;
  });

  /**
   * Extract 1-2 initials from a name string.
   *
   * @param fullName - The full name to extract initials from
   * @returns 1-2 uppercase initials
   */
  function getInitials(fullName: Str): Str {
    const parts: Str[] = (fullName as string).trim().split(/\s+/) as Str[];
    if (parts.length === 0) return '' as Str;
    if (parts.length === 1) return (parts[0] as string).charAt(0).toUpperCase() as Str;
    return ((parts[0] as string).charAt(0).toUpperCase() +
      (parts.at(-1) as string).charAt(0).toUpperCase()) as Str;
  }

  /** Whether image should be shown (has src and not forcing fallback). */
  const showImage: Bool = $derived(
    (Boolean(validated.src) && !(validated.showFallback as boolean)) as Bool,
  );

  /** Whether to display initials fallback. */
  const showInitials: Bool = $derived(
    (Boolean(validated.name) &&
      (!(showImage as boolean) || (loadingStatus as string) !== 'loaded')) as Bool,
  );

  /** Computed initials string. */
  const initials: Str = $derived(validated.name ? getInitials(validated.name) : ('' as Str));

  /** Resolved variant classes. */
  const variantClass: Str = $derived(
    avatarVariants({
      size: validated.size,
      shape: validated.shape,
      variant: validated.variant,
      color: validated.color,
      isBordered: validated.isBordered,
      disabled: validated.disabled,
    }) as Str,
  );

  /** Status indicator color. */
  const statusColor: Str = $derived.by((): Str => {
    if (validated.active === 'active') return 'bg-emerald-500' as Str;
    if (validated.active === 'inactive') return 'bg-gray-400' as Str;
    return '' as Str;
  });
</script>

<AvatarPrimitive.Root
  bind:loadingStatus
  delayMs={validated.delayMs}
  data-slot="avatar"
  class={cn(variantClass, validated.class)}
  role="img"
  aria-label={validated.alt || validated.name || undefined}
  aria-disabled={validated.disabled ? 'true' : undefined}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    {#if showImage}
      <AvatarPrimitive.Image
        src={validated.src}
        alt={validated.alt}
        data-slot="avatar-image"
        class="aspect-square size-full object-cover"
      />
    {/if}
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      class="flex size-full items-center justify-center"
    >
      {#if fallback}
        {@render fallback()}
      {:else if icon}
        {@render icon()}
      {:else if showInitials}
        <span class="font-medium leading-none">{initials}</span>
      {:else}
        <User class="opacity-60" />
      {/if}
    </AvatarPrimitive.Fallback>
  {/if}

  {#if validated.active !== 'unset'}
    <span
      class="absolute bottom-0 right-0 block size-[25%] rounded-full ring-2 ring-background {statusColor}"
      aria-label={validated.active === 'active' ? 'Online' : 'Offline'}
    ></span>
  {/if}

  {#if badge}
    <span class="absolute -right-0.5 -top-0.5">
      {@render badge()}
    </span>
  {/if}
</AvatarPrimitive.Root>
