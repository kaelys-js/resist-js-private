/**
 * Runtime prop metadata extraction from raw Svelte component source.
 *
 * Parses `$props()` destructuring blocks via regex to extract prop names,
 * defaults, types, JSDoc descriptions, and bindable status. Designed to run
 * in the browser against raw source loaded via `import.meta.glob('?raw')`.
 *
 * @example
 * ```typescript
 * import { extractProps } from './extract-props.js';
 * const props = extractProps(rawSvelteSource);
 * // [{ name: 'variant', type: 'string', default: '"default"', description: '...', bindable: false }]
 * ```
 */
import type { PropMeta, TypeField, VariantKeyMeta } from './types.js';

/**
 * Check if a prop type represents a function (Snippet, Component, callback).
 *
 * @param type - The resolved type string
 * @param typeDefinition - Optional resolved type definition body
 * @returns True if the type represents a function/callback/Snippet
 */
function isFunctionType(type: string, typeDefinition?: string): boolean {
  // Array-of-object types can have inner fields with function validators
  // (e.g., v.custom<Component>(...)) — those are NOT function types themselves
  if (type.endsWith('[]')) return false;
  return (
    type === 'Snippet' ||
    type === 'Component' ||
    type.includes(') =>') ||
    (typeDefinition?.includes(') =>') ?? false)
  );
}

/**
 * Try to parse a JS-like object/array literal string into an actual value.
 *
 * Handles unquoted keys (`{name: "val"}`) by quoting them before JSON.parse.
 *
 * @param str - String like `{key: "value"}` or `[{key: true}]`
 * @returns Parsed value, or undefined if unparseable
 */
function tryParseJsLiteral(str: string): unknown {
  // Try JSON.parse first (already valid JSON)
  try {
    return JSON.parse(str);
  } catch {
    /* not valid JSON — try fixing unquoted keys */
  }
  // Quote unquoted keys: {key: "val"} → {"key": "val"}
  const fixed: string = str.replaceAll(/([{,])\s*(\w+)\s*:/g, '$1"$2":');
  try {
    return JSON.parse(fixed);
  } catch {
    /* still unparseable */
  }
  return undefined;
}

/** JSDoc open marker — extracted to avoid confusing oxlint's JSDoc parser. */
const JSDOC_OPEN: string = '/**';

/** JSDoc close marker — extracted to avoid confusing oxlint's JSDoc parser. */
const JSDOC_CLOSE: string = '*/';

/** Regex matching single-line JSDoc comments — extracted to keep oxlint's parser from misinterpreting. */
const SINGLE_JSDOC_RE: RegExp = /^\/\*\*\s*(.*?)\s*\*\/$/;

/**
 * Props to exclude from extraction — internal/inherited, not user-facing.
 *
 * - `ref` — DOM reference, always present
 * - `class` — CSS class passthrough, always present
 * - `children` — Svelte snippet slot, inherited
 * - `child` — Svelte snippet pattern (shadcn), inherited
 */
const SKIP_PROPS: ReadonlySet<string> = new Set(['ref', 'class', 'children', 'child']);

/**
 * Extract prop metadata from raw `.svelte` component source.
 *
 * Finds the `let { ... }: Type = $props()` block, parses each destructured
 * prop for name/default/bindable/JSDoc, and enriches with inline type info.
 *
 * @param source - Raw `.svelte` file content
 * @param supplementarySources - Optional raw `.ts` sources from the same directory for cross-file type resolution
 * @returns Array of PropMeta for user-facing props
 */
export function extractProps(source: string, supplementarySources?: string[]): PropMeta[] {
  if (!source) return [];

  const block: PropsBlock | null = findPropsBlock(source);

  // Pattern 3: No destructuring — schema-based $derived.by() + safeParse pattern
  // e.g., `const allProps = $props(); const validated = $derived.by(() => { safeParse(XxxSchema, ...) })`
  if (!block) {
    return extractSchemaBasedProps(source, supplementarySources);
  }

  let inlineTypes: Map<string, string> = parseInlineTypes(block.typeAnnotation);
  let typeDefs: Map<string, TypeDefField> = new Map();

  // When the type annotation is a named type (no inline braces), resolve it
  if (inlineTypes.size === 0) {
    const resolved: ResolvedTypeDef | null = resolveNamedType(source, block.typeAnnotation);
    if (resolved) {
      inlineTypes = resolved.types;
      typeDefs = resolved.fields;
    }
  }

  const rawProps: RawProp[] = parseDestructuring(block.destructuring);

  // Pre-compute inherited parent type name for props with no inline type
  const parentTypeName: string = extractInheritedTypeName(block.typeAnnotation);

  // Combine primary source with supplementary sources for type resolution
  const combinedSource: string = supplementarySources
    ? [source, ...supplementarySources].join('\n')
    : source;

  const result: PropMeta[] = [];
  for (const raw of rawProps) {
    if (SKIP_PROPS.has(raw.name)) continue;

    const inlineType: string = inlineTypes.get(raw.name) ?? '';
    let resolvedType: string = inlineType || inferType(raw.defaultValue);

    // For untyped props, show inherited type lookup if a parent type exists
    if (!resolvedType && parentTypeName) {
      resolvedType = `${parentTypeName}['${raw.name}']`;
    }

    // Use destructuring JSDoc first, fall back to type definition JSDoc
    const typeDef: TypeDefField | undefined = typeDefs.get(raw.name);
    const description: string = raw.description || typeDef?.description || '';

    // Merge mockValues: destructuring JSDoc wins, fall back to type def JSDoc
    const mockValues: string[] =
      raw.mockValues.length > 0 ? raw.mockValues : (typeDef?.mockValues ?? []);
    // Merge requires: destructuring JSDoc wins, fall back to type def JSDoc
    const requires: RequiresEntry[] =
      raw.requires.length > 0 ? raw.requires : (typeDef?.requires ?? []);

    const rawTypeDef: string | undefined = resolveTypeDefinition(resolvedType, combinedSource);
    // Optional if: no default AND type definition says optional (v.optional or ?:)
    const isOptional: boolean = !raw.defaultValue && (typeDef?.optional ?? false);
    result.push({
      name: raw.name,
      type: resolvedType,
      default: raw.defaultValue,
      description,
      bindable: raw.bindable,
      typeDefinition: rawTypeDef,
      typeFields: rawTypeDef ? parseTypeFieldsForDisplay(rawTypeDef, combinedSource) : undefined,
      mockValues: mockValues.length > 0 ? mockValues : undefined,
      requires: requires.length > 0 ? requires : undefined,
      optional: isOptional || undefined,
    });
  }

  // Fallback: if destructuring yielded no props but a schema exists, use schema-based extraction
  if (result.length === 0) {
    const schemaFallback: PropMeta[] = extractSchemaBasedProps(source, supplementarySources);
    if (schemaFallback.length > 0) return schemaFallback;
  }

  // Fallback: if any props lack defaults, check for a Valibot schema in the same file
  // and merge schema defaults (from v.optional(schema, defaultValue) two-argument form).
  // This handles the hybrid pattern: destructured $props() + safeParse validation with schema defaults.
  const safeParseMatch: RegExpMatchArray | null = source.match(/safeParse\(\s*(\w+Schema)\s*,/);
  if (safeParseMatch) {
    const schemaName: string = safeParseMatch[1] ?? '';
    if (schemaName) {
      const schemaResolved: ResolvedTypeDef | null = resolveValibotSchema(source, schemaName);
      if (schemaResolved) {
        for (const prop of result) {
          const schemaField = schemaResolved.fields.get(prop.name);
          if (schemaField) {
            if (!prop.default && schemaField.defaultValue) {
              prop.default = schemaField.defaultValue;
            }
            if (!prop.requires && schemaField.requires) {
              prop.requires = schemaField.requires;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Extract props from schema-based components that use `$derived.by()` + `safeParse`.
 *
 * These components have `const allProps = $props()` (no destructuring) and
 * define their props via a `v.strictObject({...})` schema in `<script module>`.
 * Finds the schema name from `safeParse(XxxSchema, ...)` in the instance script,
 * then parses schema fields into PropMeta[].
 *
 * @param source - Raw `.svelte` file content
 * @param supplementarySources - Optional raw `.ts` sources for cross-file type resolution
 * @returns Array of PropMeta for user-facing props
 */
function extractSchemaBasedProps(source: string, supplementarySources?: string[]): PropMeta[] {
  // Must have $props() somewhere
  if (!source.includes('$props()')) return [];

  // Find schema name from safeParse(XxxSchema, ...) in the instance script
  const safeParseMatch: RegExpMatchArray | null = source.match(/safeParse\(\s*(\w+Schema)\s*,/);
  if (!safeParseMatch) return [];

  const schemaName: string = safeParseMatch[1] ?? '';
  if (!schemaName) return [];

  // Resolve the schema to field types and descriptions
  const resolved: ResolvedTypeDef | null = resolveValibotSchema(source, schemaName);
  if (!resolved) return [];

  // Combine primary source with supplementary sources for type resolution
  const combinedSource: string = supplementarySources
    ? [source, ...supplementarySources].join('\n')
    : source;

  const result: PropMeta[] = [];
  for (const [fieldName, fieldDef] of resolved.fields) {
    if (SKIP_PROPS.has(fieldName)) continue;

    const readableType: string = fieldDef.type;
    const rawTypeDef: string | undefined = resolveTypeDefinition(readableType, combinedSource);

    // Fallback: use original Valibot validator expression for typeFields when resolveTypeDefinition
    // can't resolve the type (e.g., v.record() which produces Record<K, V> with no type alias).
    // Match complex validators anywhere in the expression (handles v.optional(v.record(...)) wrappers).
    // Excludes v.optional(StrSchema) etc. that only contain primitives.
    const validatorFallback: string | undefined =
      fieldDef.validatorExpr &&
      /v\.(?:record|strict[Oo]bject|object)\(/.test(fieldDef.validatorExpr)
        ? fieldDef.validatorExpr
        : undefined;
    const typeFieldSource: string | undefined = rawTypeDef ?? validatorFallback;

    result.push({
      name: fieldName,
      type: readableType,
      default: fieldDef.defaultValue ?? '',
      description: fieldDef.description,
      bindable: false,
      typeDefinition: rawTypeDef ?? validatorFallback,
      typeFields: typeFieldSource
        ? parseTypeFieldsForDisplay(typeFieldSource, combinedSource)
        : undefined,
      mockValues: fieldDef.mockValues.length > 0 ? fieldDef.mockValues : undefined,
      optional: fieldDef.optional || undefined,
      requires: fieldDef.requires,
    });
  }

  return result;
}

/**
 * Extract the component-level description from the first JSDoc block.
 *
 * Looks for the first multi-line JSDoc comment in the instance `<script>` block
 * (not `<script module>`) and returns the first paragraph before any `@` tags.
 *
 * @param source - Raw `.svelte` file content
 * @returns Component description, or empty string
 */
export function extractDescription(source: string): string {
  if (!source) return '';

  // Find the instance <script> block (not <script module>)
  const scriptMatch: RegExpMatchArray | null = source.match(
    /<script\s+lang=["']ts["']>([\s\S]*?)<\/script>/,
  );
  if (!scriptMatch) return '';
  const scriptContent: string = scriptMatch[1] ?? '';

  // Find the first JSDoc block
  const jsdocMatch: RegExpMatchArray | null = scriptContent.match(/\/\*\*\s*\n([\s\S]*?)\*\//);
  if (!jsdocMatch) return '';

  // Extract lines, remove * prefix, filter out @tags
  const lines: string[] = (jsdocMatch[1] ?? '')
    .split('\n')
    .map((l: string): string => l.replace(/^\s*\*\s?/, '').trim());

  // Collect first paragraph (stop at blank line or @tag)
  const desc: string[] = [];
  for (const line of lines) {
    if (line.startsWith('@')) break;
    if (line === '' && desc.length > 0) break;
    if (line !== '') desc.push(line);
  }

  return desc.join(' ');
}

/**
 * Extract renderable variant metadata from prop type strings.
 *
 * Finds props with enumerable types (string literal unions, booleans)
 * and converts them to variant key metadata for auto-variant rendering.
 * This enables variant grids for ALL components, not just TV components.
 *
 * @param props - Extracted prop metadata array
 * @returns Array of variant key metadata for renderable props
 */
export function extractPropsVariants(props: PropMeta[]): VariantKeyMeta[] {
  const variants: VariantKeyMeta[] = [];

  for (const { type, name, default: defaultVal, typeDefinition, mockValues, requires } of props) {
    if (!type) continue;

    /** Requires entries for this prop (undefined if empty, for clean output). */
    const reqEntries: { prop: string; value: string }[] | undefined =
      requires && requires.length > 0 ? requires : undefined;

    // @values JSDoc tag: highest priority — explicit author declaration.
    // Checked BEFORE isFunctionType so Snippet props with @values can generate variant cards.
    if (mockValues && mockValues.length > 1) {
      variants.push({
        key: name,
        options: mockValues,
        default: defaultVal ? defaultVal.replaceAll("'", '') : '',
        coerce: type.endsWith('[]') ? 'array' : undefined,
        requires: reqEntries,
      });
      continue;
    }

    // Snippet props with exactly 1 @value — generate a variant card to show what the
    // component looks like WITH the snippet rendered (the whole point of Snippet @values).
    if (isFunctionType(type, typeDefinition) && mockValues && mockValues.length === 1) {
      variants.push({
        key: name,
        options: mockValues,
        default: '',
        requires: reqEntries,
      });
      continue;
    }

    // Skip function types without @values — can't render Snippet/Component/callback as string variants
    if (isFunctionType(type, typeDefinition)) continue;

    // Boolean props: render true/false
    if (type === 'boolean' || type === 'Bool') {
      variants.push({
        key: name,
        options: ['true', 'false'],
        default: defaultVal || '',
        requires: reqEntries,
      });
      continue;
    }

    // Numeric props with a default: generate scaled variants
    if (type === 'number' || type === 'Num') {
      const numDefault: number = Number(defaultVal);
      if (!Number.isNaN(numDefault) && numDefault > 0) {
        const isInt: boolean = Number.isInteger(numDefault);
        const scales: number[] = [0.5, 1, 1.5, 2];
        const options: string[] = scales.map((s: number): string => {
          const val: number = numDefault * s;
          return isInt ? String(Math.round(val)) : String(val);
        });
        variants.push({
          key: name,
          options,
          default: defaultVal || '',
          requires: reqEntries,
        });
      }
      continue;
    }

    // Union of string literals: 'a' | 'b' | 'c' (inline type)
    if (type.includes(' | ')) {
      const resolved: string[] | null = parseStringLiteralUnion(type);
      if (resolved && resolved.length > 1) {
        variants.push({
          key: name,
          options: resolved,
          default: defaultVal ? defaultVal.replaceAll("'", '') : '',
          requires: reqEntries,
        });
      }
      continue;
    }

    // Resolved type definitions: check typeDefinition for string literal unions
    // Covers named types like ButtonVariant → 'default' | 'secondary' | ...
    if (typeDefinition?.includes(' | ')) {
      const resolved: string[] | null = parseStringLiteralUnion(typeDefinition);
      if (resolved && resolved.length > 1) {
        variants.push({
          key: name,
          options: resolved,
          default: defaultVal ? defaultVal.replaceAll("'", '') : '',
          requires: reqEntries,
        });
      }
    }
  }

  // Scan typeFields for enumerable sub-fields (picklists, booleans)
  // Skip array-typed props — their typeFields are inner item fields (from unwrapping
  // v.array()), and dotted variants would produce Objects where Arrays are expected.
  for (const prop of props) {
    if (!prop.typeFields || prop.typeFields.length === 0) continue;
    if (prop.type.endsWith('[]')) continue;
    const isRecordParent: boolean =
      prop.type.startsWith('Record<') || (prop.typeDefinition?.startsWith('Record<') ?? false);
    for (const tf of prop.typeFields) {
      // Skip [key] placeholder for Record types — the key isn't a real field
      if (isRecordParent && tf.field === '[key]') continue;
      const parsed: TypeFieldVariantResult = parseTypeFieldAccepts(tf);
      if (parsed.options.length > 1) {
        // Record value sub-fields need special coercion in the renderer
        const coerce: 'array' | 'record-value' | undefined = isRecordParent
          ? 'record-value'
          : parsed.coerce;
        variants.push({
          key: `${prop.name}.${tf.field}`,
          options: parsed.options,
          default: '',
          coerce,
        });
      }
    }
  }

  return variants;
}

/** Result of parsing a TypeField's accepts string for variant generation. */
type TypeFieldVariantResult = {
  /** Option strings for variant generation. */
  options: string[];
  /** Coercion hint for the renderer — 'array' splits comma-separated strings into arrays, 'record-value' modifies values within Record entries. */
  coerce: 'array' | 'record-value' | undefined;
};

/**
 * Parse a TypeField's accepts string into variant options.
 *
 * ALL typeFields generate variants. Enumerable types (picklists, booleans)
 * use their actual accepted values. Freeform types (text, number) get
 * sensible example values. Array types get coerce hint so renderer splits
 * comma-separated strings into actual arrays.
 *
 * When a TypeField has explicit mockValues from @values JSDoc, those are
 * used as variant options — this ensures complex types (array-of-objects,
 * nested schemas) get structurally valid mock data instead of fallback strings.
 *
 * @param tf - The TypeField to parse
 * @returns Options and coercion hint for variant generation
 */
function parseTypeFieldAccepts(tf: TypeField): TypeFieldVariantResult {
  const accepts: string = tf.accepts.trim();

  // Explicit @values mockValues — highest priority, same as prop-level @values
  if (tf.mockValues && tf.mockValues.length > 1) {
    // For array-typed fields, check if mockValues are complex (objects/arrays)
    // and need JSON coercion rather than string splitting
    if (tf.type.endsWith('[]')) {
      const firstParsed: unknown = tryParseJsLiteral(tf.mockValues[0] ?? '');
      if (firstParsed !== undefined && typeof firstParsed === 'object') {
        // Complex array items — store as JSON strings, renderer parses them
        return {
          options: tf.mockValues.map((mv: string): string => {
            const parsed: unknown = tryParseJsLiteral(mv);
            if (parsed === undefined) return mv;
            return JSON.stringify(parsed);
          }),
          coerce: 'array',
        };
      }
    }
    return { options: tf.mockValues, coerce: tf.type.endsWith('[]') ? 'array' : undefined };
  }

  // Boolean fields
  if (accepts === 'true / false' || tf.type === 'Bool' || tf.type === 'boolean') {
    return { options: ['true', 'false'], coerce: undefined };
  }

  // Comma-separated picklist values
  if (accepts.includes(', ') && !accepts.startsWith('list of ')) {
    const items: string[] = accepts
      .split(', ')
      .map((s: string): string => s.trim())
      .filter(Boolean);
    if (items.length > 1) return { options: items, coerce: undefined };
  }

  // Number fields — generate example values
  if (accepts === 'number' || tf.type === 'Num' || tf.type === 'number') {
    return { options: ['0', '1', '5', '10'], coerce: undefined };
  }

  // Text fields — generate example text variants
  if (accepts === 'text' || tf.type === 'Str' || tf.type === 'string') {
    return {
      options: ['Short', 'A medium example', 'A longer example text for testing'],
      coerce: undefined,
    };
  }

  // List/array fields — generate example list variants with array coercion
  if (accepts.startsWith('list of ')) {
    const innerType: string = accepts.slice('list of '.length).trim();
    const isSimpleInner: boolean =
      innerType === 'text' || innerType === 'number' || innerType === 'true / false';

    if (!isSimpleInner) {
      // Complex inner type (e.g. DepEntry) — use @values template if available
      if (tf.mockValues && tf.mockValues.length > 0) {
        const template: unknown = tryParseJsLiteral(tf.mockValues[0] ?? '');
        if (template !== undefined) {
          const item: unknown = Array.isArray(template) ? template[0] : template;
          if (item !== undefined) {
            const one: string = JSON.stringify([item]);
            const two: string = JSON.stringify([item, item]);
            return { options: [one, two], coerce: 'array' };
          }
        }
      }
      // No parseable template — can't generate structurally valid variants
      return { options: [], coerce: undefined };
    }

    return { options: ['one', 'one, two', 'one, two, three'], coerce: 'array' };
  }

  // Fallback — generate generic placeholders
  return { options: ['value-a', 'value-b', 'value-c'], coerce: undefined };
}

/**
 * Build base props from PropMeta defaults and first mock values.
 *
 * Provides reasonable values for ALL props so components with required
 * props don't crash when rendering variants. Handles nested object types
 * by constructing placeholder objects with empty string values, and
 * function types with no-op callbacks.
 *
 * @param propsMeta - Extracted prop metadata array
 * @returns Record of prop name to value (scalars, objects, or functions)
 */
export function buildBaseProps(propsMeta: PropMeta[]): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const prop of propsMeta) {
    if (prop.default) {
      // Strip quotes from string defaults
      const d: string = prop.default;
      if ((d.startsWith("'") && d.endsWith("'")) || (d.startsWith('"') && d.endsWith('"'))) {
        base[prop.name] = d.slice(1, -1);
      } else if (d === 'true') {
        base[prop.name] = true;
      } else if (d === 'false') {
        base[prop.name] = false;
      } else if (Number.isNaN(Number(d))) {
        base[prop.name] = d;
      } else {
        base[prop.name] = Number(d);
      }
    } else if (prop.type.startsWith('{ ')) {
      // Inline object type summary — construct placeholder with empty string values
      const placeholder: Record<string, string> | null = buildPlaceholderObject(prop.type);
      if (placeholder) base[prop.name] = placeholder;
    } else if (prop.typeDefinition?.startsWith('{')) {
      // Named type resolving to object — extract field names from definition body
      const placeholder: Record<string, string> | null = buildPlaceholderFromDefinition(
        prop.typeDefinition,
      );
      if (placeholder) base[prop.name] = placeholder;
    } else if (
      prop.mockValues &&
      prop.mockValues.length > 0 &&
      !prop.type.includes(') =>') &&
      !prop.type.includes('Snippet')
    ) {
      // Use first @values entry for non-function, non-Snippet props
      const firstMock: string = prop.mockValues[0] ?? '';
      if (firstMock.startsWith('{') && firstMock.endsWith('}')) {
        // Object literal in @values — parse as placeholder object
        const placeholder: Record<string, string> | null =
          buildPlaceholderFromDefinition(firstMock);
        if (placeholder) {
          base[prop.name] = placeholder;
        } else {
          base[prop.name] = firstMock;
        }
      } else {
        base[prop.name] = firstMock;
      }
    }
  }
  return base;
}

/**
 * Parse a `{ key1, key2, ... }` type summary into an object with empty string values.
 *
 * @param typeSummary - Type string like `{ goHome, tryAgain, copied }`
 * @returns Object with each key set to empty string, or null if not a summary
 */
function buildPlaceholderObject(typeSummary: string): Record<string, string> | null {
  if (!typeSummary.startsWith('{ ') || !typeSummary.endsWith(' }')) return null;
  const inner: string = typeSummary.slice(2, -2);
  const keys: string[] = inner
    .split(',')
    .map((k: string): string => k.trim())
    .filter((k: string): boolean => k.length > 0);
  if (keys.length === 0) return null;
  const obj: Record<string, string> = {};
  for (const key of keys) {
    obj[key] = '';
  }
  return obj;
}

/**
 * Extract field names from a resolved type definition body and build a placeholder object.
 * Parses JSDoc values tags from the definition body to populate placeholder values.
 *
 * @param definition - Resolved type definition string starting with `{`
 * @returns Placeholder object mapping field names to mock values, or null if empty
 */
// eslint-disable-next-line jsdoc/require-returns -- false positive: @returns IS present; oxlint misparses due to star-slash in string/regex literals
function buildPlaceholderFromDefinition(definition: string): Record<string, string> | null {
  const inner: string = definition.slice(1, -1).trim();
  if (!inner) return null;

  const obj: Record<string, string> = {};
  const lines: string[] = inner.split('\n');
  let pendingDescription: string = '';
  let inJSDoc: boolean = false;
  let jsdocLines: string[] = [];

  for (const line of lines) {
    const trimmed: string = line.trim();
    if (!trimmed) continue;

    // Multi-line JSDoc start
    if (trimmed.startsWith(JSDOC_OPEN) && !trimmed.endsWith(JSDOC_CLOSE)) {
      inJSDoc = true;
      jsdocLines = [];
      const afterOpen: string = trimmed.slice(3).trim();
      if (afterOpen) jsdocLines.push(afterOpen);
      continue;
    }

    // Multi-line JSDoc continuation
    if (inJSDoc) {
      if (trimmed.endsWith(JSDOC_CLOSE)) {
        const beforeClose: string = trimmed
          .slice(0, -2)
          .replace(/^\*\s*/, '')
          .trim();
        if (beforeClose) jsdocLines.push(beforeClose);
        pendingDescription = jsdocLines.join(' ').trim();
        inJSDoc = false;
        jsdocLines = [];
        continue;
      }
      const content: string = trimmed.replace(/^\*\s*/, '').trim();
      if (content) jsdocLines.push(content);
      continue;
    }

    // Single-line JSDoc
    const singleJSDoc: RegExpMatchArray | null = trimmed.match(SINGLE_JSDOC_RE);
    if (singleJSDoc) {
      pendingDescription = singleJSDoc[1] ?? '';
      continue;
    }

    // Field line: fieldName?: Type;
    const fieldMatch: RegExpMatchArray | null = trimmed.match(/^(\w+)\??\s*:/);
    if (fieldMatch) {
      const key: string = fieldMatch[1] ?? '';
      if (key) {
        const parsed: ValuesTagResult = extractValuesTag(pendingDescription);
        obj[key] = parsed.mockValues[0] ?? '';
      }
      pendingDescription = '';
    }
  }

  return Object.keys(obj).length > 0 ? obj : null;
}

/**
 * Parse a string literal union type into an array of literal values.
 *
 * Given `"'a' | 'b' | undefined | 'c'"`, returns `['a', 'b', 'c']`.
 * Returns null if any non-literal, non-null/undefined part is found.
 *
 * @param typeStr - A type string potentially containing `'x' | 'y' | ...`
 * @returns Array of literal string values, or null if not all literals
 */
function parseStringLiteralUnion(typeStr: string): string[] | null {
  const parts: string[] = typeStr.split(' | ').map((p: string): string => p.trim());
  const literals: string[] = [];

  for (const part of parts) {
    if (part === 'undefined' || part === 'null') continue;
    if (part.startsWith("'") && part.endsWith("'")) {
      literals.push(part.slice(1, -1));
    } else {
      return null;
    }
  }

  return literals;
}

/* ------------------------------------------------------------------ */
/*  Internal types                                                     */
/* ------------------------------------------------------------------ */

/** Parsed $props() block — destructuring and type annotation separated. */
type PropsBlock = {
  /** Content between `let {` and `}` — the prop list. */
  destructuring: string;
  /** Content between `}:` and `= $props()` — the TypeScript type. */
  typeAnnotation: string;
};

/** A field parsed from a named type definition, with type and JSDoc description. */
type TypeDefField = {
  /** The TypeScript type annotation for this field. */
  type: string;
  /** JSDoc description from comment above the field, or empty. */
  description: string;
  /** Explicit mock values from `@values` JSDoc tag. */
  mockValues: string[];
  /** Whether this field is optional (from `v.optional()` or `?:` syntax). */
  optional: boolean;
  /** Original Valibot validator expression (for schema-based extraction). */
  validatorExpr?: string;
  /** Default value extracted from `v.optional(schema, defaultValue)` two-argument form. */
  defaultValue?: string;
  /** Cross-prop dependencies from `@requires propName:value` JSDoc tags. */
  requires?: RequiresEntry[];
};

/** Result of resolving a named type definition. */
type ResolvedTypeDef = {
  /** Field name → TypeScript type string. */
  types: Map<string, string>;
  /** Field name → full field metadata including JSDoc. */
  fields: Map<string, TypeDefField>;
};

/** Raw extracted prop before filtering and type enrichment. */
type RawProp = {
  /** Content between `let {` and `}` — the prop list. */
  name: string;
  /** The default value as source text, or empty. */
  defaultValue: string;
  /** JSDoc description from comment above the prop, or empty. */
  description: string;
  /** Whether the prop uses `$bindable()`. */
  bindable: boolean;
  /** Explicit mock values from `@values` JSDoc tag. */
  mockValues: string[];
  /** Cross-prop dependencies from `@requires propName:value` JSDoc tags. */
  requires: RequiresEntry[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** A single `@requires propName:value` dependency parsed from JSDoc. */
type RequiresEntry = {
  /** The prop name that must be set. */
  prop: string;
  /** The value the prop must be set to. */
  value: string;
};

/** Result of extracting `@values` and `@requires` from a JSDoc description string. */
type ValuesTagResult = {
  /** The description with the `@values` and `@requires` tags removed. */
  description: string;
  /** Parsed comma-separated values from the `@values` tag. */
  mockValues: string[];
  /** Parsed `@requires propName:value` entries. */
  requires: RequiresEntry[];
};

/**
 * Extract and strip `@values` and `@requires` tags from a JSDoc description string.
 *
 * Given `"Border radius. @values none, sm, md @requires variant:bordered"`,
 * returns `{ description: "Border radius.", mockValues: ["none", "sm", "md"], requires: [{ prop: "variant", value: "bordered" }] }`.
 *
 * Quoted values are supported for values with spaces: `@requires children:"Life is like a box of chocolates."`
 *
 * @param text - Raw JSDoc text potentially containing `@values` and/or `@requires`
 * @returns Separated description, mock values, and requires entries
 */
function extractValuesTag(text: string): ValuesTagResult {
  // Extract all @requires entries first (can appear multiple times)
  const requires: RequiresEntry[] = [];
  const requiresRe: RegExp = /@requires\s+(\w+):(?:"([^"]+)"|(\S+))/g;
  let reqMatch: RegExpExecArray | null = requiresRe.exec(text);
  while (reqMatch !== null) {
    requires.push({ prop: reqMatch[1] ?? '', value: reqMatch[2] ?? reqMatch[3] ?? '' });
    reqMatch = requiresRe.exec(text);
  }

  // Strip all @requires tags from text before processing @values
  const strippedText: string = text.replaceAll(/@requires\s+\w+:(?:"[^"]+"|(\S+))/g, '').trim();

  const valuesIdx: number = strippedText.indexOf('@values');
  if (valuesIdx === -1) return { description: strippedText, mockValues: [], requires };

  const description: string = strippedText.slice(0, valuesIdx).trim();
  const afterTag: string = strippedText.slice(valuesIdx + 7).trim();

  // Take up to the next @tag or end of string
  const nextTagMatch: RegExpMatchArray | null = afterTag.match(/\s@\w/);
  const rawValues: string = nextTagMatch
    ? afterTag.slice(0, nextTagMatch.index ?? afterTag.length)
    : afterTag;

  const mockValues: string[] = splitValuesRespectingBrackets(rawValues);

  return { description, mockValues, requires };
}

/**
 * Split a comma-separated @values string while respecting nested brackets/braces.
 *
 * Commas inside `{...}`, `[...]`, or `(...)` are NOT treated as separators.
 * This allows @values like `{category: "display", tags: ["interactive"]}` to remain
 * as a single value instead of being fragmented.
 *
 * @param raw - The raw @values content after the tag
 * @returns Array of trimmed, non-empty value strings
 */
function splitValuesRespectingBrackets(raw: string): string[] {
  const result: string[] = [];
  let depth: number = 0;
  let current: string = '';

  for (let i: number = 0; i < raw.length; i++) {
    const ch: string = raw[i] ?? '';
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      current += ch;
    } else if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0 && raw[i + 1] === ' ') {
      // Split on ", " (comma-space) — preserves commas within values like $1,234.56
      const trimmed: string = current.trim();
      if (trimmed.length > 0) result.push(trimmed);
      current = '';
      i++; // skip the space after comma
    } else {
      current += ch;
    }
  }
  const trimmed: string = current.trim();
  if (trimmed.length > 0) result.push(trimmed);
  return result;
}

/**
 * Find the `let { ... }: Type = $props()` block in the source.
 *
 * Uses a regex that matches across the instance `<script lang="ts">` block.
 * Handles multiline destructuring and multiline type annotations.
 *
 * @param source - Raw `.svelte` source
 * @returns The parsed block or null if no `$props()` found
 */
function findPropsBlock(source: string): PropsBlock | null {
  // Supports two patterns:
  // 1. Direct:    let/const { ... }: Type = $props()
  // 2. Validated: const raw = $props(); safeParse(...); const/let { ... }: Type = var.data

  const propsStart: number = source.indexOf('$props()');
  if (propsStart === -1) return null;

  // --- Pattern 1: Direct destructuring before $props() ---
  const letIdx: number = source.lastIndexOf('let {', propsStart);
  const constIdx: number = source.lastIndexOf('const {', propsStart);
  const declIdx: number = Math.max(letIdx, constIdx);

  if (declIdx !== -1) {
    const openBrace: number = source.indexOf('{', declIdx);
    if (openBrace !== -1) {
      const closeBrace: number = findMatchingBrace(source, openBrace);
      if (closeBrace !== -1) {
        const destructuring: string = source.slice(openBrace + 1, closeBrace);
        const afterBrace: string = source.slice(closeBrace + 1, propsStart);
        const typeAnnotation: string = afterBrace
          .replace(/^\s*:\s*/, '')
          .replace(/\s*=\s*$/, '')
          .trim();
        // Skip if the only destructured items are rest elements (schema-based path handles these)
        const stripped: string = destructuring
          .replaceAll(/\/\*[\s\S]*?\*\//g, '')
          .replaceAll(/\/\/[^\n]*/g, '')
          .trim();
        const hasNamedProps: boolean = !/^\.\.\.\w+\s*,?\s*$/.test(stripped);
        if (typeAnnotation && hasNamedProps) {
          return { destructuring, typeAnnotation };
        }
      }
    }
  }

  // --- Pattern 2: Validated — destructuring from .data after $props() ---
  const afterProps: string = source.slice(propsStart + 8);
  const newLetIdx: number = afterProps.indexOf('let {');
  const newConstIdx: number = afterProps.indexOf('const {');
  let newDeclIdx: number = -1;
  if (newLetIdx !== -1 && newConstIdx !== -1) {
    newDeclIdx = Math.min(newLetIdx, newConstIdx);
  } else {
    newDeclIdx = Math.max(newLetIdx, newConstIdx);
  }

  if (newDeclIdx !== -1) {
    const absIdx: number = propsStart + 8 + newDeclIdx;
    const openBrace: number = source.indexOf('{', absIdx);
    if (openBrace !== -1) {
      const closeBrace: number = findMatchingBrace(source, openBrace);
      if (closeBrace !== -1) {
        const afterClose: string = source.slice(closeBrace + 1);
        const typeDataMatch: RegExpMatchArray | null = afterClose.match(
          /^\s*:\s*(.+?)\s*=\s*\w+\.data/,
        );
        if (typeDataMatch) {
          return {
            destructuring: source.slice(openBrace + 1, closeBrace),
            typeAnnotation: (typeDataMatch[1] ?? '').trim(),
          };
        }
      }
    }
  }

  return null;
}

/**
 * Find the matching closing brace for an opening brace at the given index.
 *
 * @param source - Full source string
 * @param openIdx - Index of the opening brace
 * @returns Index of the matching closing brace, or -1 if not found
 */
function findMatchingBrace(source: string, openIdx: number): number {
  let depth: number = 0;
  let inString: string | null = null;

  for (let i: number = openIdx; i < source.length; i++) {
    const ch: string = source[i] ?? '';
    const prev: string = source[i - 1] ?? '';

    // Track string literals (skip braces inside strings)
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      continue;
    }
    if (inString && ch === inString && prev !== '\\') {
      inString = null;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Resolve a named type annotation to its definition in the same source file.
 *
 * Searches for `type <name> = { ... }` or `type <name> = SomeType & { ... }`
 * and parses the `{ ... }` blocks for field types and JSDoc descriptions.
 *
 * @param source - Full raw `.svelte` source
 * @param typeAnnotation - The type annotation from the $props() call
 * @returns Resolved types and field metadata, or null if not resolvable
 */
function resolveNamedType(source: string, typeAnnotation: string): ResolvedTypeDef | null {
  // Only resolve simple identifiers (e.g., `ErrorPageProps`, `ButtonProps`)
  const typeName: string = typeAnnotation.trim();
  if (!typeName || !/^\w+$/.test(typeName)) return null;

  // Find `type <name> = ...` in the source
  const typeDefRegex: RegExp = new RegExp(`type\\s+${typeName}\\s*=\\s*`);
  const match: RegExpExecArray | null = typeDefRegex.exec(source);
  if (!match) return null;

  const afterEquals: number = (match.index ?? 0) + match[0].length;
  const afterEqualsText: string = source.slice(afterEquals, afterEquals + 200).trim();

  // --- Valibot schema path: type X = v.InferInput/InferOutput<typeof YSchema> ---
  const inferMatch: RegExpMatchArray | null = afterEqualsText.match(
    /v\.Infer(?:Input|Output)\s*<\s*typeof\s+(\w+)\s*>/,
  );
  if (inferMatch) {
    const schemaName: string = inferMatch[1] ?? '';
    const resolved: ResolvedTypeDef | null = resolveValibotSchema(source, schemaName);
    if (resolved) return resolved;
  }

  // --- TypeScript type path: type X = { ... } or SomeType & { ... } ---
  const types: Map<string, string> = new Map();
  const fields: Map<string, TypeDefField> = new Map();

  // Scan for all `{ ... }` blocks in the type definition
  let pos: number = afterEquals;
  while (pos < source.length) {
    const ch: string = source[pos] ?? '';

    // Stop at semicollon or next top-level statement
    if (ch === ';') break;

    if (ch === '{') {
      const closeIdx: number = findMatchingBrace(source, pos);
      if (closeIdx === -1) break;

      const blockBody: string = source.slice(pos + 1, closeIdx);
      parseTypeBlockFields(blockBody, types, fields);
      pos = closeIdx + 1;
      continue;
    }

    pos++;
  }

  if (types.size === 0 && fields.size === 0) return null;
  return { types, fields };
}

/**
 * Resolve a Valibot schema definition to field types and descriptions.
 *
 * Finds `const <name> = v.strictObject({ ... })` or `v.objectWithRest({ ... }, ...)`
 * and parses each field's Valibot validator into a readable type string.
 *
 * @param source - Full raw source
 * @param schemaName - Name of the schema constant (e.g., `LensEmptyPropsSchema`)
 * @returns Resolved types and field metadata, or null
 */
function resolveValibotSchema(source: string, schemaName: string): ResolvedTypeDef | null {
  // Find: const <name> = v.strictObject({ ... }) or v.objectWithRest({ ... }, ...)
  const schemaRegex: RegExp = new RegExp(
    `(?:const|export\\s+const)\\s+${schemaName}\\s*=\\s*v\\.(?:strictObject|objectWithRest|looseObject)\\s*\\(`,
  );
  const schemaMatch: RegExpExecArray | null = schemaRegex.exec(source);
  if (!schemaMatch) return null;

  const parenStart: number = (schemaMatch.index ?? 0) + schemaMatch[0].length - 1;
  // Find the opening `{` of the schema fields object
  const braceStart: number = source.indexOf('{', parenStart);
  if (braceStart === -1) return null;

  const braceEnd: number = findMatchingBrace(source, braceStart);
  if (braceEnd === -1) return null;

  const schemaBody: string = source.slice(braceStart + 1, braceEnd);
  return parseValibotSchemaFields(schemaBody);
}

/**
 * Parse field entries from a Valibot `v.strictObject({ ... })` body.
 *
 * Extracts field name, converts Valibot validator to readable type, and
 * captures JSDoc description and @values.
 *
 * @param body - Content between `{` and `}` of `v.strictObject()`
 * @returns Resolved type definitions
 */
function parseValibotSchemaFields(body: string): ResolvedTypeDef {
  const types: Map<string, string> = new Map();
  const fields: Map<string, TypeDefField> = new Map();

  const lines: string[] = body.split('\n');
  let pendingDescription: string = '';
  let pendingMockValues: string[] = [];
  let pendingRequires: RequiresEntry[] = [];
  let inJSDoc: boolean = false;
  let jsdocLines: string[] = [];

  for (let idx: number = 0; idx < lines.length; idx++) {
    const line: string = lines[idx] ?? '';
    const trimmed: string = line.trim();
    if (!trimmed) continue;

    // JSDoc collection (same as parseTypeBlockFields)
    if (trimmed.startsWith(JSDOC_OPEN)) {
      const singleMatch: RegExpMatchArray | null = trimmed.match(SINGLE_JSDOC_RE);
      if (singleMatch) {
        const parsed: ValuesTagResult = extractValuesTag(singleMatch[1] ?? '');
        pendingDescription = parsed.description;
        pendingMockValues = parsed.mockValues;
        pendingRequires = parsed.requires;
        continue;
      }
      inJSDoc = true;
      jsdocLines = [];
      const afterOpen: string = trimmed.slice(JSDOC_OPEN.length).trim();
      if (afterOpen && !afterOpen.startsWith('*')) {
        jsdocLines.push(afterOpen);
      }
      continue;
    }
    if (inJSDoc) {
      if (trimmed.includes(JSDOC_CLOSE)) {
        const beforeClose: string = trimmed
          .replace(/\*\/.*$/, '')
          .replace(/^\*\s?/, '')
          .trim();
        if (beforeClose) jsdocLines.push(beforeClose);
        const fullDoc: string = jsdocLines.join(' ');
        const parsed: ValuesTagResult = extractValuesTag(fullDoc);
        pendingDescription = parsed.description;
        pendingMockValues = parsed.mockValues;
        pendingRequires = parsed.requires;
        inJSDoc = false;
        continue;
      }
      const cleaned: string = trimmed.replace(/^\*\s?/, '').trim();
      if (cleaned) jsdocLines.push(cleaned);
      continue;
    }

    // Parse field start: <name>: v.<validator>(...)
    // Validators may span multiple lines when inlineSchemaReferences expands named
    // schemas into multiline bodies. Accumulate lines until parens/braces are balanced.
    const fieldStartMatch: RegExpMatchArray | null = trimmed.match(/^(\w+)\s*:\s*([\s\S]+)$/);
    if (fieldStartMatch) {
      const fieldName: string = fieldStartMatch[1] ?? '';
      let expr: string = fieldStartMatch[2] ?? '';

      // Count brace/paren depth to detect multiline validators
      let depth: number = 0;
      for (const ch of expr) {
        if (ch === '(' || ch === '{' || ch === '[') depth++;
        else if (ch === ')' || ch === '}' || ch === ']') depth--;
      }

      // If unbalanced, accumulate subsequent lines until balanced
      if (depth > 0) {
        for (let li: number = idx + 1; li < lines.length && depth > 0; li++) {
          const nextLine: string = lines[li] ?? '';
          expr += `\n${nextLine}`;
          for (const ch of nextLine) {
            if (ch === '(' || ch === '{' || ch === '[') depth++;
            else if (ch === ')' || ch === '}' || ch === ']') depth--;
          }
          // Advance outer loop past consumed lines
          idx = li;
        }
      }

      // Strip trailing comma and whitespace
      const validatorExpr: string = expr.replace(/,\s*$/, '').trim();
      const isOptional: boolean = validatorExpr.trimStart().startsWith('v.optional(');
      const readableType: string = valibotToReadableType(validatorExpr);
      const parsedDefault: string | undefined = extractOptionalDefault(validatorExpr);
      types.set(fieldName, readableType);
      fields.set(fieldName, {
        type: readableType,
        description: pendingDescription,
        mockValues: pendingMockValues.length > 0 ? [...pendingMockValues] : [],
        optional: isOptional,
        validatorExpr,
        defaultValue: parsedDefault,
        requires: pendingRequires.length > 0 ? [...pendingRequires] : undefined,
      });
      pendingDescription = '';
      pendingMockValues = [];
      pendingRequires = [];
    }
  }

  return { types, fields };
}

/**
 * Split a string on the first top-level comma, respecting nested parens/brackets/braces.
 *
 * Used to separate `v.optional(schema, defaultValue)` into `[schema, defaultValue]`.
 * If no top-level comma exists, returns `[input, undefined]`.
 *
 * @param input - The string to split
 * @returns Tuple of [first part, rest or undefined]
 */
function splitFirstTopLevelComma(input: string): [string, string | undefined] {
  let depth: number = 0;
  for (let i: number = 0; i < input.length; i++) {
    const ch: string = input[i] ?? '';
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      return [input.slice(0, i).trim(), input.slice(i + 1).trim()];
    }
  }
  return [input.trim(), undefined];
}

/**
 * Extract the default value from a `v.optional(schema, defaultValue)` expression.
 *
 * Strips surrounding quotes, `as Type` casts, and common wrappers to produce
 * a clean default string for display in the Props Table.
 *
 * @param validatorExpr - Full validator expression (e.g., `v.optional(v.picklist([...]), 'default')`)
 * @returns The default value string, or undefined if no default
 */
function extractOptionalDefault(validatorExpr: string): string | undefined {
  const trimmed: string = validatorExpr.trim();
  if (!trimmed.startsWith('v.optional(')) return undefined;
  const inner: string = trimmed.slice('v.optional('.length, -1);
  const [, defaultPart] = splitFirstTopLevelComma(inner);
  if (!defaultPart) return undefined;
  // Clean up: strip trailing commas, `as Type` casts, whitespace
  const cleaned: string = defaultPart
    .trim()
    .replace(/,\s*$/, '')
    .replace(/\s+as\s+\w+$/i, '')
    .trim();
  // Remove surrounding single/double quotes
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    return cleaned.slice(1, -1);
  }
  return cleaned;
}

/**
 * Convert a Valibot validator expression to a human-readable type string.
 *
 * @param expr - Valibot expression (e.g., `v.optional(v.string())`, `v.picklist(['a', 'b'])`)
 * @returns Readable type string (e.g., `string`, `'a' | 'b'`)
 */
function valibotToReadableType(expr: string): string {
  const trimmed: string = expr.trim();

  // v.optional(...) — unwrap, extracting only the schema (first argument)
  if (trimmed.startsWith('v.optional(')) {
    const inner: string = trimmed.slice('v.optional('.length, -1);
    const schemaArg: string = splitFirstTopLevelComma(inner)[0] ?? inner;
    return valibotToReadableType(schemaArg);
  }

  // v.nullable(...) — unwrap and append ' | null'
  if (trimmed.startsWith('v.nullable(')) {
    const inner: string = trimmed.slice('v.nullable('.length, -1);
    return `${valibotToReadableType(inner)} | null`;
  }

  // v.string() → string
  if (trimmed === 'v.string()') return 'string';

  // v.number() → number
  if (trimmed === 'v.number()') return 'number';

  // v.boolean() → boolean
  if (trimmed === 'v.boolean()') return 'boolean';

  // v.picklist([...]) → extract literal union
  const picklistMatch: RegExpMatchArray | null = trimmed.match(/^v\.picklist\(\[([^\]]*)\]\)/);
  if (picklistMatch) {
    const items: string = picklistMatch[1] ?? '';
    return items
      .split(',')
      .map((s: string): string => s.trim())
      .filter(Boolean)
      .join(' | ');
  }

  // v.custom<Type>(...) → extract the generic parameter
  const customMatch: RegExpMatchArray | null = trimmed.match(/^v\.custom<(.+?)>\(/);
  if (customMatch) return customMatch[1] ?? 'unknown';

  // v.array(v.xxx()) → extract inner type and append []
  // Use [\s\S] instead of . to match across newlines from inlined multiline schemas
  const arrayMatch: RegExpMatchArray | null = trimmed.match(/^v\.array\(([\s\S]+)\)$/);
  if (arrayMatch) {
    const inner: string = valibotToReadableType(arrayMatch[1] ?? '');
    return `${inner}[]`;
  }

  // v.record(keyValidator, valueValidator) → Record<key, value>
  if (trimmed.startsWith('v.record(')) {
    const inner: string = trimmed.slice('v.record('.length, -1);
    const args: string[] = splitTopLevel(inner, ',');
    const keyType: string = args[0] ? valibotToReadableType(args[0]) : 'string';
    const valueType: string = args[1] ? valibotToReadableType(args[1]) : 'unknown';
    return `Record<${keyType}, ${valueType}>`;
  }

  // v.pipe(...) → try to extract the base type
  if (trimmed.startsWith('v.pipe(')) {
    const inner: string = trimmed.slice('v.pipe('.length);
    const firstArg: string = inner.split(',')[0]?.trim() ?? '';
    return valibotToReadableType(firstArg);
  }

  // Named schema reference (e.g., ModeToggleLabelsSchema) → use schema name sans "Schema"
  if (/^\w+Schema$/.test(trimmed)) {
    return trimmed.replace(/Schema$/, '');
  }

  // Inline object schemas — return clean "object" instead of dumping raw body
  if (trimmed.startsWith('v.strictObject(') || trimmed.startsWith('v.object(')) {
    return 'object';
  }

  // Fallback — return expression cleaned up
  return trimmed.replace(/^v\./, '').replace(/\(\)$/, '');
}

/**
 * Parse fields from a type definition block body, extracting types and JSDoc.
 *
 * @param blockBody - Content between `{` and `}` of a type definition
 * @param types - Map to populate with field name → type string
 * @param fields - Map to populate with field name → full field metadata
 */
function parseTypeBlockFields(
  blockBody: string,
  types: Map<string, string>,
  fields: Map<string, TypeDefField>,
): void {
  const lines: string[] = blockBody.split('\n');
  let pendingDescription: string = '';
  let inJSDoc: boolean = false;
  let jsdocLines: string[] = [];
  let skipDepth: number = 0;
  let nestedFieldName: string = '';
  let nestedKeys: string[] = [];

  for (const line of lines) {
    const trimmed: string = line.trim();
    if (!trimmed) continue;

    // Collecting field names inside a nested object type body
    if (skipDepth > 0) {
      // Extract field names from nested body lines (e.g. `goHome: Str;`)
      const nestedField: RegExpMatchArray | null = trimmed.match(/^(\w+)\??\s*:/);
      if (nestedField && nestedField[1]) nestedKeys.push(nestedField[1]);

      for (const ch of trimmed) {
        if (ch === '{' || ch === '(') skipDepth++;
        else if (ch === '}' || ch === ')') skipDepth--;
      }
      // Balanced — record with summarized field names and reset
      if (skipDepth === 0) {
        if (nestedFieldName) {
          const summary: string = nestedKeys.length > 0 ? `{ ${nestedKeys.join(', ')} }` : 'object';
          const parsed: ValuesTagResult = extractValuesTag(pendingDescription);
          types.set(nestedFieldName, summary);
          fields.set(nestedFieldName, {
            type: summary,
            description: parsed.description,
            mockValues: parsed.mockValues,
            optional: false,
          });
        }
        nestedFieldName = '';
        nestedKeys = [];
        pendingDescription = '';
      }
      continue;
    }

    // Multi-line JSDoc start
    if (trimmed.startsWith(JSDOC_OPEN) && !trimmed.endsWith(JSDOC_CLOSE)) {
      inJSDoc = true;
      jsdocLines = [];
      const afterOpen: string = trimmed.slice(3).trim();
      if (afterOpen) jsdocLines.push(afterOpen);
      continue;
    }

    // Multi-line JSDoc continuation
    if (inJSDoc) {
      if (trimmed.endsWith(JSDOC_CLOSE)) {
        const beforeClose: string = trimmed
          .slice(0, -2)
          .replace(/^\*\s*/, '')
          .trim();
        if (beforeClose) jsdocLines.push(beforeClose);
        pendingDescription = jsdocLines.join(' ').trim();
        inJSDoc = false;
        jsdocLines = [];
        continue;
      }
      const content: string = trimmed.replace(/^\*\s*/, '').trim();
      if (content) jsdocLines.push(content);
      continue;
    }

    // Single-line JSDoc
    const singleJSDoc: RegExpMatchArray | null = trimmed.match(SINGLE_JSDOC_RE);
    if (singleJSDoc) {
      pendingDescription = singleJSDoc[1] ?? '';
      continue;
    }

    // Match field: `fieldName?: TypeExpression;` (with optional trailing semicolon/comma)
    const fieldMatch: RegExpMatchArray | null = trimmed.match(
      /^(\w+)(\??)\s*:\s*(.+?)\s*[;,]?\s*$/,
    );
    if (fieldMatch) {
      const fieldName: string = fieldMatch[1] ?? '';
      const isOptional: boolean = fieldMatch[2] === '?';
      const fieldType: string = (fieldMatch[3] ?? '').trim();

      // Inline object or function type spanning multiple lines — skip until balanced
      if (fieldType === '{' || fieldType.endsWith('=> {') || fieldType === '(') {
        skipDepth = 1;
        nestedFieldName = fieldName;
        continue;
      }

      if (fieldName && fieldType) {
        const parsed: ValuesTagResult = extractValuesTag(pendingDescription);
        types.set(fieldName, fieldType);
        fields.set(fieldName, {
          type: fieldType,
          description: parsed.description,
          mockValues: parsed.mockValues,
          optional: isOptional,
        });
      }
      pendingDescription = '';
      continue;
    }

    // Line didn't match — might be a nested object type opening brace, reset description
    if (!trimmed.startsWith('{')) {
      pendingDescription = '';
    }
  }
}

/**
 * Parse the destructured props block line by line.
 *
 * Handles JSDoc comments (single and multi-line), `$bindable()`, renamed
 * props (`class: className`), string-keyed props (`'data-slot': alias`),
 * and spread (`...rest`).
 *
 * @param destructuring - Content between `{` and `}` of the props destructuring
 * @returns Array of raw extracted props
 */
function parseDestructuring(destructuring: string): RawProp[] {
  // Normalize: split lines, then split non-comment lines on top-level commas
  // so single-line destructuring `{ a = 1, b = 2 }` is handled correctly.
  const rawLines: string[] = destructuring.split('\n');
  const segments: string[] = [];

  for (const rawLine of rawLines) {
    const t: string = rawLine.trim();
    if (!t) continue;

    // Don't split JSDoc comments on commas
    if (t.startsWith('/**') || t.startsWith('*') || t.endsWith('*/')) {
      segments.push(t);
      continue;
    }

    // Split on top-level commas for prop lines
    const parts: string[] = splitTopLevel(t, ',');
    for (const part of parts) {
      const p: string = part.trim();
      if (p) segments.push(p);
    }
  }

  const props: RawProp[] = [];
  let pendingDescription: string = '';
  let inJSDoc: boolean = false;
  let jsdocLines: string[] = [];

  for (const trimmed of segments) {
    if (!trimmed) continue;

    // Multi-line JSDoc start
    if (trimmed.startsWith(JSDOC_OPEN) && !trimmed.endsWith(JSDOC_CLOSE)) {
      inJSDoc = true;
      jsdocLines = [];
      // Extract text after /** on the opening line
      const afterOpen: string = trimmed.slice(3).trim();
      if (afterOpen) jsdocLines.push(afterOpen);
      continue;
    }

    // Multi-line JSDoc continuation
    if (inJSDoc) {
      if (trimmed.endsWith(JSDOC_CLOSE)) {
        // Closing line — extract text before */
        const beforeClose: string = trimmed
          .slice(0, -2)
          .replace(/^\*\s*/, '')
          .trim();
        if (beforeClose) jsdocLines.push(beforeClose);
        pendingDescription = jsdocLines.join(' ').trim();
        inJSDoc = false;
        jsdocLines = [];
        continue;
      }
      // Middle line — strip leading * and whitespace
      const content: string = trimmed.replace(/^\*\s*/, '').trim();
      if (content) jsdocLines.push(content);
      continue;
    }

    // Single-line JSDoc: /** ... */
    const singleJSDoc: RegExpMatchArray | null = trimmed.match(SINGLE_JSDOC_RE);
    if (singleJSDoc) {
      pendingDescription = singleJSDoc[1] ?? '';
      continue;
    }

    // Skip spread
    if (trimmed.startsWith('...')) {
      pendingDescription = '';
      continue;
    }

    // Skip string-keyed props: 'data-slot': alias
    if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
      pendingDescription = '';
      continue;
    }

    // Skip renamed props: class: className, — detected by `: identifier` pattern
    // But NOT props with defaults that happen to have colons in their type
    const renameMatch: RegExpMatchArray | null = trimmed.match(/^(\w+)\s*:\s*\w+/);
    if (renameMatch && !trimmed.includes('=')) {
      pendingDescription = '';
      continue;
    }

    // Parse prop: name, name = default, name = $bindable(default)
    const propMatch: RegExpMatchArray | null = trimmed.match(/^(\w+)(?:\s*=\s*(.+?))?(?:,\s*)?$/);
    if (propMatch) {
      const name: string = propMatch[1] ?? '';
      const rawDefault: string = (propMatch[2] ?? '').trim();

      let bindable: boolean = false;
      let defaultValue: string = rawDefault;

      // Check for $bindable()
      if (rawDefault.includes('$bindable')) {
        bindable = true;
        const bindableMatch: RegExpMatchArray | null =
          rawDefault.match(/\$bindable\(\s*(.*?)\s*\)/);
        defaultValue = bindableMatch?.[1] ?? '';
      }

      const parsed: ValuesTagResult = extractValuesTag(pendingDescription);
      props.push({
        name,
        defaultValue,
        description: parsed.description,
        bindable,
        mockValues: parsed.mockValues,
        requires: parsed.requires,
      });
      pendingDescription = '';
    }
  }

  return props;
}

/**
 * Parse inline type definitions from a type annotation's intersection blocks.
 *
 * @param typeAnnotation - The full type annotation between closing brace and $props()
 * @returns Map of field name to its TypeScript type string
 */
function parseInlineTypes(typeAnnotation: string): Map<string, string> {
  const types: Map<string, string> = new Map();
  if (!typeAnnotation) return types;

  // Find the outermost `{ ... }` blocks that are part of inline object types.
  // Split on top-level `&` first, then parse blocks starting with `{`.
  const parts: string[] = splitTopLevel(typeAnnotation, '&');

  for (const part of parts) {
    const trimmed: string = part.trim();
    if (!trimmed.startsWith('{')) continue;

    // Remove outer braces
    const inner: string = trimmed.slice(1, -1).trim();
    if (!inner) continue;

    // Parse field definitions: fieldName?: TypeExpression;
    // Use line-by-line parsing to handle complex types (generics with nested braces)
    const fieldLines: string[] = inner.split(';');
    for (const fieldLine of fieldLines) {
      const ft: string = fieldLine.trim();
      if (!ft) continue;

      // Match: fieldName?: TypeExpression
      const fieldMatch: RegExpMatchArray | null = ft.match(/^(\w+)\??\s*:\s*(.+)$/);
      if (fieldMatch) {
        const fieldName: string = fieldMatch[1] ?? '';
        const fieldType: string = (fieldMatch[2] ?? '').trim();
        if (fieldName && fieldType) {
          types.set(fieldName, fieldType);
        }
      }
    }
  }

  return types;
}

/**
 * Split a string on a delimiter, but only at the top nesting level.
 *
 * Respects nesting of `<>`, `{}`, `()`, `[]` — won't split inside generics
 * or nested object types.
 *
 * @param str - String to split
 * @param delimiter - Single-character delimiter to split on
 * @returns Array of parts
 */
function splitTopLevel(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let depth: number = 0;
  let start: number = 0;

  for (let i: number = 0; i < str.length; i++) {
    const ch: string = str[i] ?? '';
    if (ch === '<' || ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '>' || ch === '}' || ch === ')' || ch === ']') depth--;
    else if (ch === delimiter && depth === 0) {
      parts.push(str.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(str.slice(start));
  return parts;
}

/**
 * Extract a parent type name from a type annotation for inherited prop type display.
 *
 * Given an intersection type annotation, extracts the innermost generic argument
 * of the first non-block part. Falls back to the first simple type name.
 *
 * @param typeAnnotation - The full type annotation string
 * @returns The parent type name, or empty string if none found
 */
function extractInheritedTypeName(typeAnnotation: string): string {
  if (!typeAnnotation) return '';

  const parts: string[] = splitTopLevel(typeAnnotation, '&');
  for (const part of parts) {
    const t: string = part.trim();
    if (t.startsWith('{')) continue;

    // Extract innermost type from generics like WithElementRef<HTMLAnchorAttributes>
    const innerMatch: RegExpMatchArray | null = t.match(/<([^<>]+)>/);
    if (innerMatch) {
      const inner: string = (innerMatch[1] ?? '').trim();
      if (/^\w+$/.test(inner)) return inner;
    }

    // Use the type name itself if no generics (e.g., `SomeBaseType`)
    if (/^\w+$/.test(t)) return t;
  }

  return '';
}

/**
 * Find the end of a statement starting at `start` using bracket depth tracking.
 *
 * Skips string literals, block comments, and line comments so that brackets and
 * semicolons inside comments or strings don't affect depth.
 *
 * @param source - Full source text
 * @param start - Index after the `=` in a `const x = ...` or `type x = ...`
 * @returns Index of the terminating semicolon, or source.length
 */
function findStatementEnd(source: string, start: number): number {
  let depth: number = 0;
  let inString: string | null = null;

  for (let i: number = start; i < source.length; i++) {
    const ch: string = source[i] ?? '';
    const next: string = source[i + 1] ?? '';
    const prev: string = source[i - 1] ?? '';

    // Skip block comments: /* ... */
    if (!inString && ch === '/' && next === '*') {
      const closeIdx: number = source.indexOf('*/', i + 2);
      if (closeIdx === -1) return source.length;
      i = closeIdx + 1; // skip past */
      continue;
    }

    // Skip line comments: // ...
    if (!inString && ch === '/' && next === '/') {
      const nlIdx: number = source.indexOf('\n', i + 2);
      if (nlIdx === -1) return source.length;
      i = nlIdx;
      continue;
    }

    // String tracking
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      continue;
    }
    if (inString && ch === inString && prev !== '\\') {
      inString = null;
      continue;
    }
    if (inString) continue;

    // Bracket depth (skip angle brackets — they break on Svelte HTML templates)
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') depth--;

    if (depth === 0 && ch === ';') return i;
  }

  return source.length;
}

/**
 * Resolve the full type definition body for a given type name from the source.
 *
 * Handles three patterns:
 * 1. `type X = 'a' | 'b' | 'c'` — returns the RHS as-is
 * 2. `type X = VariantProps<typeof Y>['key']` — resolves from the tv() variant values
 * 3. `type X = { field: type; ... }` — returns the structured definition
 *
 * @param typeName - The type name to resolve (e.g. `ButtonVariant`)
 * @param source - Full raw .svelte source
 * @returns The resolved definition string, or undefined if not resolvable
 */
function resolveTypeDefinition(typeName: string, source: string): string | undefined {
  if (!typeName || !source) return undefined;

  // Strip array notation (e.g. SearchItem[] → SearchItem) before lookup
  const isArray: boolean = typeName.endsWith('[]');
  let baseTypeName: string = isArray ? typeName.slice(0, -2) : typeName;

  // Strip nullable wrappers (e.g. LensMeta | null → LensMeta) before lookup
  baseTypeName = baseTypeName.replaceAll(/\s*\|\s*(null|undefined)\b/g, '').trim();
  baseTypeName = baseTypeName.replaceAll(/^(null|undefined)\s*\|\s*/g, '').trim();

  // Skip primitives and simple types — no definition to resolve
  if (/^(string|number|boolean|Str|Num|Bool|Void|Snippet|Component)$/.test(baseTypeName)) {
    return undefined;
  }

  // Skip indexed access types — can't resolve without full TS
  if (baseTypeName.includes("['")) return undefined;

  // Skip union types — they ARE the definition already (after nullable strip)
  if (baseTypeName.includes(' | ')) return undefined;

  // Skip generic types (Record<K,V>, Map<K,V>, etc.) — no type alias to resolve
  if (baseTypeName.includes('<')) return undefined;

  // PRIORITY: Try schema-const resolution FIRST — `const <Name>Schema = v.strictObject(...)`
  // Schema-const definitions have richer metadata (JSDoc, @values, nested schemas) than
  // plain TS type definitions. This also avoids issues where `type Xxx = { ... }` from
  // supplementary sources has JSDoc comments that parsePlainObjectFields can't handle.
  const schemaConstName: string = `${baseTypeName}Schema`;
  const schemaResolved: string | undefined = resolveConstDefinition(schemaConstName, source);
  if (schemaResolved && /^v\.(?:strict)?[Oo]bject\(/.test(schemaResolved)) {
    return schemaResolved;
  }

  // Find `type <name> = ...` or `export type <name> = ...`
  const typeDefRegex: RegExp = new RegExp(
    `(?:export\\s+)?type\\s+${baseTypeName.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\s*=\\s*`,
  );
  const match: RegExpExecArray | null = typeDefRegex.exec(source);
  if (!match) {
    return undefined;
  }

  const afterEquals: number = (match.index ?? 0) + match[0].length;

  // Check if it's a VariantProps pattern: VariantProps<typeof X>['key']
  const variantPropsMatch: RegExpMatchArray | null = source
    .slice(afterEquals, afterEquals + 200)
    .match(/^VariantProps<typeof\s+\w+>\[['"](\w+)['"]\]/);
  if (variantPropsMatch) {
    const variantKey: string = variantPropsMatch[1] ?? '';
    return resolveVariantValues(variantKey, source);
  }

  const end: number = findStatementEnd(source, afterEquals);
  const definition: string = source.slice(afterEquals, end).trim();
  if (!definition || definition === typeName) return undefined;

  // Resolve Valibot inferred types: v.InferOutput<typeof SchemaName> → schema RHS
  const inferMatch: RegExpMatchArray | null = definition.match(/^v\.InferOutput<typeof\s+(\w+)>/);
  if (inferMatch) {
    const schemaName: string = inferMatch[1] ?? '';
    if (schemaName) {
      const resolved: string | undefined = resolveConstDefinition(schemaName, source);
      if (resolved) return resolved;
    }
  }

  return definition;
}

/**
 * Parse a resolved type definition string into structured TypeField[] for tooltip display.
 *
 * Handles Valibot object schemas (`v.strictObject({...})`), records (`v.record(...)`),
 * plain object types (`{ field: type }`), and non-object types. Automatically unwraps
 * `v.optional()` and `v.nullable()` wrappers. For records with named schema values,
 * resolves and expands the value schema's fields when `source` is provided.
 *
 * @param definition - Raw resolved type definition string
 * @param source - Optional combined source for resolving nested schema references
 * @returns Array of TypeField for display, or undefined if not parseable
 */
function parseTypeFieldsForDisplay(definition: string, source?: string): TypeField[] | undefined {
  let trimmed: string = definition.trim();

  // Unwrap v.optional(...), v.nullable(...), and v.array(...) wrappers — they don't affect field structure
  while (
    trimmed.startsWith('v.optional(') ||
    trimmed.startsWith('v.nullable(') ||
    trimmed.startsWith('v.array(')
  ) {
    let prefix: string = 'v.array(';
    if (trimmed.startsWith('v.optional(')) {
      prefix = 'v.optional(';
    } else if (trimmed.startsWith('v.nullable(')) {
      prefix = 'v.nullable(';
    }
    trimmed = trimmed.slice(prefix.length, -1).trim();
  }

  // After unwrapping, if we have a named schema ref (e.g. DepEntrySchema from
  // v.array(DepEntrySchema)), resolve it and re-parse so sub-fields expand —
  // same pattern Records use at line 1576 for value schema resolution.
  if (/^\w+Schema$/.test(trimmed) && source) {
    const resolved: string | undefined = resolveConstDefinition(trimmed, source);
    if (resolved) {
      const nestedFields: TypeField[] | undefined = parseTypeFieldsForDisplay(resolved, source);
      if (nestedFields && nestedFields.length > 0) return nestedFields;
    }
  }

  // v.strictObject({ ... }) or v.object({ ... })
  const objMatch: RegExpMatchArray | null = trimmed.match(
    /^v\.(?:strict)?[Oo]bject\(\{([\s\S]*)\}\)$/,
  );
  if (objMatch) {
    return parseValibotObjectFields(objMatch[1] ?? '', source);
  }

  // v.record(keyValidator, valueValidator) — resolve value schema fields if possible
  if (trimmed.startsWith('v.record(')) {
    const inner: string = trimmed.slice('v.record('.length, -1);
    const args: string[] = splitTopLevel(inner, ',');
    const valueExpr: string = (args[1] ?? '').trim();
    const keyField: TypeField = {
      field: '[key]',
      type: valibotToReadableType(args[0] ?? 'v.string()'),
      required: true,
      accepts: humanizeValibotExpr(args[0] ?? 'v.string()'),
      description: 'Record key',
    };

    // If the value is a named schema (e.g. ComponentSizeSchema), resolve it and
    // expand its fields so users see the actual sub-fields, not just [key]/[value].
    if (/^\w+Schema$/.test(valueExpr) && source) {
      const resolved: string | undefined = resolveConstDefinition(valueExpr, source);
      if (resolved) {
        const valueFields: TypeField[] | undefined = parseTypeFieldsForDisplay(resolved);
        if (valueFields && valueFields.length > 0) {
          return [keyField, ...valueFields];
        }
      }
    }

    // Fallback: show [key] + [value] placeholder
    return [
      keyField,
      {
        field: '[value]',
        type: valibotToReadableType(valueExpr || 'unknown'),
        required: true,
        accepts: humanizeValibotExpr(valueExpr || 'unknown'),
        description: 'Record value',
      },
    ];
  }

  // Plain object type { field: type; ... }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parsePlainObjectFields(trimmed.slice(1, -1));
  }

  // Non-object type — return single field summarizing it
  const humanized: string = humanizeValibotExpr(trimmed);
  if (humanized && humanized !== trimmed) {
    return [
      {
        field: '(value)',
        type: valibotToReadableType(trimmed),
        required: true,
        accepts: humanized,
        description: '',
      },
    ];
  }

  return undefined;
}

/**
 * Parse fields from a Valibot object schema body into TypeField[].
 *
 * @param body - Inner content of `v.strictObject({ ... })` without the outer braces
 * @param source - Optional combined source for resolving nested schema references
 * @returns Array of TypeField
 */
function parseValibotObjectFields(body: string, source?: string): TypeField[] {
  const fields: TypeField[] = [];
  let pos: number = 0;
  let pendingDescription: string = '';
  let pendingMockValues: string[] = [];

  while (pos < body.length) {
    // Skip whitespace
    while (pos < body.length && /\s/.test(body[pos] ?? '')) pos++;
    if (pos >= body.length) break;

    // JSDoc comment: /** ... */
    if (body.slice(pos, pos + 3) === JSDOC_OPEN) {
      const closeIdx: number = body.indexOf(JSDOC_CLOSE, pos + 3);
      if (closeIdx === -1) break;
      const commentBody: string = body.slice(pos + 3, closeIdx);
      const rawDoc: string = commentBody
        .split('\n')
        .map((l: string): string =>
          l
            .trim()
            .replace(/^\*\s*/, '')
            .trim(),
        )
        .filter(Boolean)
        .join(' ');
      // Strip @values tag and propagate mock values to TypeField
      const parsedDoc: ValuesTagResult = extractValuesTag(rawDoc);
      pendingDescription = parsedDoc.description;
      pendingMockValues = parsedDoc.mockValues;
      pos = closeIdx + 2;
      continue;
    }

    // Line comment: // ...
    if (body.slice(pos, pos + 2) === '//') {
      const nlIdx: number = body.indexOf('\n', pos);
      pos = nlIdx === -1 ? body.length : nlIdx + 1;
      continue;
    }

    // Field: identifier followed by ':'
    const fieldStart: RegExpExecArray | null = /^(\w+)\s*:\s*/.exec(body.slice(pos));
    if (!fieldStart) {
      const nl: number = body.indexOf('\n', pos);
      pos = nl === -1 ? body.length : nl + 1;
      continue;
    }

    const fieldName: string = fieldStart[1] ?? '';
    const valueStart: number = pos + fieldStart[0].length;

    // Extract the full value expression by tracking depth until comma at depth 0
    let depth: number = 0;
    let inString: string | null = null;
    let valueEnd: number = valueStart;

    for (let i: number = valueStart; i < body.length; i++) {
      const ch: string = body[i] ?? '';
      const prev: string = body[i - 1] ?? '';

      if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
        inString = ch;
        continue;
      }
      if (inString && ch === inString && prev !== '\\') {
        inString = null;
        continue;
      }
      if (inString) continue;

      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;

      if (depth === 0 && ch === ',') {
        valueEnd = i;
        break;
      }
      if (depth < 0) {
        valueEnd = i;
        break;
      }
      valueEnd = i + 1;
    }

    const schemaExpr: string = body.slice(valueStart, valueEnd).trim();
    pos = valueEnd + 1;

    if (fieldName && schemaExpr) {
      const isOptionalField: boolean = schemaExpr.trimStart().startsWith('v.optional(');
      // Recursively expand sub-fields for nested object types (same as Records)
      const nestedFields: TypeField[] | undefined = source
        ? parseTypeFieldsForDisplay(schemaExpr, source)
        : undefined;
      fields.push({
        field: fieldName,
        type: valibotToReadableType(schemaExpr),
        required: !isOptionalField,
        accepts: humanizeValibotExpr(schemaExpr),
        description: pendingDescription,
        mockValues: pendingMockValues.length > 0 ? [...pendingMockValues] : undefined,
        typeFields: nestedFields && nestedFields.length > 0 ? nestedFields : undefined,
      });
      pendingDescription = '';
      pendingMockValues = [];
    }
  }

  return fields.length > 0 ? fields : [];
}

/**
 * Parse fields from a plain TypeScript object type body into TypeField[].
 *
 * @param body - Inner content of `{ ... }` without outer braces
 * @returns Array of TypeField
 */
function parsePlainObjectFields(body: string): TypeField[] {
  const fields: TypeField[] = [];
  // Strip JSDoc comments (/** ... */) before splitting — TS type definitions
  // from supplementary sources may include JSDoc on each field.
  const stripped: string = body.replaceAll(/\/\*\*[\s\S]*?\*\//g, '');
  const parts: string[] = stripped
    .split(';')
    .map((s: string): string => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    const match: RegExpMatchArray | null = part.match(/^(\w+)(\?)?\s*:\s*(.+)$/);
    if (match) {
      const typeStr: string = match[3]?.trim() ?? '';
      fields.push({
        field: match[1] ?? '',
        type: typeStr,
        required: !match[2],
        accepts: typeStr,
        description: '',
      });
    }
  }

  return fields.length > 0 ? fields : [];
}

/**
 * Convert a single Valibot expression into human-readable "accepts" text.
 *
 * @param expr - Valibot expression (e.g. `v.string()`, `v.picklist([...])`)
 * @returns Human-friendly description of what the field accepts
 */
function humanizeValibotExpr(expr: string): string {
  const t: string = expr.trim();

  // Primitives
  if (t === 'v.string()' || t === 'StrSchema') return 'text';
  if (t === 'v.number()' || t === 'NumSchema') return 'number';
  if (t === 'v.boolean()' || t === 'BoolSchema') return 'true / false';
  if (t === 'v.any()' || t === 'v.unknown()') return 'any value';

  // Literals
  const litMatch: RegExpMatchArray | null = t.match(/^v\.literal\((.+)\)$/);
  if (litMatch) {
    const val: string = (litMatch[1] ?? '').replaceAll(/^['"]|['"]$/g, '');
    return val;
  }

  // Picklist — extract values and show as comma-separated
  const pickMatch: RegExpMatchArray | null = t.match(/^v\.picklist\(\[(.+)\]\)$/s);
  if (pickMatch) {
    const items: string[] = (pickMatch[1] ?? '')
      .split(',')
      .map((s: string): string => s.trim().replaceAll(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    return items.join(', ');
  }

  // Pipe — humanize the base schema, append validator hints
  const pipeMatch: RegExpMatchArray | null = t.match(/^v\.pipe\((.+)\)$/s);
  if (pipeMatch) {
    const args: string[] = splitPipeArgs(pipeMatch[1] ?? '');
    const base: string = humanizeValibotExpr(args[0] ?? '');
    const hints: string[] = [];
    for (let i: number = 1; i < args.length; i++) {
      const hint: string = humanizeValidator(args[i] ?? '');
      if (hint) hints.push(hint);
    }
    return hints.length > 0 ? `${base} (${hints.join(', ')})` : base;
  }

  // Array
  const arrayMatch: RegExpMatchArray | null = t.match(/^v\.array\((.+)\)$/s);
  if (arrayMatch) {
    const inner: string = humanizeValibotExpr(arrayMatch[1] ?? '');
    return `list of ${inner}`;
  }

  // Optional
  const optMatch: RegExpMatchArray | null = t.match(/^v\.optional\((.+)\)$/s);
  if (optMatch) {
    const args: string[] = splitPipeArgs(optMatch[1] ?? '');
    return humanizeValibotExpr(args[0] ?? '');
  }

  // Nullable
  const nullMatch: RegExpMatchArray | null = t.match(/^v\.nullable\((.+)\)$/s);
  if (nullMatch) {
    const args: string[] = splitPipeArgs(nullMatch[1] ?? '');
    return `${humanizeValibotExpr(args[0] ?? '')} or empty`;
  }

  // Union
  const unionMatch: RegExpMatchArray | null = t.match(/^v\.union\(\[(.+)\]\)$/s);
  if (unionMatch) {
    const args: string[] = splitPipeArgs(unionMatch[1] ?? '');
    return args.map((a: string): string => humanizeValibotExpr(a)).join(' or ');
  }

  // Nested strictObject — just say "object"
  if (t.startsWith('v.strictObject(') || t.startsWith('v.object(')) return 'object';

  // Record — show key → value types
  if (t.startsWith('v.record(')) {
    const inner: string = t.slice('v.record('.length, -1);
    const args: string[] = splitPipeArgs(inner);
    const valueHuman: string = args[1] ? humanizeValibotExpr(args[1]) : 'value';
    return `map of text → ${valueHuman}`;
  }

  // Tuple
  if (t.startsWith('v.tuple(')) return 'fixed list';

  // Fallback — extract human-readable name from v.xxx(...) pattern
  const fnMatch: RegExpMatchArray | null = t.match(/^v\.(\w+)\(/);
  if (fnMatch) return fnMatch[1] ?? t;
  return t;
}

/**
 * Humanize a Valibot pipe validator into a short hint string.
 *
 * @param validator - Validator expression (e.g. `v.minLength(1)`, `v.url()`)
 * @returns Short hint like "min 1", "URL format", or empty string if unknown
 */
function humanizeValidator(validator: string): string {
  const t: string = validator.trim();
  const minLen: RegExpMatchArray | null = t.match(/^v\.minLength\((\d+)\)$/);
  if (minLen) return `min ${minLen[1]}`;
  const maxLen: RegExpMatchArray | null = t.match(/^v\.maxLength\((\d+)\)$/);
  if (maxLen) return `max ${maxLen[1]}`;
  const minVal: RegExpMatchArray | null = t.match(/^v\.minValue\((\d+)\)$/);
  if (minVal) return `min ${minVal[1]}`;
  const maxVal: RegExpMatchArray | null = t.match(/^v\.maxValue\((\d+)\)$/);
  if (maxVal) return `max ${maxVal[1]}`;
  if (t === 'v.url()') return 'URL format';
  if (t === 'v.email()') return 'email format';
  if (t.startsWith('v.regex(')) return 'pattern';
  if (t === 'v.readonly()') return 'read-only';
  return '';
}

/**
 * Split pipe/function arguments at top-level commas, respecting nesting.
 *
 * @param str - Comma-separated arguments
 * @returns Array of argument strings
 */
function splitPipeArgs(str: string): string[] {
  const result: string[] = [];
  let depth: number = 0;
  let start: number = 0;

  for (let i: number = 0; i < str.length; i++) {
    const ch: string = str[i] ?? '';
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      result.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last: string = str.slice(start).trim();
  if (last) result.push(last);
  return result;
}

/**
 * Resolve a `const <name> = <value>` definition from source.
 *
 * Used to follow Valibot schema references so that `v.InferOutput<typeof X>`
 * resolves to the actual schema body instead of the opaque wrapper type.
 *
 * @param constName - The constant name to look up
 * @param source - Combined source to search
 * @returns The RHS of the const assignment, or undefined
 */
function resolveConstDefinition(constName: string, source: string): string | undefined {
  const constRegex: RegExp = new RegExp(
    `(?:export\\s+)?const\\s+${constName.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\s*=\\s*`,
  );
  const match: RegExpExecArray | null = constRegex.exec(source);
  if (!match) return undefined;

  const afterEquals: number = (match.index ?? 0) + match[0].length;
  const end: number = findStatementEnd(source, afterEquals);
  const definition: string = source.slice(afterEquals, end).trim();
  if (!definition) return undefined;

  // Inline nested schema references (one level deep to avoid infinite recursion)
  return inlineSchemaReferences(definition, source, constName);
}

/**
 * Replace schema identifier references inside a definition with their resolved values.
 *
 * Matches identifiers ending in `Schema` (e.g. `LensCategorySchema`) and replaces
 * them inline with the const's RHS. Skips the parent schema to avoid recursion.
 *
 * @param definition - The resolved schema body
 * @param source - Combined source to search for referenced schemas
 * @param parentName - The schema name being resolved (to skip self-references)
 * @returns Definition with nested schema references inlined
 */
function inlineSchemaReferences(definition: string, source: string, parentName: string): string {
  return definition.replaceAll(/\b(\w+Schema)\b/g, (_match: string, name: string): string => {
    // Skip self-references and the Valibot namespace prefix
    if (name === parentName) return name;
    const resolved: string | undefined = resolveConstDefinitionShallow(name, source);
    return resolved ?? name;
  });
}

/**
 * Shallow const resolution — same as resolveConstDefinition but without recursive inlining.
 *
 * @param constName - The constant name to look up
 * @param source - Combined source to search
 * @returns The RHS of the const assignment, or undefined
 */
function resolveConstDefinitionShallow(constName: string, source: string): string | undefined {
  const constRegex: RegExp = new RegExp(
    `(?:export\\s+)?const\\s+${constName.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\s*=\\s*`,
  );
  const match: RegExpExecArray | null = constRegex.exec(source);
  if (!match) return undefined;

  const afterEquals: number = (match.index ?? 0) + match[0].length;
  const end: number = findStatementEnd(source, afterEquals);
  const definition: string = source.slice(afterEquals, end).trim();
  if (!definition) return undefined;
  return definition;
}

/**
 * Resolve TV variant values for a given key by parsing the tv() block in source.
 *
 * @param variantKey - The variant key name (e.g. 'variant', 'size')
 * @param source - Full raw .svelte source
 * @returns A string-literal union of the variant values, or undefined
 */
function resolveVariantValues(variantKey: string, source: string): string | undefined {
  // Find tv({ in the source
  const tvIdx: number = source.indexOf('tv({');
  if (tvIdx === -1) return undefined;

  const tvBraceIdx: number = source.indexOf('{', tvIdx + 2);
  if (tvBraceIdx === -1) return undefined;

  const tvEndIdx: number = findMatchingBrace(source, tvBraceIdx);
  if (tvEndIdx === -1) return undefined;

  const tvBody: string = source.slice(tvBraceIdx + 1, tvEndIdx);

  // Find variants: { ... }
  const variantsMatch: RegExpExecArray | null = /variants\s*:\s*\{/.exec(tvBody);
  if (!variantsMatch) return undefined;

  const variantsBraceIdx: number = tvBody.indexOf('{', (variantsMatch.index ?? 0) + 8);
  if (variantsBraceIdx === -1) return undefined;

  const variantsEndIdx: number = findMatchingBraceInner(tvBody, variantsBraceIdx);
  if (variantsEndIdx === -1) return undefined;

  const variantsBlock: string = tvBody.slice(variantsBraceIdx + 1, variantsEndIdx);

  // Find the specific variant key: keyName: { ... }
  const keyRegex: RegExp = new RegExp(`${variantKey}\\s*:\\s*\\{`);
  const keyMatch: RegExpExecArray | null = keyRegex.exec(variantsBlock);
  if (!keyMatch) return undefined;

  const keyBraceIdx: number = variantsBlock.indexOf('{', (keyMatch.index ?? 0) + variantKey.length);
  if (keyBraceIdx === -1) return undefined;

  const keyEndIdx: number = findMatchingBraceInner(variantsBlock, keyBraceIdx);
  if (keyEndIdx === -1) return undefined;

  const optionsBlock: string = variantsBlock.slice(keyBraceIdx + 1, keyEndIdx);

  // Extract option names
  const options: string[] = [];
  const optionRegex: RegExp = /(?:['"]([^'"]+)['"]|(\w+))\s*:/g;
  let optMatch: RegExpExecArray | null;
  while ((optMatch = optionRegex.exec(optionsBlock)) !== null) {
    const name: string = optMatch[1] ?? optMatch[2] ?? '';
    if (name) options.push(name);
  }

  if (options.length === 0) return undefined;
  return options.map((o: string): string => `'${o}'`).join(' | ');
}

/**
 * Find matching closing brace — inner variant of findMatchingBrace for tvBody substring.
 *
 * @param str - String to search in
 * @param openIdx - Index of the opening brace
 * @returns Index of the matching closing brace, or -1
 */
function findMatchingBraceInner(str: string, openIdx: number): number {
  let depth: number = 0;
  let inString: string | null = null;

  for (let i: number = openIdx; i < str.length; i++) {
    const ch: string = str[i] ?? '';
    const prev: string = str[i - 1] ?? '';

    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      continue;
    }
    if (inString && ch === inString && prev !== '\\') {
      inString = null;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Infer a TypeScript type string from a prop's default value.
 *
 * @param defaultValue - The default value as a source string (e.g., `"default"`, `true`, `200`)
 * @returns Inferred type string, or empty if cannot infer
 */
function inferType(defaultValue: string): string {
  if (!defaultValue) return '';

  // Boolean
  if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';

  // Number
  if (/^-?\d+(\.\d+)?$/.test(defaultValue)) return 'number';

  // String literal (single or double quotes)
  if (
    (defaultValue.startsWith('"') && defaultValue.endsWith('"')) ||
    (defaultValue.startsWith("'") && defaultValue.endsWith("'"))
  ) {
    return 'string';
  }

  // null/undefined
  if (defaultValue === 'null' || defaultValue === 'undefined') return '';

  return '';
}
