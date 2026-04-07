/**
 * Tests for export-utils.ts — export utilities for Lens documentation components.
 *
 * Mocks browser APIs and `modern-screenshot` since tests run in node environment.
 * Tests data export functions (JSON, Mermaid, DOT, CSV, PlantUML, Markdown) which
 * are pure logic that ultimately call clipboardCopy, and image/HTML export functions
 * which require DOM mocking.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Bool } from '@/schemas/common';
import type { ChainExportNode, ExportOptions } from './export-utils.js';

// Mock modern-screenshot before importing export-utils
vi.mock('modern-screenshot', () => ({
  domToPng: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
  domToJpeg: vi.fn().mockResolvedValue('data:image/jpeg;base64,def'),
  domToSvg: vi.fn().mockResolvedValue('data:image/svg+xml;base64,ghi'),
  domToBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/webp' })),
}));

// Mock clipboard
vi.mock('./clipboard.js', () => ({
  clipboardCopy: vi.fn().mockResolvedValue(true),
}));

/** Stub URL with mock static methods while preserving the constructor. */
function stubUrl(): void {
  const OrigURL = globalThis.URL;
  const MockURL = Object.assign(
    function MockURL(input: string | URL, base?: string | URL) {
      return new OrigURL(input, base);
    } as unknown as typeof URL,
    {
      createObjectURL: vi.fn().mockReturnValue('blob:test'),
      revokeObjectURL: vi.fn(),
      canParse: OrigURL.canParse,
      parse: OrigURL.parse,
      prototype: OrigURL.prototype,
    },
  );
  vi.stubGlobal('URL', MockURL);
}

/**
 * Create a mock DOM element for testing.
 *
 * @returns Mock HTMLElement with cloneNode, classList, dataset stubs
 */
function mockElement(): HTMLElement {
  return {
    cloneNode: vi.fn().mockReturnValue({
      outerHTML: '<div>clone</div>',
      style: { setProperty: vi.fn() },
      children: { length: 0 },
    }),
    classList: { contains: vi.fn().mockReturnValue(false) },
    dataset: {},
    children: { length: 0 },
  } as unknown as HTMLElement;
}

/** Shared mock node data for chain export tests. */
const nodes = [
  {
    id: 'button',
    label: 'Button',
    kind: 'default' as Str,
    category: 'component' as Str,
    parentId: '' as Str,
  },
  {
    id: 'badge',
    label: 'Badge',
    kind: 'named' as Str,
    category: 'component' as Str,
    parentId: 'button' as Str,
  },
  {
    id: 'valibot',
    label: 'valibot',
    kind: 'namespace' as Str,
    category: 'external' as Str,
    parentId: 'button' as Str,
  },
  {
    id: '@/utils',
    label: '@/utils/core',
    kind: 'named' as Str,
    category: 'workspace' as Str,
    parentId: 'badge' as Str,
  },
  {
    id: 'cn',
    label: 'cn',
    kind: 'default' as Str,
    category: 'utility' as Str,
    parentId: 'button' as Str,
  },
];

/** Chain copy function signature. */
type ChainCopyFn = (nodes: ChainExportNode[], componentName: Str) => Promise<Bool>;

/** Chain copy function (no component name). */
type ChainCopyNoNameFn = (nodes: ChainExportNode[]) => Promise<Bool>;

/** Image export function signature. */
type ImageExportFn = (element: HTMLElement, filename: Str, options?: ExportOptions) => Promise<void>;

/**
 * Common browser-global stubs for all tests in this file.
 *
 * @param clickSpy - Mock click spy for download triggers
 */
function stubBrowserGlobals(clickSpy: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('navigator', {
    clipboard: { write: vi.fn().mockResolvedValue(undefined), writeText: vi.fn() },
  });
  vi.stubGlobal('document', {
    createElement: vi.fn().mockReturnValue({
      download: '',
      href: '',
      click: clickSpy,
      style: {},
      value: '',
      select: vi.fn(),
      remove: vi.fn(),
      cloneNode: vi.fn().mockReturnValue({
        outerHTML: '<div>clone</div>',
        style: {},
        children: { length: 0 },
        classList: { contains: vi.fn().mockReturnValue(false) },
        dataset: {},
      }),
    }),
    body: { insertBefore: vi.fn() },
    execCommand: vi.fn().mockReturnValue(true),
    styleSheets: [],
  });
  stubUrl();
  vi.stubGlobal('ClipboardItem', vi.fn());
  vi.stubGlobal('atob', (s: string) => Buffer.from(s, 'base64').toString('binary'));
  vi.stubGlobal(
    'getComputedStyle',
    vi.fn().mockReturnValue({
      [Symbol.iterator]: function* () {
        /* empty */
      },
      getPropertyValue: vi.fn().mockReturnValue(''),
      backgroundColor: 'white',
      color: 'black',
      colorScheme: 'light',
    }),
  );
  vi.stubGlobal('fetch', vi.fn());
}

describe('data export functions', () => {
  let copyChainJson: ChainCopyFn;
  let copyChainMermaid: ChainCopyNoNameFn;
  let copyChainDot: ChainCopyFn;
  let copyChainCsv: ChainCopyNoNameFn;
  let copyChainPlantUml: ChainCopyFn;
  let copyChainMarkdown: ChainCopyFn;
  let clipboardCopy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const clickSpy = vi.fn();
    stubBrowserGlobals(clickSpy);

    ({
      copyChainJson,
      copyChainMermaid,
      copyChainDot,
      copyChainCsv,
      copyChainPlantUml,
      copyChainMarkdown,
    } = await import('./export-utils.js'));

    ({ clipboardCopy } = (await import('./clipboard.js')) as unknown as {
      clipboardCopy: ReturnType<typeof vi.fn>;
    });
    clipboardCopy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('copyChainJson', () => {
    it('copies valid JSON with component name and edges', async () => {
      const result: Bool = await copyChainJson(nodes, 'Button' as Str);
      expect(result).toBe(true);
      const call = clipboardCopy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.component).toBe('Button');
      expect(parsed.exportedAt).toBeTruthy();
      expect(parsed.nodes).toHaveLength(5);
      expect(parsed.edges).toHaveLength(4);
      expect(parsed.edges[0]).toEqual({ from: 'button', to: 'badge' });
    });
  });

  describe('copyChainMermaid', () => {
    it('generates correct Mermaid flowchart syntax', async () => {
      const result: Bool = await copyChainMermaid(nodes);
      expect(result).toBe(true);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      expect(output).toContain('flowchart TD');
      expect(output).toContain('[["Button"]]');
      expect(output).toContain('["Badge"]');
      expect(output).toContain('|named|');
    });
  });

  describe('copyChainDot', () => {
    it('generates correct DOT syntax with colors', async () => {
      const result: Bool = await copyChainDot(nodes, 'Button' as Str);
      expect(result).toBe(true);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      expect(output).toContain('digraph "Button"');
      expect(output).toContain('rankdir=TB');
      expect(output).toContain('fillcolor="#fecdd3"');
      expect(output).toContain('fillcolor="#a7f3d0"');
      expect(output).toContain('fillcolor="#fde68a"');
      expect(output).toContain('fillcolor="#e2e8f0"');
      expect(output).toContain('fillcolor="#e0e7ff"');
      expect(output).toContain('label="named"');
    });
  });

  describe('copyChainCsv', () => {
    it('generates correct CSV with header and rows', async () => {
      const result: Bool = await copyChainCsv(nodes);
      expect(result).toBe(true);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      const lines: string[] = output.split('\n');
      expect(lines[0]).toBe('Name,Kind,Category,Parent');
      expect(lines[1]).toBe('"Button","default","component",""');
      expect(lines[2]).toBe('"Badge","named","component","Button"');
    });

    it('resolves parent label from nodes array', async () => {
      await copyChainCsv(nodes);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      expect(output).toContain('"Badge","named","component","Button"');
      expect(output).toContain('"@/utils/core","named","workspace","Badge"');
    });
  });

  describe('copyChainPlantUml', () => {
    it('generates correct PlantUML syntax', async () => {
      const result: Bool = await copyChainPlantUml(nodes, 'Button' as Str);
      expect(result).toBe(true);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      expect(output).toContain('@startuml');
      expect(output).toContain('title Button Dependencies');
      expect(output).toContain('<<component>>');
      expect(output).toContain('<<external>>');
      expect(output).toContain('<<workspace>>');
      expect(output).toContain('@enduml');
      expect(output).toContain(': named');
    });
  });

  describe('copyChainMarkdown', () => {
    it('generates correct Markdown tree structure', async () => {
      const simpleNodes = [
        {
          id: 'root',
          label: 'Root',
          kind: 'default' as Str,
          category: 'component' as Str,
          parentId: '' as Str,
        },
        {
          id: 'child',
          label: 'Child',
          kind: 'named' as Str,
          category: 'utility' as Str,
          parentId: 'root' as Str,
        },
      ];
      const result: Bool = await copyChainMarkdown(simpleNodes, 'Root' as Str);
      expect(result).toBe(true);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      expect(output).toContain('# Root — Dependency Chain');
      expect(output).toContain('- **Root** *(root)*');
      expect(output).toContain('  - **Child** *(named)* `utility`');
    });

    it('does not add kind suffix for default kind', async () => {
      const simpleNodes = [
        {
          id: 'root',
          label: 'Root',
          kind: 'default' as Str,
          category: 'component' as Str,
          parentId: '' as Str,
        },
        {
          id: 'child',
          label: 'Child',
          kind: 'default' as Str,
          category: 'component' as Str,
          parentId: 'root' as Str,
        },
      ];
      await copyChainMarkdown(simpleNodes, 'Root' as Str);
      const output: string = clipboardCopy.mock.calls[0]![0] as string;
      expect(output).toContain('  - **Child**');
      expect(output).not.toContain('*(default)*');
    });
  });
});

describe('image and HTML export functions', () => {
  let exportPng: ImageExportFn;
  let exportJpeg: ImageExportFn;
  let exportSvg: ImageExportFn;
  let exportWebp: ImageExportFn;
  let copyImageToClipboard: (element: HTMLElement, options?: ExportOptions) => Promise<Bool>;
  let copyDataUri: (element: HTMLElement, options?: ExportOptions) => Promise<Bool>;
  let downloadHtml: (element: HTMLElement, filename: Str) => void;
  let copyHtml: (element: HTMLElement) => Promise<Bool>;
  let downloadStandaloneHtml: (
    componentDir: Str,
    props?: Record<Str, unknown>,
    children?: Str,
    darkMode?: Bool,
    theme?: Str,
  ) => Promise<Bool>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    clickSpy = vi.fn();
    stubBrowserGlobals(clickSpy);

    ({
      exportPng,
      exportJpeg,
      exportSvg,
      exportWebp,
      copyImageToClipboard,
      copyDataUri,
      downloadHtml,
      copyHtml,
      downloadStandaloneHtml,
    } = await import('./export-utils.js'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exportPng calls domToPng and triggers download', async () => {
    await exportPng(mockElement(), 'test' as Str);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportJpeg calls domToJpeg and triggers download', async () => {
    await exportJpeg(mockElement(), 'test' as Str);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportSvg calls domToSvg and triggers download', async () => {
    await exportSvg(mockElement(), 'test' as Str);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportWebp downloads .webp when browser supports webp', async () => {
    await exportWebp(mockElement(), 'test' as Str);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportWebp falls back to PNG when browser does not support webp', async () => {
    const { domToBlob } = await import('modern-screenshot');
    (domToBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Blob(['test'], { type: 'image/png' }),
    );
    await exportWebp(mockElement(), 'test' as Str);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('copyImageToClipboard returns true on success', async () => {
    const result: Bool = await copyImageToClipboard(mockElement());
    expect(result).toBe(true);
  });

  it('copyImageToClipboard returns false when clipboard throws', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        write: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });
    const result: Bool = await copyImageToClipboard(mockElement());
    expect(result).toBe(false);
  });

  it('copyDataUri returns clipboard result', async () => {
    const result: Bool = await copyDataUri(mockElement());
    expect(result).toBe(true);
  });

  it('downloadHtml creates blob and triggers download', () => {
    downloadHtml(mockElement(), 'comp' as Str);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('copyHtml copies self-contained HTML', async () => {
    const result = await copyHtml(mockElement());
    expect(result).toBe(true);
  });

  describe('downloadStandaloneHtml', () => {
    it('returns true on successful fetch', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['<html></html>'])),
      });
      const result: Bool = await downloadStandaloneHtml('button' as Str);
      expect(result).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });

    it('returns false when response is not ok', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
      });
      const result: Bool = await downloadStandaloneHtml('button' as Str);
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
      const result: Bool = await downloadStandaloneHtml('button' as Str);
      expect(result).toBe(false);
    });

    it('passes props, children, darkMode, theme to the API', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['<html></html>'])),
      });
      await downloadStandaloneHtml(
        'button' as Str,
        { variant: 'default' },
        'Click me' as Str,
        true,
        'midnight' as Str,
      );
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(fetchCall[0]).toBe('/api/lens/compile-standalone');
      const body = JSON.parse(fetchCall[1].body);
      expect(body.componentDir).toBe('button');
      expect(body.props).toEqual({ variant: 'default' });
      expect(body.children).toBe('Click me');
      expect(body.darkMode).toBe(true);
      expect(body.theme).toBe('midnight');
    });
  });
});
