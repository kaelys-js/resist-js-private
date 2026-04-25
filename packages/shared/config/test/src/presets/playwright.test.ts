/**
 * Tests for the Playwright E2E preset factory.
 *
 * @module
 */

import type { PlaywrightTestConfig } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPlaywrightConfig, type PlaywrightPresetOptions } from './playwright';

function opts(raw: Record<string, unknown>): PlaywrightPresetOptions {
  return raw as unknown as PlaywrightPresetOptions;
}

describe('createPlaywrightConfig', () => {
  let originalCI: string | undefined;

  beforeEach((): void => {
    originalCI = process.env.CI;
    delete process.env.CI;
  });

  afterEach((): void => {
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
  });

  it('uses "./e2e" as default testDir', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.testDir).toBe('./e2e');
  });

  it('uses default previewPort 4173 and host 127.0.0.1 in baseURL', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.use?.baseURL).toBe('http://127.0.0.1:4173');
  });

  it('honors custom testDir, previewPort, and previewHost', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(
      opts({ testDir: './tests', previewPort: 4200, previewHost: '0.0.0.0' }),
    );
    expect(cfg.testDir).toBe('./tests');
    expect(cfg.use?.baseURL).toBe('http://0.0.0.0:4200');
  });

  it('auto-generates buildCommand from host and port when omitted', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(
      opts({ previewPort: 5000, previewHost: '127.0.0.1' }),
    );
    expect(cfg.webServer).toBeDefined();
    const { command } = cfg.webServer as { command: string };
    expect(command).toBe('pnpm build && pnpm preview --port 5000 --host 127.0.0.1');
  });

  it('uses caller-provided buildCommand as-is', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({ buildCommand: 'pnpm dev' }));
    const { command } = cfg.webServer as { command: string };
    expect(command).toBe('pnpm dev');
  });

  it('uses default timeouts when not provided', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.timeout).toBe(30_000);
    expect((cfg.webServer as { timeout: number }).timeout).toBe(120_000);
  });

  it('honors custom timeout and webServerTimeout', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(
      opts({ timeout: 45_000, webServerTimeout: 90_000 }),
    );
    expect(cfg.timeout).toBe(45_000);
    expect((cfg.webServer as { timeout: number }).timeout).toBe(90_000);
  });

  it('defaults to a single Chromium project when projects is omitted', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.projects).toHaveLength(1);
    expect(cfg.projects?.[0]?.name).toBe('chromium');
  });

  it('honors caller-provided projects array', () => {
    const custom = [{ name: 'firefox', use: {} }];
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({ projects: custom }));
    expect(cfg.projects).toBe(custom);
  });

  describe('non-CI branch', () => {
    it('forbidOnly=false, retries=0, workers=undefined, list reporter, reuseExistingServer=true', () => {
      const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
      expect(cfg.forbidOnly).toBe(false);
      expect(cfg.retries).toBe(0);
      expect(cfg.workers).toBeUndefined();
      expect(cfg.reporter).toEqual([['list']]);
      expect((cfg.webServer as { reuseExistingServer: boolean }).reuseExistingServer).toBe(true);
    });
  });

  describe('CI branch', () => {
    beforeEach((): void => {
      process.env.CI = '1';
    });

    it('forbidOnly=true, retries=2, workers=1, html+github reporters, reuseExistingServer=false', () => {
      const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
      expect(cfg.forbidOnly).toBe(true);
      expect(cfg.retries).toBe(2);
      expect(cfg.workers).toBe(1);
      expect(cfg.reporter).toEqual([['html', { open: 'never' }], ['github']]);
      expect((cfg.webServer as { reuseExistingServer: boolean }).reuseExistingServer).toBe(false);
    });
  });

  it('sets fullyParallel to true', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.fullyParallel).toBe(true);
  });

  it('configures expect.timeout = 5000', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.expect?.timeout).toBe(5000);
  });

  it('configures trace, screenshot, video, actionTimeout, navigationTimeout', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    expect(cfg.use?.trace).toBe('on-first-retry');
    expect(cfg.use?.screenshot).toBe('only-on-failure');
    expect(cfg.use?.video).toBe('retain-on-failure');
    expect(cfg.use?.actionTimeout).toBe(10_000);
    expect(cfg.use?.navigationTimeout).toBe(15_000);
  });

  it('configures webServer stdout=ignore and stderr=pipe', () => {
    const cfg: PlaywrightTestConfig = createPlaywrightConfig(opts({}));
    const ws = cfg.webServer as { stdout: string; stderr: string; url: string };
    expect(ws.stdout).toBe('ignore');
    expect(ws.stderr).toBe('pipe');
    expect(ws.url).toBe('http://127.0.0.1:4173');
  });

  it('throws when previewPort fails schema validation', () => {
    expect(
      (): PlaywrightTestConfig => createPlaywrightConfig(opts({ previewPort: 'not-a-port' })),
    ).toThrow();
  });
});
