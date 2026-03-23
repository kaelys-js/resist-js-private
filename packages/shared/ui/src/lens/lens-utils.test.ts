/**
 * Tests for lens-utils.ts — shared utility functions for the Lens documentation system.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import type { Str } from '@/schemas/common';
import {
  stripSvelteProps,
  extractDir,
  extractStem,
  toTitle,
  isInternalFile,
  findPrimaryKey,
  parseLensMeta,
  extractComponentDescription,
  computeLensCompatibility,
  type LensCompatibilityInput,
} from './lens-utils.js';

describe('stripSvelteProps', () => {
  it('removes children and child keys', () => {
    const props = { children: () => {}, child: () => {}, variant: 'default', size: 'sm' };
    const result = stripSvelteProps(props);
    expect(result).toEqual({ variant: 'default', size: 'sm' });
  });

  it('removes data-* attributes', () => {
    const props = { 'data-testid': 'btn', 'data-state': 'open', name: 'test' };
    const result = stripSvelteProps(props);
    expect(result).toEqual({ name: 'test' });
  });

  it('removes aria-* attributes', () => {
    const props = { 'aria-label': 'Close', 'aria-hidden': true, disabled: false };
    const result = stripSvelteProps(props);
    expect(result).toEqual({ disabled: false });
  });

  it('returns empty object when all props are internal', () => {
    const props = { children: () => {}, child: () => {}, 'data-x': 1, 'aria-y': 2 };
    const result = stripSvelteProps(props);
    expect(result).toEqual({});
  });

  it('preserves all normal props', () => {
    const props = { variant: 'outline', size: 'lg', disabled: true };
    const result = stripSvelteProps(props);
    expect(result).toEqual({ variant: 'outline', size: 'lg', disabled: true });
  });
});

describe('extractDir', () => {
  it('extracts directory from glob path', () => {
    expect(extractDir('/ui/button/button.svelte' as Str)).toBe('button');
  });

  it('extracts directory from nested path', () => {
    expect(extractDir('/ui/dialog/dialog-content.svelte' as Str)).toBe('dialog');
  });

  it('returns empty string for single segment', () => {
    expect(extractDir('file.svelte' as Str)).toBe('');
  });

  it('handles root-level path', () => {
    expect(extractDir('/file.svelte' as Str)).toBe('');
  });
});

describe('extractStem', () => {
  it('extracts filename without .svelte extension', () => {
    expect(extractStem('/ui/button/button.svelte' as Str)).toBe('button');
  });

  it('extracts stem from hyphenated filename', () => {
    expect(extractStem('/ui/dialog/dialog-content.svelte' as Str)).toBe('dialog-content');
  });

  it('returns filename as-is when no .svelte extension', () => {
    expect(extractStem('/ui/utils.ts' as Str)).toBe('utils.ts');
  });

  it('handles empty path', () => {
    expect(extractStem('' as Str)).toBe('');
  });
});

describe('toTitle', () => {
  it('converts kebab-case to Title Case', () => {
    expect(toTitle('help-tooltip' as Str)).toBe('Help Tooltip');
  });

  it('converts single word', () => {
    expect(toTitle('button' as Str)).toBe('Button');
  });

  it('handles dotted keys with · separator', () => {
    expect(toTitle('meta.category' as Str)).toBe('Meta · Category');
  });

  it('handles multiple hyphens', () => {
    expect(toTitle('alert-dialog-content' as Str)).toBe('Alert Dialog Content');
  });

  it('handles dotted keys with hyphens in segments', () => {
    expect(toTitle('config.font-size' as Str)).toBe('Config · Font Size');
  });
});

describe('isInternalFile', () => {
  it('returns true for Demo.svelte', () => {
    expect(isInternalFile('/ui/button/Demo.svelte' as Str)).toBe(true);
  });

  it('returns true for index.svelte', () => {
    expect(isInternalFile('/ui/dialog/index.svelte' as Str)).toBe(true);
  });

  it('returns false for normal component file', () => {
    expect(isInternalFile('/ui/button/button.svelte' as Str)).toBe(false);
  });

  it('returns false for hyphenated component file', () => {
    expect(isInternalFile('/ui/dialog/dialog-content.svelte' as Str)).toBe(false);
  });
});

describe('findPrimaryKey', () => {
  it('finds key matching directory name', () => {
    const sources: Record<Str, unknown> = {
      '/ui/button/button.svelte': '',
      '/ui/button/button-icon.svelte': '',
    };
    const key = findPrimaryKey('button' as Str, sources);
    expect(key).toBe('/ui/button/button.svelte');
  });

  it('falls back to first non-internal file when no name match', () => {
    const sources: Record<Str, unknown> = {
      '/ui/widget/widget-content.svelte': '',
      '/ui/widget/widget-trigger.svelte': '',
    };
    const key = findPrimaryKey('widget' as Str, sources);
    expect(key).toBe('/ui/widget/widget-content.svelte');
  });

  it('skips Demo and index files', () => {
    const sources: Record<Str, unknown> = {
      '/ui/card/Demo.svelte': '',
      '/ui/card/index.svelte': '',
      '/ui/card/card.svelte': '',
    };
    const key = findPrimaryKey('card' as Str, sources);
    expect(key).toBe('/ui/card/card.svelte');
  });

  it('returns undefined when no files match directory', () => {
    const sources: Record<Str, unknown> = {
      '/ui/other/other.svelte': '',
    };
    const key = findPrimaryKey('button' as Str, sources);
    expect(key).toBeUndefined();
  });
});

describe('parseLensMeta', () => {
  it('returns ok result for valid meta', () => {
    const result = parseLensMeta({
      category: 'form',
      tags: ['shadcn'],
      description: 'A button.',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.category).toBe('form');
    }
  });

  it('returns error result for invalid meta', () => {
    const result = parseLensMeta({ category: 'invalid', tags: [], description: '' });
    expect(result.ok).toBe(false);
  });

  it('returns error result for null input', () => {
    const result = parseLensMeta(null);
    expect(result.ok).toBe(false);
  });
});

describe('extractComponentDescription', () => {
  it('extracts first JSDoc line from script block', () => {
    const src = `<script lang="ts">
/**
 * A button component for user interactions.
 *
 * @example
 * <Button>Click</Button>
 */
let { variant }: Props = $props();
</script>` as Str;
    expect(extractComponentDescription(src)).toBe('A button component for user interactions.');
  });

  it('returns undefined when no JSDoc exists', () => {
    const src = `<script lang="ts">
let { variant }: Props = $props();
</script>` as Str;
    expect(extractComponentDescription(src)).toBeUndefined();
  });

  it('returns undefined for empty source', () => {
    expect(extractComponentDescription('' as Str)).toBeUndefined();
  });

  it('returns first non-empty line from JSDoc', () => {
    const src = `<script lang="ts">
/**
 *
 * Dependency tree visualization.
 */
const x = 1;
</script>` as Str;
    expect(extractComponentDescription(src)).toBe('Dependency tree visualization.');
  });
});

/**
 * Baseline valid input — all rules pass.
 *
 * @param overrides - Partial overrides for specific test scenarios
 * @returns Complete LensCompatibilityInput with defaults merged
 */
function baseInput(overrides: Partial<LensCompatibilityInput> = {}): LensCompatibilityInput {
    return {
      dir: 'button',
      source: `<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';

/** Props for Button. */
type ButtonProps = {
  /** The visual style. @values default, secondary */
  variant: Str;
};

const ButtonPropsSchema = v.strictObject({
  variant: v.optional(v.picklist(['default', 'secondary']), 'default'),
});
</script>
<script lang="ts">
/**
 * A clickable button with multiple styles.
 */
let {
  variant = 'default',
  ...restProps
}: ButtonProps = $props();
const raw = stripSvelteProps({variant});
const validated = safeParse(ButtonPropsSchema, raw);
</script>
<button {...restProps}>{variant}</button>`,
      hasLensTs: true,
      meta: { category: 'form', tags: ['shadcn', 'tv-variant'], description: 'A button.' },
      hasPrimary: true,
      props: [
        { name: 'variant', type: 'Str', default: "'default'", description: 'The visual style.', bindable: false, mockValues: ['default', 'secondary'] },
      ],
      hasVariants: true,
      hasExamples: false,
      usesTv: true,
      declaredExampleNames: [],
      existingExampleFiles: [],
      ...overrides,
    };
  }

describe('computeLensCompatibility', () => {
  it('returns compatible when all rules pass', () => {
    const result = computeLensCompatibility(baseInput());
    expect(result.compatible).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  // Rule 0: @convert-to-lens marker
  it('Rule 0: flags @convert-to-lens marker with auto-fail on structural rules', () => {
    const result = computeLensCompatibility(baseInput({
      source: '<!-- @convert-to-lens --><script lang="ts">const x = 1;</script>',
    }));
    expect(result.compatible).toBe(false);
    const rules = result.violations.map((v) => v.rule);
    expect(rules).toContain(0);
    // Auto-fails R1-R4, R12-R15, R18-R24
    expect(rules).toContain(1);
    expect(rules).toContain(2);
    expect(rules).toContain(3);
    expect(rules).toContain(4);
    expect(rules).toContain(12);
    expect(rules).toContain(13);
    expect(rules).toContain(14);
    expect(rules).toContain(15);
    expect(rules).toContain(18);
    expect(rules).toContain(19);
    expect(rules).toContain(20);
    expect(rules).toContain(21);
    expect(rules).toContain(22);
    expect(rules).toContain(23);
    expect(rules).toContain(24);
  });

  // Rule 1: @values on Str/Num fields
  it('Rule 1: flags Str field missing @values', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type TestProps = {
  /** The label. */
  label: Str;
};
const TestPropsSchema = v.strictObject({ label: v.optional(StrSchema, '') });
</script>
<script lang="ts">
/**
 * A test component.
 */
let { label = '', ...restProps }: TestProps = $props();
const raw = stripSvelteProps({label});
const validated = safeParse(TestPropsSchema, raw);
</script>
<span {...restProps}>{label}</span>`,
    }));
    const r1 = result.violations.filter((v) => v.rule === 1);
    expect(r1.length).toBeGreaterThan(0);
    expect(r1[0]!.message).toContain('missing @values');
  });

  // Rule 1: skips 'class' field
  it('Rule 1: skips class field', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type TestProps = {
  /** CSS class. */
  class: Str;
  /** The label. @values hello, world */
  label: Str;
};
const S = v.strictObject({ label: StrSchema });
</script>
<script lang="ts">
/** A test. */
let { label, ...restProps }: TestProps = $props();
const r = stripSvelteProps({label});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{label}</span>`,
    }));
    const r1 = result.violations.filter((v) => v.rule === 1);
    // 'class' should NOT be flagged
    for (const violation of r1) {
      expect(violation.message).not.toContain('.class');
    }
  });

  // Rule 2: inline object types in Props
  it('Rule 2: flags inline object type in Props', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type TestProps = {
  /** Config. @values x */
  config: {
    size: Str;
  };
};
const S = v.strictObject({});
</script>
<script lang="ts">
/** A test. */
let { config, ...restProps }: TestProps = $props();
const r = stripSvelteProps({config});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{config}</span>`,
    }));
    const r2 = result.violations.filter((v) => v.rule === 2);
    expect(r2.length).toBeGreaterThan(0);
    expect(r2[0]!.message).toContain('inline object type');
  });

  // Rule 3: JSDoc on type definition fields
  it('Rule 3: flags field missing JSDoc', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type TestProps = {
  label: Str;
};
const S = v.strictObject({});
</script>
<script lang="ts">
/** A test. */
let { label, ...restProps }: TestProps = $props();
const r = stripSvelteProps({label});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{label}</span>`,
    }));
    const r3 = result.violations.filter((v) => v.rule === 3);
    expect(r3.length).toBeGreaterThan(0);
    expect(r3[0]!.message).toContain('missing JSDoc');
  });

  // Rule 4: Component description JSDoc
  it('Rule 4: flags missing component description JSDoc', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type TestProps = {
  /** Label. @values x */
  label: Str;
};
const S = v.strictObject({});
</script>
<script lang="ts">
let { label, ...restProps }: TestProps = $props();
const r = stripSvelteProps({label});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{label}</span>`,
    }));
    const r4 = result.violations.filter((v) => v.rule === 4);
    expect(r4.length).toBeGreaterThan(0);
    expect(r4[0]!.message).toContain('Missing component description JSDoc');
  });

  // Rule 6: Missing lens.ts
  it('Rule 6: flags missing lens.ts', () => {
    const result = computeLensCompatibility(baseInput({ hasLensTs: false, meta: null }));
    const r6 = result.violations.filter((v) => v.rule === 6);
    expect(r6).toHaveLength(1);
    expect(r6[0]!.message).toBe('Missing lens.ts');
  });

  it('Rule 6: flags invalid lens.ts metadata', () => {
    const result = computeLensCompatibility(baseInput({ hasLensTs: true, meta: null }));
    const r6 = result.violations.filter((v) => v.rule === 6);
    expect(r6).toHaveLength(1);
    expect(r6[0]!.message).toBe('Invalid lens.ts metadata');
  });

  // Rule 7: JSDoc on extracted props
  it('Rule 7: flags prop missing JSDoc description', () => {
    const result = computeLensCompatibility(baseInput({
      props: [
        { name: 'variant', type: 'Str', default: '', description: '', bindable: false, mockValues: ['a'] },
      ],
    }));
    const r7 = result.violations.filter((v) => v.rule === 7);
    expect(r7).toHaveLength(1);
    expect(r7[0]!.message).toContain('missing JSDoc description');
  });

  // Rule 8: @values on Str/Num props
  it('Rule 8: flags Str prop missing @values', () => {
    const result = computeLensCompatibility(baseInput({
      props: [
        { name: 'label', type: 'Str', default: '', description: 'Label.', bindable: false },
      ],
    }));
    const r8 = result.violations.filter((v) => v.rule === 8);
    expect(r8).toHaveLength(1);
    expect(r8[0]!.message).toContain('missing @values');
  });

  it('Rule 8: does not flag prop with mockValues', () => {
    const result = computeLensCompatibility(baseInput({
      props: [
        { name: 'label', type: 'Str', default: '', description: 'Label.', bindable: false, mockValues: ['a', 'b'] },
      ],
    }));
    const r8 = result.violations.filter((v) => v.rule === 8);
    expect(r8).toHaveLength(0);
  });

  // Rule 9: No renderable content
  it('Rule 9: flags no renderable content', () => {
    const result = computeLensCompatibility(baseInput({
      props: [],
      hasVariants: false,
      hasExamples: false,
    }));
    const r9 = result.violations.filter((v) => v.rule === 9);
    expect(r9).toHaveLength(1);
    expect(r9[0]!.message).toContain('No renderable content');
  });

  it('Rule 9: passes when hasExamples is true', () => {
    const result = computeLensCompatibility(baseInput({
      props: [],
      hasVariants: false,
      hasExamples: true,
    }));
    const r9 = result.violations.filter((v) => v.rule === 9);
    expect(r9).toHaveLength(0);
  });

  // Rule 10: Directory name kebab-case
  it('Rule 10: flags non-kebab-case directory', () => {
    const result = computeLensCompatibility(baseInput({ dir: 'MyButton' }));
    const r10 = result.violations.filter((v) => v.rule === 10);
    expect(r10).toHaveLength(1);
  });

  it('Rule 10: passes for valid kebab-case', () => {
    const result = computeLensCompatibility(baseInput({ dir: 'alert-dialog' }));
    const r10 = result.violations.filter((v) => v.rule === 10);
    expect(r10).toHaveLength(0);
  });

  // Rule 11: Missing primary .svelte file
  it('Rule 11: flags missing primary .svelte file', () => {
    const result = computeLensCompatibility(baseInput({ hasPrimary: false }));
    const r11 = result.violations.filter((v) => v.rule === 11);
    expect(r11).toHaveLength(1);
  });

  // Rule 12: Missing v.strictObject()
  it('Rule 12: flags missing v.strictObject()', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
type Props = { /** X. @values a */ x: Str; };
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r12 = result.violations.filter((v) => v.rule === 12);
    expect(r12).toHaveLength(1);
  });

  // Rule 13: Bare v.object()
  it('Rule 13: flags bare v.object() usage', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({ x: v.object({ y: v.string() }) });
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
const r = stripSvelteProps({x});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r13 = result.violations.filter((v) => v.rule === 13);
    expect(r13).toHaveLength(1);
  });

  // Rule 14: Missing safeParse or stripSvelteProps
  it('Rule 14: flags missing safeParse when strictObject present', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({ x: StrSchema });
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
const r = stripSvelteProps({x});
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r14 = result.violations.filter((v) => v.rule === 14);
    expect(r14).toHaveLength(1);
    expect(r14[0]!.message).toContain('safeParse');
  });

  // Rule 15: Bare Valibot primitives in module script
  it('Rule 15: flags bare v.string() in module script', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({ x: v.string() });
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
const r = stripSvelteProps({x});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r15 = result.violations.filter((v) => v.rule === 15);
    expect(r15).toHaveLength(1);
    expect(r15[0]!.message).toContain('StrSchema');
  });

  it('Rule 15: flags bare v.boolean() in module script', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({ x: v.boolean() });
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
const r = stripSvelteProps({x});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r15 = result.violations.filter((v) => v.rule === 15);
    expect(r15).toHaveLength(1);
    expect(r15[0]!.message).toContain('BoolSchema');
  });

  // Rule 16: Example name mismatch
  it('Rule 16: flags declared example without matching file', () => {
    const result = computeLensCompatibility(baseInput({
      declaredExampleNames: ['basic', 'with-form'],
      existingExampleFiles: ['basic.svelte'],
    }));
    const r16 = result.violations.filter((v) => v.rule === 16);
    expect(r16).toHaveLength(1);
    expect(r16[0]!.message).toContain('with-form');
  });

  it('Rule 16: passes when all examples match', () => {
    const result = computeLensCompatibility(baseInput({
      declaredExampleNames: ['basic'],
      existingExampleFiles: ['basic.svelte'],
    }));
    const r16 = result.violations.filter((v) => v.rule === 16);
    expect(r16).toHaveLength(0);
  });

  // Rule 17: tv-variant tag
  it('Rule 17: flags uses tv() but no lens.ts', () => {
    const result = computeLensCompatibility(baseInput({
      usesTv: true,
      hasLensTs: false,
      meta: null,
    }));
    const r17 = result.violations.filter((v) => v.rule === 17);
    expect(r17).toHaveLength(1);
    expect(r17[0]!.message).toContain('no lens.ts');
  });

  it('Rule 17: flags uses tv() but missing tv-variant tag', () => {
    const result = computeLensCompatibility(baseInput({
      usesTv: true,
      meta: { category: 'form', tags: ['shadcn'], description: 'A button.' },
    }));
    const r17 = result.violations.filter((v) => v.rule === 17);
    expect(r17).toHaveLength(1);
    expect(r17[0]!.message).toContain('missing tv-variant tag');
  });

  it('Rule 17: passes when tv-variant tag present', () => {
    const result = computeLensCompatibility(baseInput({
      usesTv: true,
      meta: { category: 'form', tags: ['shadcn', 'tv-variant'], description: 'A button.' },
    }));
    const r17 = result.violations.filter((v) => v.rule === 17);
    expect(r17).toHaveLength(0);
  });

  it('Rule 17: not triggered when usesTv is false', () => {
    const result = computeLensCompatibility(baseInput({
      usesTv: false,
      meta: { category: 'form', tags: ['shadcn'], description: 'A button.' },
    }));
    const r17 = result.violations.filter((v) => v.rule === 17);
    expect(r17).toHaveLength(0);
  });

  // Rule 18: @values with quoted strings
  it('Rule 18: flags @values with quoted strings', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = {
  /** Label. @values 'hello', 'world' */
  label: Str;
};
const S = v.strictObject({});
</script>
<script lang="ts">
/** Test. */
let { label, ...restProps }: Props = $props();
const r = stripSvelteProps({label});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{label}</span>`,
    }));
    const r18 = result.violations.filter((v) => v.rule === 18);
    expect(r18).toHaveLength(1);
    expect(r18[0]!.message).toContain('quoted strings');
  });

  // Rule 19: v.optional() picklist/boolean without default
  it('Rule 19: flags v.optional(BoolSchema) without default', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({
  disabled: v.optional(BoolSchema)
});
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
const r = stripSvelteProps({x});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r19 = result.violations.filter((v) => v.rule === 19);
    expect(r19).toHaveLength(1);
  });

  // Rule 20: Missing ...restProps
  it('Rule 20: flags missing ...restProps', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({});
</script>
<script lang="ts">
/** Test. */
let { x }: Props = $props();
const r = stripSvelteProps({x});
const v2 = safeParse(S, r);
</script>
<span>{x}</span>`,
    }));
    const r20 = result.violations.filter((v) => v.rule === 20);
    expect(r20).toHaveLength(1);
  });

  // Rule 21: Root element must spread {...restProps}
  it('Rule 21: flags restProps not spread on root element', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({});
</script>
<script lang="ts">
/** Test. */
let { x, ...restProps }: Props = $props();
const r = stripSvelteProps({x});
const v2 = safeParse(S, r);
</script>
<span>{x}</span>`,
    }));
    const r21 = result.violations.filter((v) => v.rule === 21);
    expect(r21).toHaveLength(1);
    expect(r21[0]!.message).toContain('does not spread on root element');
  });

  // Rule 22: Snippet props through stripSvelteProps
  it('Rule 22: flags snippet props passed through stripSvelteProps', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({});
</script>
<script lang="ts">
/** Test. */
let { x, children, icon, ...restProps }: Props = $props();
const r = stripSvelteProps({x, children, icon});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>{x}</span>`,
    }));
    const r22 = result.violations.filter((v) => v.rule === 22);
    expect(r22).toHaveLength(1);
    expect(r22[0]!.message).toContain('children');
    expect(r22[0]!.message).toContain('icon');
  });

  // Rule 23: Dead props
  it('Rule 23: flags dead props in schema but never used', () => {
    const result = computeLensCompatibility(baseInput({
      source: `<script module lang="ts">
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
type Props = { /** X. @values a */ x: Str; };
const S = v.strictObject({});
</script>
<script lang="ts">
/** Test. */
let { ...restProps }: Props = $props();
const r = stripSvelteProps({});
const v2 = safeParse(S, r);
</script>
<span {...restProps}>hello</span>`,
      props: [
        { name: 'unusedProp', type: 'Str', default: '', description: 'X.', bindable: false, mockValues: ['a'] },
      ],
    }));
    const r23 = result.violations.filter((v) => v.rule === 23);
    expect(r23).toHaveLength(1);
    expect(r23[0]!.message).toContain('unusedProp');
  });

  it('Rule 23: does not flag class/children/child props', () => {
    const result = computeLensCompatibility(baseInput({
      props: [
        { name: 'class', type: 'Str', default: '', description: 'CSS.', bindable: false },
        { name: 'children', type: 'Snippet', default: '', description: 'Slot.', bindable: false },
        { name: 'child', type: 'Snippet', default: '', description: 'Child.', bindable: false },
      ],
    }));
    const r23 = result.violations.filter((v) => v.rule === 23);
    expect(r23).toHaveLength(0);
  });

  // Rule 24: Invalid @requires references
  it('Rule 24: flags @requires referencing non-existent prop', () => {
    const result = computeLensCompatibility(baseInput({
      props: [
        {
          name: 'radius',
          type: 'Str',
          default: '',
          description: 'Border radius.',
          bindable: false,
          mockValues: ['sm'],
          requires: [{ prop: 'nonexistent', value: 'true' }],
        },
      ],
    }));
    const r24 = result.violations.filter((v) => v.rule === 24);
    expect(r24).toHaveLength(1);
    expect(r24[0]!.message).toContain('nonexistent');
  });

  it('Rule 24: passes when @requires references valid prop', () => {
    const result = computeLensCompatibility(baseInput({
      props: [
        { name: 'variant', type: 'Str', default: "'default'", description: 'Style.', bindable: false, mockValues: ['a'] },
        { name: 'radius', type: 'Str', default: '', description: 'Radius.', bindable: false, mockValues: ['sm'], requires: [{ prop: 'variant', value: 'bordered' }] },
      ],
    }));
    const r24 = result.violations.filter((v) => v.rule === 24);
    expect(r24).toHaveLength(0);
  });
});
