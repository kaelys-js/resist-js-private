# Lens Component Conversion Prompt

Use this prompt when converting a component to full Lens compliance. Replace `{COMPONENT}` with the component name (e.g., "Blockquote").

---

Convert the `{COMPONENT}` component to full Lens compliance.

## Step 1: Research (READ ONLY — no code changes)

Do all of this before writing any code:

A. Read `LENS-COMPONENTS.md` — find the `{COMPONENT}` entry. Note every prop, sub-component, feature, and which libraries include it. If the entry doesn't exist, tell me and I'll provide the reference.

B. Read the existing component source at `packages/shared/ui/src/{component-dir}/` — read every `.svelte` file, the `lens.ts` if it exists, and any test files.

C. Read ALL Lens compatibility rules (R0–R22) from `packages/products/storylyne/editor/src/lib/config/lens-categories.ts` (the `LENS_RULE_NAMES` array). Check which rules the component currently violates.

D. Read `packages/shared/ui/src/lens/detect-accessibility.ts` — identify every accessibility rule that applies to this component type (ARIA pattern, keyboard, focus, contrast, motion, labels, touch targets, screen reader).

E. **Exhaustive library research** — use your full training knowledge AND web search to find `{COMPONENT}` across EVERY component library you know about. This is not optional. Do not skip libraries. Do not be lazy. For each library that has this component, note every prop, variant, feature, and accessibility pattern it offers. Libraries include but are NOT limited to:

   **React ecosystem:**
   - shadcn/ui, Radix UI, Base UI, Headless UI
   - Mantine, Chakra UI, Ant Design, Material UI (MUI)
   - Fluent UI, Carbon Design System, Adobe Spectrum
   - HeroUI (formerly NextUI), PrimeReact, Evergreen
   - Grommet, Rebass, Theme UI, Reakit
   - React Aria (Adobe), React Bootstrap, Reactstrap
   - Semantic UI React, Blueprint.js, Ring UI (JetBrains)
   - Ariakit, Catalyst (Tailwind Labs)

   **Svelte ecosystem:**
   - Bits UI, Melt UI, Skeleton UI, SvelteUI
   - Carbon Svelte, Svelte Headless UI, Svelte Radix
   - AgnosticUI, Svelte UX, Attractions, Smelte

   **Vue ecosystem:**
   - PrimeVue, Vuetify, Quasar, Element Plus
   - Naive UI, Ant Design Vue, Headless UI Vue
   - Oku UI, Radix Vue, Ark UI Vue

   **CSS/utility libraries:**
   - DaisyUI, Flowbite, Preline, HyperUI
   - Tailwind Plus, Tailwind UI, Meraki UI
   - Sapling UI, Ripple UI, Sailboat UI

   **Other frameworks:**
   - Ark UI, Park UI, Kobalte (Solid.js)
   - Angular Material, Angular CDK, PrimeNG
   - Ionic, Framework7

   **Design systems:**
   - Lightning Design System (Salesforce)
   - Polaris (Shopify), Paste (Twilio)
   - Primer (GitHub), Pajamas (GitLab)
   - Orbit (Kiwi), Garden (Zendesk)
   - Atlassian Design System
   - Gestalt (Pinterest), Base Web (Uber)

   For EACH library that includes this component: list every unique prop, variant, sub-component, and feature it offers that other libraries don't. The goal is to build the MOST COMPREHENSIVE version of this component that covers every feature from every library.

F. **Verify completeness** — before presenting the changelog, review your research and ask yourself: "Is there ANY library I skipped? ANY prop I missed? ANY variant I didn't check?" If the answer is yes, go back and check it. Do NOT present the changelog until you are confident you have covered every library.

G. Read `CLAUDE.md` for all coding standards (Result pattern, Valibot types, imports, JSDoc, etc.).

## Step 2: Present Full Changelog (MANDATORY — wait for approval)

**Group/compound components**: If research reveals a Group variant (e.g., AvatarGroup, ButtonGroup, CheckboxGroup), present it as a SECOND component in the same changelog. Each gets its own directory, `lens.ts`, `index.ts`, props schema, and full Lens treatment. Present both changelogs together for approval, implement both.

Present a single consolidated changelog covering EVERYTHING the component needs. Organize it as:

### Props (from LENS-COMPONENTS.md + library research)
List every prop the component should support with type, default, and description. Flag which ones are new vs already exist.

### Sub-components
List every sub-component (e.g., Accordion.Item, Accordion.Trigger) with their props.

### Features
List every feature: keyboard navigation keys, ARIA pattern, animation, controlled/uncontrolled, RTL, etc.

### Variants & Styles
List every visual variant from all libraries (e.g., bordered, ghost, shadow, flush, splitted).

### Lens Rule Fixes
For each of R0–R22 that currently fails, state what needs to change.

### Accessibility Fixes
For each applicable a11y rule, state what's needed (ARIA roles, keyboard handlers, focus management, screen reader text, contrast, reduced-motion, touch targets, labels).

### Files to Create/Modify
List every file with what happens to it (create, modify, delete).

**STOP HERE. Do not write any code until I approve the changelog.**

## Step 3: Implement (after approval only)

Follow these rules exactly:

### Component Source (`ComponentName.svelte`)
- Remove `<!-- @convert-to-lens -->` marker
- Svelte 5 runes only: `$props()`, `$state()`, `$derived()`, `$effect()`
- Props schema using `v.strictObject()` with `v.InferInput` (optional props for callers) and `v.InferOutput` (defaults filled in after validation)
- Every prop field has `/** JSDoc. @values example1, example2 */`
- **CRITICAL: `@values` for picklist/enum props must NOT have quotes** — write `@values default, solid, bordered` NOT `@values 'default', 'solid', 'bordered'`. The mock generator passes values literally; quotes become part of the string and fail schema validation.
- **CRITICAL: Set defaults in the Valibot schema** — use `v.optional(schema, defaultValue)` two-argument form so Valibot fills in defaults during `safeParse`. Example: `v.optional(v.picklist(['default', 'solid']), 'default')` and `v.optional(BoolSchema, false as Bool)`. This ensures defaults are applied to the rendered component. Export TWO types: `ComponentInputProps = v.InferInput<typeof Schema>` (all optional — for `$props()`) and `ComponentProps = v.InferOutput<typeof Schema>` (defaults filled in — after validation). Use `InputProps` for the `$props()` type and `Props` for the validated derived state.
- **NEVER use `@default` in JSDoc** — defaults are encoded in the schema via `v.optional(schema, defaultValue)`. The Lens system reads defaults from the schema, not from JSDoc tags. Do NOT add `@default` to any JSDoc comment.
- **CRITICAL: ALL props must be in the Valibot schema** — NEVER create a separate `type Props = SchemaProps & { extra }` extension. Snippets use `v.optional(v.custom<Snippet>(() => true))`. Callbacks use `v.optional(v.custom<() => void>(() => true))`. `children`, `icon`, `footer`, `onRemove` — ALL go in `v.strictObject()`. If a prop exists on the component, it MUST be in the schema. `v.strictObject()` rejects unknown keys, so any prop outside the schema will crash when parent components spread DOM attributes.
- Use `Str`, `Bool`, `Num` from `@/schemas/common` — never `string`, `boolean`, `number`
- Validate props with `safeParse` from `@/utils/result/safe` + `stripSvelteProps`
- Use `tv()` from `tailwind-variants` for all style variants — tag lens.ts with `tv-variant`
- Implement full keyboard navigation per the WAI-ARIA pattern for this component
- Add all ARIA attributes (`role`, `aria-*`, `data-state`, `data-disabled`, `data-orientation`)
- Support `prefers-reduced-motion` — disable animations when user prefers reduced motion
- Support RTL (`dir` prop) where applicable
- Support controlled + uncontrolled modes (value/defaultValue + onValueChange)
- **CRITICAL: Group/compound components get their own directory** — `AvatarGroup` → `packages/shared/ui/src/avatar-group/` with its own `AvatarGroup.svelte`, `lens.ts`, and `index.ts`. NEVER put a Group component inside the parent's directory (e.g., `avatar/AvatarGroup.svelte`). Each component needs its own Lens page, props table, compatibility check, and sidebar entry. Same applies to any compound variant: `ButtonGroup`, `CheckboxGroup`, `InputGroup`, etc.

### Metadata (`lens.ts`)
- Export `meta: LensMeta` with `category`, `tags` (include `tv-variant` if using `tv()`), `description`

### Tests (`ComponentName.test.ts`)
- Write tests FIRST (TDD) — watch fail, then implement, watch pass
- Test every prop effect on rendered output
- Test every variant class application
- Test keyboard navigation (simulate keydown events)
- Test ARIA attributes are present and correct
- Test focus management (focus trap, focus restore)
- Use `createTestHarness` from `@/config/test/harness`
- Use Valibot types in test files (`Str`, `Bool`, `Num`) — same standards as production

### QA After Every File
Run after creating or editing each file — no batching:
```
pnpm qa:type-check && pnpm qa:lint && pnpm qa:format
```

## Step 4: Verify Against Changelog

After implementation is complete:
- Re-read the approved changelog
- Check every single item was implemented
- Re-read every file you created/modified to confirm changes are present
- Run the full Lens compatibility check to verify R0–R22 all pass
- Document any deviations from the changelog and explain why

## Step 5: Commit

```
feat(ui): full Lens conversion for {COMPONENT} — R0-R22 compliant, a11y, all variants
```

## Skill & Verification Requirements

Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.
