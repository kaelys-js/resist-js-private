/**
 * Shared AST helpers for navigating Svelte/Vite config file ASTs.
 *
 * Provides utilities to extract and inspect properties from config objects
 * produced by `export default { ... }` or `export default defineConfig({ ... })`.
 *
 * @module
 */

import type { AstNode, ImportInfo } from '@/lint/framework/types.ts';

/**
 * Get the key name of an ObjectProperty node.
 *
 * Handles both `Identifier` keys (`{ foo: ... }`) and `StringLiteral` keys (`{ "foo": ... }`).
 *
 * @param {AstNode} prop - An ObjectProperty AST node
 * @returns {string | undefined} The property key name, or undefined if not extractable
 */
export function getPropertyName(prop: AstNode): string | undefined {
  const key: AstNode | undefined = prop.key as AstNode | undefined;

  if (!key) {
    return undefined;
  }

  if (key.type === 'Identifier') {
    return (key.name as string) ?? undefined;
  }

  if (key.type === 'StringLiteral') {
    return (key.value as string) ?? undefined;
  }

  return undefined;
}

/**
 * Find a property by name in an ObjectExpression node.
 *
 * @param {AstNode} obj - An ObjectExpression AST node
 * @param {string} name - The property key name to find
 * @returns {AstNode | undefined} The matching ObjectProperty node, or undefined
 */
export function findProperty(obj: AstNode, name: string): AstNode | undefined {
  if (obj.type !== 'ObjectExpression') {
    return undefined;
  }

  const properties: AstNode[] | undefined = obj.properties as AstNode[] | undefined;

  if (!properties) {
    return undefined;
  }

  for (const prop of properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') {
      continue;
    }

    if (getPropertyName(prop) === name) {
      return prop;
    }
  }

  return undefined;
}

/**
 * Get the value node of a property by name in an ObjectExpression.
 *
 * @param {AstNode} obj - An ObjectExpression AST node
 * @param {string} name - The property key name
 * @returns {AstNode | undefined} The value AST node, or undefined
 */
export function getPropertyValueNode(obj: AstNode, name: string): AstNode | undefined {
  const prop: AstNode | undefined = findProperty(obj, name);

  if (!prop) {
    return undefined;
  }

  return prop.value as AstNode | undefined;
}

/**
 * Navigate nested properties in an ObjectExpression by dot-separated path.
 *
 * For example, `getNestedValue(obj, 'kit.adapter')` finds `obj.kit` then `.adapter`.
 *
 * @param {AstNode} obj - An ObjectExpression AST node
 * @param {string} path - Dot-separated property path (e.g. `'kit.adapter'`)
 * @returns {AstNode | undefined} The value AST node at the end of the path, or undefined
 */
export function getNestedValue(obj: AstNode, path: string): AstNode | undefined {
  const parts: string[] = path.split('.');
  let current: AstNode | undefined = obj;

  for (const part of parts) {
    if (!current || current.type !== 'ObjectExpression') {
      return undefined;
    }

    current = getPropertyValueNode(current, part);
  }

  return current;
}

/**
 * Check if a property exists in an ObjectExpression.
 *
 * @param {AstNode} obj - An ObjectExpression AST node
 * @param {string} name - The property key name
 * @returns {boolean} True if the property exists
 */
export function hasProperty(obj: AstNode, name: string): boolean {
  return findProperty(obj, name) !== undefined;
}

/**
 * Check if a node is an `undefined` identifier.
 *
 * @param {AstNode} node - AST node to check
 * @returns {boolean} True if the node is `undefined`
 */
export function isUndefinedValue(node: AstNode): boolean {
  return node.type === 'Identifier' && (node.name as string) === 'undefined';
}

/**
 * Get the default export's config object from a parsed AST.
 *
 * Handles both:
 * - `export default { ... }` → returns the ObjectExpression
 * - `export default defineConfig({ ... })` → returns the first argument ObjectExpression
 *
 * @param {AstNode} ast - Root AST node (Program)
 * @returns {AstNode | undefined} The config ObjectExpression, or undefined
 */
export function getDefaultExportObject(ast: AstNode): AstNode | undefined {
  const body: AstNode[] | undefined = ast.body as AstNode[] | undefined;

  if (!body) {
    return undefined;
  }

  for (const stmt of body) {
    if (stmt.type !== 'ExportDefaultDeclaration') {
      continue;
    }

    const decl: AstNode | undefined = stmt.declaration as AstNode | undefined;

    if (!decl) {
      continue;
    }

    if (decl.type === 'ObjectExpression') {
      return decl;
    }

    // Handle `export default defineConfig({ ... })`
    if (decl.type === 'CallExpression') {
      const args: AstNode[] | undefined = decl.arguments as AstNode[] | undefined;

      if (args && args.length > 0 && args[0]?.type === 'ObjectExpression') {
        return args[0];
      }
    }
  }

  return undefined;
}

/**
 * Get the adapter package name from import declarations.
 *
 * Looks for default imports from known SvelteKit adapter packages.
 *
 * @param {ImportInfo[]} imports - Import info array from visitor context
 * @returns {string | undefined} The adapter package name, or undefined
 */
export function getAdapterImport(imports: ImportInfo[]): string | undefined {
  const adapterPackages: Set<string> = new Set([
    '@sveltejs/adapter-cloudflare',
    '@sveltejs/adapter-cloudflare-workers',
    '@sveltejs/adapter-static',
    '@sveltejs/adapter-node',
    '@sveltejs/adapter-auto',
    '@sveltejs/adapter-vercel',
    '@sveltejs/adapter-netlify',
  ]);

  for (const imp of imports) {
    if (adapterPackages.has(imp.source)) {
      return imp.source;
    }
  }

  return undefined;
}

/** Known Cloudflare adapter packages. */
export const CLOUDFLARE_ADAPTERS: ReadonlySet<string> = new Set([
  '@sveltejs/adapter-cloudflare',
  '@sveltejs/adapter-cloudflare-workers',
]);

/** Known static adapter packages. */
export const STATIC_ADAPTERS: ReadonlySet<string> = new Set(['@sveltejs/adapter-static']);

/**
 * Collect all property names from an ObjectExpression recursively with dot paths.
 *
 * @param {AstNode} obj - An ObjectExpression AST node
 * @param {string} prefix - Dot-separated prefix for nested properties
 * @returns {string[]} Array of dot-separated property paths
 */
export function collectPropertyPaths(obj: AstNode, prefix: string = ''): string[] {
  const paths: string[] = [];

  if (obj.type !== 'ObjectExpression') {
    return paths;
  }

  const properties: AstNode[] | undefined = obj.properties as AstNode[] | undefined;

  if (!properties) {
    return paths;
  }

  for (const prop of properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') {
      continue;
    }

    const name: string | undefined = getPropertyName(prop);

    if (!name) {
      continue;
    }

    const fullPath: string = prefix ? `${prefix}.${name}` : name;
    paths.push(fullPath);

    const value: AstNode | undefined = prop.value as AstNode | undefined;

    if (value?.type === 'ObjectExpression') {
      paths.push(...collectPropertyPaths(value, fullPath));
    }
  }

  return paths;
}

/**
 * Get all property entries from an ObjectExpression as name-value pairs.
 *
 * @param {AstNode} obj - An ObjectExpression AST node
 * @returns {Array<[string, AstNode]>} Array of [name, valueNode] pairs
 */
export function getPropertyEntries(obj: AstNode): Array<[string, AstNode]> {
  const entries: Array<[string, AstNode]> = [];

  if (obj.type !== 'ObjectExpression') {
    return entries;
  }

  const properties: AstNode[] | undefined = obj.properties as AstNode[] | undefined;

  if (!properties) {
    return entries;
  }

  for (const prop of properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') {
      continue;
    }

    const name: string | undefined = getPropertyName(prop);
    const value: AstNode | undefined = prop.value as AstNode | undefined;

    if (name && value) {
      entries.push([name, value]);
    }
  }

  return entries;
}

/**
 * Check if a node is a string literal with a specific value.
 *
 * @param {AstNode} node - AST node to check
 * @param {string} value - Expected string value
 * @returns {boolean} True if node is a StringLiteral with the given value
 */
export function isStringLiteral(node: AstNode, value?: string): boolean {
  const isStr: boolean =
    node.type === 'StringLiteral' || (node.type === 'Literal' && typeof node.value === 'string');

  if (!isStr) {
    return false;
  }

  if (value !== undefined) {
    return (node.value as string) === value;
  }

  return true;
}

/**
 * Get the string value from a StringLiteral node.
 *
 * @param {AstNode} node - AST node
 * @returns {string | undefined} The string value, or undefined if not a StringLiteral
 */
export function getStringValue(node: AstNode): string | undefined {
  if (node.type === 'StringLiteral') {
    return (node.value as string) ?? undefined;
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value as string;
  }

  return undefined;
}

/**
 * Check if a node is a boolean literal with a specific value.
 *
 * @param {AstNode} node - AST node to check
 * @param {boolean} value - Expected boolean value
 * @returns {boolean} True if node is a BooleanLiteral with the given value
 */
export function isBooleanLiteral(node: AstNode, value?: boolean): boolean {
  const isBool: boolean =
    node.type === 'BooleanLiteral' || (node.type === 'Literal' && typeof node.value === 'boolean');

  if (!isBool) {
    return false;
  }

  if (value !== undefined) {
    return (node.value as boolean) === value;
  }

  return true;
}
