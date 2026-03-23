<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema, NumSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';
  import { LensStatsDataSchema } from './types.js';

  /** Schema for the LensStats component props. */
  export const LensStatsPropsSchema = v.strictObject({
    /** Unique card key for identifying this stats instance. @values variant:default, variant:secondary, default */
    cardKey: StrSchema,
    /** Callback fired when stats collection completes. */
    onstats: v.custom<(key: string, data: v.InferOutput<typeof LensStatsDataSchema>) => void>(
      (val: unknown): boolean => typeof val === 'function',
    ),
    /** Total prop count for prop coverage metric. @values 0, 5, 10, 50 */
    propsTotal: v.optional(NumSchema, 0),
    /** Count of props with default values for prop coverage metric. @values 0, 5, 10, 50 */
    propsWithDefaults: v.optional(NumSchema, 0),
    /** Child content to wrap and measure. */
    children: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
  });
  /** Props for the LensStats component. */
  export type LensStatsProps = v.InferOutput<typeof LensStatsPropsSchema>;
</script>

<script lang="ts">
  /**
   * Wrapper component that measures performance statistics of its children.
   *
   * Collects mount timing, DOM analysis, accessibility audit, console
   * capture data, event listener counts, heading hierarchy, landmarks,
   * and focus order issues on mount, then reports via the `onstats` callback.
   *
   * @example
   * ```svelte
   * <LensStats cardKey="button:default" {onstats} propsTotal={5} propsWithDefaults={3}>
   *   <Button>Click me</Button>
   * </LensStats>
   * ```
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import { onMount } from 'svelte';
  import type {
    A11yAudit,
    AriaIssue,
    BudgetLevel,
    CapturedConsoleMessage,
    ContrastIssue,
    FocusOrderIssue,
    HeadingInfo,
    LayoutShiftSource,
    LensStatsData,
    MetricBudget,
    TabOrderEntry,
    UnlabeledElement,
    WebVitals,
  } from './types.js';

  const {
    cardKey,
    onstats,
    propsTotal = 0,
    propsWithDefaults = 0,
    children,
  }: LensStatsProps = $props();

  /** Reference to the wrapper div for DOM traversal. */
  let wrapperRef: HTMLDivElement | undefined = $state(undefined);

  /* ------------------------------------------------------------------ */
  /*  Budget thresholds                                                 */
  /* ------------------------------------------------------------------ */

  /** Mount time thresholds in milliseconds. */
  const MOUNT_GREEN: Num = 16;
  const MOUNT_YELLOW: Num = 50;

  /** DOM node count thresholds. */
  const NODES_GREEN: Num = 100;
  const NODES_YELLOW: Num = 500;

  /** DOM depth thresholds. */
  const DEPTH_GREEN: Num = 10;
  const DEPTH_YELLOW: Num = 20;

  /** Re-render count thresholds. */
  const RERENDER_GREEN: Num = 0;
  const RERENDER_YELLOW: Num = 3;

  /** Event listener count thresholds. */
  const LISTENERS_GREEN: Num = 10;
  const LISTENERS_YELLOW: Num = 30;

  /** CLS score thresholds (matches Google's page-level CLS thresholds). */
  const CLS_GREEN: Num = 0;
  const CLS_YELLOW: Num = 0.1;

  /** Long task count thresholds. */
  const LONG_TASK_COUNT_GREEN: Num = 0;
  const LONG_TASK_COUNT_YELLOW: Num = 2;

  /** Worst long task duration thresholds in ms. */
  const LONG_TASK_MS_GREEN: Num = 50;
  const LONG_TASK_MS_YELLOW: Num = 100;

  /** First Paint / First Contentful Paint thresholds in ms. */
  const PAINT_GREEN: Num = 100;
  const PAINT_YELLOW: Num = 300;

  /** FCP (First Contentful Paint) thresholds in ms (Google's Web Vitals). */
  const FCP_GREEN: Num = 1800;
  const FCP_YELLOW: Num = 3000;

  /** LCP (Largest Contentful Paint) thresholds in ms (Google's Web Vitals). */
  const LCP_GREEN: Num = 2500;
  const LCP_YELLOW: Num = 4000;

  /** FID (First Input Delay) thresholds in ms (Google's Web Vitals). */
  const FID_GREEN: Num = 100;
  const FID_YELLOW: Num = 300;

  /** INP (Interaction to Next Paint) thresholds in ms (Google's Web Vitals — replaced FID as Core Web Vital in March 2024). */
  const INP_GREEN: Num = 200;
  const INP_YELLOW: Num = 500;

  /** TTFB (Time to First Byte) thresholds in ms (Google's Web Vitals). */
  const TTFB_GREEN: Num = 800;
  const TTFB_YELLOW: Num = 1800;

  /**
   * Evaluate a numeric metric against green/yellow/red thresholds.
   *
   * @param value - The measured value
   * @param greenMax - Maximum value for green (inclusive)
   * @param yellowMax - Maximum value for yellow (inclusive)
   * @returns Budget level
   */
  function evaluateBudget(value: Num, greenMax: Num, yellowMax: Num): BudgetLevel {
    if (value <= greenMax) return 'green';
    if (value <= yellowMax) return 'yellow';
    return 'red';
  }

  /**
   * Format threshold range string for display.
   *
   * @param greenMax - Green threshold max
   * @param yellowMax - Yellow threshold max
   * @param unit - Unit suffix (e.g., "ms", "nodes")
   * @returns Formatted threshold string
   */
  function formatThresholds(greenMax: Num, yellowMax: Num, unit: Str): Str {
    return `🟢 ≤${greenMax}${unit} · 🟡 ≤${yellowMax}${unit} · 🔴 >${yellowMax}${unit}`;
  }

  /**
   * Calculate maximum DOM tree depth from a root element.
   *
   * @param el - Root element to traverse
   * @returns Maximum nesting depth (1-based)
   */
  function calcDomDepth(el: Element): Num {
    let maxDepth: Num = 0;
    for (const childEl of el.children) {
      const childDepth: Num = calcDomDepth(childEl);
      if (childDepth > maxDepth) maxDepth = childDepth;
    }
    return maxDepth + 1;
  }

  /**
   * Count text nodes within an element tree.
   *
   * @param el - Root element to traverse
   * @returns Number of TEXT_NODE children
   */
  function countTextNodes(el: Element): Num {
    let count: Num = 0;
    const walker: TreeWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) count++;
    return count;
  }

  /**
   * Check if an element has an accessible label.
   *
   * @param el - Element to check
   * @returns True if element has aria-label, aria-labelledby, or associated label
   */
  function hasAccessibleLabel(el: Element): Bool {
    if (el.getAttribute('aria-label')) return true;
    if (el.getAttribute('aria-labelledby')) return true;
    if (el.getAttribute('title')) return true;
    const id: Str | null = el.getAttribute('id');
    if (id && document.querySelector(`label[for="${id}"]`)) return true;
    /* Check for wrapping <label> */
    if (el.closest('label')) return true;
    return false;
  }

  /**
   * Get a short parent context string for an element.
   *
   * @param el - Element to describe parent of
   * @returns Parent description like "<div class='toolbar'>"
   */
  function getParentContext(el: Element): Str {
    const parent: Element | null = el.parentElement;
    if (!parent) return '';
    const tag: Str = parent.tagName.toLowerCase();
    const cls: Str = parent.className ? String(parent.className).slice(0, 30) : '';
    const role: Str | null = parent.getAttribute('role');
    if (role) return `<${tag} role="${role}">`;
    if (cls) return `<${tag} class="${cls}">`;
    return `<${tag}>`;
  }

  /**
   * Count elements with inline event handler attributes.
   *
   * @param root - Root element to scan
   * @returns Number of elements with onclick, onmousedown, etc.
   */
  function countEventListeners(root: HTMLDivElement): Num {
    const handlerAttrs: Str[] = [
      'onclick',
      'ondblclick',
      'onmousedown',
      'onmouseup',
      'onmousemove',
      'onmouseover',
      'onmouseout',
      'onmouseenter',
      'onmouseleave',
      'onkeydown',
      'onkeyup',
      'onkeypress',
      'onfocus',
      'onblur',
      'onfocusin',
      'onfocusout',
      'onchange',
      'oninput',
      'onsubmit',
      'onreset',
      'onscroll',
      'onwheel',
      'onresize',
      'ontouchstart',
      'ontouchend',
      'ontouchmove',
      'ontouchcancel',
      'onpointerdown',
      'onpointerup',
      'onpointermove',
      'onpointerover',
      'onpointerout',
      'onpointerenter',
      'onpointerleave',
      'onpointercancel',
      'ondragstart',
      'ondrag',
      'ondragend',
      'ondragenter',
      'ondragleave',
      'ondragover',
      'ondrop',
      'oncontextmenu',
      'onselect',
      'oninvalid',
    ];
    let count: Num = 0;
    for (const el of root.querySelectorAll('*')) {
      for (const attr of handlerAttrs) {
        if (el.hasAttribute(attr)) {
          count++;
          break;
        }
      }
    }
    return count;
  }

  /**
   * Audit heading hierarchy for proper ordering.
   *
   * @param root - Root element to scan
   * @returns Heading info array and whether levels are skipped
   */
  function auditHeadings(root: HTMLDivElement): { headings: HeadingInfo[]; skips: Bool } {
    const headings: HeadingInfo[] = [];
    for (const el of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      const level: Num = Number.parseInt(el.tagName.charAt(1), 10);
      headings.push({
        level,
        text: (el.textContent ?? '').trim().slice(0, 60),
      });
    }

    let skips: Bool = false;
    for (let i: Num = 1; i < headings.length; i++) {
      const prev: HeadingInfo | undefined = headings[i - 1];
      const curr: HeadingInfo | undefined = headings[i];
      if (prev && curr && curr.level > prev.level + 1) {
        skips = true;
        break;
      }
    }

    return { headings, skips };
  }

  /**
   * Detect landmark regions in the component.
   *
   * @param root - Root element to scan
   * @returns Array of landmark names found
   */
  function detectLandmarks(root: HTMLDivElement): Str[] {
    const landmarkSelectors: Array<{ selector: Str; name: Str }> = [
      { selector: 'main, [role="main"]', name: 'main' },
      { selector: 'nav, [role="navigation"]', name: 'navigation' },
      { selector: 'header, [role="banner"]', name: 'banner' },
      { selector: 'footer, [role="contentinfo"]', name: 'contentinfo' },
      { selector: 'aside, [role="complementary"]', name: 'complementary' },
      { selector: '[role="search"]', name: 'search' },
      { selector: '[role="form"]', name: 'form' },
      { selector: '[role="region"][aria-label], [role="region"][aria-labelledby]', name: 'region' },
    ];

    const found: Str[] = [];
    for (const lm of landmarkSelectors) {
      if (root.querySelector(lm.selector)) {
        found.push(lm.name);
      }
    }
    return found;
  }

  /**
   * Detect positive tabindex values (focus order anti-pattern).
   *
   * @param root - Root element to scan
   * @returns Array of focus order issues
   */
  function detectFocusOrderIssues(root: HTMLDivElement): FocusOrderIssue[] {
    const issues: FocusOrderIssue[] = [];
    for (const el of root.querySelectorAll('[tabindex]')) {
      const tabVal: Num = Number.parseInt(el.getAttribute('tabindex') ?? '0', 10);
      if (tabVal > 0) {
        issues.push({
          tag: el.tagName.toLowerCase(),
          tabindex: tabVal,
          text: (el.textContent ?? '').trim().slice(0, 40),
        });
      }
    }
    return issues;
  }

  /**
   * Build a tab order listing of focusable elements in their navigation order.
   * Elements with tabindex > 0 come first (sorted by tabindex), then tabindex=0 / no tabindex in DOM order.
   *
   * @param root - Root element to scan
   * @returns Array of tab order entries (max 20)
   */
  function buildTabOrder(root: HTMLDivElement): TabOrderEntry[] {
    const focusableSelector: Str =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elements: Element[] = [...root.querySelectorAll(focusableSelector)];
    const entries: TabOrderEntry[] = [];

    /* Separate positive tabindex from natural order */
    const positive: Array<{ el: Element; idx: Num }> = [];
    const natural: Element[] = [];

    for (const el of elements) {
      const tabVal: Num = Number.parseInt(el.getAttribute('tabindex') ?? '0', 10);
      if (tabVal > 0) {
        positive.push({ el, idx: tabVal });
      } else {
        natural.push(el);
      }
    }

    /* Positive tabindex comes first, sorted ascending */
    positive.sort((a, b): Num => a.idx - b.idx);

    const ordered: Element[] = [...positive.map((p) => p.el), ...natural];

    for (const el of ordered.slice(0, 20)) {
      const tabVal: Num = Number.parseInt(el.getAttribute('tabindex') ?? '0', 10);
      entries.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? '').trim().slice(0, 40),
        tabindex: tabVal,
      });
    }

    return entries;
  }

  /**
   * Parse a CSS color string to RGB components.
   * Supports rgb(), rgba(), and hex formats via a temporary canvas context.
   *
   * @param color - CSS color string
   * @returns RGB tuple [r, g, b] with values 0-255, or null if parsing fails
   */
  function parseColorToRgb(color: Str): [Num, Num, Num] | null {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    const rgbMatch: RegExpMatchArray | null = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    }
    return null;
  }

  /**
   * Calculate relative luminance from an sRGB color channel value.
   *
   * @param channel - sRGB channel value (0-255)
   * @returns Linear luminance contribution
   */
  function srgbToLinear(channel: Num): Num {
    const c: Num = channel / 255;
    return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }

  /**
   * Calculate WCAG 2.1 relative luminance from RGB values.
   *
   * @param r - Red channel (0-255)
   * @param g - Green channel (0-255)
   * @param b - Blue channel (0-255)
   * @returns Relative luminance (0 to 1)
   */
  function relativeLuminance(r: Num, g: Num, b: Num): Num {
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  }

  /**
   * Calculate WCAG contrast ratio between two colors.
   *
   * @param rgb1 - First color as [r, g, b]
   * @param rgb2 - Second color as [r, g, b]
   * @returns Contrast ratio (1 to 21)
   */
  function contrastRatio(rgb1: [Num, Num, Num], rgb2: [Num, Num, Num]): Num {
    const l1: Num = relativeLuminance(...rgb1);
    const l2: Num = relativeLuminance(...rgb2);
    const lighter: Num = Math.max(l1, l2);
    const darker: Num = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get the effective background color of an element by traversing up the DOM tree.
   * Stops when a non-transparent background is found.
   *
   * @param el - Starting element
   * @returns RGB tuple or null if all backgrounds are transparent
   */
  function getEffectiveBackground(el: Element): [Num, Num, Num] | null {
    let current: Element | null = el;
    while (current) {
      const style: CSSStyleDeclaration = getComputedStyle(current);
      const bg: Str = style.backgroundColor;
      const rgb: [Num, Num, Num] | null = parseColorToRgb(bg);
      if (rgb) return rgb;
      current = current.parentElement;
    }
    /* Default to white if no background found */
    return [255, 255, 255];
  }

  /**
   * Audit text elements for WCAG AA color contrast compliance.
   * Samples up to 20 text-containing elements to keep analysis fast.
   *
   * @param root - Root element to scan
   * @returns Array of contrast issues found
   */
  function auditContrast(root: HTMLDivElement): ContrastIssue[] {
    const issues: ContrastIssue[] = [];
    const textElements: Element[] = [...root.querySelectorAll('*')]
      .filter((el: Element): boolean => {
        const text: Str = (el.textContent ?? '').trim();
        if (text.length === 0) return false;
        /* Only check leaf-ish elements with direct text content */
        if (el.children.length > 3) return false;
        return true;
      })
      .slice(0, 20);

    for (const el of textElements) {
      const style: CSSStyleDeclaration = getComputedStyle(el);
      const textRgb: [Num, Num, Num] | null = parseColorToRgb(style.color);
      const bgRgb: [Num, Num, Num] | null = getEffectiveBackground(el);
      if (!textRgb || !bgRgb) continue;

      const ratio: Num = Math.round(contrastRatio(textRgb, bgRgb) * 100) / 100;
      const fontSize: Num = Number.parseFloat(style.fontSize);
      const fontWeight: Num = Number(style.fontWeight) || 400;
      /* WCAG: large text is ≥18pt (24px) or ≥14pt (18.66px) bold */
      const isLargeText: Bool = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const required: Num = isLargeText ? 3 : 4.5;

      if (ratio < required) {
        issues.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 40),
          ratio,
          required,
          textColor: style.color,
          bgColor: style.backgroundColor,
        });
      }
    }

    return issues;
  }

  /**
   * Count images missing alt attributes.
   *
   * @param root - Root element to scan
   * @returns Count of images without alt text
   */
  function countImagesWithoutAlt(root: HTMLDivElement): Num {
    let count: Num = 0;
    for (const img of root.querySelectorAll('img')) {
      if (!img.hasAttribute('alt')) count++;
    }
    return count;
  }

  /**
   * Audit ARIA attribute usage for common misuse patterns.
   *
   * @param root - Root element to scan
   * @returns Array of ARIA issues found (max 10)
   */
  function auditAria(root: HTMLDivElement): AriaIssue[] {
    const issues: AriaIssue[] = [];
    const nonInteractiveTags: Set<Str> = new Set([
      'div',
      'span',
      'p',
      'section',
      'article',
      'header',
      'footer',
      'main',
      'aside',
      'nav',
    ]);

    for (const el of root.querySelectorAll('*')) {
      if (issues.length >= 10) break;
      const tag: Str = el.tagName.toLowerCase();
      const text: Str = (el.textContent ?? '').trim().slice(0, 40);
      const role: Str | null = el.getAttribute('role');
      const ariaLabel: Str | null = el.getAttribute('aria-label');
      const ariaLabelledby: Str | null = el.getAttribute('aria-labelledby');

      /* aria-label on non-interactive element without role */
      if (
        ariaLabel &&
        !role &&
        nonInteractiveTags.has(tag) &&
        tag !== 'nav' &&
        tag !== 'main' &&
        tag !== 'aside'
      ) {
        issues.push({ tag, text, issue: 'aria-label on non-interactive element without a role' });
      }

      /* aria-labelledby pointing to non-existent ID */
      if (ariaLabelledby) {
        const [targetId]: Str[] = ariaLabelledby.split(' ');
        if (
          targetId &&
          targetId.length > 0 &&
          !document.querySelector(`#${CSS.escape(targetId)}`)
        ) {
          issues.push({
            tag,
            text,
            issue: `aria-labelledby references non-existent id="${targetId}"`,
          });
        }
      }

      /* role="presentation" or role="none" on focusable element */
      if (
        (role === 'presentation' || role === 'none') &&
        (tag === 'button' || tag === 'a' || tag === 'input')
      ) {
        issues.push({ tag, text, issue: `role="${role}" on focusable element removes semantics` });
      }

      /* aria-hidden="true" on focusable element */
      if (el.getAttribute('aria-hidden') === 'true') {
        const isFocusable: Bool =
          tag === 'a' ||
          tag === 'button' ||
          tag === 'input' ||
          tag === 'select' ||
          tag === 'textarea' ||
          el.hasAttribute('tabindex');
        if (isFocusable) {
          issues.push({
            tag,
            text,
            issue:
              'aria-hidden="true" on focusable element — hidden from screen readers but still tabbable',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Count SVG elements without accessible labels.
   * Checks for aria-label, aria-labelledby, <title> child, or role="presentation"/"img".
   *
   * @param root - Root element to scan
   * @returns Count of SVGs without accessible labels
   */
  function countSvgsWithoutLabel(root: HTMLDivElement): Num {
    let count: Num = 0;
    for (const svg of root.querySelectorAll('svg')) {
      const hasAriaLabel: Bool = Boolean(svg.getAttribute('aria-label'));
      const hasAriaLabelledby: Bool = Boolean(svg.getAttribute('aria-labelledby'));
      const hasTitle: Bool = Boolean(svg.querySelector('title'));
      const role: Str | null = svg.getAttribute('role');
      const isDecorative: Bool =
        role === 'presentation' || role === 'none' || svg.getAttribute('aria-hidden') === 'true';

      if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle && !isDecorative) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if any CSS animations/transitions in the component have prefers-reduced-motion overrides.
   * Also counts elements with active animations or transitions.
   *
   * @param root - Root element to scan
   * @returns Object with reducedMotion override detection and animated element count
   */
  function auditAnimations(root: HTMLDivElement): {
    hasReducedMotionOverride: Bool;
    animatedElementCount: Num;
  } {
    let animatedCount: Num = 0;
    let hasReducedMotionOverride: Bool = false;

    for (const el of root.querySelectorAll('*')) {
      const style: CSSStyleDeclaration = getComputedStyle(el);
      const hasAnimation: Bool = style.animationName !== 'none' && style.animationName !== '';
      const hasTransition: Bool =
        style.transitionProperty !== 'none' &&
        style.transitionProperty !== '' &&
        style.transitionProperty !== 'all' &&
        style.transitionDuration !== '0s';

      if (hasAnimation || hasTransition) {
        animatedCount++;
      }
    }

    /* Check stylesheets for prefers-reduced-motion media queries */
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (
              rule instanceof CSSMediaRule &&
              rule.conditionText?.includes('prefers-reduced-motion')
            ) {
              hasReducedMotionOverride = true;
              break;
            }
          }
        } catch {
          /* Cross-origin stylesheet — cannot read rules, skip */
        }
        if (hasReducedMotionOverride) break;
      }
    } catch {
      /* StyleSheets API unavailable — leave as false */
    }

    return { hasReducedMotionOverride, animatedElementCount: animatedCount };
  }

  /**
   * Run accessibility audit on a DOM subtree.
   *
   * @param root - Root element to audit
   * @returns Accessibility audit results
   */
  function auditAccessibility(root: HTMLDivElement): A11yAudit {
    const focusableSelector: Str =
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable: NodeListOf<Element> = root.querySelectorAll(focusableSelector);
    let labeledCount: Num = 0;
    const unlabeled: UnlabeledElement[] = [];

    for (const el of focusable) {
      if (hasAccessibleLabel(el)) {
        labeledCount++;
      } else {
        const textContent: Str = (el.textContent ?? '').trim().slice(0, 40);
        /* Skip elements that have visible text content — screen readers can use it */
        if (textContent.length === 0) {
          unlabeled.push({
            tag: el.tagName.toLowerCase(),
            classes: el.className ? String(el.className).slice(0, 60) : '',
            text: textContent,
            parentContext: getParentContext(el),
          });
        }
      }
    }

    const rolesSet: Set<Str> = new Set<Str>();
    for (const roleEl of root.querySelectorAll('[role]')) {
      const role: Str | null = roleEl.getAttribute('role');
      if (role) rolesSet.add(role);
    }

    const buttons: NodeListOf<Element> = root.querySelectorAll('button, [role="button"]');
    const links: NodeListOf<Element> = root.querySelectorAll('a[href], [role="link"]');
    const inputs: NodeListOf<Element> = root.querySelectorAll(
      'input, select, textarea, [role="textbox"], [role="combobox"]',
    );

    const headingResult: { headings: HeadingInfo[]; skips: Bool } = auditHeadings(root);
    const landmarks: Str[] = detectLandmarks(root);
    const focusOrderIssues: FocusOrderIssue[] = detectFocusOrderIssues(root);
    const eventListenerCount: Num = countEventListeners(root);
    const tabOrder: TabOrderEntry[] = buildTabOrder(root);
    const contrastIssues: ContrastIssue[] = auditContrast(root);
    const imagesWithoutAlt: Num = countImagesWithoutAlt(root);
    const ariaIssues: AriaIssue[] = auditAria(root);
    const svgsWithoutLabel: Num = countSvgsWithoutLabel(root);
    const animationResult: { hasReducedMotionOverride: Bool; animatedElementCount: Num } =
      auditAnimations(root);

    return {
      focusableCount: focusable.length,
      labeledCount,
      roles: [...rolesSet].toSorted((a: Str, b: Str): Num => a.localeCompare(b)),
      unlabeled,
      buttonCount: buttons.length,
      linkCount: links.length,
      inputCount: inputs.length,
      headings: headingResult.headings,
      headingSkipsLevel: headingResult.skips,
      landmarks,
      focusOrderIssues,
      eventListenerCount,
      tabOrder,
      contrastIssues,
      imagesWithoutAlt,
      ariaIssues,
      svgsWithoutLabel,
      hasReducedMotionOverride: animationResult.hasReducedMotionOverride,
      animatedElementCount: animationResult.animatedElementCount,
    };
  }

  /**
   * Determine overall health from a list of budget evaluations.
   * Returns the worst (most severe) level found.
   *
   * @param budgets - Array of metric budgets
   * @returns Worst budget level
   */
  function worstLevel(budgets: MetricBudget[]): BudgetLevel {
    let worst: BudgetLevel = 'green';
    for (const b of budgets) {
      if (b.level === 'red') return 'red';
      if (b.level === 'yellow') worst = 'yellow';
    }
    return worst;
  }

  /**
   * Build a single MetricBudget entry with description and thresholds.
   *
   * @param label - Display label
   * @param value - Formatted value
   * @param measured - Raw numeric value for budget evaluation
   * @param greenMax - Green threshold
   * @param yellowMax - Yellow threshold
   * @param unit - Unit suffix for threshold display
   * @param description - Human-readable explanation
   * @returns Complete MetricBudget
   */
  function buildBudget(
    label: Str,
    value: Str,
    measured: Num,
    greenMax: Num,
    yellowMax: Num,
    unit: Str,
    description: Str,
  ): MetricBudget {
    return {
      label,
      value,
      level: evaluateBudget(measured, greenMax, yellowMax),
      description,
      thresholds: formatThresholds(greenMax, yellowMax, unit),
      greenMax,
      yellowMax,
    };
  }

  /**
   * Check whether a PerformanceObserver entry type is supported.
   *
   * @param entryType - Entry type name to check
   * @returns True if the browser supports this entry type
   */
  function supportsEntryType(entryType: Str): Bool {
    try {
      return (
        typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes !== undefined &&
        PerformanceObserver.supportedEntryTypes.includes(entryType)
      );
    } catch {
      /* PerformanceObserver not available (e.g., SSR or older browser) */
      return false;
    }
  }

  /**
   * Describe a DOM element for layout shift attribution.
   *
   * @param el - The shifted DOM element (may be null)
   * @returns Human-readable tag + class string
   */
  function describeElement(el: Node | null): Str {
    if (!el || !(el instanceof Element)) return '(unknown)';
    const tag: Str = el.tagName.toLowerCase();
    const cls: Str = el.className ? String(el.className).slice(0, 40) : '';
    return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
  }

  /**
   * Collect component-scoped Web Vitals using PerformanceObserver.
   * Sets up observers for layout-shift, longtask, paint, and largest-contentful-paint.
   * Returns the vitals data and a cleanup function to disconnect observers.
   *
   * @param wrapper - The component wrapper element
   * @param mountStart - Timestamp when mount began (performance.now())
   * @returns Object with vitals data and cleanup function
   */
  function collectVitals(
    wrapper: HTMLDivElement,
    mountStart: Num,
  ): { vitals: WebVitals; cleanup: () => void } {
    const observers: PerformanceObserver[] = [];

    const vitals: WebVitals = {
      clsScore: 0,
      clsShiftCount: 0,
      clsSources: [],
      longTaskCount: 0,
      worstLongTaskMs: -1,
      paintTimeMs: -1,
      fcpTimeMs: -1,
      isLcpComponent: false,
      lcpTimeMs: -1,
      lcpElement: '',
      fidMs: -1,
      inpMs: -1,
      ttfbMs: -1,
      supported: false,
    };

    const hasLayoutShift: Bool = supportsEntryType('layout-shift');
    const hasLongTask: Bool = supportsEntryType('longtask');
    const hasPaint: Bool = supportsEntryType('paint');
    const hasLcp: Bool = supportsEntryType('largest-contentful-paint');
    const hasFid: Bool = supportsEntryType('first-input');
    const hasEvent: Bool = supportsEntryType('event');
    vitals.supported = hasLayoutShift || hasLongTask || hasPaint || hasLcp || hasFid || hasEvent;

    /* ---- Layout Shift (CLS) ---- */
    if (hasLayoutShift) {
      const clsObserver: PerformanceObserver = new PerformanceObserver(
        (list: PerformanceObserverEntryList): Void => {
          for (const entry of list.getEntries()) {
            /* Skip shifts triggered by user input (hadRecentInput) */
            const shift: PerformanceEntry & {
              hadRecentInput?: boolean;
              value?: number;
              sources?: Array<{ node?: Node }>;
            } = entry;
            if (shift.hadRecentInput) continue;

            const shiftValue: Num = shift.value ?? 0;
            const sources: Array<{ node?: Node }> = shift.sources ?? [];

            /* Check if any source node is within our component */
            let componentShift: Bool = false;
            for (const src of sources) {
              if (src.node && src.node instanceof Element && wrapper.contains(src.node)) {
                componentShift = true;
                if (vitals.clsSources.length < 3) {
                  vitals.clsSources.push({
                    tag: src.node.tagName.toLowerCase(),
                    selector: describeElement(src.node),
                    shiftValue: Math.round(shiftValue * 10_000) / 10_000,
                  });
                }
              }
            }

            if (componentShift) {
              vitals.clsScore = Math.round((vitals.clsScore + shiftValue) * 10_000) / 10_000;
              vitals.clsShiftCount++;
            }
          }
        },
      );
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);
    }

    /* ---- Long Tasks ---- */
    if (hasLongTask) {
      const ltObserver: PerformanceObserver = new PerformanceObserver(
        (list: PerformanceObserverEntryList): Void => {
          for (const entry of list.getEntries()) {
            /* Only count tasks that overlap with mount window (mountStart to mountStart + 1000ms) */
            const taskEnd: Num = entry.startTime + entry.duration;
            if (taskEnd >= mountStart && entry.startTime <= mountStart + 1000) {
              vitals.longTaskCount++;
              if (entry.duration > vitals.worstLongTaskMs) {
                vitals.worstLongTaskMs = Math.round(entry.duration * 100) / 100;
              }
            }
          }
        },
      );
      ltObserver.observe({ type: 'longtask', buffered: true });
      observers.push(ltObserver);
    }

    /* ---- Paint Timing (FP / FCP) ---- */
    if (hasPaint) {
      const paintObserver: PerformanceObserver = new PerformanceObserver(
        (list: PerformanceObserverEntryList): Void => {
          for (const entry of list.getEntries()) {
            const relativeTime: Num = Math.round((entry.startTime - mountStart) * 100) / 100;
            if (entry.name === 'first-paint' && vitals.paintTimeMs < 0) {
              vitals.paintTimeMs = relativeTime;
            }
            if (entry.name === 'first-contentful-paint' && vitals.fcpTimeMs < 0) {
              vitals.fcpTimeMs = relativeTime;
            }
          }
        },
      );
      paintObserver.observe({ type: 'paint', buffered: true });
      observers.push(paintObserver);
    }

    /* ---- Largest Contentful Paint (LCP) ---- */
    if (hasLcp) {
      const lcpObserver: PerformanceObserver = new PerformanceObserver(
        (list: PerformanceObserverEntryList): Void => {
          for (const entry of list.getEntries()) {
            const lcpEntry: PerformanceEntry & { element?: Element; startTime: number } = entry;
            if (lcpEntry.element && wrapper.contains(lcpEntry.element)) {
              vitals.isLcpComponent = true;
              vitals.lcpTimeMs = Math.round(lcpEntry.startTime * 100) / 100;
              vitals.lcpElement = describeElement(lcpEntry.element);
            }
          }
        },
      );
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);
    }

    /* ---- First Input Delay (FID) ---- */
    if (hasFid) {
      const fidObserver: PerformanceObserver = new PerformanceObserver(
        (list: PerformanceObserverEntryList): Void => {
          for (const entry of list.getEntries()) {
            const fidEntry: PerformanceEntry & { target?: Element; processingStart?: number } =
              entry;
            /* Only attribute FID to this component if the interaction target is within wrapper */
            if (
              fidEntry.target &&
              fidEntry.target instanceof Element &&
              wrapper.contains(fidEntry.target)
            ) {
              const delay: Num = (fidEntry.processingStart ?? entry.startTime) - entry.startTime;
              vitals.fidMs = Math.round(delay * 100) / 100;
            }
          }
        },
      );
      fidObserver.observe({ type: 'first-input', buffered: true });
      observers.push(fidObserver);
    }

    /* ---- Interaction to Next Paint (INP) ---- */
    if (hasEvent) {
      const inpObserver: PerformanceObserver = new PerformanceObserver(
        (list: PerformanceObserverEntryList): Void => {
          for (const entry of list.getEntries()) {
            const eventEntry: PerformanceEntry & {
              target?: Element;
              processingStart?: number;
              processingEnd?: number;
            } = entry;
            /* Only attribute INP to this component if the interaction target is within wrapper */
            if (
              eventEntry.target &&
              eventEntry.target instanceof Element &&
              wrapper.contains(eventEntry.target)
            ) {
              const duration: Num = entry.duration as Num;
              /* INP is the worst (highest) interaction latency */
              if (duration > vitals.inpMs) {
                vitals.inpMs = Math.round(duration * 100) / 100;
              }
            }
          }
        },
      );
      // durationThreshold is part of the Event Timing API but not yet in TS's PerformanceObserverInit type
      inpObserver.observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit);
      observers.push(inpObserver);
    }

    /* ---- TTFB (Time to First Byte) — page-level from navigation timing ---- */
    try {
      const navEntries: PerformanceEntryList = performance.getEntriesByType('navigation');
      const [firstNav]: PerformanceEntry[] = navEntries;
      if (firstNav) {
        // Navigation timing entry exists — cast to access responseStart/requestStart
        const nav: PerformanceEntry & { responseStart?: number; requestStart?: number } = firstNav;
        if (
          typeof nav.responseStart === 'number' &&
          typeof nav.requestStart === 'number' &&
          nav.responseStart > 0
        ) {
          vitals.ttfbMs = Math.round((nav.responseStart - nav.requestStart) * 100) / 100;
        }
      }
    } catch (_) {
      /* Navigation timing unavailable (e.g., cross-origin iframe) — leave as -1 */
    }

    return {
      vitals,
      cleanup: (): Void => {
        for (const obs of observers) obs.disconnect();
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Mount & collect stats                                             */
  /* ------------------------------------------------------------------ */

  onMount((): (() => void) => {
    if (!wrapperRef)
      return (): Void => {
        /* no-op — wrapper ref not available at mount */
      };

    const mountStart: Num = performance.now();

    /* Capture console messages during mount analysis */
    const captured: CapturedConsoleMessage[] = [];
    const origWarn: typeof console.warn = console.warn;
    const origError: typeof console.error = console.error;

    console.warn = (...args: unknown[]): Void => {
      captured.push({ level: 'warn', message: String(args[0] ?? '') });
      origWarn.apply(console, args);
    };
    console.error = (...args: unknown[]): Void => {
      captured.push({ level: 'error', message: String(args[0] ?? '') });
      origError.apply(console, args);
    };

    /* Start vitals collection immediately (observers accumulate data asynchronously) */
    const vitalsResult: { vitals: WebVitals; cleanup: () => void } = collectVitals(
      wrapperRef,
      mountStart,
    );

    /* Use requestAnimationFrame to measure after paint */
    const rafId: Num = requestAnimationFrame((): Void => {
      const mountTimeMs: Num = Math.round((performance.now() - mountStart) * 100) / 100;

      /* Restore console */
      console.warn = origWarn;
      console.error = origError;

      if (!wrapperRef) return;

      /* DOM stats */
      const allNodes: NodeListOf<Element> = wrapperRef.querySelectorAll('*');
      const nodeCount: Num = allNodes.length;
      const domDepth: Num = calcDomDepth(wrapperRef);
      const textNodeCount: Num = countTextNodes(wrapperRef);

      /* Accessibility audit (includes headings, landmarks, focus order, event listeners) */
      const a11y: A11yAudit = auditAccessibility(wrapperRef);

      /* Memory delta (Chrome only) */
      let memoryDeltaBytes: Num = -1;
      /* Chrome-only performance.memory API — cast needed since TS doesn't type it */
      const perfMemory: { usedJSHeapSize?: number } | undefined = (
        performance as unknown as { memory?: { usedJSHeapSize?: number } }
      ).memory;
      if (perfMemory && typeof perfMemory.usedJSHeapSize === 'number') {
        memoryDeltaBytes = perfMemory.usedJSHeapSize;
      }

      /* Console error count */
      const errorCount: Num = captured.filter((c) => c.level === 'error').length;

      /* Budget evaluations */
      const budgets: MetricBudget[] = [
        buildBudget(
          'Mount Time',
          `${mountTimeMs}ms`,
          mountTimeMs,
          MOUNT_GREEN,
          MOUNT_YELLOW,
          'ms',
          'Time from component mount to first paint. Affects perceived load speed.',
        ),
        buildBudget(
          'Node Count',
          `${nodeCount}`,
          nodeCount,
          NODES_GREEN,
          NODES_YELLOW,
          '',
          'Total DOM elements inside the component. More nodes = slower layout and paint.',
        ),
        buildBudget(
          'DOM Depth',
          `${domDepth}`,
          domDepth,
          DEPTH_GREEN,
          DEPTH_YELLOW,
          '',
          'Maximum nesting depth of the DOM tree. Deep trees slow CSS selector matching.',
        ),
        buildBudget(
          'Re-renders',
          '0',
          0,
          RERENDER_GREEN,
          RERENDER_YELLOW,
          '',
          'DOM mutations after initial mount. Frequent re-renders cause layout thrashing.',
        ),
        {
          label: 'Console Errors',
          value: `${errorCount}`,
          level: errorCount > 0 ? 'red' : 'green',
          description: 'Errors logged to console during component mount. Any error is a red flag.',
          thresholds: '🟢 0 · 🔴 >0',
          greenMax: 0,
          yellowMax: 0,
        },
        {
          label: 'Unlabeled Interactive',
          value: `${a11y.unlabeled.length}`,
          level: a11y.unlabeled.length > 0 ? 'red' : 'green',
          description:
            'Interactive elements (buttons, links, inputs) missing accessible labels for screen readers.',
          thresholds: '🟢 0 · 🔴 >0',
          greenMax: 0,
          yellowMax: 0,
        },
        buildBudget(
          'Event Listeners',
          `${a11y.eventListenerCount}`,
          a11y.eventListenerCount,
          LISTENERS_GREEN,
          LISTENERS_YELLOW,
          '',
          'Elements with inline event handlers. Many listeners can impact memory and performance.',
        ),
      ];

      /* Vitals budgets — only add when the browser supports the APIs */
      const componentVitals: WebVitals = vitalsResult.vitals;
      if (componentVitals.supported) {
        if (supportsEntryType('layout-shift')) {
          budgets.push(
            buildBudget(
              'CLS',
              `${componentVitals.clsScore}`,
              componentVitals.clsScore,
              CLS_GREEN,
              CLS_YELLOW,
              '',
              'Cumulative Layout Shift — visual stability of the component. Lower is better.',
            ),
          );
        }
        if (supportsEntryType('longtask')) {
          const taskLabel: Str =
            componentVitals.longTaskCount === 0 ? 'None' : `${componentVitals.longTaskCount}`;
          budgets.push(
            buildBudget(
              'Long Tasks',
              taskLabel,
              componentVitals.longTaskCount,
              LONG_TASK_COUNT_GREEN,
              LONG_TASK_COUNT_YELLOW,
              '',
              'Tasks blocking the main thread for >50ms during component mount.',
            ),
          );
          if (componentVitals.worstLongTaskMs > 0) {
            budgets.push(
              buildBudget(
                'Worst Task',
                `${componentVitals.worstLongTaskMs}ms`,
                componentVitals.worstLongTaskMs,
                LONG_TASK_MS_GREEN,
                LONG_TASK_MS_YELLOW,
                'ms',
                'Duration of the longest main-thread-blocking task during mount.',
              ),
            );
          }
        }
        /* Paint timing — always show when supported */
        if (supportsEntryType('paint')) {
          const fpLabel: Str =
            componentVitals.paintTimeMs < 0 ? 'Before mount' : `${componentVitals.paintTimeMs}ms`;
          const fpValue: Num = componentVitals.paintTimeMs < 0 ? 0 : componentVitals.paintTimeMs;
          budgets.push(
            buildBudget(
              'First Paint',
              fpLabel,
              fpValue,
              PAINT_GREEN,
              PAINT_YELLOW,
              'ms',
              'First Paint — when the browser first renders any pixel relative to component mount.',
            ),
          );
          const fcpLabel: Str =
            componentVitals.fcpTimeMs < 0 ? 'Before mount' : `${componentVitals.fcpTimeMs}ms`;
          const fcpValue: Num = componentVitals.fcpTimeMs < 0 ? 0 : componentVitals.fcpTimeMs;
          budgets.push(
            buildBudget(
              'FCP',
              fcpLabel,
              fcpValue,
              FCP_GREEN,
              FCP_YELLOW,
              'ms',
              'First Contentful Paint — when the browser first renders text, image, or SVG content (Core Web Vital).',
            ),
          );
        }
        /* LCP — always show when supported */
        if (supportsEntryType('largest-contentful-paint')) {
          if (componentVitals.isLcpComponent) {
            budgets.push(
              buildBudget(
                'LCP',
                `${componentVitals.lcpTimeMs}ms`,
                componentVitals.lcpTimeMs,
                LCP_GREEN,
                LCP_YELLOW,
                'ms',
                "Largest Contentful Paint — this component contains the page's largest visible content element (Core Web Vital).",
              ),
            );
          } else {
            budgets.push({
              label: 'LCP',
              value: '—',
              level: 'green',
              description:
                'Largest Contentful Paint — another component holds the LCP element (Core Web Vital).',
              thresholds: '🟢 ≤2500ms · 🟡 ≤4000ms · 🔴 >4000ms',
              greenMax: LCP_GREEN,
              yellowMax: LCP_YELLOW,
            });
          }
        }
        /* FID — always show, "Waiting" when no interaction yet */
        if (supportsEntryType('first-input')) {
          const fidLabel: Str =
            componentVitals.fidMs < 0 ? 'Waiting' : `${componentVitals.fidMs}ms`;
          const fidValue: Num = componentVitals.fidMs < 0 ? 0 : componentVitals.fidMs;
          budgets.push(
            buildBudget(
              'FID',
              fidLabel,
              fidValue,
              FID_GREEN,
              FID_YELLOW,
              'ms',
              'First Input Delay — time between first user interaction and browser response.',
            ),
          );
        }
        /* INP — always show, "Waiting" when no interaction yet */
        if (supportsEntryType('event')) {
          const inpLabel: Str =
            componentVitals.inpMs < 0 ? 'Waiting' : `${componentVitals.inpMs}ms`;
          const inpValue: Num = componentVitals.inpMs < 0 ? 0 : componentVitals.inpMs;
          budgets.push(
            buildBudget(
              'INP',
              inpLabel,
              inpValue,
              INP_GREEN,
              INP_YELLOW,
              'ms',
              'Interaction to Next Paint — worst interaction latency (Core Web Vital).',
            ),
          );
        }
        if (componentVitals.ttfbMs >= 0) {
          budgets.push(
            buildBudget(
              'TTFB',
              `${componentVitals.ttfbMs}ms`,
              componentVitals.ttfbMs,
              TTFB_GREEN,
              TTFB_YELLOW,
              'ms',
              'Time to First Byte — server response time for the page (page-level metric).',
            ),
          );
        }
      }

      if (a11y.focusOrderIssues.length > 0) {
        budgets.push({
          label: 'Focus Order',
          value: `${a11y.focusOrderIssues.length} issue${a11y.focusOrderIssues.length === 1 ? '' : 's'}`,
          level: 'red',
          description:
            'Positive tabindex values disrupt natural focus order. Use tabindex="0" or "-1" instead.',
          thresholds: '🟢 0 · 🔴 >0',
          greenMax: 0,
          yellowMax: 0,
        });
      }

      if (a11y.contrastIssues.length > 0) {
        budgets.push({
          label: 'Contrast',
          value: `${a11y.contrastIssues.length} issue${a11y.contrastIssues.length === 1 ? '' : 's'}`,
          level: a11y.contrastIssues.length > 3 ? 'red' : 'yellow',
          description:
            'Text elements with color contrast below WCAG AA requirements (4.5:1 normal, 3:1 large text).',
          thresholds: '🟢 0 · 🟡 ≤3 · 🔴 >3',
          greenMax: 0,
          yellowMax: 3,
        });
      }

      if (a11y.imagesWithoutAlt > 0) {
        budgets.push({
          label: 'Images Alt',
          value: `${a11y.imagesWithoutAlt} missing`,
          level: 'red',
          description:
            'Images without alt attributes. Every <img> needs alt text or alt="" for decorative images (WCAG 1.1.1).',
          thresholds: '🟢 0 · 🔴 >0',
          greenMax: 0,
          yellowMax: 0,
        });
      }

      if (a11y.ariaIssues.length > 0) {
        budgets.push({
          label: 'ARIA Usage',
          value: `${a11y.ariaIssues.length} issue${a11y.ariaIssues.length === 1 ? '' : 's'}`,
          level: a11y.ariaIssues.length > 2 ? 'red' : 'yellow',
          description:
            'ARIA attributes used incorrectly (wrong role, missing references, hidden focusable elements).',
          thresholds: '🟢 0 · 🟡 ≤2 · 🔴 >2',
          greenMax: 0,
          yellowMax: 2,
        });
      }

      if (a11y.svgsWithoutLabel > 0) {
        budgets.push({
          label: 'SVG Labels',
          value: `${a11y.svgsWithoutLabel} missing`,
          level: 'yellow',
          description:
            'SVGs without aria-label, <title>, or role="presentation". Unlabeled SVGs are invisible to screen readers.',
          thresholds: '🟢 0 · 🟡 >0',
          greenMax: 0,
          yellowMax: 999,
        });
      }

      if (a11y.animatedElementCount > 0 && !a11y.hasReducedMotionOverride) {
        budgets.push({
          label: 'Motion Safety',
          value: 'No override',
          level: 'yellow',
          description:
            'Component has CSS animations/transitions but no prefers-reduced-motion media query detected. Users with vestibular disorders need motion reduction.',
          thresholds: '🟢 Has override · 🟡 No override',
          greenMax: 0,
          yellowMax: 1,
        });
      }

      /* Always-present a11y summary metrics */
      const labelRatio: Num = a11y.focusableCount > 0 ? a11y.labeledCount / a11y.focusableCount : 1;
      let labelLevel: BudgetLevel = 'red';
      if (labelRatio >= 1) {
        labelLevel = 'green';
      } else if (labelRatio >= 0.8) {
        labelLevel = 'yellow';
      }
      budgets.push({
        label: 'A11y Labels',
        value: `${a11y.labeledCount}/${a11y.focusableCount}`,
        level: labelLevel,
        description:
          'Interactive elements with accessible labels vs total interactive elements. Every button, link, and input needs an accessible name.',
        thresholds: '🟢 100% · 🟡 ≥80% · 🔴 <80%',
        greenMax: 1,
        yellowMax: 0.8,
      });

      budgets.push({
        label: 'Headings',
        value: `${a11y.headings.length}`,
        level: a11y.headingSkipsLevel ? 'yellow' : 'green',
        description:
          'Heading elements found in document order. Headings should follow a sequential hierarchy (h1 → h2 → h3) without skipping levels.',
        thresholds: '🟢 Sequential · 🟡 Skipped levels',
        greenMax: 0,
        yellowMax: 1,
      });

      let animationLevel: BudgetLevel = 'green';
      if (a11y.animatedElementCount > 0 && !a11y.hasReducedMotionOverride) {
        animationLevel = 'yellow';
      }
      budgets.push({
        label: 'Animations',
        value: `${a11y.animatedElementCount}`,
        level: animationLevel,
        description:
          'Elements with active CSS animations or transitions. Components with motion should respect prefers-reduced-motion for users with vestibular disorders.',
        thresholds: '🟢 0 or has override · 🟡 No override',
        greenMax: 0,
        yellowMax: 999,
      });

      if (propsTotal > 0) {
        const propCoverage: Num = propsWithDefaults / propsTotal;
        let propLevel: BudgetLevel = 'red';
        if (propCoverage >= 1) {
          propLevel = 'green';
        } else if (propCoverage >= 0.5) {
          propLevel = 'yellow';
        }
        budgets.push({
          label: 'Prop Coverage',
          value: `${propsWithDefaults}/${propsTotal}`,
          level: propLevel,
          description:
            'Props with default values vs total props. Higher coverage means the component works out-of-the-box with fewer required props.',
          thresholds: '🟢 100% · 🟡 ≥50% · 🔴 <50%',
          greenMax: 1,
          yellowMax: 0.5,
        });
      }

      const overallHealth: BudgetLevel = worstLevel(budgets);

      const statsData: LensStatsData = {
        mountTimeMs,
        reRenderCount: 0,
        nodeCount,
        domDepth,
        textNodeCount,
        hasAsyncContent: false,
        a11y,
        consoleMessages: captured,
        budgets,
        overallHealth,
        memoryDeltaBytes,
        propsWithDefaults,
        propsTotal,
        eventListenerCount: a11y.eventListenerCount,
        vitals: componentVitals,
        reRenderTimings: [],
      };

      /* Track re-renders via MutationObserver with timing measurement */
      let reRenderCount: Num = 0;
      let lastMutationTime: Num = performance.now();
      const observer: MutationObserver = new MutationObserver((): Void => {
        const now: Num = performance.now();
        const delta: Num = Math.round((now - lastMutationTime) * 100) / 100;
        lastMutationTime = now;

        reRenderCount++;
        statsData.reRenderCount = reRenderCount;
        statsData.hasAsyncContent = true;
        statsData.reRenderTimings.push(delta);

        /* Update re-render budget */
        const rrBudget: MetricBudget | undefined = statsData.budgets.find(
          (b) => b.label === 'Re-renders',
        );
        if (rrBudget) {
          rrBudget.value = `${reRenderCount}`;
          rrBudget.level = evaluateBudget(reRenderCount, RERENDER_GREEN, RERENDER_YELLOW);
        }
        statsData.overallHealth = worstLevel(statsData.budgets);

        /* Re-emit updated stats */
        onstats(cardKey, statsData);
      });

      if (wrapperRef) {
        observer.observe(wrapperRef, { childList: true, subtree: true, attributes: true });
      }

      /* Emit initial stats */
      onstats(cardKey, statsData);

      /* Store observer cleanup in a variable accessible to the returned cleanup */
      (wrapperRef as HTMLDivElement & { __lensObserver?: MutationObserver }).__lensObserver =
        observer;
    });

    return (): Void => {
      cancelAnimationFrame(rafId);
      vitalsResult.cleanup();
      console.warn = origWarn;
      console.error = origError;
      if (wrapperRef) {
        const obs: MutationObserver | undefined = (
          wrapperRef as HTMLDivElement & { __lensObserver?: MutationObserver }
        ).__lensObserver;
        if (obs) obs.disconnect();
      }
    };
  });
</script>

<div bind:this={wrapperRef} class="contents">
  {@render children()}
</div>
