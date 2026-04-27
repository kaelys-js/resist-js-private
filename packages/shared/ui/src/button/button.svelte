<!-- @convert-to-lens -->
<script lang="ts" module>
  /**
   * Button root — clickable button with multiple style variants
   * and sizes. Re-exports `buttonVariants` plus the
   * `ButtonVariant` / `ButtonSize` / `ButtonProps` types from
   * `./types.ts` so `button/index.ts` can use standard TS module
   * resolution.
   *
   * @module
   */

  /* Public types and the `buttonVariants` value live in `./types.ts` so
     that `button/index.ts` can re-export them via standard TS module
     resolution (avoiding the wildcard `*.svelte` ambient declaration). */
  export {
    buttonVariants,
    type ButtonVariant,
    type ButtonSize,
    type ButtonProps,
  } from './types.js';
</script>

<script lang="ts">
  /**
   * Interactive button supporting multiple style variants and sizes.
   *
   * Renders as a `<button>` by default or as an `<a>` when href is provided. Disabled anchors
   * receive `aria-disabled` instead of the native disabled attribute for proper accessibility.
   */
  import { cn } from '../utils.js';
  import { buttonVariants, type ButtonProps } from './types.js';

  let {
    /** Additional CSS classes to apply. */
    class: className,
    /** The visual style variant. */
    variant = 'default',
    /** The size preset. */
    size = 'default',
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** When set, renders as an anchor element instead of a button. */
    href,
    /** The HTML button type attribute. @values button, submit, reset */
    type = 'button',
    /** When true, the button is non-interactive. */
    disabled,
    /** The button content. */
    children,
    ...restProps
  }: ButtonProps = $props();
</script>

{#if href}
  <a
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    {...restProps}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {disabled}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
