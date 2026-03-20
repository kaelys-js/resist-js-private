/**
 * Tests for Result lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noTernaryFallback from './no-ternary-fallback.ts';
import checkBeforeAccess from './check-before-access.ts';
import noIgnoreResult from './no-ignore-result.ts';
import requireResultType from './require-result-type.ts';
import validateFunctionInput from './validate-function-input.ts';
import requireOkReturn from './require-ok-return.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @returns {Promise<LintResult[]>} Array of lint results
 */
async function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule]);
}

// =============================================================================
// result/no-ternary-fallback
// =============================================================================

describe('result/no-ternary-fallback', () => {
  it('reports result.ok ? result.data : fallback', async () => {
    const code: string = `const x = result.ok ? result.data : 'fallback';`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Ternary fallback');
    expect(results[0].message).toContain('result');
  });

  it('passes regular ternary without .ok/.data pattern', async () => {
    const code: string = `const x = condition ? valueA : valueB;`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes .ok check without .data in consequent', async () => {
    const code: string = `const x = result.ok ? 'yes' : 'no';`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(0);
  });

  it('exempts ternary inside $derived.by context', async () => {
    const code: string = `
const label = $derived.by(() => {
  return result.ok ? result.data : 'fallback';
});
`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(0);
  });

  it('reports ternary outside reactive context', async () => {
    const code: string = `
function getValue() {
  return result.ok ? result.data : null;
}
`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/check-before-access
// =============================================================================

describe('result/check-before-access', () => {
  it('reports .data access without .ok check', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(Schema, data);
const value = result.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/check-before-access');
    expect(results[0].message).toContain('result.data');
    expect(results[0].message).toContain('.ok');
  });

  it('passes .data access after .ok check', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(Schema, data);
if (!result.ok) return result;
const value = result.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('reports .error access without .ok check', async () => {
    const code: string = `
import { err } from '@/schemas/result/result';
const result = validate(input);
const msg = result.error;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('result.error');
  });

  it('ignores non-Result variable names', async () => {
    const code: string = `
import { ok } from '@/schemas/result/result';
const response = fetchData();
const value = response.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('ignores .data access when no Result imports', async () => {
    const code: string = `
const result = JSON.parse(data);
const value = result.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('passes when .ok is checked via if statement', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const parsed = safeParse(Schema, data);
if (parsed.ok) {
  console.log(parsed.data);
}
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/no-ignore-result
// =============================================================================

describe('result/no-ignore-result', () => {
  it('reports ignored Result from safeParse()', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
safeParse(Schema, data);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/no-ignore-result');
    expect(results[0].message).toContain('safeParse');
  });

  it('passes when Result is captured', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(Schema, data);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(0);
  });

  it('reports ignored Result from validate()', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
validate(input);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('validate');
  });

  it('does not flag non-Result function calls', async () => {
    const code: string = `
console.log('hello');
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(0);
  });

  it('reports ignored awaited Result', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
await fetchData(url);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('fetchData');
  });
});

// =============================================================================
// result/require-result-type
// =============================================================================

describe('result/require-result-type', () => {
  it('reports exported function with non-Result return type', async () => {
    const code: string = `
export function loadUser(id: string): Promise<User> {
  return await fetchData(id);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/require-result-type');
    expect(results[0].message).toContain('loadUser');
    expect(results[0].severity).toBe('warning');
  });

  it('reports ALL exported non-void functions without Result (no mightFail heuristic)', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('add');
  });

  it('passes exported function returning Result<T>', async () => {
    const code: string = `
export function loadUser(id: string): Result<User> {
  return safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes exported function returning Promise<Result<T>>', async () => {
    const code: string = `
export async function loadUser(id: string): Promise<Result<User>> {
  return await safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes void functions', async () => {
    const code: string = `
export function logMessage(msg: string): void {
  console.log(msg);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts boolean predicates (is*, has*, can*, should*)', async () => {
    const code: string = `
export function isValid(input: string): boolean {
  return input.length > 0;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('does not exempt predicates with non-boolean return', async () => {
    const code: string = `
export function isValid(input: string): string {
  return input;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/validate-function-input
// =============================================================================

describe('result/validate-function-input', () => {
  it('reports each unvalidated parameter individually', async () => {
    const code: string = `
export function createUser(name: string, age: number): Result<User> {
  return ok({ name, age, id: '123' });
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(2);
    expect(results[0].message).toContain("'name'");
    expect(results[1].message).toContain("'age'");
  });

  it('passes when all parameters are validated with safeParse()', async () => {
    const code: string = `
export function createUser(name: unknown, age: unknown): Result<User> {
  const nameResult = safeParse(NameSchema, name);
  if (!nameResult.ok) return nameResult;
  const ageResult = safeParse(AgeSchema, age);
  if (!ageResult.ok) return ageResult;
  return ok({ name: nameResult.data, age: ageResult.data });
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('reports only the unvalidated parameter when one is validated', async () => {
    const code: string = `
export function readFile(path: string, encoding: string): Result<string> {
  const pathResult = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;
  return ok(FileSchema, content);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'encoding'");
  });

  it('reports handler function without validation', async () => {
    const code: string = `
function handleSubmit(data: FormData): void {
  saveToDb(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'data'");
  });

  it('does not flag non-exported non-handler functions', async () => {
    const code: string = `
function helperAdd(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('does not flag functions without parameters', async () => {
    const code: string = `
export function getVersion(): string {
  return '1.0.0';
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('skips callback parameters (type contains =>)', async () => {
    const code: string = `
export function processItems(items: unknown, onDone: () => void): Result<void> {
  const itemsResult = safeParse(ItemsSchema, items);
  if (!itemsResult.ok) return itemsResult;
  return ok(VoidSchema, undefined);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/require-ok-return
// =============================================================================

describe('result/require-ok-return', () => {
  it('reports raw object return in Result function', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return { ok: true, data: user, error: null };
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/require-ok-return');
    expect(results[0].message).toContain('raw value');
  });

  it('passes ok() return', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes okUnchecked() return', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return okUnchecked(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes err() return', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return err(ERRORS.DB.NOT_FOUND);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes returning a variable (presumed Result)', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  const result = safeParse(UserSchema, data);
  return result;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not check functions without Result return type', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes function call returns (presumed Result-returning)', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags ok() in catch block (should be err())', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (e) {
    return ok(Schema, fallback);
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('error path');
    expect(results[0].message).toContain('err()');
  });

  it('passes err() in catch block', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (e) {
    return err(ERRORS.IO.READ_FAILED, { cause: fromUnknownError(e) });
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags okUnchecked when matching schema is available', async () => {
    const code: string = `
import { UserSchema } from '@/schemas/user';
export function getUser(id: string): Result<User> {
  return okUnchecked(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('UserSchema');
    expect(results[0].message).toContain('okUnchecked');
  });

  it('passes okUnchecked when no matching schema exists', async () => {
    const code: string = `
export function parseConfig(raw: string): Result<ParsedConfig> {
  return okUnchecked(parsed);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });
});
