# Auto-Generated Component Examples — Part 1: Prop Variation Examples

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-generate per-prop examples (one render per enum value, boolean state, size grid, combined states, slot variations) so components have shadcn-quality examples without manual `examples/` files.

**Architecture:** A new `generate-examples.ts` module in `packages/shared/ui/src/lens/` analyzes `PropMeta[]` (already extracted by `extract-props.ts`) and produces `AutoExample[]` — each containing a title, description, prop overrides, and auto-generated Svelte source code string. The component detail page (`[name]/+page.svelte`) calls the generator and renders auto-examples alongside manual ones in the Examples section, using the existing `LensComponentRenderer` with prop overrides.

**Tech Stack:** TypeScript, Valibot schemas, existing `PropMeta`/`VariantKeyMeta` types, `LensComponentRenderer`, Svelte 5

**Key insight:** Auto-examples are NOT the same as variants. Variants show an interactive toggle grid for a single prop. Auto-examples show standalone, labeled renders (like shadcn's "Outline" / "With Icon" / "Disabled" sections) — each is a separate `LensComponentRenderer` card with a title, description, and code snippet. They supplement — not replace — the existing variants section.

**Key difference from variants:** The variants section already renders every prop option as a toggle grid. Auto-examples are curated, shadcn-style renders: one card per meaningful configuration, with descriptive titles ("Outline Button", "Disabled + Destructive", "With Icon"), auto-generated code snippets, and smart grouping. Think of variants as "playground" and auto-examples as "cookbook".

---

### Task 1: AutoExample schema + type

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Test: `packages/shared/ui/src/lens/types.test.ts` (if exists, else create)

**Step 1: Add schema to types.ts**

Add after `LensExampleSchema` (line ~139):

```typescript
/**
 * An auto-generated example produced by prop analysis.
 *
 * Unlike manual `LensExample` (which maps to an `.svelte` file),
 * auto-examples are computed at runtime from prop metadata and
 * rendered via `LensComponentRenderer` with prop overrides.
 *
 * @example
 * ```typescript
 * const ex: AutoExample = {
 *   id: 'variant-outline',
 *   title: 'Outline',
 *   description: 'Button with the outline variant.',
 *   group: 'Variants',
 *   propOverrides: { variant: 'outline' },
 *   codeSnippet: '<Button variant="outline">Outline</Button>',
 * };
 * ```
 */
export const AutoExampleSchema = v.strictObject({
  /** Unique identifier for deduplication and anchoring (e.g., `variant-outline`). */
  id: StrSchema,
  /** Human-readable title displayed above the example (e.g., "Outline"). */
  title: StrSchema,
  /** Short description shown below the title. */
  description: StrSchema,
  /** Grouping category for section headers (e.g., "Variants", "Sizes", "States"). */
  group: StrSchema,
  /** Props to pass to the component, overriding defaults. */
  propOverrides: v.record(StrSchema, v.unknown()),
  /** Auto-generated Svelte code snippet for display. */
  codeSnippet: StrSchema,
  /** Optional slot content text (overrides default "Example" label). */
  slotContent: v.optional(StrSchema),
});
/** An auto-generated example from prop analysis. */
export type AutoExample = v.InferOutput<typeof AutoExampleSchema>;
```

**Step 2: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/shared/ui/src/lens/types.ts
git commit -m "feat(lens): add AutoExample schema for auto-generated examples"
```

---

### Task 2: Code snippet generator utility

**Files:**
- Create: `packages/shared/ui/src/lens/generate-snippet.ts`
- Create: `packages/shared/ui/src/lens/generate-snippet.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { generateSnippet } from './generate-snippet.js';

describe('generateSnippet', () => {
  it('generates self-closing tag with no props and no slot', () => {
    const result: string = generateSnippet('Input', {}, undefined);
    expect(result).toBe('<Input />');
  });

  it('generates tag with slot content', () => {
    const result: string = generateSnippet('Button', {}, 'Click me');
    expect(result).toBe('<Button>Click me</Button>');
  });

  it('generates tag with string props', () => {
    const result: string = generateSnippet('Button', { variant: 'outline' }, 'Click');
    expect(result).toBe('<Button variant="outline">Click</Button>');
  });

  it('generates tag with boolean true prop', () => {
    const result: string = generateSnippet('Button', { disabled: true }, 'Click');
    expect(result).toBe('<Button disabled>Click</Button>');
  });

  it('generates tag with boolean false prop (omitted)', () => {
    const result: string = generateSnippet('Button', { disabled: false }, 'Click');
    expect(result).toBe('<Button>Click</Button>');
  });

  it('generates tag with numeric prop', () => {
    const result: string = generateSnippet('Slider', { max: 100 }, undefined);
    expect(result).toBe('<Slider max={100} />');
  });

  it('generates tag with multiple props sorted alphabetically', () => {
    const result: string = generateSnippet(
      'Button',
      { variant: 'destructive', size: 'lg', disabled: true },
      'Delete',
    );
    expect(result).toBe('<Button disabled size="lg" variant="destructive">Delete</Button>');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/generate-snippet.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
/**
 * Generate a Svelte code snippet string for an auto-example.
 *
 * Produces clean, copy-paste-ready markup like:
 * `<Button variant="outline" disabled>Click</Button>`
 *
 * @param tagName - PascalCase component tag (e.g., "Button", "Input")
 * @param propOverrides - Props to render as attributes
 * @param slotContent - Optional text content for the default slot
 * @returns Formatted Svelte markup string
 */
export function generateSnippet(
  tagName: string,
  propOverrides: Record<string, unknown>,
  slotContent: string | undefined,
): string {
  const attrs: string[] = [];

  const sortedKeys: string[] = Object.keys(propOverrides).sort();
  for (const key of sortedKeys) {
    const val: unknown = propOverrides[key];
    if (val === false || val === undefined || val === null) continue;
    if (val === true) {
      attrs.push(key);
    } else if (typeof val === 'string') {
      attrs.push(`${key}="${val}"`);
    } else if (typeof val === 'number') {
      attrs.push(`${key}={${val}}`);
    } else {
      attrs.push(`${key}={${JSON.stringify(val)}}`);
    }
  }

  const attrStr: string = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

  if (slotContent) {
    return `<${tagName}${attrStr}>${slotContent}</${tagName}>`;
  }
  return `<${tagName}${attrStr} />`;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/generate-snippet.test.ts`
Expected: PASS

**Step 5: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/shared/ui/src/lens/generate-snippet.ts packages/shared/ui/src/lens/generate-snippet.test.ts
git commit -m "feat(lens): add code snippet generator for auto-examples"
```

---

### Task 3: Prop variation example generator

**Files:**
- Create: `packages/shared/ui/src/lens/generate-examples.ts`
- Create: `packages/shared/ui/src/lens/generate-examples.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { generateAutoExamples } from './generate-examples.js';
import type { PropMeta } from './types.js';
import type { AutoExample } from './types.js';

const buttonProps: PropMeta[] = [
  {
    name: 'variant',
    type: "'default' | 'destructive' | 'outline' | 'ghost'",
    default: "'default'",
    description: 'The visual variant.',
    bindable: false,
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    default: "'md'",
    description: 'Button size.',
    bindable: false,
  },
  {
    name: 'disabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables the button.',
    bindable: false,
  },
];

describe('generateAutoExamples', () => {
  it('generates one example per enum value for variant prop', () => {
    const examples: AutoExample[] = generateAutoExamples(buttonProps, 'Button');
    const variantExamples: AutoExample[] = examples.filter((e) => e.group === 'Variants');
    // Should have one per non-default value: destructive, outline, ghost
    expect(variantExamples.length).toBe(3);
    expect(variantExamples[0]?.title).toBe('Destructive');
    expect(variantExamples[0]?.propOverrides).toEqual({ variant: 'destructive' });
  });

  it('generates size grid example', () => {
    const examples: AutoExample[] = generateAutoExamples(buttonProps, 'Button');
    const sizeExamples: AutoExample[] = examples.filter((e) => e.group === 'Sizes');
    // Should have one per non-default size: sm, lg
    expect(sizeExamples.length).toBe(2);
  });

  it('generates boolean state examples', () => {
    const examples: AutoExample[] = generateAutoExamples(buttonProps, 'Button');
    const stateExamples: AutoExample[] = examples.filter((e) => e.group === 'States');
    expect(stateExamples.length).toBe(1); // disabled=true only (default is false)
    expect(stateExamples[0]?.propOverrides).toEqual({ disabled: true });
  });

  it('generates code snippets', () => {
    const examples: AutoExample[] = generateAutoExamples(buttonProps, 'Button');
    const first: AutoExample | undefined = examples[0];
    expect(first?.codeSnippet).toContain('<Button');
  });

  it('skips function-type props', () => {
    const propsWithFn: PropMeta[] = [
      ...buttonProps,
      {
        name: 'onclick',
        type: '() => void',
        default: '',
        description: 'Click handler.',
        bindable: false,
      },
    ];
    const examples: AutoExample[] = generateAutoExamples(propsWithFn, 'Button');
    const onclickExamples: AutoExample[] = examples.filter((e) =>
      e.id.includes('onclick'),
    );
    expect(onclickExamples.length).toBe(0);
  });

  it('caps total examples at MAX_AUTO_EXAMPLES', () => {
    // Create a component with many enum props to test the cap
    const manyProps: PropMeta[] = Array.from({ length: 10 }, (_, i) => ({
      name: `prop${i}`,
      type: "'a' | 'b' | 'c' | 'd' | 'e'",
      default: "'a'",
      description: `Prop ${i}.`,
      bindable: false,
    }));
    const examples: AutoExample[] = generateAutoExamples(manyProps, 'Widget');
    expect(examples.length).toBeLessThanOrEqual(25);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/generate-examples.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
/**
 * Auto-generate component examples from prop metadata.
 *
 * Analyzes PropMeta[] to produce AutoExample[] — standalone, titled renders
 * showing one meaningful configuration per example. Generates:
 * - One example per enum/picklist value (skipping the default)
 * - Size grid examples
 * - Boolean state examples (showing the non-default state)
 * - Combined state examples (disabled × variant)
 *
 * @param props - Extracted prop metadata from component source
 * @param tagName - PascalCase component name for code snippets (e.g., "Button")
 * @param existingExampleNames - Names of manual examples to avoid duplicating
 * @returns Array of auto-generated examples, capped at MAX_AUTO_EXAMPLES
 */
import type { AutoExample, PropMeta } from './types.js';
import { generateSnippet } from './generate-snippet.js';

/** Maximum number of auto-generated examples per component. */
const MAX_AUTO_EXAMPLES: number = 25;

/** Prop names that represent size variants — rendered as a group. */
const SIZE_PROP_NAMES: ReadonlySet<string> = new Set(['size']);

/** Prop names that represent visual variants — rendered individually. */
const VARIANT_PROP_NAMES: ReadonlySet<string> = new Set(['variant', 'color', 'intent', 'appearance']);

/**
 * Check if a type string represents a function type.
 *
 * @param type - Prop type string
 * @returns True if the type is a function/Snippet/Component
 */
function isFunctionType(type: string): boolean {
  return (
    type === 'Snippet' ||
    type === 'Component' ||
    type.includes(') =>')
  );
}

/**
 * Extract string literal options from a union type.
 *
 * @param type - Type string like "'a' | 'b' | 'c'"
 * @returns Array of option strings, or null if not a string literal union
 */
function parseUnionOptions(type: string): string[] | null {
  if (!type.includes(' | ')) return null;
  const parts: string[] = type.split(' | ').map((s) => s.trim());
  const options: string[] = [];
  for (const p of parts) {
    if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
      options.push(p.slice(1, -1));
    }
  }
  return options.length > 1 ? options : null;
}

/**
 * Convert a prop value to title case for display.
 *
 * @param value - Raw prop value string
 * @returns Title-cased string
 */
function toTitle(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Determine the default slot content for a given component.
 *
 * @param tagName - Component name
 * @returns Sensible default slot text
 */
function defaultSlotContent(tagName: string): string {
  const lower: string = tagName.toLowerCase();
  if (lower.includes('button')) return 'Click me';
  if (lower.includes('badge')) return 'Badge';
  if (lower.includes('label')) return 'Label';
  if (lower.includes('alert')) return 'This is an alert message.';
  if (lower.includes('link')) return 'Click here';
  return tagName;
}

export function generateAutoExamples(
  props: PropMeta[],
  tagName: string,
  existingExampleNames?: Set<string>,
): AutoExample[] {
  const examples: AutoExample[] = [];
  const existing: Set<string> = existingExampleNames ?? new Set();
  const slotText: string = defaultSlotContent(tagName);

  for (const prop of props) {
    if (!prop.type || isFunctionType(prop.type)) continue;
    if (examples.length >= MAX_AUTO_EXAMPLES) break;

    const defaultVal: string = prop.default
      ? prop.default.replaceAll("'", '').replaceAll('"', '')
      : '';

    // --- Enum/picklist props ---
    const options: string[] | null =
      prop.mockValues && prop.mockValues.length > 1
        ? prop.mockValues
        : parseUnionOptions(prop.typeDefinition ?? prop.type);

    if (options) {
      const isSize: boolean = SIZE_PROP_NAMES.has(prop.name);
      const isVariant: boolean = VARIANT_PROP_NAMES.has(prop.name);
      const group: string = isSize ? 'Sizes' : isVariant ? 'Variants' : 'Options';

      for (const opt of options) {
        if (opt === defaultVal) continue; // Skip default — already shown in preview
        const id: string = `${prop.name}-${opt}`;
        if (existing.has(id)) continue;
        if (examples.length >= MAX_AUTO_EXAMPLES) break;

        const overrides: Record<string, unknown> = { [prop.name]: opt };
        examples.push({
          id,
          title: toTitle(opt),
          description: `${tagName} with ${prop.name}="${opt}".`,
          group,
          propOverrides: overrides,
          codeSnippet: generateSnippet(tagName, overrides, slotText),
          slotContent: slotText,
        });
      }
      continue;
    }

    // --- Boolean props ---
    if (prop.type === 'boolean' || prop.type === 'Bool') {
      const nonDefault: boolean = defaultVal === 'true' ? false : true;
      const id: string = `${prop.name}-${nonDefault}`;
      if (existing.has(id)) continue;

      const overrides: Record<string, unknown> = { [prop.name]: nonDefault };
      examples.push({
        id,
        title: toTitle(prop.name),
        description: `${tagName} with ${prop.name}=${String(nonDefault)}.`,
        group: 'States',
        propOverrides: overrides,
        codeSnippet: generateSnippet(tagName, overrides, slotText),
        slotContent: slotText,
      });
    }
  }

  // --- Combined state examples (disabled × each variant) ---
  const disabledProp: PropMeta | undefined = props.find(
    (p) => p.name === 'disabled' && (p.type === 'boolean' || p.type === 'Bool'),
  );
  const variantProp: PropMeta | undefined = props.find(
    (p) => VARIANT_PROP_NAMES.has(p.name),
  );

  if (disabledProp && variantProp) {
    const variantOptions: string[] | null =
      variantProp.mockValues && variantProp.mockValues.length > 1
        ? variantProp.mockValues
        : parseUnionOptions(variantProp.typeDefinition ?? variantProp.type);

    if (variantOptions) {
      for (const opt of variantOptions) {
        if (examples.length >= MAX_AUTO_EXAMPLES) break;
        const id: string = `disabled-${variantProp.name}-${opt}`;
        if (existing.has(id)) continue;

        const overrides: Record<string, unknown> = {
          disabled: true,
          [variantProp.name]: opt,
        };
        examples.push({
          id,
          title: `Disabled ${toTitle(opt)}`,
          description: `Disabled ${tagName} with ${variantProp.name}="${opt}".`,
          group: 'Combined States',
          propOverrides: overrides,
          codeSnippet: generateSnippet(tagName, overrides, slotText),
          slotContent: slotText,
        });
      }
    }
  }

  return examples.slice(0, MAX_AUTO_EXAMPLES);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/generate-examples.test.ts`
Expected: PASS

**Step 5: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/shared/ui/src/lens/generate-examples.ts packages/shared/ui/src/lens/generate-examples.test.ts
git commit -m "feat(lens): add prop variation example generator"
```

---

### Task 4: Wire auto-examples into the component detail page

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

This is the integration task — imports the generator, calls it with existing prop data, and renders auto-examples in the Examples section alongside manual ones.

**Step 1: Add imports**

Near the top imports (around line 24), add:

```typescript
import { generateAutoExamples } from '@/ui/lens/generate-examples.js';
import type { AutoExample } from '@/ui/lens/types.js';
```

**Step 2: Add derived auto-examples computation**

After the `hasExamples` derived (around line 703), add:

```typescript
/** Auto-generated examples from prop analysis. */
const autoExamples: AutoExample[] = $derived.by((): AutoExample[] => {
  if (!props || props.length === 0 || !name) return [];
  const tag: Str = toTag(name);
  const manualNames: Set<Str> = new Set(lensExamples.map((e): Str => e.name));
  return generateAutoExamples(props, tag, manualNames) as AutoExample[];
});

/** Whether there are any examples (manual or auto). */
const hasAnyExamples: Bool = $derived(lensExamples.length > 0 || autoExamples.length > 0);
```

**Step 3: Update the Examples section count badge**

In the Examples section header (around line 3179), change the count from `lensExamples.length` to show total:

```svelte
{lensExamples.length + autoExamples.length}
```

**Step 4: Update the `hasExamples` check in the dropdown trigger**

Around line 3182, change `{#if hasExamples}` to `{#if hasAnyExamples}`.

**Step 5: Render auto-examples after manual examples**

Inside the `{#if sectionOpen.examples}` block (around line 3233), after the manual examples `{#each}` loop and before the `{:else}` empty state, add the auto-examples rendering:

```svelte
{#if autoExamples.length > 0}
  {@const groups = [...new Set(autoExamples.map((e) => e.group))]}
  {#each groups as group (group)}
    <div class="mt-6 first:mt-0">
      <h4 class="mb-3 text-sm font-medium text-muted-foreground">{group}</h4>
      <div class="space-y-4">
        {#each autoExamples.filter((e) => e.group === group) as example (example.id)}
          <div id="example-{example.id}" class="scroll-mt-60">
            <LensSection title={example.title} description={example.description}>
              <LensComponentRenderer
                component={PrimaryComponent}
                props={propsMeta}
                tagName={toTag(name)}
                componentName={name}
                codeText={example.codeSnippet}
                label={example.slotContent ?? 'Example'}
                contextWrapper={lensContextWrapper ?? undefined}
                sectionId="examples"
              />
            </LensSection>
          </div>
        {/each}
      </div>
    </div>
  {/each}
{/if}
```

**Step 6: Update the empty state condition**

Change the `{:else}` block (around line 3258) so it only shows when BOTH manual and auto examples are empty:

```svelte
{:else if lensExamples.length === 0 && autoExamples.length === 0}
```

**Step 7: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 8: Commit**

```bash
git add packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte
git commit -m "feat(lens): wire auto-generated examples into component detail page"
```

---

### Task 5: Pass prop overrides through LensComponentRenderer

**Files:**
- Modify: `packages/shared/ui/src/lens-component-renderer/LensComponentRenderer.svelte`

Currently `LensComponentRenderer` renders the component with `baseProps` (from defaults/mock values). Auto-examples need to override specific props. The component already accepts `props` (PropMeta[]) and builds `baseProps` from them — but we need a way to merge in the auto-example's `propOverrides`.

**Step 1: Add `propOverrides` to the schema**

In the `<script module>` section (around line 8), add to `LensComponentRendererPropsSchema`:

```typescript
/** Additional prop values to merge on top of base props. Used by auto-generated examples. */
propOverrides: v.optional(v.record(StrSchema, v.unknown())),
```

**Step 2: Destructure the new prop**

In the instance `<script>` (around line 180), add `propOverrides` to the destructuring:

```typescript
propOverrides,
```

**Step 3: Merge overrides into rendered props**

Find where `baseProps` is used to render the component (where `<Target {...baseProps} {...extraProps}>` appears). Add override merging:

```typescript
/** Effective base props — baseProps merged with any auto-example overrides. */
const effectiveBaseProps: Record<Str, unknown> = $derived(
  propOverrides ? { ...baseProps, ...propOverrides } : baseProps,
);
```

Then replace `{...baseProps}` with `{...effectiveBaseProps}` in the template where the Target component is rendered.

**Step 4: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared/ui/src/lens-component-renderer/LensComponentRenderer.svelte
git commit -m "feat(lens): add propOverrides support to LensComponentRenderer"
```

---

### Task 6: Update component detail page to pass propOverrides

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1: Update auto-example rendering**

In the auto-examples rendering added in Task 4, update the `LensComponentRenderer` call to pass `propOverrides`:

```svelte
<LensComponentRenderer
  component={PrimaryComponent}
  props={propsMeta}
  propOverrides={example.propOverrides}
  tagName={toTag(name)}
  componentName={name}
  codeText={example.codeSnippet}
  label={example.slotContent ?? 'Example'}
  contextWrapper={lensContextWrapper ?? undefined}
  sectionId="examples"
/>
```

**Step 2: Also add an "Auto-generated" badge**

Add a small badge to distinguish auto-examples from manual ones:

```svelte
<LensSection title={example.title} description={example.description}>
  {#snippet titleExtra()}
    <span class="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
      Auto
    </span>
  {/snippet}
  ...
</LensSection>
```

Note: Check if `LensSection` supports a `titleExtra` snippet. If not, add the badge inline after the title text in the template directly.

**Step 3: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte
git commit -m "feat(lens): pass propOverrides to auto-example renders"
```

---

### Task 7: Deduplication with manual examples + existing variants

**Files:**
- Modify: `packages/shared/ui/src/lens/generate-examples.ts`
- Modify: `packages/shared/ui/src/lens/generate-examples.test.ts`

**Step 1: Add deduplication test**

```typescript
it('skips examples that overlap with existing manual example names', () => {
  const existing: Set<string> = new Set(['variant-outline', 'disabled-true']);
  const examples: AutoExample[] = generateAutoExamples(buttonProps, 'Button', existing);
  const ids: string[] = examples.map((e) => e.id);
  expect(ids).not.toContain('variant-outline');
  expect(ids).not.toContain('disabled-true');
});
```

**Step 2: Add variant deduplication parameter**

Update `generateAutoExamples` signature to also accept variant keys already covered by the Variants section:

```typescript
export function generateAutoExamples(
  props: PropMeta[],
  tagName: string,
  existingExampleNames?: Set<string>,
  variantKeys?: Set<string>,
): AutoExample[]
```

Props that are already fully covered in the Variants section (i.e., the prop name appears in `variantKeys`) should be skipped from auto-example generation to avoid duplication. Add at the top of the prop loop:

```typescript
if (variantKeys?.has(prop.name)) continue;
```

**Step 3: Add test for variant deduplication**

```typescript
it('skips props already covered by variant keys', () => {
  const variantKeys: Set<string> = new Set(['variant', 'size']);
  const examples: AutoExample[] = generateAutoExamples(buttonProps, 'Button', undefined, variantKeys);
  const groups: string[] = examples.map((e) => e.group);
  expect(groups).not.toContain('Variants');
  expect(groups).not.toContain('Sizes');
  // But disabled should still be there
  expect(groups).toContain('States');
});
```

**Step 4: Run tests**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/generate-examples.test.ts`
Expected: PASS

**Step 5: Update the detail page to pass variant keys**

In `[name]/+page.svelte`, update the `autoExamples` derived to pass variant keys:

```typescript
const autoExamples: AutoExample[] = $derived.by((): AutoExample[] => {
  if (!props || props.length === 0 || !name) return [];
  const tag: Str = toTag(name);
  const manualNames: Set<Str> = new Set(lensExamples.map((e): Str => e.name));
  const varKeys: Set<Str> = new Set(allVariants.map((v): Str => v.key));
  return generateAutoExamples(props, tag, manualNames, varKeys) as AutoExample[];
});
```

**Step 6: Run QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/shared/ui/src/lens/generate-examples.ts packages/shared/ui/src/lens/generate-examples.test.ts packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte
git commit -m "feat(lens): deduplicate auto-examples against manual examples and variant keys"
```

---

### Task 8: Visual verification + final QA

**Step 1: Run full test suite**

Run: `pnpm qa:test`
Expected: All tests pass

**Step 2: Run full QA**

Run: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 3: Visual verification via Playwright MCP**

1. Ensure dev server is running: `pnpm --filter @storylyne/editor dev`
2. Navigate to a component with known props (e.g., Button at `http://localhost:5173/components/button`)
3. Scroll to Examples section
4. Verify: auto-generated examples appear with correct titles, working renders, and code snippets
5. Navigate to a component with manual examples (e.g., Card at `http://localhost:5173/components/card`)
6. Verify: manual examples appear first, auto-examples appear after with "Auto" badge, no duplicates
7. Take screenshots as proof

**Step 4: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "feat(lens): auto-generated prop variation examples — complete"
```
