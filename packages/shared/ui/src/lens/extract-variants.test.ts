/**
 * Unit tests for the Lens TV variant extractor.
 *
 * Tests regex-based extraction of `tv()` variant metadata from raw Svelte source.
 */
import { describe, expect, it } from 'vitest';

import type { VariantMeta } from './types.js';
import { extractVariants } from './extract-variants.js';

describe('extractVariants', () => {
  it('extracts variant keys and options from a tv() call', () => {
    const source: string = `<script lang="ts" module>
export const buttonVariants = tv({
	base: "inline-flex items-center",
	variants: {
		variant: {
			default: 'bg-primary',
			secondary: 'bg-secondary',
			destructive: 'bg-destructive',
		},
		size: {
			default: 'h-9 px-4',
			sm: 'h-8 px-3',
			lg: 'h-10 px-6',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
});
</script>`;
    const meta: VariantMeta | null = extractVariants(source);
    expect(meta).not.toBeNull();
    expect(meta?.variants).toHaveLength(2);

    const variantKey = meta?.variants.find((v) => v.key === 'variant');
    expect(variantKey?.options).toEqual(['default', 'secondary', 'destructive']);
    expect(variantKey?.default).toBe('default');

    const sizeKey = meta?.variants.find((v) => v.key === 'size');
    expect(sizeKey?.options).toEqual(['default', 'sm', 'lg']);
    expect(sizeKey?.default).toBe('default');
  });

  it('handles tv() call with no defaultVariants', () => {
    const source: string = `<script lang="ts" module>
export const badgeVariants = tv({
	base: "inline-flex",
	variants: {
		variant: {
			default: 'bg-primary',
			outline: 'border',
		},
	},
});
</script>`;
    const meta: VariantMeta | null = extractVariants(source);
    expect(meta).not.toBeNull();
    expect(meta?.variants).toHaveLength(1);
    expect(meta?.variants[0]?.key).toBe('variant');
    expect(meta?.variants[0]?.options).toEqual(['default', 'outline']);
    expect(meta?.variants[0]?.default).toBe('');
  });

  it('returns null for source without tv()', () => {
    const source: string = `<script lang="ts">
let { disabled, ...restProps }: Props = $props();
</script>`;
    const meta: VariantMeta | null = extractVariants(source);
    expect(meta).toBeNull();
  });

  it('returns null for empty source', () => {
    const meta: VariantMeta | null = extractVariants('');
    expect(meta).toBeNull();
  });

  it('handles real button component source with icon sizes', () => {
    const source: string = `<script lang="ts" module>
import { type VariantProps, tv } from 'tailwind-variants';

export const buttonVariants = tv({
	base: "focus-visible:border-ring inline-flex shrink-0 items-center justify-center",
	variants: {
		variant: {
			default: 'bg-primary text-primary-foreground',
			destructive: 'bg-destructive text-white',
			outline: 'bg-background border',
			secondary: 'bg-secondary text-secondary-foreground',
			ghost: 'hover:bg-accent',
			link: 'text-primary underline-offset-4 hover:underline',
		},
		size: {
			default: 'h-9 px-4 py-2',
			sm: 'h-8 gap-1.5 rounded-md px-3',
			lg: 'h-10 rounded-md px-6',
			icon: 'size-9',
			'icon-sm': 'size-8',
			'icon-lg': 'size-10',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
});
</script>`;
    const meta: VariantMeta | null = extractVariants(source);
    expect(meta).not.toBeNull();

    const variantKey = meta?.variants.find((v) => v.key === 'variant');
    expect(variantKey?.options).toEqual([
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ]);

    const sizeKey = meta?.variants.find((v) => v.key === 'size');
    expect(sizeKey?.options).toEqual(['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg']);
  });

  it('returns null when tv() is unclosed (tvEndIdx === -1)', () => {
    const source: string = `const x = tv({ variants: { variant: { a: 'x' } } `;
    expect(extractVariants(source)).toBeNull();
  });

  it('returns null when tv() has no variants block', () => {
    const source: string = `const x = tv({ base: 'flex' });`;
    expect(extractVariants(source)).toBeNull();
  });

  it('returns null when defaultVariants key body is unclosed (extractBlock endIdx === -1)', () => {
    /* The `variants` block closes, but `defaultVariants` starts and never
     * closes before the tv() closing brace, which causes
     * findMatchingBrace on the inner block to return -1. extractBlock then
     * returns null for defaultVariants but variants still parses — so
     * the whole call still succeeds but with empty defaults. */
    const source: string = `const x = tv({
      variants: { variant: { a: 'x', b: 'y' } },
      defaultVariants: { variant: 'a'
    `;
    /* Unclosed inner — the outer tv() never closes either, so tvEndIdx is
     * -1 and extractVariants short-circuits to null before reaching
     * defaultVariants. This also exercises line 45. */
    expect(extractVariants(source)).toBeNull();
  });

  it("string-literal values in tv() don't trip findMatchingBrace depth tracking", () => {
    const source: string = `const x = tv({
      variants: {
        size: {
          sm: 'has-{nested}-braces-{in-string}',
          md: 'another-\\'string\\' with-quotes',
        },
      },
    });`;
    const meta = extractVariants(source);
    expect(meta).not.toBeNull();
    expect(meta?.variants[0]?.key).toBe('size');
    expect(meta?.variants[0]?.options).toEqual(['sm', 'md']);
  });

  it('template-literal values also skip brace counting', () => {
    const source: string = `const x = tv({
      variants: {
        k: {
          a: \`tpl-{with}-braces\`,
          b: 'plain',
        },
      },
    });`;
    const meta = extractVariants(source);
    expect(meta?.variants[0]?.options).toEqual(['a', 'b']);
  });

  it('defaultVariants with empty keys are skipped', () => {
    const source: string = `const x = tv({
      variants: { k: { a: 'x', b: 'y' } },
      defaultVariants: {},
    });`;
    const meta = extractVariants(source);
    expect(meta?.variants[0]?.default).toBe('');
  });

  it('option block with quoted keys uses parseOptionNames quotedMatch path', () => {
    const source: string = `const x = tv({
      variants: {
        size: { 'icon-sm': 'size-8', 'icon-lg': 'size-10' },
      },
    });`;
    const meta = extractVariants(source);
    expect(meta?.variants[0]?.options).toEqual(['icon-sm', 'icon-lg']);
  });

  it('option block with template-literal values exercises skipValue non-string branch', () => {
    const source: string = `const x = tv({
      variants: {
        k: { a: \`tpl\`, b: \`other\` },
      },
    });`;
    const meta = extractVariants(source);
    expect(meta?.variants[0]?.options).toEqual(['a', 'b']);
  });

  it('option block with double-quoted values', () => {
    const source: string = `const x = tv({
      variants: {
        k: { a: "double", b: "quoted" },
      },
    });`;
    const meta = extractVariants(source);
    expect(meta?.variants[0]?.options).toEqual(['a', 'b']);
  });

  it('option block with escaped quote inside value string', () => {
    const source: string = `const x = tv({
      variants: {
        k: { a: 'it\\'s', b: 'ok' },
      },
    });`;
    const meta = extractVariants(source);
    expect(meta?.variants[0]?.options).toEqual(['a', 'b']);
  });

  it('extracts variants from instance script (not module)', () => {
    const source: string = `<script lang="ts">
const variants = tv({
	base: "flex",
	variants: {
		active: {
			true: 'bg-blue-500',
			false: 'bg-gray-500',
		},
	},
});
</script>`;
    const meta: VariantMeta | null = extractVariants(source);
    expect(meta).not.toBeNull();
    expect(meta?.variants[0]?.options).toEqual(['true', 'false']);
  });
});
