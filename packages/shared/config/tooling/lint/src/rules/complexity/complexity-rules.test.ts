/**
 * Tests for complexity lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noNestedArrayIteration from './no-nested-array-iteration.ts';
import noArrayMethodInLoop from './no-array-method-in-loop.ts';
import preferMapForLookup from './prefer-map-for-lookup.ts';
import preferSetForExistence from './prefer-set-for-existence.ts';
import noRepeatedTraversal from './no-repeated-traversal.ts';
import noIndexOfInLoop from './no-index-of-in-loop.ts';
import noSpreadInReduce from './no-spread-in-reduce.ts';
import noConcatInLoop from './no-concat-in-loop.ts';
import noDomQueryInLoop from './no-dom-query-in-loop.ts';
import noRegexInLoop from './no-regex-in-loop.ts';
import noSortInLoop from './no-sort-in-loop.ts';
import noJsonParseInLoop from './no-json-parse-in-loop.ts';
import noAwaitInLoop from './no-await-in-loop.ts';
import noFilterMapChain from './no-filter-map-chain.ts';
import arraySizeWarning from './array-size-warning.ts';
import recursiveDepth from './recursive-depth.ts';

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
// complexity/no-nested-array-iteration
// =============================================================================

describe('complexity/no-nested-array-iteration', () => {
  it('reports nested for loops', async () => {
    const code: string = `
const arr = [1, 2, 3];
for (let i = 0; i < arr.length; i++) {
  for (let j = 0; j < arr.length; j++) {
    console.log(arr[i], arr[j]);
  }
}`;
    const results: LintResult[] = await lint(noNestedArrayIteration, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Nested loop detected');
    expect(results[0]!.ruleId).toBe('complexity/no-nested-array-iteration');
  });

  it('reports nested for-of in for', async () => {
    const code: string = `
const items = [1, 2];
for (let i = 0; i < items.length; i++) {
  for (const item of items) {
    console.log(item);
  }
}`;
    const results: LintResult[] = await lint(noNestedArrayIteration, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Nested loop detected');
  });

  it('reports nested for in for-of', async () => {
    const code: string = `
const items = [1, 2];
for (const item of items) {
  for (let j = 0; j < items.length; j++) {
    console.log(item, j);
  }
}`;
    const results: LintResult[] = await lint(noNestedArrayIteration, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Nested loop detected');
  });

  it('passes single for loop without nesting', async () => {
    const code: string = `
const arr = [1, 2, 3];
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}`;
    const results: LintResult[] = await lint(noNestedArrayIteration, code);
    expect(results.length).toBe(0);
  });

  it('passes non-loop code', async () => {
    const code: string = `
const x = 1;
const y = x + 2;
console.log(y);`;
    const results: LintResult[] = await lint(noNestedArrayIteration, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-array-method-in-loop
// =============================================================================

describe('complexity/no-array-method-in-loop', () => {
  it('reports .find() inside for loop', async () => {
    const code: string = `
const users = [{ id: 1 }];
const ids = [1, 2, 3];
for (let i = 0; i < ids.length; i++) {
  users.find(u => u.id === ids[i]);
}`;
    const results: LintResult[] = await lint(noArrayMethodInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.find()');
    expect(results[0]!.message).toContain('O(n²)');
  });

  it('reports .filter() inside for-of loop', async () => {
    const code: string = `
const items = [1, 2, 3];
for (const item of items) {
  items.filter(x => x !== item);
}`;
    const results: LintResult[] = await lint(noArrayMethodInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.filter()');
  });

  it('reports .includes() inside while loop', async () => {
    const code: string = `
const arr = [1, 2, 3];
let i = 0;
while (i < 10) {
  arr.includes(i);
  i++;
}`;
    const results: LintResult[] = await lint(noArrayMethodInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.includes()');
  });

  it('reports .some() inside loop', async () => {
    const code: string = `
const items = [1, 2];
for (const x of items) {
  items.some(i => i > x);
}`;
    const results: LintResult[] = await lint(noArrayMethodInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.some()');
  });

  it('reports .every() inside loop', async () => {
    const code: string = `
const items = [1, 2];
for (const x of items) {
  items.every(i => i > 0);
}`;
    const results: LintResult[] = await lint(noArrayMethodInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.every()');
  });

  it('passes array method outside loop', async () => {
    const code: string = `
const users = [{ id: 1 }];
const found = users.find(u => u.id === 1);
console.log(found);`;
    const results: LintResult[] = await lint(noArrayMethodInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/prefer-map-for-lookup
// =============================================================================

describe('complexity/prefer-map-for-lookup', () => {
  it('reports multiple .find() calls on same array', async () => {
    const code: string = `
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
const a = users.find(u => u.id === 1);
const b = users.find(u => u.id === 2);`;
    const results: LintResult[] = await lint(preferMapForLookup, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('users');
    expect(results[0]!.message).toContain('multiple .find()');
    expect(results[0]!.message).toContain('Map');
  });

  it('passes single .find() call', async () => {
    const code: string = `
const users = [{ id: 1 }];
const found = users.find(u => u.id === 1);`;
    const results: LintResult[] = await lint(preferMapForLookup, code);
    expect(results.length).toBe(0);
  });

  it('passes .find() on different arrays', async () => {
    const code: string = `
const users = [{ id: 1 }];
const items = [{ id: 2 }];
const a = users.find(u => u.id === 1);
const b = items.find(i => i.id === 2);`;
    const results: LintResult[] = await lint(preferMapForLookup, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/prefer-set-for-existence
// =============================================================================

describe('complexity/prefer-set-for-existence', () => {
  it('reports .includes() in for loop', async () => {
    const code: string = `
const allowList = ['a', 'b', 'c'];
const items = ['x', 'y', 'a'];
for (let i = 0; i < items.length; i++) {
  if (allowList.includes(items[i])) {
    console.log('found');
  }
}`;
    const results: LintResult[] = await lint(preferSetForExistence, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.includes()');
    expect(results[0]!.message).toContain('Set');
  });

  it('reports .includes() in for-of loop', async () => {
    const code: string = `
const blocked = [1, 2];
for (const id of [1, 2, 3]) {
  blocked.includes(id);
}`;
    const results: LintResult[] = await lint(preferSetForExistence, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.includes()');
  });

  it('reports .includes() in while loop', async () => {
    const code: string = `
const tags = ['a', 'b'];
let i = 0;
while (i < 5) {
  tags.includes('x');
  i++;
}`;
    const results: LintResult[] = await lint(preferSetForExistence, code);
    expect(results.length).toBe(1);
  });

  it('passes .includes() outside loop', async () => {
    const code: string = `
const arr = [1, 2, 3];
const has = arr.includes(2);`;
    const results: LintResult[] = await lint(preferSetForExistence, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-repeated-traversal
// =============================================================================

describe('complexity/no-repeated-traversal', () => {
  it('reports separate .filter() + .map() on same array', async () => {
    const code: string = `
const items = [1, 2, 3, 4, 5];
const evens = items.filter(x => x % 2 === 0);
const doubled = items.map(x => x * 2);`;
    const results: LintResult[] = await lint(noRepeatedTraversal, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('items');
    expect(results[0]!.message).toContain('traversed multiple times');
  });

  it('reports .filter() + .forEach() on same array', async () => {
    const code: string = `
const data = [1, 2, 3];
const filtered = data.filter(x => x > 1);
data.forEach(x => console.log(x));`;
    const results: LintResult[] = await lint(noRepeatedTraversal, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('data');
  });

  it('passes .filter() + .map() on different arrays', async () => {
    const code: string = `
const a = [1, 2, 3];
const b = [4, 5, 6];
const filtered = a.filter(x => x > 1);
const mapped = b.map(x => x * 2);`;
    const results: LintResult[] = await lint(noRepeatedTraversal, code);
    expect(results.length).toBe(0);
  });

  it('passes single traversal method on array', async () => {
    const code: string = `
const items = [1, 2, 3];
const evens = items.filter(x => x % 2 === 0);`;
    const results: LintResult[] = await lint(noRepeatedTraversal, code);
    expect(results.length).toBe(0);
  });

  it('passes two .map() calls without .filter()', async () => {
    const code: string = `
const items = [1, 2, 3];
const doubled = items.map(x => x * 2);
const tripled = items.map(x => x * 3);`;
    const results: LintResult[] = await lint(noRepeatedTraversal, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-index-of-in-loop
// =============================================================================

describe('complexity/no-index-of-in-loop', () => {
  it('reports .indexOf() in for loop', async () => {
    const code: string = `
const arr = ['a', 'b', 'c'];
for (let i = 0; i < 10; i++) {
  arr.indexOf('x');
}`;
    const results: LintResult[] = await lint(noIndexOfInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.indexOf()');
    expect(results[0]!.message).toContain('O(n²)');
  });

  it('reports .indexOf() in for-of loop', async () => {
    const code: string = `
const items = [1, 2, 3];
for (const item of items) {
  items.indexOf(item);
}`;
    const results: LintResult[] = await lint(noIndexOfInLoop, code);
    expect(results.length).toBe(1);
  });

  it('reports .indexOf() in while loop', async () => {
    const code: string = `
const arr = [1, 2];
let i = 0;
while (i < 5) {
  arr.indexOf(i);
  i++;
}`;
    const results: LintResult[] = await lint(noIndexOfInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes .indexOf() outside loop', async () => {
    const code: string = `
const arr = [1, 2, 3];
const idx = arr.indexOf(2);`;
    const results: LintResult[] = await lint(noIndexOfInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-spread-in-reduce
// =============================================================================

describe('complexity/no-spread-in-reduce', () => {
  it('reports object spread in .reduce()', async () => {
    const code: string = `
const items = [{ key: 'a', val: 1 }];
const result = items.reduce((acc, item) => ({ ...acc, [item.key]: item.val }), {});`;
    const results: LintResult[] = await lint(noSpreadInReduce, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Spread operator');
    expect(results[0]!.message).toContain('.reduce()');
    expect(results[0]!.message).toContain('O(n²)');
  });

  it('reports array spread in .reduce()', async () => {
    const code: string = `
const items = [[1], [2], [3]];
const flat = items.reduce((acc, item) => [...acc, ...item], []);`;
    const results: LintResult[] = await lint(noSpreadInReduce, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Spread operator');
  });

  it('passes .reduce() without spread', async () => {
    const code: string = `
const items = [1, 2, 3];
const sum = items.reduce((acc, item) => acc + item, 0);`;
    const results: LintResult[] = await lint(noSpreadInReduce, code);
    expect(results.length).toBe(0);
  });

  it('passes non-reduce call', async () => {
    const code: string = `
const items = [1, 2, 3];
const mapped = items.map(x => x * 2);`;
    const results: LintResult[] = await lint(noSpreadInReduce, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-concat-in-loop
// =============================================================================

describe('complexity/no-concat-in-loop', () => {
  it('reports += in for loop', async () => {
    const code: string = `
let result = '';
const items = ['a', 'b', 'c'];
for (let i = 0; i < items.length; i++) {
  result += items[i];
}`;
    const results: LintResult[] = await lint(noConcatInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('String concatenation');
    expect(results[0]!.message).toContain('O(n²)');
  });

  it('reports .concat() in for-of loop', async () => {
    const code: string = `
let str = '';
for (const ch of ['a', 'b', 'c']) {
  str = str.concat(ch);
}`;
    const results: LintResult[] = await lint(noConcatInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('String concatenation');
  });

  it('reports both += and .concat() in same loop', async () => {
    const code: string = `
let a = '';
let b = '';
for (const ch of ['x', 'y']) {
  a += ch;
  b = b.concat(ch);
}`;
    const results: LintResult[] = await lint(noConcatInLoop, code);
    expect(results.length).toBe(2);
  });

  it('reports += in while loop', async () => {
    const code: string = `
let s = '';
let i = 0;
while (i < 5) {
  s += 'x';
  i++;
}`;
    const results: LintResult[] = await lint(noConcatInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes concatenation outside loop', async () => {
    const code: string = `
let result = 'hello';
result += ' world';`;
    const results: LintResult[] = await lint(noConcatInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-dom-query-in-loop
// =============================================================================

describe('complexity/no-dom-query-in-loop', () => {
  it('reports document.querySelector in for loop', async () => {
    const code: string = `
for (let i = 0; i < 10; i++) {
  document.querySelector('.item');
}`;
    const results: LintResult[] = await lint(noDomQueryInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('DOM query inside loop');
  });

  it('reports document.getElementById in for-of loop', async () => {
    const code: string = `
const ids = ['a', 'b', 'c'];
for (const id of ids) {
  document.getElementById(id);
}`;
    const results: LintResult[] = await lint(noDomQueryInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('DOM query inside loop');
  });

  it('reports document.querySelectorAll in while loop', async () => {
    const code: string = `
let i = 0;
while (i < 3) {
  document.querySelectorAll('div');
  i++;
}`;
    const results: LintResult[] = await lint(noDomQueryInLoop, code);
    expect(results.length).toBe(1);
  });

  it('reports document.getElementsByClassName in loop', async () => {
    const code: string = `
for (let i = 0; i < 5; i++) {
  document.getElementsByClassName('btn');
}`;
    const results: LintResult[] = await lint(noDomQueryInLoop, code);
    expect(results.length).toBe(1);
  });

  it('reports document.getElementsByTagName in loop', async () => {
    const code: string = `
for (let i = 0; i < 5; i++) {
  document.getElementsByTagName('div');
}`;
    const results: LintResult[] = await lint(noDomQueryInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes DOM query outside loop', async () => {
    const code: string = `
const el = document.querySelector('.item');
console.log(el);`;
    const results: LintResult[] = await lint(noDomQueryInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-regex-in-loop
// =============================================================================

describe('complexity/no-regex-in-loop', () => {
  it('reports new RegExp() in for loop', async () => {
    const code: string = `
for (let i = 0; i < 10; i++) {
  const re = new RegExp('pattern' + i);
  re.test('test');
}`;
    const results: LintResult[] = await lint(noRegexInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('new RegExp()');
    expect(results[0]!.message).toContain('recompiles');
  });

  it('reports new RegExp() in for-of loop', async () => {
    const code: string = `
const patterns = ['a', 'b'];
for (const p of patterns) {
  const re = new RegExp(p);
}`;
    const results: LintResult[] = await lint(noRegexInLoop, code);
    expect(results.length).toBe(1);
  });

  it('reports new RegExp() in while loop', async () => {
    const code: string = `
let i = 0;
while (i < 5) {
  new RegExp('test');
  i++;
}`;
    const results: LintResult[] = await lint(noRegexInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes new RegExp() outside loop', async () => {
    const code: string = `
const re = new RegExp('pattern');
re.test('test');`;
    const results: LintResult[] = await lint(noRegexInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-sort-in-loop
// =============================================================================

describe('complexity/no-sort-in-loop', () => {
  it('reports .sort() in for loop', async () => {
    const code: string = `
const arr = [3, 1, 2];
for (let i = 0; i < 10; i++) {
  arr.sort();
}`;
    const results: LintResult[] = await lint(noSortInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.sort()');
    expect(results[0]!.message).toContain('O(n² log n)');
  });

  it('reports .sort() in for-of loop', async () => {
    const code: string = `
const data = [5, 3, 1];
for (const x of [1, 2]) {
  data.sort((a, b) => a - b);
}`;
    const results: LintResult[] = await lint(noSortInLoop, code);
    expect(results.length).toBe(1);
  });

  it('reports .sort() in while loop', async () => {
    const code: string = `
const arr = [2, 1];
let i = 0;
while (i < 3) {
  arr.sort();
  i++;
}`;
    const results: LintResult[] = await lint(noSortInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes .sort() outside loop', async () => {
    const code: string = `
const arr = [3, 1, 2];
arr.sort();`;
    const results: LintResult[] = await lint(noSortInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-json-parse-in-loop
// =============================================================================

describe('complexity/no-json-parse-in-loop', () => {
  it('reports JSON.parse() in for loop', async () => {
    const code: string = `
const str = '{"a":1}';
for (let i = 0; i < 10; i++) {
  JSON.parse(str);
}`;
    const results: LintResult[] = await lint(noJsonParseInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('JSON.parse()');
  });

  it('reports JSON.stringify() in for-of loop', async () => {
    const code: string = `
const obj = { a: 1 };
for (const x of [1, 2]) {
  JSON.stringify(obj);
}`;
    const results: LintResult[] = await lint(noJsonParseInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('JSON.stringify()');
  });

  it('reports both JSON.parse and JSON.stringify in same loop', async () => {
    const code: string = `
for (let i = 0; i < 5; i++) {
  const obj = JSON.parse('{}');
  JSON.stringify(obj);
}`;
    const results: LintResult[] = await lint(noJsonParseInLoop, code);
    expect(results.length).toBe(2);
  });

  it('reports JSON.parse() in while loop', async () => {
    const code: string = `
let i = 0;
while (i < 3) {
  JSON.parse('[]');
  i++;
}`;
    const results: LintResult[] = await lint(noJsonParseInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes JSON.parse() outside loop', async () => {
    const code: string = `
const data = JSON.parse('{"a":1}');
console.log(data);`;
    const results: LintResult[] = await lint(noJsonParseInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-await-in-loop
// =============================================================================

describe('complexity/no-await-in-loop', () => {
  it('reports await in for loop', async () => {
    const code: string = `
async function fetchAll(urls: string[]) {
  for (let i = 0; i < urls.length; i++) {
    await fetch(urls[i]);
  }
}`;
    const results: LintResult[] = await lint(noAwaitInLoop, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('await inside loop');
    expect(results[0]!.message).toContain('Promise.all()');
  });

  it('reports await in for-of loop', async () => {
    const code: string = `
async function process(items: string[]) {
  for (const item of items) {
    await processItem(item);
  }
}`;
    const results: LintResult[] = await lint(noAwaitInLoop, code);
    expect(results.length).toBe(1);
  });

  it('reports await in while loop', async () => {
    const code: string = `
async function poll() {
  let done = false;
  while (!done) {
    const result = await check();
    done = result.done;
  }
}`;
    const results: LintResult[] = await lint(noAwaitInLoop, code);
    expect(results.length).toBe(1);
  });

  it('passes await outside loop', async () => {
    const code: string = `
async function load() {
  const data = await fetch('/api');
  return data;
}`;
    const results: LintResult[] = await lint(noAwaitInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/no-filter-map-chain
// =============================================================================

describe('complexity/no-filter-map-chain', () => {
  it('reports .filter().map() chain', async () => {
    const code: string = `
const items = [1, 2, 3, 4, 5];
const result = items.filter(x => x > 2).map(x => x * 2);`;
    const results: LintResult[] = await lint(noFilterMapChain, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.filter().map()');
    expect(results[0]!.message).toContain('traverses the array twice');
  });

  it('passes .filter() alone', async () => {
    const code: string = `
const items = [1, 2, 3];
const filtered = items.filter(x => x > 1);`;
    const results: LintResult[] = await lint(noFilterMapChain, code);
    expect(results.length).toBe(0);
  });

  it('passes .map() alone', async () => {
    const code: string = `
const items = [1, 2, 3];
const mapped = items.map(x => x * 2);`;
    const results: LintResult[] = await lint(noFilterMapChain, code);
    expect(results.length).toBe(0);
  });

  it('passes .map() on non-filter call', async () => {
    const code: string = `
const items = [1, 2, 3];
const result = items.sort().map(x => x * 2);`;
    const results: LintResult[] = await lint(noFilterMapChain, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/array-size-warning
// =============================================================================

describe('complexity/array-size-warning', () => {
  it('reports .push() in while(true)', async () => {
    const code: string = `
const items: number[] = [];
while (true) {
  items.push(Math.random());
}`;
    const results: LintResult[] = await lint(arraySizeWarning, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Unbounded .push()');
    expect(results[0]!.message).toContain('while(true)');
  });

  it('passes while with condition (not while(true))', async () => {
    const code: string = `
const items: number[] = [];
let i = 0;
while (i < 10) {
  items.push(i);
  i++;
}`;
    const results: LintResult[] = await lint(arraySizeWarning, code);
    expect(results.length).toBe(0);
  });

  it('passes while(true) without .push()', async () => {
    const code: string = `
while (true) {
  const x = Math.random();
  if (x > 0.9) {
    break;
  }
}`;
    const results: LintResult[] = await lint(arraySizeWarning, code);
    expect(results.length).toBe(0);
  });

  it('passes for loop with .push()', async () => {
    const code: string = `
const items: number[] = [];
for (let i = 0; i < 10; i++) {
  items.push(i);
}`;
    const results: LintResult[] = await lint(arraySizeWarning, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// complexity/recursive-depth
// =============================================================================

describe('complexity/recursive-depth', () => {
  it('reports recursive function without depth parameter', async () => {
    const code: string = `
function traverse(node: any) {
  if (!node) {
    return;
  }
  traverse(node.left);
  traverse(node.right);
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('traverse');
    expect(results[0]!.message).toContain('no depth limit');
  });

  it('passes recursive function with depth parameter', async () => {
    const code: string = `
function traverse(node: any, depth = 0) {
  if (!node || depth > 100) {
    return;
  }
  traverse(node.left, depth + 1);
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });

  it('passes recursive function with limit parameter', async () => {
    const code: string = `
function walk(node: any, limit = 50) {
  if (!node || limit <= 0) {
    return;
  }
  walk(node.child, limit - 1);
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });

  it('passes recursive function with maxDepth parameter', async () => {
    const code: string = `
function search(node: any, maxDepth = 10) {
  if (!node || maxDepth <= 0) {
    return;
  }
  search(node.next, maxDepth - 1);
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });

  it('passes recursive function with level parameter', async () => {
    const code: string = `
function recurse(node: any, level = 0) {
  if (!node || level > 20) {
    return;
  }
  recurse(node.child, level + 1);
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });

  it('passes recursive function with max parameter', async () => {
    const code: string = `
function dig(node: any, max = 100) {
  if (!node || max <= 0) {
    return;
  }
  dig(node.child, max - 1);
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });

  it('passes non-recursive function', async () => {
    const code: string = `
function add(a: number, b: number) {
  return a + b;
}`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });

  it('passes anonymous function (no id)', async () => {
    const code: string = `
const x = 1;
const y = 2;
console.log(x + y);`;
    const results: LintResult[] = await lint(recursiveDepth, code);
    expect(results.length).toBe(0);
  });
});
