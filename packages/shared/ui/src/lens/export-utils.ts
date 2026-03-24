/**
 * Export utilities for Lens documentation components.
 *
 * Provides functions to export DOM elements as images (PNG, JPEG, SVG, WebP)
 * and copy them to the clipboard. Also supports data export formats
 * (JSON, Mermaid, DOT) for dependency chain graphs.
 *
 * Uses `modern-screenshot` for DOM-to-image conversion.
 */
import * as v from 'valibot';
import { StrSchema, NumSchema, type Str, type Bool, type Num } from '@/schemas/common';
import { domToPng, domToJpeg, domToSvg, domToBlob } from 'modern-screenshot';
import { clipboardCopy } from './clipboard.js';

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

/** Export format identifiers. */
const ExportFormatSchema = v.picklist(['png', 'jpeg', 'svg', 'webp']);
type ExportFormat = v.InferOutput<typeof ExportFormatSchema>;

/** Options for image export. */
const ExportOptionsSchema = v.strictObject({
  /** JPEG/WebP quality (0-1). Default: 0.92 */
  quality: v.optional(NumSchema),
  /** Pixel scale factor. Default: 2 (retina) */
  scale: v.optional(NumSchema),
  /** Background color (CSS). Default: transparent for PNG/SVG, white for JPEG */
  backgroundColor: v.optional(StrSchema),
});
type ExportOptions = v.InferOutput<typeof ExportOptionsSchema>;

/** Chain node data for data export formats. */
const ChainExportNodeSchema = v.strictObject({
  /** Node identifier. */
  id: StrSchema,
  /** Display name or import path. */
  label: StrSchema,
  /** Import kind. @values default, named, type, namespace */
  kind: StrSchema,
  /** Node category. @values component, utility, workspace, external */
  category: StrSchema,
  /** Parent node ID (empty string for root). */
  parentId: StrSchema,
});
type ChainExportNode = v.InferOutput<typeof ChainExportNodeSchema>;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Convert a data URL to a Blob.
 *
 * @param dataUrl - Base64 data URL string
 * @returns Blob object
 */
function dataUrlToBlob(dataUrl: Str): Blob {
  const parts: Str[] = dataUrl.split(',');
  const mimeMatch: RegExpMatchArray | null | undefined = parts[0]?.match(/:(.*?);/);
  const mime: Str = mimeMatch?.[1] ?? 'image/png';
  const b64: Str = parts[1] ?? '';
  const binary: Str = atob(b64);
  const buffer: ArrayBuffer = new ArrayBuffer(binary.length);
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(buffer);
  for (let i: Num = 0; i < binary.length; i++) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Trigger a file download from a data URL.
 *
 * @param dataUrl - Base64 data URL string
 * @param filename - Download filename
 */
function downloadDataUrl(dataUrl: Str, filename: Str): void {
  const link: HTMLAnchorElement = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Trigger a file download from a Blob.
 *
 * @param blob - Blob data
 * @param filename - Download filename
 */
function downloadBlob(blob: Blob, filename: Str): void {
  const url: Str = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Resolve DOT fill color from node category.
 *
 * @param node - Chain export node
 * @returns CSS hex color string
 */
function dotFillColor(node: ChainExportNode): Str {
  if (node.parentId === '') {
    return '#fecdd3';
  }
  if (node.category === 'utility') {
    return '#e2e8f0';
  }
  if (node.category === 'workspace') {
    return '#fde68a';
  }
  if (node.category === 'external') {
    return '#a7f3d0';
  }
  return '#e0e7ff';
}

/**
 * Build Mermaid edge label from node kind.
 *
 * @param kind - Import kind
 * @returns Mermaid label string (empty if default)
 */
function mermaidEdgeLabel(kind: Str): Str {
  if (kind === 'default') {
    return '';
  }
  return `|${kind}|`;
}

/* ------------------------------------------------------------------ */
/*  Image export                                                       */
/* ------------------------------------------------------------------ */

/**
 * Download a DOM element as a PNG image.
 *
 * @param element - Target DOM element
 * @param filename - Download filename (without extension)
 * @param options - Export options
 */
export async function exportPng(
  element: HTMLElement,
  filename: Str,
  options?: ExportOptions,
): Promise<void> {
  const dataUrl: Str = await domToPng(element, {
    scale: options?.scale ?? 2,
    backgroundColor: options?.backgroundColor,
  });
  downloadDataUrl(dataUrl, `${filename}.png`);
}

/**
 * Download a DOM element as a JPEG image.
 *
 * @param element - Target DOM element
 * @param filename - Download filename (without extension)
 * @param options - Export options
 */
export async function exportJpeg(
  element: HTMLElement,
  filename: Str,
  options?: ExportOptions,
): Promise<void> {
  const dataUrl: Str = await domToJpeg(element, {
    scale: options?.scale ?? 2,
    quality: options?.quality ?? 0.92,
    backgroundColor: options?.backgroundColor,
  });
  downloadDataUrl(dataUrl, `${filename}.jpg`);
}

/**
 * Download a DOM element as an SVG image.
 *
 * @param element - Target DOM element
 * @param filename - Download filename (without extension)
 * @param options - Export options
 */
export async function exportSvg(
  element: HTMLElement,
  filename: Str,
  options?: ExportOptions,
): Promise<void> {
  const dataUrl: Str = await domToSvg(element, {
    scale: options?.scale ?? 2,
    backgroundColor: options?.backgroundColor ?? 'transparent',
  });
  downloadDataUrl(dataUrl, `${filename}.svg`);
}

/**
 * Download a DOM element as a WebP image.
 *
 * Falls back to PNG if the browser does not support WebP encoding.
 *
 * @param element - Target DOM element
 * @param filename - Download filename (without extension)
 * @param options - Export options
 */
export async function exportWebp(
  element: HTMLElement,
  filename: Str,
  options?: ExportOptions,
): Promise<void> {
  const blob: Blob = await domToBlob(element, {
    scale: options?.scale ?? 2,
    quality: options?.quality ?? 0.92,
    type: 'image/webp',
    backgroundColor: options?.backgroundColor,
  });
  // Browser may not support WebP — check actual type
  if (blob.type === 'image/webp') {
    downloadBlob(blob, `${filename}.webp`);
  } else {
    // Fallback to PNG
    const dataUrl: Str = await domToPng(element, { scale: options?.scale ?? 2 });
    downloadDataUrl(dataUrl, `${filename}.png`);
  }
}

/**
 * Copy a DOM element as a PNG image to the clipboard.
 *
 * Uses the Clipboard API's `ClipboardItem` for async image write.
 *
 * @param element - Target DOM element
 * @param options - Export options
 * @returns Whether the copy succeeded
 */
export async function copyImageToClipboard(
  element: HTMLElement,
  options?: ExportOptions,
): Promise<Bool> {
  try {
    const dataUrl: Str = await domToPng(element, {
      scale: options?.scale ?? 2,
      backgroundColor: options?.backgroundColor,
    });
    const blob: Blob = dataUrlToBlob(dataUrl);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    /* Clipboard API unavailable or permission denied — return false */
    return false;
  }
}

/**
 * Copy a DOM element as a PNG data URI string to the clipboard.
 * Useful for pasting directly into Markdown `<img src="...">` or GitHub issues.
 *
 * @param element - Target DOM element
 * @param options - Export options
 * @returns Whether the copy succeeded
 */
export async function copyDataUri(element: HTMLElement, options?: ExportOptions): Promise<Bool> {
  const dataUrl: Str = await domToPng(element, {
    scale: options?.scale ?? 2,
    backgroundColor: options?.backgroundColor,
  });
  return clipboardCopy(dataUrl);
}

/* ------------------------------------------------------------------ */
/*  HTML export                                                        */
/* ------------------------------------------------------------------ */

/**
 * Recursively inline all computed styles onto every element in a cloned subtree.
 * Strips layout-dependent properties (position, top/left, transforms) so the
 * exported HTML renders cleanly standalone.
 *
 * @param clone - The cloned element tree to inline styles into
 * @param source - The live DOM element tree to read computed styles from
 */
function inlineComputedStyles(clone: HTMLElement, source: HTMLElement): void {
  const computed: CSSStyleDeclaration = getComputedStyle(source);
  for (const prop of computed) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  const cloneChildren: HTMLCollection = clone.children;
  const sourceChildren: HTMLCollection = source.children;
  const len: Num = Math.min(cloneChildren.length, sourceChildren.length) as Num;
  for (let i: Num = 0; i < len; i++) {
    const cloneChild: Element = cloneChildren[i] as Element;
    const sourceChild: Element = sourceChildren[i] as Element;
    if (cloneChild instanceof HTMLElement && sourceChild instanceof HTMLElement) {
      inlineComputedStyles(cloneChild, sourceChild);
    }
  }
}

/**
 * Extract CSS custom property declarations from all document stylesheets.
 * Collects rules matching :root, .dark, [data-theme] selectors and returns
 * them as a single CSS string suitable for injection into a standalone HTML.
 *
 * @param isDark - Whether dark mode is active
 * @param theme - Active theme name (empty string if none)
 * @returns CSS text containing custom property declarations
 */
function extractCssCustomProperties(isDark: Bool, theme: Str): Str {
  const rules: Str[] = [];

  try {
    for (const sheet of document.styleSheets) {
      let cssRules: CSSRuleList;
      try {
        ({ cssRules } = sheet);
      } catch {
        /* Cross-origin stylesheet — skip silently */
        continue;
      }

      for (const rule of cssRules) {
        if (!(rule instanceof CSSStyleRule)) {
          continue;
        }
        const sel: Str = rule.selectorText;

        // Collect :root vars (base theme)
        const isRoot: Bool = sel === ':root' || sel === ':root, ::backdrop';
        // Collect .dark vars when in dark mode
        const isDarkRule: Bool = isDark && (sel === '.dark' || sel.includes('.dark'));
        // Collect theme-specific vars
        const isThemeRule: Bool = theme !== '' && sel.includes(`[data-theme="${theme}"]`);

        if (!isRoot && !isDarkRule && !isThemeRule) {
          continue;
        }

        // Extract only custom property declarations
        const props: Str[] = [];
        for (const prop of rule.style) {
          if (prop.startsWith('--')) {
            props.push(`  ${prop}: ${rule.style.getPropertyValue(prop)};`);
          }
        }
        if (props.length > 0) {
          rules.push(`:root {\n${props.join('\n')}\n}`);
        }
      }
    }
  } catch {
    /* StyleSheet access failed entirely — return empty */
  }

  return rules.join('\n');
}

/**
 * Build a self-contained HTML string from a DOM element.
 * Clones the element, inlines all computed styles, injects CSS custom properties
 * from the active theme/mode, and wraps in a minimal HTML document.
 *
 * @param element - Target DOM element
 * @returns Self-contained HTML document string
 */
function buildSelfContainedHtml(element: HTMLElement): Str {
  const clone: HTMLElement = element.cloneNode(true) as HTMLElement;
  inlineComputedStyles(clone, element);

  // Propagate dark mode and theme from the source element
  const isDark: Bool = element.classList.contains('dark');
  const theme: Str = element.dataset.theme ?? '';
  const computed: CSSStyleDeclaration = getComputedStyle(element);
  const { backgroundColor: bgColor, color: textColor, colorScheme }: CSSStyleDeclaration = computed;

  // Extract CSS custom properties so var(--*) references resolve in standalone HTML
  const cssVars: Str = extractCssCustomProperties(isDark, theme);

  const htmlAttrs: Str[] = ['lang="en"'];
  if (isDark) {
    htmlAttrs.push('class="dark"');
  }
  if (theme) {
    htmlAttrs.push(`data-theme="${theme}"`);
  }

  const bodyStyles: Str[] = ['margin: 0', 'padding: 16px'];
  if (bgColor) {
    bodyStyles.push(`background-color: ${bgColor}`);
  }
  if (textColor) {
    bodyStyles.push(`color: ${textColor}`);
  }
  if (colorScheme) {
    bodyStyles.push(`color-scheme: ${colorScheme}`);
  }

  const headParts: Str[] = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
  ];
  if (cssVars) {
    headParts.push(`<style>\n${cssVars}\n</style>`);
  }

  return [
    '<!DOCTYPE html>',
    `<html ${htmlAttrs.join(' ')}>`,
    `<head>${headParts.join('')}</head>`,
    `<body style="${bodyStyles.join('; ')}">`,
    clone.outerHTML,
    '</body>',
    '</html>',
  ].join('\n');
}

/**
 * Download a DOM element as a self-contained HTML file with inlined styles.
 *
 * @param element - Target DOM element
 * @param filename - Download filename (without extension)
 */
export function downloadHtml(element: HTMLElement, filename: Str): void {
  const html: Str = buildSelfContainedHtml(element);
  const blob: Blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `${filename}.html`);
}

/**
 * Copy a DOM element's self-contained HTML to the clipboard.
 *
 * @param element - Target DOM element
 * @returns Whether the copy succeeded
 */
export function copyHtml(element: HTMLElement): Promise<Bool> {
  const html: Str = buildSelfContainedHtml(element);
  return clipboardCopy(html);
}

/* ------------------------------------------------------------------ */
/*  Data export (dependency chain)                                     */
/* ------------------------------------------------------------------ */

/**
 * Export chain nodes as a JSON string and copy to clipboard.
 *
 * @param nodes - Chain node data
 * @param componentName - Root component name
 * @returns Whether the copy succeeded
 */
export function copyChainJson(nodes: ChainExportNode[], componentName: Str): Promise<Bool> {
  const data = {
    component: componentName,
    exportedAt: new Date().toISOString(),
    nodes,
    edges: nodes
      .filter((n: ChainExportNode): boolean => n.parentId !== '')
      .map((n: ChainExportNode) => ({ from: n.parentId, to: n.id })),
  };
  return clipboardCopy(JSON.stringify(data, null, 2));
}

/**
 * Export chain nodes as Mermaid flowchart syntax and copy to clipboard.
 *
 * @param nodes - Chain node data
 * @returns Whether the copy succeeded
 */
export function copyChainMermaid(nodes: ChainExportNode[]): Promise<Bool> {
  const lines: Str[] = ['flowchart TD'];
  const nodeIds: Map<Str, Str> = new Map();

  // Assign safe Mermaid IDs
  for (const node of nodes) {
    const safeId: Str = node.id.replaceAll(/[^\w]/g, '_');
    nodeIds.set(node.id, safeId);
    const shape: Str = node.parentId === '' ? `[["${node.label}"]]` : `["${node.label}"]`;
    lines.push(`  ${safeId}${shape}`);
  }

  // Add edges
  for (const node of nodes) {
    if (node.parentId === '') {
      continue;
    }
    const fromId: Str = nodeIds.get(node.parentId) ?? node.parentId;
    const toId: Str = nodeIds.get(node.id) ?? node.id;
    const label: Str = mermaidEdgeLabel(node.kind);
    lines.push(`  ${fromId} -->${label} ${toId}`);
  }

  return clipboardCopy(lines.join('\n'));
}

/**
 * Export chain nodes as DOT (Graphviz) syntax and copy to clipboard.
 *
 * @param nodes - Chain node data
 * @param componentName - Root component name
 * @returns Whether the copy succeeded
 */
export function copyChainDot(nodes: ChainExportNode[], componentName: Str): Promise<Bool> {
  const lines: Str[] = [
    `digraph "${componentName}" {`,
    '  rankdir=TB;',
    '  node [shape=box, style="rounded,filled", fontname="sans-serif", fontsize=11];',
    '',
  ];

  const nodeIds: Map<Str, Str> = new Map();

  // Define nodes
  for (const node of nodes) {
    const safeId: Str = node.id.replaceAll(/[^\w]/g, '_');
    nodeIds.set(node.id, safeId);
    const fill: Str = dotFillColor(node);
    lines.push(`  ${safeId} [label="${node.label}", fillcolor="${fill}"];`);
  }

  lines.push('');

  // Define edges
  for (const node of nodes) {
    if (node.parentId === '') {
      continue;
    }
    const fromId: Str = nodeIds.get(node.parentId) ?? node.parentId;
    const toId: Str = nodeIds.get(node.id) ?? node.id;
    const attrs: Str = node.kind === 'default' ? '' : `label="${node.kind}"`;
    lines.push(`  ${fromId} -> ${toId}${attrs ? ` [${attrs}]` : ''};`);
  }

  lines.push('}');

  return clipboardCopy(lines.join('\n'));
}

/**
 * Export chain nodes as CSV and copy to clipboard.
 * Columns: Name, Kind, Category, Parent.
 *
 * @param nodes - Chain node data
 * @returns Whether the copy succeeded
 */
export function copyChainCsv(nodes: ChainExportNode[]): Promise<Bool> {
  const lines: Str[] = ['Name,Kind,Category,Parent'];
  for (const node of nodes) {
    const parent: Str =
      node.parentId === '' ? '' : (nodes.find((n) => n.id === node.parentId)?.label ?? '');
    lines.push(`"${node.label}","${node.kind}","${node.category}","${parent}"`);
  }
  return clipboardCopy(lines.join('\n'));
}

/**
 * Export chain nodes as PlantUML syntax and copy to clipboard.
 *
 * @param nodes - Chain node data
 * @param componentName - Root component name
 * @returns Whether the copy succeeded
 */
export function copyChainPlantUml(nodes: ChainExportNode[], componentName: Str): Promise<Bool> {
  const lines: Str[] = ['@startuml', `title ${componentName} Dependencies`, ''];

  const nodeIds: Map<Str, Str> = new Map();

  for (const node of nodes) {
    const safeId: Str = node.id.replaceAll(/[^\w]/g, '_');
    nodeIds.set(node.id, safeId);
    const stereotype: Str =
      node.category === 'component' ? '<<component>>' : `<<${node.category}>>`;
    lines.push(`rectangle "${node.label}" as ${safeId} ${stereotype}`);
  }

  lines.push('');

  for (const node of nodes) {
    if (node.parentId === '') {
      continue;
    }
    const fromId: Str = nodeIds.get(node.parentId) ?? node.parentId;
    const toId: Str = nodeIds.get(node.id) ?? node.id;
    const label: Str = node.kind === 'default' ? '' : ` : ${node.kind}`;
    lines.push(`${fromId} --> ${toId}${label}`);
  }

  lines.push('', '@enduml');
  return clipboardCopy(lines.join('\n'));
}

/**
 * Export chain nodes as an indented Markdown list and copy to clipboard.
 *
 * @param nodes - Chain node data
 * @param componentName - Root component name
 * @returns Whether the copy succeeded
 */
export function copyChainMarkdown(nodes: ChainExportNode[], componentName: Str): Promise<Bool> {
  const lines: Str[] = [`# ${componentName} — Dependency Chain`, ''];

  // Build parent→children map
  const childrenOf: Map<Str, ChainExportNode[]> = new Map();
  for (const node of nodes) {
    const siblings: ChainExportNode[] = childrenOf.get(node.parentId) ?? [];
    siblings.push(node);
    childrenOf.set(node.parentId, siblings);
  }

  /**
   * Recursively render a node and its children as indented Markdown.
   *
   * @param nodeId - ID of the current node
   * @param depth - Indentation depth
   */
  function renderNode(nodeId: Str, depth: Num): void {
    const children: ChainExportNode[] = childrenOf.get(nodeId) ?? [];
    for (const child of children) {
      const indent: Str = '  '.repeat(depth);
      const kindSuffix: Str = child.kind === 'default' ? '' : ` *(${child.kind})*`;
      const catBadge: Str = child.category === 'component' ? '' : ` \`${child.category}\``;
      lines.push(`${indent}- **${child.label}**${kindSuffix}${catBadge}`);
      renderNode(child.id, (depth + 1) as Num);
    }
  }

  // Start from root (parentId === '')
  const roots: ChainExportNode[] = nodes.filter((n) => n.parentId === '');
  for (const root of roots) {
    lines.push(`- **${root.label}** *(root)*`);
    renderNode(root.id, 1 as Num);
  }

  return clipboardCopy(lines.join('\n'));
}

/* ------------------------------------------------------------------ */
/*  Standalone HTML (compiled Svelte)                                  */
/* ------------------------------------------------------------------ */

/**
 * Download a compiled, self-contained standalone HTML file for a Svelte component.
 * Calls the server-side `/api/lens/compile-standalone` endpoint which runs
 * the Svelte compiler + esbuild bundler + Tailwind CSS generator.
 *
 * The resulting HTML file is fully interactive — it contains the compiled
 * component JS, Svelte runtime, and scoped Tailwind CSS all inlined.
 *
 * @param componentDir - Component directory name (e.g. 'button')
 * @param props - Props to pass to the component
 * @param children - Text content for children/slots
 * @param darkMode - Whether dark mode is active
 * @param theme - Active theme name
 * @returns Whether the download succeeded
 */
export async function downloadStandaloneHtml(
  componentDir: Str,
  props?: Record<Str, unknown>,
  children?: Str,
  darkMode?: Bool,
  theme?: Str,
): Promise<Bool> {
  try {
    const response: Response = await fetch('/api/lens/compile-standalone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        componentDir,
        props: props ?? {},
        children: children ?? '',
        darkMode: darkMode ?? false,
        theme: theme ?? '',
      }),
    });

    if (!response.ok) {
      return false as Bool;
    }

    const blob: Blob = await response.blob();
    downloadBlob(blob, `${componentDir}-standalone.html`);
    return true as Bool;
  } catch {
    /* Network/fetch error — standalone HTML compilation unavailable */
    return false as Bool;
  }
}

export { ExportFormatSchema, ExportOptionsSchema, ChainExportNodeSchema };
export type { ExportFormat, ExportOptions, ChainExportNode };
