/**
 * Rule: complexity/no-index-of-in-loop
 *
 * Detects .indexOf() calls inside loop bodies. Array .indexOf() is O(n)
 * per call, so using it inside a loop creates O(n²) complexity.
 * Suggests using a Map or Set for O(1) lookups.
 *
 * Detection is gated on auto-fixability: the rule flags ONLY a membership-test
 * `.indexOf()` it can rewrite into a hoisted Set lookup:
 *   - `arr.indexOf(x) !== -1` → `_arrSet.has(x)`
 *   - `arr.indexOf(x) === -1` → `!_arrSet.has(x)`
 *   - `arr.indexOf(x) >= 0`  → `_arrSet.has(x)`
 *   - `arr.indexOf(x) < 0`   → `!_arrSet.has(x)`
 *
 * Cases that cannot be safely rewritten are NOT flagged (no false positives):
 * a bare `.indexOf()` used for its INDEX VALUE (no `=== -1`/`!== -1` compare), a
 * non-identifier receiver, an array mutated inside the loop, a second
 * `fromIndex` argument, or a multi-character string-literal argument (a String
 * substring search the Set rewrite would corrupt). A single-char literal or an
 * identifier argument is kept.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type LintFix,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { walkBody, isCallTo } from './_utils.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/**
 * Whether a fix is a REAL (non-no-op) text replacement. The no-op sentinel is
 * `{ range: { start: 0, end: 0 }, text: '' }`; anything else is a genuine fix.
 * Detection is gated on this so a flagged violation is always auto-fixable.
 *
 * @param {LintFix} fix - The fix to test
 * @returns {boolean} True if the fix replaces real source text
 */
function isRealFix(fix: LintFix): boolean {
  return !(fix.range.start === 0 && fix.range.end === 0 && fix.text === '');
}

/**
 * Extract source text for an AST node.
 *
 * @param {AstNode} astNode - Node with start/end byte offsets
 * @param {string} source - Full source text
 * @returns {string} The node's source text
 */
function nodeText(astNode: AstNode, source: string): string {
  return source.slice(astNode.start as number, astNode.end as number);
}

/**
 * Detect indentation at a byte offset.
 *
 * @param {number} offset - Byte offset
 * @param {string} source - Full source text
 * @returns {string} Whitespace prefix of the line
 */
function detectIndent(offset: number, source: string): string {
  let lineStart: number = offset;

  while (lineStart > 0 && source[lineStart - 1] !== '\n') {
    lineStart--;
  }

  let end: number = lineStart;

  while (end < source.length && (source[end] === ' ' || source[end] === '\t')) {
    end++;
  }

  return source.slice(lineStart, end);
}

/**
 * Get the callee object source text from an indexOf call.
 *
 * @param {AstNode} callNode - The CallExpression node
 * @param {string} source - Full source text
 * @returns {string | null} Source text of the array
 */
function getCalleeArrayText(callNode: AstNode, source: string): string | null {
  const callee: AstNode | undefined = callNode.callee as AstNode | undefined;

  if (!callee) {
    return null;
  }

  if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
    const obj: AstNode | undefined = callee.object as AstNode | undefined;

    if (obj) {
      return nodeText(obj, source);
    }
  }

  return null;
}

/**
 * Find the parent BinaryExpression comparing an indexOf result to -1 or 0.
 * Walks the body looking for a BinaryExpression where one side is the indexOf call.
 *
 * @param {AstNode} loopNode - The loop node
 * @param {AstNode} indexOfCall - The indexOf CallExpression
 * @param {string} source - Source text
 * @returns {{ node: AstNode; negated: boolean } | null} The binary expression and whether the check is negated
 */
function findIndexOfComparison(
  loopNode: AstNode,
  indexOfCall: AstNode,
  source: string,
): { node: AstNode; negated: boolean } | null {
  const callStart: number = indexOfCall.start as number;
  const callEnd: number = indexOfCall.end as number;
  let result: { node: AstNode; negated: boolean } | null = null;

  walkBody(loopNode, (child: AstNode): boolean | void => {
    if (child.type !== 'BinaryExpression') {
      return;
    }

    const left: AstNode | undefined = child.left as AstNode | undefined;
    const right: AstNode | undefined = child.right as AstNode | undefined;
    const op: string = child.operator as string;

    if (!left || !right) {
      return;
    }

    /* Check if one side is the indexOf call */
    const leftIsCall: boolean =
      (left.start as number) === callStart && (left.end as number) === callEnd;
    const rightIsCall: boolean =
      (right.start as number) === callStart && (right.end as number) === callEnd;

    if (!leftIsCall && !rightIsCall) {
      return;
    }

    const otherSide: AstNode = leftIsCall ? right : left;
    const otherText: string = nodeText(otherSide, source).trim();

    /* Determine if the comparison means "found" or "not found" */
    if (leftIsCall) {
      /* indexOf(x) !== -1 → found */
      if ((op === '!==' || op === '!=') && otherText === '-1') {
        result = { node: child, negated: false };
        return true;
      }
      /* indexOf(x) === -1 → not found */
      if ((op === '===' || op === '==') && otherText === '-1') {
        result = { node: child, negated: true };
        return true;
      }
      /* indexOf(x) >= 0 → found */
      if (op === '>=' && otherText === '0') {
        result = { node: child, negated: false };
        return true;
      }
      /* indexOf(x) > -1 → found */
      if (op === '>' && otherText === '-1') {
        result = { node: child, negated: false };
        return true;
      }
      /* indexOf(x) < 0 → not found */
      if (op === '<' && otherText === '0') {
        result = { node: child, negated: true };
        return true;
      }
    }

    if (rightIsCall) {
      /* -1 !== indexOf(x) → found */
      if ((op === '!==' || op === '!=') && otherText === '-1') {
        result = { node: child, negated: false };
        return true;
      }
      /* -1 === indexOf(x) → not found */
      if ((op === '===' || op === '==') && otherText === '-1') {
        result = { node: child, negated: true };
        return true;
      }
    }
  });

  return result;
}

/** Array methods that mutate the receiver in place. */
const MUTATING_METHODS: ReadonlySet<string> = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
]);

/**
 * Get the indexOf receiver when it is a simple `Identifier` (e.g. `arr` in
 * `arr.indexOf(x)`). Returns null for computed or member receivers.
 *
 * @param {AstNode} callNode - The indexOf CallExpression
 * @returns {string | null} The receiver identifier name, or null
 */
function getReceiverIdentifier(callNode: AstNode): string | null {
  const callee: AstNode | undefined = callNode.callee as AstNode | undefined;

  if (!callee || (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression')) {
    return null;
  }

  const obj: AstNode | undefined = callee.object as AstNode | undefined;

  if (obj && obj.type === 'Identifier') {
    return obj.name as string;
  }

  return null;
}

/**
 * Whether the named array identifier is mutated anywhere inside the loop body.
 *
 * Treats as mutation: a call to a known mutating method on the identifier
 * (`arr.push(...)`, `arr.splice(...)`, …) or an assignment/update whose target
 * is a member of the identifier (`arr[i] = x`, `arr.length = 0`, `arr[i]++`).
 *
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {string} arrName - The array identifier name
 * @returns {boolean} True if the array is mutated within the loop
 */
function isArrayMutatedInLoop(loopNode: AstNode, arrName: string): boolean {
  let mutated: boolean = false;

  const memberOfArr = (target: AstNode | undefined): boolean => {
    if (
      !target ||
      (target.type !== 'StaticMemberExpression' && target.type !== 'MemberExpression')
    ) {
      return false;
    }

    const obj: AstNode | undefined = target.object as AstNode | undefined;

    return obj?.type === 'Identifier' && (obj.name as string) === arrName;
  };

  walkBody(loopNode, (child: AstNode): void => {
    /* arr.<mutator>(...) */
    if (child.type === 'CallExpression') {
      const callee: AstNode | undefined = child.callee as AstNode | undefined;

      if (
        callee &&
        (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression')
      ) {
        const obj: AstNode | undefined = callee.object as AstNode | undefined;
        const prop: AstNode | undefined = callee.property as AstNode | undefined;

        if (
          obj?.type === 'Identifier' &&
          (obj.name as string) === arrName &&
          prop &&
          MUTATING_METHODS.has(prop.name as string)
        ) {
          mutated = true;
        }
      }
    }

    /* arr[i] = x  /  arr.length = 0 */
    if (child.type === 'AssignmentExpression' && memberOfArr(child.left as AstNode | undefined)) {
      mutated = true;
    }

    /* arr[i]++  /  --arr.length */
    if (child.type === 'UpdateExpression' && memberOfArr(child.argument as AstNode | undefined)) {
      mutated = true;
    }
  });

  return mutated;
}

/**
 * Build a fix for .indexOf() in a loop.
 *
 * @param {AstNode} indexOfCall - The indexOf CallExpression
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildIndexOfFix(
  indexOfCall: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;

  /* The receiver must be a simple identifier (so we can build `new Set(arr)`
   * and detect mutation of that exact binding). */
  const arrName: string | null = getReceiverIdentifier(indexOfCall);

  if (!arrName) {
    return NO_FIX;
  }

  const arrText: string | null = getCalleeArrayText(indexOfCall, src);

  if (!arrText) {
    return NO_FIX;
  }

  /* If the array is mutated inside the loop, a hoisted Set would be stale. */
  if (isArrayMutatedInLoop(loopNode, arrName)) {
    return NO_FIX;
  }

  /* Find if indexOf is used in a comparison pattern */
  const comparison: { node: AstNode; negated: boolean } | null = findIndexOfComparison(
    loopNode,
    indexOfCall,
    src,
  );

  if (!comparison) {
    /* Bare indexOf call — used for the index value, can't replace with Set */
    return NO_FIX;
  }

  /* Get the search argument — require EXACTLY one. A second `fromIndex`
   * argument changes the semantics and cannot be modeled with `Set.has`. */
  const args: AstNode[] = (indexOfCall.arguments ?? []) as AstNode[];

  if (args.length !== 1) {
    return NO_FIX;
  }

  const [searchArg] = args;

  if (!searchArg) {
    return NO_FIX;
  }

  /* A multi-character string-literal argument is a SUBSTRING search on a String
   * (`s.indexOf('foo')`), not an Array membership test. `Set.has('foo')` checks
   * for the WHOLE element 'foo', so the rewrite would change the meaning and
   * corrupt correct code. A single-char literal (`s.indexOf('a')`) or an
   * identifier/expression arg is safe to keep — Array membership and the
   * length-1 String case both behave identically under Set.has. */
  if (
    searchArg.type === 'Literal' &&
    typeof searchArg.value === 'string' &&
    (searchArg.value as string).length > 1
  ) {
    return NO_FIX;
  }

  const searchText: string = nodeText(searchArg, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Generate set variable */
  const safeArr: string = arrText.replaceAll(/[^a-zA-Z0-9]/g, '_');
  const setVar: string = `_${safeArr}Set`;
  const hoisted: string = `${indent}const ${setVar}: ReadonlySet<unknown> = new Set(${arrText});\n`;

  /* Replace the comparison with .has() */
  const compStart: number = comparison.node.start as number;
  const compEnd: number = comparison.node.end as number;
  const hasExpr: string = comparison.negated
    ? `!${setVar}.has(${searchText})`
    : `${setVar}.has(${searchText})`;

  const beforeComp: string = src.slice(loopStart, compStart);
  const afterComp: string = src.slice(compEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeComp + hasExpr + afterComp,
  };
}

/**
 * Check a loop node for .indexOf() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any .indexOf() calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];
  let found: AstNode | undefined;

  walkBody(node, (child: AstNode): boolean | void => {
    if (isCallTo(child, 'indexOf')) {
      found = child;
      return true;
    }
  });

  if (found) {
    /* Detection is gated on auto-fixability: emit ONLY when buildIndexOfFix can
     * rewrite the call into a hoisted `Set.has` — i.e. a simple-identifier
     * receiver, an un-mutated array, and a `=== -1`/`!== -1`-style membership
     * comparison with a single non-substring argument. A bare `.indexOf()` used
     * for its index value, a non-identifier receiver, a mutated array, a second
     * `fromIndex` arg, or a multi-char substring search all NO_OP — and thus no
     * longer flag, eliminating false positives on correct index-value usage. */
    const fix: LintFix = buildIndexOfFix(found, node, context);

    if (isRealFix(fix)) {
      results.push({
        file: context.file,
        line: found.loc.start.line,
        column: found.loc.start.column + 1,
        severity: 'warning',
        message: '.indexOf() inside loop creates O(n²) complexity',
        ruleId: 'complexity/no-index-of-in-loop',
        tip: 'Use a Set or Map for O(1) lookups instead of .indexOf()',
        fix,
      });
    }
  }

  return results;
};

/** The no-index-of-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-index-of-in-loop',
  description: 'Avoid .indexOf() inside loops — use Map or Set instead',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    ForStatement: checkLoop,
    ForOfStatement: checkLoop,
    WhileStatement: checkLoop,
  },
};

export default rule;
