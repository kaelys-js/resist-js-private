/**
 * Tests for rule context utilities.
 *
 * @module
 */

import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getAllFiles,
  readFileContent,
  fileExists,
  dirExists,
  getWorkspacePackages,
  search,
  createWorkspaceContext,
  parseExcludes,
  type ExcludeConfig,
  type WorkspaceContext,
} from './rule-context.ts';

// =============================================================================
// Constants
// =============================================================================

/** Root of the workspace (monorepo root). */
const WORKSPACE_ROOT: string = join(import.meta.dirname, '..', '..', '..', '..', '..', '..', '..');

/** Directory containing this file (for relative test paths). */
const THIS_DIR: string = import.meta.dirname;

// =============================================================================
// getAllFiles
// =============================================================================

describe('getAllFiles', () => {
  it('yields files from a directory', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles(THIS_DIR)) {
      files.push(file);
    }
    expect(files.length).toBeGreaterThan(0);
  });

  it('includes .ts files', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles(THIS_DIR)) {
      files.push(file);
    }
    const tsFiles: string[] = files.filter((f: string): boolean => f.endsWith('.ts'));
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  it('returns empty for non-existent directory', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles('/non/existent/path')) {
      files.push(file);
    }
    expect(files).toEqual([]);
  });

  it('skips node_modules', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles(WORKSPACE_ROOT)) {
      files.push(file);
      /* Early exit to avoid scanning the entire monorepo */
      if (files.length > 100) {
        break;
      }
    }
    const nodeModulesFiles: string[] = files.filter((f: string): boolean =>
      f.includes('node_modules'),
    );
    expect(nodeModulesFiles).toEqual([]);
  });
});

// =============================================================================
// readFileContent
// =============================================================================

describe('readFileContent', () => {
  it('reads a file successfully', async () => {
    const content: string = await readFileContent(join(THIS_DIR, 'rule-context.ts'));
    expect(content).toContain('createWorkspaceContext');
  });

  it('throws for non-existent file', async () => {
    await expect(readFileContent('/non/existent/file.ts')).rejects.toThrow();
  });
});

// =============================================================================
// fileExists / dirExists
// =============================================================================

describe('fileExists', () => {
  it('returns true for existing file', async () => {
    expect(await fileExists(join(THIS_DIR, 'rule-context.ts'))).toBe(true);
  });

  it('returns false for non-existent file', async () => {
    expect(await fileExists('/non/existent/file.ts')).toBe(false);
  });

  it('returns false for a directory', async () => {
    expect(await fileExists(THIS_DIR)).toBe(false);
  });
});

describe('dirExists', () => {
  it('returns true for existing directory', async () => {
    expect(await dirExists(THIS_DIR)).toBe(true);
  });

  it('returns false for non-existent directory', async () => {
    expect(await dirExists('/non/existent/dir')).toBe(false);
  });

  it('returns false for a file', async () => {
    expect(await dirExists(join(THIS_DIR, 'rule-context.ts'))).toBe(false);
  });
});

// =============================================================================
// getWorkspacePackages
// =============================================================================

describe('getWorkspacePackages', () => {
  it('finds packages from workspace root', async () => {
    const packages = await getWorkspacePackages(WORKSPACE_ROOT);
    expect(packages.length).toBeGreaterThan(0);
  });

  it('each package has required fields', async () => {
    const packages = await getWorkspacePackages(WORKSPACE_ROOT);
    for (const pkg of packages) {
      expect(typeof pkg.path).toBe('string');
      expect(typeof pkg.dir).toBe('string');
      expect(typeof pkg.packageJson).toBe('object');
      expect(pkg.path).toContain('package.json');
    }
  });

  it('returns empty for directory without pnpm-workspace.yaml', async () => {
    const packages = await getWorkspacePackages(THIS_DIR);
    expect(packages).toEqual([]);
  });
});

// =============================================================================
// search
// =============================================================================

function mockReaderWithContent(content: string): () => Promise<string> {
  /* eslint-disable-next-line require-await -- returns a Promise for the search() interface */
  return (): Promise<string> => {
    const deferred: Promise<string> = new Promise<string>((resolve: (v: string) => void): void => {
      resolve(content);
    });
    return deferred;
  };
}

function* mockFileList(path: string): Iterable<string> {
  yield path;
}

/**
 * Async generator yielding two synthetic mock file paths.
 *
 * @yields Two mock file paths under `/mock/`
 */
async function* twoMockFiles(): AsyncIterable<string> {
  yield '/mock/file1.ts';
  yield '/mock/file2.ts';
}

async function* toAsyncIterable(path: string): AsyncIterable<string> {
  for (const p of mockFileList(path)) {
    yield p;
  }
}

describe('search', () => {
  it('finds pattern matches in files', async () => {
    async function* singleFile(): AsyncIterable<string> {
      yield join(THIS_DIR, 'rule-context.ts');
    }

    const matches: Array<{ file: string; line: number; match: string }> = [];
    for await (const m of search(/createWorkspaceContext/, singleFile())) {
      matches.push(m);
    }
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.match).toBe('createWorkspaceContext');
  });

  it('returns correct line and column', async () => {
    const reader = mockReaderWithContent('line one\nfoo bar baz\nline three');

    const matches: Array<{ line: number; column: number; match: string }> = [];
    for await (const m of search(/bar/, toAsyncIterable('/mock/file.ts'), reader)) {
      matches.push(m);
    }
    expect(matches.length).toBe(1);
    expect(matches[0]?.line).toBe(2);
    expect(matches[0]?.column).toBe(5);
    expect(matches[0]?.match).toBe('bar');
  });

  it('yields nothing for no matches', async () => {
    const reader = mockReaderWithContent('no match here');

    const matches: unknown[] = [];
    for await (const m of search(
      /NONEXISTENT_PATTERN_XYZ/,
      toAsyncIterable('/mock/file.ts'),
      reader,
    )) {
      matches.push(m);
    }
    expect(matches).toEqual([]);
  });
});

// =============================================================================
// createWorkspaceContext
// =============================================================================

describe('createWorkspaceContext', () => {
  it('returns a valid context object', () => {
    const ctx: WorkspaceContext = createWorkspaceContext(WORKSPACE_ROOT);
    expect(ctx.rootDir).toBe(WORKSPACE_ROOT);
    expect(typeof ctx.allFiles).toBe('function');
    expect(typeof ctx.readFile).toBe('function');
    expect(typeof ctx.fileExists).toBe('function');
    expect(typeof ctx.dirExists).toBe('function');
    expect(typeof ctx.getWorkspacePackages).toBe('function');
  });

  it('allFiles() returns a promise resolving to a file array', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const files: readonly string[] = await ctx.allFiles();
    expect(files.length).toBeGreaterThan(0);
  });

  it('readFile reads a file', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(WORKSPACE_ROOT);
    const content: string = await ctx.readFile(join(THIS_DIR, 'rule-context.ts'));
    expect(content).toContain('WorkspaceContext');
  });

  it('fileExists checks file existence', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(WORKSPACE_ROOT);
    expect(await ctx.fileExists(join(THIS_DIR, 'rule-context.ts'))).toBe(true);
    expect(await ctx.fileExists('/non/existent')).toBe(false);
  });

  it('dirExists checks directory existence', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(WORKSPACE_ROOT);
    expect(await ctx.dirExists(THIS_DIR)).toBe(true);
    expect(await ctx.dirExists('/non/existent')).toBe(false);
  });

  it('getWorkspacePackages returns packages', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(WORKSPACE_ROOT);
    const packages = await ctx.getWorkspacePackages();
    expect(packages.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// search — error handling
// =============================================================================

describe('search — error handling', () => {
  it('skips files when reader throws an error', async () => {
    let callCount: number = 0;
    const failReader = async (_path: string): Promise<string> => {
      await Promise.resolve();
      callCount++;
      throw new Error('file read failed');
    };

    const matches: unknown[] = [];
    for await (const m of search(/test/, toAsyncIterable('/mock/file.ts'), failReader)) {
      matches.push(m);
    }
    expect(matches).toEqual([]);
    expect(callCount).toBe(1);
  });

  it('continues searching other files after one fails', async () => {
    let callIndex: number = 0;
    const mixedReader = async (_path: string): Promise<string> => {
      await Promise.resolve();
      callIndex++;
      if (callIndex === 1) {
        throw new Error('first file fails');
      }
      return 'findme here';
    };

    const matches: Array<{ file: string }> = [];
    for await (const m of search(/findme/, twoMockFiles(), mixedReader)) {
      matches.push(m);
    }
    expect(matches.length).toBe(1);
    expect(matches[0]?.file).toBe('/mock/file2.ts');
  });
});

// =============================================================================
// search — global regex handling
// =============================================================================

describe('search — regex handling', () => {
  it('handles a global regex pattern without issues', async () => {
    const reader = mockReaderWithContent('foo bar foo\nfoo again');

    const matches: Array<{ line: number; match: string }> = [];
    for await (const m of search(/foo/g, toAsyncIterable('/mock/file.ts'), reader)) {
      matches.push(m);
    }
    // Each line should produce at most one match (regex 'g' flag is stripped)
    expect(matches.length).toBe(2);
    expect(matches[0]?.line).toBe(1);
    expect(matches[1]?.line).toBe(2);
  });

  it('handles regex with no match index gracefully', async () => {
    const reader = mockReaderWithContent('hello world');

    const matches: Array<{ column: number }> = [];
    for await (const m of search(/hello/, toAsyncIterable('/mock/file.ts'), reader)) {
      matches.push(m);
    }
    expect(matches.length).toBe(1);
    expect(matches[0]?.column).toBe(1);
  });
});

// =============================================================================
// getAllFiles — directory skipping
// =============================================================================

describe('getAllFiles — directory skipping', () => {
  it('skips .git directories', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles(WORKSPACE_ROOT)) {
      files.push(file);
      if (files.length > 200) {
        break;
      }
    }
    const gitFiles: string[] = files.filter((f: string): boolean => f.includes('/.git/'));
    expect(gitFiles).toEqual([]);
  });

  it('skips dist directories', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles(WORKSPACE_ROOT)) {
      files.push(file);
      if (files.length > 200) {
        break;
      }
    }
    const distFiles: string[] = files.filter((f: string): boolean => f.includes('/dist/'));
    expect(distFiles).toEqual([]);
  });
});

// =============================================================================
// getWorkspacePackages — edge cases
// =============================================================================

describe('getWorkspacePackages — edge cases', () => {
  it('packages have name when package.json has a name field', async () => {
    const packages = await getWorkspacePackages(WORKSPACE_ROOT);
    const namedPackages = packages.filter((p) => p.name !== undefined);
    expect(namedPackages.length).toBeGreaterThan(0);
    for (const pkg of namedPackages) {
      expect(typeof pkg.name).toBe('string');
      expect(pkg.name!.length).toBeGreaterThan(0);
    }
  });

  it('packages have dir pointing to the package directory', async () => {
    const packages = await getWorkspacePackages(WORKSPACE_ROOT);
    for (const pkg of packages) {
      expect(pkg.path).toBe(join(pkg.dir, 'package.json'));
    }
  });
});

// =============================================================================
// search — multiple matches on different lines
// =============================================================================

describe('search — multi-line content', () => {
  it('returns matches from multiple lines with correct positions', async () => {
    const reader = mockReaderWithContent('alpha\nbeta\ngamma\nbeta again');

    const matches: Array<{ line: number; column: number; match: string; text: string }> = [];
    for await (const m of search(/beta/, toAsyncIterable('/mock/file.ts'), reader)) {
      matches.push(m);
    }
    expect(matches.length).toBe(2);
    expect(matches[0]?.line).toBe(2);
    expect(matches[0]?.column).toBe(1);
    expect(matches[1]?.line).toBe(4);
    expect(matches[1]?.column).toBe(1);
  });

  it('includes the full line text in match result', async () => {
    const reader = mockReaderWithContent('first line\nsecond target line\nthird line');

    const matches: Array<{ text: string }> = [];
    for await (const m of search(/target/, toAsyncIterable('/mock/file.ts'), reader)) {
      matches.push(m);
    }
    expect(matches.length).toBe(1);
    expect(matches[0]?.text).toBe('second target line');
  });
});

// =============================================================================
// parseExcludes
// =============================================================================

describe('parseExcludes', () => {
  it('splits name-based and path-based entries', () => {
    const result: ExcludeConfig = parseExcludes([
      '_INTEGRATE',
      'node_modules',
      'packages/shared/utils/cli',
    ]);
    expect(result.names.has('_INTEGRATE')).toBe(true);
    expect(result.names.has('node_modules')).toBe(true);
    expect(result.paths).toEqual(['packages/shared/utils/cli']);
  });

  it('returns empty sets for empty input', () => {
    const result: ExcludeConfig = parseExcludes([]);
    expect(result.names.size).toBe(0);
    expect(result.paths.length).toBe(0);
  });

  it('treats entries with slashes as path-based', () => {
    const result: ExcludeConfig = parseExcludes(['a/b', 'c/d/e']);
    expect(result.names.size).toBe(0);
    expect(result.paths).toEqual(['a/b', 'c/d/e']);
  });

  it('treats entries without slashes as name-based', () => {
    const result: ExcludeConfig = parseExcludes(['foo', 'bar']);
    expect(result.names.has('foo')).toBe(true);
    expect(result.names.has('bar')).toBe(true);
    expect(result.paths.length).toBe(0);
  });
});

// =============================================================================
// getAllFiles — ExcludeConfig support
// =============================================================================

describe('getAllFiles — ExcludeConfig', () => {
  it('skips directories matching name-based excludes', async () => {
    const excludes: ExcludeConfig = parseExcludes(['rules']);
    const files: string[] = [];
    const lintSrcDir: string = join(THIS_DIR, '..');
    for await (const file of getAllFiles(lintSrcDir, excludes)) {
      files.push(file);
    }
    const rulesFiles: string[] = files.filter((f: string): boolean => f.includes('/rules/'));
    expect(rulesFiles).toEqual([]);
    expect(files.length).toBeGreaterThan(0);
  });

  it('skips directories matching path-based excludes', async () => {
    const lintSrcDir: string = join(THIS_DIR, '..');
    const excludes: ExcludeConfig = parseExcludes(['rules/workspace']);
    const files: string[] = [];
    for await (const file of getAllFiles(lintSrcDir, excludes, lintSrcDir)) {
      files.push(file);
    }
    const workspaceRuleFiles: string[] = files.filter((f: string): boolean =>
      f.includes('/rules/workspace/'),
    );
    expect(workspaceRuleFiles).toEqual([]);
    /* Other rules subdirectories should still be present */
    const otherRuleFiles: string[] = files.filter((f: string): boolean => f.includes('/rules/'));
    expect(otherRuleFiles.length).toBeGreaterThan(0);
  });

  it('still skips hardcoded SKIP_DIRS even without excludes', async () => {
    const files: string[] = [];
    for await (const file of getAllFiles(WORKSPACE_ROOT, undefined)) {
      files.push(file);
      if (files.length > 200) {
        break;
      }
    }
    const nodeModulesFiles: string[] = files.filter((f: string): boolean =>
      f.includes('node_modules'),
    );
    expect(nodeModulesFiles).toEqual([]);
  });
});

// =============================================================================
// createWorkspaceContext — exclude parameter
// =============================================================================

describe('createWorkspaceContext — allFiles caching', () => {
  it('returns identical results on multiple calls', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);

    const first: readonly string[] = await ctx.allFiles();
    const second: readonly string[] = await ctx.allFiles();

    expect(first.length).toBeGreaterThan(0);
    expect(second).toBe(first);
  });

  it('concurrent calls return the same array reference', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);

    const [a, b, c]: [readonly string[], readonly string[], readonly string[]] = await Promise.all([
      ctx.allFiles(),
      ctx.allFiles(),
      ctx.allFiles(),
    ]);

    expect(a.length).toBeGreaterThan(0);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
});

describe('createWorkspaceContext — readFile caching', () => {
  it('returns identical content on repeated reads of the same file', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const path: string = join(THIS_DIR, 'rule-context.ts');
    const first: string = await ctx.readFile(path);
    const second: string = await ctx.readFile(path);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });
});

describe('createWorkspaceContext — filesByExtension', () => {
  it('returns only files matching the given extension', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');
    expect(tsFiles.length).toBeGreaterThan(0);
    for (const f of tsFiles) {
      expect(f.endsWith('.ts')).toBe(true);
    }
  });

  it('returns files matching multiple extensions', async () => {
    const lintSrcDir: string = join(THIS_DIR, '..');
    const ctx: WorkspaceContext = createWorkspaceContext(lintSrcDir);
    const files: readonly string[] = await ctx.filesByExtension('.ts', '.json');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.endsWith('.ts') || f.endsWith('.json')).toBe(true);
    }
  });

  it('returns empty array when no files match', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const files: readonly string[] = await ctx.filesByExtension('.xyz999');
    expect(files).toEqual([]);
  });

  it('caches results — same reference on repeated calls', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const first: readonly string[] = await ctx.filesByExtension('.ts');
    const second: readonly string[] = await ctx.filesByExtension('.ts');
    expect(first).toBe(second);
  });

  it('caches independently per extension set', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');
    const jsonFiles: readonly string[] = await ctx.filesByExtension('.json');
    expect(tsFiles).not.toBe(jsonFiles);
  });

  it('returns same cache regardless of extension argument order', async () => {
    const lintSrcDir: string = join(THIS_DIR, '..');
    const ctx: WorkspaceContext = createWorkspaceContext(lintSrcDir);
    const a: readonly string[] = await ctx.filesByExtension('.ts', '.json');
    const b: readonly string[] = await ctx.filesByExtension('.json', '.ts');
    expect(a).toBe(b);
  });

  it('is a subset of allFiles', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const all: readonly string[] = await ctx.allFiles();
    const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');
    for (const f of tsFiles) {
      expect(all).toContain(f);
    }
  });
});

describe('createWorkspaceContext — exclude', () => {
  it('accepts exclude parameter and filters allFiles accordingly', async () => {
    const lintSrcDir: string = join(THIS_DIR, '..');
    const ctx: WorkspaceContext = createWorkspaceContext(lintSrcDir, ['rules']);
    const files: readonly string[] = await ctx.allFiles();
    const rulesFiles: string[] = files.filter((f: string): boolean => f.includes('/rules/'));
    expect(rulesFiles).toEqual([]);
    expect(files.length).toBeGreaterThan(0);
  });

  it('without exclude, allFiles includes all directories', async () => {
    const lintSrcDir: string = join(THIS_DIR, '..');
    const ctx: WorkspaceContext = createWorkspaceContext(lintSrcDir);
    const files: readonly string[] = await ctx.allFiles();
    const rulesFiles: string[] = files.filter((f: string): boolean => f.includes('/rules/'));
    expect(rulesFiles.length).toBeGreaterThan(0);
  });
});
