# Auto-Generated Component Examples — Part 2: Compositional Recipe Examples

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-generate compositional recipe examples (login form in Card, form in Dialog, labeled Input, etc.) by detecting component category and composing with sibling components from the registry — matching the quality of shadcn's hand-crafted examples.

**Architecture:** A new `generate-recipes.ts` module in `packages/shared/ui/src/lens/` takes a component's `LensMeta` (category, tags) and the full registry of available components, then produces `AutoExample[]` using category-specific recipe templates. Recipes compose real sibling components (e.g., Card + Input + Label + Button) with realistic content. The detail page renders these alongside Part 1's prop variation examples.

**Tech Stack:** TypeScript, Valibot schemas, existing `LensMeta`/`AutoExample` types, `LensComponentRenderer`, Svelte 5

**Depends on:** Part 1 must be completed first (AutoExample schema, generateSnippet, detail page wiring).

**Key design decision:** Recipe templates generate Svelte markup strings (not live components). These are displayed as code snippets in `LensComponentRenderer` using the `codeText` prop. The live render uses `propOverrides` where possible, but compositional recipes that require multiple components are code-only (displayed but not live-rendered) — because dynamically composing arbitrary Svelte components at runtime without compilation is not possible. The code snippets are copy-paste ready.

**Alternative for live rendering:** For recipes that CAN be live-rendered (because the component has a `contextWrapper` or accepts rich slot content via props), we use `propOverrides` + `slotContent`. For truly compositional recipes (Card containing Input + Label), we generate the code snippet only — the user copies it to try it.

---

### Task 1: Component registry type + sibling discovery

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Create: `packages/shared/ui/src/lens/discover-siblings.ts`
- Create: `packages/shared/ui/src/lens/discover-siblings.test.ts`

**Step 1: Add ComponentRegistryEntry type**

In `types.ts`, add after `AutoExampleSchema`:

```typescript
/**
 * A registered component in the Lens system.
 *
 * Used by recipe generation to discover sibling components
 * available for composition.
 */
export const ComponentRegistryEntrySchema = v.strictObject({
  /** Component directory name (e.g., "button", "input"). */
  name: StrSchema,
  /** PascalCase display name (e.g., "Button", "Input"). */
  displayName: StrSchema,
  /** Import path (e.g., "@/ui/button"). */
  importPath: StrSchema,
  /** Component metadata. */
  meta: LensMetaSchema,
});
export type ComponentRegistryEntry = v.InferOutput<typeof ComponentRegistryEntrySchema>;
```

**Step 2: Write the failing test for discover-siblings**

```typescript
import { describe, it, expect } from 'vitest';
import { discoverSiblings } from './discover-siblings.js';
import type { ComponentRegistryEntry } from './types.js';

const registry: ComponentRegistryEntry[] = [
  { name: 'button', displayName: 'Button', importPath: '@/ui/button', meta: { category: 'form', tags: ['shadcn'], description: 'A button.' } },
  { name: 'input', displayName: 'Input', importPath: '@/ui/input', meta: { category: 'form', tags: ['shadcn'], description: 'A text input.' } },
  { name: 'label', displayName: 'Label', importPath: '@/ui/label', meta: { category: 'form', tags: ['shadcn'], description: 'A label.' } },
  { name: 'card', displayName: 'Card', importPath: '@/ui/card', meta: { category: 'layout', tags: ['shadcn', 'compound'], description: 'A card.' } },
  { name: 'dialog', displayName: 'Dialog', importPath: '@/ui/dialog', meta: { category: 'overlay', tags: ['shadcn', 'compound'], description: 'A dialog.' } },
  { name: 'textarea', displayName: 'Textarea', importPath: '@/ui/textarea', meta: { category: 'form', tags: ['shadcn'], description: 'A textarea.' } },
];

describe('discoverSiblings', () => {
  it('finds form inputs for layout container recipes', () => {
    const siblings = discoverSiblings('card', 'layout', registry);
    expect(siblings.formInputs.map((s) => s.name)).toContain('input');
    expect(siblings.formInputs.map((s) => s.name)).toContain('textarea');
    expect(siblings.hasButton).toBe(true);
    expect(siblings.hasLabel).toBe(true);
  });

  it('finds form inputs for overlay recipes', () => {
    const siblings = discoverSiblings('dialog', 'overlay', registry);
    expect(siblings.formInputs.length).toBeGreaterThan(0);
    expect(siblings.hasButton).toBe(true);
  });

  it('excludes self from siblings', () => {
    const siblings = discoverSiblings('button', 'form', registry);
    expect(siblings.formInputs.map((s) => s.name)).not.toContain('button');
  });
});
```

**Step 3: Write implementation**

```typescript
/**
 * Discover sibling components available for recipe composition.
 *
 * Scans the component registry to find components that can be
 * composed together in recipe examples — form inputs, buttons,
 * labels, etc.
 *
 * @param componentName - Current component's directory name (excluded from results)
 * @param category - Current component's LensCategory
 * @param registry - Full list of registered components
 * @returns Categorized siblings for recipe generation
 */
import type { ComponentRegistryEntry, LensCategory } from './types.js';

/** Sibling components available for recipe composition. */
export type SiblingComponents = {
  /** Form input components (Input, Textarea, Select, etc.). */
  formInputs: ComponentRegistryEntry[];
  /** Whether a Button component is available. */
  hasButton: boolean;
  /** Whether a Label component is available. */
  hasLabel: boolean;
  /** The Button entry, if available. */
  button: ComponentRegistryEntry | undefined;
  /** The Label entry, if available. */
  label: ComponentRegistryEntry | undefined;
};

/** Component names classified as form inputs. */
const FORM_INPUT_NAMES: ReadonlySet<string> = new Set([
  'input', 'textarea', 'select', 'checkbox', 'radio-group',
  'switch', 'slider', 'native-select', 'input-otp', 'color-picker',
]);

export function discoverSiblings(
  componentName: string,
  _category: LensCategory | string,
  registry: ComponentRegistryEntry[],
): SiblingComponents {
  const others: ComponentRegistryEntry[] = registry.filter(
    (c) => c.name !== componentName,
  );

  const formInputs: ComponentRegistryEntry[] = others.filter(
    (c) => FORM_INPUT_NAMES.has(c.name),
  );

  const button: ComponentRegistryEntry | undefined = others.find(
    (c) => c.name === 'button',
  );
  const label: ComponentRegistryEntry | undefined = others.find(
    (c) => c.name === 'label',
  );

  return {
    formInputs,
    hasButton: button !== undefined,
    hasLabel: label !== undefined,
    button,
    label,
  };
}
```

**Step 4: Run tests**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/discover-siblings.test.ts`
Expected: PASS

**Step 5: Run QA**

Run: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/shared/ui/src/lens/types.ts packages/shared/ui/src/lens/discover-siblings.ts packages/shared/ui/src/lens/discover-siblings.test.ts
git commit -m "feat(lens): add component registry type and sibling discovery"
```

---

### Task 2: Recipe template engine — layout containers

**Files:**
- Create: `packages/shared/ui/src/lens/recipes/layout-recipes.ts`
- Create: `packages/shared/ui/src/lens/recipes/layout-recipes.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { generateLayoutRecipes } from './layout-recipes.js';
import type { AutoExample, ComponentRegistryEntry } from '../types.js';
import type { SiblingComponents } from '../discover-siblings.js';

const siblings: SiblingComponents = {
  formInputs: [
    { name: 'input', displayName: 'Input', importPath: '@/ui/input', meta: { category: 'form', tags: ['shadcn'], description: 'Input.' } },
  ],
  hasButton: true,
  hasLabel: true,
  button: { name: 'button', displayName: 'Button', importPath: '@/ui/button', meta: { category: 'form', tags: ['shadcn'], description: 'Button.' } },
  label: { name: 'label', displayName: 'Label', importPath: '@/ui/label', meta: { category: 'form', tags: ['shadcn'], description: 'Label.' } },
};

describe('generateLayoutRecipes', () => {
  it('generates a form recipe for Card', () => {
    const recipes: AutoExample[] = generateLayoutRecipes('card', 'Card', siblings);
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]?.group).toBe('Recipes');
    expect(recipes[0]?.codeSnippet).toContain('Card');
    expect(recipes[0]?.codeSnippet).toContain('Input');
  });

  it('generates realistic content', () => {
    const recipes: AutoExample[] = generateLayoutRecipes('card', 'Card', siblings);
    // Should have form-like content, not lorem ipsum
    const snippet: string = recipes[0]?.codeSnippet ?? '';
    expect(snippet).toMatch(/Email|Name|Password|Settings|Profile/);
  });

  it('returns empty when no siblings available', () => {
    const empty: SiblingComponents = {
      formInputs: [],
      hasButton: false,
      hasLabel: false,
      button: undefined,
      label: undefined,
    };
    const recipes: AutoExample[] = generateLayoutRecipes('card', 'Card', empty);
    expect(recipes.length).toBe(0);
  });
});
```

**Step 2: Write implementation**

```typescript
/**
 * Generate compositional recipe examples for layout container components.
 *
 * Produces realistic form examples combining Card/Section with
 * available Input, Label, and Button siblings.
 *
 * @param componentName - Component directory name (e.g., "card")
 * @param displayName - PascalCase name (e.g., "Card")
 * @param siblings - Available sibling components
 * @returns Array of compositional AutoExample recipes
 */
import type { AutoExample } from '../types.js';
import type { SiblingComponents } from '../discover-siblings.js';

export function generateLayoutRecipes(
  componentName: string,
  displayName: string,
  siblings: SiblingComponents,
): AutoExample[] {
  const recipes: AutoExample[] = [];

  if (!siblings.hasButton || siblings.formInputs.length === 0) return recipes;

  const input = siblings.formInputs.find((c) => c.name === 'input');
  if (!input) return recipes;

  // Determine if this is a compound component (Card.Root, Card.Header, etc.)
  const isCompound: boolean = ['card', 'section'].includes(componentName);
  const ns: string = displayName; // e.g., "Card"

  if (isCompound) {
    // Recipe: Login/Settings form inside Card
    const imports: string[] = [
      `import * as ${ns} from '${getImportPath(componentName)}';`,
      `import Button from '${siblings.button?.importPath ?? '@/ui/button'}/button.svelte';`,
    ];

    if (siblings.hasLabel) {
      imports.push(`import Label from '${siblings.label?.importPath ?? '@/ui/label'}/label.svelte';`);
    }
    imports.push(`import Input from '${input.importPath}/input.svelte';`);

    const labelOpen: string = siblings.hasLabel ? '<Label>Email</Label>\n          ' : '';
    const labelOpen2: string = siblings.hasLabel ? '<Label>Password</Label>\n          ' : '';

    const snippet: string = `<script lang="ts">
  ${imports.join('\n  ')}
</script>

<${ns}.Root class="max-w-sm">
  <${ns}.Header>
    <${ns}.Title>Sign In</${ns}.Title>
    <${ns}.Description>Enter your credentials to continue.</${ns}.Description>
  </${ns}.Header>
  <${ns}.Content>
    <div class="grid gap-4">
      <div class="grid gap-2">
        ${labelOpen}<Input type="email" placeholder="name@example.com" />
      </div>
      <div class="grid gap-2">
        ${labelOpen2}<Input type="password" placeholder="••••••••" />
      </div>
    </div>
  </${ns}.Content>
  <${ns}.Footer>
    <Button class="w-full">Sign In</Button>
  </${ns}.Footer>
</${ns}.Root>`;

    recipes.push({
      id: 'recipe-login-form',
      title: 'Login Form',
      description: `A sign-in form composed with ${ns}, Input, Label, and Button.`,
      group: 'Recipes',
      propOverrides: {},
      codeSnippet: snippet,
    });

    // Recipe 2: Settings/profile card
    const settingsSnippet: string = `<script lang="ts">
  ${imports.join('\n  ')}
</script>

<${ns}.Root class="max-w-sm">
  <${ns}.Header>
    <${ns}.Title>Profile Settings</${ns}.Title>
    <${ns}.Description>Update your account information.</${ns}.Description>
  </${ns}.Header>
  <${ns}.Content>
    <div class="grid gap-4">
      <div class="grid gap-2">
        ${siblings.hasLabel ? '<Label>Display Name</Label>\n          ' : ''}<Input placeholder="Enter your name" />
      </div>
      <div class="grid gap-2">
        ${siblings.hasLabel ? '<Label>Username</Label>\n          ' : ''}<Input placeholder="@username" />
      </div>
    </div>
  </${ns}.Content>
  <${ns}.Footer class="flex justify-end">
    <Button variant="outline">Cancel</Button>
    <Button>Save Changes</Button>
  </${ns}.Footer>
</${ns}.Root>`;

    recipes.push({
      id: 'recipe-settings-form',
      title: 'Settings Form',
      description: `A profile settings form using ${ns} with editable fields.`,
      group: 'Recipes',
      propOverrides: {},
      codeSnippet: settingsSnippet,
    });
  }

  return recipes;
}

/**
 * Get the import path for a component.
 *
 * @param name - Component directory name
 * @returns Import path string
 */
function getImportPath(name: string): string {
  return `@/ui/${name}`;
}
```

**Step 3: Run tests**

Run: `pnpm qa:test --filter @/ui -- --run src/lens/recipes/layout-recipes.test.ts`
Expected: PASS

**Step 4: Run QA + Commit**

```bash
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
git add packages/shared/ui/src/lens/recipes/
git commit -m "feat(lens): add layout container recipe templates"
```

---

### Task 3: Recipe templates — overlays (Dialog, Sheet, AlertDialog, Drawer)

**Files:**
- Create: `packages/shared/ui/src/lens/recipes/overlay-recipes.ts`
- Create: `packages/shared/ui/src/lens/recipes/overlay-recipes.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { generateOverlayRecipes } from './overlay-recipes.js';
import type { AutoExample } from '../types.js';
import type { SiblingComponents } from '../discover-siblings.js';

const siblings: SiblingComponents = {
  formInputs: [
    { name: 'input', displayName: 'Input', importPath: '@/ui/input', meta: { category: 'form', tags: ['shadcn'], description: 'Input.' } },
  ],
  hasButton: true,
  hasLabel: true,
  button: { name: 'button', displayName: 'Button', importPath: '@/ui/button', meta: { category: 'form', tags: ['shadcn'], description: 'Button.' } },
  label: { name: 'label', displayName: 'Label', importPath: '@/ui/label', meta: { category: 'form', tags: ['shadcn'], description: 'Label.' } },
};

describe('generateOverlayRecipes', () => {
  it('generates form dialog recipe', () => {
    const recipes: AutoExample[] = generateOverlayRecipes('dialog', 'Dialog', siblings);
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]?.codeSnippet).toContain('Dialog');
    expect(recipes[0]?.codeSnippet).toContain('Input');
  });

  it('generates confirmation recipe for alert-dialog', () => {
    const recipes: AutoExample[] = generateOverlayRecipes('alert-dialog', 'AlertDialog', siblings);
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]?.codeSnippet).toContain('AlertDialog');
    expect(recipes[0]?.codeSnippet).toMatch(/delete|confirm|cancel/i);
  });

  it('generates sheet recipe', () => {
    const recipes: AutoExample[] = generateOverlayRecipes('sheet', 'Sheet', siblings);
    expect(recipes.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Write implementation**

Similar structure to layout-recipes but with overlay-specific patterns:
- **Dialog**: "Edit Profile" form dialog (Title + Description + Input fields + Save/Cancel)
- **AlertDialog**: "Delete Confirmation" (destructive action confirmation with warning text)
- **Sheet**: "Settings Panel" (side panel with form fields)
- **Drawer**: "Create New" (bottom drawer with form)

Each recipe generates a complete Svelte snippet with `<script>` imports and realistic markup.

**Step 3: Run tests, QA, commit**

```bash
pnpm qa:test --filter @/ui -- --run src/lens/recipes/overlay-recipes.test.ts
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
git add packages/shared/ui/src/lens/recipes/overlay-recipes.ts packages/shared/ui/src/lens/recipes/overlay-recipes.test.ts
git commit -m "feat(lens): add overlay recipe templates (dialog, alert-dialog, sheet, drawer)"
```

---

### Task 4: Recipe templates — form inputs

**Files:**
- Create: `packages/shared/ui/src/lens/recipes/form-recipes.ts`
- Create: `packages/shared/ui/src/lens/recipes/form-recipes.test.ts`

**Step 1: Write test + implementation**

Form input recipes compose the input with Label and optional helper text:
- **Input**: "Labeled Input" (Label + Input + helper text)
- **Select**: "Labeled Select" (Label + Select with options)
- **Textarea**: "Labeled Textarea" (Label + Textarea + character count)
- **Checkbox/Switch**: "With Description" (Checkbox + label + description text)
- **Slider**: "Range Slider" (Label + Slider + value display)

Each generates a complete snippet with `<script>` imports.

**Step 2: Run tests, QA, commit**

```bash
pnpm qa:test --filter @/ui -- --run src/lens/recipes/form-recipes.test.ts
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
git add packages/shared/ui/src/lens/recipes/form-recipes.ts packages/shared/ui/src/lens/recipes/form-recipes.test.ts
git commit -m "feat(lens): add form input recipe templates"
```

---

### Task 5: Recipe templates — navigation + display + feedback

**Files:**
- Create: `packages/shared/ui/src/lens/recipes/misc-recipes.ts`
- Create: `packages/shared/ui/src/lens/recipes/misc-recipes.test.ts`

Covers remaining categories:
- **navigation** (Tabs, Accordion, Breadcrumb): multi-section content with realistic tab labels
- **display** (Table, Badge, Avatar): populated data examples
- **feedback** (Alert, Toast/Sonner): contextual messages (info, success, warning, error variants)

**Step 1: Write tests + implementation**

**Step 2: Run tests, QA, commit**

```bash
pnpm qa:test --filter @/ui -- --run src/lens/recipes/misc-recipes.test.ts
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
git add packages/shared/ui/src/lens/recipes/misc-recipes.ts packages/shared/ui/src/lens/recipes/misc-recipes.test.ts
git commit -m "feat(lens): add navigation, display, and feedback recipe templates"
```

---

### Task 6: Recipe router — dispatch by category

**Files:**
- Create: `packages/shared/ui/src/lens/generate-recipes.ts`
- Create: `packages/shared/ui/src/lens/generate-recipes.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { generateRecipeExamples } from './generate-recipes.js';
import type { AutoExample, ComponentRegistryEntry, LensMeta } from './types.js';

const registry: ComponentRegistryEntry[] = [
  { name: 'button', displayName: 'Button', importPath: '@/ui/button', meta: { category: 'form', tags: ['shadcn'], description: 'Button.' } },
  { name: 'input', displayName: 'Input', importPath: '@/ui/input', meta: { category: 'form', tags: ['shadcn'], description: 'Input.' } },
  { name: 'label', displayName: 'Label', importPath: '@/ui/label', meta: { category: 'form', tags: ['shadcn'], description: 'Label.' } },
  { name: 'card', displayName: 'Card', importPath: '@/ui/card', meta: { category: 'layout', tags: ['shadcn', 'compound'], description: 'Card.' } },
  { name: 'dialog', displayName: 'Dialog', importPath: '@/ui/dialog', meta: { category: 'overlay', tags: ['shadcn', 'compound'], description: 'Dialog.' } },
];

describe('generateRecipeExamples', () => {
  it('generates layout recipes for Card', () => {
    const meta: LensMeta = { category: 'layout', tags: ['shadcn', 'compound'], description: 'Card.' };
    const recipes: AutoExample[] = generateRecipeExamples('card', 'Card', meta, registry);
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.every((r) => r.group === 'Recipes')).toBe(true);
  });

  it('generates overlay recipes for Dialog', () => {
    const meta: LensMeta = { category: 'overlay', tags: ['shadcn', 'compound'], description: 'Dialog.' };
    const recipes: AutoExample[] = generateRecipeExamples('dialog', 'Dialog', meta, registry);
    expect(recipes.length).toBeGreaterThan(0);
  });

  it('generates form recipes for Input', () => {
    const meta: LensMeta = { category: 'form', tags: ['shadcn'], description: 'Input.' };
    const recipes: AutoExample[] = generateRecipeExamples('input', 'Input', meta, registry);
    expect(recipes.length).toBeGreaterThan(0);
  });

  it('returns empty for components with no matching recipes', () => {
    const meta: LensMeta = { category: 'utility', tags: ['internal'], description: 'Utils.' };
    const recipes: AutoExample[] = generateRecipeExamples('utils', 'Utils', meta, registry);
    expect(recipes.length).toBe(0);
  });
});
```

**Step 2: Write implementation**

```typescript
/**
 * Generate compositional recipe examples by routing to category-specific generators.
 *
 * @param componentName - Component directory name
 * @param displayName - PascalCase component name
 * @param meta - Component's LensMeta (category, tags)
 * @param registry - Full component registry for sibling discovery
 * @returns Array of compositional AutoExample recipes
 */
import type { AutoExample, ComponentRegistryEntry, LensMeta } from './types.js';
import { discoverSiblings } from './discover-siblings.js';
import { generateLayoutRecipes } from './recipes/layout-recipes.js';
import { generateOverlayRecipes } from './recipes/overlay-recipes.js';
import { generateFormRecipes } from './recipes/form-recipes.js';
import { generateMiscRecipes } from './recipes/misc-recipes.js';

export function generateRecipeExamples(
  componentName: string,
  displayName: string,
  meta: LensMeta,
  registry: ComponentRegistryEntry[],
): AutoExample[] {
  const siblings = discoverSiblings(componentName, meta.category, registry);

  switch (meta.category) {
    case 'layout':
      return generateLayoutRecipes(componentName, displayName, siblings);
    case 'overlay':
      return generateOverlayRecipes(componentName, displayName, siblings);
    case 'form':
      return generateFormRecipes(componentName, displayName, siblings);
    case 'display':
    case 'navigation':
      return generateMiscRecipes(componentName, displayName, meta.category, siblings);
    default:
      return [];
  }
}
```

**Step 3: Run tests, QA, commit**

```bash
pnpm qa:test --filter @/ui -- --run src/lens/generate-recipes.test.ts
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
git add packages/shared/ui/src/lens/generate-recipes.ts packages/shared/ui/src/lens/generate-recipes.test.ts
git commit -m "feat(lens): add recipe router dispatching by component category"
```

---

### Task 7: Wire recipes into the component detail page

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1: Build the component registry from existing eager metadata**

The page already has `eagerLensMetas` (line ~130) which eagerly loads all `lens.ts` files. Build the registry from this:

```typescript
import { generateRecipeExamples } from '@/ui/lens/generate-recipes.js';
import type { ComponentRegistryEntry } from '@/ui/lens/types.js';

/** Build component registry from eagerly loaded lens metadata. */
const componentRegistry: ComponentRegistryEntry[] = $derived.by((): ComponentRegistryEntry[] => {
  const entries: ComponentRegistryEntry[] = [];
  for (const [path, mod] of Object.entries(eagerLensMetas)) {
    if (!mod.meta) continue;
    const dirName: Str = extractDir(path);
    if (!dirName) continue;
    entries.push({
      name: dirName,
      displayName: toTag(dirName),
      importPath: `@/ui/${dirName}` as Str,
      meta: mod.meta,
    });
  }
  return entries;
});
```

**Step 2: Generate recipe examples**

Add after the `autoExamples` derived:

```typescript
/** Compositional recipe examples from category-based templates. */
const recipeExamples: AutoExample[] = $derived.by((): AutoExample[] => {
  if (!lensMeta || !name) return [];
  return generateRecipeExamples(name, toTag(name), lensMeta, componentRegistry) as AutoExample[];
});
```

**Step 3: Combine all auto-examples**

```typescript
/** All auto-generated examples (prop variations + recipes). */
const allAutoExamples: AutoExample[] = $derived([...autoExamples, ...recipeExamples]);
```

Update references in the template from `autoExamples` to `allAutoExamples`.

**Step 4: Update the count badge and empty state checks**

Update badge count and `hasAnyExamples` to include recipe examples.

**Step 5: Run QA**

Run: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte
git commit -m "feat(lens): wire compositional recipe examples into detail page"
```

---

### Task 8: Recipe code-only rendering mode

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

Compositional recipes can't be live-rendered (they compose multiple components). They should display as code-only cards — showing the Svelte snippet with syntax highlighting but no live preview area.

**Step 1: Detect code-only examples**

Recipe examples have empty `propOverrides` (`{}`). Use this to detect code-only mode:

```typescript
{@const isCodeOnly = Object.keys(example.propOverrides).length === 0 && example.group === 'Recipes'}
```

**Step 2: Render code-only cards differently**

For code-only examples, render a `CodeBlock` with the snippet instead of `LensComponentRenderer`:

```svelte
{#if isCodeOnly}
  <LensSection title={example.title} description={example.description}>
    <div class="rounded-lg border bg-card">
      <CodeBlock code={example.codeSnippet} lang="svelte" />
    </div>
  </LensSection>
{:else}
  <LensSection title={example.title} description={example.description}>
    <LensComponentRenderer ... />
  </LensSection>
{/if}
```

**Step 3: Run QA + Commit**

```bash
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
git add packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte
git commit -m "feat(lens): add code-only rendering mode for compositional recipe examples"
```

---

### Task 9: Visual verification + final QA

**Step 1: Run full test suite**

Run: `pnpm qa:test`
Expected: All tests pass

**Step 2: Run full QA**

Run: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
Expected: PASS

**Step 3: Visual verification via Playwright MCP**

1. Navigate to Card component → verify login form and settings form recipes appear in Examples
2. Navigate to Dialog component → verify form dialog recipe appears
3. Navigate to Button component → verify prop variation examples appear (no recipes since form inputs don't get layout recipes)
4. Navigate to Input component → verify labeled input recipe appears
5. Check that manual examples still appear and are not duplicated
6. Verify code snippets are copy-paste ready with correct import paths
7. Take screenshots as proof

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(lens): compositional recipe examples — complete"
```
