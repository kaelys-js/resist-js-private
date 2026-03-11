/**
 * Unit tests for the Lens props extractor.
 *
 * Tests regex-based extraction of `$props()` metadata from raw Svelte source.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PropMeta } from './types.js';
import { extractProps, buildBaseProps } from './extract-props.js';

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

  it('resolves named schema const refs into expandable typeFields (schema-based path)', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

const DepKindSchema = v.picklist(['type', 'namespace', 'named', 'default']);

export const DepEntrySchema = v.strictObject({
	/** The import specifier path. @values ../button/index.js */
	path: StrSchema,
	/** Imported names. @values Button, cn */
	names: v.array(StrSchema),
	/** Component directory name. @values button, dialog */
	component: StrSchema,
	/** How this import was declared. @values type, named */
	kind: DepKindSchema,
});

export const DepTreeSchema = v.strictObject({
	/** Internal deps. */
	internal: v.array(DepEntrySchema),
	/** Workspace deps. */
	workspace: v.array(DepEntrySchema),
	/** External deps. */
	external: v.array(DepEntrySchema),
});

export const SizeSchema = v.strictObject({
	/** Source size. @values 1024, 2048 */
	source: NumSchema,
	/** Gzip size. @values 256, 512 */
	gzip: v.optional(NumSchema),
});

export const MyPropsSchema = v.strictObject({
	/** The dependency tree. */
	deps: DepTreeSchema,
	/** Per-component sizes. */
	sizes: v.optional(v.record(v.string(), SizeSchema)),
	/** Class name. */
	class: v.optional(StrSchema),
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const names: string[] = props.map((p: PropMeta): string => p.name);
    expect(names).toContain('deps');
    expect(names).toContain('sizes');

    // deps should have type 'DepTree' and be expandable
    const depsProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'deps');
    expect(depsProp?.type).toBe('DepTree');
    expect(depsProp?.typeDefinition).toBeDefined();
    expect(depsProp?.typeFields).toBeDefined();
    expect(depsProp?.typeFields?.length).toBeGreaterThan(0);

    // sizes should have type 'Record<string, Size>' and be expandable
    const sizesProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'sizes',
    );
    expect(sizesProp?.type).toBe('Record<string, Size>');
    expect(sizesProp?.typeFields).toBeDefined();
    expect(sizesProp?.typeFields?.length).toBeGreaterThan(0);
  });

  it('expands DepTree into its sub-fields (internal, workspace, external)', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

const DepKindSchema = v.picklist(['type', 'namespace', 'named', 'default']);

export const DepEntrySchema = v.strictObject({
	/** The import specifier path. @values ../button/index.js */
	path: StrSchema,
	/** Imported names. @values Button, cn */
	names: v.array(StrSchema),
	/** Component directory name. @values button, dialog */
	component: StrSchema,
	/** How this import was declared. @values type, named */
	kind: DepKindSchema,
});

export const DepTreeSchema = v.strictObject({
	/** Internal deps. */
	internal: v.array(DepEntrySchema),
	/** Workspace deps. */
	workspace: v.array(DepEntrySchema),
	/** External deps. */
	external: v.array(DepEntrySchema),
});

export const MyPropsSchema = v.strictObject({
	/** The dependency tree. */
	deps: DepTreeSchema,
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const depsProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'deps');
    expect(depsProp).toBeDefined();
    expect(depsProp?.typeFields).toBeDefined();
    expect(depsProp?.typeFields?.length).toBeGreaterThan(0);
    // Verify actual sub-field names
    const fieldNames: string[] = (depsProp?.typeFields ?? []).map((f) => f.field);
    expect(fieldNames).toContain('internal');
    expect(fieldNames).toContain('workspace');
    expect(fieldNames).toContain('external');
  });

  it('expands Record<string, Size> to show value schema sub-fields', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

export const SizeSchema = v.strictObject({
	/** Source size. @values 1024, 2048 */
	source: NumSchema,
	/** Gzip size. @values 256, 512 */
	gzip: v.optional(NumSchema),
});

export const MyPropsSchema = v.strictObject({
	/** Per-component sizes. */
	sizes: v.optional(v.record(v.string(), SizeSchema)),
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const sizesProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'sizes',
    );
    expect(sizesProp).toBeDefined();
    expect(sizesProp?.type).toBe('Record<string, Size>');
    expect(sizesProp?.typeFields).toBeDefined();
    expect(sizesProp?.typeFields?.length).toBeGreaterThan(0);
    // Should have [key] + expanded value schema fields (source, gzip)
    const fieldNames: string[] = (sizesProp?.typeFields ?? []).map((f) => f.field);
    expect(fieldNames).toContain('[key]');
    expect(fieldNames).toContain('source');
    expect(fieldNames).toContain('gzip');
  });

  it('includes @values as mockValues for schema-based fields', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

export const TestPropsSchema = v.strictObject({
	/** Component name. @values button, dialog, sidebar */
	name: StrSchema,
	/** Size in bytes. @values 1024, 2048 */
	size: NumSchema,
});
export type TestProps = v.InferOutput<typeof TestPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: TestProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(TestPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as TestProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const nameProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'name');
    expect(nameProp?.mockValues).toEqual(['button', 'dialog', 'sidebar']);

    const sizeProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'size');
    expect(sizeProp?.mockValues).toEqual(['1024', '2048']);
  });

  it('every LensDependencyTree prop has @values (mockValues)', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

const DepKindSchema = v.picklist(['type', 'namespace', 'named', 'default']);

export const DepEntrySchema = v.strictObject({
	/** The import specifier path. @values ../button/index.js */
	path: StrSchema,
	/** Imported names. @values Button, cn */
	names: v.array(StrSchema),
	/** Component directory name. @values button, dialog */
	component: StrSchema,
	/** How this import was declared. @values type, named */
	kind: DepKindSchema,
});

export const DepTreeSchema = v.strictObject({
	/** Internal deps. @values [{path: "../button/index.js", names: ["Button"], component: "button", kind: "named"}] */
	internal: v.array(DepEntrySchema),
	/** Workspace deps. @values [{path: "@/ui/tooltip", names: ["Tooltip"], component: "", kind: "named"}] */
	workspace: v.array(DepEntrySchema),
	/** External deps. @values [{path: "bits-ui", names: ["Dialog"], component: "", kind: "named"}] */
	external: v.array(DepEntrySchema),
});

export const ReverseDepSchema = v.strictObject({
	/** Component name. @values sidebar, dialog */
	component: StrSchema,
	/** Imported names. @values Button, buttonVariants */
	names: v.array(StrSchema),
	/** Import kind. @values type, named */
	kind: DepKindSchema,
});

export const ComponentSizeSchema = v.strictObject({
	/** Raw source size in chars. @values 1024, 2048 */
	source: NumSchema,
	/** Minified JS size. @values 512, 1024 */
	compiled: v.optional(NumSchema),
	/** Gzip size. @values 256, 512 */
	gzip: v.optional(NumSchema),
});

export const LensDependencyTreePropsSchema = v.strictObject({
	/** Categorized dependency tree. @values {internal: [], workspace: [], external: []} */
	deps: DepTreeSchema,
	/** Reverse deps. @values [{component: "sidebar", names: ["Button"], kind: "named"}] */
	usedBy: v.optional(v.array(ReverseDepSchema)),
	/** Current component name. @values button, dialog, sidebar */
	currentComponent: v.optional(StrSchema),
	/** Per-component sizes. @values {button: {source: 1024, compiled: 512, gzip: 256}} */
	sizes: v.optional(v.record(v.string(), ComponentSizeSchema)),
	/** Known component names. @values button, dialog, tooltip */
	knownComponents: v.optional(v.array(StrSchema)),
	/** Raw source strings. @values {"/ui/button/index.js": "import..."} */
	rawSources: v.optional(v.record(v.string(), StrSchema)),
	/** CSS classes. @values mt-4, space-y-2 */
	class: v.optional(StrSchema),
});
export type LensDependencyTreeProps = v.InferOutput<typeof LensDependencyTreePropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: LensDependencyTreeProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(LensDependencyTreePropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as LensDependencyTreeProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    // Every prop should have @values — if any are missing, this test fails
    for (const prop of props) {
      expect(prop.mockValues, `Prop "${prop.name}" is missing @values annotation`).toBeDefined();
      expect(prop.mockValues?.length, `Prop "${prop.name}" has empty @values`).toBeGreaterThan(0);
    }
  });

  it('every schema-based component has @values on all props', () => {
    // Reads ALL real schema-based component .svelte files from disk and verifies
    // every extracted prop has @values. If you add a new schema-based component or
    // add a field to a schema, you MUST add @values or this test will fail.
    const uiDir: string = resolve(__dirname, '..');
    const dirs: string[] = readdirSync(uiDir).filter((d: string): boolean => {
      const full: string = join(uiDir, d);
      return statSync(full).isDirectory();
    });

    const failures: string[] = [];

    for (const dir of dirs) {
      const dirPath: string = join(uiDir, dir);
      const svelteFiles: string[] = readdirSync(dirPath).filter((f: string): boolean =>
        f.endsWith('.svelte'),
      );

      for (const file of svelteFiles) {
        const filePath: string = join(dirPath, file);
        const source: string = readFileSync(filePath, 'utf8');

        // Only check schema-based components (safeParse pattern)
        if (!source.includes('safeParse(') || !source.includes('$props()')) continue;

        const props: PropMeta[] = extractProps(source);
        for (const prop of props) {
          if (!prop.mockValues || prop.mockValues.length === 0) {
            failures.push(`${dir}/${file} → prop "${prop.name}" missing @values`);
          }
        }
      }
    }

    expect(failures, `Schema props missing @values:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('strips @values from expanded type field descriptions', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

export const ItemSchema = v.strictObject({
	/** The label text. @values Hello, World */
	label: StrSchema,
	/** Count of items. @values 10, 20, 30 */
	count: NumSchema,
});

export const MyPropsSchema = v.strictObject({
	/** The item. */
	item: ItemSchema,
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const itemProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'item');
    expect(itemProp?.typeFields).toBeDefined();
    // Descriptions must NOT contain @values tag text
    const labelField = itemProp?.typeFields?.find((f) => f.field === 'label');
    expect(labelField?.description).toBe('The label text.');
    expect(labelField?.description).not.toContain('@values');
    const countField = itemProp?.typeFields?.find((f) => f.field === 'count');
    expect(countField?.description).toBe('Count of items.');
    expect(countField?.description).not.toContain('@values');
  });

  it('renders v.strictObject type as "object" not raw schema text', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

export const InnerSchema = v.strictObject({
	/** A field. */
	name: StrSchema,
});

export const MyPropsSchema = v.strictObject({
	/** Object prop. */
	inner: InnerSchema,
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const innerProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'inner',
    );
    expect(innerProp).toBeDefined();
    // Type fields in the inner schema — the "accepts" for object-typed fields
    // should show "object" not raw v.strictObject(...) text
    expect(innerProp?.typeFields).toBeDefined();
    const nameField = innerProp?.typeFields?.find((f) => f.field === 'name');
    expect(nameField).toBeDefined();
    // Verify the parent type itself is resolved (should be 'Inner' from schema const name)
    expect(innerProp?.type).toBe('Inner');
  });

  it('unwraps v.array() around v.strictObject for expanded type fields', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';

export const EntrySchema = v.strictObject({
	/** Entry name. */
	name: StrSchema,
	/** Entry count. @values 1, 2, 3 */
	count: NumSchema,
});

export const MyPropsSchema = v.strictObject({
	/** List of entries. */
	items: v.array(EntrySchema),
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const itemsProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'items',
    );
    expect(itemsProp).toBeDefined();
    // v.array(EntrySchema) should unwrap to show Entry sub-fields
    expect(itemsProp?.typeFields).toBeDefined();
    expect(itemsProp?.typeFields?.length).toBeGreaterThan(0);
    const fieldNames: string[] = (itemsProp?.typeFields ?? []).map((f) => f.field);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('count');
  });

  it('handles nested v.optional(v.array(v.strictObject())) unwrapping', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';

export const TagSchema = v.strictObject({
	/** Tag label. */
	label: StrSchema,
	/** Tag color. @values red, blue, green */
	color: StrSchema,
});

export const MyPropsSchema = v.strictObject({
	/** Optional list of tags. */
	tags: v.optional(v.array(TagSchema)),
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    const props: PropMeta[] = extractProps(source);
    const tagsProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'tags');
    expect(tagsProp).toBeDefined();
    // v.optional(v.array(TagSchema)) — should unwrap both layers to show Tag sub-fields
    expect(tagsProp?.typeFields).toBeDefined();
    expect(tagsProp?.typeFields?.length).toBeGreaterThan(0);
    const fieldNames: string[] = (tagsProp?.typeFields ?? []).map((f) => f.field);
    expect(fieldNames).toContain('label');
    expect(fieldNames).toContain('color');
  });

  it('prefers schema-const over TS type definition when both exist', () => {
    // Simulates DepTree being defined as both `const DepTreeSchema = v.strictObject(...)` (in svelte)
    // AND `type DepTree = { ... }` (in supplementary TS sources). Schema-const should win.
    const svelteSource: string = `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';

export const DepTreeSchema = v.strictObject({
	/** Internal deps. */
	internal: v.array(StrSchema),
	/** External deps. */
	external: v.array(StrSchema),
});

export const MyPropsSchema = v.strictObject({
	/** The tree. */
	deps: DepTreeSchema,
});
export type MyProps = v.InferOutput<typeof MyPropsSchema>;
</script>

<script lang="ts">
import { safeParse } from '@/utils/result/safe';
const allProps: MyProps = $props();
const validated = $derived.by(() => {
	const result = safeParse(MyPropsSchema, allProps);
	if (!result.ok) throw result.error;
	return result.data as MyProps;
});
</script>`;
    // Supplementary TS source has a plain type definition (with JSDoc that parsePlainObjectFields
    // previously couldn't handle — this verifies schema-const takes priority)
    const tsSource: string = `
export type DepTree = {
	/** Internal imports. */
	internal: string[];
	/** External imports. */
	external: string[];
};`;
    const props: PropMeta[] = extractProps(svelteSource, [tsSource]);
    const depsProp: PropMeta | undefined = props.find((p: PropMeta): boolean => p.name === 'deps');
    expect(depsProp).toBeDefined();
    expect(depsProp?.typeFields).toBeDefined();
    expect(depsProp?.typeFields?.length).toBeGreaterThan(0);
    // Schema-const produces Valibot-parsed fields; TS type would have different structure
    const fieldNames: string[] = (depsProp?.typeFields ?? []).map((f) => f.field);
    expect(fieldNames).toContain('internal');
    expect(fieldNames).toContain('external');
  });

  it('builds correct baseProps for header-user with nested object @values', () => {
    const source: string = readFileSync(
      resolve(__dirname, '../header-user/HeaderUser.svelte'),
      'utf8',
    );
    const props: PropMeta[] = extractProps(source);

    // Verify labels prop extraction
    const labelsProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'labels',
    );
    expect(labelsProp).toBeDefined();
    expect(labelsProp?.type).toBe('HeaderUserLabels');
    expect(labelsProp?.mockValues).toBeDefined();
    expect(labelsProp?.mockValues?.length).toBeGreaterThan(0);
    // mockValues[0] should be the full object literal
    expect(labelsProp?.mockValues?.[0]).toContain('userMenu');
    // typeDefinition should NOT contain ') =>' (angle bracket bug would include onLogOut's JSDoc)
    expect(labelsProp?.typeDefinition).toBeDefined();
    expect(labelsProp?.typeDefinition).not.toContain(') =>');
    // typeDefinition should be reasonable length (schema body only, not entire file)
    expect((labelsProp?.typeDefinition ?? '').length).toBeLessThan(2000);

    // Verify features prop extraction
    const featuresProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'features',
    );
    expect(featuresProp).toBeDefined();
    expect(featuresProp?.mockValues).toBeDefined();
    expect(featuresProp?.mockValues?.length).toBeGreaterThan(0);

    // Verify onLogOut
    const onLogOutProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'onLogOut',
    );
    expect(onLogOutProp?.type).toContain(') =>');

    // Build base props and check labels is an object (not a function)
    const base: Record<string, unknown> = buildBaseProps(props);
    expect(typeof base['onLogOut']).toBe('function');
    expect(typeof base['userName']).toBe('string');
    expect(typeof base['features']).toBe('object');
    expect(typeof base['labels']).toBe('object');
  });

  it('preserves commas within @values entries (splits on ", " not bare ",")', (): void => {
    const source: string = readFileSync(
      resolve(__dirname, '../finance-card/FinanceCard.svelte'),
      'utf8',
    );
    const props: PropMeta[] = extractProps(source);

    // value prop has @values $1,234.56, $5,678.90, -$900.00 — commas in dollar amounts must be preserved
    const valueProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'value',
    );
    expect(valueProp?.mockValues).toEqual(['$1,234.56', '$5,678.90', '-$900.00']);

    // trend prop has @values up, down, neutral — simple comma-space splitting still works
    const trendProp: PropMeta | undefined = props.find(
      (p: PropMeta): boolean => p.name === 'trend',
    );
    expect(trendProp?.mockValues).toEqual(['up', 'down', 'neutral']);
  });
});
