<script lang="ts" module>
  /* Public types/values live in `./types.ts` so `badge/index.ts` can re-export
     them via standard TS module resolution (avoiding the wildcard `*.svelte`
     ambient declaration). */
  export {
    badgeVariants,
    BadgePropsSchema,
    type BadgeVariant,
    type BadgeSize,
    type BadgeRadius,
    type BadgeInputProps,
    type BadgeProps,
  } from './types.js';
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
  import {
    badgeVariants,
    BadgePropsSchema,
    type BadgeInputProps,
    type BadgeProps,
  } from './types.js';

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
    if (!result.ok) {
      throw result.error;
    }
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
