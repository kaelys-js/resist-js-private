import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';

const appHtml: Str = readFileSync(resolve(import.meta.dirname, 'app.html'), 'utf8');

describe('app.html script robustness', () => {
  it('wraps IIFE body in try/catch', () => {
    expect(appHtml).toMatch(/\(function\s*\(\)\s*\{\s*try\s*\{/);
  });

  it('logs errors to console in catch block', () => {
    expect(appHtml).toMatch(/catch\s*\([^)]+\)\s*\{\s*console\.error\(/);
  });

  it('console error prefix uses APP_NAME placeholder', () => {
    expect(appHtml).toContain("'[{{APP_NAME}}]");
  });

  it('reads mode preference from STORAGE_PREFIX placeholder key', () => {
    expect(appHtml).toContain("localStorage.getItem('{{STORAGE_PREFIX}}:mode')");
    expect(appHtml).not.toContain('mode-watcher-mode');
    expect(appHtml).not.toContain("'app:mode'");
  });

  it('reads theme from data-theme attribute with STORAGE_PREFIX placeholder fallback', () => {
    expect(appHtml).toContain("getAttribute('data-theme')");
    expect(appHtml).toContain("localStorage.getItem('{{STORAGE_PREFIX}}:theme')");
    expect(appHtml).not.toContain("'app:theme'");
  });

  it('reads sidebar width from data-sidebar-width attribute', () => {
    expect(appHtml).toContain("getAttribute('data-sidebar-width')");
    expect(appHtml).toContain("'--sidebar-width'");
  });
});

describe('app.html hydration flash prevention attributes', () => {
  it('has data-theme attribute on html tag', () => {
    expect(appHtml).toContain('data-theme=""');
  });

  it('has data-sidebar-width attribute on html tag', () => {
    expect(appHtml).toContain('data-sidebar-width=""');
  });
});

describe('app.html meta tags use placeholders', () => {
  it('apple-mobile-web-app-title uses APP_NAME placeholder', () => {
    expect(appHtml).toMatch(/name="apple-mobile-web-app-title"[^>]*content="{{APP_NAME}}"/);
  });

  it('does not contain hardcoded app name in meta content attributes', () => {
    // Meta content attributes should use placeholders, not hardcoded values
    const metaContents: RegExpMatchArray | null = appHtml.match(/<meta[^>]*content="([^"]+)"/g);
    if (metaContents) {
      for (const meta of metaContents) {
        // Skip viewport, color-scheme, robots, format-detection, mobile-web-app-capable, status-bar-style
        if (/content="(width|light dark|noindex|telephone|yes|default|{{)/.test(meta)) continue;
        // Hardcoded product names should not appear — only {{APP_NAME}} placeholders
        expect(meta).not.toMatch(/content="[A-Z][a-z]+"/);
      }
    }
  });
});
