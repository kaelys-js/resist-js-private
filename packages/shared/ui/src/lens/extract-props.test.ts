/**
 * Unit tests for the Lens props extractor.
 *
 * Tests regex-based extraction of `$props()` metadata from raw Svelte source.
 */
import { describe, expect, it } from 'vitest';

import type { PropMeta } from './types.js';
import { extractProps } from './extract-props.js';

describe('extractProps', () => {
	it('extracts simple props with string defaults', () => {
		const source: string = `<script lang="ts">
let {
	variant = "default",
	size = "default",
	...restProps
}: ButtonProps = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(2);
		expect(props[0]).toEqual({
			name: 'variant',
			type: 'string',
			default: '"default"',
			description: '',
			bindable: false,
		});
		expect(props[1]).toEqual({
			name: 'size',
			type: 'string',
			default: '"default"',
			description: '',
			bindable: false,
		});
	});

	it('extracts props without defaults', () => {
		const source: string = `<script lang="ts">
let {
	disabled,
	href,
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(2);
		expect(props[0]?.name).toBe('disabled');
		expect(props[0]?.default).toBe('');
		expect(props[1]?.name).toBe('href');
	});

	it('extracts bindable props', () => {
		const source: string = `<script lang="ts">
let {
	ref = $bindable(null),
	value = $bindable(),
	checked = $bindable(false),
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		// ref is internal — should be skipped
		expect(props).toHaveLength(2);
		expect(props[0]).toEqual({
			name: 'value',
			type: "Props['value']",
			default: '',
			description: '',
			bindable: true,
		});
		expect(props[1]).toEqual({
			name: 'checked',
			type: 'boolean',
			default: 'false',
			description: '',
			bindable: true,
		});
	});

	it('skips internal props (ref, class, children, child, ...spread)', () => {
		const source: string = `<script lang="ts">
let {
	ref = $bindable(null),
	class: className,
	children,
	child,
	showCloseButton = true,
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(1);
		expect(props[0]?.name).toBe('showCloseButton');
	});

	it('skips string-keyed props like data-slot', () => {
		const source: string = `<script lang="ts">
let {
	'data-slot': dataSlot = 'input',
	type,
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(1);
		expect(props[0]?.name).toBe('type');
	});

	it('extracts JSDoc descriptions (single-line)', () => {
		const source: string = `<script lang="ts">
let {
	/** The visual style variant. */
	variant = "default",
	/** The size preset to use. */
	size = "default",
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(2);
		expect(props[0]?.description).toBe('The visual style variant.');
		expect(props[1]?.description).toBe('The size preset to use.');
	});

	it('extracts JSDoc descriptions (multi-line)', () => {
		const source: string = `<script lang="ts">
let {
	/**
	 * The visual style variant.
	 * Controls the button appearance.
	 */
	variant = "default",
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(1);
		expect(props[0]?.description).toBe('The visual style variant. Controls the button appearance.');
	});

	it('infers boolean type from default value', () => {
		const source: string = `<script lang="ts">
let {
	showCloseButton = true,
	disabled = false,
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props[0]?.type).toBe('boolean');
		expect(props[0]?.default).toBe('true');
		expect(props[1]?.type).toBe('boolean');
		expect(props[1]?.default).toBe('false');
	});

	it('infers number type from default value', () => {
		const source: string = `<script lang="ts">
let {
	delay = 200,
	...restProps
}: Props = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props[0]?.type).toBe('number');
		expect(props[0]?.default).toBe('200');
	});

	it('extracts types from inline intersection', () => {
		const source: string = `<script lang="ts">
let {
	ref = $bindable(null),
	class: className,
	portalProps,
	children,
	showCloseButton = true,
	...restProps
}: BaseType & {
	portalProps?: SomeType;
	children: Snippet;
	showCloseButton?: boolean;
} = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(2);
		expect(props[0]?.name).toBe('portalProps');
		expect(props[0]?.type).toBe('SomeType');
		expect(props[1]?.name).toBe('showCloseButton');
		expect(props[1]?.type).toBe('boolean');
	});

	it('returns empty array for source without $props()', () => {
		const source: string = `<script lang="ts">
const count = 42;
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(0);
	});

	it('returns empty array for empty source', () => {
		const props: PropMeta[] = extractProps('');
		expect(props).toHaveLength(0);
	});

	it('resolves named type definitions for types and descriptions', () => {
		const source: string = `<script lang="ts">
type MyProps = {
	/** The status code. */
	status: Num;
	/** The error message. */
	message: Str;
	/** Optional error ID. */
	errorId?: Str;
};

let {
	status,
	message,
	errorId,
}: MyProps = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(3);
		expect(props[0]).toEqual({
			name: 'status',
			type: 'Num',
			default: '',
			description: 'The status code.',
			bindable: false,
		});
		expect(props[1]).toEqual({
			name: 'message',
			type: 'Str',
			default: '',
			description: 'The error message.',
			bindable: false,
		});
		expect(props[2]).toEqual({
			name: 'errorId',
			type: 'Str',
			default: '',
			description: 'Optional error ID.',
			bindable: false,
			optional: true,
		});
	});

	it('prefers destructuring JSDoc over type definition JSDoc', () => {
		const source: string = `<script lang="ts">
type MyProps = {
	/** Type definition description. */
	variant: Str;
};

let {
	/** Destructuring description wins. */
	variant = "default",
}: MyProps = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		expect(props).toHaveLength(1);
		expect(props[0]?.description).toBe('Destructuring description wins.');
		// Named type `Str` takes priority over inferred `string` from default
		expect(props[0]?.type).toBe('Str');
	});

	it('resolves intersection named types with inline block', () => {
		const source: string = `<script lang="ts">
type ButtonProps = WithElementRef<HTMLButtonAttributes> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

let {
	class: className,
	variant = "default",
	size = "default",
	ref = $bindable(null),
	...restProps
}: ButtonProps = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		const names: string[] = props.map((p: PropMeta): string => p.name);
		expect(names).toContain('variant');
		expect(names).toContain('size');

		const variantProp: PropMeta | undefined = props.find(
			(p: PropMeta): boolean => p.name === 'variant',
		);
		// Type comes from named type definition
		expect(variantProp?.type).toBe('ButtonVariant');
	});

	it('handles real button component source', () => {
		const source: string = `<script lang="ts" module>
import { cn, type WithElementRef } from '../utils.js';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import { type VariantProps, tv } from 'tailwind-variants';

export const buttonVariants = tv({
	base: "inline-flex items-center",
	variants: {
		variant: {
			default: 'bg-primary',
			secondary: 'bg-secondary',
		},
		size: {
			default: 'h-9 px-4',
			sm: 'h-8 px-3',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
});
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>`;
		const props: PropMeta[] = extractProps(source);
		// Should include: variant, size, href, type, disabled
		// Should exclude: class, ref, children, ...restProps
		const names: string[] = props.map((p: PropMeta): string => p.name);
		expect(names).toContain('variant');
		expect(names).toContain('size');
		expect(names).toContain('href');
		expect(names).toContain('type');
		expect(names).toContain('disabled');
		expect(names).not.toContain('class');
		expect(names).not.toContain('ref');
		expect(names).not.toContain('children');

		const variantProp: PropMeta | undefined = props.find(
			(p: PropMeta): boolean => p.name === 'variant',
		);
		expect(variantProp?.default).toBe('"default"');
		expect(variantProp?.type).toBe('string');
	});
});
