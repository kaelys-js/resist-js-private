<script module lang="ts">
  import * as v from 'valibot';
  import type { Snippet } from 'svelte';
  import { type VariantProps, tv } from 'tailwind-variants';
  import { StrSchema, BoolSchema } from '@/schemas/common';

  /**
   * Platform-aware key symbol mapping.
   * Maps human-readable key names to their standard Unicode symbols.
   */
  export const KEY_SYMBOLS: Record<string, string> = {
    command: '⌘',
    cmd: '⌘',
    shift: 'Shift',
    option: '⌥',
    alt: '⌥',
    ctrl: '⌃',
    control: '⌃',
    enter: '↵',
    return: '↵',
    delete: '⌫',
    backspace: '⌫',
    escape: '⎋',
    esc: '⎋',
    tab: '⇥',
    capslock: '⇪',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    pageup: '⇞',
    pagedown: '⇟',
    home: '↖',
    end: '↘',
    space: '␣',
    fn: 'Fn',
  };

  export const kbdVariants = tv({
    base: 'inline-flex items-center font-mono leading-none',
    variants: {
      variant: {
        default: 'rounded border border-border bg-secondary text-muted-foreground shadow-sm',
        outline: 'rounded border border-border text-muted-foreground',
        ghost: 'text-muted-foreground',
        solid: 'rounded bg-muted text-muted-foreground',
      },
      size: {
        xs: 'px-1 py-0.5 text-[10px]',
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-2.5 py-1 text-sm',
        xl: 'px-3 py-1.5 text-sm',
      },
      color: {
        default: '',
        primary: '',
        secondary: '',
        muted: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        color: 'primary',
        class: 'border-primary/30 bg-primary/10 text-primary',
      },
      {
        variant: 'default',
        color: 'secondary',
        class: 'border-secondary bg-secondary text-secondary-foreground',
      },
      {
        variant: 'default',
        color: 'muted',
        class: 'border-muted-foreground/20 bg-muted text-muted-foreground',
      },
      { variant: 'outline', color: 'primary', class: 'border-primary/30 text-primary' },
      {
        variant: 'outline',
        color: 'secondary',
        class: 'border-secondary text-secondary-foreground',
      },
      {
        variant: 'outline',
        color: 'muted',
        class: 'border-muted-foreground/20 text-muted-foreground',
      },
      { variant: 'solid', color: 'primary', class: 'bg-primary/10 text-primary' },
      { variant: 'solid', color: 'secondary', class: 'bg-secondary text-secondary-foreground' },
      { variant: 'solid', color: 'muted', class: 'bg-muted text-muted-foreground' },
      { variant: 'ghost', color: 'primary', class: 'text-primary' },
      { variant: 'ghost', color: 'secondary', class: 'text-secondary-foreground' },
      { variant: 'ghost', color: 'muted', class: 'text-muted-foreground' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      color: 'default',
    },
  });

  export type KbdVariant = VariantProps<typeof kbdVariants>['variant'];
  export type KbdSize = VariantProps<typeof kbdVariants>['size'];
  export type KbdColor = VariantProps<typeof kbdVariants>['color'];

  export const KbdPropsSchema = v.strictObject({
    /** Formatted shortcut string rendered as-is. @values ⌘K */
    label: v.optional(StrSchema),
    /** Array of key names auto-mapped to platform symbols. @values ["command", "k"], ["ctrl", "shift", "p"], ["alt", "tab"] */
    keys: v.optional(v.array(StrSchema)),
    /** Visual style variant. @values default, outline, ghost, solid @requires label:⌘K */
    variant: v.optional(v.picklist(['default', 'outline', 'ghost', 'solid']), 'default'),
    /** Text and padding size. @values xs, sm, md, lg, xl @requires label:⌘K */
    size: v.optional(v.picklist(['xs', 'sm', 'md', 'lg', 'xl']), 'sm'),
    /** Color theme. @values default, primary, secondary, muted @requires label:⌘K */
    color: v.optional(v.picklist(['default', 'primary', 'secondary', 'muted']), 'default'),
    /** Show on all breakpoints instead of hiding on mobile. @values true @requires label:⌘K */
    alwaysVisible: v.optional(BoolSchema, false as Bool),
    /** Additional CSS classes. @values custom-class, ml-2 */
    class: v.optional(StrSchema),
    /** Custom content inside the kbd element. @values {#snippet children()}⌘K{/snippet} */
    children: v.optional(v.custom<Snippet>(() => true)),
  });
  export type KbdInputProps = v.InferInput<typeof KbdPropsSchema>;
  /** Public component props for Kbd. */
  export type KbdProps = v.InferOutput<typeof KbdPropsSchema>;
</script>

<script lang="ts">
  /**
   * Kbd — styled keyboard shortcut indicator rendered as a `<kbd>` element.
   *
   * Supports two input modes: a `label` string rendered as-is, or a `keys` array
   * where each key name is auto-mapped to its platform symbol (command→⌘, shift→⇧, etc.).
   * Also accepts a `children` snippet for fully custom content.
   *
   * Consolidates features from HeroUI (keys array + symbol mapping), Mantine/DaisyUI
   * (size variants), Chakra UI (color theming), and shadcn/ui (default styling).
   *
   * @example
   * ```svelte
   * <Kbd label="⌘K" />
   * <Kbd keys={['command', 'shift', 'p']} />
   * ```
   */
  import type { Str, Bool } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  const {
    label,
    keys,
    variant,
    size,
    color,
    alwaysVisible,
    class: className,
    children,
    ...restProps
  }: KbdInputProps = $props();

  const validated: KbdProps = $derived.by(() => {
    const dataProps: Record<string, unknown> = stripSvelteProps({
      label,
      keys,
      variant,
      size,
      color,
      alwaysVisible,
      class: className,
    });
    const result = safeParse(KbdPropsSchema, {
      ...dataProps,
      children,
    });
    if (!result.ok) {
      throw result.error;
    }
    return result.data as KbdProps;
  });

  /**
   * Map a key name to its symbol, or return the key uppercased if no mapping exists.
   *
   * @param key - Key name to map (e.g. 'command', 'shift', 'k')
   * @returns The platform symbol (e.g. '⌘', '⇧') or uppercased key
   */
  function mapKey(key: Str): Str {
    const lower: string = (key as string).toLowerCase();
    return (KEY_SYMBOLS[lower] ?? (key as string).toUpperCase()) as Str;
  }

  /** Resolved visibility class. */
  const visClass: Str = $derived(
    ((validated.alwaysVisible ?? false) ? 'inline-flex' : 'hidden md:inline-flex') as Str,
  );

  /** Resolved variant classes. */
  const variantClass: Str = $derived(
    kbdVariants({
      variant: validated.variant,
      size: validated.size,
      color: validated.color,
    }) as Str,
  );
</script>

{#if validated.keys && validated.keys.length > 0}
  <span class={cn(visClass, 'inline-flex items-center gap-0.5')} data-slot="kbd" {...restProps}>
    {#each validated.keys as key, i (i)}
      {#if i > 0}
        <span class="text-[10px] text-muted-foreground/50">+</span>
      {/if}
      <kbd class={cn(variantClass, validated.class)}>{mapKey(key)}</kbd>
    {/each}
  </span>
{:else}
  <kbd data-slot="kbd" class={cn(visClass, variantClass, validated.class)} {...restProps}>
    {#if validated.children}
      {@render validated.children()}
    {:else}
      {validated.label ?? '—'}
    {/if}
  </kbd>
{/if}
