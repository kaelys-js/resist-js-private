/**
 * Tests for the changelog API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import { GET } from './+server';
import type * as ServerModule from './+server';
import type * as NodeFsModule from 'node:fs';

type ChangelogEntry = {
  hash: Str;
  message: Str;
  body: Str;
  date: Str;
  author: Str;
};

type ChangelogResponse = {
  entries: ChangelogEntry[];
  total: Num;
  repoUrl: Str;
  componentPath: Str;
  diffAnchor: Str;
};

describe('GET /api/lens/changelog/[name]', () => {
  it('returns JSON with entries array for known component', async () => {
    const response: Response = await GET({ params: { name: 'button' } } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body: ChangelogResponse = await response.json();
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBeGreaterThan(0);
  });

  it('entries have hash, message, date, author fields', async () => {
    const response: Response = await GET({ params: { name: 'button' } } as never);
    const body: ChangelogResponse = await response.json();
    const first = body.entries[0]!;

    expect(first.hash).toBeTruthy();
    expect(first.message).toBeTruthy();
    expect(first.date).toBeTruthy();
    expect(first.author).toBeTruthy();
  });

  it('returns empty entries for nonexistent component', async () => {
    const response: Response = await GET({
      params: { name: 'nonexistent-component-xyz' },
    } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns empty array when name param is empty', async () => {
    const response: Response = await GET({ params: { name: '' } } as never);
    const body: unknown[] = await response.json();
    expect(body).toEqual([]);
  });

  it('includes repoUrl, componentPath, and diffAnchor in response', async () => {
    const response: Response = await GET({ params: { name: 'button' } } as never);
    const body: ChangelogResponse = await response.json();

    expect(typeof body.repoUrl).toBe('string');
    expect(body.componentPath).toBe('packages/shared/ui/src/button');
    expect(typeof body.diffAnchor).toBe('string');
  });

  it('caps entries at MAX_ENTRIES (100)', async () => {
    const response: Response = await GET({ params: { name: 'button' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries.length).toBeLessThanOrEqual(100);
  });

  it('caches repeated calls for the same component', async () => {
    // First call populates cache; second must return same entries array ref-equal contents.
    const resp1 = await GET({ params: { name: 'button' } } as never);
    const r1: ChangelogResponse = await resp1.json();
    const resp2 = await GET({ params: { name: 'button' } } as never);
    const r2: ChangelogResponse = await resp2.json();
    expect(r2.entries).toEqual(r1.entries);
    expect(r2.total).toBe(r1.total);
  });

  it('params.name undefined coerces to empty and returns []', async () => {
    const response: Response = await GET({ params: {} } as never);
    const body: unknown = await response.json();
    expect(body).toEqual([]);
  });
});

/* -----------------------------------------------------------------------------
 * Mocked branches — exercise code paths not reachable with the live git repo.
 * Uses vi.resetModules + dynamic import so each test gets a fresh module with
 * its own caches, and injected mocks for node:child_process / node:fs.
 * -------------------------------------------------------------------------- */
describe('changelog handler — mocked branches', () => {
  type LoadedModule = typeof ServerModule;

  async function loadWithMocks(opts: {
    execSyncImpl: (cmd: string, _opts?: unknown) => string;
    statSyncImpl?: (path: string) => void;
    readdirSyncImpl?: (path: string) => string[];
  }): Promise<LoadedModule> {
    vi.resetModules();
    vi.doMock('node:child_process', () => ({
      execSync: opts.execSyncImpl,
    }));
    if (opts.statSyncImpl !== undefined || opts.readdirSyncImpl !== undefined) {
      vi.doMock('node:fs', async () => {
        const actual = await vi.importActual<typeof NodeFsModule>('node:fs');
        return {
          ...actual,
          statSync: opts.statSyncImpl ?? actual.statSync,
          readdirSync: opts.readdirSyncImpl ?? actual.readdirSync,
        };
      });
    }
    return (await import('./+server')) as LoadedModule;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('node:child_process');
    vi.doUnmock('node:fs');
    vi.resetModules();
  });

  it('parses SSH remote (git@github.com:org/repo.git) into https URL', async () => {
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd === 'git remote get-url origin') {
          return 'git@github.com:acme/widgets.git\n';
        }
        return '';
      },
      statSyncImpl: (): void => {
        throw new Error('ENOENT');
      },
    });
    const response = await mod.GET({ params: { name: 'x' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.repoUrl).toBe('https://github.com/acme/widgets');
  });

  it('parses HTTPS remote and strips .git suffix', async () => {
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/acme/widgets.git\n';
        }
        return '';
      },
      statSyncImpl: (): void => {
        throw new Error('ENOENT');
      },
    });
    const response = await mod.GET({ params: { name: 'x' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.repoUrl).toBe('https://github.com/acme/widgets');
  });

  it('returns empty repoUrl when git remote execSync throws', async () => {
    const mod = await loadWithMocks({
      execSyncImpl: (): string => {
        throw new Error('no git');
      },
      statSyncImpl: (): void => {
        throw new Error('ENOENT');
      },
    });
    const response = await mod.GET({ params: { name: 'x' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.repoUrl).toBe('');
  });

  it('caches repoUrl after first detection (no second execSync call)', async () => {
    let remoteCallCount = 0;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd === 'git remote get-url origin') {
          remoteCallCount++;
          return 'git@github.com:a/b.git\n';
        }
        return '';
      },
      statSyncImpl: (): void => {
        throw new Error('ENOENT');
      },
    });
    mod.GET({ params: { name: 'x' } } as never);
    mod.GET({ params: { name: 'y' } } as never);
    expect(remoteCallCount).toBe(1);
  });

  it('returns empty entries when componentDir statSync throws', async () => {
    const mod = await loadWithMocks({
      execSyncImpl: (): string => 'https://github.com/a/b\n',
      statSyncImpl: (): void => {
        throw new Error('ENOENT');
      },
    });
    const response = await mod.GET({ params: { name: 'ghost' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns empty entries when git log produces empty output', async () => {
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return '';
        }
        if (cmd.startsWith('git rev-list')) {
          return '0';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b\n';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
    });
    const response = await mod.GET({ params: { name: 'empty' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toEqual([]);
  });

  it('parses git log output with FIELD_SEP + RECORD_SEP correctly', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const record = `abc123${FS}Initial${FS}body text${FS}2026-04-01T00:00:00Z${FS}Jane Doe${RS}`;
    const second = `def456${FS}Follow-up${FS}${FS}2026-04-02T00:00:00Z${FS}John${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return record + second;
        }
        if (cmd.startsWith('git rev-list')) {
          return '42\n';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b\n';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => [],
    });
    const response = await mod.GET({ params: { name: 'c' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0]).toEqual({
      hash: 'abc123',
      message: 'Initial',
      body: 'body text',
      date: '2026-04-01T00:00:00Z',
      author: 'Jane Doe',
    });
    expect(body.entries[1]!.body).toBe('');
    expect(body.total).toBe(42);
  });

  it('filters malformed records with fewer than 5 fields', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const good = `abc${FS}msg${FS}body${FS}2026-01-01T00:00:00Z${FS}A${RS}`;
    const bad = `xyz${FS}only-two${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return good + bad;
        }
        if (cmd.startsWith('git rev-list')) {
          return '1';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => [],
    });
    const response = await mod.GET({ params: { name: 'c' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]!.hash).toBe('abc');
  });

  it('returns empty entries when git log throws', async () => {
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          throw new Error('git log failed');
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
    });
    const response = await mod.GET({ params: { name: 'c' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('countTotalCommits returns 0 when git rev-list throws', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const good = `abc${FS}msg${FS}body${FS}2026-01-01T00:00:00Z${FS}A${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return good;
        }
        if (cmd.startsWith('git rev-list')) {
          throw new Error('count failed');
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => [],
    });
    const response = await mod.GET({ params: { name: 'c' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.total).toBe(0);
  });

  it('computeDiffAnchor returns empty string when readdirSync throws', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const good = `abc${FS}m${FS}${FS}2026-01-01T00:00:00Z${FS}A${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return good;
        }
        if (cmd.startsWith('git rev-list')) {
          return '1';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => {
        throw new Error('EACCES');
      },
    });
    const response = await mod.GET({ params: { name: 'c' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.diffAnchor).toBe('');
  });

  it('computeDiffAnchor returns empty when directory has no .svelte files', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const good = `abc${FS}m${FS}${FS}2026-01-01T00:00:00Z${FS}A${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return good;
        }
        if (cmd.startsWith('git rev-list')) {
          return '1';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => ['index.ts', 'README.md'],
    });
    const response = await mod.GET({ params: { name: 'c' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.diffAnchor).toBe('');
  });

  it('computeDiffAnchor hashes Pascal-name primary file when present', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const good = `abc${FS}m${FS}${FS}2026-01-01T00:00:00Z${FS}A${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return good;
        }
        if (cmd.startsWith('git rev-list')) {
          return '1';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => ['Other.svelte', 'CopyButton.svelte'],
    });
    const response = await mod.GET({ params: { name: 'copy-button' } } as never);
    const body: ChangelogResponse = await response.json();
    // SHA-256 is deterministic for 'packages/shared/ui/src/copy-button/CopyButton.svelte'
    const { createHash } = await import('node:crypto');
    const expected = createHash('sha256')
      .update('packages/shared/ui/src/copy-button/CopyButton.svelte')
      .digest('hex');
    expect(body.diffAnchor).toBe(expected);
  });

  it('computeDiffAnchor falls back to first .svelte when no Pascal match', async () => {
    const FS = '\u0000';
    const RS = '\u001E';
    const good = `abc${FS}m${FS}${FS}2026-01-01T00:00:00Z${FS}A${RS}`;
    const mod = await loadWithMocks({
      execSyncImpl: (cmd: string): string => {
        if (cmd.startsWith('git log')) {
          return good;
        }
        if (cmd.startsWith('git rev-list')) {
          return '1';
        }
        if (cmd === 'git remote get-url origin') {
          return 'https://github.com/a/b';
        }
        return '';
      },
      statSyncImpl: (): void => {
        /* exists */
      },
      readdirSyncImpl: (): string[] => ['First.svelte', 'Second.svelte'],
    });
    const response = await mod.GET({ params: { name: 'no-match' } } as never);
    const body: ChangelogResponse = await response.json();
    const { createHash } = await import('node:crypto');
    const expected = createHash('sha256')
      .update('packages/shared/ui/src/no-match/First.svelte')
      .digest('hex');
    expect(body.diffAnchor).toBe(expected);
  });
});
