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
import noRedundantOkGuard from './no-redundant-ok-guard.ts';
import requireResultType from './require-result-type.ts';
import validateFunctionInput from './validate-function-input.ts';
import requireOkReturn from './require-ok-return.ts';
import noResultFallback from './no-result-fallback.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
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
    expect(results[0]!.message).toContain('Ternary fallback');
    expect(results[0]!.message).toContain('result');
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
    expect(results[0]!.ruleId).toBe('result/check-before-access');
    expect(results[0]!.message).toContain('result.data');
    expect(results[0]!.message).toContain('.ok');
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
    expect(results[0]!.message).toContain('result.error');
  });

  it('detects Result variable named "response" via expanded patterns', async () => {
    const code: string = `
import { ok } from '@/schemas/result/result';
const response = fetchData();
const value = response.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('response.data');
  });

  it('ignores non-Result variable names without Result import', async () => {
    const code: string = `
const config = loadConfig();
const value = config.data;
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
    expect(results[0]!.ruleId).toBe('result/no-ignore-result');
    expect(results[0]!.message).toContain('safeParse');
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
    expect(results[0]!.message).toContain('validate');
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
    expect(results[0]!.message).toContain('fetchData');
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
    expect(results[0]!.ruleId).toBe('result/require-result-type');
    expect(results[0]!.message).toContain('loadUser');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports ALL exported non-void functions without Result (no mightFail heuristic)', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('add');
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

  it('reports non-exported module-scope function with non-Result return', async () => {
    const code: string = `
function getGitInfo(): GitInfo {
  const data: string = fetchData();
  return { commit: data };
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('getGitInfo');
  });

  it('passes non-exported function returning Result', async () => {
    const code: string = `
function getGitInfo(): Result<GitInfo> {
  return ok(GitInfoSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes non-exported void function', async () => {
    const code: string = `
function logMessage(msg: string): void {
  console.log(msg);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts integration boundary functions with throw result.error', async () => {
    const code: string = `
export function createConfig(): UserConfig {
  const result: Result<GitInfo> = getGitInfo();
  if (!result.ok) throw result.error; // integration boundary: Vite doesn't understand Result
  return defineConfig({ plugins: [] });
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts function with integration boundary comment (pure factory)', async () => {
    const code: string = `
export function createPlugin(): Plugin {
  // integration boundary: returns Vite Plugin type
  return { name: 'my-plugin', apply: 'serve' };
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('flags integration boundary comment without explanation', async () => {
    const code: string = `export function createConfig(options: Options): Config {
    const result = safeParse(Schema, options);
    if (!result.ok) throw result.error; // integration boundary
    return result.data;
  }`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('exempts integration boundary comment with explanation', async () => {
    const code: string = `export function createConfig(options: Options): Config {
    const result = safeParse(Schema, options);
    if (!result.ok) throw result.error; // integration boundary: Vite doesn't understand Result
    return result.data;
  }`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('still flags function without integration boundary comment', async () => {
    const code: string = `
export function createConfig(): UserConfig {
  const result: Result<GitInfo> = getGitInfo();
  return defineConfig({});
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
    expect(results[0]!.message).toContain("'name'");
    expect(results[1]!.message).toContain("'age'");
  });

  it('passes when all parameters are validated with safeParse()', async () => {
    const code: string = `
export function createUser(name: unknown, age: unknown): Result<User> {
  const nameResult = safeParse(NameSchema, name);
  if (!nameResult.ok) {
    return nameResult;
  }
  const ageResult = safeParse(AgeSchema, age);
  if (!ageResult.ok) {
    return ageResult;
  }
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
  if (!pathResult.ok) {
    return pathResult;
  }
  return ok(FileSchema, content);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'encoding'");
  });

  it('reports handler function without validation', async () => {
    const code: string = `
function handleSubmit(data: FormData): void {
  saveToDb(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
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
  if (!itemsResult.ok) {
    return itemsResult;
  }
  return ok(VoidSchema, undefined);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('passes when parameter is validated via spread [...param]', async () => {
    const code: string = `
export function detectFromNavigator(available: readonly string[]): Result<string> {
  const availableResult = safeParse(StrArraySchema, [...available]);
  if (!availableResult.ok) {
    return availableResult;
  }
  return ok(StrSchema, availableResult.data[0]);
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
    expect(results[0]!.ruleId).toBe('result/require-ok-return');
    expect(results[0]!.message).toContain('raw value');
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

  it('flags safeParse in return — should use ok() for typed values', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('safeParse');
  });

  it('flags ok() in catch block (should be err())', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (error) {
    return ok(Schema, fallback);
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('error path');
    expect(results[0]!.message).toContain('err()');
  });

  it('passes err() in catch block', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (error) {
    return err(ERRORS.IO.READ_FAILED, { cause: fromUnknownError(error) });
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
    expect(results[0]!.message).toContain('UserSchema');
    expect(results[0]!.message).toContain('okUnchecked');
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

  it('flags safeParse() in return position — should use ok() instead', async () => {
    const code: string = `
export function getVersion(): Result<string> {
  const version: string = '1.0.0';
  return safeParse(v.string(), version);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('safeParse');
    expect(results[0]!.message).toContain('ok()');
    expect(results[0]!.tip).toContain('untrusted input');
  });

  it('passes ok() in return position', async () => {
    const code: string = `
export function getVersion(): Result<string> {
  const version: string = '1.0.0';
  return ok(v.string(), version);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not flag ok() after early-return error guards', async () => {
    const code: string = `
function getGitInfo(): Result<GitInfo> {
  const a: Result<Str> = execSyncSafe('cmd1');
  if (!a.ok) {
    return a;
  }
  const b: Result<Str> = execSyncSafe('cmd2');
  if (!b.ok) {
    return b;
  }
  return ok(GitInfoSchema, { commit: a.data, full: b.data });
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/check-before-access — Fix 2: brace-less early returns
// =============================================================================

describe('result/check-before-access — brace-less early returns', () => {
  it('passes .data access after brace-less early return guard', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const rootResult = safeParse(Schema, data);
if (!rootResult.ok) return rootResult;
const value = rootResult.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('passes .data access after braced early return guard', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const rootResult = safeParse(Schema, data);
if (!rootResult.ok) { return rootResult; }
const value = rootResult.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/check-before-access — Fix 3: inline chain detection
// =============================================================================

describe('result/check-before-access — inline chains', () => {
  it('reports safeParse(...).data without .ok check', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const value = safeParse(Schema, data).data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('safeParse(...)');
    expect(results[0]!.message).toContain('.ok');
  });

  it('does not flag non-Result function chains', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const value = JSON.parse(text).data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/check-before-access — Fix 4: type annotation detection
// =============================================================================

describe('result/check-before-access — type annotation detection', () => {
  it('reports .data access on variable with Result type annotation', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
const cached: Result<Config> = safeParse(Schema, data);
const value = cached.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('cached.data');
  });

  it('passes .data access on Result-typed variable after .ok check', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
const cached: Result<Config> = safeParse(Schema, data);
if (!cached.ok) return cached;
const value = cached.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/no-redundant-ok-guard (Fix 6)
// =============================================================================

describe('result/no-redundant-ok-guard', () => {
  it('reports redundant guard where both branches return same variable', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) {
    return validated;
  }
  return validated;
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('result/no-redundant-ok-guard');
    expect(results[0]!.message).toContain('validated');
    expect(results[0]!.message).toContain('Redundant');
  });

  it('passes when guard returns different value than next return', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) {
    return validated;
  }
  return ok(Schema, transformed);
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(0);
  });

  it('passes when guard has braces and returns different value', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) {
    return err(ERRORS.INVALID);
  }
  return validated;
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(0);
  });

  it('reports redundant guard with braces', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) { return validated; }
  return validated;
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/require-result-type — Fix 7: identity function exemption
// =============================================================================

describe('result/require-result-type — identity function exemption', () => {
  it('exempts identity functions that return their parameter', async () => {
    const code: string = `
export function defineConfig(config: Partial<CoreConfig>): Partial<CoreConfig> {
  return config;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('does not exempt functions that transform their input', async () => {
    const code: string = `
export function processConfig(config: Partial<CoreConfig>): CoreConfig {
  return { ...defaults, ...config };
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/require-result-type — schema factory + introspection exemptions
// =============================================================================

describe('result/require-result-type — schema factory exemptions', () => {
  it('exempts functions returning TemplateSchema', async () => {
    const code: string = `
export function messageTemplate<TParams>(params: TParams): TemplateSchema<TParams> {
  return schema;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts functions returning NullableParamSchemas', async () => {
    const code: string = `
function getTemplateParams(schema: v.GenericSchema): NullableParamSchemas {
  return null;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts functions returning NullableSchemaEntries', async () => {
    const code: string = `
function getSchemaEntries(schema: v.GenericSchema): NullableSchemaEntries {
  return null;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('still flags functions returning Str', async () => {
    const code: string = `
export function getName(): Str {
  return 'hello';
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('still flags functions returning v.InferOutput', async () => {
    const code: string = `
export function getConfig(): v.InferOutput<typeof ConfigSchema> {
  return defaults;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/validate-function-input — Fix 8: indirect validation
// =============================================================================

describe('result/validate-function-input — indirect validation', () => {
  it('passes when parameter is transformed then safeParsed', async () => {
    const code: string = `
export function setConfig(config: Partial<CoreConfig>): Result<CoreConfig> {
  const merged = deepMerge(defaults, config);
  const validated = safeParse(CoreConfigSchema, merged);
  if (!validated.ok) {
    return validated;
  }
  return validated;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('still reports when parameter is not used in any validated path', async () => {
    const code: string = `
export function setConfig(config: Partial<CoreConfig>): Result<CoreConfig> {
  const validated = safeParse(CoreConfigSchema, defaults);
  if (!validated.ok) {
    return validated;
  }
  return validated;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'config'");
  });
});

// =============================================================================
// result/no-result-fallback
// =============================================================================

describe('result/no-result-fallback', () => {
  it('flags if/else fallback on Result', async () => {
    const code: string = `
let git: GitInfo;
if (gitResult.ok) {
  git = gitResult.data;
} else {
  git = { commit: 'unknown' };
}
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('result/no-result-fallback');
    expect(results[0]!.message).toContain('silently discarded');
  });

  it('flags ternary fallback on Result with literal alternate', async () => {
    const code: string = `
const version: string = versionResult.ok ? versionResult.data : 'unknown';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('result/no-result-fallback');
  });

  it('flags ternary fallback on Result with object alternate', async () => {
    const code: string = `
const git: GitInfo = gitResult.ok ? gitResult.data : { commit: 'unknown' };
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('passes if (!result.ok) return result pattern', async () => {
    const code: string = `
if (!gitResult.ok) return gitResult;
const git: GitInfo = gitResult.data;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes if (!result.ok) throw result.error pattern', async () => {
    const code: string = `
if (!gitResult.ok) throw gitResult.error;
const git: GitInfo = gitResult.data;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes regular if/else without Result .ok check', async () => {
    const code: string = `
let x: number;
if (condition) {
  x = 1;
} else {
  x = 2;
}
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('flags nullish fallback on Result .data property', async () => {
    const code: string = `
const version: Str = (parsed.data.version as Str) ?? '0.0.0';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('result/no-result-fallback');
    expect(results[0]!.message).toContain('parsed.data');
    expect(results[0]!.message).toContain('silently discards');
  });

  it('passes nullish coalescing without .data in chain', async () => {
    const code: string = `
const name: string = config.name ?? 'default';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('flags nullish fallback on .data with object literal', async () => {
    const code: string = `
const opts: Options = parsed.data.options ?? {};
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('passes nullish on deep chain with method call (Map.get)', async () => {
    const code: string = `
const branch: Str = parsed.data.branches.get(keyword) ?? parsed.data.branches.get('other') ?? '';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('still flags direct data.field ?? fallback', async () => {
    const code: string = `
const name: Str = parsed.data.name ?? 'unknown';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('exempts ternary inside $effect context', async () => {
    const code: string = `
$effect(() => {
  const val: Str = result.ok ? result.data : 'fallback';
});
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('exempts if/else inside $derived.by context', async () => {
    const code: string = `
const val: Str = $derived.by(() => {
  let v: Str;
  if (result.ok) {
    v = result.data;
  } else {
    v = 'fallback';
  }
  return v;
});
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('exempts nullish coalescing inside $effect context', async () => {
    const code: string = `
$effect(() => {
  const name: Str = parsed.data.name ?? 'default';
});
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('flags ternary fallback with array literal alternate', async () => {
    const code: string = `
const items: string[] = result.ok ? result.data : [];
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('flags ternary fallback with template literal alternate', async () => {
    const code: string = `
const msg: string = result.ok ? result.data : \`default\`;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('flags ternary fallback with numeric literal alternate', async () => {
    const code: string = `
const count: number = result.ok ? result.data : 0;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('flags ternary fallback with boolean literal alternate', async () => {
    const code: string = `
const flag: boolean = result.ok ? result.data : false;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('passes ternary without .data access in consequent', async () => {
    const code: string = `
const x: Str = result.ok ? 'yes' : 'no';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes ternary with non-literal alternate', async () => {
    const code: string = `
const x: Str = result.ok ? result.data : computeDefault();
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('flags if/else with inverted pattern (!result.ok fallback then data)', async () => {
    const code: string = `
let val: Str;
if (!gitResult.ok) {
  val = 'fallback';
} else {
  val = gitResult.data;
}
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('silently discarded');
  });

  it('passes if without else branch', async () => {
    const code: string = `
if (result.ok) {
  doSomething(result.data);
}
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes nullish coalescing with || operator (not ??)', async () => {
    const code: string = `
const name: Str = parsed.data.name || 'unknown';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes nullish coalescing when right side is not a fallback literal', async () => {
    const code: string = `
const name: Str = parsed.data.name ?? getDefault();
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/validate-function-input — method-call validation
// =============================================================================

describe('result/validate-function-input — method-call validation', () => {
  it('passes when parameter is validated via method call returning Result', async () => {
    const code: string = `
import { type Result } from '@/schemas/result/result';
export function createStore(registry: Registry): Result<Store> {
  const activeResult: Result<Str> = registry.active();
  if (!activeResult.ok) { return activeResult; }
  return ok(StoreSchema, {});
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const registryErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'registry'"),
    );
    expect(registryErrors.length).toBe(0);
  });

  it('exempts params typed as GenericSchema', async () => {
    const code: string = `
import { type Result } from '@/schemas/result/result';
import * as v from 'valibot';
export function buildLocale(schema: v.GenericSchema, rawStrs: RawLocaleStrings): Result<BuiltLocale> {
  const result = safeParse(schema, rawStrs);
  if (!result.ok) {
    return result;
  }
  return ok(BuiltLocaleSchema, result.data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const schemaErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'schema'"),
    );
    expect(schemaErrors.length).toBe(0);
  });

  it('exempts params validated via schema param (safeParse(schema, data))', async () => {
    const code: string = `
import { type Result } from '@/schemas/result/result';
import * as v from 'valibot';
export function buildLocale(schema: v.GenericSchema, rawStrs: RawLocaleStrings): Result<BuiltLocale> {
  const result = safeParse(schema, rawStrs);
  if (!result.ok) {
    return result;
  }
  return ok(BuiltLocaleSchema, result.data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const rawStrsErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'rawStrs'"),
    );
    expect(rawStrsErrors.length).toBe(0);
  });

  it('exempts params typed as FormatterMap', async () => {
    const code: string = `
import { type Result } from '@/schemas/result/result';
export function renderMessage(template: Str, formatters: FormatterMap): Result<Str> {
  const result = safeParse(StrSchema, template);
  if (!result.ok) {
    return result;
  }
  return ok(StrSchema, result.data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const fmtErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'formatters'"),
    );
    expect(fmtErrors.length).toBe(0);
  });

  it('exempts generic type params extending GenericSchema', async () => {
    const code: string = `
import { type Result } from '@/schemas/result/result';
import * as v from 'valibot';
export function buildLocale<TSchema extends v.GenericSchema>(schema: TSchema, rawStrs: RawLocaleStrings): Result<BuiltLocale> {
  const entries = getSchemaEntries(schema);
  return ok(BuiltLocaleSchema, entries);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const schemaErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'schema'"),
    );
    expect(schemaErrors.length).toBe(0);
  });

  it('detects safeParse with inline schema containing commas', async () => {
    const code: string = `
import { type Result } from '@/schemas/result/result';
export function renderMessage(template: Str, params: Record<Str, unknown>): Result<Str> {
  const templateResult = safeParse(StrSchema, template);
  if (!templateResult.ok) {
    return templateResult;
  }
  const paramsResult = safeParse(v.record(v.string(), v.unknown()), params);
  if (!paramsResult.ok) {
    return paramsResult;
  }
  return ok(StrSchema, '');
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const paramsErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'params'"),
    );
    expect(paramsErrors.length).toBe(0);
  });
});

// =============================================================================
// result/validate-function-input — additional branch coverage
// =============================================================================

describe('result/validate-function-input — additional branch coverage', () => {
  it('skips destructured ObjectPattern params', async () => {
    const code: string = `
export function createUser({ name, age }: UserInput): Result<User> {
  const result = safeParse(UserSchema, { name, age });
  if (!result.ok) {
    return result;
  }
  return result;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('skips destructured ArrayPattern params', async () => {
    const code: string = `
export function processItems([first, second]: string[]): Result<string> {
  const result = safeParse(StrSchema, first);
  if (!result.ok) {
    return result;
  }
  return result;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('extracts param name from AssignmentPattern (default value)', async () => {
    const code: string = `
export function handleRequest(data: unknown, retries = 3): Result<Response> {
  const dataResult = safeParse(DataSchema, data);
  if (!dataResult.ok) {
    return dataResult;
  }
  return ok(ResponseSchema, {});
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'retries'");
  });

  it('passes AssignmentPattern param when validated', async () => {
    const code: string = `
export function handleRequest(retries = 3): Result<Response> {
  const retriesResult = safeParse(NumSchema, retries);
  if (!retriesResult.ok) {
    return retriesResult;
  }
  return ok(ResponseSchema, {});
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('skips params with external types (Date)', async () => {
    const code: string = `
export function formatDate(date: Date): Result<string> {
  return ok(StrSchema, date.toISOString());
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const dateErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'date'"),
    );
    expect(dateErrors.length).toBe(0);
  });

  it('skips params with external types (Date | null)', async () => {
    const code: string = `
export function formatDate(date: Date | null): Result<string> {
  return ok(StrSchema, '');
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const dateErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'date'"),
    );
    expect(dateErrors.length).toBe(0);
  });

  it('skips params with callback type containing Function keyword', async () => {
    const code: string = `
export function processItems(items: unknown, callback: Function): Result<void> {
  const itemsResult = safeParse(ItemsSchema, items);
  if (!itemsResult.ok) {
    return itemsResult;
  }
  return ok(VoidSchema, undefined);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const cbErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'callback'"),
    );
    expect(cbErrors.length).toBe(0);
  });

  it('skips params typed as RawLocaleStrings (upstream validated)', async () => {
    const code: string = `
export function processLocale(strs: RawLocaleStrings): Result<Locale> {
  return ok(LocaleSchema, strs);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const strsErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'strs'"),
    );
    expect(strsErrors.length).toBe(0);
  });

  it('skips params typed as FormatterFn (upstream validated)', async () => {
    const code: string = `
export function runFormatter(fn: FormatterFn): Result<string> {
  return ok(StrSchema, '');
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const fnErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'fn'"),
    );
    expect(fnErrors.length).toBe(0);
  });

  it('skips params typed as BaseSchema (schema type)', async () => {
    const code: string = `
import * as v from 'valibot';
export function validate(schema: v.BaseSchema<string, string, v.BaseIssue<unknown>>, data: unknown): Result<string> {
  const result = safeParse(schema, data);
  if (!result.ok) {
    return result;
  }
  return result;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const schemaErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'schema'"),
    );
    expect(schemaErrors.length).toBe(0);
  });

  it('recognizes .safeParse() method call as validation', async () => {
    const code: string = `
export function processInput(data: unknown): Result<Config> {
  const result = ConfigSchema.safeParse(data);
  if (!result.ok) {
    return result;
  }
  return result;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('recognizes .parse() method call as validation', async () => {
    const code: string = `
export function processInput(data: unknown): Result<Config> {
  const result = ConfigSchema.parse(data);
  return ok(ConfigSchema, result);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('matches handler pattern: onSubmit', async () => {
    const code: string = `
const onSubmit = (data: FormData): void => {
  saveToDb(data);
};
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('matches handler pattern: userController', async () => {
    const code: string = `
const userController = (req: Request): void => {
  handle(req);
};
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'req'");
  });

  it('matches handler pattern: processData', async () => {
    const code: string = `
function processData(input: unknown): void {
  save(input);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'input'");
  });

  it('matches handler pattern: parseInput', async () => {
    const code: string = `
function parseInput(raw: string): void {
  use(raw);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'raw'");
  });

  it('matches handler pattern: validateForm', async () => {
    const code: string = `
function validateForm(data: unknown): void {
  check(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('matches handler pattern: submitAction', async () => {
    const code: string = `
function submitAction(payload: unknown): void {
  send(payload);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'payload'");
  });

  it('matches handler pattern: userEndpoint', async () => {
    const code: string = `
function userEndpoint(req: Request): void {
  respond(req);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'req'");
  });

  it('matches handler pattern: fetchApi', async () => {
    const code: string = `
function fetchApi(url: string): void {
  request(url);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'url'");
  });

  it('matches handler pattern: createItem', async () => {
    const code: string = `
function createItem(data: unknown): void {
  insert(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('matches handler pattern: updateItem', async () => {
    const code: string = `
function updateItem(data: unknown): void {
  save(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('matches handler pattern: removeItem', async () => {
    const code: string = `
function removeItem(id: string): void {
  del(id);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'id'");
  });

  it('matches handler pattern: deleteUser', async () => {
    const code: string = `
function deleteUser(id: string): void {
  remove(id);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'id'");
  });

  it('matches handler pattern: putData', async () => {
    const code: string = `
function putData(data: unknown): void {
  save(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('matches handler pattern: patchRecord', async () => {
    const code: string = `
function patchRecord(data: unknown): void {
  merge(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('handles exported re-export (no declaration)', async () => {
    const code: string = `
export { something } from './other';
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('handles exported variable with non-function init', async () => {
    const code: string = `
export const MAX_RETRIES = 5;
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('handles exported FunctionExpression', async () => {
    const code: string = `
export const doWork = function(data: unknown): Result<void> {
  save(data);
};
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'data'");
  });

  it('does not double-report exported function declaration', async () => {
    const code: string = `
export function handleSubmit(data: FormData): void {
  saveToDb(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    // Should only report once from ExportNamedDeclaration, not also from FunctionDeclaration
    expect(results.length).toBe(1);
  });

  it('handles FunctionDeclaration without name (anonymous)', async () => {
    const code: string = `
export default function(data: unknown): void {
  save(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    // Anonymous function — FunctionDeclaration visitor returns [] for no name
    // Only ExportNamedDeclaration would catch, but this is export default
    expect(results.length).toBe(0);
  });

  it('handles VariableDeclaration arrow handler with no params', async () => {
    const code: string = `
const handleClick = (): void => {
  doStuff();
};
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('handles VariableDeclaration FunctionExpression handler', async () => {
    const code: string = `
const handleClick = function(event: MouseEvent): void {
  process(event);
};
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'event'");
  });

  it('does not flag VariableDeclaration with non-handler name', async () => {
    const code: string = `
const myHelper = (data: unknown): void => {
  save(data);
};
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('handles VariableDeclaration with no init', async () => {
    const code: string = `
let handler: (data: string) => void;
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('handles function with no body (abstract/overload)', async () => {
    const code: string = `
export function handleRequest(data: unknown): void;
export function handleRequest(data: unknown): void {
  save(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    // The overload signature has no body, should not crash
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('skips params typed as GenericSchemaAsync (schema type)', async () => {
    const code: string = `
import * as v from 'valibot';
export function validateAsync(schema: v.GenericSchemaAsync, data: unknown): Result<string> {
  const result = safeParse(schema, data);
  if (!result.ok) {
    return result;
  }
  return result;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const schemaErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'schema'"),
    );
    expect(schemaErrors.length).toBe(0);
  });

  it('reports error with tip containing capitalized param name in schema', async () => {
    const code: string = `
export function handleSubmit(data: unknown): Result<void> {
  doStuff();
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.tip).toContain('DataSchema');
    expect(results[0]!.tip).toContain('safeParse');
  });

  it('schema-validated: other param type node is null', async () => {
    const code: string = `
export function doThing(schema, data: unknown): Result<void> {
  doStuff();
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const dataErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'data'"),
    );
    expect(dataErrors.length).toBe(1);
  });

  it('skips params with Intl external type', async () => {
    const code: string = `
export function formatNumber(fmt: Intl.NumberFormat): Result<string> {
  return ok(StrSchema, fmt.format(42));
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    const fmtErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes("'fmt'"),
    );
    expect(fmtErrors.length).toBe(0);
  });
});

// =============================================================================
// result/require-result-type — additional branch coverage
// =============================================================================

describe('result/require-result-type — additional branch coverage', () => {
  it('passes function returning Ok type directly', async () => {
    const code: string = `
export function getUser(id: string): Ok<User> {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes function returning Err type directly', async () => {
    const code: string = `
export function fail(msg: string): Err {
  return err(ERRORS.FAIL);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes function returning Ok | Err union', async () => {
    const code: string = `
export function tryLoad(id: string): Ok<User> | Err {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes function returning Promise<void>', async () => {
    const code: string = `
export async function sendEmail(to: string): Promise<void> {
  await transport.send(to);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts predicates returning Bool type', async () => {
    const code: string = `
export function isReady(state: State): Bool {
  return state.loaded;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts has* predicate returning boolean', async () => {
    const code: string = `
export function hasPermission(user: User): boolean {
  return user.admin;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts can* predicate returning boolean', async () => {
    const code: string = `
export function canAccess(user: User): boolean {
  return user.role === 'admin';
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts should* predicate returning boolean', async () => {
    const code: string = `
export function shouldRetry(count: number): boolean {
  return count < 3;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('flags predicate returning non-boolean non-Bool', async () => {
    const code: string = `
export function hasItems(list: Item[]): number {
  return list.length;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('exempts functions returning v.GenericSchema', async () => {
    const code: string = `
export function createSchema(): v.GenericSchema {
  return v.object({});
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts functions returning v.BaseSchema', async () => {
    const code: string = `
export function buildSchema(): v.BaseSchema<string, string, unknown> {
  return v.string();
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('handles exported arrow function in variable declaration', async () => {
    const code: string = `
export const loadUser = (id: string): Promise<User> => {
  return fetchData(id);
};
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('loadUser');
  });

  it('handles exported FunctionExpression in variable declaration', async () => {
    const code: string = `
export const loadUser = function(id: string): Promise<User> {
  return fetchData(id);
};
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('loadUser');
  });

  it('passes exported arrow function returning Result', async () => {
    const code: string = `
export const loadUser = (id: string): Result<User> => {
  return safeParse(UserSchema, data);
};
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('handles exported VariableDeclaration with non-function init', async () => {
    const code: string = `
export const MAX_RETRIES = 5;
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('handles export re-export (no declaration)', async () => {
    const code: string = `
export { something } from './other';
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('handles export default function declaration', async () => {
    const code: string = `
export default function loadData(): Promise<Data> {
  return fetch('/api');
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('passes export default function returning Result', async () => {
    const code: string = `
export default function loadData(): Result<Data> {
  return ok(DataSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('handles export default arrow function expression', async () => {
    const code: string = `
export default (id: string): Promise<User> => {
  return fetch('/user/' + id);
};
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('handles export default with no declaration', async () => {
    const code: string = `
export default 42;
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('handles function without return type annotation', async () => {
    const code: string = `
export function doStuff(data: string) {
  return data;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('does not exempt identity function for predicate names', async () => {
    const code: string = `
export function isValid(input: string): string {
  return input;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    // isPredicate is true but return type is string not boolean/Bool
    // Identity exemption is skipped for predicates
    expect(results.length).toBe(1);
  });

  it('does not exempt function returning non-param identifier', async () => {
    const code: string = `
export function getDefaults(cfg: Config): Defaults {
  return defaults;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    // 'defaults' is not a param name, so identity exemption doesn't apply
    expect(results.length).toBe(1);
  });

  it('does not exempt function returning non-Identifier expression', async () => {
    const code: string = `
export function getDefaults(cfg: Config): Defaults {
  return cfg.defaults;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    // MemberExpression is not Identifier, so identity exemption doesn't apply
    expect(results.length).toBe(1);
  });

  it('does not exempt function with multiple statements', async () => {
    const code: string = `
export function getDefaults(cfg: Config): Defaults {
  const x = 1;
  return cfg;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    // Multiple statements, not identity pattern
    expect(results.length).toBe(1);
  });

  it('skips non-exported FunctionDeclaration preceded by export default', async () => {
    const code: string = `
export default function loadData(): string {
  return 'hello';
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    // Should be handled by ExportDefaultDeclaration, not double-reported by FunctionDeclaration
    expect(results.length).toBe(1);
  });

  it('fix suggests wrapping return type in Result<>', async () => {
    const code: string = `
export function loadUser(id: string): Promise<User> {
  return fetchData(id);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix).toBeDefined();
    expect(results[0]!.fix!.text).toContain('Result<');
  });
});

// =============================================================================
// result/require-ok-return — additional branch coverage
// =============================================================================

describe('result/require-ok-return — additional branch coverage', () => {
  it('passes returning a property access (presumed Result)', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return container.result;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes returning a function call result', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return someHelper(id);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes returning an await expression', async () => {
    const code: string = `
export async function getUser(id: string): Promise<Result<User>> {
  return await fetchUser(id);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags raw value return (object literal)', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return { ok: true, data: {}, error: null };
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('raw value');
  });

  it('flags raw value return (array literal)', async () => {
    const code: string = `
export function getItems(): Result<Item[]> {
  return [1, 2, 3];
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('raw value');
  });

  it('flags okUnchecked in catch block (should be err)', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (error) {
    return okUnchecked(fallback);
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('error path');
    expect(results[0]!.message).toContain('err()');
  });

  it('flags ok() in error guard path (if (!result.ok) { return ok() })', async () => {
    const code: string = `
export function processData(input: string): Result<Config> {
  const result = safeParse(ConfigSchema, input);
  if (!result.ok)
    return ok(ConfigSchema, defaults);
  return result;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('error path');
  });

  it('passes err() return outside catch/error-guard', async () => {
    const code: string = `
export function validate(data: unknown): Result<Config> {
  if (!data) {
    return err(ERRORS.INVALID);
  }
  return ok(ConfigSchema, data);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not check non-Result function', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not check function without return type', async () => {
    const code: string = `
export function add(a: number, b: number) {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not check function without body', async () => {
    const code: string = `
export function add(a: number, b: number): Result<number>;
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('skips bare return statement (no argument)', async () => {
    const code: string = `
export function doStuff(data: unknown): Result<void> {
  if (!data) {
    return;
  }
  return ok(VoidSchema, undefined);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('handles exported arrow function in variable declaration', async () => {
    const code: string = `
export const getUser = (id: string): Result<User> => {
  return { ok: true, data: {}, error: null };
};
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('raw value');
  });

  it('handles exported FunctionExpression in variable declaration', async () => {
    const code: string = `
export const getUser = function(id: string): Result<User> {
  return { ok: true, data: {}, error: null };
};
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
  });

  it('handles exported VariableDeclaration with non-function init', async () => {
    const code: string = `
export const MAX = 5;
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('handles export re-export (no declaration)', async () => {
    const code: string = `
export { something } from './other';
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not double-report FunctionDeclaration preceded by export', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return { ok: true, data: {}, error: null };
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    // Should only report once from ExportNamedDeclaration visitor
    expect(results.length).toBe(1);
  });

  it('does not descend into nested functions for return collection', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  const inner = function(): string {
    return 'not a result return';
  };
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    // Only the ok() return is checked, nested function's return is ignored
    expect(results.length).toBe(0);
  });

  it('does not descend into nested arrow functions for return collection', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  const inner = () => {
    return 'not a result return';
  };
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not descend into nested function declarations for return collection', async () => {
    const code: string = `
function getUser(id: string): Result<User> {
  function helper(): string {
    return 'not checked';
  }
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('handles function returning Result (bare, no type param)', async () => {
    const code: string = `
function getUser(id: string): Result {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('handles function returning Promise<Result> (bare)', async () => {
    const code: string = `
async function getUser(id: string): Promise<Result> {
  return await ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags okUnchecked with schema declared as const in file', async () => {
    const code: string = `
const UserSchema = v.object({ name: v.string() });
export function getUser(id: string): Result<User> {
  return okUnchecked(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('passes okUnchecked when no schema available', async () => {
    const code: string = `
export function getConfig(): Result<Config> {
  return okUnchecked(config);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('extractResultTypeParam returns null for void Result type', async () => {
    const code: string = `
export function doStuff(): Result<void> {
  return okUnchecked(undefined);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    // Result<void> — typeName is 'void', so schemaAvailable is false
    // okUnchecked should pass since no schema is available
    expect(results.length).toBe(0);
  });

  it('extractResultTypeParam handles Promise<Result<T>>', async () => {
    const code: string = `
import { UserSchema } from './schemas';
export async function getUser(id: string): Promise<Result<User>> {
  return okUnchecked(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('isAfterErrorGuard: guard with throw is success path after', async () => {
    const code: string = `
function getUser(id: string): Result<User> {
  const parsed = safeParse(IdSchema, id);
  if (!parsed.ok) {
    throw parsed.error;
  }
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    // ok() after early-return/throw error guard is the SUCCESS path
    expect(results.length).toBe(0);
  });

  it('isAfterErrorGuard: guard with return is success path after', async () => {
    const code: string = `
function getUser(id: string): Result<User> {
  const parsed = safeParse(IdSchema, id);
  if (!parsed.ok) {
    return parsed;
  }
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('isAfterErrorGuard: no if statement before return', async () => {
    const code: string = `
function getUser(id: string): Result<User> {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('isInsideCatch: no catch block at all', async () => {
    const code: string = `
function getUser(id: string): Result<User> {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('handles multiple return statements in different branches', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  if (id === 'admin') {
    return ok(UserSchema, admin);
  }
  try {
    const user = fetchUser(id);
    return ok(UserSchema, user);
  } catch (error) {
    return err(ERRORS.NOT_FOUND);
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags okUnchecked with generic type param <User>', async () => {
    const code: string = `
import { UserSchema } from './schemas';
export function getUser(id: string): Result<User> {
  return okUnchecked<User>(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UserSchema');
    expect(results[0]!.fix).toBeDefined();
    expect(results[0]!.fix!.text).toContain('ok(UserSchema,');
  });

  it('passes returning okUnchecked with generic when no schema', async () => {
    const code: string = `
export function getConfig(): Result<Config> {
  return okUnchecked<Config>(config);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });
});
