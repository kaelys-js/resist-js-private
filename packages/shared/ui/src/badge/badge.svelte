<script lang="ts" module>
  import * as v from 'valibot';
  import type { Snippet } from 'svelte';
  import { type VariantProps, tv } from 'tailwind-variants';
  import { StrSchema, BoolSchema } from '@/schemas/common';

  export const badgeVariants = tv({
    base: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none',
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent',
        secondary:
          'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent',
        destructive:
          'bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 border-transparent text-white',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        success: 'bg-emerald-500 text-white [a&]:hover:bg-emerald-600 border-transparent',
        warning:
          'bg-amber-500 text-white [a&]:hover:bg-amber-600 border-transparent dark:bg-amber-600',
        info: 'bg-blue-500 text-white [a&]:hover:bg-blue-600 border-transparent',
      },
      size: {
        xs: 'px-1 py-0 text-[10px] [&>svg]:size-2.5',
        sm: 'px-2 py-0.5 text-xs [&>svg]:size-3',
        md: 'px-2.5 py-0.5 text-xs [&>svg]:size-3.5',
        lg: 'px-3 py-1 text-sm [&>svg]:size-4',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
      },
      dot: {
        true: 'size-2 p-0 border-0',
        false: '',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
        false: '',
      },
    },
    compoundVariants: [
      { dot: true, variant: 'default', class: 'bg-primary' },
      { dot: true, variant: 'secondary', class: 'bg-secondary-foreground/50' },
      { dot: true, variant: 'destructive', class: 'bg-destructive' },
      { dot: true, variant: 'outline', class: 'bg-foreground border-0' },
      { dot: true, variant: 'success', class: 'bg-emerald-500' },
      { dot: true, variant: 'warning', class: 'bg-amber-500' },
      { dot: true, variant: 'info', class: 'bg-blue-500' },
      { dot: true, size: 'xs', class: 'size-1.5' },
      { dot: true, size: 'sm', class: 'size-2' },
      { dot: true, size: 'md', class: 'size-2.5' },
      { dot: true, size: 'lg', class: 'size-3' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      radius: 'full',
      dot: false,
      disabled: false,
    },
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
  export type BadgeSize = VariantProps<typeof badgeVariants>['size'];
  export type BadgeRadius = VariantProps<typeof badgeVariants>['radius'];

  export const BadgePropsSchema = v.strictObject({
    /** Visual style variant. @values default, secondary, destructive, outline, success, warning, info */
    variant: v.optional(
      v.picklist(['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info']),
      'default',
    ),
    /** Badge size controlling padding and text size. @values xs, sm, md, lg */
    size: v.optional(v.picklist(['xs', 'sm', 'md', 'lg']), 'sm'),
    /** Border radius. @values none, sm, md, lg, full */
    radius: v.optional(v.picklist(['none', 'sm', 'md', 'lg', 'full']), 'full'),
    /** Render as link when URL is provided. @values /components/button, https://example.com */
    href: v.optional(StrSchema),
    /** Render as small dot indicator with no text content. @values true, false */
    dot: v.optional(BoolSchema, false as Bool),
    /** Show a remove/dismiss X button. @values true, false */
    removable: v.optional(BoolSchema, false as Bool),
    /** Disabled state — reduced opacity, no interactions. @values true, false */
    disabled: v.optional(BoolSchema, false as Bool),
    /** Additional CSS classes. @values ml-2, animate-pulse */
    class: v.optional(StrSchema),
    /** Badge text or rich content. @values {#snippet children()}Badge{/snippet} */
    children: v.optional(v.custom<Snippet>(() => true)),
    /** Icon rendered before the badge content. @values {#snippet icon()}<Star class="size-3" />{/snippet} */
    icon: v.optional(v.custom<Snippet>(() => true)),
    /** Callback fired when the remove button is clicked. @values () => removeBadge(id) */
    onRemove: v.optional(v.custom<() => void>(() => true)),
  });
  /** Input props type — all fields optional (for $props). */
  export type BadgeInputProps = v.InferInput<typeof BadgePropsSchema>;
  /** Validated output type — defaults filled in (after safeParse). */
  export type BadgeProps = v.InferOutput<typeof BadgePropsSchema>;
</script>

<script lang="ts">
  /**
   * Badge — small inline label for status indicators, counts, or categories.
   *
   * Consolidates features from shadcn/ui (variant, href), Mantine (size, radius,
   * dot), DaisyUI (success/warning/info variants), Flowbite (removable, icon),
   * Ant Design (dot mode), Material UI (dot), Fluent UI (size scale),
   * HeroUI (dot, disabled), Carbon (removable), and Polaris (icon slot).
   *
   * Renders as `<a>` when `href` is provided, otherwise `<span>`.
   *
   * @example
   * ```svelte
   * <Badge variant="success">Active</Badge>
   * <Badge dot variant="destructive" />
   * <Badge removable onRemove={() => remove(tag)}>Tag</Badge>
   * ```
   */
  import type { Str, Bool } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';
  import X from '@lucide/svelte/icons/x';

  const {
    variant,
    size,
    radius,
    href,
    dot,
    removable,
    disabled,
    class: className,
    children,
    icon,
    onRemove,
    ...restProps
  }: BadgeInputProps = $props();

  /** Validate schema props — fills in defaults via v.optional second arg. */
  const validated: BadgeProps = $derived.by(() => {
    const dataProps: Record<string, unknown> = stripSvelteProps({
      variant,
      size,
      radius,
      href,
      dot,
      removable,
      disabled,
      class: className,
    });
    const result = safeParse(BadgePropsSchema, {
      ...dataProps,
      children,
      icon,
      onRemove,
    });
    if (!result.ok) throw result.error;
    return result.data as BadgeProps;
  });

  /** Whether this badge renders as a link. */
  const isLink: Bool = $derived(Boolean(validated.href) as Bool);

  /** Whether dot mode is active. */
  const isDot: Bool = $derived(validated.dot);

  /** Whether the remove button is shown. */
  const isRemovable: Bool = $derived(
    ((validated.removable as boolean) && !(isDot as boolean)) as Bool,
  );

  /** Resolved variant classes. */
  const variantClass: Str = $derived(
    badgeVariants({
      variant: validated.variant,
      size: validated.size,
      radius: validated.radius,
      dot: isDot,
      disabled: validated.disabled,
    }) as Str,
  );
</script>

<svelte:element
  this={isLink ? 'a' : 'span'}
  data-slot="badge"
  href={isLink ? validated.href : undefined}
  class={cn(variantClass, validated.class)}
  aria-disabled={validated.disabled ? 'true' : undefined}
  aria-label={isDot ? 'Status indicator' : undefined}
  {...restProps}
>
  {#if !isDot}
    {#if validated.icon}
      {@render validated.icon()}
    {/if}
    {@render validated.children?.()}
    {#if isRemovable}
      <button
        type="button"
        class="-mr-0.5 ml-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Remove"
        onclick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          validated.onRemove?.();
        }}
      >
        <X class="size-3" />
      </button>
    {/if}
  {/if}
</svelte:element>
