/**
 * Rule: result/check-before-access
 *
 * Detects accessing `.data` or `.error` on a Result variable without
 * first checking `.ok`. This prevents silent error propagation.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Patterns that indicate a Result variable name. */
const RESULT_NAME_PATTERNS: readonly RegExp[] = [
  /[Rr]esult$/,
  /^result$/,
  /[Pp]arsed$/,
  /[Vv]alidated$/,
  /[Vv]alidation$/,
  /^cached$/,
  /^existing$/,
  /^found$/,
  /^loaded$/,
  /^fetched$/,
  /^checked$/,
  /^response$/,
];

/** Patterns that indicate `.ok` was properly checked before access. */
const CHECK_PATTERNS: readonly RegExp[] = [
  /\.ok\b/,
  /!.*\.ok/,
  /\.ok\s*===?\s*(true|false)/,
  /\.ok\s*!==?\s*(true|false)/,
];

/**
 * Get the identifier name from a node.
 *
 * @param {AstNode} node - The AST node
 * @returns {string | null} The identifier name or null
 */
function getIdentifierName(node: AstNode): string | null {
  if (node.type === 'Identifier') {
    return (node.name as string) ?? null;
  }
  return null;
}

/**
 * Check if a variable looks like a Result — by name pattern OR type annotation.
 *
 * Primary detection: checks the variable's type annotation for `Result<`.
 * Fallback: checks the variable name against common Result naming patterns.
 *
 * @param {string} name - The variable name
 * @param {string} content - Full file source text
 * @returns {boolean} Whether it's likely a Result variable
 */
function isLikelyResultVariable(name: string, content: string): boolean {
  if (RESULT_NAME_PATTERNS.some((p: RegExp): boolean => p.test(name))) {
    return true;
  }

  // Check type annotation: `const varName: Result<...>` or `const varName: Promise<Result<...>>`
  const typePattern: RegExp = new RegExp(
    `(?:const|let|var)\\s+${name}\\s*:\\s*(?:Promise\\s*<\\s*)?Result\\s*<`,
  );
  return typePattern.test(content);
}

/**
 * Check if there's an `.ok` check before this node for the given variable.
 * Scans the source text between the variable declaration and the current access.
 *
 * @param {string} varName - The variable name to check
 * @param {AstNode} node - The current access node
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether `.ok` was checked
 */
function hasOkCheckBefore(varName: string, node: AstNode, context: VisitorContext): boolean {
  const beforeCode: string = context.content.slice(0, node.start);

  // Find where the variable was declared (handles optional type annotations)
  const declPattern: RegExp = new RegExp(`(?:const|let|var)\\s+${varName}\\s*(?::[^=]*)?=`, 'g');
  const declMatch: RegExpExecArray | null = declPattern.exec(beforeCode);
  if (!declMatch) {
    return false;
  }

  // Get code between declaration and current node
  const codeSinceDeclare: string = beforeCode.slice(declMatch.index);

  // Check for .ok checks
  for (const pattern of CHECK_PATTERNS) {
    const checkPattern: RegExp = new RegExp(`${varName}${pattern.source}`);
    if (checkPattern.test(codeSinceDeclare)) {
      return true;
    }
  }

  // Check for if statements that check .ok
  const ifCheckPattern: RegExp = new RegExp(`if\\s*\\([^)]*${varName}\\.ok[^)]*\\)`, 'i');
  if (ifCheckPattern.test(codeSinceDeclare)) {
    return true;
  }

  // Check for early return patterns after .ok check (with or without braces)
  const earlyReturnWithBraces: RegExp = new RegExp(
    `if\\s*\\([^)]*!${varName}\\.ok[^)]*\\)\\s*\\{[^}]*return`,
    's',
  );
  const earlyReturnNoBraces: RegExp = new RegExp(
    `if\\s*\\([^)]*!${varName}\\.ok[^)]*\\)\\s*return\\b`,
  );
  if (earlyReturnWithBraces.test(codeSinceDeclare) || earlyReturnNoBraces.test(codeSinceDeclare)) {
    return true;
  }

  return false;
}
/** The check-before-access lint rule. */
const rule: TypeScriptRule = {
  id: 'result/check-before-access',
  description: 'Result .ok must be checked before accessing .data or .error',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['result', 'safety'],
  stages: ['lint', 'ci'],

  visitor: {
    MemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
      return checkAccess(node, context);
    },

    StaticMemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
      return checkAccess(node, context);
    },
  },
};

/**
 * Check a member expression for unchecked .data/.error access.
 *
 * @param {AstNode} node - The member expression node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Any lint violations
 */
function checkAccess(node: AstNode, context: VisitorContext): LintResult[] {
  const results: LintResult[] = [];

  const property = node.property as AstNode | undefined;
  if (!property) {
    return results;
  }

  const propertyName: string = (property.name as string) ?? (property.value as string) ?? '';
  if (propertyName !== 'data' && propertyName !== 'error') {
    return results;
  }

  const object = node.object as AstNode | undefined;
  if (!object) {
    return results;
  }

  const objectName: string | null = getIdentifierName(object);

  // Fix 3: Detect inline chains like safeParse(...).data without .ok check
  if (!objectName) {
    if (object.type === 'CallExpression') {
      const callee = object.callee as AstNode | undefined;
      const calleeName: string | null = callee ? getIdentifierName(callee) : null;
      if (calleeName && /^(safeParse|ok|err|okUnchecked)$/.test(calleeName)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Accessing ${calleeName}(...).${propertyName} without checking .ok first — assign to a variable and check .ok`,
          ruleId: 'result/check-before-access',
          tip: `Assign ${calleeName}() result to a variable, check .ok, then access .${propertyName}`,
          fix: { range: { start: node.start, end: node.end }, text: '' },
        });
      }
    }
    return results;
  }

  if (!isLikelyResultVariable(objectName, context.content)) {
    return results;
  }

  // Check if file imports from Result modules
  const hasResultImport: boolean = context.imports.some(
    (imp): boolean => imp.source.includes('result') || imp.source.includes('Result'),
  );
  if (!hasResultImport) {
    return results;
  }

  if (!hasOkCheckBefore(objectName, node, context)) {
    results.push({
      file: context.file,
      line: node.loc.start.line,
      column: node.loc.start.column + 1,
      severity: 'error',
      message: `Accessing ${objectName}.${propertyName} without checking .ok first`,
      ruleId: 'result/check-before-access',
      tip: `Check ${objectName}.ok before accessing .${propertyName}`,
      fix: {
        range: { start: node.start, end: node.start },
        text: `if (!${objectName}.ok) return ${objectName};\n`,
      },
    });
  }

  return results;
}

export default rule;
