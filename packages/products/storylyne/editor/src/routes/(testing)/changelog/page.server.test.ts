/**
 * Tests for the What's New changelog page server load.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { load, type ChangelogData } from './+page.server';
import type * as PageServerModule from './+page.server';
import type * as NodeChildProcessModule from 'node:child_process';
import type * as NodeFsModule from 'node:fs';

describe('(testing)/changelog +page.server load — real repo', () => {
  it('returns groups array with changelog entries', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.groups).toBeDefined();
    expect(Array.isArray(result.groups)).toBe(true);
    expect(result.groups.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it('each entry has hash, message, author, date, components fields', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    const first = result.groups[0]!.entries[0]!;
    expect(first.hash).toBeTruthy();
    expect(first.message).toBeTruthy();
    expect(first.author).toBeTruthy();
    expect(first.date).toBeTruthy();
    expect(Array.isArray(first.components)).toBe(true);
    expect(first.components.length).toBeGreaterThan(0);
  });

  it('entries are grouped by date', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;

    for (const group of result.groups) {
      expect(group.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });

  it('repoUrl is a non-empty string', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(typeof result.repoUrl).toBe('string');
    expect(result.repoUrl.length).toBeGreaterThan(0);
  });
});

/* -----------------------------------------------------------------------
 * Mocked branches — cover git failure paths, repo URL parsing, body parsing,
 * date grouping, and the "no workspace.yaml" fallback.
 * -------------------------------------------------------------------- */

type LoadedModule = typeof PageServerModule;

type ExecSyncImpl = (cmd: string, opts?: Record<string, unknown>) => string | Buffer;
type StatSyncImpl = (path: string) => unknown;

const state = vi.hoisted(() => ({
  execSync: null as ExecSyncImpl | null,
  statSync: null as StatSyncImpl | null,
}));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeChildProcessModule>();
  const wrap = (cmd: string, opts?: Record<string, unknown>): string | Buffer => {
    if (state.execSync) {
      return state.execSync(cmd, opts);
    }
    return actual.execSync(cmd, opts as Parameters<typeof actual.execSync>[1]) as string | Buffer;
  };

  return {
    ...actual,
    default: { ...actual, execSync: wrap },
    execSync: wrap,
  };
});

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFsModule>();
  const statWrapper = (p: string): unknown => {
    if (state.statSync) {
      return state.statSync(p);
    }
    return actual.statSync(p);
  };

  return {
    ...actual,
    default: { ...actual, statSync: statWrapper },
    statSync: statWrapper,
  };
});

async function loadMocked(): Promise<LoadedModule> {
  vi.resetModules();
  return (await import('./+page.server')) as LoadedModule;
}

describe('(testing)/changelog +page.server load — mocked branches', () => {
  beforeEach(() => {
    state.execSync = null;
    state.statSync = null;
  });

  afterEach(() => {
    state.execSync = null;
    state.statSync = null;
  });

  it('returns empty groups when git log fails (first execSync throws)', async () => {
    let calls = 0;
    state.execSync = (cmd: string): string => {
      calls++;
      if (cmd.startsWith('git remote')) {
        return 'git@github.com:acme/widgets.git\n';
      }
      throw new Error('git not found');
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.groups).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.repoUrl).toBe('https://github.com/acme/widgets');
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('parses SSH remote into https URL and strips .git', async () => {
    const headerLog =
      '---COMMIT---abc123|||add button|||Jane Doe|||2025-01-05T12:00:00Z\n' +
      'packages/shared/ui/src/button/Button.svelte\n';
    const bodyLog = 'abc123|||The body text\n---COMMIT---';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'git@github.com:foo/bar.git\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return bodyLog;
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.repoUrl).toBe('https://github.com/foo/bar');
    expect(result.total).toBe(1);
    expect(result.groups[0]!.date).toBe('2025-01-05');
    const entry = result.groups[0]!.entries[0]!;
    expect(entry.hash).toBe('abc123');
    expect(entry.message).toBe('add button');
    expect(entry.author).toBe('Jane Doe');
    expect(entry.components).toEqual(['button']);
    expect(entry.body).toBe('The body text');
    expect(entry.isNew).toBe(true);
  });

  it('parses HTTPS remote and strips trailing .git', async () => {
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/x/y.git\n';
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.repoUrl).toBe('https://github.com/x/y');
  });

  it('caches repo URL across multiple load() calls', async () => {
    let remoteCalls = 0;
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        remoteCalls++;
        return 'https://github.com/cache/test\n';
      }
      return '';
    };
    const mod = await loadMocked();
    (mod.load as unknown as (e: Record<string, unknown>) => unknown)({});
    (mod.load as unknown as (e: Record<string, unknown>) => unknown)({});
    expect(remoteCalls).toBe(1);
  });

  it('returns empty repoUrl when git remote throws', async () => {
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        throw new Error('not a git repo');
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.repoUrl).toBe('');
  });

  it('skips commits with <4 fields in the header line', async () => {
    const headerLog =
      '---COMMIT---abc|||bad header\n' +
      'packages/shared/ui/src/button/A.svelte\n' +
      '---COMMIT---def456|||create card|||Dev|||2025-02-10T00:00:00Z\n' +
      'packages/shared/ui/src/card/Card.svelte\n';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.total).toBe(1);
    expect(result.groups[0]!.entries[0]!.hash).toBe('def456');
  });

  it('skips commits that do not touch any component directory', async () => {
    const headerLog =
      '---COMMIT---111aaa|||update readme|||Dev|||2025-02-11T00:00:00Z\n' +
      'README.md\n' +
      '---COMMIT---222bbb|||add icon|||Dev|||2025-02-12T00:00:00Z\n' +
      'packages/shared/ui/src/icon/Icon.svelte\n';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.total).toBe(1);
    expect(result.groups[0]!.entries[0]!.components).toEqual(['icon']);
  });

  it('proceeds with empty bodies when body execSync throws', async () => {
    const headerLog =
      '---COMMIT---zzz|||add thing|||Dev|||2025-02-13T00:00:00Z\n' +
      'packages/shared/ui/src/thing/Thing.svelte\n';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      throw new Error('body fetch fail');
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.total).toBe(1);
    expect(result.groups[0]!.entries[0]!.body).toBe('');
  });

  it('skips body blocks missing the field separator', async () => {
    const headerLog =
      '---COMMIT---aaa|||add a|||Dev|||2025-03-01T00:00:00Z\n' +
      'packages/shared/ui/src/a/A.svelte\n' +
      '---COMMIT---bbb|||add b|||Dev|||2025-03-02T00:00:00Z\n' +
      'packages/shared/ui/src/b/B.svelte\n';
    const bodyLog = 'no-separator-here\n---COMMIT---bbb|||body-for-b---COMMIT---';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return bodyLog;
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    const all = result.groups.flatMap((g) => g.entries);
    const aEntry = all.find((e) => e.hash === 'aaa');
    const bEntry = all.find((e) => e.hash === 'bbb');
    expect(aEntry?.body).toBe('');
    expect(bEntry?.body).toBe('body-for-b');
  });

  it('isNew flag reflects add/create/new/initial keywords; false otherwise', async () => {
    const headerLog =
      '---COMMIT---h1|||fix button spacing|||Dev|||2025-03-10T00:00:00Z\n' +
      'packages/shared/ui/src/button/Btn.svelte\n' +
      '---COMMIT---h2|||initial commit|||Dev|||2025-03-11T00:00:00Z\n' +
      'packages/shared/ui/src/x/X.svelte\n';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    const all = result.groups.flatMap((g) => g.entries);
    expect(all.find((e) => e.hash === 'h1')?.isNew).toBe(false);
    expect(all.find((e) => e.hash === 'h2')?.isNew).toBe(true);
  });

  it('groups by date (YYYY-MM-DD) with newest date first', async () => {
    const headerLog =
      '---COMMIT---d1|||add first|||Dev|||2025-04-01T10:00:00Z\n' +
      'packages/shared/ui/src/one/O.svelte\n' +
      '---COMMIT---d2|||add second|||Dev|||2025-04-03T10:00:00Z\n' +
      'packages/shared/ui/src/two/T.svelte\n' +
      '---COMMIT---d3|||add third|||Dev|||2025-04-01T15:00:00Z\n' +
      'packages/shared/ui/src/three/T.svelte\n';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.groups.map((g) => g.date)).toEqual(['2025-04-03', '2025-04-01']);
    expect(result.groups[1]!.entries).toHaveLength(2);
  });

  it('sorts components alphabetically when a commit touches multiple directories', async () => {
    const headerLog =
      '---COMMIT---multi|||add multi|||Dev|||2025-05-01T00:00:00Z\n' +
      'packages/shared/ui/src/zebra/Z.svelte\n' +
      'packages/shared/ui/src/alpha/A.svelte\n' +
      'packages/shared/ui/src/mango/M.svelte\n';
    state.execSync = (cmd: string): string => {
      if (cmd.startsWith('git remote')) {
        return 'https://github.com/a/b\n';
      }
      if (cmd.includes('--name-only')) {
        return headerLog;
      }
      return '';
    };
    const mod = await loadMocked();
    const result = (mod.load as unknown as (e: Record<string, unknown>) => unknown)(
      {},
    ) as ChangelogData;
    expect(result.groups[0]!.entries[0]!.components).toEqual(['alpha', 'mango', 'zebra']);
  });
});
