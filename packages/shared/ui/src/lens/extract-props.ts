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
import type { PropMeta, VariantKeyMeta } from './types.js';

/** No-op function used as placeholder for function-typed props. */
function noop(): void {
	/* intentionally empty — placeholder for function-typed props in variant previews */
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
 * @returns Array of PropMeta for user-facing props
 */
export function extractProps(source: string): PropMeta[] {
	if (!source) return [];

	const block: PropsBlock | null = findPropsBlock(source);
	if (!block) return [];

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

		result.push({
			name: raw.name,
			type: resolvedType,
			default: raw.defaultValue,
			description,
			bindable: raw.bindable,
			typeDefinition: resolveTypeDefinition(resolvedType, source),
			mockValues: mockValues.length > 0 ? mockValues : undefined,
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

	for (const { type, name, default: defaultVal, typeDefinition, mockValues } of props) {
		if (!type) continue;

		// @values JSDoc tag: highest priority — explicit author declaration
		if (mockValues && mockValues.length > 1) {
			variants.push({
				key: name,
				options: mockValues,
				default: defaultVal ? defaultVal.replaceAll("'", '') : '',
			});
			continue;
		}

		// Boolean props: render true/false
		if (type === 'boolean' || type === 'Bool') {
			variants.push({
				key: name,
				options: ['true', 'false'],
				default: defaultVal || '',
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
				});
			}
		}
	}

	return variants;
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
		} else if (prop.mockValues && prop.mockValues.length > 0) {
			base[prop.name] = prop.mockValues[0] ?? '';
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
		} else if (prop.type.includes(') =>') || prop.typeDefinition?.includes(') =>')) {
			// Function type — provide a no-op that satisfies the prop requirement
			base[prop.name] = noop;
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
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Result of extracting `@values` from a JSDoc description string. */
type ValuesTagResult = {
	/** The description with the `@values` tag removed. */
	description: string;
	/** Parsed comma-separated values from the `@values` tag. */
	mockValues: string[];
};

/**
 * Extract and strip `@values` tag from a JSDoc description string.
 *
 * Given `"Language grammar to use. @values svelte, typescript, javascript"`,
 * returns `{ description: "Language grammar to use.", mockValues: ["svelte", "typescript", "javascript"] }`.
 *
 * @param text - Raw JSDoc text potentially containing `@values`
 * @returns Separated description and mock values
 */
function extractValuesTag(text: string): ValuesTagResult {
	const valuesIdx: number = text.indexOf('@values');
	if (valuesIdx === -1) return { description: text, mockValues: [] };

	const description: string = text.slice(0, valuesIdx).trim();
	const afterTag: string = text.slice(valuesIdx + 7).trim();

	// Take up to the next @tag or end of string
	const nextTagMatch: RegExpMatchArray | null = afterTag.match(/\s@\w/);
	const rawValues: string = nextTagMatch
		? afterTag.slice(0, nextTagMatch.index ?? afterTag.length)
		: afterTag;

	const mockValues: string[] = rawValues
		.split(',')
		.map((v: string): string => v.trim())
		.filter((v: string): boolean => v.length > 0);

	return { description, mockValues };
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
	// Match: let/const { <destructuring> }: <typeAnnotation> = $props();
	// The type annotation can span multiple lines and contain nested braces/generics.
	// We use a two-pass approach: first find `let {` or `const {`, then find the matching `}` and `: ... = $props()`.

	const propsStart: number = source.indexOf('$props()');
	if (propsStart === -1) return null;

	// Search backwards from $props() for `let {` or `const {`
	const letIdx: number = source.lastIndexOf('let {', propsStart);
	const constIdx: number = source.lastIndexOf('const {', propsStart);
	const declIdx: number = Math.max(letIdx, constIdx);
	if (declIdx === -1) return null;

	const openBrace: number = source.indexOf('{', declIdx);
	if (openBrace === -1) return null;

	// Find the matching close brace for the destructuring
	const closeBrace: number = findMatchingBrace(source, openBrace);
	if (closeBrace === -1) return null;

	const destructuring: string = source.slice(openBrace + 1, closeBrace);

	// Type annotation is between `}: ` and `= $props()`
	const afterBrace: string = source.slice(closeBrace + 1, propsStart);
	// Remove leading `:` and trailing `=`
	const typeAnnotation: string = afterBrace
		.replace(/^\s*:\s*/, '')
		.replace(/\s*=\s*$/, '')
		.trim();

	return { destructuring, typeAnnotation };
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

	// Find the full type body — look for the first `{` and its matching `}`
	// Handle intersection types: `SomeType & { ... }` or direct `{ ... }`
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
		const fieldMatch: RegExpMatchArray | null = trimmed.match(/^(\w+)\??\s*:\s*(.+?)\s*[;,]?\s*$/);
		if (fieldMatch) {
			const fieldName: string = fieldMatch[1] ?? '';
			const fieldType: string = (fieldMatch[2] ?? '').trim();

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

	// Skip primitives and simple types — no definition to resolve
	if (/^(string|number|boolean|Str|Num|Bool|Void|Snippet|Component)$/.test(typeName)) {
		return undefined;
	}

	// Skip indexed access types — can't resolve without full TS
	if (typeName.includes("['")) return undefined;

	// Skip union types — they ARE the definition already
	if (typeName.includes(' | ')) return undefined;

	// Find `type <name> = ...` or `export type <name> = ...`
	const typeDefRegex: RegExp = new RegExp(
		`(?:export\\s+)?type\\s+${typeName.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\s*=\\s*`,
	);
	const match: RegExpExecArray | null = typeDefRegex.exec(source);
	if (!match) return undefined;

	const afterEquals: number = (match.index ?? 0) + match[0].length;

	// Check if it's a VariantProps pattern: VariantProps<typeof X>['key']
	const variantPropsMatch: RegExpMatchArray | null = source
		.slice(afterEquals, afterEquals + 200)
		.match(/^VariantProps<typeof\s+\w+>\[['"](\w+)['"]\]/);
	if (variantPropsMatch) {
		const variantKey: string = variantPropsMatch[1] ?? '';
		return resolveVariantValues(variantKey, source);
	}

	// Extract the RHS up to the next semicolon or unbalanced statement
	let depth: number = 0;
	let inString: string | null = null;
	let end: number = afterEquals;

	for (let i: number = afterEquals; i < source.length; i++) {
		const ch: string = source[i] ?? '';
		const prev: string = source[i - 1] ?? '';

		if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
			inString = ch;
			continue;
		}
		if (inString && ch === inString && prev !== '\\') {
			inString = null;
			continue;
		}
		if (inString) continue;

		if (ch === '{' || ch === '<' || ch === '(' || ch === '[') depth++;
		else if (ch === '}' || ch === '>' || ch === ')' || ch === ']') depth--;

		if (depth === 0 && ch === ';') {
			end = i;
			break;
		}
		end = i + 1;
	}

	const definition: string = source.slice(afterEquals, end).trim();
	if (!definition || definition === typeName) return undefined;
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
