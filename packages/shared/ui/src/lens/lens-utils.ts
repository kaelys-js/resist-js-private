/**
 * Shared utility functions for the Lens component documentation system.
 *
 * Provides directory/file extraction helpers and text transformation
 * used by both the Lens layout sidebar and component detail pages.
 */
import * as v from 'valibot';
import { NumSchema, StrSchema, type Num, type Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { type LensMeta, LensMetaSchema, type PropMeta } from './types.js';

/** Svelte-internal prop names stripped before schema validation. */
const STRIP_KEYS: ReadonlySet<Str> = new Set(['children', 'child']);

/**
 * Strip Svelte-internal props (children, child) from a raw props object.
 *
 * Svelte 5 injects `children` (default slot snippet) and `child` (shadcn snippet
 * pattern) into props. These must be removed before `v.strictObject()` validation
 * since the component schemas don't include them.
 *
 * @param props - The raw $props() object
 * @returns A shallow copy with Svelte-internal keys removed
 *
 * @example
 * ```typescript
 * const allProps: MyProps = $props();
 * const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
 * const validated = safeParse(MySchema, rawProps);
 * ```
 */
export function stripSvelteProps<T extends Record<Str, unknown>>(props: T): T {
  const result: Record<Str, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (STRIP_KEYS.has(key)) {
      continue;
    }
    if (key.startsWith('$$')) {
      continue;
    }
    if (key.startsWith('data-') || key.startsWith('aria-')) {
      continue;
    }
    result[key] = value;
  }
  return result as T;
}

/**
 * Extract directory name from a glob key like `.../button/button.svelte`.
 *
 * @param key - Glob-resolved module path
 * @returns The directory name segment, or empty string if unmatched
 *
 * @example
 * ```typescript
 * extractDir('/ui/button/button.svelte'); // 'button'
 * extractDir('/ui/dialog/dialog-content.svelte'); // 'dialog'
 * ```
 */
export function extractDir(key: Str): Str {
  const parts: Str[] = key.split('/');
  return parts.at(-2) ?? '';
}

/**
 * Extract filename stem from a glob key (without extension).
 *
 * @param key - Glob-resolved module path
 * @returns The filename without `.svelte` extension
 *
 * @example
 * ```typescript
 * extractStem('/ui/button/button.svelte'); // 'button'
 * extractStem('/ui/dialog/dialog-content.svelte'); // 'dialog-content'
 * ```
 */
export function extractStem(key: Str): Str {
  const file: Str = key.split('/').pop() ?? '';
  return file.replace(/\.svelte$/, '');
}

/**
 * Convert kebab-case to Title Case for display.
 *
 * @param name - A kebab-case string like `help-tooltip`
 * @returns Title-cased string like `Help Tooltip`
 *
 * @example
 * ```typescript
 * toTitle('help-tooltip'); // 'Help Tooltip'
 * toTitle('button'); // 'Button'
 * ```
 */
export function toTitle(name: Str): Str {
  // Handle dotted keys: meta.category → Meta · Category
  if (name.includes('.')) {
    return name
      .split('.')
      .map((part: Str): Str => toTitle(part))
      .join(' · ');
  }
  return name
    .split('-')
    .map((w: Str): Str => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Check if a glob key is an internal file to skip (Demo, index).
 *
 * @param key - Glob-resolved module path
 * @returns True if the file should be skipped
 */
export function isInternalFile(key: Str): boolean {
  const stem: Str = extractStem(key);
  return stem === 'Demo' || stem === 'index';
}

/**
 * Find the primary source key for a component directory.
 *
 * Prefers the file matching the directory name (e.g., `button/button.svelte`),
 * then falls back to the first non-internal `.svelte` file in the directory.
 *
 * @param dir - Component directory name
 * @param rawSources - Record of glob-resolved paths to raw source strings
 * @returns The glob key, or undefined if no match
 *
 * @example
 * ```typescript
 * findPrimaryKey('button', rawSources); // '/ui/button/button.svelte'
 * ```
 */
export function findPrimaryKey(dir: Str, rawSources: Record<Str, unknown>): Str | undefined {
  const keys: Str[] = Object.keys(rawSources).filter(
    (k: Str): boolean => extractDir(k) === dir && !isInternalFile(k),
  );
  return keys.find((k: Str): boolean => extractStem(k) === dir) ?? keys[0];
}

/**
 * Validate raw lens.ts metadata against LensMetaSchema.
 *
 * Returns `Result<LensMeta>` — callers propagate errors via the Result pattern.
 *
 * @param raw - The raw meta export from a lens.ts module
 * @returns Validated LensMeta on success, or AppError on failure
 */
export function parseLensMeta(raw: unknown): Result<LensMeta> {
  return safeParse(LensMetaSchema, raw);
}

/** Regex to capture the first JSDoc block inside `<script lang="ts">`. */
const INSTANCE_JSDOC_RE: RegExp = /<script\s+lang="ts">\s*\/\*\*\s*([\s\S]*?)\*\//;

/**
 * Extract the component-level JSDoc description from a raw `.svelte` source.
 *
 * Looks for the first `/** ... *​/` block immediately after `<script lang="ts">`
 * and returns the first sentence (the summary line).
 *
 * @param src - Raw `.svelte` file content
 * @returns The JSDoc summary, or undefined if none found
 *
 * @example
 * ```typescript
 * extractComponentDescription(raw); // 'Dependency tree visualization for Lens documentation pages.'
 * ```
 */
export function extractComponentDescription(src: Str): Str | undefined {
  const match: RegExpExecArray | null = INSTANCE_JSDOC_RE.exec(src);
  if (!match?.[1]) {
    return undefined;
  }
  const firstLine: Str | undefined = match[1]
    .split('\n')
    .map((l: Str): Str => l.replace(/^\s*\*\s?/, '').trim())
    .find((l: Str): boolean => l.length > 0);
  return firstLine;
}

/* ------------------------------------------------------------------ */
/*  Lens Compatibility                                                 */
/* ------------------------------------------------------------------ */

/**
 * A single lint violation found during compatibility checking.
 */
export const LensViolationSchema = v.strictObject({
  /** Rule number (1–17) matching lint-lens.test.ts numbering. @values 1, 6, 9, 12 */
  rule: NumSchema,
  /** Human-readable description of the violation. @values Missing lens.ts, Needs @convert-to-lens conversion */
  message: StrSchema,
});
export type LensViolation = v.InferOutput<typeof LensViolationSchema>;

/**
 * Compatibility result for a single component, computed from the 17 lint rules.
 */
export const LensCompatibilitySchema = v.strictObject({
  /** Whether the component passes all lint rules. @values true, false */
  compatible: v.boolean(),
  /** List of lint rule violations found. @values [] */
  violations: v.array(LensViolationSchema),
});
export type LensCompatibility = v.InferOutput<typeof LensCompatibilitySchema>;

/** Kebab-case validation regex matching lint rule 10. */
const KEBAB_RE: RegExp = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Bare Valibot primitive regex matching lint rule 15. */
const BARE_PRIMITIVE_RE: RegExp = /v\.(string|boolean|number)\s*\(\s*\)/;

/** Props excluded from @values checks — CSS passthrough. */
const SKIP_VALUES_FIELDS: ReadonlySet<Str> = new Set(['class']);

/** A named type definition block extracted from source. */
type TypeBlock = { name: Str; body: Str };

/**
 * Find matching closing brace for an opening brace.
 *
 * @param source - Full source code string
 * @param openIdx - Index of the opening brace
 * @returns Index of the matching closing brace, or -1
 */
function matchBrace(source: Str, openIdx: Num): Num {
  let depth: Num = 0 as Num;
  let inStr: Str | null = null;

  for (let i: Num = openIdx; (i as number) < source.length; i = ((i as number) + 1) as Num) {
    const ch: Str = source[i as number] ?? '';
    const prev: Str = source[(i as number) - 1] ?? '';

    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
      inStr = ch;
      continue;
    }
    if (inStr && ch === inStr && prev !== '\\') {
      inStr = null;
      continue;
    }
    if (inStr) {
      continue;
    }

    if (ch === '{') {
      depth = ((depth as number) + 1) as Num;
    } else if (ch === '}') {
      depth = ((depth as number) - 1) as Num;
      if ((depth as number) === 0) {
        return i;
      }
    }
  }

  return -1 as Num;
}

/**
 * Extract all `type X = { ... }` blocks from source (handles intersection types).
 *
 * @param source - Full source code string
 * @returns Array of extracted type blocks
 */
function findTypeBlocks(source: Str): TypeBlock[] {
  const blocks: TypeBlock[] = [];
  const regex: RegExp = /type\s+(\w+)\s*=/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    const name: Str = (match[1] ?? '') as Str;
    const afterEq: Num = ((match.index ?? 0) + match[0].length) as Num;

    let depth: Num = 0 as Num;
    let braceIdx: Num = -1 as Num;
    for (let i: Num = afterEq; (i as number) < source.length; i = ((i as number) + 1) as Num) {
      const ch: Str = source[i as number] ?? '';
      if (ch === '<' || ch === '(') {
        depth = ((depth as number) + 1) as Num;
      } else if (ch === '>' || ch === ')') {
        depth = ((depth as number) - 1) as Num;
      } else if (ch === '{' && (depth as number) === 0) {
        braceIdx = i;
        break;
      } else if (ch === ';' && (depth as number) === 0) {
        break;
      }
    }

    if ((braceIdx as number) === -1) {
      continue;
    }
    const closeIdx: Num = matchBrace(source, braceIdx);
    if ((closeIdx as number) === -1) {
      continue;
    }
    blocks.push({
      name,
      body: source.slice((braceIdx as number) + 1, closeIdx as number) as Str,
    });
  }

  return blocks;
}

/** Parsed field info from a type block. */
type FieldInfo = { name: Str; type: Str; jsdoc: Str };

/**
 * Parse top-level fields from a type block body.
 *
 * @param body - The inner content of a type block (between braces)
 * @returns Array of parsed field info
 */
function parseFields(body: Str): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const lines: Str[] = body.split('\n');
  let pendingJSDoc: Str = '' as Str;
  let inJSDoc: boolean = false;
  let jsdocBuf: Str[] = [];
  let skipDepth: Num = 0 as Num;

  for (const line of lines) {
    const t: Str = line.trim() as Str;
    if (!t) {
      continue;
    }

    if ((skipDepth as number) > 0) {
      for (const ch of t) {
        if (ch === '{' || ch === '(') {
          skipDepth = ((skipDepth as number) + 1) as Num;
        } else if (ch === '}' || ch === ')') {
          skipDepth = ((skipDepth as number) - 1) as Num;
        }
      }
      if ((skipDepth as number) <= 0) {
        skipDepth = 0 as Num;
        pendingJSDoc = '' as Str;
      }
      continue;
    }

    if (t.startsWith('/**') && !t.endsWith('*/')) {
      inJSDoc = true;
      jsdocBuf = [];
      const after: Str = t.slice(3).trim() as Str;
      if (after) {
        jsdocBuf.push(after);
      }
      continue;
    }

    if (inJSDoc) {
      if (t.endsWith('*/')) {
        const before: Str = t
          .slice(0, -2)
          .replace(/^\*\s*/, '')
          .trim() as Str;
        if (before) {
          jsdocBuf.push(before);
        }
        pendingJSDoc = jsdocBuf.filter(Boolean).join(' ') as Str;
        inJSDoc = false;
        jsdocBuf = [];
      } else {
        const content: Str = t.replace(/^\*\s*/, '').trim() as Str;
        if (content) {
          jsdocBuf.push(content);
        }
      }
      continue;
    }

    const singleMatch: RegExpMatchArray | null = t.match(/^\/\*\*\s*(.*?)\s*\*\/$/);
    if (singleMatch) {
      pendingJSDoc = (singleMatch[1] ?? '') as Str;
      continue;
    }

    if (t.startsWith('[')) {
      pendingJSDoc = '' as Str;
      continue;
    }

    const fieldMatch: RegExpMatchArray | null = t.match(/^(\w+)\??\s*:\s*(.+?)\s*[;,]?\s*$/);
    if (fieldMatch) {
      const fieldName: Str = (fieldMatch[1] ?? '') as Str;
      const fieldType: Str = (fieldMatch[2] ?? '').trim() as Str;

      let bal: Num = 0 as Num;
      for (const ch of fieldType) {
        if (ch === '{' || ch === '(') {
          bal = ((bal as number) + 1) as Num;
        } else if (ch === '}' || ch === ')') {
          bal = ((bal as number) - 1) as Num;
        }
      }
      if ((bal as number) > 0) {
        skipDepth = bal;
        pendingJSDoc = '' as Str;
        continue;
      }

      fields.push({ name: fieldName, type: fieldType, jsdoc: pendingJSDoc });
      pendingJSDoc = '' as Str;
      continue;
    }

    let lineBal: Num = 0 as Num;
    for (const ch of t) {
      if (ch === '{' || ch === '(') {
        lineBal = ((lineBal as number) + 1) as Num;
      } else if (ch === '}' || ch === ')') {
        lineBal = ((lineBal as number) - 1) as Num;
      }
    }
    if ((lineBal as number) > 0) {
      skipDepth = lineBal;
    }
    pendingJSDoc = '' as Str;
  }

  return fields;
}

/**
 * Input data for computing Lens compatibility of a single component.
 *
 * All fields come from data already available at layout load time
 * (glob results, extracted props/variants, metadata).
 */
export const LensCompatibilityInputSchema = v.strictObject({
  /** Component directory name (kebab-case). @values button, alert-dialog */
  dir: StrSchema,
  /** Raw `.svelte` source of the primary component file, or empty if missing. @values <script>... */
  source: StrSchema,
  /** Whether a `lens.ts` file exists for this component. @values true, false */
  hasLensTs: v.boolean(),
  /** Validated LensMeta from lens.ts, or null if missing/invalid. @values null */
  meta: v.nullable(v.lazy(() => LensMetaSchema)),
  /** Whether the primary .svelte file exists. @values true, false */
  hasPrimary: v.boolean(),
  /** Extracted props from the primary component. @values [] */
  props: v.array(v.lazy(() => v.any())),
  /** Whether the component has TV variants. @values true, false */
  hasVariants: v.boolean(),
  /** Whether the component has hand-written examples. @values true, false */
  hasExamples: v.boolean(),
  /** Whether any .svelte file in the directory uses `tv()`. @values true, false */
  usesTv: v.boolean(),
  /** Example names declared in lens.ts. @values basic, with-form */
  declaredExampleNames: v.array(StrSchema),
  /** Example .svelte filenames that exist on the filesystem. @values basic.svelte */
  existingExampleFiles: v.array(StrSchema),
});
export type LensCompatibilityInput = v.InferOutput<typeof LensCompatibilityInputSchema>;

/**
 * Compute Lens compatibility for a single component by running all 17 lint rules.
 *
 * Returns a list of violations. An empty violations array means the component
 * is fully compatible. This mirrors the logic in `lint-lens.test.ts` but runs
 * in the browser at layout load time using already-available data.
 *
 * @param input - Component data for rule checking
 * @returns Compatibility result with violations list
 *
 * @example
 * ```typescript
 * const result = computeLensCompatibility({
 *   dir: 'button', source: rawSrc, hasLensTs: true, meta: lensMeta,
 *   hasPrimary: true, props: extractedProps, hasVariants: true,
 *   hasExamples: false, usesTv: true, declaredExampleNames: [],
 *   existingExampleFiles: [],
 * });
 * if (!result.compatible) console.log(result.violations);
 * ```
 */
export function computeLensCompatibility(input: LensCompatibilityInput): LensCompatibility {
  const violations: LensViolation[] = [];
  const hasConvertMarker: boolean = input.source.includes('@convert-to-lens');

  // If marked @convert-to-lens, that alone is a violation — plus auto-fail structural rules
  if (hasConvertMarker) {
    violations.push({
      rule: 0 as Num,
      message: 'Needs Lens conversion (@convert-to-lens)' as Str,
    });
    // R1-R4 require proper type blocks which placeholder components lack
    violations.push({
      rule: 1 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    violations.push({
      rule: 2 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    violations.push({
      rule: 3 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    violations.push({
      rule: 4 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    // R12-R15 require v.strictObject/safeParse which placeholder components lack
    violations.push({
      rule: 12 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    violations.push({
      rule: 13 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    violations.push({
      rule: 14 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
    violations.push({
      rule: 15 as Num,
      message: 'Skipped — needs Lens conversion first' as Str,
    });
  }

  // Rules 1–4: Type block checks — skip if @convert-to-lens (already auto-failed above)
  if (!hasConvertMarker && input.source) {
    // Rule 1: @values on Str/Num fields in type definitions
    const r1Blocks: TypeBlock[] = findTypeBlocks(input.source);
    for (const block of r1Blocks) {
      for (const field of parseFields(block.body)) {
        if (
          (field.type === 'Str' || field.type === 'Num') &&
          !field.jsdoc.includes('@values') &&
          !SKIP_VALUES_FIELDS.has(field.name)
        ) {
          violations.push({
            rule: 1 as Num,
            message: `${block.name}.${field.name} missing @values` as Str,
          });
        }
      }
    }

    // Rule 2: No inline object types in Props
    const r2Blocks: TypeBlock[] = findTypeBlocks(input.source);
    for (const block of r2Blocks) {
      if (!block.name.endsWith('Props')) {
        continue;
      }
      const lines: Str[] = block.body.split('\n');
      let skipDepth: Num = 0 as Num;
      for (const line of lines) {
        const t: Str = line.trim() as Str;
        if (!t) {
          continue;
        }
        if ((skipDepth as number) > 0) {
          for (const ch of t) {
            if (ch === '{' || ch === '(') {
              skipDepth = ((skipDepth as number) + 1) as Num;
            } else if (ch === '}' || ch === ')') {
              skipDepth = ((skipDepth as number) - 1) as Num;
            }
          }
          continue;
        }
        const fieldMatch: RegExpMatchArray | null = t.match(/^(\w+)\??\s*:\s*\{/);
        if (fieldMatch) {
          violations.push({
            rule: 2 as Num,
            message: `${block.name}.${fieldMatch[1]} uses inline object type` as Str,
          });
          skipDepth = 1 as Num;
        }
      }
    }

    // Rule 3: JSDoc on every type definition field
    const r3Blocks: TypeBlock[] = findTypeBlocks(input.source);
    for (const block of r3Blocks) {
      for (const field of parseFields(block.body)) {
        if (!field.jsdoc) {
          violations.push({
            rule: 3 as Num,
            message: `${block.name}.${field.name} missing JSDoc` as Str,
          });
        }
      }
    }

    // Rule 4: Component description JSDoc
    const r4Blocks: TypeBlock[] = findTypeBlocks(input.source);
    if (r4Blocks.length > 0) {
      const scriptMatch: RegExpMatchArray | null = input.source.match(
        /<script\s+lang=["']ts["']>([\s\S]*?)<\/script>/,
      );
      if (scriptMatch) {
        const content: Str = (scriptMatch[1] ?? '') as Str;
        if (!/\/\*\*[\s\S]*?\*\//.test(content)) {
          violations.push({
            rule: 4 as Num,
            message: 'Missing component description JSDoc' as Str,
          });
        }
      }
    }
  }

  // Rule 5: No orphaned Demo.svelte — checked at directory level
  // This is structural and already covered by the glob; skip in per-component check

  // Rule 6: Valid lens.ts exists
  if (!input.hasLensTs) {
    violations.push({ rule: 6 as Num, message: 'Missing lens.ts' as Str });
  } else if (!input.meta) {
    violations.push({ rule: 6 as Num, message: 'Invalid lens.ts metadata' as Str });
  }

  // Rule 7: JSDoc on every extracted prop
  const typedProps: PropMeta[] = input.props as PropMeta[];
  for (const prop of typedProps) {
    if (!prop.description) {
      violations.push({
        rule: 7 as Num,
        message: `Prop "${prop.name}" missing JSDoc description` as Str,
      });
    }
  }

  // Rule 8: @values on extracted Str/Num props
  const NEEDS_VALUES: ReadonlySet<Str> = new Set(['Str', 'Num', 'string', 'number']);
  for (const prop of typedProps) {
    if (NEEDS_VALUES.has(prop.type) && (!prop.mockValues || prop.mockValues.length === 0)) {
      violations.push({
        rule: 8 as Num,
        message: `Prop "${prop.name}" (${prop.type}) missing @values` as Str,
      });
    }
  }

  // Rule 9: Renderable Lens content
  if (typedProps.length === 0 && !input.hasVariants && !input.hasExamples) {
    violations.push({
      rule: 9 as Num,
      message: 'No renderable content (props, variants, or examples)' as Str,
    });
  }

  // Rule 10: Directory name is kebab-case
  if (!KEBAB_RE.test(input.dir)) {
    violations.push({ rule: 10 as Num, message: 'Directory not kebab-case' as Str });
  }

  // Rule 11: Primary .svelte file exists
  if (!input.hasPrimary) {
    violations.push({ rule: 11 as Num, message: 'Missing primary .svelte file' as Str });
  }

  // Rules 12–15: Skip if @convert-to-lens (already flagged as rule 0)
  if (!hasConvertMarker && input.source) {
    // Rule 12: Uses v.strictObject()
    if (!input.source.includes('v.strictObject(')) {
      violations.push({
        rule: 12 as Num,
        message: 'Missing v.strictObject() schema' as Str,
      });
    }

    // Rule 13: No bare v.object()
    const cleaned: Str = input.source.replaceAll('v.strictObject(', '') as Str;
    if (cleaned.includes('v.object(')) {
      violations.push({
        rule: 13 as Num,
        message: 'Uses v.object() instead of v.strictObject()' as Str,
      });
    }

    // Rule 14: safeParse + stripSvelteProps
    if (input.source.includes('v.strictObject(')) {
      const missing: Str[] = [];
      if (!input.source.includes('safeParse(')) {
        missing.push('safeParse' as Str);
      }
      if (!input.source.includes('stripSvelteProps(')) {
        missing.push('stripSvelteProps' as Str);
      }
      if (missing.length > 0) {
        violations.push({
          rule: 14 as Num,
          message: `Missing ${missing.join(', ')}` as Str,
        });
      }
    }

    // Rule 15: No bare Valibot primitives in module script
    const moduleMatch: RegExpMatchArray | null = input.source.match(
      /<script[^>]*\bmodule\b[^>]*>[\s\S]*?<\/script>/,
    );
    if (moduleMatch) {
      const moduleSrc: Str = moduleMatch[0] as Str;
      const bareMatch: RegExpMatchArray | null = moduleSrc.match(BARE_PRIMITIVE_RE);
      if (bareMatch) {
        const primitive: Str = (bareMatch[1] ?? '') as Str;
        let schema: Str = 'NumSchema' as Str;
        if (primitive === 'string') {
          schema = 'StrSchema' as Str;
        } else if (primitive === 'boolean') {
          schema = 'BoolSchema' as Str;
        }
        violations.push({
          rule: 15 as Num,
          message: `Uses bare v.${primitive}() instead of ${schema}` as Str,
        });
      }
    }
  }

  // Rule 16: Example names match filesystem
  for (const exName of input.declaredExampleNames) {
    const expectedFile: Str = `${exName}.svelte` as Str;
    if (!input.existingExampleFiles.includes(expectedFile)) {
      violations.push({
        rule: 16 as Num,
        message: `Example "${exName}" missing examples/${expectedFile}` as Str,
      });
    }
  }

  // Rule 17: tv-variant tag when tv() used
  if (input.usesTv) {
    if (!input.hasLensTs) {
      violations.push({
        rule: 17 as Num,
        message: 'Uses tv() but has no lens.ts' as Str,
      });
    } else if (input.meta && !input.meta.tags.includes('tv-variant')) {
      violations.push({
        rule: 17 as Num,
        message: 'Uses tv() but missing tv-variant tag' as Str,
      });
    }
  }

  // Rules 18–22: Skip if @convert-to-lens
  if (!hasConvertMarker && input.source) {
    // Rule 18: @values must not contain quoted strings
    const valuesMatches: RegExpMatchArray[] = [...input.source.matchAll(/@values\s+(.+)/g)];
    for (const vm of valuesMatches) {
      const valuesStr: Str = ((vm[1] ?? '') as string).trim() as Str;
      if ((valuesStr as string).startsWith('{') || (valuesStr as string).startsWith('(')) {
        continue;
      }
      if (/[()<>]/.test(valuesStr as string)) {
        continue;
      }
      if (/'[^']+'/g.test(valuesStr as string)) {
        violations.push({
          rule: 18 as Num,
          message: `@values has quoted strings: ${valuesStr}` as Str,
        });
        break;
      }
    }

    // Rule 19: v.optional() picklist/boolean must have default value
    if (input.source.includes('v.strictObject(')) {
      const srcLines: string[] = input.source.split('\n');
      for (let li: number = 0; li < srcLines.length; li++) {
        const srcLine: string = srcLines[li] ?? '';
        if (/v\.optional\(\s*v\.picklist\(/.test(srcLine)) {
          const chunk: string = srcLines.slice(li, li + 5).join(' ');
          if (/\]\)\s*\)/.test(chunk) && !/\]\)\s*,/.test(chunk)) {
            violations.push({
              rule: 19 as Num,
              message: 'v.optional(v.picklist(...)) missing default value' as Str,
            });
            break;
          }
        }
        if (/v\.optional\(\s*BoolSchema\s*\)/.test(srcLine)) {
          violations.push({
            rule: 19 as Num,
            message: 'v.optional(BoolSchema) missing default value' as Str,
          });
          break;
        }
      }
    }

    // Rule 20: Must destructure $props() with ...restProps
    if (input.source.includes('v.strictObject(') && !input.source.includes('...restProps')) {
      violations.push({
        rule: 20 as Num,
        message: 'Missing ...restProps destructure in $props()' as Str,
      });
    }

    // Rule 21: Root element must spread {...restProps}
    if (input.source.includes('...restProps')) {
      const templateStart: number = input.source.lastIndexOf('</script>');
      if (templateStart !== -1) {
        const template: Str = input.source.slice(templateStart) as Str;
        if (!(template as string).includes('{...restProps}')) {
          violations.push({
            rule: 21 as Num,
            message: 'Has ...restProps but does not spread on root element' as Str,
          });
        }
      }
    }

    // Rule 22: Snippet/callback props must not pass through stripSvelteProps
    if (input.source.includes('stripSvelteProps(')) {
      const stripCallRe: RegExp = /stripSvelteProps\(\{([^}]+)\}\)/gs;
      let stripMatch: RegExpExecArray | null = stripCallRe.exec(input.source);
      while (stripMatch) {
        const args: Str = (stripMatch[1] ?? '') as string as Str;
        const snippetNames: string[] = ['children', 'icon', 'footer', 'child', 'header', 'trigger'];
        const found: string[] = snippetNames.filter((p: string): boolean =>
          new RegExp(`\\b${p}\\b`).test(args as string),
        );
        if (found.length > 0) {
          violations.push({
            rule: 22 as Num,
            message: `Snippet props [${found.join(', ')}] passed through stripSvelteProps` as Str,
          });
        }
        stripMatch = stripCallRe.exec(input.source);
      }
    }
  }

  // Auto-fail R18-R22 for @convert-to-lens components
  if (hasConvertMarker) {
    violations.push({ rule: 18 as Num, message: 'Skipped — needs Lens conversion first' as Str });
    violations.push({ rule: 19 as Num, message: 'Skipped — needs Lens conversion first' as Str });
    violations.push({ rule: 20 as Num, message: 'Skipped — needs Lens conversion first' as Str });
    violations.push({ rule: 21 as Num, message: 'Skipped — needs Lens conversion first' as Str });
    violations.push({ rule: 22 as Num, message: 'Skipped — needs Lens conversion first' as Str });
    violations.push({ rule: 23 as Num, message: 'Skipped — needs Lens conversion first' as Str });
    violations.push({ rule: 24 as Num, message: 'Skipped — needs Lens conversion first' as Str });
  }

  // Rule 23: Dead props — schema fields never referenced in instance script or template
  if (!hasConvertMarker && input.source.includes('v.strictObject(')) {
    // Extract template + instance script (everything after module script closes).
    // Strip JSDoc comments so prop names mentioned only in docs don't count as usage.
    const instanceIdx: number = input.source.indexOf('<script lang="ts">');
    const rawUsage: string = instanceIdx >= 0 ? input.source.slice(instanceIdx) : input.source;
    const usageSource: string = rawUsage.replaceAll(/\/\*\*[\s\S]*?\*\//g, '');
    // Props always present in usage: 'class' (renamed to className), 'children'/'child' (slot content)
    const alwaysUsedProps: ReadonlySet<string> = new Set(['class', 'children', 'child']);
    const deadProps: string[] = [];
    for (const prop of input.props) {
      const propName: string = (prop as { name: string }).name;
      if (!propName || alwaysUsedProps.has(propName)) {
        continue;
      }
      // Check if prop name appears in instance script or template via validated.propName,
      // direct propName reference, or Snippet render ({@render propName()})
      const nameRe: RegExp = new RegExp(`\\b${propName}\\b`);
      if (!nameRe.test(usageSource)) {
        deadProps.push(propName);
      }
    }
    if (deadProps.length > 0) {
      violations.push({
        rule: 23 as Num,
        message: `Dead props in schema but never used: [${deadProps.join(', ')}]` as Str,
      });
    }
  }

  // Rule 24: @requires must reference valid props — validate cross-prop dependencies
  if (!hasConvertMarker && input.props.length > 0) {
    const propNames: Set<string> = new Set(input.props.map((p) => p.name as string));
    const invalidRequires: string[] = [];
    for (const prop of input.props) {
      if (!prop.requires || prop.requires.length === 0) {
        continue;
      }
      for (const req of prop.requires) {
        if (!propNames.has(req.prop as string)) {
          invalidRequires.push(
            `${prop.name}: @requires ${req.prop}:${req.value} — prop "${req.prop}" does not exist`,
          );
        }
      }
    }
    if (invalidRequires.length > 0) {
      violations.push({
        rule: 24 as Num,
        message: `Invalid @requires references: ${invalidRequires.join('; ')}` as Str,
      });
    }
  }

  return {
    compatible: violations.length === 0,
    violations,
  };
}
