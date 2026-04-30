/**
 * Rule: typescript/lint-embedded-strings
 *
 * Detects `<script>` blocks inside template literals and string literals.
 * Extracts the embedded code using `extractScriptBlocks()` and warns when
 * embedded scripts contain code that should be in a proper module.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { extractScriptBlocks } from '@/lint/framework/oxc-runner.ts';

/** Case-insensitive check for `<script` in a string. */
const SCRIPT_TAG_RE: RegExp = /<script[\s>]/i;

/**
 * Get the string value from a StringLiteral or TemplateLiteral node.
 *
 * @param node - AST node
 * @param context - Visitor context for getNodeText
 * @returns The string value, or null if not extractable
 */
function getStringValue(node: AstNode, context: VisitorContext): string | null {
  if (node.type === 'StringLiteral') {
    return (node.value as string) ?? null;
  }

  if (node.type === 'TemplateLiteral') {
    const quasis: AstNode[] | undefined = node.quasis as AstNode[] | undefined;

    if (!quasis || quasis.length === 0) {
      return null;
    }

    // Only handle simple template literals without expressions
    const expressions: unknown[] | undefined = node.expressions as unknown[] | undefined;

    if (expressions && expressions.length > 0) {
      return null;
    }

    const [firstQuasi] = quasis;

    if (!firstQuasi) {
      return null;
    }

    const cooked: string | undefined = (firstQuasi.value as { cooked?: string })?.cooked;

    if (cooked !== undefined) {
      return cooked;
    }

    // Fallback: extract raw text from source
    const nodeText: string = context.getNodeText(node);

    if (nodeText.startsWith('`') && nodeText.endsWith('`')) {
      return nodeText.slice(1, -1);
    }

    return null;
  }

  return null;
}

/** The lint-embedded-strings rule. */
const rule: TypeScriptRule = {
  id: 'typescript/lint-embedded-strings',
  description: 'Warns when template/string literals contain `<script>` blocks with embedded code',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'quality'],
  stages: ['lint', 'ci'],

  visitor: {
    TemplateLiteral(node: AstNode, context: VisitorContext): LintResult[] {
      return checkNode(node, context);
    },

    StringLiteral(node: AstNode, context: VisitorContext): LintResult[] {
      return checkNode(node, context);
    },
  },
};

/**
 * Check a string/template literal node for embedded `<script>` blocks.
 *
 * @param node - AST node (StringLiteral or TemplateLiteral)
 * @param context - Visitor context
 * @returns Lint results
 */
function checkNode(node: AstNode, context: VisitorContext): LintResult[] {
  const value: string | null = getStringValue(node, context);

  if (!value) {
    return [];
  }

  if (!SCRIPT_TAG_RE.test(value)) {
    return [];
  }

  const extracted: string = extractScriptBlocks(value);

  if (extracted.trim() === '') {
    return [];
  }

  // Count non-empty lines in the extracted script to gauge complexity
  const codeLines: number = extracted
    .split('\n')
    .filter((line: string): boolean => line.trim() !== '').length;

  if (codeLines === 0) {
    return [];
  }

  return [
    {
      file: context.file,
      line: node.loc.start.line,
      column: node.loc.start.column + 1,
      severity: 'warning',
      message: `String literal contains embedded <script> block with ${codeLines} line${codeLines === 1 ? '' : 's'} of code — consider extracting to a separate module`,
      ruleId: rule.id,
      fix: { range: { start: node.start, end: node.end }, text: '' },
    },
  ];
}

export default rule;
