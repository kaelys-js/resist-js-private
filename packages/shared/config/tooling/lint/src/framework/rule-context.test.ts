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

  it('allFiles() returns an async iterable', async () => {
    const ctx: WorkspaceContext = createWorkspaceContext(THIS_DIR);
    const files: string[] = [];
    for await (const file of ctx.allFiles()) {
      files.push(file);
    }
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
});
