/**
 * Tests for detect-browser-support.ts — CSS feature detection and browser support analysis.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import type { Str } from '@/schemas/common';
import { detectBrowserSupport, type BrowserSupportResult } from './detect-browser-support.js';

describe('detectBrowserSupport', () => {
  it('detects oklch() usage in source files', () => {
    const sources: Record<Str, Str> = {
      'app.css': 'color: oklch(0.6 0.2 250);' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    expect(result.features.length).toBeGreaterThan(0);
    const oklch = result.features.find((f) => f.id === 'oklch');
    expect(oklch).toBeDefined();
    expect(oklch!.usageCount).toBe(1);
    expect(oklch!.files).toEqual(['app.css']);
  });

  it('detects multiple CSS features in the same file', () => {
    const sources: Record<Str, Str> = {
      'app.css': `
        color: oklch(0.6 0.2 250);
        background: color-mix(in oklch, red, blue);
        .parent:has(.child) { display: block; }
      ` as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const ids: string[] = result.features.map((f) => f.id as string);
    expect(ids).toContain('oklch');
    expect(ids).toContain('color-mix');
    expect(ids).toContain('has');
  });

  it('counts multiple occurrences of the same feature', () => {
    const sources: Record<Str, Str> = {
      'styles.css': 'color: oklch(0.5 0.1 200); background: oklch(0.9 0 0);' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const oklch = result.features.find((f) => f.id === 'oklch');
    expect(oklch!.usageCount).toBe(2);
  });

  it('tracks files where each feature is found', () => {
    const sources: Record<Str, Str> = {
      'a.css': 'color: oklch(0.5 0.1 200);' as Str,
      'b.css': 'background: oklch(0.9 0 0);' as Str,
      'c.css': 'margin: 0;' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const oklch = result.features.find((f) => f.id === 'oklch');
    expect(oklch!.files).toEqual(['a.css', 'b.css']);
  });

  it('returns empty features for sources with no CSS features', () => {
    const sources: Record<Str, Str> = {
      'plain.css': 'body { margin: 0; padding: 0; }' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    expect(result.features).toHaveLength(0);
  });

  it('returns empty features for empty sources', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});
    expect(result.features).toHaveLength(0);
  });

  it('computes correct browser minimum versions from detected features', () => {
    // oklch requires Chrome 111, subgrid requires Chrome 117
    // The higher value (117) should win
    const sources: Record<Str, Str> = {
      'app.css': 'color: oklch(0.5 0.1 200); grid-template-columns: subgrid;' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const chrome = result.browsers.find((b) => b.name === 'Chrome');
    // subgrid requires Chrome 117, oklch requires 111 — 117 is higher
    expect(chrome!.minVersion).toBe('117+');
    expect(chrome!.limitingFeature).toBe('subgrid');
  });

  it('returns 0+ minimums when no features detected', () => {
    const result: BrowserSupportResult = detectBrowserSupport({
      'plain.css': 'body { margin: 0; }' as Str,
    });

    for (const browser of result.browsers) {
      expect(browser.minVersion).toBe('0+');
    }
  });

  it('includes all 5 supported browsers', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});
    const names: string[] = result.browsers.map((b) => b.name as string);
    expect(names).toContain('Chrome');
    expect(names).toContain('Edge');
    expect(names).toContain('Firefox');
    expect(names).toContain('Safari');
    expect(names).toContain('Opera');
  });

  it('includes unsupported browsers', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});
    expect(result.unsupported.length).toBe(3);
    const names: string[] = result.unsupported.map((b) => b.name as string);
    expect(names).toContain('Internet Explorer');
    expect(names).toContain('Opera Mini');
    expect(names).toContain('UC Browser');
    for (const entry of result.unsupported) {
      expect(entry.status).toBe('unsupported');
      expect(entry.minVersion).toBe('N/A');
    }
  });

  it('uses default framework versions when none provided', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});
    const svelte = result.frameworks.find((f) => f.name === 'Svelte');
    expect(svelte!.version).toBe('5+');
    const node = result.frameworks.find((f) => f.name === 'Node.js');
    expect(node!.version).toBe('25+');
  });

  it('overrides framework versions when provided', () => {
    const result: BrowserSupportResult = detectBrowserSupport(
      {},
      { svelte: '4.2' as Str, node: '20' as Str },
    );
    const svelte = result.frameworks.find((f) => f.name === 'Svelte');
    expect(svelte!.version).toBe('4.2');
    const node = result.frameworks.find((f) => f.name === 'Node.js');
    expect(node!.version).toBe('20');
  });

  it('includes all 4 framework entries', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});
    expect(result.frameworks).toHaveLength(4);
    const names: string[] = result.frameworks.map((f) => f.name as string);
    expect(names).toEqual(['Svelte', 'SvelteKit', 'TypeScript', 'Node.js']);
  });

  it('detects container queries', () => {
    const sources: Record<Str, Str> = {
      'layout.css': '@container (min-width: 500px) { .card { flex-direction: row; } }' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const cq = result.features.find((f) => f.id === 'container-queries');
    expect(cq).toBeDefined();
    expect(cq!.usageCount).toBeGreaterThan(0);
  });

  it('detects CSS nesting with & selector', () => {
    const sources: Record<Str, Str> = {
      'styles.css': '.parent { & .child { color: red; } }' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const nesting = result.features.find((f) => f.id === 'nesting');
    expect(nesting).toBeDefined();
  });

  it('detects @layer', () => {
    const sources: Record<Str, Str> = {
      'base.css': '@layer base { body { margin: 0; } }' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const layer = result.features.find((f) => f.id === 'layer');
    expect(layer).toBeDefined();
  });

  it('detects dynamic viewport units', () => {
    const sources: Record<Str, Str> = {
      'layout.css': 'height: 100dvh;' as Str,
    };
    const result: BrowserSupportResult = detectBrowserSupport(sources);
    const dvh = result.features.find((f) => f.id === 'dvh');
    expect(dvh).toBeDefined();
    expect(dvh!.usageCount).toBe(1);
  });

  it('sets correct engine for each browser', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});
    expect(result.browsers.find((b) => b.name === 'Chrome')!.engine).toBe('Blink');
    expect(result.browsers.find((b) => b.name === 'Firefox')!.engine).toBe('Gecko');
    expect(result.browsers.find((b) => b.name === 'Safari')!.engine).toBe('WebKit');
    expect(result.browsers.find((b) => b.name === 'Edge')!.engine).toBe('Blink');
    expect(result.browsers.find((b) => b.name === 'Opera')!.engine).toBe('Blink');
  });

  it('all supported browsers have status "supported"', () => {
    const result: BrowserSupportResult = detectBrowserSupport({});

    for (const browser of result.browsers) {
      expect(browser.status).toBe('supported');
      expect(browser.category).toBe('Desktop');
    }
  });
});
