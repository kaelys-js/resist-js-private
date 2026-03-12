/**
 * Lint rules for the Lens automated component documentation system.
 *
 * Validates shared UI components follow Lens conventions:
 * 1. `@values` on every `Str`/`Num` field in type definitions
 * 2. No inline object types in Props (use named types)
 * 3. JSDoc on every type definition field
 * 4. Component description JSDoc on every `.svelte` file
 * 5. No orphaned `Demo.svelte` files
 * 6. Every component directory needs valid `lens.ts`
 * 7. Every extracted prop (via `extractProps`) has a JSDoc description
 * 8. Every extracted `Str`/`Num`/`string`/`number` prop has `@values`
 * 9. Every primary component has renderable Lens content (props, variants, or examples)
 * 10. Directory names are kebab-case
 * 11. Primary `.svelte` file exists per component directory
 * 12. Converted components use `v.strictObject()` schema (skip `@convert-to-lens`)
 * 13. No `v.object()` in component schemas (skip `@convert-to-lens`)
 * 14. Converted schema components use `safeParse` + `stripSvelteProps` (skip `@convert-to-lens`)
 * 15. No bare Valibot primitives in module scripts (skip `@convert-to-lens`)
 * 16. Example names in `lens.ts` match filesystem
 * 17. `tv-variant` tag in `lens.ts` when component uses `tv()`
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { extractProps } from './extract-props.js';
import { extractVariants } from './extract-variants.js';
import { LensMetaSchema, type PropMeta, type VariantMeta } from './types.js';

const LENS_DIR: string = dirname(fileURLToPath(import.meta.url));
const UI_SRC: string = join(LENS_DIR, '..');

/** All .svelte component files in the shared UI library (excludes examples/). */
/** Lens-internal infrastructure dirs — excluded from all lint scans. */
const INTERNAL_DIRS: ReadonlySet<string> = new Set(['hooks', 'lens', 'lens-card-settings-menu']);

const svelteFiles: string[] = readdirSync(UI_SRC, { recursive: true })
  .filter(
    (f): f is string =>
      typeof f === 'string' &&
      f.endsWith('.svelte') &&
      !f.includes('examples/') &&
      ![...INTERNAL_DIRS].some((d: string): boolean => f.startsWith(`${d}/`)),
  )
  .map((f: string): string => join(UI_SRC, f));

/** Props excluded from @values checks — CSS passthrough, never rendered in docs. */
const SKIP_VALUES_FIELDS: ReadonlySet<string> = new Set(['class']);

/**
 * Short relative path for error messages.
 *
 * @param path - Absolute file path
 * @returns Relative path from UI_SRC
 */
function rel(path: string): string {
  return relative(UI_SRC, path);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Find matching closing brace for an opening brace.
 *
 * @param source - Full source code string
 * @param openIdx - Index of the opening brace
 * @returns Index of the matching closing brace, or -1
 */
function matchBrace(source: string, openIdx: number): number {
  let depth: number = 0;
  let inStr: string | null = null;

  for (let i: number = openIdx; i < source.length; i++) {
    const ch: string = source[i] ?? '';
    const prev: string = source[i - 1] ?? '';

    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
      inStr = ch;
      continue;
    }
    if (inStr && ch === inStr && prev !== '\\') {
      inStr = null;
      continue;
    }
    if (inStr) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/** A named type definition block extracted from source. */
type TypeBlock = { name: string; body: string };

/**
 * Extract all `type X = { ... }` blocks (handles intersection types).
 *
 * @param source - Full source code string
 * @returns Array of extracted type blocks
 */
function findTypeBlocks(source: string): TypeBlock[] {
  const blocks: TypeBlock[] = [];
  const regex: RegExp = /type\s+(\w+)\s*=/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    const name: string = match[1] ?? '';
    const afterEq: number = (match.index ?? 0) + match[0].length;

    // Find first top-level `{` (skip nested generics/parens)
    let depth: number = 0;
    let braceIdx: number = -1;
    for (let i: number = afterEq; i < source.length; i++) {
      const ch: string = source[i] ?? '';
      if (ch === '<' || ch === '(') depth++;
      else if (ch === '>' || ch === ')') depth--;
      else if (ch === '{' && depth === 0) {
        braceIdx = i;
        break;
      } else if (ch === ';' && depth === 0) break;
    }

    if (braceIdx === -1) continue;
    const closeIdx: number = matchBrace(source, braceIdx);
    if (closeIdx === -1) continue;
    blocks.push({ name, body: source.slice(braceIdx + 1, closeIdx) });
  }

  return blocks;
}

/** Parsed field info from a type block. */
type FieldInfo = { name: string; type: string; jsdoc: string };

/**
 * Parse top-level fields from a type block body.
 *
 * Returns each field's name, type, and the JSDoc text preceding it.
 * Tracks brace depth to skip nested objects and multi-line function types.
 *
 * @param body - The inner content of a type block (between braces)
 * @returns Array of parsed field info
 */
function parseFields(body: string): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const lines: string[] = body.split('\n');
  let pendingJSDoc: string = '';
  let inJSDoc: boolean = false;
  let jsdocBuf: string[] = [];
  let skipDepth: number = 0;

  for (const line of lines) {
    const t: string = line.trim();
    if (!t) continue;

    // Skip nested blocks (inline objects, multi-line functions)
    if (skipDepth > 0) {
      for (const ch of t) {
        if (ch === '{' || ch === '(') skipDepth++;
        else if (ch === '}' || ch === ')') skipDepth--;
      }
      if (skipDepth <= 0) {
        skipDepth = 0;
        pendingJSDoc = '';
      }
      continue;
    }

    // Multi-line JSDoc open
    if (t.startsWith('/**') && !t.endsWith('*/')) {
      inJSDoc = true;
      jsdocBuf = [];
      const after: string = t.slice(3).trim();
      if (after) jsdocBuf.push(after);
      continue;
    }

    // Multi-line JSDoc body/close
    if (inJSDoc) {
      if (t.endsWith('*/')) {
        const before: string = t
          .slice(0, -2)
          .replace(/^\*\s*/, '')
          .trim();
        if (before) jsdocBuf.push(before);
        pendingJSDoc = jsdocBuf.filter(Boolean).join(' ');
        inJSDoc = false;
        jsdocBuf = [];
      } else {
        const content: string = t.replace(/^\*\s*/, '').trim();
        if (content) jsdocBuf.push(content);
      }
      continue;
    }

    // Single-line JSDoc
    const singleMatch: RegExpMatchArray | null = t.match(/^\/\*\*\s*(.*?)\s*\*\/$/);
    if (singleMatch) {
      pendingJSDoc = singleMatch[1] ?? '';
      continue;
    }

    // Index signature — skip
    if (t.startsWith('[')) {
      pendingJSDoc = '';
      continue;
    }

    // Field line: name?: Type;
    const fieldMatch: RegExpMatchArray | null = t.match(/^(\w+)\??\s*:\s*(.+?)\s*[;,]?\s*$/);
    if (fieldMatch) {
      const fieldName: string = fieldMatch[1] ?? '';
      const fieldType: string = (fieldMatch[2] ?? '').trim();

      // Check for unbalanced braces/parens (multi-line type)
      let bal: number = 0;
      for (const ch of fieldType) {
        if (ch === '{' || ch === '(') bal++;
        else if (ch === '}' || ch === ')') bal--;
      }
      if (bal > 0) {
        skipDepth = bal;
        pendingJSDoc = '';
        continue;
      }

      fields.push({ name: fieldName, type: fieldType, jsdoc: pendingJSDoc });
      pendingJSDoc = '';
      continue;
    }

    // Unmatched line — check for lone opening brace
    let lineBal: number = 0;
    for (const ch of t) {
      if (ch === '{' || ch === '(') lineBal++;
      else if (ch === '}' || ch === ')') lineBal--;
    }
    if (lineBal > 0) {
      skipDepth = lineBal;
    }
    pendingJSDoc = '';
  }

  return fields;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Lens lint', () => {
  describe('Rule 1: @values required on Str/Num fields', () => {
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      for (const block of findTypeBlocks(source)) {
        for (const field of parseFields(block.body)) {
          if (
            (field.type === 'Str' || field.type === 'Num') &&
            !field.jsdoc.includes('@values') &&
            !SKIP_VALUES_FIELDS.has(field.name)
          ) {
            violations.push(`${rel(file)} → ${block.name}.${field.name}`);
          }
        }
      }
    }

    it('every Str/Num field has @values', () => {
      expect(violations, `Missing @values:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 2: No inline object types in Props', () => {
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      for (const block of findTypeBlocks(source)) {
        if (!block.name.endsWith('Props')) continue;

        const lines: string[] = block.body.split('\n');
        let skipDepth: number = 0;

        for (const line of lines) {
          const t: string = line.trim();
          if (!t) continue;

          if (skipDepth > 0) {
            for (const ch of t) {
              if (ch === '{' || ch === '(') skipDepth++;
              else if (ch === '}' || ch === ')') skipDepth--;
            }
            continue;
          }

          const fieldMatch: RegExpMatchArray | null = t.match(/^(\w+)\??\s*:\s*\{/);
          if (fieldMatch) {
            violations.push(`${rel(file)} → ${block.name}.${fieldMatch[1]}`);
            skipDepth = 1;
          }
        }
      }
    }

    it('no Props types have inline object fields', () => {
      expect(violations, `Inline objects in Props:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 3: JSDoc required on type definition fields', () => {
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      for (const block of findTypeBlocks(source)) {
        for (const field of parseFields(block.body)) {
          if (!field.jsdoc) {
            violations.push(`${rel(file)} → ${block.name}.${field.name}`);
          }
        }
      }
    }

    it('every field in type definitions has JSDoc', () => {
      expect(violations, `Missing JSDoc:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 4: Component description required', () => {
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');

      // Only enforce on components that define their own type blocks
      // (shadcn sub-component wrappers with no type defs are excluded)
      if (findTypeBlocks(source).length === 0) continue;

      // Find instance <script lang="ts"> (not module)
      const scriptMatch: RegExpMatchArray | null = source.match(
        /<script\s+lang=["']ts["']>([\s\S]*?)<\/script>/,
      );
      if (!scriptMatch) continue;
      const content: string = scriptMatch[1] ?? '';
      // Check for a JSDoc block anywhere in the script (may appear after imports)
      if (!/\/\*\*[\s\S]*?\*\//.test(content)) {
        violations.push(rel(file));
      }
    }

    it('components with type definitions have a description JSDoc', () => {
      expect(violations, `Missing description:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 5: No orphaned Demo.svelte files', () => {
    it('no Demo.svelte files exist', () => {
      const demoFiles: string[] = readdirSync(UI_SRC, { recursive: true }).filter(
        (f): f is string => typeof f === 'string' && basename(f) === 'Demo.svelte',
      );
      expect(demoFiles, `Orphaned Demo.svelte:\n${demoFiles.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 6: Every component directory needs valid lens.ts', () => {
    /** Directories that are infrastructure, not components — no lens.ts needed. */
    const SKIP_DIRS: ReadonlySet<string> = INTERNAL_DIRS;

    /** All component directories with .svelte files. */
    const componentDirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
      .filter((d) => readdirSync(join(UI_SRC, d.name)).some((f: string) => f.endsWith('.svelte')))
      .map((d) => d.name);

    it('every component directory has a lens.ts file', () => {
      const missing: string[] = componentDirs.filter(
        (dir: string): boolean => !readdirSync(join(UI_SRC, dir)).includes('lens.ts'),
      );
      expect(missing, `Missing lens.ts:\n${missing.join('\n')}`).toHaveLength(0);
    });

    it('every lens.ts exports a valid meta matching LensMetaSchema', () => {
      const invalid: string[] = [];

      for (const dir of componentDirs) {
        const lensPath: string = join(UI_SRC, dir, 'lens.ts');
        const files: string[] = readdirSync(join(UI_SRC, dir));
        if (!files.includes('lens.ts')) continue;

        const source: string = readFileSync(lensPath, 'utf8');

        // Verify `export const meta` exists
        if (!/export\s+const\s+meta\s*[=:]/.test(source)) {
          invalid.push(`${dir}/lens.ts — missing \`export const meta\``);
          continue;
        }

        // Verify the meta type annotation references LensMeta
        if (!source.includes('LensMeta')) {
          invalid.push(`${dir}/lens.ts — meta not typed as LensMeta`);
          continue;
        }

        // Parse individual fields from the meta literal via regex
        const catMatch: RegExpMatchArray | null = source.match(/category:\s*'([^']+)'/);
        if (!catMatch) {
          invalid.push(`${dir}/lens.ts — missing or unparseable category field`);
          continue;
        }

        const tagsMatch: RegExpMatchArray | null = source.match(/tags:\s*\[(.*?)\]/s);
        if (!tagsMatch) {
          invalid.push(`${dir}/lens.ts — missing tags field`);
          continue;
        }

        const descMatch: RegExpMatchArray | null = source.match(/description:\s*'([^']*)'/);
        if (!descMatch) {
          invalid.push(`${dir}/lens.ts — missing description field`);
          continue;
        }

        // Build object from parsed fields and validate against schema
        const tagStrings: string[] = (tagsMatch[1] ?? '')
          .split(',')
          .map((t: string): string => t.trim().replaceAll(/^'|'$/g, ''))
          .filter((t: string): boolean => t.length > 0);

        const metaObj: unknown = {
          category: catMatch[1],
          tags: tagStrings,
          description: descMatch[1] ?? '',
        };

        const result: v.SafeParseResult<typeof LensMetaSchema> = v.safeParse(
          LensMetaSchema,
          metaObj,
        );
        if (!result.success) {
          const issues: string = result.issues
            .map((i: v.BaseIssue<unknown>): string => i.message)
            .join(', ');
          invalid.push(`${dir}/lens.ts — schema validation failed: ${issues}`);
        }
      }

      expect(invalid, `Invalid lens.ts:\n${invalid.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 7: JSDoc required on extracted props (covers imported-type components)', () => {
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      const props: PropMeta[] = extractProps(source);
      for (const prop of props) {
        if (!prop.description) {
          violations.push(`${rel(file)} → ${prop.name}`);
        }
      }
    }

    it('every extracted prop has a JSDoc description', () => {
      expect(violations, `Missing prop JSDoc:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 8: @values required on extracted Str/Num props (covers imported-type components)', () => {
    /** Types that require explicit `@values` for variant grid rendering. */
    const NEEDS_VALUES: ReadonlySet<string> = new Set(['Str', 'Num', 'string', 'number']);
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      const props: PropMeta[] = extractProps(source);
      for (const prop of props) {
        if (NEEDS_VALUES.has(prop.type) && (!prop.mockValues || prop.mockValues.length === 0)) {
          violations.push(`${rel(file)} → ${prop.name} (type: ${prop.type})`);
        }
      }
    }

    it('every Str/Num extracted prop has @values', () => {
      expect(
        violations,
        `Missing @values on extracted props:\n${violations.join('\n')}`,
      ).toHaveLength(0);
    });
  });

  describe('Rule 9: Every primary component has renderable Lens content', () => {
    /** Infrastructure dirs — not user-facing components. */
    const INFRA_DIRS: ReadonlySet<string> = new Set([
      'hooks',
      'lens',
      'lens-component-renderer',
      'lens-default-preview',
      'lens-empty',
      'lens-error',
      'lens-header',
      'lens-props-table',
      'lens-section',
      'lens-source',
      'lens-variant-grid',
    ]);

    const empty: string[] = [];

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !INFRA_DIRS.has(d.name))
      .map((d) => d.name);

    for (const dir of dirs) {
      const dirPath: string = join(UI_SRC, dir);
      const files: string[] = readdirSync(dirPath);

      // Find primary .svelte file (name matches directory)
      const primaryFile: string | undefined = files.find(
        (f: string): boolean => f === `${dir}.svelte` || f === `${toPascal(dir)}.svelte`,
      );
      if (!primaryFile) continue;

      const source: string = readFileSync(join(dirPath, primaryFile), 'utf8');
      const props: PropMeta[] = extractProps(source);
      const variants: VariantMeta | null = extractVariants(source);
      const hasExamples: boolean =
        existsSync(join(dirPath, 'examples')) &&
        readdirSync(join(dirPath, 'examples')).some((f: string) => f.endsWith('.svelte'));

      const hasProps: boolean = props.length > 0;
      const hasVariants: boolean = variants !== null && variants.variants.length > 0;

      if (!hasProps && !hasVariants && !hasExamples) {
        empty.push(dir);
      }
    }

    it('every primary component has extractable props, TV variants, or examples', () => {
      expect(
        empty,
        `Components with no renderable Lens content (add props, variants, or examples/):\n${empty.join('\n')}`,
      ).toHaveLength(0);
    });
  });

  describe('Rule 10: Directory names are kebab-case', () => {
    const KEBAB_RE: RegExp = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    const violations: string[] = [];

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => readdirSync(join(UI_SRC, d.name)).some((f: string) => f.endsWith('.svelte')))
      .map((d) => d.name);

    for (const dir of dirs) {
      if (!KEBAB_RE.test(dir)) {
        violations.push(dir);
      }
    }

    it('every component directory is kebab-case', () => {
      expect(violations, `Non-kebab-case dirs:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 11: Primary .svelte file exists per component dir', () => {
    const SKIP_DIRS: ReadonlySet<string> = new Set([
      ...INTERNAL_DIRS,
      'chart',
      'data-table',
      'form',
      'lens-props-table',
      'resizable',
    ]);
    const missing: string[] = [];

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
      .filter((d) => readdirSync(join(UI_SRC, d.name)).some((f: string) => f.endsWith('.svelte')))
      .map((d) => d.name);

    for (const dir of dirs) {
      const files: string[] = readdirSync(join(UI_SRC, dir));
      const hasPrimary: boolean = files.some(
        (f: string): boolean => f === `${dir}.svelte` || f === `${toPascal(dir)}.svelte`,
      );
      if (!hasPrimary) {
        missing.push(dir);
      }
    }

    it('every component directory has a primary .svelte file', () => {
      expect(missing, `Missing primary .svelte file:\n${missing.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 12: Converted components use v.strictObject() schema (skip @convert-to-lens)', () => {
    const violations: string[] = [];
    const SKIP_DIRS: ReadonlySet<string> = INTERNAL_DIRS;

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
      .map((d) => d.name);

    for (const dir of dirs) {
      const dirPath: string = join(UI_SRC, dir);
      const files: string[] = readdirSync(dirPath);
      const primaryFile: string | undefined = files.find(
        (f: string): boolean => f === `${dir}.svelte` || f === `${toPascal(dir)}.svelte`,
      );
      if (!primaryFile) continue;

      const source: string = readFileSync(join(dirPath, primaryFile), 'utf8');
      if (source.includes('@convert-to-lens')) continue;

      if (!source.includes('v.strictObject(')) {
        violations.push(`${dir}/${primaryFile}`);
      }
    }

    it('every converted component has v.strictObject() schema', () => {
      expect(violations, `Missing v.strictObject():\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 13: No v.object() in schemas (skip @convert-to-lens)', () => {
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      if (source.includes('@convert-to-lens')) continue;

      // Remove v.strictObject( to avoid false positives
      const cleaned: string = source.replaceAll('v.strictObject(', '');
      if (cleaned.includes('v.object(')) {
        violations.push(rel(file));
      }
    }

    it('no component uses bare v.object() instead of v.strictObject()', () => {
      expect(
        violations,
        `Uses v.object() instead of v.strictObject():\n${violations.join('\n')}`,
      ).toHaveLength(0);
    });
  });

  describe('Rule 14: safeParse + stripSvelteProps required (skip @convert-to-lens)', () => {
    const violations: string[] = [];
    const SKIP_DIRS: ReadonlySet<string> = INTERNAL_DIRS;

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
      .map((d) => d.name);

    for (const dir of dirs) {
      const dirPath: string = join(UI_SRC, dir);
      const files: string[] = readdirSync(dirPath);
      const primaryFile: string | undefined = files.find(
        (f: string): boolean => f === `${dir}.svelte` || f === `${toPascal(dir)}.svelte`,
      );
      if (!primaryFile) continue;

      const source: string = readFileSync(join(dirPath, primaryFile), 'utf8');
      if (source.includes('@convert-to-lens')) continue;
      // Only check components that have a v.strictObject schema
      if (!source.includes('v.strictObject(')) continue;

      const missing: string[] = [];
      if (!source.includes('safeParse(')) missing.push('safeParse');
      if (!source.includes('stripSvelteProps(')) missing.push('stripSvelteProps');

      if (missing.length > 0) {
        violations.push(`${dir}/${primaryFile} — missing ${missing.join(', ')}`);
      }
    }

    it('every converted schema component uses safeParse + stripSvelteProps', () => {
      expect(
        violations,
        `Missing safeParse/stripSvelteProps:\n${violations.join('\n')}`,
      ).toHaveLength(0);
    });
  });

  describe('Rule 15: No bare Valibot primitives in module scripts (skip @convert-to-lens)', () => {
    const BARE_PRIMITIVE_RE: RegExp = /v\.(string|boolean|number)\s*\(\s*\)/;
    const violations: string[] = [];

    for (const file of svelteFiles) {
      const source: string = readFileSync(file, 'utf8');
      if (source.includes('@convert-to-lens')) continue;

      // Extract module script block
      const moduleMatch: RegExpMatchArray | null = source.match(
        /<script[^>]*\bmodule\b[^>]*>[\s\S]*?<\/script>/,
      );
      if (!moduleMatch) continue;

      const [moduleSource]: RegExpMatchArray = moduleMatch;
      const match: RegExpMatchArray | null = moduleSource.match(BARE_PRIMITIVE_RE);
      if (match) {
        const primitive: string = match[1] ?? '';
        let schema: string = 'NumSchema';
        if (primitive === 'string') schema = 'StrSchema';
        else if (primitive === 'boolean') schema = 'BoolSchema';
        violations.push(`${rel(file)} — uses bare v.${primitive}() instead of ${schema}`);
      }
    }

    it('no bare v.string()/v.boolean()/v.number() in module scripts', () => {
      expect(violations, `Bare Valibot primitives:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 16: Example names in lens.ts match filesystem', () => {
    const violations: string[] = [];

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const dir of dirs) {
      const lensPath: string = join(UI_SRC, dir, 'lens.ts');
      if (!existsSync(lensPath)) continue;

      const lensSource: string = readFileSync(lensPath, 'utf8');
      const nameMatches: RegExpMatchArray[] = [...lensSource.matchAll(/name:\s*'([^']+)'/g)];
      if (nameMatches.length === 0) continue;

      const examplesDir: string = join(UI_SRC, dir, 'examples');
      const exampleFiles: string[] = existsSync(examplesDir)
        ? readdirSync(examplesDir).filter((f: string) => f.endsWith('.svelte'))
        : [];

      for (const m of nameMatches) {
        const exampleName: string = m[1] ?? '';
        const expectedFile: string = `${exampleName}.svelte`;
        if (!exampleFiles.includes(expectedFile)) {
          violations.push(
            `${dir}/lens.ts — name:'${exampleName}' missing examples/${expectedFile}`,
          );
        }
      }
    }

    it('every example name in lens.ts has a matching .svelte file', () => {
      expect(violations, `Mismatched examples:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Rule 17: tv-variant tag when tv() is used', () => {
    const violations: string[] = [];

    const dirs: string[] = readdirSync(UI_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const dir of dirs) {
      const dirPath: string = join(UI_SRC, dir);
      const files: string[] = readdirSync(dirPath);

      // Check if any .svelte file in the dir uses tv(
      const usesTv: boolean = files
        .filter((f: string) => f.endsWith('.svelte'))
        .some((f: string): boolean => {
          const source: string = readFileSync(join(dirPath, f), 'utf8');
          return /\btv\s*\(\s*\{/.test(source);
        });
      if (!usesTv) continue;

      const lensPath: string = join(dirPath, 'lens.ts');
      if (!existsSync(lensPath)) {
        violations.push(`${dir} — uses tv() but has no lens.ts`);
        continue;
      }

      const lensSource: string = readFileSync(lensPath, 'utf8');
      if (!lensSource.includes('tv-variant')) {
        violations.push(`${dir}/lens.ts — component uses tv() but missing 'tv-variant' tag`);
      }
    }

    it('components using tv() have tv-variant tag in lens.ts', () => {
      expect(violations, `Missing tv-variant tag:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });
});

/**
 * Convert kebab-case to PascalCase for matching component file names.
 *
 * @param kebab - Kebab-case string
 * @returns PascalCase string
 */
function toPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((s: string): string => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}
