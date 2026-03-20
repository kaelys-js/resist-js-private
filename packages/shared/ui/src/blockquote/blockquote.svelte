<script module lang="ts">
  import * as v from 'valibot';
  import type { Snippet } from 'svelte';
  import { type VariantProps, tv } from 'tailwind-variants';
  import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';

  export const blockquoteVariants = tv({
    base: 'relative my-4 py-4 [&>svg.bq-icon]:absolute',
    variants: {
      variant: {
        default: 'border-l-4 pl-4 rtl:border-l-0 rtl:border-r-4 rtl:pl-0 rtl:pr-4',
        solid:
          'border-l-4 pl-4 rtl:border-l-0 rtl:border-r-4 rtl:pl-0 rtl:pr-4 rounded-r-lg rtl:rounded-r-none rtl:rounded-l-lg',
        bordered: 'rounded-lg border px-4',
        plain: 'pl-4 rtl:pl-0 rtl:pr-4',
        ghost: 'pl-6 rtl:pl-0 rtl:pr-6',
      },
      color: {
        default: '',
        primary: '',
        secondary: '',
        destructive: '',
        muted: '',
        accent: '',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      radius: {
        none: '',
        sm: '',
        md: '',
        lg: '',
        full: '',
      },
    },
    compoundVariants: [
      /* default variant × colors */
      { variant: 'default', color: 'default', class: 'border-border' },
      { variant: 'default', color: 'primary', class: 'border-primary' },
      { variant: 'default', color: 'secondary', class: 'border-secondary' },
      { variant: 'default', color: 'destructive', class: 'border-destructive' },
      { variant: 'default', color: 'muted', class: 'border-muted-foreground/30' },
      { variant: 'default', color: 'accent', class: 'border-accent' },
      /* solid variant × colors */
      { variant: 'solid', color: 'default', class: 'border-border bg-muted/50' },
      { variant: 'solid', color: 'primary', class: 'border-primary bg-primary/5' },
      { variant: 'solid', color: 'secondary', class: 'border-secondary bg-secondary/10' },
      { variant: 'solid', color: 'destructive', class: 'border-destructive bg-destructive/5' },
      { variant: 'solid', color: 'muted', class: 'border-muted-foreground/30 bg-muted/50' },
      { variant: 'solid', color: 'accent', class: 'border-accent bg-accent/10' },
      /* bordered variant × colors */
      { variant: 'bordered', color: 'default', class: 'border-border' },
      { variant: 'bordered', color: 'primary', class: 'border-primary/30' },
      { variant: 'bordered', color: 'secondary', class: 'border-secondary/30' },
      { variant: 'bordered', color: 'destructive', class: 'border-destructive/30' },
      { variant: 'bordered', color: 'muted', class: 'border-muted-foreground/20' },
      { variant: 'bordered', color: 'accent', class: 'border-accent/30' },
      /* bordered variant × radius */
      { variant: 'bordered', radius: 'none', class: 'rounded-none' },
      { variant: 'bordered', radius: 'sm', class: 'rounded-sm' },
      { variant: 'bordered', radius: 'md', class: 'rounded-md' },
      { variant: 'bordered', radius: 'lg', class: 'rounded-lg' },
      { variant: 'bordered', radius: 'full', class: 'rounded-full' },
      /* solid variant × radius (right side only for default/solid) */
      { variant: 'solid', radius: 'none', class: 'rounded-r-none rtl:rounded-l-none' },
      { variant: 'solid', radius: 'sm', class: 'rounded-r-sm rtl:rounded-r-none rtl:rounded-l-sm' },
      {
        variant: 'solid',
        radius: 'md',
        class: 'rounded-r-md rtl:rounded-r-none rtl:rounded-l-md',
      },
      { variant: 'solid', radius: 'lg', class: 'rounded-r-lg rtl:rounded-r-none rtl:rounded-l-lg' },
    ],
    defaultVariants: {
      variant: 'default',
      color: 'default',
      size: 'md',
      align: 'left',
      radius: 'md',
    },
  });

  export type BlockquoteVariant = VariantProps<typeof blockquoteVariants>['variant'];
  export type BlockquoteColor = VariantProps<typeof blockquoteVariants>['color'];
  export type BlockquoteSize = VariantProps<typeof blockquoteVariants>['size'];
  export type BlockquoteAlign = VariantProps<typeof blockquoteVariants>['align'];
  export type BlockquoteRadius = VariantProps<typeof blockquoteVariants>['radius'];

  export const BlockquotePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class, max-w-lg */
    class: v.optional(StrSchema),
    /** Attribution text displayed below the quote. @values Forrest Gump, Albert Einstein, Source: MDN Docs */
    cite: v.optional(StrSchema),
    /** URL for the citation source — wraps cite text in a link. @values https://example.com, https://mdn.dev @requires cite:Attribution */
    citeUrl: v.optional(StrSchema),
    /** Visual style variant. @values default, solid, bordered, plain, ghost */
    variant: v.optional(v.picklist(['default', 'solid', 'bordered', 'plain', 'ghost']), 'default'),
    /** Theme color for accent border and background. @values default, primary, secondary, destructive, muted, accent */
    color: v.optional(
      v.picklist(['default', 'primary', 'secondary', 'destructive', 'muted', 'accent']),
      'default',
    ),
    /** Text size. @values sm, md, lg, xl */
    size: v.optional(v.picklist(['sm', 'md', 'lg', 'xl']), 'md'),
    /** Text alignment. @values left, center, right */
    align: v.optional(v.picklist(['left', 'center', 'right']), 'left'),
    /** Whether to show the decorative quote icon. @values true, false */
    showIcon: v.optional(BoolSchema, true as Bool),
    /** Whether to show a dash before citation text. @values true, false */
    showDash: v.optional(BoolSchema, true as Bool),
    /** Whether quote text is rendered in italic. @values true, false */
    italic: v.optional(BoolSchema, true as Bool),
    /** Width and height of the icon container in pixels. @values 32, 40, 48 @requires cite:Attribution */
    iconSize: v.optional(NumSchema),
    /** Border radius for bordered/solid variants. @values none, sm, md, lg, full @requires variant:bordered */
    radius: v.optional(v.picklist(['none', 'sm', 'md', 'lg', 'full']), 'none'),
    /** Quote text content. @values {#snippet children()}Life is like a box of chocolates.{/snippet} */
    children: v.optional(v.custom<Snippet>(() => true)),
    /** Custom icon snippet replacing the default quote-mark SVG. @values {#snippet icon()}<MyIcon />{/snippet} @requires cite:Attribution @requires children:"Life is like a box of chocolates." */
    icon: v.optional(v.custom<Snippet>(() => true)),
    /** Footer slot for testimonial-style layouts (avatar, name, role). @values {#snippet footer()}<footer>...</footer>{/snippet} */
    footer: v.optional(v.custom<Snippet>(() => true)),
  });
  export type BlockquoteInputProps = v.InferInput<typeof BlockquotePropsSchema>;
  export type BlockquoteProps = v.InferOutput<typeof BlockquotePropsSchema>;
</script>

<script lang="ts">
  /**
   * Blockquote — styled quotation block for displaying cited text with
   * optional attribution, decorative icon, and multiple visual variants.
   *
   * Consolidates features from Mantine (color, cite, icon, iconSize, radius),
   * Chakra UI (citeUrl, showDash, variant, justify), Flowbite (size, alignment,
   * solid/border, italic), and SvelteUI (color, cite, icon).
   *
   * @example
   * ```svelte
   * <Blockquote cite="— Forrest Gump" color="primary" variant="solid">
   *   Life is like a box of chocolates.
   * </Blockquote>
   * ```
   */
  import type { Str, Bool, Num } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  const {
    class: className,
    cite,
    citeUrl,
    variant,
    color,
    size,
    align,
    showIcon: showIconProp,
    showDash: showDashProp,
    italic,
    iconSize,
    radius,
    children,
    icon,
    footer,
    ...restProps
  }: BlockquoteInputProps = $props();

  const validated: BlockquoteProps = $derived.by(() => {
    const dataProps: Record<string, unknown> = stripSvelteProps({
      class: className,
      cite,
      citeUrl,
      variant,
      color,
      size,
      align,
      showIcon: showIconProp,
      showDash: showDashProp,
      italic,
      iconSize,
      radius,
    });
    const result = safeParse(BlockquotePropsSchema, {
      ...dataProps,
      children,
      icon,
      footer,
    });
    if (!result.ok) throw result.error;
    return result.data as BlockquoteProps;
  });

  /** Resolved prop values with defaults. */
  const showIcon: Bool = $derived((validated.showIcon ?? true) as Bool);
  const showDash: Bool = $derived((validated.showDash ?? true) as Bool);
  const isItalic: Bool = $derived((validated.italic ?? true) as Bool);
  const iconSizePx: Num = $derived((validated.iconSize ?? 40) as Num);
</script>

<blockquote
  data-slot="blockquote"
  class={cn(
    blockquoteVariants({
      variant: validated.variant,
      color: validated.color,
      size: validated.size,
      align: validated.align,
      radius: validated.radius,
    }),
    isItalic && 'italic',
    validated.class,
  )}
  {...restProps}
>
  {#if showIcon}
    <div
      class="mb-3 flex items-center justify-center text-muted-foreground/30"
      style="width: {iconSizePx}px; height: {iconSizePx}px;"
    >
      {#if validated.icon}
        {@render validated.icon()}
      {:else}
        <svg class="bq-icon size-full" aria-hidden="true" fill="currentColor" viewBox="0 0 18 14">
          <path
            d="M6 0H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3H2a1 1 0 0 0 0 2h1a5.006 5.006 0 0 0 5-5V2a2 2 0 0 0-2-2Zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3h-1a1 1 0 0 0 0 2h1a5.006 5.006 0 0 0 5-5V2a2 2 0 0 0-2-2Z"
          />
        </svg>
      {/if}
    </div>
  {/if}

  <div class="text-foreground">
    {@render validated.children?.()}
  </div>

  {#if validated.cite}
    <footer class="mt-2 text-sm text-muted-foreground">
      {#if validated.citeUrl}
        <cite class="not-italic">
          {#if showDash}—
          {/if}<a
            href={validated.citeUrl}
            class="underline decoration-muted-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            target="_blank"
            rel="noopener noreferrer">{validated.cite}</a
          >
        </cite>
      {:else}
        <cite class="not-italic">{showDash ? '— ' : ''}{validated.cite}</cite>
      {/if}
    </footer>
  {/if}

  {#if validated.footer}
    <div class="mt-3">
      {@render validated.footer()}
    </div>
  {/if}
</blockquote>
