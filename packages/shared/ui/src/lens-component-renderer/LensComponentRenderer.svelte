<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';
  import { PropMetaSchema, VariantMetaSchema } from '../lens/types.js';
  import { createRawSnippet, type Component, type Snippet } from 'svelte';

  /** Schema for the LensComponentRenderer component props. @convert-to-lens */
  export const LensComponentRendererPropsSchema = v.strictObject({
    /** The Svelte component to render. */
    component: v.custom<Component>((val: unknown): boolean => typeof val === 'function'),
    /** Variant metadata — when provided, renders per-option cards. When absent, renders a single default card. */
    meta: v.optional(VariantMetaSchema),
    /** Full prop metadata for building base props from defaults/mock values. */
    props: v.optional(v.array(PropMetaSchema)),
    /** PascalCase tag name for generating code snippets. @values Button, Input, Badge */
    tagName: v.optional(StrSchema),
    /** Component directory name for building isolation URLs. @values button, badge, input */
    componentName: v.optional(StrSchema),
    /** Default slot content text for each rendered component. @values Example, Click me, Label */
    label: v.optional(StrSchema),
    /** Custom content to render instead of the auto-instantiated component. Used for hand-written examples. */
    children: v.optional(v.custom<Snippet>((val: unknown): boolean => typeof val === 'function')),
    /** Code snippet text to display instead of auto-generated snippet. @values <Button>Click</Button>, <Input placeholder="Type..." />, <Badge>New</Badge> */
    codeText: v.optional(StrSchema),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
    /** Suppress error logging for intentional boundary errors (e.g., Error Boundary demo section). */
    silent: v.optional(BoolSchema),
    /** Optional wrapper component providing required parent context (e.g. DropdownMenu.Root for Sub components). */
    contextWrapper: v.optional(
      v.custom<Component>((val: unknown): boolean => typeof val === 'function'),
    ),
    /** Section identifier for listening to section-level setting events. @values 'variants' | 'examples' */
    sectionId: v.optional(StrSchema),
    /** Custom inner content rendered inside `<Target>` instead of the label text. Used for group components that render child component instances. */
    innerContent: v.optional(
      v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
    ),
  });
  /** Props for the LensComponentRenderer component. */
  export type LensComponentRendererProps = v.InferOutput<typeof LensComponentRendererPropsSchema>;
</script>

<script lang="ts">
  /**
   * Unified component renderer for Lens documentation pages.
   *
   * Renders a single default preview card OR a grid of variant option cards
   * depending on whether variant metadata is provided. Each card includes
   * an error boundary with LensError fallback, per-card code
   * expand/collapse with copy-to-clipboard, zoom controls, background
   * switcher, outline toggle, isolation link, and accessibility
   * simulation dropdown.
   *
   * @example
   * ```svelte
   * <!-- Default preview (no variants) -->
   * <LensComponentRenderer component={Button} props={extractedProps} tagName="Button" />
   *
   * <!-- Variant grid -->
   * <LensComponentRenderer component={Button} meta={variantMeta} props={extractedProps} tagName="Button" />
   * ```
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import { log } from '@/utils/core/logger';
  import type { PropMeta, VariantMeta } from '../lens/types.js';
  import { buildBaseProps } from '../lens/extract-props.js';
  import LensError from '../lens-error/LensError.svelte';
  import LensStats from '../lens-stats/LensStats.svelte';
  import type {
    LensStatsData,
    BudgetLevel,
    MetricBudget,
    WebVitals,
    AriaIssue,
    ContrastIssue,
    TabOrderEntry,
  } from '../lens-stats/types.js';
  import CopyButton from '../copy-button/CopyButton.svelte';
  import CodeBlock from '../code-block/CodeBlock.svelte';
  import ColorPicker from '../color-picker/ColorPicker.svelte';
  import { Slider } from '../slider/index.js';
  import { Switch } from '../switch/index.js';
  import Activity from '@lucide/svelte/icons/activity';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Code from '@lucide/svelte/icons/code';
  import Check from '@lucide/svelte/icons/check';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Eye from '@lucide/svelte/icons/eye';
  import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import Minimize2 from '@lucide/svelte/icons/minimize-2';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Moon from '@lucide/svelte/icons/moon';
  import Paintbrush from '@lucide/svelte/icons/paintbrush';
  import Palette from '@lucide/svelte/icons/palette';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import Smartphone from '@lucide/svelte/icons/smartphone';
  import Sun from '@lucide/svelte/icons/sun';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import SquareDashedMousePointer from '@lucide/svelte/icons/square-dashed-mouse-pointer';
  import Tablet from '@lucide/svelte/icons/tablet';
  import Tv from '@lucide/svelte/icons/tv';
  import Watch from '@lucide/svelte/icons/watch';
  import Car from '@lucide/svelte/icons/car';
  import Glasses from '@lucide/svelte/icons/glasses';
  import Refrigerator from '@lucide/svelte/icons/refrigerator';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import Wifi from '@lucide/svelte/icons/wifi';
  import WifiOff from '@lucide/svelte/icons/wifi-off';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import Download from '@lucide/svelte/icons/download';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import FileImage from '@lucide/svelte/icons/file-image';
  import FileType from '@lucide/svelte/icons/file-type';
  import FileCode from '@lucide/svelte/icons/file-code';
  import Link from '@lucide/svelte/icons/link';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import Globe from '@lucide/svelte/icons/globe';
  import Languages from '@lucide/svelte/icons/languages';
  import Layers from '@lucide/svelte/icons/layers';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import Radio from '@lucide/svelte/icons/radio';
  import ALargeSmall from '@lucide/svelte/icons/a-large-small';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import FileJson from '@lucide/svelte/icons/file-json';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import CopyCheck from '@lucide/svelte/icons/copy-check';
  import Ruler from '@lucide/svelte/icons/ruler';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Accessibility from '@lucide/svelte/icons/accessibility';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
  import Camera from '@lucide/svelte/icons/camera';
  import Chrome from '@lucide/svelte/icons/chrome';
  import ImageIcon from '@lucide/svelte/icons/image';
  import X from '@lucide/svelte/icons/x';
  import Terminal from '@lucide/svelte/icons/terminal';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import FileText from '@lucide/svelte/icons/file-text';
  import FileArchive from '@lucide/svelte/icons/file-archive';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import ListFilter from '@lucide/svelte/icons/list-filter';
  import Clock from '@lucide/svelte/icons/clock';
  import WrapText from '@lucide/svelte/icons/wrap-text';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import Zap from '@lucide/svelte/icons/zap';
  import Apple from '@lucide/svelte/icons/apple';
  import Bot from '@lucide/svelte/icons/bot';
  import Star from '@lucide/svelte/icons/star';
  import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
  import SplitSquareHorizontal from '@lucide/svelte/icons/split-square-horizontal';
  import { zipSync, strToU8 } from 'fflate';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import * as Popover from '../popover/index.js';
  import {
    exportPng,
    exportJpeg,
    exportSvg,
    exportWebp,
    copyImageToClipboard,
    copyHtml,
    copyDataUri,
    downloadHtml,
    downloadStandaloneHtml,
  } from '../lens/export-utils.js';
  import * as Tooltip from '../tooltip/index.js';
  import { fade, scale as scaleTransition, slide } from 'svelte/transition';
  import { cn } from '../utils.js';
  import LensPortalScope from './LensPortalScope.svelte';
  import LensCardSettingsMenu from '../lens-card-settings-menu/LensCardSettingsMenu.svelte';

  const {
    component: Target,
    meta,
    props: propsMeta = [],
    tagName,
    componentName,
    label = 'Example',
    children,
    codeText,
    class: className,
    silent = false,
    contextWrapper: ContextWrapper,
    sectionId,
    innerContent,
  }: LensComponentRendererProps = $props();

  const baseProps: Record<Str, unknown> = $derived(buildBaseProps(propsMeta));

  /** Whether rendering in variant mode (has variant options). */
  const hasVariants: Bool = $derived(Boolean(meta) && (meta?.variants.length ?? 0) > 0);

  /** Per-card code panel visibility keyed by card identifier. */
  let openCards: Record<Str, Bool> = $state({});

  /** Per-card accessibility simulation keyed by card identifier. */
  let cardSimulations: Record<Str, Str> = $state({});

  /** Per-card background keyed by card identifier. */
  let cardBackgrounds: Record<Str, Str> = $state({});

  /** Per-card zoom level (1 = 100%) keyed by card identifier. */
  let cardZoom: Record<Str, Num> = $state({});

  /** Per-card outline color keyed by card identifier ('none' = off). */
  let cardOutlines: Record<Str, Str> = $state({});

  /** Per-card outline thickness in pixels keyed by card identifier. */
  let cardOutlineThickness: Record<Str, Num> = $state({});

  /** Per-card grid style keyed by card identifier ('none' = off). */
  let cardGrids: Record<Str, Str> = $state({});

  /** Per-card grid size in pixels keyed by card identifier. */
  let cardGridSizes: Record<Str, Num> = $state({});

  /** Per-card grid fill/background color keyed by card identifier ('none' = transparent). */
  let cardGridFills: Record<Str, Str> = $state({});

  /** Per-card orientation keyed by card identifier ('default' = no rotation). */
  let cardOrientations: Record<Str, Str> = $state({});

  /** Per-card custom rotation angle in degrees (0-359). */
  let cardCustomRotation: Record<Str, Num> = $state({});

  /** Per-card color mode keyed by card identifier ('auto' = inherit from page). */
  let cardModes: Record<Str, Str> = $state({});

  /** Per-card theme keyed by card identifier ('' = inherit from page). */
  let cardThemes: Record<Str, Str> = $state({});

  /** Per-card media query preferences keyed by card identifier. Values: Record<prefName, activeValue>. */
  let cardMediaPrefs: Record<Str, Record<Str, Str>> = $state({});

  /** Per-card network simulation keyed by card identifier ('none' = no throttle). */
  let cardNetworkSim: Record<Str, Str> = $state({});

  /** Per-card network loading state (true while simulated latency overlay is visible). */
  let cardNetworkLoading: Record<Str, Bool> = $state({});

  /** Per-card viewport constraint keyed by card identifier ('auto' = full width). */
  let cardViewports: Record<Str, Str> = $state({});

  /** Per-card custom viewport dimensions keyed by card identifier. Used when viewport is 'custom'. */
  let cardCustomViewports: Record<Str, { w: Num; h: Num }> = $state({});

  /** Per-card custom network conditions keyed by card identifier. Used when network is 'custom'. */
  let cardCustomNetwork: Record<Str, { delay: Num; label: Str }> = $state({});

  /** Per-card measured visual height of the inner content (accounts for zoom + rotation transforms). */
  let cardContentHeights: Record<Str, Num> = $state({});

  /** Per-card measured height of portaled overlay content (dialogs, sheets, dropdowns). */
  let cardPortalHeights: Record<Str, Num> = $state({});

  /** Per-card text direction override keyed by card identifier ('auto' | 'ltr' | 'rtl'). */
  let cardTextDir: Record<Str, Str> = $state({});

  /** Per-card font size override keyed by card identifier (0 = default, else px value). */
  let cardFontSize: Record<Str, Num> = $state({});

  /** Per-card debug outline mode (Pesticide-style element-type outlines). */
  let cardDebugOutline: Record<Str, Bool> = $state({});

  /** Per-card debug outline category visibility (index into DEBUG_OUTLINE_LEGEND). */
  let cardDebugCategories: Record<Str, Record<Num, Bool>> = $state({});

  /** Per-card debug outline style. */
  let cardDebugOutlineStyle: Record<Str, Str> = $state({});

  /** Per-card debug outline width in px. */
  let cardDebugOutlineWidth: Record<Str, Num> = $state({});

  /** Per-card debug outline opacity (0–100). */
  let cardDebugOutlineOpacity: Record<Str, Num> = $state({});

  /** Search query for the debug outline settings dropdown. */
  let debugOutlineSettingsSearch: Str = $state('' as Str);

  /** Filtered outline style options based on search query. */
  const filteredDebugOutlineStyles = $derived.by(() => {
    const q: Str = (debugOutlineSettingsSearch as string).toLowerCase() as Str;
    if (!q) {
      return DEBUG_OUTLINE_STYLES;
    }
    return DEBUG_OUTLINE_STYLES.filter(
      (s) =>
        (s.label as string).toLowerCase().includes(q as string) ||
        (s.desc as string).toLowerCase().includes(q as string),
    );
  });

  /** Filtered outline width options based on search query. */
  const filteredDebugOutlineWidths = $derived.by(() => {
    const q: Str = (debugOutlineSettingsSearch as string).toLowerCase() as Str;
    if (!q) {
      return DEBUG_OUTLINE_WIDTHS;
    }
    return DEBUG_OUTLINE_WIDTHS.filter((w) =>
      (w.label as string).toLowerCase().includes(q as string),
    );
  });

  /** Per-card color-blind friendly palette mode. */
  let cardDebugColorBlind: Record<Str, Bool> = $state({});

  /** Per-card category index currently being hovered in the legend. -1 = none. */
  let cardDebugHoverCategory: Record<Str, Num> = $state({});

  /** Per-card measure mode (hover box model overlay). */
  let cardMeasureActive: Record<Str, Bool> = $state({});

  /** Per-card "Copied!" flash indicator for measure click-to-copy. */
  let cardMeasureCopied: Record<Str, Bool> = $state({});

  /** Per-card inspect mode (click element to see computed CSS). */
  let cardInspectActive: Record<Str, Bool> = $state({});

  /** Per-card inspected element data (computed styles, DOM attrs, accessibility, hierarchy). */
  let cardInspectedEl: Record<
    Str,
    {
      /** Element tag name. */
      tag: Str;
      /** Element CSS classes. */
      classes: Str;
      /** Element id attribute. */
      id: Str;
      /** Bounding client rect dimensions. */
      rect: { width: Num; height: Num; top: Num; left: Num };
      /** Key computed CSS properties grouped by category. */
      styles: Record<Str, Record<Str, Str>>;
      /** DOM attributes (data-*, aria-*, role, href, src, etc). */
      attrs: Record<Str, Str>;
      /** Accessibility info (role, label, description, tabindex, hidden). */
      a11y: Record<Str, Str>;
      /** Parent chain breadcrumb (e.g. "body > main > div.container > button"). */
      breadcrumb: Str;
      /** Truncated text content (first 100 chars). */
      textContent: Str;
      /** Box model summary (padding, margin, border). */
      boxModel: {
        /** Padding values. */
        padding: { top: Num; right: Num; bottom: Num; left: Num };
        /** Margin values. */
        margin: { top: Num; right: Num; bottom: Num; left: Num };
        /** Border widths. */
        border: { top: Num; right: Num; bottom: Num; left: Num };
      };
    } | null
  > = $state({});

  /** Per-card collapsed inspect section groups. */
  let cardInspectCollapsed: Record<Str, Record<Str, Bool>> = $state({});

  /** Per-card inspect property copy feedback (property name being flashed). */
  let cardInspectCopyFeedback: Record<Str, Str> = $state({});

  /** Per-card measure overlay data (hovered element box model). */
  let cardMeasureData: Record<
    Str,
    {
      /** HTML tag name of the hovered element (lowercase). */
      tag: Str;
      /** Content box dimensions and position relative to preview container. */
      content: { x: Num; y: Num; w: Num; h: Num };
      /** Padding values in px. */
      padding: { top: Num; right: Num; bottom: Num; left: Num };
      /** Border values in px. */
      border: { top: Num; right: Num; bottom: Num; left: Num };
      /** Margin values in px. */
      margin: { top: Num; right: Num; bottom: Num; left: Num };
      /** Overall element dimensions. */
      width: Num;
      /** Overall element height. */
      height: Num;
      /** CSS box-sizing value. */
      boxSizing: Str;
      /** Distance to parent element edges (top, right, bottom, left) in px. Null if no parent in container. */
      parentDistance: { top: Num; right: Num; bottom: Num; left: Num } | null;
      /** Bounding box left edge relative to container (for guide lines). */
      absX: Num;
      /** Bounding box top edge relative to container (for guide lines). */
      absY: Num;
      /** Container dimensions for guide lines. */
      containerW: Num;
      /** Container height for guide lines. */
      containerH: Num;
      /** CSS position value (static, relative, absolute, fixed, sticky). */
      position: Str;
      /** CSS display value (block, flex, grid, inline, etc). */
      display: Str;
    } | null
  > = $state({});

  /** Per-card console panel visibility keyed by card identifier. */
  let cardConsoleOpen: Record<Str, Bool> = $state({});

  /** Per-card console log entries keyed by card identifier. */
  let cardConsoleLogs: Record<Str, ConsoleLogEntry[]> = $state({});

  /** Per-card console observer cleanup functions keyed by card identifier. */
  let cardConsoleCleanup: Record<Str, (() => void) | null> = $state({});

  /** Per-card console mount timestamp keyed by card identifier. */
  let cardConsoleMountTime: Record<Str, Num> = $state({});

  /** Per-card fullscreen state keyed by card identifier. */
  let cardFullscreen: Record<Str, Bool> = $state({});

  /** The element that triggered fullscreen, for focus restoration on exit. */
  let fullscreenTrigger: HTMLElement | null = $state(null);

  /** Per-card performance statistics collected by LensStats wrapper. */
  let cardStats: Record<Str, LensStatsData> = $state({});

  /* ---- Browser & Device Preview Screenshot State ---- */

  /** Console log entry captured during Playwright page load. */
  type ScreenshotConsoleEntry = {
    /** Console message severity. @values log, warn, error, info, debug */
    level: Str;
    /** Console message text. @values Hello world, TypeError: x is not a function */
    text: Str;
  };

  /** Performance timing data captured from the Playwright page. */
  type ScreenshotPerfData = {
    /** Time to DOMContentLoaded in ms. @values 42, 120, 350 */
    domContentLoaded: Num;
    /** Time to load event in ms. @values 80, 200, 500 */
    load: Num;
    /** Time to DOM interactive in ms. @values 30, 100, 250 */
    domInteractive: Num;
    /** Time to response end in ms. @values 10, 50, 150 */
    responseEnd: Num;
    /** Time to first paint in ms. @values 25, 80, 200 */
    firstPaint: Num;
    /** Time to first contentful paint in ms. @values 30, 100, 250 */
    firstContentfulPaint: Num;
  };

  /** Screenshot engine source identifier. */
  type ScreenshotSource = 'playwright' | 'ios-simulator' | 'android-emulator';

  /** Individual screenshot capture result. */
  type ScreenshotCapture = {
    /** Screenshot engine that produced this capture. @values playwright, ios-simulator, android-emulator */
    source: ScreenshotSource;
    /** Browser engine used. @values chromium, firefox, webkit, safari, chrome-mobile */
    browser: Str;
    /** Human-readable browser engine name. @values Chromium, Firefox, WebKit, Safari, Chrome Mobile */
    browserDisplayName: Str;
    /** Browser engine version string. @values 131.0.6778.33, 132.0, 18.2 */
    browserVersion: Str;
    /** Device name from engine (Playwright device, simulator name, or emulator AVD). @values iPhone 15 Pro Max, Pixel 9, custom */
    device: Str;
    /** OS/platform string for the device. @values iOS 17.5, iOS 26.0, Android 14, macOS */
    deviceOS: Str;
    /** Object URL for the captured PNG image. @values blob:http://localhost:5173/... */
    imageUrl: Str;
    /** Capture timestamp (ms since epoch). @values 1710000000000 */
    timestamp: Num;
    /** Console messages captured during page load. */
    consoleLogs: ScreenshotConsoleEntry[];
    /** Performance timing data from the rendered page. */
    performance: Partial<ScreenshotPerfData>;
    /** Safe area insets in CSS pixels (iOS simulator only). */
    safeAreaInsets?: { top: Num; right: Num; bottom: Num; left: Num };
    /** Device frame metadata for bezel compositing. */
    deviceFrame?: { frameId: Str; screenRegion: { x: Num; y: Num; width: Num; height: Num } };
  };

  /** Per-card selected screenshot source engine. */
  let cardScreenSource: Record<Str, ScreenshotSource> = $state({});

  /** Per-card selected browser engine for real browser screenshots. */
  let cardScreenBrowser: Record<Str, Str> = $state({});

  /** Per-card selected Playwright device name. */
  let cardScreenDevice: Record<Str, Str> = $state({});

  /** Per-card captured screenshot results. */
  let cardScreenshots: Record<Str, ScreenshotCapture[]> = $state({});

  /** Per-card screenshot capture loading state. */
  let cardScreenCapturing: Record<Str, Bool> = $state({});

  /** Per-card set of engine sources currently being captured (for parallel "All" placeholders). */
  let cardCapturingSources: Record<Str, Set<ScreenshotSource>> = $state({});

  /** Per-card total number of sources in the current parallel capture batch. */
  let cardCapturingTotal: Record<Str, Num> = $state({});

  /** Per-card screenshot capture error message (empty = no error). */
  let cardScreenError: Record<Str, Str> = $state({});

  /** Per-card screenshots section collapsed state (true = expanded, default true). */
  let cardScreenshotsOpen: Record<Str, Bool> = $state({});

  /** Per-card console log list collapsed state (true = expanded, default true). */
  let cardConsoleExpanded: Record<Str, Bool> = $state({});
  /** Whether to auto-scroll console to bottom on new entries. */
  let cardConsoleAutoScroll: Record<Str, Bool> = $state({});
  /** Per-card console search/filter text. */
  let cardConsoleSearch: Record<Str, Str> = $state({});
  /** Per-card console level filter — levels set to false are hidden. */
  let cardConsoleLevelFilter: Record<Str, Record<Str, Bool>> = $state({});
  /** Per-card expanded console entry index (-1 = none, used for single-click expand). */
  let cardConsoleExpandedEntry: Record<Str, Num> = $state({});
  /** Per-card console "expand all" mode (true = all entries expanded). */
  let cardConsoleExpandAll: Record<Str, Bool> = $state({});
  /** Search query for console level filter dropdown. */
  let consoleLevelFilterSearch: Str = $state('' as Str);
  /** Per-card console timestamp visibility (true = show, default true). */
  let cardConsoleShowTimestamps: Record<Str, Bool> = $state({});
  /** Per-card console word-wrap mode (true = wrap, default true). */
  let cardConsoleWordWrap: Record<Str, Bool> = $state({});

  /** Per-screenshot-capture console section collapsed state (true = expanded, default true). */
  let screenshotConsoleExpanded: Record<Str, Bool> = $state({});

  /** Per-card screenshot compare mode (true = show side-by-side slider). */
  let cardScreenCompare: Record<Str, Bool> = $state({});

  /** Per-card compare slider position (0–100, default 50). */
  let cardComparePosition: Record<Str, Num> = $state({});

  /** Per-card compare left screenshot index. */
  let cardCompareLeft: Record<Str, Num> = $state({});

  /** Per-card compare right screenshot index. */
  let cardCompareRight: Record<Str, Num> = $state({});

  /** Compare left selector search query. */
  let compareLeftSearch: Str = $state('' as Str);

  /** Compare right selector search query. */
  let compareRightSearch: Str = $state('' as Str);

  /** Compare export search query (separate from per-card export search). */
  let compareExportSearchQuery: Str = $state('' as Str);

  /**
   * Pending destructive action confirmation keys.
   * When a destructive action is clicked once, its key is added here.
   * A second click within the timeout confirms the action.
   */
  let pendingDestructiveAction: Record<Str, Bool> = $state({});

  /** Screenshot lightbox state — null when closed, object URL when open. */
  let lightboxUrl: Str | null = $state(null);

  /** Lightbox card key — identifies which card's screenshots we're browsing. */
  let lightboxCardKey: Str | null = $state(null);

  /** Lightbox screenshot index within the card's captures array. */
  let lightboxIdx: Num = $state(0 as Num);

  /** Search query for the Browser & Device Preview device list. */
  let browserSearchQuery: Str = $state('');

  /** Playwright device info from /api/lens/screenshot/devices. */
  type PlaywrightDevice = {
    /** Playwright device name (exact key). @values iPhone 15 Pro Max, Pixel 9, iPad Pro 13 */
    name: Str;
    /** Viewport width in CSS pixels. @values 375, 768, 1280 */
    width: Num;
    /** Viewport height in CSS pixels. @values 812, 1024, 800 */
    height: Num;
    /** Device pixel ratio. @values 1, 2, 3 */
    scale: Num;
    /** Whether the device emulates mobile. */
    mobile: Bool;
    /** Whether the device supports touch. */
    touch: Bool;
    /** Recommended browser engine. @values chromium, firefox, webkit */
    defaultBrowser: Str;
    /** OS/platform string from user agent. @values iOS 17.5, Android 14, macOS */
    os: Str;
  };

  /** Cached Playwright device list. */
  let playwrightDevices: PlaywrightDevice[] = $state([]);

  /** Whether the device list has been loaded. */
  let devicesLoaded: Bool = $state(false);

  /** iOS Simulator device list. */
  let iosDevices: Array<Record<Str, unknown>> = $state([]);

  /** Android emulator AVD + hardware profile list. */
  let androidDevices: Array<Record<Str, unknown>> = $state([]);

  /** Device ID currently being created as an AVD (shows spinner). */
  let creatingAvdDeviceId: Str | null = $state(null);

  /** Whether iOS devices have been loaded. */
  let iosDevicesLoaded: Bool = $state(false);

  /** Whether Android devices have been loaded. */
  let androidDevicesLoaded: Bool = $state(false);

  /** Engine availability status. */
  let engineStatus: Record<Str, { available: boolean; reason?: Str }> = $state({
    playwright: { available: true },
    'ios-simulator': { available: false, reason: 'Checking...' as Str },
    'android-emulator': { available: false, reason: 'Checking...' as Str },
  });

  /** Polling interval ID for engine status (while Browser & Device Preview menu is open). */
  let statusPollInterval: ReturnType<typeof setInterval> | null = $state(null);

  /** Whether safe area inset overlays are shown on iOS screenshots. */
  let showSafeAreaOverlay: Bool = $state(false);

  /** Whether device frame compositing is enabled on screenshot cards. */
  let showDeviceFrame: Bool = $state(false);

  /** Live preview streaming state per card. */
  let livePreviewActive: Record<Str, Bool> = $state({});

  /** Live preview source per card. */
  let livePreviewSource: Record<Str, ScreenshotSource> = $state({});

  /** Live View codec mode per card ('jpeg' for createImageBitmap, 'h264' for WebCodecs). */
  let liveViewCodecMode: Record<Str, Str> = $state({});

  /** WebCodecs VideoDecoder instance per card. */
  let liveViewDecoder: Record<Str, VideoDecoder | undefined> = $state({});

  /** Monotonic frame timestamp counter per card (microseconds). */
  let liveViewFrameTs: Record<Str, Num> = $state({});

  /** Live View WebSocket connections per card. */
  let liveViewWs: Record<Str, WebSocket> = $state({});

  /** Live View FPS per card. */
  let liveViewFps: Record<Str, Num> = $state({});

  /** Live View latency per card (ms). */
  let liveViewLatency: Record<Str, Num> = $state({});

  /** Live View cursor style per card. */
  let liveViewCursor: Record<Str, Str> = $state({});

  /** Live View engine label per card. */
  let liveViewEngine: Record<Str, Str> = $state({});

  /** Live View connection status per card. */
  let liveViewStatus: Record<Str, Str> = $state({});

  /** Whether a frame is currently being decoded/rendered per card. */
  let liveViewRendering: Record<Str, Bool> = $state({});

  /** Latest pending frame data per card (for frame skipping). */
  let liveViewPendingFrame: Record<Str, ArrayBuffer | undefined> = $state({});

  /** Pending mouseMove input per card (for batching). */
  let liveViewPendingMove: Record<Str, Record<string, unknown> | undefined> = $state({});

  /** rAF handle for mouseMove batching per card. */
  let liveViewMoveRaf: Record<Str, Num | undefined> = $state({});

  /** Live View reconnect attempt counter per card. */
  let liveViewReconnectAttempt: Record<Str, Num> = $state({});

  /** Live View reconnect timer per card. */
  let liveViewReconnectTimer: Record<Str, ReturnType<typeof setTimeout> | undefined> = $state({});

  /** Maximum reconnect backoff delay in milliseconds. */
  const RECONNECT_MAX_DELAY_MS: Num = 10_000 as Num;

  /** Base reconnect delay in milliseconds. */
  const RECONNECT_BASE_DELAY_MS: Num = 1000 as Num;

  /** Maximum number of reconnect attempts before giving up. */
  const RECONNECT_MAX_ATTEMPTS: Num = 5 as Num;

  /** Live View fullscreen state per card. */
  let liveViewFullscreen: Record<Str, Bool> = $state({});

  /** Live View touch simulation state per card (translates mouse→touch). */
  let liveViewTouchSim: Record<Str, Bool> = $state({});

  /** Live View viewport width per card. */
  let liveViewWidth: Record<Str, Num> = $state({});

  /** Live View viewport height per card. */
  let liveViewHeight: Record<Str, Num> = $state({});

  /**
   * Start an interactive Live View session on a card.
   *
   * Opens a WebSocket to `/api/lens/preview/ws`, renders binary JPEG
   * frames to a `<canvas>`, and forwards user input events back.
   *
   * @param cardKey - Card identifier
   * @param component - Component directory name
   * @param engine - Browser engine to use
   * @param width - Viewport width
   * @param height - Viewport height
   */
  function startLiveView(cardKey: Str, component: Str, engine: Str, width: Num, height: Num): void {
    // Close existing connection + cancel pending reconnect
    cancelReconnect(cardKey);
    if (liveViewWs[cardKey]) {
      liveViewWs[cardKey].close();
    }

    // Default codec mode: JPEG for all engines
    liveViewCodecMode[cardKey] = 'jpeg' as Str;

    // Reset reconnect counter on fresh start (not on reconnect)
    if (liveViewReconnectAttempt[cardKey] === undefined) {
      liveViewReconnectAttempt[cardKey] = 0 as Num;
    }

    const params: URLSearchParams = new URLSearchParams({
      engine: engine as string,
      component: component as string,
      width: String(width),
      height: String(height),
    });

    const protocol: Str = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') as Str;
    const wsUrl: Str = `${protocol}//${window.location.host}/api/lens/preview/ws?${params}` as Str;

    const ws: WebSocket = new WebSocket(wsUrl as string);
    ws.binaryType = 'arraybuffer';

    liveViewWs[cardKey] = ws;
    liveViewStatus[cardKey] = 'connecting' as Str;
    liveViewFps[cardKey] = 0 as Num;
    liveViewLatency[cardKey] = 0 as Num;
    liveViewEngine[cardKey] = engine;
    liveViewWidth[cardKey] = width;
    liveViewHeight[cardKey] = height;

    ws.addEventListener('open', async (): Promise<void> => {
      liveViewStatus[cardKey] = 'connected' as Str;
      // Reset reconnect counter on successful connection
      liveViewReconnectAttempt[cardKey] = 0 as Num;

      // For Android emulator, detect WebCodecs and request H.264 if supported
      if (engine === 'android-emulator') {
        const supported: boolean = await isWebCodecsSupported();
        const codecMode: Str = (supported ? 'h264' : 'jpeg') as Str;
        liveViewCodecMode[cardKey] = codecMode;
        ws.send(JSON.stringify({ type: 'start', codec_mode: codecMode }));
      } else {
        ws.send(JSON.stringify({ type: 'start' }));
      }
    });

    ws.addEventListener('message', (event: MessageEvent): void => {
      if (event.data instanceof ArrayBuffer) {
        // Route to H.264 decoder or JPEG renderer based on codec mode
        if (liveViewCodecMode[cardKey] === 'h264') {
          decodeH264Frame(cardKey, event.data);
        } else {
          renderFrame(cardKey, event.data);
        }
      } else {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'fps') {
            liveViewFps[cardKey] = msg.value as Num;
          } else if (msg.type === 'latency') {
            liveViewLatency[cardKey] = msg.value as Num;
          } else if (msg.type === 'cursor') {
            liveViewCursor[cardKey] = msg.cursor as Str;
          } else if (msg.type === 'metadata') {
            liveViewEngine[cardKey] = msg.engine as Str;
          } else if (msg.type === 'codec-config') {
            // Initialize H.264 WebCodecs decoder with SPS/PPS
            initH264Decoder(cardKey, msg.sps as Str, msg.pps as Str);
          } else if (msg.type === 'error') {
            log.warn(`Live View error: ${msg.message}`);
          }
        } catch {
          /* Malformed JSON from server — non-critical, skip frame */
        }
      }
    });

    ws.addEventListener('close', (): void => {
      // Auto-reconnect if the session is still active (not manually stopped)
      if (livePreviewActive[cardKey]) {
        const attempt: Num = (liveViewReconnectAttempt[cardKey] ?? 0) as Num;
        if ((attempt as number) < (RECONNECT_MAX_ATTEMPTS as number)) {
          liveViewStatus[cardKey] = 'reconnecting' as Str;
          const delay: Num = Math.min(
            (RECONNECT_BASE_DELAY_MS as number) * 2 ** (attempt as number),
            RECONNECT_MAX_DELAY_MS as number,
          ) as Num;
          liveViewReconnectAttempt[cardKey] = ((attempt as number) + 1) as Num;
          log.info(
            `Live View reconnecting in ${delay}ms (attempt ${(attempt as number) + 1}/${RECONNECT_MAX_ATTEMPTS})`,
          );
          liveViewReconnectTimer[cardKey] = setTimeout((): void => {
            startLiveView(cardKey, component, engine, width, height);
          }, delay as number);
        } else {
          liveViewStatus[cardKey] = 'disconnected' as Str;
          log.warn(`Live View gave up reconnecting after ${RECONNECT_MAX_ATTEMPTS} attempts`);
        }
      } else {
        liveViewStatus[cardKey] = 'disconnected' as Str;
      }
    });

    ws.addEventListener('error', (): void => {
      liveViewStatus[cardKey] = 'error' as Str;
    });

    livePreviewActive[cardKey] = true as Bool;
  }

  /**
   * Cancel a pending reconnect timer for a card.
   *
   * @param cardKey - Card identifier
   */
  function cancelReconnect(cardKey: Str): void {
    const timer = liveViewReconnectTimer[cardKey];
    if (timer !== undefined) {
      clearTimeout(timer);
      liveViewReconnectTimer[cardKey] = undefined;
    }
  }

  /**
   * Toggle fullscreen mode for a Live View canvas.
   *
   * @param cardKey - Card identifier
   */
  function toggleLiveViewFullscreen(cardKey: Str): void {
    const entering: Bool = !liveViewFullscreen[cardKey] as Bool;
    liveViewFullscreen[cardKey] = entering;

    if (entering) {
      // Auto-focus the canvas when entering fullscreen
      requestAnimationFrame((): void => {
        const canvas: HTMLCanvasElement | null = document.querySelector(
          `[data-live-canvas="${cardKey}"]`,
        );
        if (canvas) {
          canvas.focus();
        }
      });
    }
  }

  /**
   * Handle keydown on the Live View fullscreen wrapper.
   * Exits fullscreen on ESC.
   *
   * @param e - Keyboard event
   * @param cardKey - Card identifier
   */
  function handleFullscreenKeydown(e: KeyboardEvent, cardKey: Str): void {
    if (e.key === 'Escape' && liveViewFullscreen[cardKey]) {
      e.preventDefault();
      e.stopPropagation();
      liveViewFullscreen[cardKey] = false as Bool;
    }
  }

  /**
   * Capture the current Live View canvas frame as a screenshot card.
   *
   * Converts the canvas to a PNG blob URL and adds it to the
   * card's screenshot list alongside regular API-captured screenshots.
   *
   * @param cardKey - Card identifier
   */
  function captureLiveViewFrame(cardKey: Str): void {
    const canvas: HTMLCanvasElement | null = document.querySelector(
      `[data-live-canvas="${cardKey}"]`,
    );
    if (!canvas) {
      return;
    }

    canvas.toBlob((blob: Blob | null): void => {
      if (!blob) {
        return;
      }

      const imageUrl: Str = URL.createObjectURL(blob) as Str;
      const engine: Str = liveViewEngine[cardKey] ?? ('chromium' as Str);

      const capture: ScreenshotCapture = {
        source: 'playwright' as ScreenshotSource,
        browser: engine,
        browserDisplayName: engine as Str,
        browserVersion: '' as Str,
        device: 'Live View' as Str,
        deviceOS: '' as Str,
        imageUrl,
        timestamp: Date.now() as Num,
        consoleLogs: [],
        performance: {},
      };

      const existing: ScreenshotCapture[] = cardScreenshots[cardKey] ?? [];
      cardScreenshots[cardKey] = [...existing, capture];
    }, 'image/png');
  }

  /**
   * Stop a Live View session.
   *
   * @param cardKey - Card identifier
   */
  function stopLiveView(cardKey: Str): void {
    // Cancel any pending reconnect — user explicitly stopped
    cancelReconnect(cardKey);
    liveViewReconnectAttempt[cardKey] = 0 as Num;

    // Exit fullscreen if active
    liveViewFullscreen[cardKey] = false as Bool;

    // Mark inactive BEFORE closing WS so the close handler doesn't auto-reconnect
    livePreviewActive[cardKey] = false as Bool;

    const ws: WebSocket | undefined = liveViewWs[cardKey];
    if (ws) {
      ws.send(JSON.stringify({ type: 'stop' }));
      ws.close();
      liveViewWs[cardKey] = undefined as never;
    }
    liveViewStatus[cardKey] = 'disconnected' as Str;

    // Clean up H.264 decoder
    cleanupH264Decoder(cardKey);
    liveViewCodecMode[cardKey] = 'jpeg' as Str;

    // Clean up frame skipping + input batching state
    liveViewRendering[cardKey] = false as Bool;
    liveViewPendingFrame[cardKey] = undefined;
    liveViewPendingMove[cardKey] = undefined;
    const raf: Num | undefined = liveViewMoveRaf[cardKey];
    if (raf !== undefined) {
      cancelAnimationFrame(raf as number);
      liveViewMoveRaf[cardKey] = undefined;
    }
  }

  /**
   * Render a JPEG binary frame to the card's canvas.
   *
   * Uses frame skipping: if a new frame arrives while the previous
   * one is still decoding, the old frame is dropped and the newest
   * frame is rendered instead (latest-frame-wins).
   *
   * @param cardKey - Card identifier
   * @param data - Raw JPEG bytes as ArrayBuffer
   */
  async function renderFrame(cardKey: Str, data: ArrayBuffer): Promise<void> {
    // If already rendering, store as pending and skip — latest frame wins
    if (liveViewRendering[cardKey]) {
      liveViewPendingFrame[cardKey] = data;
      return;
    }

    liveViewRendering[cardKey] = true as Bool;

    try {
      const canvas: HTMLCanvasElement | null = document.querySelector(
        `[data-live-canvas="${cardKey}"]`,
      );
      if (!canvas) {
        return;
      }

      const blob: Blob = new Blob([data], { type: 'image/jpeg' });
      const bitmap: ImageBitmap = await createImageBitmap(blob);
      const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return;
      }

      // Resize canvas to match frame dimensions if needed
      if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
      }

      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
    } finally {
      liveViewRendering[cardKey] = false as Bool;

      // If a newer frame arrived during decode, render it now
      const pending: ArrayBuffer | undefined = liveViewPendingFrame[cardKey];
      if (pending) {
        liveViewPendingFrame[cardKey] = undefined;
        renderFrame(cardKey, pending);
      }
    }
  }

  /**
   * Send an input event from the canvas to the WebSocket.
   *
   * Translates canvas coordinates to viewport coordinates using
   * the canvas display size vs internal resolution.
   *
   * @param cardKey - Card identifier
   * @param msg - Input message object to send
   */
  function sendLiveInput(cardKey: Str, msg: Record<string, unknown>): void {
    const ws: WebSocket | undefined = liveViewWs[cardKey];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Send a batched mouseMove event.
   *
   * Stores the latest mouseMove payload and schedules a single
   * send per animation frame, reducing WS traffic from high-DPI
   * pointer events (~120 Hz) down to display refresh rate (~60 Hz).
   *
   * @param cardKey - Card identifier
   * @param msg - mouseMove input message
   */
  function sendBatchedMouseMove(cardKey: Str, msg: Record<string, unknown>): void {
    liveViewPendingMove[cardKey] = msg;

    // Only schedule one rAF per card
    if (liveViewMoveRaf[cardKey] !== undefined) {
      return;
    }

    liveViewMoveRaf[cardKey] = requestAnimationFrame((): void => {
      liveViewMoveRaf[cardKey] = undefined;
      const pending: Record<string, unknown> | undefined = liveViewPendingMove[cardKey];
      if (pending) {
        liveViewPendingMove[cardKey] = undefined;
        sendLiveInput(cardKey, pending);
      }
    }) as Num;
  }

  /**
   * Translate mouse event coordinates to viewport coordinates.
   *
   * @param event - Mouse event from the canvas
   * @param canvas - The canvas element
   * @returns Viewport x,y coordinates
   */
  function canvasToViewport(event: MouseEvent, canvas: HTMLCanvasElement): { x: Num; y: Num } {
    const rect: DOMRect = canvas.getBoundingClientRect();
    const x: Num = Math.round(((event.clientX - rect.left) / rect.width) * canvas.width) as Num;
    const y: Num = Math.round(((event.clientY - rect.top) / rect.height) * canvas.height) as Num;
    return { x, y };
  }

  /**
   * Get modifier key bitmask from a keyboard/mouse event.
   * Alt=1, Ctrl=2, Meta=4, Shift=8.
   *
   * @param event - Keyboard or mouse event
   * @returns Modifier bitmask
   */
  function getModifiers(event: MouseEvent | KeyboardEvent): Num {
    let mods: Num = 0 as Num;
    if (event.altKey) {
      mods = ((mods as number) | 1) as Num;
    }
    if (event.ctrlKey) {
      mods = ((mods as number) | 2) as Num;
    }
    if (event.metaKey) {
      mods = ((mods as number) | 4) as Num;
    }
    if (event.shiftKey) {
      mods = ((mods as number) | 8) as Num;
    }
    return mods;
  }

  /* ---------------------------------------------------------------- */
  /*  WebCodecs detection                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Check if the browser supports WebCodecs VideoDecoder with H.264.
   *
   * Tests for the VideoDecoder API and probes H.264 Baseline codec
   * support via `VideoDecoder.isConfigSupported()`.
   *
   * @returns True if H.264 decoding via WebCodecs is available
   */
  async function isWebCodecsSupported(): Promise<boolean> {
    try {
      if (typeof VideoDecoder === 'undefined') {
        return false;
      }
      const support = await VideoDecoder.isConfigSupported({
        codec: 'avc1.42001e', // H.264 Baseline Level 3.0
      });
      return support.supported === true;
    } catch {
      /* VideoDecoder.isConfigSupported not available — non-critical */
      return false;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  WebCodecs H.264 decoder                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Build an AVCC DecoderConfigurationRecord from raw SPS and PPS.
   *
   * Format: version(1) + profile(1) + compat(1) + level(1) +
   * lengthSizeMinusOne(1) + numSPS(1) + spsLen(2) + spsData +
   * numPPS(1) + ppsLen(2) + ppsData
   *
   * @param sps - Raw SPS NAL unit bytes (without start code)
   * @param pps - Raw PPS NAL unit bytes (without start code)
   * @returns AVCC description as Uint8Array
   */
  function buildAvccDescription(sps: Uint8Array, pps: Uint8Array): Uint8Array {
    const size: Num = (11 + sps.length + pps.length) as Num;
    const buf: Uint8Array = new Uint8Array(size as number);
    const view: DataView = new DataView(buf.buffer);

    buf[0] = 1; // version
    buf[1] = sps[1] ?? 0x42; // profile_idc — fallback to Baseline
    buf[2] = sps[2] ?? 0x00; // constraint_set_flags
    buf[3] = sps[3] ?? 0x1e; // level_idc — fallback to 3.0
    buf[4] = 0xff; // lengthSizeMinusOne = 3 (4-byte length prefix)
    buf[5] = 0xe1; // numSPS = 1

    view.setUint16(6, sps.length, false); // big-endian
    buf.set(sps, 8);

    const ppsOffset: Num = (8 + sps.length) as Num;
    buf[ppsOffset as number] = 1; // numPPS = 1
    view.setUint16((ppsOffset as number) + 1, pps.length, false);
    buf.set(pps, (ppsOffset as number) + 3);

    return buf;
  }

  /**
   * Derive the AVC codec string from SPS profile/compat/level bytes.
   *
   * Format: `avc1.XXYYZZ` where XX=profile, YY=compat, ZZ=level (hex).
   *
   * @param sps - Raw SPS NAL unit bytes
   * @returns Codec string like 'avc1.42001e'
   */
  function deriveCodecString(sps: Uint8Array): Str {
    const profile: Str = (sps[1] ?? 0x42).toString(16).padStart(2, '0') as Str;
    const compat: Str = (sps[2] ?? 0x00).toString(16).padStart(2, '0') as Str;
    const level: Str = (sps[3] ?? 0x1e).toString(16).padStart(2, '0') as Str;
    return `avc1.${profile}${compat}${level}` as Str;
  }

  /**
   * Initialize a WebCodecs H.264 VideoDecoder for a card.
   *
   * Creates the decoder, configures it with the AVCC description
   * from SPS/PPS, and wires its output to the card's canvas.
   *
   * @param cardKey - Card identifier
   * @param spsBase64 - Base64-encoded SPS NAL unit
   * @param ppsBase64 - Base64-encoded PPS NAL unit
   */
  function initH264Decoder(cardKey: Str, spsBase64: Str, ppsBase64: Str): void {
    // Clean up existing decoder
    cleanupH264Decoder(cardKey);

    const spsBytes: Uint8Array = Uint8Array.from(
      atob(spsBase64 as string),
      (c: string) => c.codePointAt(0) ?? 0,
    );
    const ppsBytes: Uint8Array = Uint8Array.from(
      atob(ppsBase64 as string),
      (c: string) => c.codePointAt(0) ?? 0,
    );

    const description: Uint8Array = buildAvccDescription(spsBytes, ppsBytes);
    const codec: Str = deriveCodecString(spsBytes);

    const decoder: VideoDecoder = new VideoDecoder({
      output(frame: VideoFrame): void {
        renderVideoFrame(cardKey, frame);
      },
      error(err: DOMException): void {
        log.warn(`H.264 decoder error: ${err.message}`);
      },
    });

    decoder.configure({
      codec: codec as string,
      description: description.buffer as ArrayBuffer,
    });

    liveViewDecoder[cardKey] = decoder;
    liveViewFrameTs[cardKey] = 0 as Num;
    liveViewCodecMode[cardKey] = 'h264' as Str;
  }

  /**
   * Render a VideoFrame from the WebCodecs decoder to the canvas.
   *
   * @param cardKey - Card identifier
   * @param frame - Decoded VideoFrame
   */
  function renderVideoFrame(cardKey: Str, frame: VideoFrame): void {
    try {
      const canvas: HTMLCanvasElement | null = document.querySelector(
        `[data-live-canvas="${cardKey}"]`,
      );
      if (!canvas) {
        frame.close();
        return;
      }

      const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
      if (!ctx) {
        frame.close();
        return;
      }

      // Resize canvas to match frame dimensions if needed
      if (canvas.width !== frame.displayWidth || canvas.height !== frame.displayHeight) {
        canvas.width = frame.displayWidth;
        canvas.height = frame.displayHeight;
      }

      ctx.drawImage(frame, 0, 0);
    } finally {
      frame.close();
    }
  }

  /**
   * Decode an H.264 binary frame via WebCodecs VideoDecoder.
   *
   * Expects the binary data to have a 1-byte header:
   * - Byte 0: flags (bit 0 = keyframe)
   * - Bytes 1..N: H.264 NAL data (Annex B format)
   *
   * Converts Annex B to AVCC format (4-byte length prefix) before
   * feeding to the decoder, which expects AVCC when configured
   * with an AVCC description.
   *
   * @param cardKey - Card identifier
   * @param data - Binary frame data with 1-byte header
   */
  function decodeH264Frame(cardKey: Str, data: ArrayBuffer): void {
    const decoder: VideoDecoder | undefined = liveViewDecoder[cardKey];
    if (!decoder || decoder.state !== 'configured') {
      return;
    }

    const view: Uint8Array = new Uint8Array(data);
    if (view.length < 2) {
      return;
    }

    const firstByte: number = view[0] ?? 0;
    const isKeyframe: boolean = (firstByte & 0x01) !== 0;
    const nalData: Uint8Array = view.subarray(1);

    // Convert Annex B → AVCC (replace start codes with 4-byte length prefix)
    const avccData: Uint8Array = annexBToAvcc(nalData);

    // Increment monotonic timestamp
    const ts: Num = liveViewFrameTs[cardKey] ?? (0 as Num);
    const nextTs: Num = ((ts as number) + 33_333) as Num; // ~30 FPS (33.3ms per frame)
    liveViewFrameTs[cardKey] = nextTs;

    const chunk: EncodedVideoChunk = new EncodedVideoChunk({
      type: isKeyframe ? 'key' : 'delta',
      timestamp: nextTs as number,
      data: avccData,
    });

    decoder.decode(chunk);
  }

  /**
   * Convert Annex B byte stream to AVCC format.
   *
   * Replaces 3-byte (0x000001) and 4-byte (0x00000001) start codes
   * with 4-byte big-endian NAL unit length prefixes.
   *
   * @param data - Annex B formatted H.264 data
   * @returns AVCC formatted data
   */
  function annexBToAvcc(data: Uint8Array): Uint8Array {
    // Find all start code positions
    const nalStarts: Array<{ offset: Num; headerLen: Num }> = [];
    let i: Num = 0 as Num;

    while ((i as number) < data.length - 2) {
      const idx: number = i as number;
      if (data[idx] === 0 && data[idx + 1] === 0) {
        if (data[idx + 2] === 1) {
          nalStarts.push({ offset: i, headerLen: 3 as Num });
          i = (idx + 3) as Num;
          continue;
        }
        if (idx < data.length - 3 && data[idx + 2] === 0 && data[idx + 3] === 1) {
          nalStarts.push({ offset: i, headerLen: 4 as Num });
          i = (idx + 4) as Num;
          continue;
        }
      }
      i = (idx + 1) as Num;
    }

    if (nalStarts.length === 0) {
      return data;
    }

    // Calculate total size: each NAL gets a 4-byte length prefix
    let totalSize: Num = 0 as Num;
    for (let n: Num = 0 as Num; (n as number) < nalStarts.length; n = ((n as number) + 1) as Num) {
      const start = nalStarts[n as number];
      if (start === undefined) {
        continue;
      }
      const nalBodyStart: number = (start.offset as number) + (start.headerLen as number);
      const next = nalStarts[(n as number) + 1];
      const nalBodyEnd: number = next === undefined ? data.length : (next.offset as number);
      totalSize = ((totalSize as number) + 4 + (nalBodyEnd - nalBodyStart)) as Num;
    }

    const result: Uint8Array = new Uint8Array(totalSize as number);
    const resultView: DataView = new DataView(result.buffer);
    let writePos: Num = 0 as Num;

    for (let n: Num = 0 as Num; (n as number) < nalStarts.length; n = ((n as number) + 1) as Num) {
      const start = nalStarts[n as number];
      if (start === undefined) {
        continue;
      }
      const nalBodyStart: number = (start.offset as number) + (start.headerLen as number);
      const next = nalStarts[(n as number) + 1];
      const nalBodyEnd: number = next === undefined ? data.length : (next.offset as number);
      const nalLen: number = nalBodyEnd - nalBodyStart;

      resultView.setUint32(writePos as number, nalLen, false); // big-endian
      result.set(data.subarray(nalBodyStart, nalBodyEnd), (writePos as number) + 4);
      writePos = ((writePos as number) + 4 + nalLen) as Num;
    }

    return result;
  }

  /**
   * Clean up a WebCodecs H.264 decoder for a card.
   *
   * @param cardKey - Card identifier
   */
  function cleanupH264Decoder(cardKey: Str): void {
    const decoder: VideoDecoder | undefined = liveViewDecoder[cardKey];
    if (decoder && decoder.state !== 'closed') {
      decoder.close();
    }
    liveViewDecoder[cardKey] = undefined;
    liveViewFrameTs[cardKey] = 0 as Num;
  }

  /**
   * Callback for LensStats to report collected statistics.
   *
   * @param key - Card identifier
   * @param data - Collected stats data
   */
  function handleStats(key: Str, data: LensStatsData): Void {
    cardStats[key] = data;
  }

  /**
   * Get the CSS color for a budget level traffic light dot.
   *
   * @param level - Budget level
   * @returns Tailwind text color class
   */
  function budgetColor(level: BudgetLevel): Str {
    if (level === 'green') {
      return 'text-emerald-500';
    }
    if (level === 'yellow') {
      return 'text-amber-500';
    }
    return 'text-red-500';
  }

  /**
   * Calculate a health percentage from budget metrics.
   * Green = 100%, Yellow = 50%, Red = 0%. Returns weighted average.
   *
   * @param stats - The stats data containing budget evaluations
   * @returns Health percentage (0-100)
   */
  function healthPercent(stats: LensStatsData): Num {
    const { budgets }: { budgets: MetricBudget[] } = stats;
    if (budgets.length === 0) {
      return 100 as Num;
    }
    const total: Num = budgets.reduce((sum: Num, b: MetricBudget): Num => {
      if (b.level === 'green') {
        return (sum + 100) as Num;
      }
      if (b.level === 'yellow') {
        return (sum + 50) as Num;
      }
      return sum;
    }, 0 as Num);
    return Math.round((total as number) / budgets.length) as Num;
  }

  /** Count of props with default values for prop coverage metric. */
  const propsWithDefaultsCount: Num = $derived(
    propsMeta.filter((p: PropMeta): Bool => p.default !== '').length,
  );

  /* ------------------------------------------------------------------ */
  /*  Stats popover — collapsible section state                         */
  /* ------------------------------------------------------------------ */

  /** Collapsible section open states for the stats popover. */
  let budgetExpanded: Record<Str, Bool> = $state({});
  let statsReportOpen: Bool = $state(true);
  let statsVitalsOpen: Bool = $state(true);
  let statsDomOpen: Bool = $state(true);
  let statsMemoryOpen: Bool = $state(true);
  let statsA11yOpen: Bool = $state(true);
  let statsConsoleOpen: Bool = $state(true);
  let statsPropCoverageOpen: Bool = $state(true);
  /** Whether the re-render timings section is expanded. */
  let statsReRenderOpen: Bool = $state(true);

  /** Per-card refresh counter — incrementing remounts LensStats to re-collect. */
  let statsRefreshKey: Record<Str, Num> = $state({});

  /** Per-card feedback state for "Refresh Stats" checkmark (card key while active). */
  let statsRefreshFeedback: Str = $state('' as Str);

  /* ------------------------------------------------------------------ */
  /*  Stats popover — export                                            */
  /* ------------------------------------------------------------------ */

  /** Which stats export button was recently clicked ('json' | 'markdown' | '' for none). */
  let statsExportCopied: Str = $state('');

  /**
   * Format stats data as a JSON string for export.
   *
   * @param stats - The LensStatsData to format
   * @param name - Display name of the component
   * @returns Pretty-printed JSON string
   */
  function formatStatsJson(stats: LensStatsData, name: Str): Str {
    return JSON.stringify({ component: name, ...stats }, null, 2);
  }

  /**
   * Format stats data as a human-readable Markdown report.
   *
   * @param stats - The LensStatsData to format
   * @param name - Display name of the component
   * @returns Markdown string
   */
  function formatStatsMarkdown(stats: LensStatsData, name: Str): Str {
    const lines: Str[] = [
      `# Performance Report: ${name}`,
      '',
      `**Overall Health:** ${stats.overallHealth}`,
      '',
      '## Budget Metrics',
      '',
      '| Metric | Value | Level | Thresholds |',
      '|--------|-------|-------|------------|',
      ...stats.budgets.map(
        (b: MetricBudget): Str => `| ${b.label} | ${b.value} | ${b.level} | ${b.thresholds} |`,
      ),
      '',
      '## Timing',
      '',
      `- **Mount Time:** ${stats.mountTimeMs}ms`,
      `- **Re-renders:** ${stats.reRenderCount}`,
      `- **Async Content:** ${stats.hasAsyncContent ? 'Yes' : 'No'}`,
      '',
      '## Web Vitals',
      '',
      `- **CLS:** ${stats.vitals.clsScore} (${stats.vitals.clsShiftCount} shifts)`,
    ];
    if (stats.vitals.clsSources.length > 0) {
      for (const src of stats.vitals.clsSources) {
        lines.push(`  - \`${src.selector}\` (${src.tag}, shift: ${src.shiftValue})`);
      }
    }
    lines.push(
      `- **Long Tasks:** ${stats.vitals.longTaskCount === 0 ? 'None' : `${stats.vitals.longTaskCount} · ${stats.vitals.worstLongTaskMs}ms peak`}`,
      `- **First Paint:** ${stats.vitals.paintTimeMs < 0 ? 'Before mount' : `${stats.vitals.paintTimeMs}ms`}`,
      `- **FCP:** ${stats.vitals.fcpTimeMs < 0 ? 'Before mount' : `${stats.vitals.fcpTimeMs}ms`}`,
      `- **LCP:** ${stats.vitals.isLcpComponent ? `${stats.vitals.lcpTimeMs}ms` : '—'}`,
    );
    if (stats.vitals.isLcpComponent && stats.vitals.lcpElement) {
      lines.push(`  - Element: \`${stats.vitals.lcpElement}\``);
    }
    lines.push(
      `- **FID:** ${stats.vitals.fidMs < 0 ? 'Waiting' : `${stats.vitals.fidMs}ms`}`,
      `- **INP:** ${stats.vitals.inpMs < 0 ? 'Waiting' : `${stats.vitals.inpMs}ms`}`,
      `- **TTFB:** ${stats.vitals.ttfbMs < 0 ? 'Unavailable' : `${stats.vitals.ttfbMs}ms`}`,
      `- **Supported:** ${stats.vitals.supported ? 'Yes' : 'No'}`,
      '',
      '## DOM Structure',
      '',
      `- **Nodes:** ${stats.nodeCount}`,
      `- **Depth:** ${stats.domDepth}`,
      `- **Text Nodes:** ${stats.textNodeCount}`,
      `- **Event Listeners:** ${stats.eventListenerCount}`,
      '',
      '## Accessibility',
      '',
      `- **Labels:** ${stats.a11y.labeledCount}/${stats.a11y.focusableCount}`,
      `- **Buttons:** ${stats.a11y.buttonCount}`,
      `- **Links:** ${stats.a11y.linkCount}`,
      `- **Inputs:** ${stats.a11y.inputCount}`,
      `- **Focus Order Issues:** ${stats.a11y.focusOrderIssues.length}`,
    );
    if (stats.a11y.focusOrderIssues.length > 0) {
      for (const issue of stats.a11y.focusOrderIssues) {
        lines.push(`  - \`<${issue.tag} tabindex="${issue.tabindex}">\` ${issue.text}`);
      }
    }
    lines.push(
      `- **Headings:** ${stats.a11y.headings.length} (${stats.a11y.headingSkipsLevel ? 'skips levels' : 'sequential'})`,
    );
    if (stats.a11y.headings.length > 0) {
      for (const h of stats.a11y.headings) {
        lines.push(`  - h${h.level}: ${h.text}`);
      }
    }
    if (stats.a11y.roles.length > 0) {
      lines.push(`- **ARIA Roles:** ${stats.a11y.roles.join(', ')}`);
    }
    if (stats.a11y.landmarks.length > 0) {
      lines.push(`- **Landmarks:** ${stats.a11y.landmarks.join(', ')}`);
    }
    if (stats.a11y.unlabeled.length > 0) {
      lines.push(`- **Unlabeled Elements:** ${stats.a11y.unlabeled.length}`);
      for (const el of stats.a11y.unlabeled) {
        lines.push(
          `  - \`<${el.tag}${el.classes ? ` class="${el.classes}"` : ''}>\`${el.parentContext ? ` in ${el.parentContext}` : ''}`,
        );
      }
    }
    if (stats.a11y.contrastIssues.length > 0) {
      lines.push(`- **Contrast Issues:** ${stats.a11y.contrastIssues.length}`);
      for (const ci of stats.a11y.contrastIssues) {
        lines.push(`  - \`<${ci.tag}>\` "${ci.text}" — ${ci.ratio}:1 (need ${ci.required}:1)`);
      }
    }
    if (stats.a11y.imagesWithoutAlt > 0) {
      lines.push(`- **Images Without Alt:** ${stats.a11y.imagesWithoutAlt}`);
    }
    if (stats.a11y.ariaIssues.length > 0) {
      lines.push(`- **ARIA Issues:** ${stats.a11y.ariaIssues.length}`);
      for (const ai of stats.a11y.ariaIssues) {
        lines.push(`  - \`<${ai.tag}>\` ${ai.issue}`);
      }
    }
    if (stats.a11y.svgsWithoutLabel > 0) {
      lines.push(`- **SVGs Without Label:** ${stats.a11y.svgsWithoutLabel}`);
    }
    lines.push(`- **Animated Elements:** ${stats.a11y.animatedElementCount}`);
    lines.push(
      `- **Reduced Motion Override:** ${stats.a11y.hasReducedMotionOverride ? 'Yes' : 'No'}`,
    );
    if (stats.a11y.tabOrder.length > 0) {
      lines.push(`- **Tab Order:** ${stats.a11y.tabOrder.length} elements`);
      for (const entry of stats.a11y.tabOrder.slice(0, 10)) {
        lines.push(
          `  - \`<${entry.tag}>\` ${entry.text}${entry.tabindex > 0 ? ` (tabindex=${entry.tabindex})` : ''}`,
        );
      }
    }
    lines.push(
      '',
      '## Prop Coverage',
      '',
      `- **With Defaults:** ${stats.propsWithDefaults}/${stats.propsTotal} (${stats.propsTotal > 0 ? Math.round((stats.propsWithDefaults / stats.propsTotal) * 100) : 0}%)`,
    );
    if (stats.reRenderTimings.length > 0) {
      lines.push(
        `- **Re-render Timings:** ${stats.reRenderTimings.map((t: Num): Str => `${t}ms`).join(', ')}`,
      );
    }
    if (stats.memoryDeltaBytes >= 0) {
      lines.push(
        '',
        '## Memory',
        '',
        `- **JS Heap (page total):** ${(stats.memoryDeltaBytes / 1_048_576).toFixed(1)} MB`,
      );
    }
    if (stats.consoleMessages.length > 0) {
      lines.push('', '## Console Messages', '');
      for (const msg of stats.consoleMessages) {
        lines.push(`- **[${msg.level}]** ${msg.message}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Format stats data as CSV.
   *
   * @param stats - The LensStatsData to format
   * @param name - Display name of the component
   * @returns CSV-formatted string
   */
  function formatStatsCsv(stats: LensStatsData, name: Str): Str {
    const header: Str = 'Component,Metric,Value,Level,Thresholds';
    const rows: Str[] = stats.budgets.map((b: MetricBudget): Str => {
      const val: Str = b.value.replaceAll('"', '""');
      const thresh: Str = b.thresholds.replaceAll('"', '""');
      return `"${name}","${b.label}","${val}",${b.level},"${thresh}"`;
    });
    return [header, ...rows].join('\n');
  }

  /** Stats export format menu items with descriptions and file extension badges. */
  const STATS_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Structured data format',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Clipboard',
      description: 'Formatted table for docs',
      ext: '',
    },
    {
      id: 'copy-csv',
      label: 'Copy as CSV',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Spreadsheet-compatible',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Structured data file',
      ext: '.json',
    },
    {
      id: 'download-markdown',
      label: 'Download Markdown',
      icon: Download,
      category: 'File',
      description: 'Formatted table file',
      ext: '.md',
    },
    {
      id: 'download-csv',
      label: 'Download CSV',
      icon: Download,
      category: 'File',
      description: 'Spreadsheet data file',
      ext: '.csv',
    },
  ];

  /** Search query for stats export menu filtering. */
  let statsExportSearchQuery: Str = $state('');

  /** Stats export items filtered by search query (searches label, description, category). */
  const filteredStatsExportItems = $derived(
    statsExportSearchQuery.length === 0
      ? STATS_EXPORT_ITEMS
      : STATS_EXPORT_ITEMS.filter((p) => {
          const q: Str = statsExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique stats export categories present after filtering. */
  const filteredStatsExportCategories: Str[] = $derived([
    ...new Set(filteredStatsExportItems.map((p) => p.category)),
  ]);

  /**
   * Handle stats export by format id.
   *
   * @param stats - The LensStatsData to export
   * @param name - Display name of the component
   * @param formatId - Export format identifier
   */
  async function handleStatsExport(stats: LensStatsData, name: Str, formatId: Str): Promise<void> {
    const slug: Str = name.toLowerCase().replaceAll(/\s+/g, '-');
    if (formatId === 'copy-json') {
      await navigator.clipboard.writeText(formatStatsJson(stats, name));
    } else if (formatId === 'copy-markdown') {
      await navigator.clipboard.writeText(formatStatsMarkdown(stats, name));
    } else if (formatId === 'copy-csv') {
      await navigator.clipboard.writeText(formatStatsCsv(stats, name));
    } else if (formatId === 'download-json') {
      const blob: Blob = new Blob([formatStatsJson(stats, name)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-stats.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'download-markdown') {
      const blob: Blob = new Blob([formatStatsMarkdown(stats, name)], { type: 'text/markdown' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-stats.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'download-csv') {
      const blob: Blob = new Blob([formatStatsCsv(stats, name)], { type: 'text/csv' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-stats.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    statsExportCopied = formatId;
    setTimeout((): Void => {
      statsExportCopied = '';
    }, 1250);
  }

  /**
   * Toggle fullscreen mode for a specific card.
   * Captures the triggering element for focus restoration on exit.
   *
   * @param key - Card identifier
   */
  function toggleFullscreen(key: Str): Void {
    if (!cardFullscreen[key]) {
      /* Entering fullscreen — remember trigger for focus restoration */
      fullscreenTrigger =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    cardFullscreen[key] = !cardFullscreen[key];
    if (!cardFullscreen[key] && fullscreenTrigger) {
      /* Exiting fullscreen — restore focus to the trigger element */
      const trigger: HTMLElement | null = fullscreenTrigger;
      fullscreenTrigger = null;
      requestAnimationFrame((): Void => {
        trigger?.focus();
      });
    }
  }

  /**
   * Exit fullscreen for any card that's currently fullscreen (ESC handler).
   * Restores focus to the element that triggered fullscreen.
   */
  function exitFullscreen(): Void {
    const trigger: HTMLElement | null = fullscreenTrigger;
    fullscreenTrigger = null;
    for (const key of Object.keys(cardFullscreen)) {
      if (cardFullscreen[key]) {
        cardFullscreen[key] = false;
      }
    }
    if (trigger) {
      requestAnimationFrame((): Void => {
        trigger.focus();
      });
    }
  }

  /** Whether any card is currently fullscreen — drives body scroll lock. */
  const anyFullscreen: Bool = $derived(Object.values(cardFullscreen).some(Boolean));

  /** Lock body scroll while any card is in fullscreen mode. */
  $effect(() => {
    if (anyFullscreen) {
      document.body.style.overflow = 'hidden';
    }
    return (): Void => {
      document.body.style.overflow = '';
    };
  });

  /**
   * Listen for `lens:export-component` events dispatched from LensHeader.
   * Triggers handleExport on the default card with the requested format.
   */
  $effect(() => {
    /**
     * Handle lens:export-component custom event.
     *
     * @param e - CustomEvent with format ID detail
     */
    const onExportComponent = (e: Event): void => {
      const formatId: Str = (e as CustomEvent<Str>).detail;
      handleExport('default', formatId);
    };
    document.addEventListener('lens:export-component', onExportComponent);
    return (): Void => {
      document.removeEventListener('lens:export-component', onExportComponent);
    };
  });

  /** DOM references to card preview areas for export. */
  let cardPreviewRefs: Record<Str, HTMLDivElement | undefined> = $state({});

  /** DOM references to the actual rendered component wrapper for size measurement. */
  let cardComponentRefs: Record<Str, HTMLDivElement | undefined> = $state({});

  /**
   * Extract a short human-readable cause from a caught error.
   *
   * @param error - The caught error value
   * @returns A one-line error cause string
   */
  function getErrorCause(error: unknown): Str {
    if (!silent) {
      log.warn('Component preview error', { error });
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      // Cast once for property access — error is an unknown object from svelte:boundary
      const obj: Record<Str, unknown> = error as Record<Str, unknown>;
      const code: Str = typeof obj.code === 'string' ? obj.code : '';
      const msg: Str = typeof obj.message === 'string' ? obj.message : '';
      if (msg) {
        return code ? `[${code}] ${msg}` : msg;
      }
      if (code) {
        return code;
      }
    }
    return String(error);
  }

  /**
   * Serialize a caught error into a formatted JSON string for code display.
   * Handles Error instances (extracts name/message/stack), AppError objects
   * (includes validation details), and unknown values.
   *
   * @param error - The caught error value
   * @returns A pretty-printed JSON string of the error details
   */
  function serializeError(error: unknown): Str {
    if (error instanceof Error) {
      const errorObj: Record<Str, unknown> = {
        name: error.name,
        message: error.message,
      };
      if (error.stack) {
        errorObj.stack = error.stack;
      }
      return JSON.stringify(errorObj, null, 2);
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.stringify(error, null, 2);
      } catch {
        // Circular reference or non-serializable — fall back to String
        return String(error);
      }
    }
    return String(error);
  }

  /**
   * Svelte action that measures an element's visual bounding height via getBoundingClientRect.
   * Re-measures on resize and when the `landscape` param changes (orientation toggle).
   * Used to set container min-height so rotated+zoomed content fits without clipping.
   *
   * @param node - The DOM element to observe
   * @param params - Card key and whether landscape orientation is active
   * @returns Svelte action lifecycle with update and destroy methods
   */
  function trackContentSize(
    node: HTMLElement,
    params: { key: Str; landscape: Bool },
  ): { update: (p: { key: Str; landscape: Bool }) => Void; destroy: () => Void } {
    let current: { key: Str; landscape: Bool } = params;

    function measure(): Void {
      if (current.landscape) {
        const rect: DOMRect = node.getBoundingClientRect();
        cardContentHeights[current.key] = rect.height;
      } else {
        cardContentHeights[current.key] = 0;
      }
    }

    const observer: ResizeObserver = new ResizeObserver((): Void => {
      requestAnimationFrame(measure);
    });
    observer.observe(node);
    requestAnimationFrame(measure);

    return {
      update(newParams: { key: Str; landscape: Bool }): Void {
        current = newParams;
        requestAnimationFrame(measure);
      },
      destroy(): Void {
        observer.disconnect();
        cardContentHeights[current.key] = 0;
      },
    };
  }

  /**
   * Svelte action that observes the portal div (`[data-lens-portal]`) inside a
   * transform container and tracks the maximum height of its children.
   *
   * Portal children (dialogs, sheets, dropdowns) use `position: fixed` which,
   * inside a transform containing block, positions relative to the container.
   * This action measures those children so the card can auto-expand its
   * min-height to avoid clipping overlay content.
   *
   * @param node - The transform container element
   * @param key - Card key for indexing into `cardPortalHeights`
   * @returns Svelte action lifecycle with update and destroy methods
   */
  function trackPortalSize(
    node: HTMLElement,
    key: Str,
  ): { update: (k: Str) => Void; destroy: () => Void } {
    let currentKey: Str = key;
    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;

    /** Measure the tallest portal child and update state. */
    function measure(): Void {
      const portalEl: HTMLElement | null = node.querySelector('[data-lens-portal]');
      if (!portalEl || portalEl.children.length === 0) {
        cardPortalHeights[currentKey] = 0;
        return;
      }
      let maxH: Num = 0;
      for (const child of portalEl.children) {
        const rect: DOMRect = child.getBoundingClientRect();
        if (rect.height > maxH) {
          maxH = rect.height;
        }
      }
      cardPortalHeights[currentKey] = maxH;
    }

    /** Set up ResizeObserver on all current portal children. */
    function observePortalChildren(): Void {
      resizeObserver?.disconnect();
      const portalEl: HTMLElement | null = node.querySelector('[data-lens-portal]');
      if (!portalEl) {
        return;
      }
      resizeObserver = new ResizeObserver((): void => {
        requestAnimationFrame(measure);
      });
      // Observe each child so we catch dialogs/sheets appearing/resizing
      for (const child of portalEl.children) {
        resizeObserver.observe(child);
      }
      requestAnimationFrame(measure);
    }

    // Watch for children added/removed from the portal div
    mutationObserver = new MutationObserver((): void => {
      observePortalChildren();
    });

    // The portal div is created asynchronously by LensPortalScope's $effect,
    // so poll briefly until it appears, then attach the mutation observer
    function waitForPortal(): Void {
      const portalEl: HTMLElement | null = node.querySelector('[data-lens-portal]');
      if (portalEl) {
        mutationObserver?.observe(portalEl, { childList: true });
        observePortalChildren();
      } else {
        requestAnimationFrame(waitForPortal);
      }
    }
    waitForPortal();

    return {
      update(newKey: Str): Void {
        currentKey = newKey;
        requestAnimationFrame(measure);
      },
      destroy(): Void {
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        cardPortalHeights[currentKey] = 0;
      },
    };
  }

  /**
   * Tracks whether the page is in dark mode (html has `.dark` class).
   * Used to mirror the page mode on per-card preview divs when mode is "auto"
   * so that CSS selectors like `[data-theme='X'].dark` match correctly.
   */
  let pageIsDark: Bool = $state(false);

  $effect(() => {
    const html: HTMLElement = document.documentElement;
    pageIsDark = html.classList.contains('dark');

    const observer: MutationObserver = new MutationObserver((): Void => {
      pageIsDark = html.classList.contains('dark');
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return (): Void => {
      observer.disconnect();
    };
  });

  /** Search query for filtering accessibility simulation items. */
  let simSearchQuery: Str = $state('');

  /** Search query for filtering viewport/device presets. */
  let viewportSearchQuery: Str = $state('');

  /** Search query for filtering network simulation presets. */
  let networkSearchQuery: Str = $state('');

  /** Search query for filtering background presets. */
  let bgSearchQuery: Str = $state('');

  /** Search query for filtering outline presets. */
  let outlineSearchQuery: Str = $state('');

  /** Search query for filtering grid presets. */
  let gridSearchQuery: Str = $state('');

  /** Search query for filtering color mode presets. */
  let modeSearchQuery: Str = $state('');

  /** Search query for filtering theme presets. */
  let themeSearchQuery: Str = $state('');

  /** Search query for filtering orientation presets. */
  let orientationSearchQuery: Str = $state('');

  /** Search query for filtering media preference groups. */
  let mediaPrefSearchQuery: Str = $state('');

  /** Search query for filtering export format items. */
  let exportSearchQuery: Str = $state('');

  /** Search query for filtering text direction items. */
  let dirSearchQuery: Str = $state('');

  /**
   * Svelte action that locks an element's height to its initial rendered value.
   * Prevents dropdown SubContent from shrinking when search filtering reduces
   * the item count, which would trigger bits-ui's GraceArea pointerleave and
   * close the submenu before the user can click a filtered result.
   *
   * @param node - The scrollable container element inside a SubContent
   * @returns Action lifecycle with destroy cleanup
   */
  /**
   * Svelte use: action that auto-focuses the element on mount.
   *
   * @param node - The DOM element to focus
   */
  function autoFocus(node: HTMLElement): void {
    node.focus();
  }

  function lockHeight(node: HTMLElement): { destroy: () => void } {
    const raf: Num = requestAnimationFrame((): void => {
      node.style.minHeight = `${node.offsetHeight}px`;
    });
    return {
      destroy(): void {
        cancelAnimationFrame(raf);
        node.style.minHeight = '';
      },
    };
  }

  /**
   * Svelte action that auto-scrolls a container to the bottom when entries change.
   *
   * @param node - The scrollable console container
   * @param params - Key for the card and current logs array
   * @returns Action lifecycle with update callback
   */
  function autoScrollConsole(
    node: HTMLElement,
    params: { key: Str; logs: ConsoleLogEntry[] },
  ): { update: (p: { key: Str; logs: ConsoleLogEntry[] }) => void } {
    const scroll = (p: { key: Str; logs: ConsoleLogEntry[] }): void => {
      if (cardConsoleAutoScroll[p.key] ?? true) {
        requestAnimationFrame((): void => {
          node.scrollTop = node.scrollHeight;
        });
      }
    };
    scroll(params);
    return {
      update(p: { key: Str; logs: ConsoleLogEntry[] }): void {
        scroll(p);
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Background presets                                                */
  /* ------------------------------------------------------------------ */

  const BG_PRESETS: Array<{ id: Str; label: Str; style: Str }> = [
    { id: 'default', label: 'Default', style: '' },
    { id: 'white', label: 'White', style: 'background-color: #ffffff' },
    { id: 'light', label: 'Light', style: 'background-color: #f8f8f8' },
    { id: 'light-gray', label: 'Light Gray', style: 'background-color: #e5e5e5' },
    { id: 'medium-gray', label: 'Medium Gray', style: 'background-color: #a3a3a3' },
    { id: 'dark-gray', label: 'Dark Gray', style: 'background-color: #404040' },
    { id: 'near-black', label: 'Near Black', style: 'background-color: #1a1a1a' },
    { id: 'black', label: 'Black', style: 'background-color: #000000' },
    {
      id: 'checkerboard',
      label: 'Checkerboard',
      style:
        'background-image: repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%); background-size: 16px 16px',
    },
    {
      id: 'dot-grid',
      label: 'Dot Grid',
      style:
        'background-image: radial-gradient(circle, #d4d4d4 1px, transparent 1px); background-size: 16px 16px',
    },
    {
      id: 'cross-hatch',
      label: 'Cross Hatch',
      style:
        'background-image: linear-gradient(45deg, #d4d4d4 1px, transparent 1px), linear-gradient(-45deg, #d4d4d4 1px, transparent 1px); background-size: 12px 12px',
    },
    {
      id: 'diagonal-stripes',
      label: 'Diagonal Stripes',
      style:
        'background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, #d4d4d4 8px, #d4d4d4 9px); background-size: 16px 16px',
    },
    {
      id: 'horizontal-lines',
      label: 'Horizontal Lines',
      style:
        'background-image: repeating-linear-gradient(0deg, transparent, transparent 7px, #d4d4d4 7px, #d4d4d4 8px)',
    },
    {
      id: 'graph-paper',
      label: 'Graph Paper',
      style:
        'background-image: linear-gradient(#d4d4d4 1px, transparent 1px), linear-gradient(90deg, #d4d4d4 1px, transparent 1px); background-size: 16px 16px',
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Zoom presets                                                      */
  /* ------------------------------------------------------------------ */

  const ZOOM_PRESETS: Array<{ value: Num; label: Str }> = [
    { value: 0.25, label: '25%' },
    { value: (1 / 3) as Num, label: '33%' },
    { value: 0.5, label: '50%' },
    { value: (2 / 3) as Num, label: '67%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.25, label: '125%' },
    { value: 1.5, label: '150%' },
    { value: 1.75, label: '175%' },
    { value: 2, label: '200%' },
    { value: 2.5, label: '250%' },
    { value: 3, label: '300%' },
    { value: 4, label: '400%' },
    { value: 5, label: '500%' },
  ];

  const ZOOM_STEP: Num = 0.25;
  const ZOOM_MIN: Num = 0.25;
  const ZOOM_MAX: Num = 5;

  /* ------------------------------------------------------------------ */
  /*  Outline presets                                                    */
  /* ------------------------------------------------------------------ */

  const OUTLINE_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.25)' },
    { id: 'orange', label: 'Orange', color: 'rgba(249, 115, 22, 0.3)' },
    { id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.35)' },
    { id: 'pink', label: 'Pink', color: 'rgba(236, 72, 153, 0.3)' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.35)' },
    { id: 'cyan', label: 'Cyan', color: 'rgba(6, 182, 212, 0.3)' },
    { id: 'teal', label: 'Teal', color: 'rgba(20, 184, 166, 0.3)' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.35)' },
    { id: 'purple', label: 'Purple', color: 'rgba(168, 85, 247, 0.3)' },
    { id: 'lime', label: 'Lime', color: 'rgba(132, 204, 22, 0.3)' },
    { id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)' },
    { id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.25)' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Grid presets                                                       */
  /* ------------------------------------------------------------------ */

  const GRID_DEFAULT_SIZE: Num = 16;

  const GRID_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
    { id: 'light', label: 'Light', color: 'rgba(0, 0, 0, 0.06)' },
    { id: 'medium', label: 'Medium', color: 'rgba(0, 0, 0, 0.12)' },
    { id: 'dark', label: 'Dark', color: 'rgba(0, 0, 0, 0.25)' },
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.15)' },
    { id: 'orange', label: 'Orange', color: 'rgba(249, 115, 22, 0.15)' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.2)' },
    { id: 'cyan', label: 'Cyan', color: 'rgba(6, 182, 212, 0.15)' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.2)' },
    { id: 'purple', label: 'Purple', color: 'rgba(168, 85, 247, 0.15)' },
  ];

  const GRID_FILL_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
    { id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)' },
    { id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.3)' },
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.08)' },
    { id: 'orange', label: 'Orange', color: 'rgba(249, 115, 22, 0.08)' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.08)' },
    { id: 'cyan', label: 'Cyan', color: 'rgba(6, 182, 212, 0.08)' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.08)' },
    { id: 'purple', label: 'Purple', color: 'rgba(168, 85, 247, 0.08)' },
    { id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.08)' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Orientation presets                                                */
  /* ------------------------------------------------------------------ */

  const ORIENTATION_PRESETS: Array<{ id: Str; label: Str; rotation: Num }> = [
    { id: 'portrait-primary', label: 'Portrait', rotation: 0 },
    { id: 'landscape-primary', label: 'Landscape', rotation: 90 },
    { id: 'portrait-secondary', label: 'Portrait Inverted', rotation: 180 },
    { id: 'landscape-secondary', label: 'Landscape Inverted', rotation: 270 },
    { id: 'tilt-15', label: 'Slight Tilt', rotation: 15 },
    { id: 'tilt-30', label: 'Moderate Tilt', rotation: 30 },
    { id: 'tilt-345', label: 'Slight Counter-Tilt', rotation: 345 },
    { id: 'tilt-330', label: 'Moderate Counter-Tilt', rotation: 330 },
    { id: 'diagonal-45', label: 'Diagonal Right', rotation: 45 },
    { id: 'diagonal-135', label: 'Diagonal Down-Right', rotation: 135 },
    { id: 'diagonal-225', label: 'Diagonal Down-Left', rotation: 225 },
    { id: 'diagonal-315', label: 'Diagonal Left', rotation: 315 },
  ];

  /* ------------------------------------------------------------------ */
  /*  Color mode presets                                                 */
  /* ------------------------------------------------------------------ */

  const MODE_PRESETS: Array<{ id: Str; label: Str; icon: Component }> = [
    { id: 'auto', label: 'Auto', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'high-contrast', label: 'High Contrast', icon: Sun },
  ];

  /* ------------------------------------------------------------------ */
  /*  Theme presets                                                      */
  /* ------------------------------------------------------------------ */

  const THEME_PRESETS: Array<{ id: Str; label: Str; dot: Str }> = [
    { id: '', label: 'Default', dot: '' },
    { id: 'midnight', label: 'Midnight', dot: 'oklch(0.55 0.22 260)' },
    { id: 'ocean', label: 'Ocean', dot: 'oklch(0.52 0.15 200)' },
    { id: 'slate', label: 'Slate', dot: 'oklch(0.48 0.08 240)' },
    { id: 'warm', label: 'Warm', dot: 'oklch(0.50 0.16 50)' },
    { id: 'sunset', label: 'Sunset', dot: 'oklch(0.55 0.20 30)' },
    { id: 'copper', label: 'Copper', dot: 'oklch(0.52 0.16 60)' },
    { id: 'rose', label: 'Rose', dot: 'oklch(0.55 0.18 350)' },
    { id: 'lavender', label: 'Lavender', dot: 'oklch(0.52 0.20 290)' },
    { id: 'amethyst', label: 'Amethyst', dot: 'oklch(0.52 0.22 310)' },
    { id: 'forest', label: 'Forest', dot: 'oklch(0.50 0.16 155)' },
    { id: 'aurora', label: 'Aurora', dot: 'oklch(0.52 0.15 170)' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Media query preference presets                                     */
  /* ------------------------------------------------------------------ */

  /** Media query preference groups with their options (synced with LensCardSettingsMenu). */
  const MEDIA_PREF_GROUPS: Array<{
    /** CSS media feature name. */
    pref: Str;
    /** Display label. */
    label: Str;
    /** Default/neutral value. */
    defaultValue: Str;
    /** Available options. */
    options: Array<{ value: Str; label: Str }>;
  }> = [
    {
      pref: 'reduced-motion',
      label: 'Reduced Motion',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference' },
        { value: 'reduce', label: 'Reduce' },
      ],
    },
    {
      pref: 'contrast',
      label: 'Contrast',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference' },
        { value: 'more', label: 'More' },
        { value: 'less', label: 'Less' },
      ],
    },
    {
      pref: 'reduced-transparency',
      label: 'Reduced Transparency',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference' },
        { value: 'reduce', label: 'Reduce' },
      ],
    },
    {
      pref: 'forced-colors',
      label: 'Forced Colors',
      defaultValue: 'none',
      options: [
        { value: 'none', label: 'None' },
        { value: 'active', label: 'Active' },
      ],
    },
    {
      pref: 'color-scheme',
      label: 'Color Scheme',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
    },
    {
      pref: 'color-gamut',
      label: 'Color Gamut',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference' },
        { value: 'srgb', label: 'sRGB' },
        { value: 'p3', label: 'Display P3' },
        { value: 'rec2020', label: 'Rec. 2020' },
      ],
    },
    {
      pref: 'inverted-colors',
      label: 'Inverted Colors',
      defaultValue: 'none',
      options: [
        { value: 'none', label: 'None' },
        { value: 'inverted', label: 'Inverted' },
      ],
    },
    {
      pref: 'reduced-data',
      label: 'Reduced Data',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference' },
        { value: 'reduce', label: 'Reduce' },
      ],
    },
    {
      pref: 'display-mode',
      label: 'Display Mode',
      defaultValue: 'browser',
      options: [
        { value: 'browser', label: 'Browser' },
        { value: 'standalone', label: 'Standalone' },
        { value: 'fullscreen', label: 'Fullscreen' },
        { value: 'minimal-ui', label: 'Minimal UI' },
      ],
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Network condition presets                                          */
  /* ------------------------------------------------------------------ */

  /** Network simulation presets with latency delays in ms (-1 = permanent/offline). */
  const NETWORK_PRESETS: Array<{
    id: Str;
    label: Str;
    delay: Num;
    description: Str;
    category: Str;
  }> = [
    {
      id: 'none',
      label: 'No throttling',
      delay: 0,
      description: 'Full speed, no artificial delay',
      category: '',
    },
    // Mobile
    {
      id: 'gprs',
      label: 'GPRS',
      delay: 500,
      description: '~50 kbps, 500ms RTT',
      category: 'Mobile',
    },
    {
      id: '2g-edge',
      label: '2G / EDGE',
      delay: 300,
      description: '~240 kbps, 300ms RTT',
      category: 'Mobile',
    },
    { id: '3g', label: '3G', delay: 2000, description: '~400 kbps, 2s RTT', category: 'Mobile' },
    {
      id: '3g-hspa',
      label: '3G / HSPA',
      delay: 120,
      description: '~1.5 Mbps, 120ms RTT',
      category: 'Mobile',
    },
    {
      id: '3g-hspa-plus',
      label: '3G / HSPA+',
      delay: 80,
      description: '~4 Mbps, 80ms RTT',
      category: 'Mobile',
    },
    {
      id: 'slow-4g',
      label: 'Slow 4G',
      delay: 562,
      description: '~1.4 Mbps, 562ms RTT',
      category: 'Mobile',
    },
    {
      id: 'fast-4g',
      label: 'Fast 4G / LTE',
      delay: 165,
      description: '~9 Mbps, 165ms RTT',
      category: 'Mobile',
    },
    {
      id: 'lte-a',
      label: 'LTE-Advanced',
      delay: 30,
      description: '~15 Mbps, 30ms RTT',
      category: 'Mobile',
    },
    {
      id: '5g-sub6',
      label: '5G Sub-6 GHz',
      delay: 10,
      description: '~100 Mbps, 10ms RTT',
      category: 'Mobile',
    },
    {
      id: '5g-mmwave',
      label: '5G mmWave',
      delay: 5,
      description: '~1 Gbps, 5ms RTT',
      category: 'Mobile',
    },
    {
      id: '5g-plus',
      label: '5G+ / 5G UC',
      delay: 3,
      description: '~2 Gbps, 3ms RTT',
      category: 'Mobile',
    },
    // Fixed
    {
      id: '56k',
      label: '56K Dial-up',
      delay: 120,
      description: '~50 kbps, 120ms RTT',
      category: 'Fixed',
    },
    { id: 'dsl', label: 'DSL', delay: 25, description: '~2 Mbps, 25ms RTT', category: 'Fixed' },
    {
      id: 'cable-5',
      label: 'Cable 5 Mbps',
      delay: 28,
      description: '~5 Mbps, 28ms RTT',
      category: 'Fixed',
    },
    {
      id: 'cable-50',
      label: 'Cable 50 Mbps',
      delay: 10,
      description: '~50 Mbps, 10ms RTT',
      category: 'Fixed',
    },
    {
      id: 'cable-100',
      label: 'Cable 100 Mbps',
      delay: 8,
      description: '~100 Mbps, 8ms RTT',
      category: 'Fixed',
    },
    { id: 'wifi', label: 'Wi-Fi', delay: 5, description: '~30 Mbps, 5ms RTT', category: 'Fixed' },
    {
      id: 'wifi-6',
      label: 'Wi-Fi 6',
      delay: 3,
      description: '~100 Mbps, 3ms RTT',
      category: 'Fixed',
    },
    {
      id: 'fiber',
      label: 'Fiber / FIOS',
      delay: 4,
      description: '~100 Mbps, 4ms RTT',
      category: 'Fixed',
    },
    {
      id: 'fiber-gigabit',
      label: 'Fiber Gigabit',
      delay: 2,
      description: '~1 Gbps, 2ms RTT',
      category: 'Fixed',
    },
    {
      id: 'fiber-10g',
      label: '10G Fiber',
      delay: 1,
      description: '~10 Gbps, 1ms RTT',
      category: 'Fixed',
    },
    {
      id: 'wifi-6e',
      label: 'Wi-Fi 6E',
      delay: 2,
      description: '~200 Mbps, 2ms RTT',
      category: 'Fixed',
    },
    {
      id: 'wifi-7',
      label: 'Wi-Fi 7',
      delay: 1,
      description: '~300 Mbps, 1ms RTT',
      category: 'Fixed',
    },
    // Satellite
    {
      id: 'satellite-geo',
      label: 'Satellite GEO (HughesNet)',
      delay: 600,
      description: '~25 Mbps, 600ms RTT',
      category: 'Satellite',
    },
    {
      id: 'satellite-leo',
      label: 'Satellite LEO (Starlink)',
      delay: 25,
      description: '~50 Mbps, 25ms RTT',
      category: 'Satellite',
    },
    // Special
    {
      id: 'offline',
      label: 'Offline',
      delay: -1,
      description: 'No connection',
      category: 'Special',
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Viewport / device simulation presets                               */
  /* ------------------------------------------------------------------ */

  /** Viewport presets organized by device category. Width and height in CSS pixels. */
  const VIEWPORT_PRESETS: Array<{ id: Str; label: Str; width: Num; height: Num; category: Str }> = [
    // ── Watches ──
    {
      id: 'watch-sm',
      label: 'Apple Watch (38–40mm)',
      width: 197,
      height: 162,
      category: 'Watches',
    },
    {
      id: 'watch-md',
      label: 'Apple Watch (42–44mm)',
      width: 224,
      height: 184,
      category: 'Watches',
    },
    {
      id: 'watch-ultra',
      label: 'Apple Watch Ultra (49mm)',
      width: 205,
      height: 251,
      category: 'Watches',
    },
    { id: 'watch-galaxy', label: 'Galaxy Watch', width: 240, height: 240, category: 'Watches' },
    { id: 'watch-wear-os', label: 'Wear OS (round)', width: 240, height: 240, category: 'Watches' },
    // ── Phones ──
    {
      id: 'galaxy-z-fold-cover',
      label: 'Galaxy Z Fold (Cover)',
      width: 323,
      height: 694,
      category: 'Phones',
    },
    {
      id: 'galaxy-s25',
      label: 'Galaxy S25 / S24 / S23',
      width: 360,
      height: 800,
      category: 'Phones',
    },
    {
      id: 'galaxy-a-760',
      label: 'Galaxy A (budget, 760)',
      width: 360,
      height: 760,
      category: 'Phones',
    },
    { id: 'galaxy-a-780', label: 'Galaxy A13 / A23', width: 360, height: 780, category: 'Phones' },
    {
      id: 'galaxy-a-804',
      label: 'Galaxy A (mid, 804)',
      width: 360,
      height: 804,
      category: 'Phones',
    },
    {
      id: 'galaxy-a-806',
      label: 'Galaxy A / Xiaomi (806)',
      width: 360,
      height: 806,
      category: 'Phones',
    },
    { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667, category: 'Phones' },
    {
      id: 'iphone-x',
      label: 'iPhone X / XS / 12 Mini / 13 Mini',
      width: 375,
      height: 812,
      category: 'Phones',
    },
    { id: 'galaxy-s24', label: 'Galaxy S24 / A55', width: 384, height: 832, category: 'Phones' },
    {
      id: 'galaxy-a-854',
      label: 'Galaxy A14 / A series (854)',
      width: 384,
      height: 854,
      category: 'Phones',
    },
    {
      id: 'galaxy-a-857',
      label: 'Galaxy A series (857)',
      width: 384,
      height: 857,
      category: 'Phones',
    },
    {
      id: 'galaxy-s25-new',
      label: 'Galaxy S25 / S25+',
      width: 385,
      height: 854,
      category: 'Phones',
    },
    {
      id: 'iphone-16',
      label: 'iPhone 16 / 15 / 14 / 13',
      width: 390,
      height: 844,
      category: 'Phones',
    },
    {
      id: 'xiaomi-851',
      label: 'Xiaomi / Samsung (851)',
      width: 393,
      height: 851,
      category: 'Phones',
    },
    {
      id: 'iphone-16-pro',
      label: 'iPhone 16 Pro / 15 Pro / Z Flip',
      width: 393,
      height: 852,
      category: 'Phones',
    },
    { id: 'galaxy-a54', label: 'Galaxy A54 / A55', width: 393, height: 873, category: 'Phones' },
    { id: 'iphone-17', label: 'iPhone 17 / 17 Pro', width: 402, height: 874, category: 'Phones' },
    { id: 'pixel-10-pro', label: 'Pixel 10 Pro', width: 410, height: 892, category: 'Phones' },
    {
      id: 'pixel-9-pro',
      label: 'Pixel 9 Pro / OnePlus',
      width: 412,
      height: 892,
      category: 'Phones',
    },
    {
      id: 'pixel-10',
      label: 'Pixel 10 / 9 / 8 / Galaxy S Ultra',
      width: 412,
      height: 915,
      category: 'Phones',
    },
    {
      id: 'iphone-11',
      label: 'iPhone 11 / XR / Pixel Pro XL',
      width: 414,
      height: 896,
      category: 'Phones',
    },
    {
      id: 'iphone-16-plus',
      label: 'iPhone 16 Plus / 15 Plus',
      width: 428,
      height: 926,
      category: 'Phones',
    },
    {
      id: 'iphone-16-pro-max',
      label: 'iPhone 16 Pro Max / 15 Pro Max',
      width: 430,
      height: 932,
      category: 'Phones',
    },
    {
      id: 'iphone-17-pro-max',
      label: 'iPhone 17 Pro Max',
      width: 440,
      height: 956,
      category: 'Phones',
    },
    // ── Foldables (unfolded) ──
    {
      id: 'galaxy-z-fold-main',
      label: 'Galaxy Z Fold (Main)',
      width: 619,
      height: 876,
      category: 'Foldables',
    },
    { id: 'galaxy-z-flip', label: 'Galaxy Z Flip', width: 412, height: 846, category: 'Foldables' },
    {
      id: 'pixel-fold-main',
      label: 'Pixel Fold (Main)',
      width: 692,
      height: 1004,
      category: 'Foldables',
    },
    // ── E-Readers ──
    { id: 'kindle-pw', label: 'Kindle Paperwhite', width: 632, height: 842, category: 'E-Readers' },
    { id: 'kindle-oasis', label: 'Kindle Oasis', width: 640, height: 920, category: 'E-Readers' },
    // ── Fire Tablets ──
    { id: 'fire-7', label: 'Amazon Fire 7', width: 600, height: 1024, category: 'Fire Tablets' },
    {
      id: 'fire-hd-8',
      label: 'Amazon Fire HD 8',
      width: 601,
      height: 1007,
      category: 'Fire Tablets',
    },
    {
      id: 'fire-hd-10',
      label: 'Amazon Fire HD 10',
      width: 810,
      height: 1080,
      category: 'Fire Tablets',
    },
    {
      id: 'fire-max-11',
      label: 'Amazon Fire Max 11',
      width: 1200,
      height: 2000,
      category: 'Fire Tablets',
    },
    // ── Tablets ──
    { id: 'ipad-mini', label: 'iPad Mini', width: 744, height: 1133, category: 'Tablets' },
    { id: 'surface-go', label: 'Surface Go', width: 768, height: 1024, category: 'Tablets' },
    { id: 'galaxy-tab', label: 'Galaxy Tab S7+', width: 800, height: 1280, category: 'Tablets' },
    { id: 'ipad-10', label: 'iPad 10th gen', width: 810, height: 1080, category: 'Tablets' },
    { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180, category: 'Tablets' },
    { id: 'ipad-pro-11', label: 'iPad Pro 11"', width: 834, height: 1194, category: 'Tablets' },
    { id: 'surface-pro', label: 'Surface Pro', width: 912, height: 1368, category: 'Tablets' },
    { id: 'ipad-pro-12', label: 'iPad Pro 12.9"', width: 1024, height: 1366, category: 'Tablets' },
    { id: 'xiaomi-pad', label: 'Xiaomi Pad 6', width: 1200, height: 2000, category: 'Tablets' },
    // ── Chromebooks ──
    {
      id: 'chromebook',
      label: 'Chromebook (common)',
      width: 1366,
      height: 768,
      category: 'Chromebooks',
    },
    {
      id: 'chromebook-hd',
      label: 'Chromebook HD+',
      width: 1536,
      height: 864,
      category: 'Chromebooks',
    },
    // ── Handhelds ──
    { id: 'steam-deck', label: 'Steam Deck', width: 1280, height: 800, category: 'Handhelds' },
    {
      id: 'steam-deck-oled',
      label: 'Steam Deck OLED',
      width: 1280,
      height: 800,
      category: 'Handhelds',
    },
    { id: 'switch', label: 'Nintendo Switch', width: 1280, height: 720, category: 'Handhelds' },
    {
      id: 'switch-oled',
      label: 'Nintendo Switch OLED',
      width: 1280,
      height: 720,
      category: 'Handhelds',
    },
    {
      id: 'switch-2',
      label: 'Nintendo Switch 2',
      width: 1920,
      height: 1080,
      category: 'Handhelds',
    },
    {
      id: 'ps-portal',
      label: 'PlayStation Portal',
      width: 1920,
      height: 1080,
      category: 'Handhelds',
    },
    { id: 'rog-ally', label: 'ASUS ROG Ally', width: 1920, height: 1080, category: 'Handhelds' },
    {
      id: 'lenovo-legion-go',
      label: 'Lenovo Legion Go',
      width: 2560,
      height: 1600,
      category: 'Handhelds',
    },
    // ── Laptop / Desktop ──
    {
      id: 'laptop-sm',
      label: 'Laptop (small)',
      width: 1280,
      height: 800,
      category: 'Laptop / Desktop',
    },
    {
      id: 'laptop-lg',
      label: 'Laptop (large)',
      width: 1440,
      height: 900,
      category: 'Laptop / Desktop',
    },
    {
      id: 'desktop-fhd',
      label: 'Desktop Full HD',
      width: 1920,
      height: 1080,
      category: 'Laptop / Desktop',
    },
    {
      id: 'desktop-qhd',
      label: 'Desktop QHD',
      width: 2560,
      height: 1440,
      category: 'Laptop / Desktop',
    },
    {
      id: 'ultrawide',
      label: 'Ultrawide',
      width: 3440,
      height: 1440,
      category: 'Laptop / Desktop',
    },
    {
      id: 'desktop-4k',
      label: 'Desktop 4K',
      width: 3840,
      height: 2160,
      category: 'Laptop / Desktop',
    },
    // ── Smart Displays ──
    {
      id: 'echo-show-5',
      label: 'Echo Show 5',
      width: 960,
      height: 480,
      category: 'Smart Displays',
    },
    {
      id: 'nest-hub',
      label: 'Google Nest Hub',
      width: 1024,
      height: 600,
      category: 'Smart Displays',
    },
    {
      id: 'echo-show-8',
      label: 'Echo Show 8',
      width: 1200,
      height: 800,
      category: 'Smart Displays',
    },
    {
      id: 'echo-show-10',
      label: 'Echo Show 10',
      width: 1200,
      height: 800,
      category: 'Smart Displays',
    },
    {
      id: 'nest-hub-max',
      label: 'Google Nest Hub Max',
      width: 1280,
      height: 800,
      category: 'Smart Displays',
    },
    {
      id: 'echo-show-15',
      label: 'Echo Show 15',
      width: 1920,
      height: 1080,
      category: 'Smart Displays',
    },
    // ── Automotive ──
    {
      id: 'car-cluster',
      label: 'Car Instrument Cluster',
      width: 1280,
      height: 480,
      category: 'Automotive',
    },
    {
      id: 'carplay',
      label: 'Apple CarPlay (wide)',
      width: 1920,
      height: 720,
      category: 'Automotive',
    },
    { id: 'android-auto', label: 'Android Auto', width: 1280, height: 720, category: 'Automotive' },
    {
      id: 'tesla-rear',
      label: 'Tesla Rear Display',
      width: 1440,
      height: 900,
      category: 'Automotive',
    },
    {
      id: 'tesla-3y',
      label: 'Tesla Model 3 / Y',
      width: 1920,
      height: 1200,
      category: 'Automotive',
    },
    {
      id: 'tesla-sx',
      label: 'Tesla Model S / X',
      width: 2200,
      height: 1300,
      category: 'Automotive',
    },
    {
      id: 'mbux',
      label: 'Mercedes MBUX Hyperscreen',
      width: 2400,
      height: 900,
      category: 'Automotive',
    },
    // ── VR / AR ──
    {
      id: 'quest-browser',
      label: 'Meta Quest Browser',
      width: 1280,
      height: 670,
      category: 'VR / AR',
    },
    {
      id: 'vision-pro',
      label: 'Apple Vision Pro (Safari)',
      width: 1280,
      height: 720,
      category: 'VR / AR',
    },
    // ── Smart Appliances ──
    {
      id: 'family-hub',
      label: 'Samsung Family Hub (21.5")',
      width: 1920,
      height: 1080,
      category: 'Smart Appliances',
    },
    {
      id: 'family-hub-plus',
      label: 'Samsung Family Hub+ (32")',
      width: 1920,
      height: 1080,
      category: 'Smart Appliances',
    },
    // ── Kiosk / Signage ──
    {
      id: 'kiosk-portrait',
      label: 'Kiosk Portrait',
      width: 1080,
      height: 1920,
      category: 'Kiosk / Signage',
    },
    {
      id: 'kiosk-landscape',
      label: 'Kiosk Landscape',
      width: 1920,
      height: 1080,
      category: 'Kiosk / Signage',
    },
    // ── TV ──
    { id: 'tv-sd', label: 'TV 480p / SD', width: 854, height: 480, category: 'TV' },
    { id: 'tv-hd', label: 'TV 720p / HD', width: 1280, height: 720, category: 'TV' },
    { id: 'tv-fhd', label: 'TV 1080p / Full HD', width: 1920, height: 1080, category: 'TV' },
    { id: 'tv-4k', label: 'TV 4K / Ultra HD', width: 3840, height: 2160, category: 'TV' },
    { id: 'tv-8k', label: 'TV 8K', width: 7680, height: 4320, category: 'TV' },
    // ── iOS Widgets ──
    {
      id: 'ios-widget-sm',
      label: 'Small Widget',
      width: 170,
      height: 170,
      category: 'iOS Widgets',
    },
    {
      id: 'ios-widget-md',
      label: 'Medium Widget',
      width: 364,
      height: 170,
      category: 'iOS Widgets',
    },
    {
      id: 'ios-widget-lg',
      label: 'Large Widget',
      width: 364,
      height: 382,
      category: 'iOS Widgets',
    },
    {
      id: 'ios-widget-xl',
      label: 'Extra Large Widget',
      width: 795,
      height: 382,
      category: 'iOS Widgets',
    },
    // ── Android Widgets ──
    {
      id: 'android-widget-1x1',
      label: '1\u00D71 Widget',
      width: 57,
      height: 57,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-2x1',
      label: '2\u00D71 Widget',
      width: 130,
      height: 57,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-2x2',
      label: '2\u00D72 Widget',
      width: 130,
      height: 130,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-3x2',
      label: '3\u00D72 Widget',
      width: 203,
      height: 130,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-4x1',
      label: '4\u00D71 Widget',
      width: 276,
      height: 57,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-4x2',
      label: '4\u00D72 Widget',
      width: 276,
      height: 130,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-4x3',
      label: '4\u00D73 Widget',
      width: 276,
      height: 203,
      category: 'Android Widgets',
    },
    {
      id: 'android-widget-4x4',
      label: '4\u00D74 Widget',
      width: 276,
      height: 276,
      category: 'Android Widgets',
    },
    // ── App Icons ──
    {
      id: 'icon-ios-appstore',
      label: 'iOS App Store',
      width: 1024,
      height: 1024,
      category: 'App Icons',
    },
    { id: 'icon-ios-3x', label: 'iPhone @3x', width: 180, height: 180, category: 'App Icons' },
    { id: 'icon-ios-2x', label: 'iPhone @2x', width: 120, height: 120, category: 'App Icons' },
    { id: 'icon-ipad-pro', label: 'iPad Pro', width: 167, height: 167, category: 'App Icons' },
    { id: 'icon-ipad', label: 'iPad', width: 152, height: 152, category: 'App Icons' },
    {
      id: 'icon-ios-spotlight',
      label: 'iOS Spotlight @3x',
      width: 87,
      height: 87,
      category: 'App Icons',
    },
    {
      id: 'icon-ios-settings',
      label: 'iOS Settings @3x',
      width: 58,
      height: 58,
      category: 'App Icons',
    },
    {
      id: 'icon-android-play',
      label: 'Google Play Store',
      width: 512,
      height: 512,
      category: 'App Icons',
    },
    {
      id: 'icon-android-xxxhdpi',
      label: 'Android xxxhdpi',
      width: 192,
      height: 192,
      category: 'App Icons',
    },
    {
      id: 'icon-android-xxhdpi',
      label: 'Android xxhdpi',
      width: 144,
      height: 144,
      category: 'App Icons',
    },
    {
      id: 'icon-android-xhdpi',
      label: 'Android xhdpi',
      width: 96,
      height: 96,
      category: 'App Icons',
    },
    {
      id: 'icon-android-hdpi',
      label: 'Android hdpi',
      width: 72,
      height: 72,
      category: 'App Icons',
    },
    {
      id: 'icon-android-mdpi',
      label: 'Android mdpi',
      width: 48,
      height: 48,
      category: 'App Icons',
    },
    {
      id: 'icon-macos-appstore',
      label: 'macOS App Store',
      width: 1024,
      height: 1024,
      category: 'App Icons',
    },
    { id: 'icon-macos-512', label: 'macOS 512', width: 512, height: 512, category: 'App Icons' },
    { id: 'icon-macos-256', label: 'macOS 256', width: 256, height: 256, category: 'App Icons' },
    { id: 'icon-macos-128', label: 'macOS 128', width: 128, height: 128, category: 'App Icons' },
    {
      id: 'icon-watchos-appstore',
      label: 'watchOS App Store',
      width: 1024,
      height: 1024,
      category: 'App Icons',
    },
    {
      id: 'icon-watchos-home',
      label: 'watchOS Home 44mm',
      width: 88,
      height: 88,
      category: 'App Icons',
    },
    // ── Favicons ──
    { id: 'favicon-pwa-512', label: 'PWA Icon 512', width: 512, height: 512, category: 'Favicons' },
    { id: 'favicon-pwa-192', label: 'PWA Icon 192', width: 192, height: 192, category: 'Favicons' },
    {
      id: 'favicon-apple-touch',
      label: 'Apple Touch Icon',
      width: 180,
      height: 180,
      category: 'Favicons',
    },
    { id: 'favicon-32', label: 'Favicon 32x32', width: 32, height: 32, category: 'Favicons' },
    { id: 'favicon-16', label: 'Favicon 16x16', width: 16, height: 16, category: 'Favicons' },
    // ── Social / OG ──
    { id: 'og-image', label: 'OG Image', width: 1200, height: 630, category: 'Social / OG' },
    {
      id: 'twitter-card',
      label: 'Twitter Card',
      width: 1200,
      height: 675,
      category: 'Social / OG',
    },
    {
      id: 'instagram-post',
      label: 'Instagram Post',
      width: 1080,
      height: 1080,
      category: 'Social / OG',
    },
    {
      id: 'instagram-story',
      label: 'Instagram Story',
      width: 1080,
      height: 1920,
      category: 'Social / OG',
    },
    {
      id: 'youtube-thumb',
      label: 'YouTube Thumbnail',
      width: 1280,
      height: 720,
      category: 'Social / OG',
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Accessibility simulation data                                     */
  /* ------------------------------------------------------------------ */

  /** SVG feColorMatrix values for color vision deficiency simulations. */
  const COLOR_MATRICES: Record<Str, Str> = {
    protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
    protanomaly: '0.817 0.183 0 0 0 0.333 0.667 0 0 0 0 0.125 0.875 0 0 0 0 0 1 0',
    deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
    deuteranomaly: '0.8 0.2 0 0 0 0.258 0.742 0 0 0 0 0.142 0.858 0 0 0 0 0 1 0',
    tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0',
    tritanomaly: '0.967 0.033 0 0 0 0 0.733 0.267 0 0 0 0.183 0.817 0 0 0 0 0 1 0',
    achromatopsia: '0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0',
    achromatomaly: '0.618 0.320 0.062 0 0 0.163 0.775 0.062 0 0 0.163 0.320 0.516 0 0 0 0 0 1 0',
  };

  /** CSS filter strings for vision impairment simulations. */
  const CSS_FILTERS: Record<Str, Str> = {
    'blurred-vision': 'blur(2px)',
    presbyopia: 'blur(1.5px) contrast(0.85)',
    cataracts: 'blur(0.5px) brightness(1.15) contrast(0.7) sepia(0.25)',
    'macular-degeneration': 'blur(3px) contrast(0.6)',
    glaucoma: 'blur(1px) contrast(0.7) brightness(0.9)',
    'low-contrast': 'contrast(0.4)',
    'sunlight-glare': 'brightness(1.6) contrast(0.5) saturate(0.7)',
    'color-desaturation': 'saturate(0.35) contrast(0.85)',
  };

  /** Color vision deficiency label lookup (for active settings display). */
  const COLOR_VISION_ITEMS: Array<{ id: Str; label: Str }> = [
    { id: 'protanopia', label: 'Protanopia' },
    { id: 'protanomaly', label: 'Protanomaly' },
    { id: 'deuteranopia', label: 'Deuteranopia' },
    { id: 'deuteranomaly', label: 'Deuteranomaly' },
    { id: 'tritanopia', label: 'Tritanopia' },
    { id: 'tritanomaly', label: 'Tritanomaly' },
    { id: 'achromatopsia', label: 'Achromatopsia' },
    { id: 'achromatomaly', label: 'Achromatomaly' },
  ];

  /** Vision impairment label lookup (for active settings display). */
  const VISION_ITEMS: Array<{ id: Str; label: Str }> = [
    { id: 'blurred-vision', label: 'Blurred Vision' },
    { id: 'presbyopia', label: 'Presbyopia' },
    { id: 'cataracts', label: 'Cataracts' },
    { id: 'macular-degeneration', label: 'Macular Degeneration' },
    { id: 'glaucoma', label: 'Glaucoma' },
    { id: 'tunnel-vision', label: 'Tunnel Vision' },
    { id: 'low-contrast', label: 'Low Contrast' },
    { id: 'sunlight-glare', label: 'Sunlight Glare' },
    { id: 'color-desaturation', label: 'Color Desaturation' },
  ];

  /** Color vision items filtered by search query. */
  const filteredColorItems: Array<{ id: Str; label: Str }> = $derived(
    COLOR_VISION_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(simSearchQuery.toLowerCase()),
    ),
  );

  /** Vision impairment items filtered by search query. */
  const filteredVisionItems: Array<{ id: Str; label: Str }> = $derived(
    VISION_ITEMS.filter((item) => item.label.toLowerCase().includes(simSearchQuery.toLowerCase())),
  );

  /** Viewport presets filtered by search query. */
  const filteredViewportPresets: Array<{
    id: Str;
    label: Str;
    width: Num;
    height: Num;
    category: Str;
  }> = $derived(
    VIEWPORT_PRESETS.filter((item) =>
      item.label.toLowerCase().includes(viewportSearchQuery.toLowerCase()),
    ),
  );

  /** Unique viewport categories present after filtering. */
  const filteredViewportCategories: Str[] = $derived([
    ...new Set(filteredViewportPresets.map((p) => p.category)),
  ]);

  /** Network presets filtered by search query (searches label, description, and category). */
  const filteredNetworkPresets: Array<{
    id: Str;
    label: Str;
    delay: Num;
    description: Str;
    category: Str;
  }> = $derived(
    networkSearchQuery.length === 0
      ? NETWORK_PRESETS
      : NETWORK_PRESETS.filter((item) => {
          if (item.id === 'none') {
            return true;
          }
          const q: Str = networkSearchQuery.toLowerCase() as Str;
          return (
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique network categories present after filtering (excludes empty category for 'none'). */
  const filteredNetworkCategories: Str[] = $derived([
    ...new Set(filteredNetworkPresets.filter((p) => p.category).map((p) => p.category)),
  ]);

  /** Background presets filtered by search query. */
  const filteredBgPresets: Array<{ id: Str; label: Str; style: Str }> = $derived(
    bgSearchQuery.length === 0
      ? BG_PRESETS
      : BG_PRESETS.filter((p) => p.label.toLowerCase().includes(bgSearchQuery.toLowerCase())),
  );

  /** Outline presets filtered by search query. */
  const filteredOutlinePresets: Array<{ id: Str; label: Str; color: Str }> = $derived(
    outlineSearchQuery.length === 0
      ? OUTLINE_PRESETS
      : OUTLINE_PRESETS.filter((p) =>
          p.label.toLowerCase().includes(outlineSearchQuery.toLowerCase()),
        ),
  );

  /** Grid presets filtered by search query. */
  const filteredGridPresets: Array<{ id: Str; label: Str; color: Str }> = $derived(
    gridSearchQuery.length === 0
      ? GRID_PRESETS
      : GRID_PRESETS.filter((p) => p.label.toLowerCase().includes(gridSearchQuery.toLowerCase())),
  );

  /** Color mode presets filtered by search query. */
  const filteredModePresets: Array<{ id: Str; label: Str; icon: Component }> = $derived(
    modeSearchQuery.length === 0
      ? MODE_PRESETS
      : MODE_PRESETS.filter((p) => p.label.toLowerCase().includes(modeSearchQuery.toLowerCase())),
  );

  /** Theme presets filtered by search query. */
  const filteredThemePresets: Array<{ id: Str; label: Str; dot: Str }> = $derived(
    themeSearchQuery.length === 0
      ? THEME_PRESETS
      : THEME_PRESETS.filter((p) => p.label.toLowerCase().includes(themeSearchQuery.toLowerCase())),
  );

  /** Orientation presets filtered by search query. */
  const filteredOrientationPresets: Array<{ id: Str; label: Str; rotation: Num }> = $derived(
    orientationSearchQuery.length === 0
      ? ORIENTATION_PRESETS
      : ORIENTATION_PRESETS.filter((p) =>
          p.label.toLowerCase().includes(orientationSearchQuery.toLowerCase()),
        ),
  );

  /** Media preference groups filtered by search query (matches group label OR option labels). */
  const filteredMediaPrefGroups: Array<{
    pref: Str;
    label: Str;
    defaultValue: Str;
    options: Array<{ value: Str; label: Str }>;
  }> = $derived(
    mediaPrefSearchQuery.length === 0
      ? MEDIA_PREF_GROUPS
      : MEDIA_PREF_GROUPS.filter(
          (g) =>
            g.label.toLowerCase().includes(mediaPrefSearchQuery.toLowerCase()) ||
            g.options.some((o) =>
              o.label.toLowerCase().includes(mediaPrefSearchQuery.toLowerCase()),
            ),
        ),
  );

  /* ------------------------------------------------------------------ */
  /*  Text direction items                                              */
  /* ------------------------------------------------------------------ */

  /** Text direction presets. */
  const DIR_PRESETS: Array<{ id: Str; label: Str }> = [
    { id: 'auto', label: 'Auto' },
    { id: 'ltr', label: 'LTR (Left to Right)' },
    { id: 'rtl', label: 'RTL (Right to Left)' },
  ];

  /** Text direction presets filtered by search query. */
  const filteredDirPresets: Array<{ id: Str; label: Str }> = $derived(
    dirSearchQuery.length === 0
      ? DIR_PRESETS
      : DIR_PRESETS.filter((p) => p.label.toLowerCase().includes(dirSearchQuery.toLowerCase())),
  );

  /* ------------------------------------------------------------------ */
  /*  Font size items                                                   */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  Export format items                                                */
  /* ------------------------------------------------------------------ */

  /** Export format menu items with descriptions and file extension badges. */
  const EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'png',
      label: 'PNG',
      icon: FileImage,
      category: 'Image',
      description: 'Lossless raster, best quality',
      ext: '.png',
    },
    {
      id: 'jpeg',
      label: 'JPEG',
      icon: FileImage,
      category: 'Image',
      description: 'Lossy compressed, smaller files',
      ext: '.jpg',
    },
    {
      id: 'svg',
      label: 'SVG',
      icon: FileImage,
      category: 'Image',
      description: 'Vector format, infinitely scalable',
      ext: '.svg',
    },
    {
      id: 'webp',
      label: 'WebP',
      icon: FileImage,
      category: 'Image',
      description: 'Modern format, best compression',
      ext: '.webp',
    },
    {
      id: 'html',
      label: 'HTML',
      icon: FileType,
      category: 'Document',
      description: 'Markup with external dependencies',
      ext: '.html',
    },
    {
      id: 'standalone-html',
      label: 'Standalone HTML',
      icon: Globe,
      category: 'Document',
      description: 'Self-contained, no dependencies',
      ext: '.html',
    },
    {
      id: 'copy-image',
      label: 'Copy as Image',
      icon: Clipboard,
      category: 'Clipboard',
      description: 'Copies PNG to clipboard',
      ext: '',
    },
    {
      id: 'copy-html',
      label: 'Copy as HTML',
      icon: FileType,
      category: 'Clipboard',
      description: 'Copies rendered markup',
      ext: '',
    },
    {
      id: 'copy-svelte',
      label: 'Copy as Svelte',
      icon: FileCode,
      category: 'Clipboard',
      description: 'Copies component source',
      ext: '',
    },
    {
      id: 'copy-data-uri',
      label: 'Copy as Data URI',
      icon: Link,
      category: 'Clipboard',
      description: 'Base64-encoded inline image',
      ext: '',
    },
  ];

  /** Export items filtered by search query (searches label, description, category). */
  const filteredExportItems = $derived(
    exportSearchQuery.length === 0
      ? EXPORT_ITEMS
      : EXPORT_ITEMS.filter((p) => {
          const q: Str = exportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique export categories present after filtering. */
  const filteredExportCategories: Str[] = $derived([
    ...new Set(filteredExportItems.map((p) => p.category)),
  ]);

  /* ------------------------------------------------------------------ */
  /*  Helper functions                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Toggle the code panel for a specific card.
   *
   * @param key - Unique key for the card
   */
  function toggleCode(key: Str): Void {
    openCards[key] = !openCards[key];
  }

  /**
   * Toggle an accessibility simulation for a specific card.
   * Clicking the active simulation deselects it.
   *
   * @param key - Card key
   * @param simId - Simulation identifier
   */
  function toggleSimulation(key: Str, simId: Str): Void {
    cardSimulations[key] = cardSimulations[key] === simId ? 'none' : simId;
  }

  /**
   * Set background for a card.
   *
   * @param key - Card key
   * @param bgId - Background preset ID or custom hex color
   */
  function setBackground(key: Str, bgId: Str): Void {
    cardBackgrounds[key] = bgId;
  }

  /**
   * Set zoom level for a card.
   *
   * @param key - Card key
   * @param level - Zoom level (1 = 100%)
   */
  function setZoom(key: Str, level: Num): Void {
    cardZoom[key] = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
  }

  /**
   * Increment zoom for a card by ZOOM_STEP.
   *
   * @param key - Card key
   */
  function zoomIn(key: Str): Void {
    const current: Num = cardZoom[key] ?? 1;
    setZoom(key, current + ZOOM_STEP);
  }

  /**
   * Decrement zoom for a card by ZOOM_STEP.
   *
   * @param key - Card key
   */
  function zoomOut(key: Str): Void {
    const current: Num = cardZoom[key] ?? 1;
    setZoom(key, current - ZOOM_STEP);
  }

  /**
   * Reset zoom to 100% for a card.
   *
   * @param key - Card key
   */
  function zoomFit(key: Str): Void {
    cardZoom[key] = 1;
  }

  /**
   * Set outline color for a card.
   *
   * @param key - Card key
   * @param colorId - Outline preset ID, custom hex color, or 'none'
   */
  function setOutline(key: Str, colorId: Str): Void {
    cardOutlines[key] = colorId;
  }

  /**
   * Get the resolved outline CSS color value for a card.
   *
   * @param key - Card key
   * @returns CSS color string or empty if no outline
   */
  function getOutlineColor(key: Str): Str {
    const id: Str = cardOutlines[key] ?? 'none';
    if (id === 'none') {
      return '';
    }
    if (id.startsWith('#') || id.startsWith('rgb')) {
      return id;
    }
    const preset = OUTLINE_PRESETS.find((p) => p.id === id);
    return preset?.color ?? '';
  }

  /**
   * Set grid style for a card.
   *
   * @param key - Card key
   * @param gridId - Grid preset ID, custom hex color, or 'none'
   */
  function setGrid(key: Str, gridId: Str): Void {
    cardGrids[key] = gridId;
  }

  /**
   * Set grid size for a card.
   *
   * @param key - Card key
   * @param size - Grid cell size in pixels
   */
  function setGridSize(key: Str, size: Num): Void {
    cardGridSizes[key] = Math.min(128, Math.max(4, size));
  }

  /**
   * Set grid fill (cell background) color for a card.
   *
   * @param key - Card key
   * @param fillId - Fill color preset ID, hex color, or 'none'
   */
  function setGridFill(key: Str, fillId: Str): Void {
    cardGridFills[key] = fillId;
  }

  /**
   * Get the resolved grid CSS color value for a card.
   *
   * @param key - Card key
   * @returns CSS color string or empty if no grid
   */
  function getGridColor(key: Str): Str {
    const id: Str = cardGrids[key] ?? 'none';
    if (id === 'none') {
      return '';
    }
    if (id.startsWith('#') || id.startsWith('rgb')) {
      return id;
    }
    const preset = GRID_PRESETS.find((p) => p.id === id);
    return preset?.color ?? '';
  }

  /**
   * Get the resolved grid fill CSS color value for a card.
   *
   * @param key - Card key
   * @returns CSS color string or empty if no fill
   */
  function getGridFillColor(key: Str): Str {
    const id: Str = cardGridFills[key] ?? 'none';
    if (id === 'none') {
      return '';
    }
    if (id.startsWith('#') || id.startsWith('rgb')) {
      return id;
    }
    const preset = GRID_FILL_PRESETS.find((p) => p.id === id);
    return preset?.color ?? '';
  }

  /**
   * Get the CSS background-image style for a grid overlay.
   *
   * @param key - Card key
   * @returns CSS style string or empty
   */
  function getGridStyle(key: Str): Str {
    const color: Str = getGridColor(key);
    if (!color) {
      return '';
    }
    const size: Num = cardGridSizes[key] ?? GRID_DEFAULT_SIZE;
    const fillColor: Str = getGridFillColor(key);
    const fillStyle: Str = fillColor ? `; background-color: ${fillColor}` : '';
    return `background-image: linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px); background-size: ${size}px ${size}px${fillStyle}`;
  }

  /**
   * Set orientation for a card.
   *
   * @param key - Card key
   * @param orientationId - Orientation preset ID or 'default'
   */
  function setOrientation(key: Str, orientationId: Str): Void {
    cardOrientations[key] = orientationId;
  }

  /**
   * Get the CSS transform style for a card's orientation rotation.
   *
   * @param key - Card key
   * @returns CSS style string or empty
   */
  function getOrientationStyle(key: Str): Str {
    const deg: Num = getOrientationDeg(key);
    if (deg === 0) {
      return '';
    }
    return `transform: rotate(${deg}deg); transform-origin: center center`;
  }

  /**
   * Get the rotation angle in degrees for a card.
   *
   * @param key - Card key
   * @returns Rotation angle (0 = no rotation)
   */
  function getOrientationDeg(key: Str): Num {
    const id: Str = cardOrientations[key] ?? 'default';
    if (id === 'default') {
      return 0 as Num;
    }
    if (id === 'custom') {
      return (cardCustomRotation[key] ?? 0) as Num;
    }
    const preset = ORIENTATION_PRESETS.find((p) => p.id === id);
    return (preset?.rotation ?? 0) as Num;
  }

  /**
   * Check if a card has a non-axis-aligned rotation (not 0, 90, 180, 270).
   * These rotations need extra padding to keep content visible.
   *
   * @param key - Card key
   * @returns True if rotation is non-axis-aligned
   */
  function hasNonAxisRotation(key: Str): Bool {
    const deg: Num = getOrientationDeg(key);
    const normalized: Num = ((((deg as number) % 360) + 360) % 360) as Num;
    return normalized !== 0 && normalized !== 90 && normalized !== 180 && normalized !== 270;
  }

  /**
   * Get padding style for the orientation wrapper to accommodate non-axis rotations.
   * Uses sin(θ) to calculate how much the bounding box expands beyond the original.
   *
   * @param key - Card key
   * @returns CSS padding style string or empty
   */
  function getOrientationPadding(key: Str): Str {
    if (!hasNonAxisRotation(key)) {
      return '';
    }
    const deg: Num = getOrientationDeg(key);
    const normalized: Num = ((((deg as number) % 360) + 360) % 360) as Num;
    const rad: Num = (((normalized as number) * Math.PI) / 180) as Num;
    const sinA: Num = Math.abs(Math.sin(rad as number)) as Num;
    const padPct: Num = Math.ceil((sinA as number) * 40) as Num;
    return `padding: ${padPct}% 0`;
  }

  /**
   * Check if a card's orientation is landscape (90° or 270°).
   *
   * @param key - Card key
   * @returns True if the rotation swaps width/height
   */
  function isLandscapeOrientation(key: Str): Bool {
    const id: Str = cardOrientations[key] ?? 'default';
    if (id === 'default') {
      return false;
    }
    if (id === 'custom') {
      const deg: Num = cardCustomRotation[key] ?? 0;
      return deg === 90 || deg === 270;
    }
    const preset = ORIENTATION_PRESETS.find((p) => p.id === id);
    return preset?.rotation === 90 || preset?.rotation === 270;
  }

  /**
   * Set color mode for a card.
   *
   * @param key - Card key
   * @param modeId - Color mode: 'auto', 'light', or 'dark'
   */
  function setCardMode(key: Str, modeId: Str): Void {
    cardModes[key] = modeId;
  }

  /**
   * Set theme for a card.
   *
   * @param key - Card key
   * @param themeId - Theme ID or '' for default (inherit)
   */
  function setCardTheme(key: Str, themeId: Str): Void {
    cardThemes[key] = themeId;
  }

  /**
   * Collect all non-default computed styles for a card as a serialisable map.
   *
   * Adding a new card-level state? Just add one block here — the isolation
   * page will pick it up automatically because it applies computed CSS, not
   * raw preset IDs.
   *
   * @param key - Card key
   * @returns Flat record of style keys → CSS values (only non-default entries)
   */
  function collectCardStyles(key: Str): Record<Str, Str> {
    const s: Record<Str, Str> = {};
    const bg: Str = getBackgroundStyle(key);
    if (bg) {
      s.bg = bg;
    }
    const zoom: Str = getZoomStyle(key);
    if (zoom) {
      s.zoom = zoom;
    }
    const outline: Str = cardOutlines[key] ?? 'none';
    if (outline !== 'none') {
      s.outlineColor = getOutlineColor(key);
    }
    const grid: Str = getGridStyle(key);
    if (grid) {
      s.grid = grid;
    }
    const orient: Str = getOrientationStyle(key);
    if (orient) {
      s.orient = orient;
    }
    const mode: Str = cardModes[key] ?? 'auto';
    if (mode !== 'auto') {
      s.mode = mode;
    }
    const theme: Str = cardThemes[key] ?? '';
    if (theme) {
      s.theme = theme;
    }
    const mp: Str = getMediaPrefClasses(key);
    if (mp) {
      s.mp = mp;
    }
    const sim: Str = cardSimulations[key] ?? 'none';
    if (sim !== 'none') {
      s.simId = sim;
      if (sim in COLOR_MATRICES) {
        s.simMatrix = COLOR_MATRICES[sim] ?? '';
      }
      if (sim in CSS_FILTERS) {
        s.simCss = CSS_FILTERS[sim] ?? '';
      }
    }
    if (hasTunnelVision(key)) {
      s.tunnel = '1';
    }
    const net: Str = cardNetworkSim[key] ?? 'none';
    if (net !== 'none') {
      if (net === 'custom') {
        const custom = cardCustomNetwork[key];
        s.net = custom ? `Custom (${custom.delay}ms)` : 'Custom';
      } else {
        const preset = NETWORK_PRESETS.find((p) => p.id === net);
        s.net = preset?.label ?? net;
      }
    }
    const vp: Str = cardViewports[key] ?? 'auto';
    if (vp === 'auto') {
      /* For "auto" viewport, measure the actual rendered component wrapper so the isolate
         page renders the component at the same size the user sees in the editor. */
      const compEl: HTMLDivElement | undefined = cardComponentRefs[key];
      if (compEl) {
        const measuredW: Num = Math.round(compEl.clientWidth) as Num;
        const measuredH: Num = Math.round(compEl.clientHeight) as Num;
        if ((measuredW as number) > 0 && (measuredH as number) > 0) {
          s.vp = `${measuredW}x${measuredH}`;
        }
      }
    } else if (vp === 'custom') {
      const dims = cardCustomViewports[key];
      if (dims) {
        s.vp = `${dims.w}x${dims.h}`;
      }
    } else {
      const preset = VIEWPORT_PRESETS.find((p) => p.id === vp);
      if (preset) {
        s.vp = `${preset.width}x${preset.height}`;
      }
    }
    const dir: Str = cardTextDir[key] ?? 'auto';
    if (dir !== 'auto') {
      s.dir = dir;
    }
    const fontSize: Num = cardFontSize[key] ?? 0;
    if (fontSize > 0) {
      s.fontSize = `${fontSize}px (${(fontSize / 16).toFixed(2)}x)`;
    }
    if (cardDebugOutline[key]) {
      s.debugOutline = '1';
      const outStyle: Str = cardDebugOutlineStyle[key] ?? DEBUG_OUTLINE_DEFAULT_STYLE;
      if (outStyle !== DEBUG_OUTLINE_DEFAULT_STYLE) {
        s.debugOutlineStyle = outStyle;
      }
    }
    if (cardMeasureActive[key]) {
      s.measure = '1';
    }
    if (cardInspectActive[key]) {
      s.inspect = '1';
    }
    if (cardConsoleOpen[key]) {
      s.console = '1';
    }
    return s;
  }

  /**
   * Open component in isolation in a new tab.
   *
   * Serialises all non-default toolbar state as computed CSS in a single `s`
   * query param (base64 JSON). The isolation page decodes and applies it with
   * no preset knowledge required.
   *
   * @param key - Card key for reading toolbar state
   * @param variantKey - Optional variant prop name
   * @param option - Optional variant option value
   */
  /**
   * Build the isolation URL for a card.
   *
   * @param key - Card key
   * @param variantKey - Variant prop name
   * @param option - Variant option value
   * @returns Absolute isolation URL string
   */
  function buildIsolationUrl(key: Str, variantKey: Str, option: Str): Str {
    if (!componentName) {
      return '';
    }
    const params: URLSearchParams = new URLSearchParams();
    if (variantKey) {
      params.set('variant', variantKey);
    }
    if (option) {
      params.set('option', option);
    }
    const styles: Record<Str, Str> = collectCardStyles(key);
    if (Object.keys(styles).length > 0) {
      params.set('s', btoa(JSON.stringify(styles)));
    }
    const qs: Str = params.toString();
    return `/isolate/${componentName}${qs ? `?${qs}` : ''}`;
  }

  /**
   * Open the isolation URL for a card in a new tab.
   *
   * @param key - Card key
   * @param variantKey - Variant prop name
   * @param option - Variant option value
   */
  function openIsolation(key: Str, variantKey: Str, option: Str): Void {
    const url: Str = buildIsolationUrl(key, variantKey, option);
    if (url) {
      window.open(url, '_blank');
    }
  }

  /** Whether "link copied" feedback is currently showing. */
  let linkCopied: Bool = $state(false);

  /** Which export format was last triggered ('' = none, shows feedback on export item). */
  let exportFeedback: Str = $state('');

  /** Which export format is currently in progress ('' = none, shows spinner on export item). */
  let exportInProgress: Str = $state('');

  /** Per-card dropdown open state for programmatic close after showing action feedback. */
  let cardDropdownOpen: Record<Str, Bool> = $state({});

  /**
   * Copy the isolation URL for a card to clipboard.
   *
   * @param key - Card key
   * @param variantKey - Variant prop name
   * @param option - Variant option value
   */
  async function copyIsolationUrl(key: Str, variantKey: Str, option: Str): Promise<void> {
    const path: Str = buildIsolationUrl(key, variantKey, option);
    if (!path) {
      return;
    }
    const url: Str = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    linkCopied = true;
    setTimeout((): Void => {
      linkCopied = false;
      cardDropdownOpen[key] = false;
    }, 1200);
  }

  /**
   * Generate a safe CSS identifier for an SVG filter from a card key.
   *
   * @param key - Card key
   * @returns A safe CSS identifier string
   */
  function filterId(key: Str): Str {
    return `lens-sim-${key.replaceAll(/[^a-zA-Z0-9-]/g, '-')}`;
  }

  /**
   * Get the inline filter style for a card's accessibility simulation.
   *
   * @param key - Card key
   * @returns CSS filter string or empty
   */
  function getSimulationFilter(key: Str): Str {
    const sim: Str = cardSimulations[key] ?? 'none';
    if (sim === 'none') {
      return '';
    }
    if (sim in COLOR_MATRICES) {
      return `filter: url(#${filterId(key)})`;
    }
    if (sim in CSS_FILTERS) {
      return `filter: ${CSS_FILTERS[sim]}`;
    }
    return '';
  }

  /**
   * Get the background style for a card's preview area.
   *
   * @param key - Card key
   * @returns CSS style string or empty
   */
  function getBackgroundStyle(key: Str): Str {
    const bgId: Str = cardBackgrounds[key] ?? 'default';
    if (bgId === 'default') {
      return '';
    }
    // Check if it's a custom hex color
    if (bgId.startsWith('#')) {
      return `background-color: ${bgId}`;
    }
    const preset: { id: Str; label: Str; style: Str } | undefined = BG_PRESETS.find(
      (p) => p.id === bgId,
    );
    return preset?.style ?? '';
  }

  /**
   * Get the zoom transform style for a card.
   *
   * @param key - Card key
   * @returns CSS style string or empty
   */
  function getZoomStyle(key: Str): Str {
    const zoom: Num = cardZoom[key] ?? 1;
    if (zoom === 1) {
      return '';
    }
    return `zoom: ${zoom}`;
  }

  /**
   * Get the current zoom percentage label for a card.
   *
   * @param key - Card key
   * @returns Zoom percentage string (e.g. "150%")
   */
  function getZoomLabel(key: Str): Str {
    const zoom: Num = cardZoom[key] ?? 1;
    return `${Math.round(zoom * 100)}%`;
  }

  /**
   * Tailwind v4 text-size CSS custom properties and their default rem values.
   * Tailwind utility classes like `text-sm` resolve to `font-size: var(--text-sm)`,
   * so overriding these variables on a container scales all child text proportionally.
   */
  const TW_TEXT_VARS: ReadonlyArray<{ prop: Str; rem: Num }> = [
    { prop: '--text-xs', rem: 0.75 },
    { prop: '--text-sm', rem: 0.875 },
    { prop: '--text-base', rem: 1 },
    { prop: '--text-lg', rem: 1.125 },
    { prop: '--text-xl', rem: 1.25 },
    { prop: '--text-2xl', rem: 1.5 },
    { prop: '--text-3xl', rem: 1.875 },
    { prop: '--text-4xl', rem: 2.25 },
    { prop: '--text-5xl', rem: 3 },
  ];

  /**
   * Generate CSS variable overrides for Tailwind text sizes scaled to target font size.
   *
   * @param key - Card key
   * @returns CSS string with `--text-*` variable overrides, or empty string if default
   */
  function getFontSizeVars(key: Str): Str {
    const targetPx: Num = cardFontSize[key] ?? 0;
    if (targetPx <= 0) {
      return '';
    }
    const scale: Num = targetPx / 16;
    return TW_TEXT_VARS.map((v) => `${v.prop}: ${(v.rem * scale).toFixed(4)}rem`).join('; ');
  }

  /* ------------------------------------------------------------------ */
  /*  Debug Outline CSS (Pesticide-inspired)                             */
  /* ------------------------------------------------------------------ */

  /**
   * Legend entries mapping debug outline colors to element categories.
   * Colors match those used in `buildDebugOutlineCSS`.
   * Each entry also stores the CSS selectors used for that category and a color-blind pattern.
   */
  const DEBUG_OUTLINE_LEGEND: ReadonlyArray<{
    /** Outline color. */
    color: Str;
    /** Color-blind friendly outline style override. */
    cbStyle: Str;
    /** Category label. */
    label: Str;
    /** Human-readable element list. */
    elements: Str;
    /** CSS selectors for this category. */
    selectors: readonly Str[];
  }> = [
    {
      color: 'rgba(59,130,246,0.6)',
      cbStyle: 'solid',
      label: 'Semantic',
      elements: 'article, nav, aside, section, header, footer, main',
      selectors: ['article', 'nav', 'aside', 'section', 'header', 'footer', 'main'] as Str[],
    },
    {
      color: 'rgba(99,102,241,0.6)',
      cbStyle: 'double',
      label: 'Headings',
      elements: 'h1–h6',
      selectors: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as Str[],
    },
    {
      color: 'rgba(147,197,253,0.4)',
      cbStyle: 'dashed',
      label: 'Containers',
      elements: 'div',
      selectors: ['div'] as Str[],
    },
    {
      color: 'rgba(96,165,250,0.5)',
      cbStyle: 'dotted',
      label: 'Text blocks',
      elements: 'p, hr, pre, blockquote',
      selectors: ['p', 'hr', 'pre', 'blockquote'] as Str[],
    },
    {
      color: 'rgba(239,68,68,0.5)',
      cbStyle: 'solid',
      label: 'Lists',
      elements: 'ol, ul, li, dl, dt, dd',
      selectors: ['ol', 'ul', 'li', 'dl', 'dt', 'dd'] as Str[],
    },
    {
      color: 'rgba(168,85,247,0.6)',
      cbStyle: 'double',
      label: 'Media',
      elements: 'figure, img, iframe, video, audio, canvas, svg',
      selectors: ['figure', 'img', 'iframe', 'video', 'audio', 'canvas', 'svg'] as Str[],
    },
    {
      color: 'rgba(20,184,166,0.5)',
      cbStyle: 'dashed',
      label: 'Tables',
      elements: 'table, thead, tbody, tfoot, tr, th, td, caption',
      selectors: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption'] as Str[],
    },
    {
      color: 'rgba(249,115,22,0.6)',
      cbStyle: 'dotted',
      label: 'Forms',
      elements: 'button, input, select, textarea, form, fieldset, label, legend',
      selectors: [
        'button',
        'input',
        'select',
        'textarea',
        'form',
        'fieldset',
        'label',
        'legend',
      ] as Str[],
    },
    {
      color: 'rgba(236,72,153,0.5)',
      cbStyle: 'solid',
      label: 'Links',
      elements: 'a',
      selectors: ['a'] as Str[],
    },
    {
      color: 'rgba(244,63,94,0.4)',
      cbStyle: 'dashed',
      label: 'Inline',
      elements:
        'em, strong, i, b, u, s, code, kbd, samp, var, mark, small, sub, sup, abbr, time, span',
      selectors: [
        'em',
        'strong',
        'i',
        'b',
        'u',
        's',
        'code',
        'kbd',
        'samp',
        'var',
        'mark',
        'small',
        'sub',
        'sup',
        'abbr',
        'time',
        'span',
      ] as Str[],
    },
  ];

  /** Default outline style. */
  const DEBUG_OUTLINE_DEFAULT_STYLE: Str = 'solid' as Str;

  /** Default outline width in px. */
  const DEBUG_OUTLINE_DEFAULT_WIDTH: Num = 1 as Num;

  /** Default outline opacity. */
  const DEBUG_OUTLINE_DEFAULT_OPACITY: Num = 100 as Num;

  /** Available outline style options with labels, descriptions, and grouping. */
  const DEBUG_OUTLINE_STYLES: ReadonlyArray<{ id: Str; label: Str; desc: Str; group: Str }> = [
    {
      id: 'solid' as Str,
      label: 'Solid' as Str,
      desc: 'Standard solid line' as Str,
      group: 'Basic' as Str,
    },
    {
      id: 'dashed' as Str,
      label: 'Dashed' as Str,
      desc: 'Spaced dash segments' as Str,
      group: 'Basic' as Str,
    },
    {
      id: 'dotted' as Str,
      label: 'Dotted' as Str,
      desc: 'Small round dots' as Str,
      group: 'Basic' as Str,
    },
    {
      id: 'double' as Str,
      label: 'Double' as Str,
      desc: 'Two parallel lines (min 3px)' as Str,
      group: 'Basic' as Str,
    },
    {
      id: 'groove' as Str,
      label: 'Groove' as Str,
      desc: 'Carved groove effect' as Str,
      group: '3D Effects' as Str,
    },
    {
      id: 'ridge' as Str,
      label: 'Ridge' as Str,
      desc: 'Raised ridge effect' as Str,
      group: '3D Effects' as Str,
    },
    {
      id: 'inset' as Str,
      label: 'Inset' as Str,
      desc: 'Sunken panel effect' as Str,
      group: '3D Effects' as Str,
    },
    {
      id: 'outset' as Str,
      label: 'Outset' as Str,
      desc: 'Raised panel effect' as Str,
      group: '3D Effects' as Str,
    },
  ];

  /** Available outline width options. */
  const DEBUG_OUTLINE_WIDTHS: ReadonlyArray<{ px: Num; label: Str }> = [
    { px: 1 as Num, label: '1px — Thin' as Str },
    { px: 2 as Num, label: '2px — Medium' as Str },
    { px: 3 as Num, label: '3px — Thick' as Str },
    { px: 4 as Num, label: '4px — Heavy' as Str },
    { px: 5 as Num, label: '5px — Extra heavy' as Str },
  ];

  /**
   * Apply opacity to an rgba color string.
   *
   * @param rgba - Original rgba color string
   * @param opacityPct - Opacity percentage 0–100
   * @returns Adjusted rgba string
   */
  function applyOutlineOpacity(rgba: Str, opacityPct: Num): Str {
    const match: RegExpMatchArray | null = (rgba as string).match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/,
    );
    if (!match) {
      return rgba;
    }
    const baseAlpha: Num = (match[4] ? Number.parseFloat(match[4]) : 1) as Num;
    const adjusted: Num = ((baseAlpha as number) * ((opacityPct as number) / 100)) as Num;
    return `rgba(${match[1]},${match[2]},${match[3]},${adjusted})` as Str;
  }

  /**
   * Build scoped debug outline CSS for a specific card's preview container.
   * Respects per-category toggles, outline style, opacity, color-blind mode, and hover highlight.
   *
   * @param cardKey - Card key used as the data attribute value
   * @returns Scoped CSS string
   */
  function buildDebugOutlineCSS(cardKey: Str): Str {
    const s: Str = `[data-lens-debug="${cardKey}"]`;
    const cats: Record<Num, Bool> = cardDebugCategories[cardKey] ?? {};
    const style: Str = cardDebugOutlineStyle[cardKey] ?? DEBUG_OUTLINE_DEFAULT_STYLE;
    const baseWidth: Num = cardDebugOutlineWidth[cardKey] ?? DEBUG_OUTLINE_DEFAULT_WIDTH;
    const opacityPct: Num = cardDebugOutlineOpacity[cardKey] ?? DEBUG_OUTLINE_DEFAULT_OPACITY;
    const colorBlind: Bool = cardDebugColorBlind[cardKey] ?? (false as Bool);
    const hoverIdx: Num = cardDebugHoverCategory[cardKey] ?? (-1 as Num);
    const rules: Str[] = [];

    for (
      let idx: Num = 0 as Num;
      (idx as number) < DEBUG_OUTLINE_LEGEND.length;
      idx = ((idx as number) + 1) as Num
    ) {
      /* Skip disabled categories (default = enabled when not in map) */
      if (cats[idx] === false) {
        continue;
      }

      const entry = DEBUG_OUTLINE_LEGEND[idx as number];
      if (!entry) {
        continue;
      }
      const outlineStyle: Str = colorBlind ? entry.cbStyle : style;
      /* Dim non-hovered categories when one is being hovered */
      const dimmed: Bool = ((hoverIdx as number) >= 0 && idx !== hoverIdx) as Bool;
      const effectiveOpacity: Num = dimmed
        ? (Math.max(10, (opacityPct as number) * 0.2) as Num)
        : opacityPct;
      const color: Str = applyOutlineOpacity(entry.color, effectiveOpacity);
      /* Double style needs minimum 3px width to render both lines */
      const width: Str =
        outlineStyle === ('double' as Str)
          ? (`${Math.max(3, baseWidth as number)}px` as Str)
          : (`${baseWidth}px` as Str);
      const selectorList: Str = entry.selectors.map((sel) => `${s} ${sel}`).join(',') as Str;
      rules.push(`${selectorList}{outline:${width} ${outlineStyle} ${color}!important}` as Str);
    }

    return rules.join('\n') as Str;
  }

  /**
   * Count elements in a container matching a given set of CSS selectors.
   *
   * @param container - DOM element to search within
   * @param selectors - Array of CSS selector strings
   * @returns Number of matching elements
   */
  function countElements(container: Element, selectors: readonly Str[]): Num {
    if (!container) {
      return 0 as Num;
    }
    const selector: Str = selectors.join(',') as Str;
    try {
      return container.querySelectorAll(selector as string).length as Num;
    } catch (_) {
      /* Invalid selector — non-critical */
      return 0 as Num;
    }
  }

  /**
   * Scroll to and flash the first element matching a category's selectors inside a card container.
   *
   * @param cardKey - Card key to find the container
   * @param categoryIdx - Index into DEBUG_OUTLINE_LEGEND
   */
  function highlightFirstElement(cardKey: Str, categoryIdx: Num): Void {
    const container: Element | null = document.querySelector(`[data-lens-debug="${cardKey}"]`);
    if (!container) {
      return;
    }
    const entry = DEBUG_OUTLINE_LEGEND[categoryIdx as number];
    if (!entry) {
      return;
    }
    const selector: Str = entry.selectors.join(',') as Str;
    try {
      const el: Element | null = container.querySelector(selector as string);
      if (!el) {
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      /* Flash animation via temporary class */
      (el as HTMLElement).style.setProperty('animation', 'lens-debug-flash 0.6s ease-out');
      const onEnd = (): Void => {
        (el as HTMLElement).style.removeProperty('animation');
        el.removeEventListener('animationend', onEnd);
      };
      el.addEventListener('animationend', onEnd);
    } catch (_) {
      /* Invalid selector — non-critical */
    }
  }

  /** CSS keyframes for the highlight flash animation. */
  const DEBUG_FLASH_KEYFRAMES: Str =
    '@keyframes lens-debug-flash{0%{outline-width:3px;outline-offset:2px}50%{outline-width:4px;outline-offset:4px}100%{outline-width:1px;outline-offset:0}}' as Str;

  /* ------------------------------------------------------------------ */
  /*  Debug Console — types + capture helpers                            */
  /* ------------------------------------------------------------------ */

  /** A single debug console log entry. */
  type ConsoleLogEntry = {
    /** Entry type category. */
    type: 'console' | 'event' | 'mutation' | 'lifecycle' | 'render';
    /** Console level or event sub-type. */
    level:
      | 'log'
      | 'info'
      | 'warn'
      | 'error'
      | 'debug'
      | 'event'
      | 'mutation'
      | 'lifecycle'
      | 'render';
    /** Primary message text. @values Hello world, click fired, attribute changed */
    message: Str;
    /** Optional detail (expanded args, mutation diff, event info). @values {x: 1}, class: old → new */
    detail: Str;
    /** Milliseconds since component mount. @values 0, 42, 1500 */
    ts: Num;
    /** Source file:line from __svelte_meta when available. @values Button.svelte:12, , Dialog.svelte:45 */
    source: Str;
  };

  /** Maximum console entries per card before oldest are dropped. */
  const CONSOLE_MAX_ENTRIES: Num = 500;

  /** DOM events to capture from the preview container. */
  const CAPTURED_EVENTS: readonly Str[] = [
    'click',
    'input',
    'change',
    'focus',
    'blur',
    'keydown',
    'submit',
    'pointerdown',
    'pointerup',
  ];

  /**
   * Serialize a value for console log display.
   *
   * @param val - Value to serialize
   * @returns Formatted string representation
   */
  function serializeArg(val: unknown): Str {
    if (val === null) {
      return 'null';
    }
    if (val === undefined) {
      return 'undefined';
    }
    if (typeof val === 'string') {
      return val;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      /* Circular or unserializable — fall back to toString */
      return String(val);
    }
  }

  /**
   * Get the __svelte_meta source location from a DOM element if available.
   *
   * @param el - DOM element to inspect
   * @returns Source location string like "Button.svelte:15" or empty string
   */
  function getSvelteMeta(el: Element | null): Str {
    if (!el) {
      return '';
    }
    /* __svelte_meta is attached by Svelte 5 compiler in dev mode */
    const svelteMeta = (el as unknown as Record<Str, unknown>).__svelte_meta as
      | { loc?: { file?: Str; line?: Num } }
      | undefined;
    if (!svelteMeta?.loc?.file) {
      return '';
    }
    const file: Str = svelteMeta.loc.file.split('/').pop() ?? svelteMeta.loc.file;
    return `${file}:${svelteMeta.loc.line ?? '?'}`;
  }

  /**
   * Push a log entry to a card's console log, enforcing max capacity.
   *
   * @param key - Card identifier
   * @param entry - Log entry to add
   */
  function pushConsoleLog(key: Str, entry: ConsoleLogEntry): Void {
    // Defer state mutation to next microtask — pushConsoleLog can be called during
    // Svelte reactive updates (DOM event handlers, console intercepts during teardown)
    // which would throw state_unsafe_mutation if we mutate $state synchronously
    queueMicrotask((): void => {
      const logs: ConsoleLogEntry[] = cardConsoleLogs[key] ?? [];
      logs.push(entry);
      if (logs.length > CONSOLE_MAX_ENTRIES) {
        logs.splice(0, logs.length - CONSOLE_MAX_ENTRIES);
      }
      cardConsoleLogs[key] = logs;
    });
  }

  /**
   * Start capturing console output, DOM events, and mutations for a card.
   * Returns a cleanup function that restores originals and disconnects observers.
   *
   * @param key - Card identifier
   * @param container - Preview container div element
   * @returns Cleanup function that restores console and disconnects observers
   */
  function startConsoleCapture(key: Str, container: HTMLDivElement): () => void {
    const mountTime: Num = performance.now();
    cardConsoleMountTime[key] = mountTime;

    /* --- Lifecycle: mount --- */
    pushConsoleLog(key, {
      type: 'lifecycle',
      level: 'lifecycle',
      message: 'Component mounted',
      detail: '',
      ts: 0,
      source: '',
    });

    /* --- Console interception --- */
    const origLog: typeof console.log = console.log;
    const origInfo: typeof console.info = console.info;
    const origWarn: typeof console.warn = console.warn;
    const origError: typeof console.error = console.error;
    const origDebug: typeof console.debug = console.debug;

    /**
     * Create a console method interceptor that captures output.
     *
     * @param level - Console level to capture
     * @param orig - Original console method
     * @returns Wrapped console method
     */
    function makeInterceptor(
      level: 'log' | 'info' | 'warn' | 'error' | 'debug',
      orig: (...args: unknown[]) => void,
    ): (...args: unknown[]) => void {
      return (...args: unknown[]): void => {
        const ts: Num = Math.round((performance.now() - mountTime) * 100) / 100;
        let msg: Str = serializeArg(args[0]);
        /* Count %c directives so we can skip the corresponding CSS style args */
        const formatCount: Num =
          typeof args[0] === 'string' ? (args[0].match(/%c/g) ?? []).length : 0;
        msg = msg.replaceAll('%c', '');
        /* Skip the CSS style args that follow %c directives */
        const detailArgs: unknown[] = args.slice(1 + formatCount);
        pushConsoleLog(key, {
          type: 'console',
          level,
          message: msg,
          detail: detailArgs.length > 0 ? detailArgs.map(serializeArg).join(' ') : '',
          ts,
          source: '',
        });
        orig.apply(console, args);
      };
    }

    console.log = makeInterceptor('log', origLog);
    console.info = makeInterceptor('info', origInfo);
    console.warn = makeInterceptor('warn', origWarn);
    console.error = makeInterceptor('error', origError);
    console.debug = makeInterceptor('debug', origDebug);

    /* --- DOM event capture --- */
    /**
     * Handle a captured DOM event from the preview container.
     *
     * @param e - The captured DOM event
     */
    function handleEvent(e: Event): void {
      // Skip events from portaled content (tooltips, dialogs, dropdowns) — they fire
      // during Svelte reactive updates and cause state_unsafe_mutation
      if (e.target instanceof Element && e.target.closest('[data-lens-portal]')) {
        return;
      }
      const ts: Num = Math.round((performance.now() - mountTime) * 100) / 100;
      const target: Element | null = e.target instanceof Element ? e.target : null;
      const tag: Str = target?.tagName.toLowerCase() ?? '?';
      const cls: Str =
        target?.className && typeof target.className === 'string'
          ? `.${target.className.split(/\s+/).slice(0, 3).join('.')}`
          : '';
      let detail: Str = '';
      if (e instanceof KeyboardEvent) {
        detail = `key: ${e.key}`;
      } else if (e instanceof InputEvent || e.target instanceof HTMLInputElement) {
        const inp = e.target as HTMLInputElement | null;
        if (inp) {
          detail = `value: ${inp.value?.slice(0, 80) ?? ''}`;
        }
      }
      pushConsoleLog(key, {
        type: 'event',
        level: 'event',
        message: `${e.type} <${tag}${cls}>`,
        detail,
        ts,
        source: getSvelteMeta(target),
      });
    }

    for (const evt of CAPTURED_EVENTS) {
      container.addEventListener(evt, handleEvent, true);
    }

    /* --- MutationObserver --- */
    let lastMutationTime: Num = mountTime;

    const observer: MutationObserver = new MutationObserver((mutations: MutationRecord[]): void => {
      // Filter out mutations from portaled content (tooltips, dialogs, dropdowns) —
      // portal DOM changes during Svelte reactive updates cause state_unsafe_mutation
      const cardMutations: MutationRecord[] = mutations.filter(
        (m: MutationRecord): boolean =>
          !(m.target instanceof Element && m.target.closest('[data-lens-portal]')),
      );
      if (cardMutations.length === 0) {
        return;
      }

      const now: Num = performance.now();
      const delta: Num = Math.round((now - lastMutationTime) * 100) / 100;
      lastMutationTime = now;
      const ts: Num = Math.round((now - mountTime) * 100) / 100;

      /* Log render cycle */
      pushConsoleLog(key, {
        type: 'render',
        level: 'render',
        message: `Re-render (${cardMutations.length} mutation${cardMutations.length === 1 ? '' : 's'}, +${delta}ms)`,
        detail: '',
        ts,
        source: '',
      });

      /* Log individual mutations (cap at 10 per batch to avoid flooding) */
      const mutCap: Num = Math.min(cardMutations.length, 10);
      for (let i: Num = 0; i < mutCap; i++) {
        const m: MutationRecord | undefined = cardMutations[i];
        if (!m) {
          continue;
        }
        const target: Element | null =
          m.target instanceof Element ? m.target : m.target.parentElement;
        const tag: Str = target?.tagName.toLowerCase() ?? '?';
        const source: Str = getSvelteMeta(target);

        if (m.type === 'attributes' && m.attributeName) {
          const newVal: Str = (target?.getAttribute(m.attributeName) ?? '').slice(0, 60);
          const oldVal: Str = (m.oldValue ?? '').slice(0, 60);
          pushConsoleLog(key, {
            type: 'mutation',
            level: 'mutation',
            message: `attr <${tag}> ${m.attributeName}`,
            detail: `"${oldVal}" → "${newVal}"`,
            ts,
            source,
          });
        } else if (m.type === 'characterData') {
          const oldVal: Str = (m.oldValue ?? '').slice(0, 60);
          const newVal: Str = (m.target.textContent ?? '').slice(0, 60);
          pushConsoleLog(key, {
            type: 'mutation',
            level: 'mutation',
            message: `text <${tag}>`,
            detail: `"${oldVal}" → "${newVal}"`,
            ts,
            source,
          });
        } else if (m.type === 'childList') {
          const added: Num = m.addedNodes.length;
          const removed: Num = m.removedNodes.length;
          const parts: Str[] = [];
          if (added > 0) {
            parts.push(`+${added} added`);
          }
          if (removed > 0) {
            parts.push(`-${removed} removed`);
          }
          pushConsoleLog(key, {
            type: 'mutation',
            level: 'mutation',
            message: `children <${tag}>`,
            detail: parts.join(', '),
            ts,
            source,
          });
        }
      }
      if (cardMutations.length > 10) {
        pushConsoleLog(key, {
          type: 'mutation',
          level: 'mutation',
          message: `… and ${cardMutations.length - 10} more mutations`,
          detail: '',
          ts,
          source: '',
        });
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });

    /* --- Cleanup function --- */
    return (): void => {
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
      console.debug = origDebug;
      for (const evt of CAPTURED_EVENTS) {
        container.removeEventListener(evt, handleEvent, true);
      }
      observer.disconnect();
      const ts: Num = Math.round((performance.now() - mountTime) * 100) / 100;
      pushConsoleLog(key, {
        type: 'lifecycle',
        level: 'lifecycle',
        message: 'Component unmounted',
        detail: '',
        ts,
        source: '',
      });
    };
  }

  /**
   * Get the Tailwind text color class for a console log level.
   *
   * @param level - Log level
   * @returns CSS class string
   */
  function getConsoleColor(level: ConsoleLogEntry['level']): Str {
    if (level === 'error') {
      return 'text-red-500';
    }
    if (level === 'warn') {
      return 'text-amber-500';
    }
    if (level === 'info') {
      return 'text-blue-400';
    }
    if (level === 'debug') {
      return 'text-muted-foreground/60';
    }
    if (level === 'event') {
      return 'text-violet-400';
    }
    if (level === 'mutation') {
      return 'text-teal-400';
    }
    if (level === 'lifecycle') {
      return 'text-emerald-400';
    }
    if (level === 'render') {
      return 'text-indigo-400';
    }
    return 'text-muted-foreground';
  }

  /**
   * Get a human-readable label for a console log level.
   *
   * @param level - Log level
   * @returns Full-word label string
   */
  function getConsoleLabel(level: ConsoleLogEntry['level']): Str {
    if (level === 'error') {
      return 'Error';
    }
    if (level === 'warn') {
      return 'Warn';
    }
    if (level === 'info') {
      return 'Info';
    }
    if (level === 'debug') {
      return 'Debug';
    }
    if (level === 'event') {
      return 'Event';
    }
    if (level === 'mutation') {
      return 'Mutation';
    }
    if (level === 'lifecycle') {
      return 'Lifecycle';
    }
    if (level === 'render') {
      return 'Render';
    }
    return 'Log';
  }

  /** All console log levels with their display metadata. */
  const CONSOLE_LEVELS: ReadonlyArray<{
    /** Log level identifier. */
    id: ConsoleLogEntry['level'];
    /** Human-readable label. */
    label: Str;
    /** Short description of what this level captures. */
    description: Str;
    /** Tailwind text color class. */
    color: Str;
    /** Tailwind bg color class for dot indicators. */
    dotColor: Str;
  }> = [
    {
      id: 'error',
      label: 'Error',
      description: 'Runtime exceptions & thrown errors',
      color: 'text-red-500',
      dotColor: 'bg-red-500',
    },
    {
      id: 'warn',
      label: 'Warn',
      description: 'Deprecations & potential issues',
      color: 'text-amber-500',
      dotColor: 'bg-amber-500',
    },
    {
      id: 'info',
      label: 'Info',
      description: 'Informational messages',
      color: 'text-blue-400',
      dotColor: 'bg-blue-400',
    },
    {
      id: 'log',
      label: 'Log',
      description: 'General console.log output',
      color: 'text-muted-foreground',
      dotColor: 'bg-zinc-400',
    },
    {
      id: 'debug',
      label: 'Debug',
      description: 'Verbose debugging output',
      color: 'text-muted-foreground/60',
      dotColor: 'bg-zinc-400/60',
    },
    {
      id: 'event',
      label: 'Event',
      description: 'DOM & custom event dispatches',
      color: 'text-violet-400',
      dotColor: 'bg-violet-400',
    },
    {
      id: 'mutation',
      label: 'Mutation',
      description: 'DOM tree changes',
      color: 'text-teal-400',
      dotColor: 'bg-teal-400',
    },
    {
      id: 'lifecycle',
      label: 'Lifecycle',
      description: 'Component mount & destroy',
      color: 'text-emerald-400',
      dotColor: 'bg-emerald-400',
    },
    {
      id: 'render',
      label: 'Render',
      description: 'Component re-render cycles',
      color: 'text-indigo-400',
      dotColor: 'bg-indigo-400',
    },
  ];

  /**
   * Format a millisecond timestamp for human-friendly display.
   * Shows ms for <1s, seconds with 1 decimal for <60s, minutes for >=60s.
   *
   * @param ms - Milliseconds since mount
   * @returns Formatted timestamp string like "+142ms", "+1.2s", "+2m 5s"
   */
  function formatConsoleTs(ms: Num): Str {
    const n: number = ms as number;
    if (n < 1000) {
      return `+${n}ms` as Str;
    }
    if (n < 60_000) {
      return `+${(n / 1000).toFixed(1)}s` as Str;
    }
    const minutes: number = Math.floor(n / 60_000);
    const seconds: number = Math.floor((n % 60_000) / 1000);
    return `+${minutes}m ${seconds}s` as Str;
  }

  /**
   * Get the absolute date/time string for a console entry's timestamp.
   * Uses the mount time + entry offset to compute wall clock time.
   *
   * @param mountTime - Performance.now() at component mount
   * @param entryTs - Entry's offset in ms from mount
   * @returns Formatted date/time string like "Mar 12, 2026, 3:45:03.142 PM"
   */
  function getAbsoluteTime(mountTime: Num, entryTs: Num): Str {
    const epoch: number = performance.timeOrigin + (mountTime as number) + (entryTs as number);
    const d: Date = new Date(epoch);
    const date: Str = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) as Str;
    const h: Str = String(d.getHours() % 12 || 12) as Str;
    const m: Str = String(d.getMinutes()).padStart(2, '0') as Str;
    const s: Str = String(d.getSeconds()).padStart(2, '0') as Str;
    const ms: Str = String(d.getMilliseconds()).padStart(3, '0') as Str;
    const ampm: Str = (d.getHours() >= 12 ? 'PM' : 'AM') as Str;
    return `${date}, ${h}:${m}:${s}.${ms} ${ampm}` as Str;
  }

  /**
   * Svelte use: action to start console capture on mount and clean up on destroy.
   *
   * @param node - The preview container div
   * @param key - Card identifier
   * @returns Action lifecycle object with destroy callback
   */
  function consoleCapture(node: HTMLDivElement, key: Str): { destroy: () => void } {
    const cleanup: () => void = startConsoleCapture(key, node);
    cardConsoleCleanup[key] = cleanup;
    return {
      destroy(): void {
        cleanup();
        cardConsoleCleanup[key] = null;
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Console export items                                               */
  /* ------------------------------------------------------------------ */

  /** Console export format menu items with descriptions and file extension badges. */
  const CONSOLE_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Structured log entries',
      ext: '',
    },
    {
      id: 'copy-text',
      label: 'Copy as Text',
      icon: FileCode,
      category: 'Clipboard',
      description: 'Plain text log output',
      ext: '',
    },
    {
      id: 'copy-csv',
      label: 'Copy as CSV',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Spreadsheet-compatible',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Structured log file',
      ext: '.json',
    },
    {
      id: 'download-text',
      label: 'Download Text',
      icon: Download,
      category: 'File',
      description: 'Plain text log file',
      ext: '.txt',
    },
  ];

  /** Search query for console export menu filtering. */
  let consoleExportSearchQuery: Str = $state('');

  /** Console export items filtered by search query (searches label, description, category). */
  const filteredConsoleExportItems = $derived(
    consoleExportSearchQuery.length === 0
      ? CONSOLE_EXPORT_ITEMS
      : CONSOLE_EXPORT_ITEMS.filter((p) => {
          const q: Str = consoleExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique console export categories present after filtering. */
  const filteredConsoleExportCategories: Str[] = $derived([
    ...new Set(filteredConsoleExportItems.map((p) => p.category)),
  ]);

  /** Console levels filtered by level filter search query. */
  const filteredConsoleLevels = $derived.by(() => {
    const q: Str = (consoleLevelFilterSearch as string).toLowerCase() as Str;
    if (!q) {
      return CONSOLE_LEVELS;
    }
    return CONSOLE_LEVELS.filter((l) => (l.label as string).toLowerCase().includes(q as string));
  });

  /** Feedback state for console export actions. */
  let consoleExportFeedback: Str = $state('');

  /**
   * Format console logs as plain text lines.
   *
   * @param logs - Console log entries to format
   * @returns Formatted text string
   */
  function formatConsolePlainText(logs: ConsoleLogEntry[]): Str {
    return logs
      .map(
        (e: ConsoleLogEntry): Str =>
          `[${formatConsoleTs(e.ts)}] [${getConsoleLabel(e.level)}] ${e.message}${e.detail ? ` ${e.detail}` : ''}${e.source ? ` (${e.source})` : ''}`,
      )
      .join('\n');
  }

  /**
   * Format console logs as CSV.
   *
   * @param logs - Console log entries to format
   * @returns CSV-formatted string
   */
  function formatConsoleCsv(logs: ConsoleLogEntry[]): Str {
    const header: Str = 'Timestamp (ms),Level,Message,Detail,Source';
    const rows: Str[] = logs.map((e: ConsoleLogEntry): Str => {
      const msg: Str = e.message.replaceAll('"', '""');
      const detail: Str = (e.detail ?? '').replaceAll('"', '""');
      const source: Str = (e.source ?? '').replaceAll('"', '""');
      return `${e.ts},${getConsoleLabel(e.level)},"${msg}","${detail}","${source}"`;
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Export console logs for a card in the given format.
   *
   * @param key - Card identifier
   * @param formatId - Export format identifier
   */
  async function handleConsoleExport(key: Str, formatId: Str): Promise<void> {
    const logs: ConsoleLogEntry[] = cardConsoleLogs[key] ?? [];
    if (formatId === 'copy-json') {
      await navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    } else if (formatId === 'copy-text') {
      await navigator.clipboard.writeText(formatConsolePlainText(logs));
    } else if (formatId === 'copy-csv') {
      await navigator.clipboard.writeText(formatConsoleCsv(logs));
    } else if (formatId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${key}-console.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'download-text') {
      const blob: Blob = new Blob([formatConsolePlainText(logs)], { type: 'text/plain' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${key}-console.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    consoleExportFeedback = formatId;
    setTimeout((): Void => {
      consoleExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Measure / Inspect helpers                                          */
  /* ------------------------------------------------------------------ */

  /**
   * CSS property groups to display in the Inspect panel.
   */
  const INSPECT_GROUPS: ReadonlyArray<{ label: Str; props: readonly Str[] }> = [
    {
      label: 'Dimensions',
      props: [
        'width',
        'height',
        'min-width',
        'min-height',
        'max-width',
        'max-height',
        'box-sizing',
      ],
    },
    {
      label: 'Layout',
      props: [
        'display',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'z-index',
        'float',
        'clear',
        'overflow',
        'overflow-x',
        'overflow-y',
        'visibility',
      ],
    },
    {
      label: 'Flexbox',
      props: [
        'flex-direction',
        'flex-wrap',
        'flex-grow',
        'flex-shrink',
        'flex-basis',
        'align-items',
        'align-self',
        'align-content',
        'justify-content',
        'justify-items',
        'justify-self',
        'gap',
        'row-gap',
        'column-gap',
        'order',
      ],
    },
    {
      label: 'Grid',
      props: [
        'grid-template-columns',
        'grid-template-rows',
        'grid-column',
        'grid-row',
        'grid-auto-flow',
        'grid-auto-columns',
        'grid-auto-rows',
        'place-items',
        'place-content',
        'place-self',
      ],
    },
    {
      label: 'Spacing',
      props: [
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
      ],
    },
    {
      label: 'Typography',
      props: [
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'font-variant',
        'line-height',
        'letter-spacing',
        'word-spacing',
        'text-align',
        'text-decoration',
        'text-transform',
        'text-indent',
        'text-overflow',
        'text-wrap',
        'white-space',
        'word-break',
        'overflow-wrap',
        'color',
        'text-shadow',
      ],
    },
    {
      label: 'Border',
      props: [
        'border-top-width',
        'border-right-width',
        'border-bottom-width',
        'border-left-width',
        'border-top-style',
        'border-right-style',
        'border-bottom-style',
        'border-left-style',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'border-top-left-radius',
        'border-top-right-radius',
        'border-bottom-right-radius',
        'border-bottom-left-radius',
        'outline-width',
        'outline-style',
        'outline-color',
        'outline-offset',
      ],
    },
    {
      label: 'Background',
      props: [
        'background-color',
        'background-image',
        'background-size',
        'background-position',
        'background-repeat',
        'background-attachment',
        'background-clip',
        'background-origin',
      ],
    },
    {
      label: 'Effects',
      props: [
        'opacity',
        'box-shadow',
        'filter',
        'backdrop-filter',
        'mix-blend-mode',
        'isolation',
        'clip-path',
        'mask-image',
      ],
    },
    {
      label: 'Transform',
      props: ['transform', 'transform-origin', 'perspective', 'perspective-origin'],
    },
    {
      label: 'Transition & Animation',
      props: [
        'transition-property',
        'transition-duration',
        'transition-timing-function',
        'transition-delay',
        'animation-name',
        'animation-duration',
        'animation-timing-function',
        'animation-delay',
        'animation-iteration-count',
        'animation-direction',
      ],
    },
    {
      label: 'Interaction',
      props: [
        'cursor',
        'pointer-events',
        'user-select',
        'touch-action',
        'scroll-behavior',
        'scroll-snap-type',
        'scroll-snap-align',
        'resize',
      ],
    },
    {
      label: 'Container',
      props: ['container-type', 'container-name', 'contain', 'content-visibility'],
    },
  ];

  /**
   * Collect box model data for the hovered element relative to the preview container.
   *
   * @param el - The hovered DOM element
   * @param container - The preview container div
   * @returns Box model data or null
   */
  function collectBoxModel(el: Element, container: HTMLDivElement): (typeof cardMeasureData)[Str] {
    const cs: CSSStyleDeclaration = getComputedStyle(el);
    const elRect: DOMRect = el.getBoundingClientRect();
    const cRect: DOMRect = container.getBoundingClientRect();

    const pt: Num = Number.parseFloat(cs.paddingTop) || 0;
    const pr: Num = Number.parseFloat(cs.paddingRight) || 0;
    const pb: Num = Number.parseFloat(cs.paddingBottom) || 0;
    const pl: Num = Number.parseFloat(cs.paddingLeft) || 0;

    const bt: Num = Number.parseFloat(cs.borderTopWidth) || 0;
    const br: Num = Number.parseFloat(cs.borderRightWidth) || 0;
    const bb: Num = Number.parseFloat(cs.borderBottomWidth) || 0;
    const bl: Num = Number.parseFloat(cs.borderLeftWidth) || 0;

    const mt: Num = Number.parseFloat(cs.marginTop) || 0;
    const mr: Num = Number.parseFloat(cs.marginRight) || 0;
    const mb: Num = Number.parseFloat(cs.marginBottom) || 0;
    const ml: Num = Number.parseFloat(cs.marginLeft) || 0;

    const x: Num = elRect.left - cRect.left + container.scrollLeft;
    const y: Num = elRect.top - cRect.top + container.scrollTop;

    /* Distance to parent — always computed for the sticky panel */
    let parentDistance: { top: Num; right: Num; bottom: Num; left: Num } | null = null;
    if (el.parentElement && container.contains(el.parentElement)) {
      const pRect: DOMRect = el.parentElement.getBoundingClientRect();
      parentDistance = {
        top: (elRect.top - pRect.top) as Num,
        right: (pRect.right - elRect.right) as Num,
        bottom: (pRect.bottom - elRect.bottom) as Num,
        left: (elRect.left - pRect.left) as Num,
      };
    }

    return {
      tag: el.tagName.toLowerCase() as Str,
      content: {
        x: x + bl + pl,
        y: y + bt + pt,
        w: elRect.width - bl - br - pl - pr,
        h: elRect.height - bt - bb - pt - pb,
      },
      padding: { top: pt, right: pr, bottom: pb, left: pl },
      border: { top: bt, right: br, bottom: bb, left: bl },
      margin: { top: mt, right: mr, bottom: mb, left: ml },
      width: elRect.width,
      height: elRect.height,
      boxSizing: cs.boxSizing as Str,
      parentDistance,
      absX: x,
      absY: y,
      containerW: cRect.width as Num,
      containerH: cRect.height as Num,
      position: cs.position as Str,
      display: cs.display as Str,
    };
  }

  /**
   * Collect computed CSS properties for the inspected element.
   *
   * @param el - The clicked DOM element
   * @returns Grouped computed styles
   */
  /** Default/empty CSS values to skip — reduces noise in the inspect panel. */
  const INSPECT_SKIP_VALS: ReadonlySet<Str> = new Set([
    '',
    'none',
    'normal',
    '0px',
    '0',
    'auto',
    'rgba(0, 0, 0, 0)',
    'start',
    'stretch',
    'baseline',
    'visible',
    'static',
    'content-box',
    'ltr',
    'separate',
    'inline',
    'repeat',
    'padding-box',
    'border-box',
    'scroll',
  ]);

  /** DOM attribute names worth showing in the inspect panel. */
  const INSPECT_ATTR_PREFIXES: readonly Str[] = ['data-', 'aria-'];
  /** Specific non-prefixed attributes to include. */
  const INSPECT_ATTR_NAMES: ReadonlySet<Str> = new Set([
    'role',
    'tabindex',
    'href',
    'src',
    'alt',
    'title',
    'type',
    'name',
    'value',
    'placeholder',
    'for',
    'action',
    'method',
    'target',
    'rel',
    'disabled',
    'readonly',
    'required',
    'checked',
    'selected',
    'hidden',
    'loading',
    'decoding',
    'fetchpriority',
    'draggable',
    'contenteditable',
    'autocomplete',
    'autofocus',
    'pattern',
    'min',
    'max',
    'step',
    'maxlength',
    'minlength',
    'accept',
    'multiple',
    'download',
    'media',
    'sizes',
    'srcset',
    'slot',
    'part',
    'is',
    'popover',
    'popovertarget',
  ]);

  /**
   * Build parent chain breadcrumb for an element.
   *
   * @param el - Target element
   * @param maxDepth - Maximum ancestors to include
   * @returns Breadcrumb string like "body > main > div.container > button.primary"
   */
  function buildBreadcrumb(el: Element, maxDepth: Num): Str {
    const parts: Str[] = [];
    let current: Element | null = el;
    let depth: Num = 0 as Num;
    while (current && (depth as number) < (maxDepth as number)) {
      let segment: Str = current.tagName.toLowerCase() as Str;
      if (current.id) {
        segment = `${segment}#${current.id}` as Str;
      } else if (current.className && typeof current.className === 'string') {
        const firstClass: Str = current.className.split(/\s+/)[0] ?? ('' as Str);
        if (firstClass) {
          segment = `${segment}.${firstClass}` as Str;
        }
      }
      parts.unshift(segment);
      current = current.parentElement;
      depth = ((depth as number) + 1) as Num;
    }
    return parts.join(' > ') as Str;
  }

  function collectInspectData(el: Element): (typeof cardInspectedEl)[Str] {
    const cs: CSSStyleDeclaration = getComputedStyle(el);
    const rect: DOMRect = el.getBoundingClientRect();

    /* --- Computed styles --- */
    const styles: Record<Str, Record<Str, Str>> = {};
    for (const group of INSPECT_GROUPS) {
      const groupStyles: Record<Str, Str> = {};
      for (const prop of group.props) {
        const val: Str = cs.getPropertyValue(prop);
        if (val && !INSPECT_SKIP_VALS.has(val)) {
          groupStyles[prop] = val;
        }
      }
      if (Object.keys(groupStyles).length > 0) {
        styles[group.label] = groupStyles;
      }
    }

    /* --- DOM attributes --- */
    const attrs: Record<Str, Str> = {};
    for (
      let i: Num = 0 as Num;
      (i as number) < el.attributes.length;
      i = ((i as number) + 1) as Num
    ) {
      const attr: Attr | null = el.attributes.item(i as number);
      if (!attr) {
        continue;
      }
      const name: Str = attr.name as Str;
      if (name === 'class' || name === 'id' || name === 'style') {
        continue;
      }
      const isPrefix: Bool = INSPECT_ATTR_PREFIXES.some((p) =>
        (name as string).startsWith(p as string),
      ) as Bool;
      if (isPrefix || INSPECT_ATTR_NAMES.has(name)) {
        attrs[name] = (attr.value || 'true') as Str;
      }
    }

    /* --- Accessibility info --- */
    const a11y: Record<Str, Str> = {};
    const role: Str = (el.getAttribute('role') ?? '') as Str;
    if (role) {
      a11y['role'] = role;
    }
    const ariaLabel: Str = (el.getAttribute('aria-label') ?? '') as Str;
    if (ariaLabel) {
      a11y['aria-label'] = ariaLabel;
    }
    const ariaDescribedby: Str = (el.getAttribute('aria-describedby') ?? '') as Str;
    if (ariaDescribedby) {
      a11y['aria-describedby'] = ariaDescribedby;
    }
    const ariaLabelledby: Str = (el.getAttribute('aria-labelledby') ?? '') as Str;
    if (ariaLabelledby) {
      a11y['aria-labelledby'] = ariaLabelledby;
    }
    const ariaHidden: Str = (el.getAttribute('aria-hidden') ?? '') as Str;
    if (ariaHidden) {
      a11y['aria-hidden'] = ariaHidden;
    }
    const ariaExpanded: Str = (el.getAttribute('aria-expanded') ?? '') as Str;
    if (ariaExpanded) {
      a11y['aria-expanded'] = ariaExpanded;
    }
    const ariaPressed: Str = (el.getAttribute('aria-pressed') ?? '') as Str;
    if (ariaPressed) {
      a11y['aria-pressed'] = ariaPressed;
    }
    const tabIdx: Str = (el.getAttribute('tabindex') ?? '') as Str;
    if (tabIdx) {
      a11y['tabindex'] = tabIdx;
    }
    /* Computed accessible name via the element's labels or aria */
    if (el instanceof HTMLElement && el.title && !a11y['aria-label']) {
      a11y['accessible-name'] = el.title as Str;
    }

    /* --- Text content --- */
    const rawText: Str = ((el.textContent ?? '') as string).trim().slice(0, 100) as Str;
    const textContent: Str = rawText.length === 100 ? (`${rawText}…` as Str) : rawText;

    /* --- Box model --- */
    const pt: Num = (Number.parseFloat(cs.paddingTop) || 0) as Num;
    const pr: Num = (Number.parseFloat(cs.paddingRight) || 0) as Num;
    const pb: Num = (Number.parseFloat(cs.paddingBottom) || 0) as Num;
    const pl: Num = (Number.parseFloat(cs.paddingLeft) || 0) as Num;
    const bt: Num = (Number.parseFloat(cs.borderTopWidth) || 0) as Num;
    const br: Num = (Number.parseFloat(cs.borderRightWidth) || 0) as Num;
    const bb: Num = (Number.parseFloat(cs.borderBottomWidth) || 0) as Num;
    const bl: Num = (Number.parseFloat(cs.borderLeftWidth) || 0) as Num;
    const mt: Num = (Number.parseFloat(cs.marginTop) || 0) as Num;
    const mr: Num = (Number.parseFloat(cs.marginRight) || 0) as Num;
    const mb: Num = (Number.parseFloat(cs.marginBottom) || 0) as Num;
    const ml: Num = (Number.parseFloat(cs.marginLeft) || 0) as Num;

    return {
      tag: el.tagName.toLowerCase(),
      classes:
        el.className && typeof el.className === 'string'
          ? el.className.split(/\s+/).slice(0, 20).join(' ')
          : '',
      id: el.id || '',
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
      styles,
      attrs,
      a11y,
      breadcrumb: buildBreadcrumb(el, 6 as Num),
      textContent,
      boxModel: {
        padding: { top: pt, right: pr, bottom: pb, left: pl },
        margin: { top: mt, right: mr, bottom: mb, left: ml },
        border: { top: bt, right: br, bottom: bb, left: bl },
      },
    };
  }

  /**
   * Handle mousemove in measure mode — update box model data for hovered element.
   *
   * @param e - Mouse event
   * @param key - Card key
   */
  function handleMeasureMove(e: MouseEvent, key: Str): Void {
    if (!cardMeasureActive[key]) {
      return;
    }
    const container: HTMLDivElement | undefined = cardPreviewRefs[key];
    if (!container) {
      return;
    }
    const target: Element | null = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === container || !container.contains(target)) {
      cardMeasureData[key] = null;
      return;
    }
    cardMeasureData[key] = collectBoxModel(target, container);
  }

  /**
   * Handle mouseleave in measure mode — clear box model data.
   *
   * @param key - Card key
   */
  function handleMeasureLeave(key: Str): Void {
    cardMeasureData[key] = null;
  }

  /**
   * Handle click in measure mode — copy box model dimensions to clipboard.
   *
   * @param e - Mouse event
   * @param key - Card key
   */
  async function handleMeasureClick(e: MouseEvent, key: Str): Promise<void> {
    if (!cardMeasureActive[key]) {
      return;
    }
    const m = cardMeasureData[key];
    if (!m) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const parts: Str[] = [
      `<${m.tag}> ${Math.round(m.width as number)} × ${Math.round(m.height as number)}` as Str,
      `content: ${Math.round(m.content.w as number)} × ${Math.round(m.content.h as number)}` as Str,
      `padding: ${Math.round(m.padding.top as number)} ${Math.round(m.padding.right as number)} ${Math.round(m.padding.bottom as number)} ${Math.round(m.padding.left as number)}` as Str,
      `margin: ${Math.round(m.margin.top as number)} ${Math.round(m.margin.right as number)} ${Math.round(m.margin.bottom as number)} ${Math.round(m.margin.left as number)}` as Str,
      `border: ${Math.round(m.border.top as number)} ${Math.round(m.border.right as number)} ${Math.round(m.border.bottom as number)} ${Math.round(m.border.left as number)}` as Str,
      `box-sizing: ${m.boxSizing}` as Str,
    ];
    try {
      await navigator.clipboard.writeText(parts.join('\n'));
      cardMeasureCopied[key] = true as Bool;
      setTimeout((): Void => {
        cardMeasureCopied[key] = false as Bool;
      }, 1500);
    } catch (_) {
      /* Clipboard unavailable (iframe sandbox) — non-critical, silently ignore */
    }
  }

  /** CSS color value regex — matches rgb(), rgba(), hsl(), hsla(), hex, and named colors. */
  const CSS_COLOR_RE: RegExp =
    /^(#[\da-f]{3,8}|rgba?\(\s*[\d.]+[%,\s]+[\d.]+[%,\s]+[\d.]+[%,\s/]*[\d.]*%?\s*\)|hsla?\(\s*[\d.]+(?:deg)?[,\s]+[\d.]+%[,\s]+[\d.]+%[,\s/]*[\d.]*%?\s*\))$/i;

  /**
   * Test if a CSS value is a color.
   *
   * @param val - CSS property value
   * @returns True if the value looks like a color
   */
  function isCssColor(val: Str): Bool {
    return CSS_COLOR_RE.test(val as string) as Bool;
  }

  /**
   * Copy an inspect property to clipboard and flash feedback.
   *
   * @param cardKey - Card identifier
   * @param prop - Property name
   * @param val - Property value
   */
  async function copyInspectProp(cardKey: Str, prop: Str, val: Str): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${prop}: ${val}`);
      cardInspectCopyFeedback[cardKey] = prop;
      setTimeout((): Void => {
        cardInspectCopyFeedback[cardKey] = '' as Str;
      }, 1250);
    } catch (_) {
      /* Clipboard unavailable (iframe sandbox) — non-critical */
    }
  }

  /**
   * Handle click in inspect mode — capture element styles.
   *
   * @param e - Mouse event
   * @param key - Card key
   */
  function handleInspectClick(e: MouseEvent, key: Str): Void {
    if (!cardInspectActive[key]) {
      return;
    }
    const container: HTMLDivElement | undefined = cardPreviewRefs[key];
    if (!container) {
      return;
    }
    const target: Element | null = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === container || !container.contains(target)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    cardInspectedEl[key] = collectInspectData(target);
  }

  /**
   * Check if a card has an active color matrix simulation.
   *
   * @param key - Card key
   * @returns True if the card has a color vision deficiency simulation active
   */
  function hasColorMatrixSim(key: Str): Bool {
    const sim: Str = cardSimulations[key] ?? 'none';
    return sim in COLOR_MATRICES;
  }

  /**
   * Collect all non-default settings for a card as label/value pairs.
   *
   * @param key - Card key
   * @returns Array of active settings (empty when all defaults)
   */
  function getActiveSettings(key: Str): Array<{ label: Str; value: Str }> {
    const settings: Array<{ label: Str; value: Str }> = [];
    const sim: Str = cardSimulations[key] ?? 'none';
    if (sim !== 'none') {
      const simItem =
        COLOR_VISION_ITEMS.find((i) => i.id === sim) ?? VISION_ITEMS.find((i) => i.id === sim);
      settings.push({ label: 'Accessibility', value: simItem?.label ?? sim });
    }
    const zoom: Num = cardZoom[key] ?? 1;
    if (zoom !== 1) {
      settings.push({ label: 'Zoom', value: getZoomLabel(key) });
    }
    const grid: Str = cardGrids[key] ?? 'none';
    if (grid !== 'none') {
      const gridPreset = GRID_PRESETS.find((p) => p.id === grid);
      settings.push({ label: 'Grid', value: gridPreset?.label ?? grid });
    }
    const gridFill: Str = cardGridFills[key] ?? 'none';
    if (gridFill !== 'none') {
      const fillPreset = GRID_FILL_PRESETS.find((p) => p.id === gridFill);
      settings.push({ label: 'Grid Fill', value: fillPreset?.label ?? gridFill });
    }
    const orientation: Str = cardOrientations[key] ?? 'default';
    if (orientation !== 'default') {
      if (orientation === 'custom') {
        const deg: Num = cardCustomRotation[key] ?? 0;
        settings.push({ label: 'Orientation', value: `Custom (${deg}°)` });
      } else {
        const orientPreset = ORIENTATION_PRESETS.find((p) => p.id === orientation);
        settings.push({ label: 'Orientation', value: orientPreset?.label ?? orientation });
      }
    }
    const mode: Str = cardModes[key] ?? 'auto';
    if (mode !== 'auto') {
      const modePreset = MODE_PRESETS.find((p) => p.id === mode);
      settings.push({ label: 'Mode', value: modePreset?.label ?? mode });
    }
    const theme: Str = cardThemes[key] ?? '';
    if (theme) {
      const themePreset = THEME_PRESETS.find((p) => p.id === theme);
      settings.push({ label: 'Theme', value: themePreset?.label ?? theme });
    }
    const outline: Str = cardOutlines[key] ?? 'none';
    if (outline !== 'none') {
      const outlinePreset = OUTLINE_PRESETS.find((p) => p.id === outline);
      settings.push({ label: 'Outline', value: outlinePreset?.label ?? outline });
    }
    const bg: Str = cardBackgrounds[key] ?? 'default';
    if (bg !== 'default') {
      const bgPreset = BG_PRESETS.find((p) => p.id === bg);
      settings.push({ label: 'Background', value: bgPreset?.label ?? bg });
    }
    // Media query preferences
    for (const group of MEDIA_PREF_GROUPS) {
      const val: Str = getMediaPref(key, group.pref);
      if (val !== group.defaultValue) {
        const opt = group.options.find((o) => o.value === val);
        settings.push({ label: group.label, value: opt?.label ?? val });
      }
    }
    // Network simulation
    const netSim: Str = cardNetworkSim[key] ?? 'none';
    if (netSim !== 'none') {
      if (netSim === 'custom') {
        const delay: Num = cardCustomNetwork[key]?.delay ?? 200;
        settings.push({ label: 'Network', value: `${delay}ms latency` });
      } else {
        const netPreset = NETWORK_PRESETS.find((p) => p.id === netSim);
        settings.push({ label: 'Network', value: netPreset?.label ?? netSim });
      }
    }
    // Viewport
    const viewport: Str = cardViewports[key] ?? 'auto';
    if (viewport !== 'auto') {
      if (viewport === 'custom') {
        const dims = cardCustomViewports[key];
        if (dims) {
          settings.push({ label: 'Viewport', value: `Custom (${dims.w} \u00D7 ${dims.h})` });
        }
      } else {
        const vpPreset = VIEWPORT_PRESETS.find((p) => p.id === viewport);
        settings.push({
          label: 'Viewport',
          value: vpPreset
            ? `${vpPreset.label} (${vpPreset.width} \u00D7 ${vpPreset.height})`
            : viewport,
        });
      }
    }
    // Custom network
    const customNet = cardCustomNetwork[key];
    if ((cardNetworkSim[key] ?? 'none') === 'custom' && customNet) {
      // Replace preset entry with custom
      const netIdx: Num = settings.findIndex((s) => s.label === 'Network');
      if (netIdx >= 0) {
        settings[netIdx] = { label: 'Network', value: `Custom (${customNet.delay}ms)` };
      } else {
        settings.push({ label: 'Network', value: `Custom (${customNet.delay}ms)` });
      }
    }
    // Text direction
    const dir: Str = cardTextDir[key] ?? 'auto';
    if (dir !== 'auto') {
      settings.push({
        label: 'Direction',
        value: dir === 'inherit' ? 'Inherit' : dir.toUpperCase(),
      });
    }
    // Font size
    const fontSize: Num = cardFontSize[key] ?? 0;
    if (fontSize > 0) {
      settings.push({
        label: 'Font Size',
        value: `${fontSize}px (${(fontSize / 16).toFixed(1)}x)`,
      });
    }
    // Dev tools
    if (cardDebugOutline[key]) {
      const cats: Record<Num, Bool> = cardDebugCategories[key] ?? {};
      const disabledCount: Num = Object.values(cats).filter((v) => v === false).length as Num;
      const outStyle: Str = cardDebugOutlineStyle[key] ?? DEBUG_OUTLINE_DEFAULT_STYLE;
      const outOpacity: Num = cardDebugOutlineOpacity[key] ?? DEBUG_OUTLINE_DEFAULT_OPACITY;
      const parts: Str[] = ['On' as Str];
      if ((disabledCount as number) > 0) {
        parts.push(
          `${DEBUG_OUTLINE_LEGEND.length - (disabledCount as number)}/${DEBUG_OUTLINE_LEGEND.length} categories` as Str,
        );
      }
      if (outStyle !== DEBUG_OUTLINE_DEFAULT_STYLE) {
        parts.push(outStyle);
      }
      if ((outOpacity as number) < 100) {
        parts.push(`${outOpacity}%` as Str);
      }
      if (cardDebugColorBlind[key]) {
        parts.push('CB' as Str);
      }
      settings.push({ label: 'Debug Outline', value: parts.join(', ') });
    }
    if (cardMeasureActive[key]) {
      settings.push({ label: 'Measure', value: 'On' });
    }
    if (cardInspectActive[key]) {
      settings.push({ label: 'Inspect', value: 'On' });
    }
    if (cardConsoleOpen[key]) {
      const logCount: Num = (cardConsoleLogs[key] ?? []).length;
      settings.push({ label: 'Console', value: logCount > 0 ? `${logCount} entries` : 'Open' });
    }
    return settings;
  }

  /**
   * Check if a card has the tunnel vision simulation active.
   *
   * @param key - Card key
   * @returns True if tunnel vision is active
   */
  function hasTunnelVision(key: Str): Bool {
    return cardSimulations[key] === 'tunnel-vision';
  }

  /**
   * Get a media query preference value for a card.
   *
   * @param key - Card key
   * @param pref - Media feature name (e.g. 'reduced-motion')
   * @returns Active value or the default for that preference
   */
  function getMediaPref(key: Str, pref: Str): Str {
    const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
    if (!prefs) {
      const group = MEDIA_PREF_GROUPS.find((g) => g.pref === pref);
      return group?.defaultValue ?? 'no-preference';
    }
    const group = MEDIA_PREF_GROUPS.find((g) => g.pref === pref);
    return prefs[pref] ?? group?.defaultValue ?? 'no-preference';
  }

  /**
   * Set a media query preference for a card.
   *
   * @param key - Card key
   * @param pref - Media feature name
   * @param value - New preference value
   */
  function setMediaPref(key: Str, pref: Str, value: Str): Void {
    if (!cardMediaPrefs[key]) {
      cardMediaPrefs[key] = {};
    }
    cardMediaPrefs[key] = { ...cardMediaPrefs[key], [pref]: value };
  }

  /**
   * Build CSS class names for active media query preference emulations.
   *
   * @param key - Card key
   * @returns Space-separated class names or empty string
   */
  function getMediaPrefClasses(key: Str): Str {
    const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
    if (!prefs) {
      return '';
    }
    const classes: Str[] = [];
    if (prefs['reduced-motion'] === 'reduce') {
      classes.push('lens-reduced-motion');
    }
    if (prefs['contrast'] === 'more') {
      classes.push('lens-contrast-more');
    }
    if (prefs['contrast'] === 'less') {
      classes.push('lens-contrast-less');
    }
    if (prefs['reduced-transparency'] === 'reduce') {
      classes.push('lens-reduced-transparency');
    }
    if (prefs['forced-colors'] === 'active') {
      classes.push('lens-forced-colors');
    }
    if (prefs['color-scheme'] === 'light') {
      classes.push('lens-color-scheme-light');
    }
    if (prefs['color-scheme'] === 'dark') {
      classes.push('lens-color-scheme-dark');
    }
    if (prefs['inverted-colors'] === 'inverted') {
      classes.push('lens-inverted-colors');
    }
    if (prefs['reduced-data'] === 'reduce') {
      classes.push('lens-reduced-data');
    }
    if (prefs['color-gamut'] === 'srgb') {
      classes.push('lens-gamut-srgb');
    }
    if (prefs['color-gamut'] === 'p3') {
      classes.push('lens-gamut-p3');
    }
    if (prefs['color-gamut'] === 'rec2020') {
      classes.push('lens-gamut-rec2020');
    }
    if (prefs['display-mode'] === 'standalone') {
      classes.push('lens-display-standalone');
    }
    if (prefs['display-mode'] === 'fullscreen') {
      classes.push('lens-display-fullscreen');
    }
    if (prefs['display-mode'] === 'minimal-ui') {
      classes.push('lens-display-minimal-ui');
    }
    return classes.join(' ');
  }

  /**
   * Check if any media query preferences are non-default for a card.
   *
   * @param key - Card key
   * @returns True if any preference is overridden
   */
  function hasMediaPrefs(key: Str): Bool {
    const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
    if (!prefs) {
      return false;
    }
    return MEDIA_PREF_GROUPS.some((g) => {
      const val: Str = prefs[g.pref] ?? g.defaultValue;
      return val !== g.defaultValue;
    });
  }

  /**
   * Set network simulation for a card. Triggers a loading overlay for the
   * preset's delay duration, then clears it. Offline is permanent.
   *
   * @param key - Card key
   * @param simId - Network preset ID ('none', 'fast-3g', 'slow-3g', 'offline')
   */
  function setNetworkSim(key: Str, simId: Str): Void {
    cardNetworkSim[key] = simId;
    if (simId === 'custom') {
      const custom = cardCustomNetwork[key];
      const delay: Num = custom?.delay ?? 0;
      if (delay > 0) {
        cardNetworkLoading[key] = true;
        setTimeout((): void => {
          cardNetworkLoading[key] = false;
        }, delay);
      } else {
        cardNetworkLoading[key] = false;
      }
      return;
    }
    const preset = NETWORK_PRESETS.find((p) => p.id === simId);
    if (preset && preset.delay > 0) {
      cardNetworkLoading[key] = true;
      setTimeout((): void => {
        cardNetworkLoading[key] = false;
      }, preset.delay);
    } else if (simId === 'offline') {
      cardNetworkLoading[key] = true;
    } else {
      cardNetworkLoading[key] = false;
    }
  }

  /**
   * Set viewport constraint for a card.
   *
   * @param key - Card key
   * @param viewportId - Viewport preset ID or 'auto'
   */
  function setViewport(key: Str, viewportId: Str): Void {
    cardViewports[key] = viewportId;
  }

  /**
   * Get the CSS style for the outer device frame wrapper.
   * Applies width and category-specific border-radius.
   *
   * @param key - Card key
   * @returns CSS style string or empty
   */
  function getViewportFrameStyle(key: Str): Str {
    const preset = getViewportPreset(key);
    if (!preset) {
      return '';
    }
    return `width: ${preset.width}px; border-radius: ${getViewportRadius(preset.category)}`;
  }

  /**
   * Get the CSS style for the inner viewport content scroll area.
   * Applies fixed height so content scrolls within the device frame.
   *
   * @param key - Card key
   * @returns CSS style string or empty
   */
  function getViewportContentStyle(key: Str): Str {
    // transform creates a containing block for position:fixed children,
    // keeping components like Sidebar/Dialog contained inside the card
    const preset = getViewportPreset(key);
    if (!preset) {
      return 'transform: translateZ(0)';
    }
    return `transform: translateZ(0); height: ${preset.height}px`;
  }

  /**
   * Check whether a card has an active (non-auto) viewport constraint.
   *
   * @param key - Card key
   * @returns True if a viewport preset is active
   */
  function hasViewport(key: Str): Bool {
    return (cardViewports[key] ?? 'auto') !== 'auto';
  }

  /**
   * Get the active viewport preset for a card (or null if auto).
   *
   * @param key - Card key
   * @returns The active preset object or null
   */
  function getViewportPreset(
    key: Str,
  ): { id: Str; label: Str; width: Num; height: Num; category: Str } | null {
    const id: Str = cardViewports[key] ?? 'auto';
    if (id === 'auto') {
      return null;
    }
    if (id === 'custom') {
      const dims = cardCustomViewports[key];
      if (!dims) {
        return null;
      }
      return { id: 'custom', label: 'Custom', width: dims.w, height: dims.h, category: 'Custom' };
    }
    return VIEWPORT_PRESETS.find((p) => p.id === id) ?? null;
  }

  /**
   * Estimate the rendered image height for a screenshot placeholder skeleton.
   * Uses the same logic as captureScreenshot to determine viewport dimensions,
   * then computes the aspect-ratio-scaled height within the 30rem (480px) card.
   *
   * @param key - Card key
   * @returns CSS height string (e.g., "150px") or "6rem" as fallback
   */
  function estimateScreenshotHeight(key: Str): Str {
    const CARD_WIDTH: Num = 480 as Num;
    const MAX_HEIGHT: Num = 384 as Num; /* max-h-96 = 24rem */
    let w: Num = 0 as Num;
    let h: Num = 0 as Num;

    const preset = getViewportPreset(key);
    if (preset) {
      w = preset.width;
      h = preset.height;
    } else {
      /* Auto — measure the component element */
      const compEl: HTMLDivElement | undefined = cardComponentRefs[key];
      if (compEl) {
        w = Math.round(compEl.clientWidth) as Num;
        h = Math.round(compEl.clientHeight) as Num;
      }
    }

    if ((w as number) > 0 && (h as number) > 0) {
      const scaled: Num = Math.round(
        (CARD_WIDTH as number) * ((h as number) / (w as number)),
      ) as Num;
      const clamped: Num = Math.min(scaled as number, MAX_HEIGHT as number) as Num;
      return `${clamped}px` as Str;
    }
    return '6rem' as Str;
  }

  /**
   * Get the border-radius CSS value appropriate for a viewport category.
   * Phones/watches get more rounded corners, desktops get subtle rounding.
   *
   * @param category - Device category string
   * @returns CSS border-radius value
   */
  function getViewportRadius(category: Str): Str {
    switch (category) {
      case 'Watches': {
        return '50%';
      }
      case 'Phones':
      case 'Foldables': {
        return '2rem';
      }
      case 'Tablets':
      case 'Fire Tablets':
      case 'E-Readers':
      case 'Handhelds': {
        return '1rem';
      }
      case 'Smart Displays':
      case 'Smart Appliances': {
        return '0.75rem';
      }
      default: {
        return '0.5rem';
      }
    }
  }

  /**
   * Get the CSS class suffix for a viewport category's device chrome style.
   * Returns the modifier class name (e.g. 'lens-device-frame-phone') or empty.
   *
   * @param category - Device category string
   * @returns CSS class name or empty string
   */
  function getViewportFrameClass(category: Str): Str {
    switch (category) {
      case 'Watches': {
        return 'lens-device-frame-watch';
      }
      case 'Phones':
      case 'Foldables': {
        return 'lens-device-frame-phone';
      }
      case 'Tablets':
      case 'Fire Tablets':
      case 'E-Readers': {
        return 'lens-device-frame-tablet';
      }
      case 'Handhelds': {
        return 'lens-device-frame-handheld';
      }
      case 'TV': {
        return 'lens-device-frame-tv';
      }
      case 'Laptop / Desktop':
      case 'Chromebooks': {
        return 'lens-device-frame-monitor';
      }
      case 'Automotive': {
        return 'lens-device-frame-auto';
      }
      default: {
        return '';
      }
    }
  }

  /**
   * Reset all per-card customizations back to defaults for a given card.
   * Deletes every per-card state entry so the card returns to its initial appearance.
   *
   * @param key - Card key to reset
   */
  function resetCard(key: Str): Void {
    cardSimulations[key] = 'none';
    cardBackgrounds[key] = 'default';
    cardZoom[key] = 1;
    cardOutlines[key] = 'none';
    cardOutlineThickness[key] = 1;
    cardGrids[key] = 'none';
    cardGridSizes[key] = GRID_DEFAULT_SIZE;
    cardGridFills[key] = 'none';
    cardOrientations[key] = 'default';
    cardCustomRotation[key] = 0;
    cardModes[key] = 'auto';
    cardThemes[key] = '';
    cardMediaPrefs[key] = {};
    cardNetworkSim[key] = 'none';
    cardNetworkLoading[key] = false;
    cardViewports[key] = 'auto';
    cardContentHeights[key] = 0;
    cardTextDir[key] = 'auto';
    cardFontSize[key] = 0;
    cardDebugOutline[key] = false;
    cardDebugCategories[key] = {};
    cardDebugOutlineStyle[key] = 'solid';
    cardDebugOutlineWidth[key] = 1;
    cardDebugOutlineOpacity[key] = 100;
    cardDebugColorBlind[key] = false;
    cardDebugHoverCategory[key] = -1;
    cardMeasureActive[key] = false;
    cardInspectActive[key] = false;
    cardInspectedEl[key] = null;
    cardInspectCollapsed[key] = {};
    cardInspectCopyFeedback[key] = '' as Str;
    cardMeasureData[key] = null;
    cardConsoleOpen[key] = false;
    cardConsoleLogs[key] = [];
    cardConsoleSearch[key] = '' as Str;
    cardConsoleLevelFilter[key] = {};
    cardConsoleExpandedEntry[key] = -1 as Num;
    cardScreenBrowser[key] = '';
    cardScreenDevice[key] = '';
    cardScreenshots[key] = [];
    cardScreenCapturing[key] = false;
    cardScreenError[key] = '' as Str;
  }

  /* ---- Browser & Device Preview Screenshot Functions ---- */

  /**
   * Fetch the Playwright device list from the screenshot API.
   * Cached after first call.
   */
  async function fetchPlaywrightDevices(): Promise<void> {
    if (devicesLoaded) {
      return;
    }
    try {
      const res: Response = await fetch('/api/lens/screenshot/devices');
      if (res.ok) {
        const data: unknown = await res.json();
        if (Array.isArray(data)) {
          // API returns DeviceInfo[] — cast from parsed JSON
          playwrightDevices = data as PlaywrightDevice[];
        }
      }
    } catch {
      /* Device list fetch failed — UI will show empty list */
    }
    devicesLoaded = true;
  }

  /**
   * Fetch iOS Simulator device list.
   * Cached after first call.
   */
  async function fetchIosDevices(): Promise<void> {
    if (iosDevicesLoaded) {
      return;
    }
    try {
      const res: Response = await fetch('/api/lens/screenshot/ios/devices');
      if (res.ok) {
        const data: Record<Str, unknown> = (await res.json()) as Record<Str, unknown>;
        if (Array.isArray(data.devices)) {
          iosDevices = data.devices as Array<Record<Str, unknown>>;
        }
      }
    } catch {
      /* iOS device list fetch failed */
    }
    iosDevicesLoaded = true;
  }

  /**
   * Fetch Android emulator AVD + hardware profile list.
   * Cached after first call unless `force` is true.
   *
   * @param force - Skip cache and re-fetch (after AVD creation)
   */
  async function fetchAndroidDevices(force?: boolean): Promise<void> {
    if (androidDevicesLoaded && !force) {
      return;
    }
    try {
      const res: Response = await fetch('/api/lens/screenshot/android/devices');
      if (res.ok) {
        const data: Record<Str, unknown> = (await res.json()) as Record<Str, unknown>;
        if (Array.isArray(data.devices)) {
          androidDevices = data.devices as Array<Record<Str, unknown>>;
        }
      }
    } catch {
      /* Android device list fetch failed */
    }
    androidDevicesLoaded = true;
  }

  /**
   * Create a new AVD from a hardware device profile.
   * Shows spinner during creation, then refreshes the device list.
   *
   * @param deviceId - Hardware profile device ID (e.g. 'pixel_9')
   * @param displayName - Human-readable name for selection after creation
   */
  async function createAndroidAvd(deviceId: Str, displayName: Str): Promise<void> {
    creatingAvdDeviceId = deviceId;
    try {
      const res: Response = await fetch('/api/lens/screenshot/android/devices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId as string }),
      });
      if (res.ok) {
        const data: Record<Str, unknown> = (await res.json()) as Record<Str, unknown>;
        /* Refresh device list to pick up the new AVD */
        androidDevicesLoaded = false;
        await fetchAndroidDevices(true);
        /* Auto-select the newly created AVD */
        const newName: Str = ((data.name as string) ?? (displayName as string)) as Str;
        if (newName) {
          /* Find the current card key from the dropdown context */
          for (const key of Object.keys(cardScreenSource)) {
            if ((cardScreenSource[key] || 'playwright') === 'android-emulator') {
              cardScreenDevice[key] = newName;
            }
          }
        }
      }
    } catch {
      /* AVD creation failed — device list will show the profile as uncreated */
    }
    creatingAvdDeviceId = null;
  }

  /**
   * Fetch engine availability status.
   */
  async function fetchEngineStatus(): Promise<void> {
    try {
      const res: Response = await fetch('/api/lens/screenshot/status');
      if (res.ok) {
        const data: Record<Str, unknown> = (await res.json()) as Record<Str, unknown>;
        const ios: Record<Str, unknown> = (data.iosSimulator ?? {}) as Record<Str, unknown>;
        const android: Record<Str, unknown> = (data.androidEmulator ?? {}) as Record<Str, unknown>;
        engineStatus = {
          playwright: { available: true },
          'ios-simulator': {
            available: Boolean(ios.available),
            reason: (ios.reason ?? '') as Str,
          },
          'android-emulator': {
            available: Boolean(android.available),
            reason: (android.reason ?? '') as Str,
          },
        };
      }
    } catch {
      /* Status fetch failed — keep defaults */
    }
  }

  /**
   * Infer a device category from its Playwright name.
   *
   * @param name - Playwright device name
   * @returns Category label for grouping
   */
  function inferDeviceCategory(name: Str): Str {
    if (name.includes('iPhone')) {
      return 'Phones' as Str;
    }
    if (name.includes('iPad')) {
      return 'Tablets' as Str;
    }
    if (name.includes('Pixel') || name.includes('Galaxy') || name.includes('Moto')) {
      return 'Phones' as Str;
    }
    if (name.includes('Galaxy Tab')) {
      return 'Tablets' as Str;
    }
    if (name.includes('Kindle') || name.includes('Nook')) {
      return 'E-Readers' as Str;
    }
    if (name.includes('Blackberry') || name.includes('Nokia') || name.includes('LG')) {
      return 'Phones' as Str;
    }
    if (name.includes('Desktop')) {
      return 'Desktop' as Str;
    }
    return 'Other' as Str;
  }

  /** Filtered Playwright devices based on search query. */
  const filteredPlaywrightDevices: PlaywrightDevice[] = $derived.by((): PlaywrightDevice[] => {
    if (!browserSearchQuery) {
      return playwrightDevices;
    }
    const q: Str = browserSearchQuery.toLowerCase() as Str;
    return playwrightDevices.filter((d: PlaywrightDevice): boolean =>
      d.name.toLowerCase().includes(q),
    );
  });

  /** Unique categories from filtered devices. */
  const filteredDeviceCategories: Str[] = $derived.by((): Str[] => {
    const cats: Set<Str> = new Set();
    for (const d of filteredPlaywrightDevices) {
      cats.add(inferDeviceCategory(d.name));
    }
    return [...cats] as Str[];
  });

  /** Filtered iOS devices based on search query. */
  const filteredIosDevices: Array<Record<Str, unknown>> = $derived.by(
    (): Array<Record<Str, unknown>> => {
      if (!browserSearchQuery) {
        return iosDevices;
      }
      const q: Str = browserSearchQuery.toLowerCase() as Str;
      return iosDevices.filter((d: Record<Str, unknown>): boolean => {
        const name: Str = ((d.name as string) ?? '').toLowerCase() as Str;
        const runtime: Str = ((d.runtimeVersion as string) ?? '').toLowerCase() as Str;
        return name.includes(q) || runtime.includes(q);
      });
    },
  );

  /** Filtered Android devices based on search query. */
  const filteredAndroidDevices: Array<Record<Str, unknown>> = $derived.by(
    (): Array<Record<Str, unknown>> => {
      if (!browserSearchQuery) {
        return androidDevices;
      }
      const q: Str = browserSearchQuery.toLowerCase() as Str;
      return androidDevices.filter((d: Record<Str, unknown>): boolean => {
        const name: Str = ((d.name as string) ?? '').toLowerCase() as Str;
        const tag: Str = ((d.displayTag as string) ?? '').toLowerCase() as Str;
        return name.includes(q) || tag.includes(q);
      });
    },
  );

  /** Popular Playwright device names shown at the top of the device list. */
  const POPULAR_DEVICE_NAMES: Str[] = [
    'iPhone 15 Pro Max' as Str,
    'iPhone 15' as Str,
    'Pixel 7' as Str,
    'iPad Pro 11' as Str,
    'Desktop Chrome' as Str,
  ];

  /** Popular devices filtered from loaded Playwright devices. */
  const popularPlaywrightDevices: PlaywrightDevice[] = $derived.by((): PlaywrightDevice[] => {
    if (browserSearchQuery) {
      return [];
    } /* hide popular when searching */
    return POPULAR_DEVICE_NAMES.map((name: Str): PlaywrightDevice | undefined =>
      playwrightDevices.find((d: PlaywrightDevice): boolean => d.name === name),
    ).filter((d: PlaywrightDevice | undefined): d is PlaywrightDevice => d !== undefined);
  });

  /**
   * Format a timestamp as relative time (e.g., "just now", "2m ago", "1h ago").
   *
   * @param ts - Timestamp in ms since epoch
   * @returns Human-readable relative time string
   */
  function relativeTime(ts: Num): Str {
    const delta: Num = (Date.now() - (ts as number)) as Num;
    if (delta < 5000) {
      return 'just now' as Str;
    }
    if (delta < 60_000) {
      return `${Math.floor((delta as number) / 1000)}s ago` as Str;
    }
    if (delta < 3_600_000) {
      return `${Math.floor((delta as number) / 60_000)}m ago` as Str;
    }
    if (delta < 86_400_000) {
      return `${Math.floor((delta as number) / 3_600_000)}h ago` as Str;
    }
    return `${Math.floor((delta as number) / 86_400_000)}d ago` as Str;
  }

  /**
   * Capture a real browser screenshot for a card.
   *
   * @param key - Card key
   * @param variantKey - Variant prop name (for isolation URL)
   * @param option - Variant option value
   */
  async function captureScreenshot(key: Str, variantKey: Str, option: Str): Promise<void> {
    if (!componentName) {
      return;
    }
    cardScreenCapturing[key] = true;
    cardScreenError[key] = '' as Str;

    const source: ScreenshotSource = cardScreenSource[key] || 'playwright';
    const browser: Str = cardScreenBrowser[key] || ('chromium' as Str);
    const device: Str = cardScreenDevice[key] || ('' as Str);

    /* Build shared params used by all engines */
    const params: URLSearchParams = new URLSearchParams();
    params.set('component', componentName);
    if (variantKey) {
      params.set('variant', variantKey);
    }
    if (option) {
      params.set('option', option);
    }

    /* Pass current card styles */
    const styles: Record<Str, Str> = collectCardStyles(key);
    if (Object.keys(styles).length > 0) {
      params.set('s', btoa(JSON.stringify(styles)));
    }

    /* Dark/light mode — used by all engines */
    const mode: Str = cardModes[key] ?? 'auto';
    if (mode === 'dark' || mode === 'light') {
      if (source === 'playwright') {
        params.set('colorScheme', mode);
      } else if (source === 'ios-simulator') {
        params.set('appearance', mode);
      } else if (source === 'android-emulator') {
        params.set('nightMode', mode === 'dark' ? 'yes' : 'no');
      }
    }

    /* Determine the endpoint URL based on source */
    let endpoint: Str;
    if (source === 'ios-simulator') {
      endpoint = '/api/lens/screenshot/ios' as Str;
      if (device) {
        params.set('device', device);
      }

      /* iOS accessibility settings */
      const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
      if (prefs) {
        if (prefs['reduced-motion'] === 'reduce') {
          params.set('reduceMotion', 'true');
        }
        if (prefs['prefers-contrast'] === 'more') {
          params.set('increaseContrast', 'true');
        }
        if (prefs['prefers-reduced-transparency'] === 'reduce') {
          params.set('reduceTransparency', 'true');
        }
      }

      /* Map font size to iOS Dynamic Type content size */
      const fontSize: Num = cardFontSize[key] ?? 0;
      if (fontSize > 0) {
        /* Approximate mapping: <14px → XS, 14–15 → S, 16 → M, 17–19 → L, 20–23 → XL, 24–27 → XXL, 28+ → XXXL */
        let contentSize: Str = 'UICTContentSizeCategoryL' as Str;
        if (fontSize < 14) {
          contentSize = 'UICTContentSizeCategoryXS' as Str;
        } else if (fontSize < 16) {
          contentSize = 'UICTContentSizeCategoryS' as Str;
        } else if (fontSize < 17) {
          contentSize = 'UICTContentSizeCategoryM' as Str;
        } else if (fontSize < 20) {
          contentSize = 'UICTContentSizeCategoryL' as Str;
        } else if (fontSize < 24) {
          contentSize = 'UICTContentSizeCategoryXL' as Str;
        } else if (fontSize < 28) {
          contentSize = 'UICTContentSizeCategoryXXL' as Str;
        } else {
          contentSize = 'UICTContentSizeCategoryAccessibilityXXXL' as Str;
        }
        params.set('contentSize', contentSize);
      }
    } else if (source === 'android-emulator') {
      endpoint = '/api/lens/screenshot/android' as Str;
      if (device) {
        params.set('avd', device);
      }

      /* Android accessibility settings */
      const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
      if (prefs && prefs['reduced-motion'] === 'reduce') {
        params.set('animationScale', '0');
      }

      /* Map font size to Android font scale */
      const fontSize: Num = cardFontSize[key] ?? 0;
      if (fontSize > 0) {
        const fontScale: Num = (fontSize / 16) as Num;
        params.set('fontScale', String(fontScale));
      }
    } else {
      endpoint = '/api/lens/screenshot' as Str;
      /* Playwright-specific params */
      params.set('browser', browser);
      if (device) {
        params.set('device', device);
      }

      /* Viewport dimensions (Playwright only) */
      const vp: Str = cardViewports[key] ?? 'auto';
      if (!device) {
        if (vp === 'auto') {
          /* Measure the actual rendered component wrapper — not the card container */
          const compEl: HTMLDivElement | undefined = cardComponentRefs[key];
          if (compEl) {
            const measuredW: Num = Math.round(compEl.clientWidth) as Num;
            const measuredH: Num = Math.round(compEl.clientHeight) as Num;
            if ((measuredW as number) > 0 && (measuredH as number) > 0) {
              params.set('width', String(measuredW));
              params.set('height', String(measuredH));
            }
          }
        } else if (vp === 'custom') {
          const dims = cardCustomViewports[key];
          if (dims) {
            params.set('width', String(dims.w));
            params.set('height', String(dims.h));
          }
        } else {
          const preset = VIEWPORT_PRESETS.find((p) => p.id === vp);
          if (preset) {
            params.set('width', String(preset.width));
            params.set('height', String(preset.height));
          }
        }
      }

      /* Media preferences (Playwright only) */
      const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
      if (prefs) {
        if (prefs['reduced-motion'] === 'reduce') {
          params.set('reducedMotion', 'reduce');
        }
        if (prefs['forced-colors'] === 'active') {
          params.set('forcedColors', 'active');
        }
      }

      /* Network throttling (Playwright only) */
      const netSim: Str = cardNetworkSim[key] ?? 'none';
      if (netSim !== 'none') {
        if (netSim === 'custom') {
          const custom = cardCustomNetwork[key];
          if (custom) {
            params.set('networkThrottle', String(custom.delay));
          }
        } else {
          const preset = NETWORK_PRESETS.find((p) => p.id === netSim);
          if (preset) {
            params.set('networkThrottle', String(preset.delay));
          }
        }
      }
    }

    try {
      const res: Response = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) {
        const errBody: unknown = await res.json().catch(() => ({}));
        const errMsg: Str = (
          typeof errBody === 'object' && errBody !== null && 'error' in errBody
            ? String((errBody as Record<Str, unknown>).error)
            : 'Screenshot failed'
        ) as Str;
        log.warn(`Screenshot capture failed: ${errMsg}`);
        cardScreenError[key] = errMsg;
        return;
      }

      /* Parse JSON response (image + console + perf) */
      const body: Record<Str, unknown> = (await res.json()) as Record<Str, unknown>;
      const base64Image: Str = (body.image ?? '') as Str;
      if (!base64Image) {
        log.warn('Screenshot API returned no image data');
        cardScreenError[key] = 'No image data returned' as Str;
        return;
      }

      /* Decode base64 → ArrayBuffer → blob → object URL */
      const binaryStr: Str = atob(base64Image) as Str;
      const buf: ArrayBuffer = new ArrayBuffer(binaryStr.length);
      const view: Uint8Array = new Uint8Array(buf);
      for (let i: Num = 0 as Num; i < binaryStr.length; i++) {
        view[i] = binaryStr.codePointAt(i) ?? 0;
      }
      const blob: Blob = new Blob([buf], { type: 'image/png' });
      const imageUrl: Str = URL.createObjectURL(blob) as Str;

      /* Extract console logs */
      const rawLogs: unknown[] = Array.isArray(body.consoleLogs) ? body.consoleLogs : [];
      const consoleLogs: ScreenshotConsoleEntry[] = rawLogs.map(
        (entry: unknown): ScreenshotConsoleEntry => {
          const e: Record<Str, unknown> = entry as Record<Str, unknown>;
          return { level: (e.level ?? 'log') as Str, text: (e.text ?? '') as Str };
        },
      );

      /* Extract performance timing */
      const rawPerf: Record<Str, unknown> = (
        typeof body.performance === 'object' && body.performance !== null ? body.performance : {}
      ) as Record<Str, unknown>;
      const perfData: Partial<ScreenshotPerfData> = {};
      for (const k of [
        'domContentLoaded',
        'load',
        'domInteractive',
        'responseEnd',
        'firstPaint',
        'firstContentfulPaint',
      ]) {
        if (typeof rawPerf[k] === 'number') {
          (perfData as Record<Str, Num>)[k] = rawPerf[k] as Num;
        }
      }

      /* Determine browser/device display info based on source */
      let displayBrowser: Str;
      let displayBrowserName: Str;
      let displayBrowserVersion: Str;
      let displayDevice: Str;
      let displayDeviceOS: Str;

      if (source === 'ios-simulator') {
        displayBrowser = 'safari' as Str;
        displayBrowserName = ((body.browserDisplayName as Str) ?? 'Safari') as Str;
        displayBrowserVersion = ((body.browserVersion as Str) ?? '') as Str;
        displayDevice = ((body.device as Str) ?? 'iOS Simulator') as Str;
        displayDeviceOS = ((body.deviceOS as Str) ?? '') as Str;
      } else if (source === 'android-emulator') {
        displayBrowser = 'chrome-mobile' as Str;
        displayBrowserName = ((body.browserDisplayName as Str) ?? 'Chrome Mobile') as Str;
        displayBrowserVersion = ((body.browserVersion as Str) ?? '') as Str;
        displayDevice = ((body.device as Str) ?? 'Android Emulator') as Str;
        displayDeviceOS = ((body.deviceOS as Str) ?? '') as Str;
      } else {
        displayBrowser = browser;
        displayBrowserName = ((body.browserDisplayName as Str) ?? browser) as Str;
        displayBrowserVersion = ((body.browserVersion as Str) ?? '') as Str;
        displayDevice = device || ('custom' as Str);
        /* Look up device OS from cached Playwright device list */
        const matchedDevice: PlaywrightDevice | undefined = playwrightDevices.find(
          (d: PlaywrightDevice): boolean => d.name === device,
        );
        displayDeviceOS = (matchedDevice?.os ?? '') as Str;
      }

      /* Extract safe area insets (iOS only) */
      const rawInsets: Record<Str, unknown> | undefined = (
        typeof body.safeAreaInsets === 'object' && body.safeAreaInsets !== null
          ? body.safeAreaInsets
          : undefined
      ) as Record<Str, unknown> | undefined;
      const safeAreaInsets: ScreenshotCapture['safeAreaInsets'] = rawInsets
        ? {
            top: (rawInsets.top ?? 0) as Num,
            right: (rawInsets.right ?? 0) as Num,
            bottom: (rawInsets.bottom ?? 0) as Num,
            left: (rawInsets.left ?? 0) as Num,
          }
        : undefined;

      /* Extract device frame data (iOS/Android) */
      const rawFrame: Record<Str, unknown> | undefined = (
        typeof body.deviceFrame === 'object' && body.deviceFrame !== null
          ? body.deviceFrame
          : undefined
      ) as Record<Str, unknown> | undefined;
      const deviceFrame: ScreenshotCapture['deviceFrame'] = rawFrame
        ? {
            frameId: (rawFrame.frameId ?? '') as Str,
            screenRegion: (rawFrame.screenRegion ?? { x: 0, y: 0, width: 0, height: 0 }) as {
              x: Num;
              y: Num;
              width: Num;
              height: Num;
            },
          }
        : undefined;

      const capture: ScreenshotCapture = {
        source,
        browser: displayBrowser,
        browserDisplayName: displayBrowserName,
        browserVersion: displayBrowserVersion,
        device: displayDevice,
        deviceOS: displayDeviceOS,
        imageUrl,
        timestamp: Date.now() as Num,
        consoleLogs,
        performance: perfData,
        ...(safeAreaInsets ? { safeAreaInsets } : {}),
        ...(deviceFrame ? { deviceFrame } : {}),
      };

      const existing: ScreenshotCapture[] = cardScreenshots[key] ?? [];
      cardScreenshots[key] = [...existing, capture];
    } catch (error: unknown) {
      const msg: Str = (
        error instanceof Error ? error.message : 'Screenshot request failed'
      ) as Str;
      log.warn(`Screenshot capture error: ${msg}`);
      cardScreenError[key] = msg;
    } finally {
      /* Only clear capturing flag when NOT inside a parallel batch —
         captureParallel manages the flag itself via cardCapturingSources */
      if (!cardCapturingSources[key]?.size) {
        cardScreenCapturing[key] = false;
      }
    }
  }

  /**
   * Capture screenshots from all available engines in parallel.
   *
   * Fires all three sources simultaneously and appends each result
   * as it arrives. Only fires sources that are available.
   *
   * @param key - Card key
   * @param variantKey - Variant prop name (for isolation URL)
   * @param option - Variant option value
   */
  async function captureParallel(key: Str, variantKey: Str, option: Str): Promise<void> {
    if (!componentName) {
      return;
    }
    cardScreenCapturing[key] = true;

    const sources: ScreenshotSource[] = ['playwright' as ScreenshotSource];
    if (engineStatus['ios-simulator']?.available) {
      sources.push('ios-simulator' as ScreenshotSource);
    }
    if (engineStatus['android-emulator']?.available) {
      sources.push('android-emulator' as ScreenshotSource);
    }

    /* Track which sources are in-flight for per-engine placeholders */
    cardCapturingSources[key] = new Set(sources);
    cardCapturingTotal[key] = sources.length as Num;

    const originalSource: ScreenshotSource = cardScreenSource[key] || 'playwright';

    /* Fire each source as an independent capture with its own source override */
    const promises: Array<Promise<void>> = sources.map(
      async (src: ScreenshotSource): Promise<void> => {
        /* Temporarily set source for this capture's param building */
        const prevSource: ScreenshotSource = cardScreenSource[key] || 'playwright';
        cardScreenSource[key] = src;
        try {
          await captureScreenshot(key, variantKey, option);
        } finally {
          /* Remove this source from the in-flight set (progressive reveal) */
          const current: Set<ScreenshotSource> = cardCapturingSources[key] ?? new Set();
          current.delete(src);
          cardCapturingSources[key] = new Set(current);
        }
      },
    );

    await Promise.allSettled(promises);
    cardScreenSource[key] = originalSource;
    cardCapturingSources[key] = new Set();
    cardCapturingTotal[key] = 0 as Num;
    cardScreenCapturing[key] = false;
  }

  /**
   * Two-click confirmation for destructive actions.
   * First click arms the action (returns false), second click confirms (returns true).
   * Auto-disarms after 3 seconds if not confirmed.
   *
   * @param actionKey - Unique key identifying the destructive action
   * @returns Whether the action is confirmed
   */
  function confirmDestructive(actionKey: Str): Bool {
    if (pendingDestructiveAction[actionKey]) {
      pendingDestructiveAction[actionKey] = false;
      return true as Bool;
    }
    pendingDestructiveAction[actionKey] = true;
    setTimeout((): Void => {
      pendingDestructiveAction[actionKey] = false;
    }, 3000);
    return false as Bool;
  }

  /** Per-card + per-capture feedback key for "Copy Image Info" (e.g. `"card-0"`). */
  let copyImageInfoFeedback: Str = $state('' as Str);

  /**
   * Copy screenshot metadata to clipboard as formatted text.
   *
   * @param capture - The screenshot capture to copy info for
   * @param index - Display index of the capture
   * @param feedbackKey - Unique key for showing checkmark feedback
   */
  async function copyScreenshotInfo(
    capture: ScreenshotCapture,
    index: Num,
    feedbackKey: Str,
  ): Promise<void> {
    const lines: Str[] = [
      `Screenshot #${(index as number) + 1}` as Str,
      `Browser: ${capture.browserDisplayName}${capture.browserVersion ? ` v${capture.browserVersion}` : ''}` as Str,
      `Device: ${capture.device}` as Str,
      `Source: ${capture.source ?? 'playwright'}` as Str,
      `Captured: ${new Date(capture.timestamp as number).toISOString()}` as Str,
    ];
    if (capture.performance) {
      if (capture.performance.firstPaint !== undefined) {
        lines.push(`First Paint: ${capture.performance.firstPaint}ms` as Str);
      }
      if (capture.performance.domContentLoaded !== undefined) {
        lines.push(`DCL: ${capture.performance.domContentLoaded}ms` as Str);
      }
      if (capture.performance.load !== undefined) {
        lines.push(`Load: ${capture.performance.load}ms` as Str);
      }
    }
    if (capture.consoleLogs.length > 0) {
      const errors: Num = capture.consoleLogs.filter((l) => l.level === 'error').length as Num;
      const warnings: Num = capture.consoleLogs.filter((l) => l.level === 'warning').length as Num;
      lines.push(
        `Console: ${capture.consoleLogs.length} messages (${errors} errors, ${warnings} warnings)` as Str,
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      copyImageInfoFeedback = feedbackKey;
      setTimeout((): Void => {
        copyImageInfoFeedback = '' as Str;
      }, 1250);
    } catch {
      /* Clipboard write failed — browser may not support it */
    }
  }

  /**
   * Copy compare metadata (both sides) to the clipboard.
   *
   * @param leftCapture - Left side screenshot capture
   * @param rightCapture - Right side screenshot capture
   * @param leftIdx - Left side index in captures array
   * @param rightIdx - Right side index in captures array
   * @param position - Slider position percentage (0–100)
   */
  async function copyCompareInfo(
    leftCapture: ScreenshotCapture,
    rightCapture: ScreenshotCapture,
    leftIdx: Num,
    rightIdx: Num,
    position: Num,
  ): Promise<void> {
    const lines: Str[] = [
      `Compare: #${(leftIdx as number) + 1} vs #${(rightIdx as number) + 1}` as Str,
      `Slider: ${position}%` as Str,
      '' as Str,
      `Left (#${(leftIdx as number) + 1}):` as Str,
      `  Browser: ${leftCapture.browserDisplayName}${leftCapture.browserVersion ? ` v${leftCapture.browserVersion}` : ''}` as Str,
      `  Device: ${leftCapture.device}` as Str,
      `  Source: ${leftCapture.source ?? 'playwright'}` as Str,
      '' as Str,
      `Right (#${(rightIdx as number) + 1}):` as Str,
      `  Browser: ${rightCapture.browserDisplayName}${rightCapture.browserVersion ? ` v${rightCapture.browserVersion}` : ''}` as Str,
      `  Device: ${rightCapture.device}` as Str,
      `  Source: ${rightCapture.source ?? 'playwright'}` as Str,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      /* Clipboard write failed — browser may not support it in this context */
    }
  }

  /**
   * Remove a screenshot capture and revoke its object URL.
   *
   * @param key - Card key
   * @param index - Index in the captures array
   */
  function removeScreenshot(key: Str, index: Num): Void {
    const captures: ScreenshotCapture[] = cardScreenshots[key] ?? [];
    const removed: ScreenshotCapture | undefined = captures[index];
    if (removed) {
      URL.revokeObjectURL(removed.imageUrl);
    }
    cardScreenshots[key] = captures.filter((_: ScreenshotCapture, i: Num): boolean => i !== index);
  }

  /* ------------------------------------------------------------------ */
  /*  Screenshot export                                                  */
  /* ------------------------------------------------------------------ */

  /** Screenshot export format menu items with descriptions and file extension badges. */
  const SCREENSHOT_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-image',
      label: 'Copy as Image',
      icon: Clipboard,
      category: 'Clipboard',
      description: 'Copies PNG to clipboard',
      ext: '',
    },
    {
      id: 'copy-data-uri',
      label: 'Copy as Data URI',
      icon: Link,
      category: 'Clipboard',
      description: 'Base64-encoded inline image',
      ext: '',
    },
    {
      id: 'download-png',
      label: 'Download PNG',
      icon: Download,
      category: 'File',
      description: 'Lossless raster file',
      ext: '.png',
    },
  ];

  /** Search query for screenshot export menu filtering. */
  let screenshotExportSearchQuery: Str = $state('');

  /** Screenshot export items filtered by search query (searches label, description, category). */
  const filteredScreenshotExportItems = $derived(
    screenshotExportSearchQuery.length === 0
      ? SCREENSHOT_EXPORT_ITEMS
      : SCREENSHOT_EXPORT_ITEMS.filter((p) => {
          const q: Str = screenshotExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique screenshot export categories present after filtering. */
  const filteredScreenshotExportCategories: Str[] = $derived([
    ...new Set(filteredScreenshotExportItems.map((p) => p.category)),
  ]);

  /** Compare export items filtered by the separate compare export search query. */
  const filteredCompareExportItems = $derived(
    compareExportSearchQuery.length === 0
      ? SCREENSHOT_EXPORT_ITEMS
      : SCREENSHOT_EXPORT_ITEMS.filter((p) => {
          const q: Str = compareExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique compare export categories present after filtering. */
  const filteredCompareExportCategories: Str[] = $derived([
    ...new Set(filteredCompareExportItems.map((p) => p.category)),
  ]);

  /** Per-card feedback state for screenshot export actions. Keyed by cardKey or 'compare'. */
  let screenshotExportFeedback: Record<Str, Str> = $state({});

  /**
   * Export a single screenshot capture by format.
   *
   * @param capture - The screenshot capture to export
   * @param formatId - Export format identifier
   * @param feedbackKey - Key for scoping export feedback (e.g. cardKey or 'compare')
   */
  async function handleScreenshotExport(
    capture: ScreenshotCapture,
    formatId: Str,
    feedbackKey: Str = '' as Str,
  ): Promise<void> {
    if (formatId === 'copy-image') {
      try {
        const response: Response = await fetch(capture.imageUrl);
        const blob: Blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } catch {
        /* Clipboard write failed — browser may not support ClipboardItem */
      }
    } else if (formatId === 'copy-data-uri') {
      try {
        const response: Response = await fetch(capture.imageUrl);
        const blob: Blob = await response.blob();
        const reader: FileReader = new FileReader();
        const dataUri: Str = await new Promise<Str>((resolve) => {
          reader.onloadend = (): void => resolve(reader.result as Str);
          reader.readAsDataURL(blob);
        });
        await navigator.clipboard.writeText(dataUri);
      } catch {
        /* Data URI conversion failed */
      }
    } else if (formatId === 'download-png') {
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = capture.imageUrl;
      a.download = `screenshot-${capture.browserDisplayName}-${capture.device}-${capture.timestamp}.png`;
      a.click();
    }
    screenshotExportFeedback[feedbackKey] = formatId;
    setTimeout((): Void => {
      screenshotExportFeedback[feedbackKey] = '';
    }, 2000);
  }

  /**
   * Load an image from a URL and return an HTMLImageElement.
   *
   * @param url - Image source URL (object URL or data URI)
   * @returns Resolved HTMLImageElement when loaded
   */
  function loadImage(url: Str): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img: HTMLImageElement = new Image();
      img.addEventListener('load', (): void => resolve(img));
      img.addEventListener('error', reject);
      img.src = url;
    });
  }

  /**
   * Composite two compare images into a single image with the slider line.
   *
   * @param leftUrl - Object URL of the left screenshot
   * @param rightUrl - Object URL of the right screenshot
   * @param position - Slider position (0–100)
   * @returns Object URL of the composited PNG image
   */
  async function compositeCompareImage(leftUrl: Str, rightUrl: Str, position: Num): Promise<Str> {
    const [leftImg, rightImg]: [HTMLImageElement, HTMLImageElement] = await Promise.all([
      loadImage(leftUrl),
      loadImage(rightUrl),
    ]);

    const width: Num = Math.max(leftImg.naturalWidth, rightImg.naturalWidth) as Num;
    const height: Num = Math.max(leftImg.naturalHeight, rightImg.naturalHeight) as Num;

    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = width as number;
    canvas.height = height as number;
    /* 2D context is always available in browser — non-null assertion is safe */
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

    /**
     * Draw an image centered within the canvas, preserving aspect ratio (object-contain).
     *
     * @param img - Image element to draw
     */
    const drawContained = (img: HTMLImageElement): void => {
      const scale: Num = Math.min(
        (width as number) / img.naturalWidth,
        (height as number) / img.naturalHeight,
      ) as Num;
      const w: Num = (img.naturalWidth * (scale as number)) as Num;
      const h: Num = (img.naturalHeight * (scale as number)) as Num;
      const x: Num = (((width as number) - (w as number)) / 2) as Num;
      const y: Num = (((height as number) - (h as number)) / 2) as Num;
      ctx.drawImage(img, x as number, y as number, w as number, h as number);
    };

    /* Draw right image as background */
    drawContained(rightImg);

    /* Clip and draw left image at slider position */
    const clipX: Num = (((position as number) / 100) * (width as number)) as Num;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, clipX as number, height as number);
    ctx.clip();
    drawContained(leftImg);
    ctx.restore();

    /* Draw slider line */
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(clipX as number, 0);
    ctx.lineTo(clipX as number, height as number);
    ctx.stroke();

    const blob: Blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b: Blob | null): void => {
        /* toBlob always produces a blob for 'image/png' — non-null is safe */
        resolve(b!);
      }, 'image/png');
    });
    return URL.createObjectURL(blob) as Str;
  }

  /**
   * Export a compare composite image in the given format.
   *
   * @param leftUrl - Object URL of the left screenshot
   * @param rightUrl - Object URL of the right screenshot
   * @param position - Slider position (0–100)
   * @param leftCapture - Left capture metadata (for filename)
   * @param rightCapture - Right capture metadata (for filename)
   * @param formatId - Export format identifier
   * @param feedbackKey - Key for scoping export feedback
   */
  async function handleCompareExport(
    leftUrl: Str,
    rightUrl: Str,
    position: Num,
    leftCapture: ScreenshotCapture,
    rightCapture: ScreenshotCapture,
    formatId: Str,
    feedbackKey: Str,
  ): Promise<void> {
    const compositeUrl: Str = await compositeCompareImage(leftUrl, rightUrl, position);
    const virtualCapture: ScreenshotCapture = {
      ...leftCapture,
      imageUrl: compositeUrl,
      browserDisplayName:
        `${leftCapture.browserDisplayName} vs ${rightCapture.browserDisplayName}` as Str,
      device: 'compare' as Str,
    };
    await handleScreenshotExport(virtualCapture, formatId, feedbackKey);
  }

  /** Export All screenshot format menu items with descriptions and file extension badges. */
  const SCREENSHOT_EXPORT_ALL_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'zip-png',
      label: 'Download ZIP (PNG)',
      icon: FileArchive,
      category: 'File',
      description: 'All screenshots as PNG files',
      ext: '.zip',
    },
    {
      id: 'zip-json',
      label: 'Download ZIP (JSON)',
      icon: FileArchive,
      category: 'File',
      description: 'Screenshots with metadata',
      ext: '.zip',
    },
    {
      id: 'copy-all-json',
      label: 'Copy All as JSON',
      icon: Clipboard,
      category: 'Clipboard',
      description: 'All capture data as JSON',
      ext: '',
    },
  ];

  /** Search query for screenshot export-all menu filtering. */
  let screenshotExportAllSearchQuery: Str = $state('');

  /** Export All items filtered by search query (searches label, description, category). */
  const filteredScreenshotExportAllItems = $derived(
    screenshotExportAllSearchQuery.length === 0
      ? SCREENSHOT_EXPORT_ALL_ITEMS
      : SCREENSHOT_EXPORT_ALL_ITEMS.filter((p) => {
          const q: Str = screenshotExportAllSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique Export All categories present after filtering. */
  const filteredScreenshotExportAllCategories: Str[] = $derived([
    ...new Set(filteredScreenshotExportAllItems.map((p) => p.category)),
  ]);

  /**
   * Download a ZIP blob with the given filename.
   *
   * @param zipped - ZIP file contents as Uint8Array
   * @param filename - Output filename for download
   */
  function downloadZip(zipped: Uint8Array, filename: Str): void {
    /* TS 5.7+ Uint8Array<ArrayBufferLike> → BlobPart requires .buffer cast */
    const blob: Blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /**
   * Export all screenshots for a card in the selected format.
   *
   * @param key - Card key
   * @param formatId - Export format identifier
   */
  async function handleScreenshotExportAll(key: Str, formatId: Str): Promise<void> {
    const captures: ScreenshotCapture[] = cardScreenshots[key] ?? [];
    if (captures.length === 0) {
      return;
    }

    /**
     * Fetch all capture blobs in parallel and return filename→data pairs.
     *
     * @returns Array of name→data pairs for each capture
     */
    function fetchAllCaptures(): Promise<Array<{ name: Str; data: Uint8Array }>> {
      return Promise.all(
        captures.map(async (c: ScreenshotCapture): Promise<{ name: Str; data: Uint8Array }> => {
          const response: Response = await fetch(c.imageUrl);
          const buffer: ArrayBuffer = await response.arrayBuffer();
          return {
            name: `screenshot-${c.browserDisplayName}-${c.device}-${c.timestamp}.png` as Str,
            data: new Uint8Array(buffer),
          };
        }),
      );
    }

    /**
     * Build metadata JSON array from captures.
     *
     * @returns Array of metadata objects for each capture
     */
    function buildMetadata(): Array<Record<string, unknown>> {
      return captures.map((c: ScreenshotCapture) => ({
        browser: c.browserDisplayName,
        browserVersion: c.browserVersion,
        device: c.device,
        source: c.source,
        timestamp: c.timestamp,
        performance: c.performance,
      }));
    }

    if (formatId === 'zip-png') {
      const pairs: Array<{ name: Str; data: Uint8Array }> = await fetchAllCaptures();
      const files: Record<string, Uint8Array> = Object.fromEntries(
        pairs.map((p) => [p.name, p.data]),
      );
      downloadZip(zipSync(files), `screenshots-${key}.zip` as Str);
    } else if (formatId === 'zip-json') {
      const pairs: Array<{ name: Str; data: Uint8Array }> = await fetchAllCaptures();
      const files: Record<string, Uint8Array> = Object.fromEntries([
        ['metadata.json', strToU8(JSON.stringify(buildMetadata(), null, 2))],
        ...pairs.map((p) => [p.name, p.data]),
      ]);
      downloadZip(zipSync(files), `screenshots-${key}.zip` as Str);
    } else if (formatId === 'copy-all-json') {
      await navigator.clipboard.writeText(JSON.stringify(buildMetadata(), null, 2));
    }
    screenshotExportFeedback[key] = formatId;
    setTimeout((): Void => {
      screenshotExportFeedback[key] = '';
    }, 2000);
  }

  /**
   * Get all card keys for the current variant grid.
   *
   * @returns Array of card key strings
   */
  function getAllCardKeys(): Str[] {
    const variants = meta?.variants ?? [];
    if (variants.length === 0) {
      return ['default'];
    }
    const keys: Str[] = [];
    for (const v of variants) {
      if (!v.key) {
        continue;
      }
      for (const opt of v.options) {
        keys.push(`${v.key}:${opt}`);
      }
    }
    return keys;
  }

  /**
   * Copy all per-card settings from a source card to every other card.
   *
   * @param sourceKey - Card key to copy settings from
   */
  function applySettingsToAll(sourceKey: Str): Void {
    const keys: Str[] = getAllCardKeys();
    for (const key of keys) {
      if (key === sourceKey) {
        continue;
      }
      cardSimulations[key] = cardSimulations[sourceKey] ?? 'none';
      cardBackgrounds[key] = cardBackgrounds[sourceKey] ?? 'default';
      cardZoom[key] = cardZoom[sourceKey] ?? 1;
      cardOutlines[key] = cardOutlines[sourceKey] ?? 'none';
      cardOutlineThickness[key] = cardOutlineThickness[sourceKey] ?? 1;
      cardGrids[key] = cardGrids[sourceKey] ?? 'none';
      cardGridSizes[key] = cardGridSizes[sourceKey] ?? GRID_DEFAULT_SIZE;
      cardGridFills[key] = cardGridFills[sourceKey] ?? 'none';
      cardOrientations[key] = cardOrientations[sourceKey] ?? 'default';
      cardCustomRotation[key] = cardCustomRotation[sourceKey] ?? 0;
      cardModes[key] = cardModes[sourceKey] ?? 'auto';
      cardThemes[key] = cardThemes[sourceKey] ?? '';
      cardMediaPrefs[key] = { ...cardMediaPrefs[sourceKey] };
      cardNetworkSim[key] = cardNetworkSim[sourceKey] ?? 'none';
      cardNetworkLoading[key] = false;
      cardViewports[key] = cardViewports[sourceKey] ?? 'auto';
      if (cardCustomViewports[sourceKey]) {
        cardCustomViewports[key] = { ...cardCustomViewports[sourceKey] };
      }
      if (cardCustomNetwork[sourceKey]) {
        cardCustomNetwork[key] = { ...cardCustomNetwork[sourceKey] };
      }
      cardTextDir[key] = cardTextDir[sourceKey] ?? 'auto';
      cardFontSize[key] = cardFontSize[sourceKey] ?? 0;
      cardDebugOutline[key] = cardDebugOutline[sourceKey] ?? false;
      cardDebugCategories[key] = { ...cardDebugCategories[sourceKey] };
      cardDebugOutlineStyle[key] = cardDebugOutlineStyle[sourceKey] ?? 'solid';
      cardDebugOutlineWidth[key] = cardDebugOutlineWidth[sourceKey] ?? 1;
      cardDebugOutlineOpacity[key] = cardDebugOutlineOpacity[sourceKey] ?? 100;
      cardDebugColorBlind[key] = cardDebugColorBlind[sourceKey] ?? false;
      cardMeasureActive[key] = cardMeasureActive[sourceKey] ?? false;
      cardInspectActive[key] = cardInspectActive[sourceKey] ?? false;
      cardConsoleOpen[key] = cardConsoleOpen[sourceKey] ?? false;
    }
  }

  /**
   * Apply a single named setting to a specific card.
   * Used by LensCardSettingsMenu callbacks and section-level events.
   *
   * @param key - Card key to apply the setting to
   * @param name - Setting name (bg, zoom, outline, grid, etc.)
   * @param value - Setting value
   */
  function handleCardSetting(key: Str, name: Str, value: unknown): Void {
    if (name === 'bg') {
      setBackground(key, value as Str);
    } else if (name === 'zoom') {
      setZoom(key, value as Num);
    } else if (name === 'outline') {
      setOutline(key, value as Str);
    } else if (name === 'outlineThickness') {
      cardOutlineThickness[key] = value as Num;
    } else if (name === 'grid') {
      setGrid(key, value as Str);
    } else if (name === 'gridSize') {
      setGridSize(key, value as Num);
    } else if (name === 'gridFill') {
      setGridFill(key, value as Str);
    } else if (name === 'orientation') {
      setOrientation(key, value as Str);
    } else if (name === 'customRotation') {
      cardCustomRotation[key] = value as Num;
    } else if (name === 'mode') {
      setCardMode(key, value as Str);
    } else if (name === 'theme') {
      setCardTheme(key, value as Str);
    } else if (name === 'sim') {
      toggleSimulation(key, value as Str);
    } else if (name === 'dir') {
      cardTextDir[key] = value as Str;
    } else if (name === 'fontSize') {
      cardFontSize[key] = value as Num;
    } else if (name === 'networkSim') {
      setNetworkSim(key, value as Str);
    } else if (name === 'viewport') {
      setViewport(key, value as Str);
    } else if (name === 'mediaPref') {
      const mp = value as { pref: Str; value: Str };
      setMediaPref(key, mp.pref, mp.value);
    } else if (name === 'customNetworkDelay') {
      cardCustomNetwork[key] = {
        delay: value as Num,
        label: cardCustomNetwork[key]?.label ?? 'Custom',
      };
    } else if (name === 'customViewportW') {
      cardCustomViewports[key] = { w: value as Num, h: cardCustomViewports[key]?.h ?? 768 };
    } else if (name === 'customViewportH') {
      cardCustomViewports[key] = { w: cardCustomViewports[key]?.w ?? 1024, h: value as Num };
    }
  }

  /**
   * Build an active settings object for a card, used by LensCardSettingsMenu.
   *
   * @param key - Card key
   * @returns Active settings object with current values for check marks
   */
  function makeActiveSettings(key: Str): Record<Str, unknown> {
    return {
      bg: cardBackgrounds[key] ?? 'default',
      zoom: cardZoom[key] ?? 1,
      outline: cardOutlines[key] ?? 'none',
      outlineThickness: cardOutlineThickness[key] ?? 1,
      grid: cardGrids[key] ?? 'none',
      gridSize: cardGridSizes[key] ?? GRID_DEFAULT_SIZE,
      gridFill: cardGridFills[key] ?? 'none',
      orientation: cardOrientations[key] ?? 'default',
      customRotation: cardCustomRotation[key] ?? 0,
      mode: cardModes[key] ?? 'auto',
      theme: cardThemes[key] ?? '',
      sim: cardSimulations[key] ?? 'none',
      dir: cardTextDir[key] ?? 'auto',
      fontSize: cardFontSize[key] ?? 0,
      networkSim: cardNetworkSim[key] ?? 'none',
      viewport: cardViewports[key] ?? 'auto',
      mediaPrefs: cardMediaPrefs[key] ?? {},
      customNetwork: cardCustomNetwork[key],
      customViewport: cardCustomViewports[key],
    };
  }

  /* -- Section-level event listener -- */
  $effect(() => {
    if (!sectionId) {
      return;
    }
    const onSectionSetting = (e: Event): void => {
      /* CustomEvent detail — cast required because DOM Event has no .detail */
      const {
        sectionId: sid,
        setting,
        value,
      } = (e as CustomEvent<{ sectionId: Str; setting: Str; value: unknown }>).detail;
      if (sid !== sectionId) {
        return;
      }
      if (setting === 'reset') {
        for (const key of getAllCardKeys()) {
          resetCard(key);
        }
        return;
      }
      for (const key of getAllCardKeys()) {
        handleCardSetting(key, setting, value);
      }
    };
    document.addEventListener('lens:section-settings', onSectionSetting);
    return (): Void => {
      document.removeEventListener('lens:section-settings', onSectionSetting);
    };
  });

  /* -- Section-level export event listener -- */
  $effect(() => {
    if (!sectionId) {
      return;
    }
    const onSectionExport = async (e: Event): Promise<void> => {
      const { sectionId: sid, exportId } = (e as CustomEvent<{ sectionId: Str; exportId: Str }>)
        .detail;
      if (sid !== sectionId) {
        return;
      }
      if (exportId === 'stats') {
        const allStats: Record<Str, LensStatsData> = cardStats;
        const report: Str = JSON.stringify(
          {
            component: tagName ?? componentName ?? 'Component',
            variantCount: Object.keys(allStats).length,
            variants: allStats,
          },
          null,
          2,
        ) as Str;
        try {
          await navigator.clipboard.writeText(report);
          statsExportCopied = 'all' as Str;
          setTimeout((): Void => {
            statsExportCopied = '' as Str;
          }, 1250);
        } catch (_) {
          /* clipboard write failed (no permission or non-secure context) */
        }
      }
    };
    document.addEventListener('lens:section-export', onSectionExport);
    return (): Void => {
      document.removeEventListener('lens:section-export', onSectionExport);
    };
  });

  /**
   * Handle export action for a card preview element.
   *
   * @param key - Card identifier for DOM ref lookup
   * @param formatId - Export format identifier (png, jpeg, svg, webp, copy-image, copy-html)
   */
  async function handleExport(key: Str, formatId: Str): Promise<void> {
    const el: HTMLDivElement | undefined = cardPreviewRefs[key];
    if (!el) {
      return;
    }
    exportInProgress = formatId;
    const filename: Str = componentName ?? tagName ?? 'component';
    if (formatId === 'png') {
      await exportPng(el, filename);
    } else if (formatId === 'jpeg') {
      await exportJpeg(el, filename);
    } else if (formatId === 'svg') {
      await exportSvg(el, filename);
    } else if (formatId === 'webp') {
      await exportWebp(el, filename);
    } else if (formatId === 'html') {
      downloadHtml(el, filename);
    } else if (formatId === 'copy-image') {
      await copyImageToClipboard(el);
    } else if (formatId === 'copy-html') {
      await copyHtml(el);
    } else if (formatId === 'copy-svelte') {
      const snippet: Str = codeText ?? codeSnippet('', '');
      if (snippet) {
        await navigator.clipboard.writeText(snippet);
      }
    } else if (formatId === 'copy-data-uri') {
      await copyDataUri(el);
    } else if (formatId === 'standalone-html' && componentName) {
      const mode: Str = (cardModes[key] ?? 'auto') as Str;
      const isDark: Bool = mode === 'dark' || (mode === 'auto' && pageIsDark);
      const activeTheme: Str = (cardThemes[key] ?? '') as Str;
      await downloadStandaloneHtml(componentName, baseProps, label, isDark, activeTheme);
    }
    exportInProgress = '';
    exportFeedback = formatId;
    setTimeout((): Void => {
      exportFeedback = '';
      cardDropdownOpen[key] = false;
    }, 1200);
  }

  /**
   * Generate a code snippet for a variant option or default usage.
   *
   * @param variantKey - The variant prop name (empty for default)
   * @param option - The option value (empty for default)
   * @returns A Svelte code snippet string
   */
  function codeSnippet(variantKey: Str, option: Str): Str {
    if (!tagName) {
      return '';
    }
    if (!variantKey) {
      return `<${tagName}>${label}</${tagName}>`;
    }
    // Dotted key: show as nested prop syntax
    if (variantKey.includes('.')) {
      const [parent, child]: Str[] = variantKey.split('.');
      return `<${tagName} ${parent}={{ ${child}: '${option}' }}>${label}</${tagName}>`;
    }
    return `<${tagName} ${variantKey}="${option}">${label}</${tagName}>`;
  }

  /**
   * Generate a sensible default value for a TypeField based on its type string.
   *
   * Used to seed required sibling fields when building dotted variant props
   * so nested schemas pass safeParse validation.
   *
   * @param type - The TypeScript type string (e.g. `Str`, `Bool`, `Str[]`)
   * @param accepts - The accepts hint (e.g. `text`, `true, false`, `display, form, ...`)
   * @returns A placeholder value matching the type
   */
  function defaultForType(type: Str, accepts: Str): unknown {
    if (type === 'Bool' || type === 'boolean') {
      return false;
    }
    if (type === 'Num' || type === 'number') {
      return 0;
    }
    if (type.endsWith('[]')) {
      return ['example'];
    }
    // Pick first accepted value if available
    if (accepts && accepts !== '—' && accepts.includes(', ')) {
      const [first]: Str[] = accepts.split(', ');
      if (first) {
        return first;
      }
    }
    return 'example';
  }

  /**
   * Build variant props object, handling dotted keys for nested object props.
   *
   * For flat keys like `variant`, returns `{ variant: option }`.
   * For dotted keys like `meta.category`, merges with the base prop:
   * `{ meta: { ...baseProps.meta, category: option } }`.
   *
   * @param variantName - The variant key (may contain `.`)
   * @param option - The option value string
   * @param coerceHint - Optional coercion hint ('array' splits comma-separated values into arrays)
   * @returns Props record to spread onto the component
   */
  function buildVariantProps(
    variantName: Str,
    option: Str,
    coerceHint?: Str,
  ): Record<Str, unknown> {
    // Coerce option string to correct type
    let coerced: unknown = option;
    if (option === 'true' || option === 'false') {
      coerced = option === 'true';
    } else if (coerceHint === 'array') {
      // Array coercion — try JSON parse first (for complex objects from @values),
      // then fall back to comma-separated string splitting
      try {
        const parsed: unknown = JSON.parse(option);
        if (Array.isArray(parsed)) {
          coerced = parsed;
        } else {
          coerced = [parsed];
        }
      } catch {
        /* not JSON — use comma splitting */
        coerced = option.split(', ').map((s: Str): Str => s.trim());
      }
    } else if ((option as string).startsWith('{#snippet')) {
      // Snippet @values — parse HTML content and create a runtime Snippet via createRawSnippet.
      // Format: {#snippet name()}CONTENT{/snippet} → extract CONTENT → wrap in <span>
      const snippetMatch: RegExpMatchArray | null = (option as string).match(
        /\{#snippet\s+\w+\(\)\}([\s\S]*?)\{\/snippet\}/,
      );
      if (snippetMatch) {
        const htmlContent: Str = (snippetMatch[1] ?? '') as Str;
        coerced = createRawSnippet(() => ({
          render: (): string => `<span>${htmlContent as string}</span>`,
        }));
      }
    } else if (!Number.isNaN(Number(option)) && option !== '') {
      coerced = Number(option);
    }

    // Dotted key: nested object prop
    if (variantName.includes('.')) {
      const dotIdx: Num = variantName.indexOf('.');
      const parent: Str = variantName.slice(0, dotIdx);
      const child: Str = variantName.slice(dotIdx + 1);

      // Record-value coercion: modify the child field within each Record entry
      if (coerceHint === 'record-value') {
        const existing: unknown = baseProps[parent];
        if (typeof existing === 'object' && existing !== null) {
          // Clone the Record and update the child field in every value
          const cloned: Record<Str, unknown> = {};
          for (const [k, v] of Object.entries(existing as Record<Str, unknown>)) {
            if (typeof v === 'object' && v !== null) {
              cloned[k] = { ...(v as Record<Str, unknown>), [child]: coerced };
            } else {
              cloned[k] = v;
            }
          }
          return { [parent]: cloned };
        }
        // No base Record — construct a single-entry Record with the value
        return { [parent]: { example: { [child]: coerced } } };
      }

      const existing: unknown = baseProps[parent];
      let parentObj: Record<Str, unknown>;
      if (typeof existing === 'object' && existing !== null) {
        parentObj = { ...(existing as Record<Str, unknown>) };
      } else {
        // No base value — seed required sibling fields from typeFields metadata
        // so nested schemas (e.g. LensMetaSchema) pass safeParse validation
        parentObj = {};
        const parentProp: PropMeta | undefined = propsMeta.find(
          (p: PropMeta): boolean => p.name === parent,
        );
        if (parentProp?.typeFields) {
          for (const tf of parentProp.typeFields) {
            if (tf.required && tf.field !== child) {
              parentObj[tf.field] = defaultForType(tf.type, tf.accepts);
            }
          }
        }
      }
      parentObj[child] = coerced;
      return { [parent]: parentObj };
    }

    return { [variantName]: coerced };
  }

  /**
   * Check if an option name suggests icon-only rendering.
   *
   * @param option - Option name
   * @returns True if the option name contains 'icon'
   */
  function isIconOption(option: Str): boolean {
    return option.includes('icon');
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') exitFullscreen();
  }}
/>

{#snippet toolbarButton(
  Icon: Component,
  tooltipText: Str,
  onclick: () => void,
  disabled: Bool,
  iconClass?: Str,
)}
  <Tooltip.Provider>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <button
            type="button"
            {...tipProps}
            class={cn(
              'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
              disabled ? 'cursor-not-allowed opacity-30' : 'hover:bg-muted hover:text-foreground',
            )}
            onclick={disabled ? undefined : onclick}
            {disabled}
            tabindex={disabled ? -1 : undefined}
          >
            <Icon class={cn('size-3.5', iconClass)} aria-hidden="true" />
          </button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="top" sideOffset={4}>
        {tooltipText}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{/snippet}

{#snippet toolbarToggle(Icon: Component, tooltipText: Str, active: Bool, onclick: () => void)}
  <Tooltip.Provider>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <button
            type="button"
            {...tipProps}
            class={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            {onclick}
            aria-pressed={active}
          >
            <Icon class="size-3.5" aria-hidden="true" />
          </button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="top" sideOffset={4}>
        {tooltipText}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{/snippet}

{#snippet card(
  cardLabel: Str,
  cardKey: Str,
  snippet: Str,
  extraProps: Record<Str, unknown>,
  useIcon: Bool,
  variantKey: Str,
  variantOption: Str,
  requiredChildren: Str,
)}
  {@const activeSim: Str = cardSimulations[cardKey] ?? 'none'}
  {@const activeBg: Str = cardBackgrounds[cardKey] ?? 'default'}
  {@const activeZoom: Num = cardZoom[cardKey] ?? 1}
  {@const activeOutline: Str = cardOutlines[cardKey] ?? 'none'}
  {@const activeGrid: Str = cardGrids[cardKey] ?? 'none'}
  {@const activeOrientation: Str = cardOrientations[cardKey] ?? 'default'}
  {@const activeMode: Str = cardModes[cardKey] ?? 'auto'}
  {@const activeTheme: Str = cardThemes[cardKey] ?? ''}
  {@const activeSettings = getActiveSettings(cardKey)}
  {@const isFullscreen: Bool = Boolean(cardFullscreen[cardKey])}
  {#if isFullscreen}
    <div
      class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
      role="presentation"
      onclick={exitFullscreen}
    ></div>
  {/if}
  <div
    class={cn(
      'overflow-hidden rounded-md border bg-background',
      isFullscreen && 'fixed inset-4 z-50 flex flex-col',
    )}
  >
    <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
      <div class="flex items-center gap-2">
        <code class="text-sm text-muted-foreground">{cardLabel}</code>
        {#if activeSettings.length > 0}
          <Popover.Root>
            <Popover.Trigger>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                aria-label="{activeSettings.length} active settings"
              >
                <Settings2 class="size-3.5" aria-hidden="true" />
                <span class="text-[10px] font-medium">{activeSettings.length}</span>
              </button>
            </Popover.Trigger>
            <Popover.Content side="bottom" align="start" class="w-64 p-0">
              <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                <h4 class="text-xs font-semibold">Active Settings</h4>
                <span class="text-[10px] text-muted-foreground"
                  >{activeSettings.length} modified</span
                >
              </div>
              <div class="space-y-0">
                {#each activeSettings as setting (setting.label)}
                  <div
                    class="flex items-center justify-between gap-4 border-b px-3 py-1.5 last:border-b-0"
                  >
                    <span class="text-[11px] text-muted-foreground">{setting.label}</span>
                    <span class="font-mono text-[11px] font-medium">{setting.value}</span>
                  </div>
                {/each}
              </div>
            </Popover.Content>
          </Popover.Root>
        {/if}
      </div>
      <div class="flex items-center gap-1">
        {#if activeSettings.length > 0}
          {@render toolbarButton(RotateCcw, 'Reset to defaults', () => resetCard(cardKey), false)}
        {/if}
        {@render toolbarButton(ZoomOut, 'Zoom out', () => zoomOut(cardKey), activeZoom <= ZOOM_MIN)}
        <span
          class="min-w-[3rem] text-center font-mono text-[10px] font-medium text-muted-foreground"
          >{Math.round(activeZoom * 100)}%</span
        >
        {@render toolbarButton(ZoomIn, 'Zoom in', () => zoomIn(cardKey), activeZoom >= ZOOM_MAX)}
        {@render toolbarButton(Maximize, 'Fit (100%)', () => zoomFit(cardKey), activeZoom === 1)}
        <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Popover.Root>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <Popover.Trigger>
                    <button
                      type="button"
                      {...tipProps}
                      class={cn(
                        'inline-flex size-7 items-center justify-center rounded-md transition-colors',
                        (cardDebugOutline[cardKey] ?? false)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      aria-pressed={cardDebugOutline[cardKey] ?? false}
                      aria-label="Debug outlines"
                    >
                      <ScanLine class="size-3.5" aria-hidden="true" />
                    </button>
                  </Popover.Trigger>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>Debug outlines</Tooltip.Content>
              <Popover.Content side="bottom" align="start" class="w-80 p-0">
                {@const debugContainer = document.querySelector(`[data-lens-debug="${cardKey}"]`)}
                {@const cats = cardDebugCategories[cardKey] ?? {}}
                {@const outStyle = cardDebugOutlineStyle[cardKey] ?? DEBUG_OUTLINE_DEFAULT_STYLE}
                {@const outWidth = cardDebugOutlineWidth[cardKey] ?? DEBUG_OUTLINE_DEFAULT_WIDTH}
                {@const outOpacity =
                  cardDebugOutlineOpacity[cardKey] ?? DEBUG_OUTLINE_DEFAULT_OPACITY}
                {@const isCB = cardDebugColorBlind[cardKey] ?? false}
                <!-- Header with toggle + controls -->
                <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <Switch
                      checked={cardDebugOutline[cardKey] ?? false}
                      onCheckedChange={(checked: boolean) => {
                        cardDebugOutline[cardKey] = checked as Bool;
                      }}
                      aria-label="Enable debug outlines"
                    />
                    <h4 class="text-xs font-semibold">Debug Outline</h4>
                  </div>
                  <div class="flex items-center gap-1">
                    <!-- Color-blind toggle -->
                    <Tooltip.Provider>
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: cbTipProps })}
                            <button
                              type="button"
                              {...cbTipProps}
                              class={cn(
                                'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors',
                                isCB
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted hover:text-foreground',
                              )}
                              onclick={() => {
                                cardDebugColorBlind[cardKey] = !cardDebugColorBlind[cardKey];
                              }}
                              aria-pressed={isCB}
                              aria-label="Color-blind friendly mode"
                            >
                              <Accessibility class="size-3.5" />
                            </button>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4}>
                          Color-blind mode — uses distinct border patterns
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                    <!-- Settings dropdown -->
                    <Tooltip.Provider>
                      <Tooltip.Root delayDuration={300}>
                        <DropdownMenu.Root
                          onOpenChange={(open) => {
                            if (open) debugOutlineSettingsSearch = '' as Str;
                          }}
                        >
                          <Tooltip.Trigger>
                            {#snippet child({ props: settingsTipProps })}
                              <DropdownMenu.Trigger>
                                <button
                                  {...settingsTipProps}
                                  type="button"
                                  class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  aria-label="Outline settings"
                                >
                                  <SlidersHorizontal class="size-3.5" />
                                </button>
                              </DropdownMenu.Trigger>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="top" sideOffset={4}>
                            Outline style and width settings
                          </Tooltip.Content>
                          <DropdownMenu.Content
                            align="end"
                            class="flex max-h-80 w-56 flex-col overflow-hidden"
                          >
                            <div class="shrink-0 px-2 pb-1.5 pt-1">
                              <div
                                class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                              >
                                <Search
                                  class="size-3 shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                                <input
                                  type="text"
                                  placeholder="Search styles..."
                                  class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                  bind:value={debugOutlineSettingsSearch}
                                  onkeydown={(e) => e.stopPropagation()}
                                  onkeyup={(e) => e.stopPropagation()}
                                  onkeypress={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
                              {#if filteredDebugOutlineStyles.length > 0}
                                {#each ['Basic', '3D Effects'] as group (group)}
                                  {@const groupItems = filteredDebugOutlineStyles.filter(
                                    (s) => s.group === group,
                                  )}
                                  {#if groupItems.length > 0}
                                    <DropdownMenu.Label class="text-xs">{group}</DropdownMenu.Label>
                                    <DropdownMenu.Separator />
                                    {#each groupItems as styleOpt (styleOpt.id)}
                                      <DropdownMenu.Item
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          cardDebugOutlineStyle[cardKey] = styleOpt.id;
                                        }}
                                      >
                                        <div class="flex w-full items-center gap-2">
                                          <div
                                            class="h-0 w-5 shrink-0"
                                            style="border-top:2px {styleOpt.id} currentColor"
                                          ></div>
                                          <div class="min-w-0 flex-1">
                                            <div class="text-xs">{styleOpt.label}</div>
                                            <div class="text-[10px] text-muted-foreground">
                                              {styleOpt.desc}
                                            </div>
                                          </div>
                                          {#if outStyle === styleOpt.id}
                                            <Check
                                              class="size-3.5 shrink-0 transition-opacity duration-150"
                                            />
                                          {/if}
                                        </div>
                                      </DropdownMenu.Item>
                                    {/each}
                                  {/if}
                                {/each}
                              {/if}
                              {#if filteredDebugOutlineWidths.length > 0}
                                <DropdownMenu.Label class="text-xs">Width</DropdownMenu.Label>
                                <DropdownMenu.Separator />
                                {#each filteredDebugOutlineWidths as widthOpt (widthOpt.px)}
                                  <DropdownMenu.Item
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      cardDebugOutlineWidth[cardKey] = widthOpt.px;
                                    }}
                                  >
                                    <div class="flex w-full items-center gap-2">
                                      <div
                                        class="w-5 shrink-0"
                                        style="border-top:{widthOpt.px}px solid currentColor"
                                      ></div>
                                      <span class="text-xs">{widthOpt.label}</span>
                                      {#if outWidth === widthOpt.px}
                                        <Check
                                          class="ml-auto size-3.5 shrink-0 transition-opacity duration-150"
                                        />
                                      {/if}
                                    </div>
                                  </DropdownMenu.Item>
                                {/each}
                              {/if}
                              {#if filteredDebugOutlineStyles.length === 0 && filteredDebugOutlineWidths.length === 0}
                                <div class="px-3 py-4 text-center text-xs text-muted-foreground">
                                  No matches
                                </div>
                              {/if}
                            </div>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </div>
                </div>
                <!-- Opacity slider -->
                <div class="flex items-center gap-2 border-b px-3 py-1.5">
                  <span class="text-[10px] text-muted-foreground">Opacity</span>
                  <Slider
                    type="single"
                    value={outOpacity as number}
                    min={10}
                    max={100}
                    step={5}
                    class="flex-1"
                    onValueChange={(val: number) => {
                      cardDebugOutlineOpacity[cardKey] = (val ?? 100) as Num;
                    }}
                  />
                  <span
                    class="w-8 text-right font-mono text-[10px] tabular-nums text-muted-foreground"
                    >{outOpacity}%</span
                  >
                </div>
                <!-- Toggle all / none -->
                {@const allEnabled = DEBUG_OUTLINE_LEGEND.every((_, i) => cats[i as Num] !== false)}
                <div class="flex items-center justify-between border-b px-3 py-1">
                  <span class="text-[10px] font-medium text-muted-foreground">Categories</span>
                  <button
                    type="button"
                    class="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                    onclick={() => {
                      const next: Record<Num, Bool> = {};
                      for (
                        let i: Num = 0 as Num;
                        (i as number) < DEBUG_OUTLINE_LEGEND.length;
                        i = ((i as number) + 1) as Num
                      ) {
                        next[i] = !allEnabled as Bool;
                      }
                      cardDebugCategories[cardKey] = next;
                    }}
                    aria-label={allEnabled ? 'Hide all categories' : 'Show all categories'}
                  >
                    {allEnabled ? 'Hide all' : 'Show all'}
                  </button>
                </div>
                <!-- Category list -->
                <div class="space-y-0">
                  {#each DEBUG_OUTLINE_LEGEND as entry, idx (entry.label)}
                    {@const isEnabled = cats[idx as Num] !== false}
                    {@const count = debugContainer
                      ? countElements(debugContainer, entry.selectors)
                      : (0 as Num)}
                    <div
                      class={cn(
                        'flex w-full items-start gap-2.5 border-b px-3 py-1.5 transition-colors last:border-b-0',
                        isEnabled ? 'hover:bg-muted/50' : 'opacity-40',
                      )}
                      onmouseenter={() => {
                        if (isEnabled) cardDebugHoverCategory[cardKey] = idx as Num;
                      }}
                      onmouseleave={() => {
                        cardDebugHoverCategory[cardKey] = -1 as Num;
                      }}
                      role="group"
                      aria-label="{entry.label} — {count} elements"
                    >
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked: boolean) => {
                          cardDebugCategories[cardKey] = {
                            ...cardDebugCategories[cardKey],
                            [idx]: checked as Bool,
                          };
                        }}
                        class="mt-0.5 scale-75"
                        aria-label="Show {entry.label} outlines"
                      />
                      <button
                        type="button"
                        class="min-w-0 flex-1 text-left"
                        onclick={() => {
                          if (isEnabled && (count as number) > 0) {
                            highlightFirstElement(cardKey, idx as Num);
                          }
                        }}
                        aria-label="Scroll to first {entry.label} element"
                      >
                        <div class="flex items-center gap-1.5">
                          <span
                            class="inline-block size-3 shrink-0 rounded-sm"
                            style="background:{isEnabled
                              ? entry.color
                              : 'transparent'};outline:1px {isCB
                              ? entry.cbStyle
                              : outStyle} {entry.color}"
                          ></span>
                          <div class="text-[11px] font-medium leading-tight">{entry.label}</div>
                          {#if (count as number) > 0}
                            <span
                              class="rounded-full bg-muted px-1.5 py-px font-mono text-[9px] tabular-nums text-muted-foreground"
                              >{count}</span
                            >
                          {/if}
                        </div>
                        <div class="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                          {entry.elements}
                        </div>
                      </button>
                    </div>
                  {/each}
                </div>
                <!-- Footer hint -->
                <div class="border-t bg-muted/20 px-3 py-1.5">
                  <p class="text-[9px] text-muted-foreground">Click row to scroll to element</p>
                </div>
              </Popover.Content>
            </Popover.Root>
          </Tooltip.Root>
        </Tooltip.Provider>
        {@render toolbarToggle(
          Ruler,
          'Measure — hover to inspect box model, click to copy' as Str,
          cardMeasureActive[cardKey] ?? false,
          () => {
            cardMeasureActive[cardKey] = !cardMeasureActive[cardKey];
            if (!cardMeasureActive[cardKey]) cardMeasureData[cardKey] = null;
          },
        )}
        {@render toolbarToggle(
          MousePointerClick,
          'Inspect — click any element to see its properties',
          cardInspectActive[cardKey] ?? false,
          () => {
            cardInspectActive[cardKey] = !cardInspectActive[cardKey];
            if (!cardInspectActive[cardKey]) cardInspectedEl[cardKey] = null;
          },
        )}
        <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
        <!-- #10 Screenshot button (spinner + disabled while capturing) -->
        {@render toolbarButton(
          (cardScreenCapturing[cardKey] ?? false) ? LoaderCircle : Camera,
          (cardScreenCapturing[cardKey] ?? false)
            ? ('Capturing…' as Str)
            : ('Take screenshot' as Str),
          () => captureScreenshot(cardKey, variantKey, variantOption),
          cardScreenCapturing[cardKey] ?? false,
          (cardScreenCapturing[cardKey] ?? false) ? ('animate-spin' as Str) : undefined,
        )}
        <!-- #12 Dark/Light mode quick toggle -->
        {@render toolbarToggle(
          (cardModes[cardKey] ?? 'auto') === 'dark' ? Sun : Moon,
          (cardModes[cardKey] ?? 'auto') === 'dark'
            ? 'Switch to light mode'
            : 'Switch to dark mode',
          (cardModes[cardKey] ?? 'auto') !== 'auto',
          () => {
            const current: Str = cardModes[cardKey] ?? 'auto';
            if (current === 'dark') setCardMode(cardKey, 'light' as Str);
            else if (current === 'light') setCardMode(cardKey, 'auto' as Str);
            else setCardMode(cardKey, 'dark' as Str);
          },
        )}
        <!-- #11 Quick viewport toggle -->
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <DropdownMenu.Root>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <button
                        type="button"
                        {...tipProps}
                        {...props}
                        class={cn(
                          'inline-flex size-7 items-center justify-center rounded-md transition-colors',
                          hasViewport(cardKey)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <MonitorSmartphone class="size-3.5" aria-hidden="true" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>Quick viewport</Tooltip.Content>
              <DropdownMenu.Content align="end" class="w-48">
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => setViewport(cardKey, 'auto' as Str)}
                >
                  {#if !hasViewport(cardKey)}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <Monitor class="size-4" />
                  {/if}
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm">Auto</span>
                    <span class="text-[11px] text-muted-foreground">Fill available width</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => setViewport(cardKey, 'iphone-16-pro' as Str)}
                >
                  {#if (cardViewports[cardKey] ?? 'auto') === 'iphone-16-pro'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <Smartphone class="size-4" />
                  {/if}
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm">Mobile</span>
                    <span class="text-[11px] text-muted-foreground">393 × 852</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => setViewport(cardKey, 'ipad-air' as Str)}
                >
                  {#if (cardViewports[cardKey] ?? 'auto') === 'ipad-air'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <Tablet class="size-4" />
                  {/if}
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm">Tablet</span>
                    <span class="text-[11px] text-muted-foreground">820 × 1180</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => setViewport(cardKey, 'desktop-fhd' as Str)}
                >
                  {#if (cardViewports[cardKey] ?? 'auto') === 'desktop-fhd'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <Monitor class="size-4" />
                  {/if}
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm">Desktop</span>
                    <span class="text-[11px] text-muted-foreground">1920 × 1080</span>
                  </div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Tooltip.Root>
        </Tooltip.Provider>
        <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
        {@render toolbarButton(
          isFullscreen ? Minimize2 : Maximize2,
          isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
          () => toggleFullscreen(cardKey),
          false,
        )}
        {#if cardStats[cardKey]}
          {@const stats: LensStatsData = cardStats[cardKey]}
          <Popover.Root>
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: tipProps })}
                    {@const hp = healthPercent(stats)}
                    <Popover.Trigger>
                      <button
                        {...tipProps}
                        type="button"
                        class={cn(
                          'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold tabular-nums transition-colors hover:bg-muted',
                          budgetColor(stats.overallHealth),
                        )}
                        aria-label="Performance statistics ({hp}%)"
                      >
                        <Activity class="size-3.5" aria-hidden="true" />
                        <span>{hp}%</span>
                      </button>
                    </Popover.Trigger>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" sideOffset={4}>
                  Mount: {stats.mountTimeMs}ms · Nodes: {stats.nodeCount} · Health: {healthPercent(
                    stats,
                  )}%
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Popover.Content
              side="bottom"
              align="end"
              class="w-96 max-h-[28rem] overflow-y-auto p-0"
            >
              <!-- Header -->
              <div
                class="sticky top-0 z-10 flex items-start justify-between border-b bg-popover px-3 py-2"
              >
                <div>
                  <h4 class="text-xs font-semibold">Performance Statistics</h4>
                  <p class="text-[10px] text-muted-foreground">
                    Measured at mount time. Hover metrics for details.
                  </p>
                </div>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: menuProps })}
                      <button
                        {...menuProps}
                        type="button"
                        class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Statistics options"
                      >
                        <EllipsisVertical class="size-3.5" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="w-48">
                    <DropdownMenu.Sub
                      onOpenChange={(open) => {
                        if (open) statsExportSearchQuery = '';
                      }}
                    >
                      <DropdownMenu.SubTrigger>
                        <Download class="size-4" />
                        Export
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent
                        class="flex max-h-[28rem] w-64 flex-col overflow-hidden"
                      >
                        <div class="shrink-0 px-2 pb-1.5 pt-1">
                          <div
                            class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                          >
                            <Search
                              class="size-3 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              placeholder="Search formats..."
                              class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              bind:value={statsExportSearchQuery}
                              onkeydown={(e) => e.stopPropagation()}
                              onkeyup={(e) => e.stopPropagation()}
                              onkeypress={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                          {#each filteredStatsExportCategories as category (category)}
                            {#if filteredStatsExportCategories.indexOf(category) > 0}
                              <DropdownMenu.Separator />
                            {/if}
                            <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                              {#if category === 'Clipboard'}
                                <Clipboard class="size-3 text-muted-foreground" />
                              {:else if category === 'File'}
                                <Download class="size-3 text-muted-foreground" />
                              {/if}
                              {category}
                            </DropdownMenu.Label>
                            {#each filteredStatsExportItems.filter((i) => i.category === category) as item (item.id)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleStatsExport(
                                    stats,
                                    tagName ?? componentName ?? 'Component',
                                    item.id,
                                  );
                                }}
                              >
                                {#if statsExportCopied === item.id}
                                  <span in:fade={{ duration: 150 }}
                                    ><Check class="size-4 text-green-500" /></span
                                  >
                                {:else}
                                  <item.icon class="size-4" />
                                {/if}
                                <div class="flex min-w-0 flex-1 flex-col">
                                  <span class="flex items-center gap-2">
                                    <span class="truncate">{item.label}</span>
                                    {#if item.ext}
                                      <code
                                        class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                                        >{item.ext}</code
                                      >
                                    {/if}
                                  </span>
                                  <span class="text-[10px] leading-tight text-muted-foreground"
                                    >{item.description}</span
                                  >
                                </div>
                              </DropdownMenu.Item>
                            {/each}
                          {:else}
                            <div
                              class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                            >
                              <SearchX class="size-5" />
                              <div class="flex flex-col items-center gap-0.5">
                                <p class="text-xs font-medium">No formats found</p>
                                <p class="text-[11px]">Try a different search term</p>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        const allOpen: Bool =
                          statsReportOpen &&
                          statsVitalsOpen &&
                          statsDomOpen &&
                          statsA11yOpen &&
                          statsPropCoverageOpen &&
                          statsReRenderOpen;
                        const next: Bool = !allOpen as Bool;
                        statsReportOpen = next;
                        statsVitalsOpen = next;
                        statsDomOpen = next;
                        statsMemoryOpen = next;
                        statsA11yOpen = next;
                        statsConsoleOpen = next;
                        statsPropCoverageOpen = next;
                        statsReRenderOpen = next;
                      }}
                    >
                      <ChevronsUpDown class="size-4" />
                      {statsReportOpen &&
                      statsVitalsOpen &&
                      statsDomOpen &&
                      statsA11yOpen &&
                      statsPropCoverageOpen &&
                      statsReRenderOpen
                        ? 'Collapse All'
                        : 'Expand All'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        statsRefreshKey[cardKey] = ((statsRefreshKey[cardKey] ?? 0) + 1) as Num;
                        statsRefreshFeedback = cardKey;
                        setTimeout((): Void => {
                          statsRefreshFeedback = '' as Str;
                        }, 1250);
                      }}
                    >
                      {#if statsRefreshFeedback === cardKey}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <RefreshCw class="size-4" />
                      {/if}
                      Refresh Stats
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
                <!-- Aria-live region for export copy feedback -->
                <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {#if statsExportCopied}Exported!{/if}
                </span>
              </div>

              <!-- Summary strip — key metrics at a glance -->
              <div
                class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5 text-[10px]"
              >
                <div class="flex items-center gap-3">
                  <span class="text-muted-foreground"
                    >Mount <span class="font-mono font-medium text-foreground"
                      >{stats.mountTimeMs}ms</span
                    ></span
                  >
                  <span class="text-muted-foreground"
                    >Re-renders <span class="font-mono font-medium text-foreground"
                      >{stats.reRenderCount}</span
                    ></span
                  >
                  <span class="text-muted-foreground"
                    >Nodes <span class="font-mono font-medium text-foreground"
                      >{stats.nodeCount}</span
                    ></span
                  >
                </div>
                <span
                  class={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                    healthPercent(stats) >= 80 && 'bg-emerald-500/15 text-emerald-500',
                    healthPercent(stats) >= 50 &&
                      healthPercent(stats) < 80 &&
                      'bg-amber-500/15 text-amber-500',
                    healthPercent(stats) < 50 && 'bg-red-500/15 text-red-500',
                  )}>{healthPercent(stats)}%</span
                >
              </div>

              <!-- Report — budget metrics with tooltip explanations -->
              <div class="px-3 py-2">
                <button
                  type="button"
                  class="flex w-full items-center gap-1"
                  aria-expanded={statsReportOpen}
                  aria-controls="stats-report"
                  onclick={() => (statsReportOpen = !statsReportOpen)}
                >
                  {#if statsReportOpen}<ChevronDown
                      class="size-3 text-muted-foreground"
                    />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                  <h4 class="text-xs font-semibold">Report</h4>
                </button>
                {#if statsReportOpen}<div id="stats-report" transition:slide={{ duration: 150 }}>
                    <p class="mb-1 mt-0.5 text-[10px] text-muted-foreground">
                      Performance and accessibility budget metrics. Hover for details.
                    </p>
                    <div class="space-y-0 divide-y text-xs">
                      {#each stats.budgets as budget (budget.label)}
                        {@const hasDetails =
                          budget.level !== 'green' &&
                          ((budget.label === 'Console Errors' &&
                            stats.consoleMessages.length > 0) ||
                            (budget.label === 'Unlabeled Interactive' &&
                              stats.a11y.unlabeled.length > 0) ||
                            (budget.label === 'Focus Order' &&
                              stats.a11y.focusOrderIssues.length > 0) ||
                            (budget.label === 'Contrast' && stats.a11y.contrastIssues.length > 0) ||
                            (budget.label === 'Images Alt' && stats.a11y.imagesWithoutAlt > 0) ||
                            (budget.label === 'ARIA Usage' && stats.a11y.ariaIssues.length > 0) ||
                            (budget.label === 'SVG Labels' && stats.a11y.svgsWithoutLabel > 0) ||
                            budget.label === 'Motion Safety' ||
                            (budget.label === 'A11y Labels' && stats.a11y.unlabeled.length > 0) ||
                            (budget.label === 'Headings' && stats.a11y.headings.length > 0))}
                        <div>
                          <Tooltip.Provider>
                            <Tooltip.Root delayDuration={300}>
                              <Tooltip.Trigger>
                                {#snippet child({ props: tipProps })}
                                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                                  <div
                                    {...tipProps}
                                    class={cn(
                                      'flex items-center justify-between px-3 py-1.5 transition-colors hover:bg-muted/50',
                                      hasDetails ? 'cursor-pointer' : 'cursor-help',
                                    )}
                                    role={hasDetails ? 'button' : undefined}
                                    tabindex={hasDetails ? 0 : undefined}
                                    onclick={hasDetails
                                      ? (): Void => {
                                          budgetExpanded[budget.label] =
                                            !budgetExpanded[budget.label];
                                        }
                                      : undefined}
                                    onkeydown={hasDetails
                                      ? (e: KeyboardEvent): Void => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            budgetExpanded[budget.label] =
                                              !budgetExpanded[budget.label];
                                          }
                                        }
                                      : undefined}
                                  >
                                    <div class="flex items-center gap-2">
                                      {#if hasDetails}
                                        {#if budgetExpanded[budget.label]}<ChevronDown
                                            class="size-2.5 text-muted-foreground/60"
                                          />{:else}<ChevronRight
                                            class="size-2.5 text-muted-foreground/60"
                                          />{/if}
                                      {/if}
                                      <span
                                        class={cn(
                                          'text-base leading-none',
                                          budgetColor(budget.level),
                                        )}>●</span
                                      >
                                      <span class="text-muted-foreground">{budget.label}</span>
                                    </div>
                                    <span class="font-mono font-medium">{budget.value}</span>
                                  </div>
                                {/snippet}
                              </Tooltip.Trigger>
                              <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                                <div class="space-y-1 px-3 py-2">
                                  <p class="text-xs text-primary-foreground">
                                    {budget.description}
                                  </p>
                                  <p class="font-mono text-[10px] text-primary-foreground/70">
                                    {budget.thresholds}
                                  </p>
                                </div>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </Tooltip.Provider>

                          <!-- Expandable detail panel -->
                          {#if hasDetails && budgetExpanded[budget.label]}
                            <div class="border-t border-dashed bg-muted/20 px-4 py-1.5 text-[10px]">
                              {#if budget.label === 'Console Errors'}
                                {#each stats.consoleMessages.slice(0, 5) as msg (msg.message)}
                                  <div class="flex items-start gap-1.5 truncate">
                                    <span
                                      class={msg.level === 'error'
                                        ? 'text-red-500'
                                        : 'text-amber-500'}
                                    >
                                      {msg.level === 'error' ? '✕' : '⚠'}
                                    </span>
                                    <span class="truncate font-mono text-muted-foreground"
                                      >{msg.message}</span
                                    >
                                  </div>
                                {/each}
                                {#if stats.consoleMessages.length > 5}
                                  <span class="text-muted-foreground/50"
                                    >…and {stats.consoleMessages.length - 5} more</span
                                  >
                                {/if}
                              {:else if budget.label === 'Unlabeled Interactive' || budget.label === 'A11y Labels'}
                                {#each stats.a11y.unlabeled.slice(0, 5) as el (el.tag + el.classes)}
                                  <div class="truncate font-mono text-red-400">
                                    &lt;{el.tag}{el.classes ? ` class="${el.classes}"` : ''}&gt;
                                    {#if el.parentContext}
                                      <span class="text-red-400/60"> in {el.parentContext}</span>
                                    {/if}
                                  </div>
                                {/each}
                                {#if stats.a11y.unlabeled.length > 5}
                                  <span class="text-muted-foreground/50"
                                    >…and {stats.a11y.unlabeled.length - 5} more</span
                                  >
                                {/if}
                              {:else if budget.label === 'Focus Order'}
                                {#each stats.a11y.focusOrderIssues.slice(0, 5) as issue (issue.tag + issue.tabindex)}
                                  <div class="truncate font-mono text-red-400">
                                    &lt;{issue.tag} tabindex="{issue.tabindex}"&gt; {issue.text}
                                  </div>
                                {/each}
                                {#if stats.a11y.focusOrderIssues.length > 5}
                                  <span class="text-muted-foreground/50"
                                    >…and {stats.a11y.focusOrderIssues.length - 5} more</span
                                  >
                                {/if}
                              {:else if budget.label === 'Contrast'}
                                {#each stats.a11y.contrastIssues.slice(0, 5) as ci (ci.tag + ci.text)}
                                  <div class="truncate font-mono text-amber-500">
                                    &lt;{ci.tag}&gt; {ci.text} — {ci.ratio}:1 (need {ci.required}:1)
                                  </div>
                                {/each}
                                {#if stats.a11y.contrastIssues.length > 5}
                                  <span class="text-muted-foreground/50"
                                    >…and {stats.a11y.contrastIssues.length - 5} more</span
                                  >
                                {/if}
                              {:else if budget.label === 'Images Alt'}
                                <div class="text-red-400">
                                  {stats.a11y.imagesWithoutAlt} &lt;img&gt; element{stats.a11y
                                    .imagesWithoutAlt === 1
                                    ? ''
                                    : 's'} missing alt attribute (WCAG 1.1.1)
                                </div>
                              {:else if budget.label === 'ARIA Usage'}
                                {#each stats.a11y.ariaIssues.slice(0, 5) as ai (ai.tag + ai.issue)}
                                  <div class="truncate text-amber-500">
                                    <span class="font-mono">&lt;{ai.tag}&gt;</span>
                                    {ai.issue}
                                  </div>
                                {/each}
                                {#if stats.a11y.ariaIssues.length > 5}
                                  <span class="text-muted-foreground/50"
                                    >…and {stats.a11y.ariaIssues.length - 5} more</span
                                  >
                                {/if}
                              {:else if budget.label === 'SVG Labels'}
                                <div class="text-amber-500">
                                  {stats.a11y.svgsWithoutLabel} &lt;svg&gt; element{stats.a11y
                                    .svgsWithoutLabel === 1
                                    ? ''
                                    : 's'} missing aria-label, &lt;title&gt;, or role="presentation"
                                </div>
                              {:else if budget.label === 'Motion Safety'}
                                <div class="text-amber-500">
                                  {stats.a11y.animatedElementCount} animated element{stats.a11y
                                    .animatedElementCount === 1
                                    ? ''
                                    : 's'} — no prefers-reduced-motion override detected in stylesheets
                                </div>
                              {:else if budget.label === 'Headings'}
                                <div class="space-y-0">
                                  {#each stats.a11y.headings.slice(0, 6) as heading (heading.text + heading.level)}
                                    <div
                                      class="flex items-center gap-1"
                                      style="padding-left: {(heading.level - 1) * 8}px"
                                    >
                                      <span
                                        class={cn(
                                          'font-mono font-medium',
                                          stats.a11y.headingSkipsLevel
                                            ? 'text-amber-500'
                                            : 'text-muted-foreground',
                                        )}
                                      >
                                        h{heading.level}
                                      </span>
                                      <span class="truncate text-muted-foreground"
                                        >{heading.text}</span
                                      >
                                    </div>
                                  {/each}
                                  {#if stats.a11y.headings.length > 6}
                                    <span class="text-muted-foreground/50"
                                      >…and {stats.a11y.headings.length - 6} more</span
                                    >
                                  {/if}
                                </div>
                              {/if}
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>{/if}
              </div>

              <!-- Web Vitals section -->
              <div class="border-t px-3 py-2">
                <button
                  type="button"
                  class="flex w-full items-center gap-1"
                  aria-expanded={statsVitalsOpen}
                  aria-controls="stats-vitals"
                  onclick={() => (statsVitalsOpen = !statsVitalsOpen)}
                >
                  {#if statsVitalsOpen}<ChevronDown
                      class="size-3 text-muted-foreground"
                    />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                  <h4 class="text-xs font-semibold">Web Vitals</h4>
                </button>
                {#if statsVitalsOpen}<div id="stats-vitals" transition:slide={{ duration: 150 }}>
                    <p class="mb-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      {#if stats.vitals.supported}
                        Component-scoped performance vitals via PerformanceObserver.
                      {:else}
                        Browser does not support required PerformanceObserver APIs.
                      {/if}
                    </p>
                    <div class="space-y-1 text-xs">
                      <!-- CLS -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if stats.vitals.supported}
                                    <span
                                      class={cn(
                                        'text-base leading-none',
                                        stats.vitals.clsScore === 0
                                          ? 'text-emerald-500'
                                          : stats.vitals.clsScore <= 0.1
                                            ? 'text-amber-500'
                                            : 'text-red-500',
                                      )}>●</span
                                    >
                                  {:else}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {/if}
                                  <span class="text-muted-foreground">CLS</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {stats.vitals.supported ? stats.vitals.clsScore : 'Unsupported'}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Cumulative Layout Shift — measures visual stability. Layout shifts
                                from elements inside this component.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 0 · 🟡 ≤0.1 · 🔴 >0.1
                              </p>
                              {#if !stats.vitals.supported}
                                <p class="text-[10px] text-primary-foreground/50">
                                  Requires layout-shift PerformanceObserver (Chrome/Edge).
                                </p>
                              {/if}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      {#if stats.vitals.clsSources.length > 0}
                        <div class="ml-6 space-y-0.5">
                          {#each stats.vitals.clsSources as src (src.selector)}
                            <div class="truncate font-mono text-[10px] text-amber-500/80">
                              {src.selector}
                            </div>
                          {/each}
                        </div>
                      {/if}

                      <!-- Long Tasks -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if stats.vitals.supported}
                                    <span
                                      class={cn(
                                        'text-base leading-none',
                                        stats.vitals.longTaskCount === 0
                                          ? 'text-emerald-500'
                                          : stats.vitals.longTaskCount <= 2
                                            ? 'text-amber-500'
                                            : 'text-red-500',
                                      )}>●</span
                                    >
                                  {:else}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {/if}
                                  <span class="text-muted-foreground">Long Tasks</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if !stats.vitals.supported}
                                    Unsupported
                                  {:else if stats.vitals.longTaskCount === 0}
                                    None
                                  {:else}
                                    {stats.vitals.longTaskCount} · {stats.vitals.worstLongTaskMs}ms
                                    peak
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Main-thread tasks exceeding 50ms during component mount. Blocks user
                                interaction.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 0 · 🟡 ≤2 · 🔴 >2
                              </p>
                              {#if !stats.vitals.supported}
                                <p class="text-[10px] text-primary-foreground/50">
                                  Requires longtask PerformanceObserver (Chrome/Edge).
                                </p>
                              {/if}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>

                      <!-- Paint Timing -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if !stats.vitals.supported}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.paintTimeMs < 0}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.paintTimeMs <= 100}
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                  {:else if stats.vitals.paintTimeMs <= 300}
                                    <span class="text-base leading-none text-amber-500">●</span>
                                  {:else}
                                    <span class="text-base leading-none text-red-500">●</span>
                                  {/if}
                                  <span class="text-muted-foreground">First Paint</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if !stats.vitals.supported}
                                    Unsupported
                                  {:else if stats.vitals.paintTimeMs < 0}
                                    Before mount
                                  {:else}
                                    {stats.vitals.paintTimeMs}ms
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                First Paint — when the browser first renders any pixel. "Before
                                mount" means the page already painted before this component mounted.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 ≤100ms · 🟡 ≤300ms · 🔴 >300ms
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if !stats.vitals.supported}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.fcpTimeMs < 0}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.fcpTimeMs <= 100}
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                  {:else if stats.vitals.fcpTimeMs <= 300}
                                    <span class="text-base leading-none text-amber-500">●</span>
                                  {:else}
                                    <span class="text-base leading-none text-red-500">●</span>
                                  {/if}
                                  <span class="text-muted-foreground">First Contentful Paint</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if !stats.vitals.supported}
                                    Unsupported
                                  {:else if stats.vitals.fcpTimeMs < 0}
                                    Before mount
                                  {:else}
                                    {stats.vitals.fcpTimeMs}ms
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                First Contentful Paint — when the browser first renders text, image,
                                or SVG content. "Before mount" means content already painted before
                                this component mounted.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 ≤100ms · 🟡 ≤300ms · 🔴 >300ms
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>

                      <!-- LCP -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if !stats.vitals.supported}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.isLcpComponent && stats.vitals.lcpTimeMs <= 2500}
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                  {:else if stats.vitals.isLcpComponent && stats.vitals.lcpTimeMs <= 4000}
                                    <span class="text-base leading-none text-amber-500">●</span>
                                  {:else if stats.vitals.isLcpComponent}
                                    <span class="text-base leading-none text-red-500">●</span>
                                  {:else}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {/if}
                                  <span class="text-muted-foreground">Largest Contentful Paint</span
                                  >
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if !stats.vitals.supported}
                                    Unsupported
                                  {:else if stats.vitals.isLcpComponent}
                                    {stats.vitals.lcpTimeMs}ms
                                  {:else}
                                    —
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Largest Contentful Paint — identifies whether this component
                                contains the page's largest visible content element. "—" means
                                another component holds the LCP element.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 ≤2500ms · 🟡 ≤4000ms · 🔴 >4000ms
                              </p>
                              {#if stats.vitals.isLcpComponent && stats.vitals.lcpElement}
                                <p class="font-mono text-[10px] text-primary-foreground/70">
                                  {stats.vitals.lcpElement}
                                </p>
                              {/if}
                              {#if !stats.vitals.supported}
                                <p class="text-[10px] text-primary-foreground/50">
                                  Requires largest-contentful-paint PerformanceObserver.
                                </p>
                              {/if}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>

                      <!-- FID -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if !stats.vitals.supported}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.fidMs < 0}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.fidMs <= 100}
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                  {:else if stats.vitals.fidMs <= 300}
                                    <span class="text-base leading-none text-amber-500">●</span>
                                  {:else}
                                    <span class="text-base leading-none text-red-500">●</span>
                                  {/if}
                                  <span class="text-muted-foreground">First Input Delay</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if !stats.vitals.supported}
                                    Unsupported
                                  {:else if stats.vitals.fidMs < 0}
                                    Waiting
                                  {:else}
                                    {stats.vitals.fidMs}ms
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                First Input Delay — time between the user's first interaction
                                (click, tap, key press) and the browser's response. "Waiting" means
                                no interaction has occurred yet.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 ≤100ms · 🟡 ≤300ms · 🔴 >300ms
                              </p>
                              {#if !stats.vitals.supported}
                                <p class="text-[10px] text-primary-foreground/50">
                                  Requires first-input PerformanceObserver (Chrome/Edge).
                                </p>
                              {/if}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>

                      <!-- INP -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if !stats.vitals.supported}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.inpMs < 0}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.inpMs <= 200}
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                  {:else if stats.vitals.inpMs <= 500}
                                    <span class="text-base leading-none text-amber-500">●</span>
                                  {:else}
                                    <span class="text-base leading-none text-red-500">●</span>
                                  {/if}
                                  <span class="text-muted-foreground">INP</span>
                                  <span
                                    class="rounded border px-1 text-[8px] leading-tight text-muted-foreground/60"
                                    >Core</span
                                  >
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    !stats.vitals.supported && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if !stats.vitals.supported}
                                    Unsupported
                                  {:else if stats.vitals.inpMs < 0}
                                    Waiting
                                  {:else}
                                    {stats.vitals.inpMs}ms
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Interaction to Next Paint — measures the worst interaction latency
                                (click, tap, key press to visual update). Replaced FID as a Core Web
                                Vital in March 2024.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 ≤200ms · 🟡 ≤500ms · 🔴 >500ms
                              </p>
                              {#if !stats.vitals.supported}
                                <p class="text-[10px] text-primary-foreground/50">
                                  Requires event PerformanceObserver (Chrome/Edge).
                                </p>
                              {/if}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>

                      <!-- TTFB -->
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  {#if stats.vitals.ttfbMs < 0}
                                    <span class="text-base leading-none text-muted-foreground/40"
                                      >●</span
                                    >
                                  {:else if stats.vitals.ttfbMs <= 800}
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                  {:else if stats.vitals.ttfbMs <= 1800}
                                    <span class="text-base leading-none text-amber-500">●</span>
                                  {:else}
                                    <span class="text-base leading-none text-red-500">●</span>
                                  {/if}
                                  <span class="text-muted-foreground">TTFB</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    stats.vitals.ttfbMs < 0 && 'text-muted-foreground/50',
                                  )}
                                >
                                  {#if stats.vitals.ttfbMs < 0}
                                    Unavailable
                                  {:else}
                                    {stats.vitals.ttfbMs}ms
                                  {/if}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Time to First Byte — time from the page request until the first byte
                                of the response. This is a page-level metric (same for all
                                components).
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 ≤800ms · 🟡 ≤1800ms · 🔴 >1800ms
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </div>
                  </div>{/if}
              </div>

              <!-- DOM section -->
              <div class="border-t px-3 py-2">
                <button
                  type="button"
                  class="flex w-full items-center gap-1"
                  aria-expanded={statsDomOpen}
                  aria-controls="stats-dom"
                  onclick={() => (statsDomOpen = !statsDomOpen)}
                >
                  {#if statsDomOpen}<ChevronDown
                      class="size-3 text-muted-foreground"
                    />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                  <h4 class="text-xs font-semibold">DOM Structure</h4>
                </button>
                {#if statsDomOpen}<div id="stats-dom" transition:slide={{ duration: 150 }}>
                    <p class="mb-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      Element count and nesting depth of the rendered component.
                    </p>
                    <div class="grid grid-cols-4 gap-2 text-xs">
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="cursor-help">
                                <span class="text-muted-foreground">Nodes</span>
                                <div class="font-mono font-medium">{stats.nodeCount}</div>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            Total DOM elements inside the component
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="cursor-help">
                                <span class="text-muted-foreground">Depth</span>
                                <div class="font-mono font-medium">{stats.domDepth}</div>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            Maximum nesting depth of the DOM tree
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="cursor-help">
                                <span class="text-muted-foreground">Text</span>
                                <div class="font-mono font-medium">{stats.textNodeCount}</div>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            Number of text nodes (visible text content)
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="cursor-help">
                                <span class="text-muted-foreground">Events</span>
                                <div class="font-mono font-medium">{stats.eventListenerCount}</div>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            Elements with inline event handlers
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </div>
                  </div>{/if}
              </div>

              <!-- Memory (Chrome only) -->
              {#if stats.memoryDeltaBytes >= 0}
                <div class="border-t px-3 py-2">
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tipProps })}
                          <button
                            {...tipProps}
                            type="button"
                            class="flex w-full cursor-help items-center gap-1"
                            aria-expanded={statsMemoryOpen}
                            onclick={() => (statsMemoryOpen = !statsMemoryOpen)}
                          >
                            {#if statsMemoryOpen}<ChevronDown
                                class="size-3 text-muted-foreground"
                              />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                            <h4 class="text-xs font-semibold">Memory</h4>
                            <span class="ml-auto font-mono text-xs font-medium"
                              >{(stats.memoryDeltaBytes / 1_048_576).toFixed(1)} MB</span
                            >
                          </button>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="left" sideOffset={4} class="max-w-[18rem] p-0">
                        <div class="space-y-1 px-3 py-2">
                          <p class="text-xs text-primary-foreground">
                            Total JS heap size for the entire page, not scoped to this component.
                            Browsers cannot isolate memory per component.
                          </p>
                          <p class="text-[10px] text-primary-foreground/70">
                            Measured via <span class="font-mono">performance.memory</span> (Chrome/Edge
                            only). Compare values across components to spot outliers.
                          </p>
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </div>
              {/if}

              <!-- Accessibility section -->
              <div class="border-t px-3 py-2">
                <button
                  type="button"
                  class="flex w-full items-center gap-1"
                  aria-expanded={statsA11yOpen}
                  aria-controls="stats-a11y"
                  onclick={() => (statsA11yOpen = !statsA11yOpen)}
                >
                  {#if statsA11yOpen}<ChevronDown
                      class="size-3 text-muted-foreground"
                    />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                  <h4 class="text-xs font-semibold">Accessibility</h4>
                </button>
                {#if statsA11yOpen}<div id="stats-a11y" transition:slide={{ duration: 150 }}>
                    <p class="mb-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      Interactive elements, labels, landmarks, and focus order.
                    </p>
                    <div class="space-y-1 text-xs">
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  <span
                                    class={cn(
                                      'text-base leading-none',
                                      stats.a11y.focusableCount === stats.a11y.labeledCount
                                        ? 'text-emerald-500'
                                        : stats.a11y.unlabeled.length <= 2
                                          ? 'text-amber-500'
                                          : 'text-red-500',
                                    )}>●</span
                                  >
                                  <span class="text-muted-foreground">Labels</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    stats.a11y.labeledCount < stats.a11y.focusableCount &&
                                      'text-amber-500',
                                  )}
                                >
                                  {stats.a11y.labeledCount}/{stats.a11y.focusableCount}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={4} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Interactive elements with accessible labels (aria-label,
                                aria-labelledby, title, or associated label) out of total focusable
                                elements.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 All labeled · 🟡 ≤2 missing · 🔴 >2 missing
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="flex cursor-help items-center justify-between"
                              >
                                <div class="flex items-center gap-2">
                                  <span
                                    class={cn(
                                      'text-base leading-none',
                                      stats.a11y.focusOrderIssues.length === 0
                                        ? 'text-emerald-500'
                                        : 'text-red-500',
                                    )}>●</span
                                  >
                                  <span class="text-muted-foreground">Focus Order</span>
                                </div>
                                <span
                                  class={cn(
                                    'font-mono font-medium',
                                    stats.a11y.focusOrderIssues.length > 0 && 'text-red-500',
                                  )}
                                >
                                  {stats.a11y.focusOrderIssues.length === 0
                                    ? 'OK'
                                    : `${stats.a11y.focusOrderIssues.length} issues`}
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={4} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Elements with positive tabindex disrupt natural tab order. Use
                                tabindex="0" or "-1" instead.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 None · 🔴 Has positive tabindex
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <div class="grid grid-cols-3 gap-2 pt-1">
                        <Tooltip.Provider>
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: tipProps })}
                                <div {...tipProps} class="cursor-help">
                                  <span class="text-muted-foreground">Buttons</span>
                                  <div class="font-mono font-medium">{stats.a11y.buttonCount}</div>
                                </div>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="bottom" sideOffset={4}>
                              Button elements found in the component
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                        <Tooltip.Provider>
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: tipProps })}
                                <div {...tipProps} class="cursor-help">
                                  <span class="text-muted-foreground">Links</span>
                                  <div class="font-mono font-medium">{stats.a11y.linkCount}</div>
                                </div>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="bottom" sideOffset={4}>
                              Anchor/link elements found in the component
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                        <Tooltip.Provider>
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: tipProps })}
                                <div {...tipProps} class="cursor-help">
                                  <span class="text-muted-foreground">Inputs</span>
                                  <div class="font-mono font-medium">{stats.a11y.inputCount}</div>
                                </div>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="bottom" sideOffset={4}>
                              Form input elements found in the component
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </div>
                    </div>

                    <!-- Roles -->
                    {#if stats.a11y.roles.length > 0}
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="mt-1.5 cursor-help">
                                <span class="text-[10px] text-muted-foreground">ARIA Roles: </span>
                                <span class="font-mono text-[10px]"
                                  >{stats.a11y.roles.join(', ')}</span
                                >
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            Unique ARIA role attributes found in the component
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    {/if}

                    <!-- Landmarks -->
                    {#if stats.a11y.landmarks.length > 0}
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="mt-1 cursor-help">
                                <span class="text-[10px] text-muted-foreground">Landmarks: </span>
                                <span class="font-mono text-[10px]"
                                  >{stats.a11y.landmarks.join(', ')}</span
                                >
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            Landmark regions (main, nav, header, footer, aside) for screen reader
                            navigation
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    {/if}

                    <!-- Headings -->
                    {#if stats.a11y.headings.length > 0}
                      <div class="mt-1.5">
                        <Tooltip.Provider>
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: tipProps })}
                                <div
                                  {...tipProps}
                                  class="flex cursor-help items-center justify-between"
                                >
                                  <div class="flex items-center gap-2">
                                    <span
                                      class={cn(
                                        'text-base leading-none',
                                        stats.a11y.headingSkipsLevel
                                          ? 'text-amber-500'
                                          : 'text-emerald-500',
                                      )}>●</span
                                    >
                                    <span class="text-[10px] font-medium text-muted-foreground"
                                      >Headings ({stats.a11y.headings.length})</span
                                    >
                                  </div>
                                  <span
                                    class={cn(
                                      'font-mono text-[10px] font-medium',
                                      stats.a11y.headingSkipsLevel
                                        ? 'text-amber-500'
                                        : 'text-emerald-500',
                                    )}
                                  >
                                    {stats.a11y.headingSkipsLevel ? 'Skips levels' : 'Sequential'}
                                  </span>
                                </div>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="bottom" sideOffset={4} class="max-w-[16rem] p-0">
                              <div class="space-y-1 px-3 py-2">
                                <p class="text-xs text-primary-foreground">
                                  Heading hierarchy should be sequential (h1 → h2 → h3). Skipping
                                  levels confuses screen readers.
                                </p>
                                <p class="font-mono text-[10px] text-primary-foreground/70">
                                  🟢 Sequential · 🟡 Skips levels
                                </p>
                              </div>
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                        <div class="ml-6 mt-0.5 space-y-0">
                          {#each stats.a11y.headings.slice(0, 5) as heading (heading.text + heading.level)}
                            <div
                              class="flex items-center gap-1 text-[10px]"
                              style="padding-left: {(heading.level - 1) * 8}px"
                            >
                              <span
                                class={cn(
                                  'font-mono font-medium',
                                  stats.a11y.headingSkipsLevel
                                    ? 'text-amber-500'
                                    : 'text-muted-foreground',
                                )}
                              >
                                h{heading.level}
                              </span>
                              <span class="truncate text-muted-foreground">{heading.text}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <!-- Unlabeled elements -->
                    {#if stats.a11y.unlabeled.length > 0}
                      <div class="mt-1.5 rounded bg-red-500/10 px-2 py-1">
                        <span class="text-[10px] font-medium text-red-500">
                          {stats.a11y.unlabeled.length} unlabeled interactive element{stats.a11y
                            .unlabeled.length === 1
                            ? ''
                            : 's'}
                        </span>
                        {#each stats.a11y.unlabeled.slice(0, 3) as el (el.tag + el.classes)}
                          <div class="truncate font-mono text-[10px] text-red-400">
                            &lt;{el.tag}{el.classes ? ` class="${el.classes}"` : ''}&gt;
                            {#if el.parentContext}
                              <span class="text-red-400/60"> in {el.parentContext}</span>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- Focus order issues -->
                    {#if stats.a11y.focusOrderIssues.length > 0}
                      <div class="mt-1.5 rounded bg-red-500/10 px-2 py-1">
                        <span class="text-[10px] font-medium text-red-500">
                          {stats.a11y.focusOrderIssues.length} positive tabindex (anti-pattern)
                        </span>
                        {#each stats.a11y.focusOrderIssues.slice(0, 3) as issue (issue.tag + issue.tabindex)}
                          <div class="truncate font-mono text-[10px] text-red-400">
                            &lt;{issue.tag} tabindex="{issue.tabindex}"&gt; {issue.text}
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- Contrast issues -->
                    {#if stats.a11y.contrastIssues.length > 0}
                      <div class="mt-1.5 rounded bg-amber-500/10 px-2 py-1">
                        <span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {stats.a11y.contrastIssues.length} contrast issue{stats.a11y
                            .contrastIssues.length === 1
                            ? ''
                            : 's'} (WCAG AA)
                        </span>
                        {#each stats.a11y.contrastIssues.slice(0, 3) as ci (ci.tag + ci.text)}
                          <div class="truncate font-mono text-[10px] text-amber-500">
                            &lt;{ci.tag}&gt; {ci.text} — {ci.ratio}:1 (need {ci.required}:1)
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- Images without alt -->
                    {#if stats.a11y.imagesWithoutAlt > 0}
                      <div class="mt-1.5 rounded bg-red-500/10 px-2 py-1">
                        <span class="text-[10px] font-medium text-red-500">
                          {stats.a11y.imagesWithoutAlt} image{stats.a11y.imagesWithoutAlt === 1
                            ? ''
                            : 's'} missing alt text
                        </span>
                      </div>
                    {/if}

                    <!-- ARIA issues -->
                    {#if stats.a11y.ariaIssues.length > 0}
                      <div class="mt-1.5 rounded bg-amber-500/10 px-2 py-1">
                        <span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {stats.a11y.ariaIssues.length} ARIA issue{stats.a11y.ariaIssues.length ===
                          1
                            ? ''
                            : 's'}
                        </span>
                        {#each stats.a11y.ariaIssues.slice(0, 3) as ai (ai.tag + ai.issue)}
                          <div class="truncate text-[10px] text-amber-500">
                            <span class="font-mono">&lt;{ai.tag}&gt;</span>
                            {ai.issue}
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- SVGs without labels -->
                    {#if stats.a11y.svgsWithoutLabel > 0}
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div
                                {...tipProps}
                                class="mt-1.5 flex cursor-help items-center justify-between text-[10px]"
                              >
                                <div class="flex items-center gap-2">
                                  <span class="text-base leading-none text-amber-500">●</span>
                                  <span class="font-medium text-muted-foreground">SVG Labels</span>
                                </div>
                                <span class="font-mono font-medium text-amber-500">
                                  {stats.a11y.svgsWithoutLabel} missing
                                </span>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                SVGs without aria-label, &lt;title&gt;, or role="presentation".
                                Unlabeled SVGs are invisible to screen readers.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 0 · 🟡 &gt;0
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    {/if}

                    <!-- Animations / Motion -->
                    {#if stats.a11y.animatedElementCount > 0}
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="mt-1.5 cursor-help">
                                <div class="flex items-center justify-between text-[10px]">
                                  <div class="flex items-center gap-2">
                                    <span
                                      class={cn(
                                        'text-base leading-none',
                                        stats.a11y.hasReducedMotionOverride
                                          ? 'text-emerald-500'
                                          : 'text-amber-500',
                                      )}>●</span
                                    >
                                    <span class="font-medium text-muted-foreground">Animations</span
                                    >
                                  </div>
                                  <span
                                    class={cn(
                                      'font-mono font-medium',
                                      stats.a11y.hasReducedMotionOverride
                                        ? 'text-emerald-500'
                                        : 'text-amber-500',
                                    )}
                                  >
                                    {stats.a11y.animatedElementCount} element{stats.a11y
                                      .animatedElementCount === 1
                                      ? ''
                                      : 's'}
                                  </span>
                                </div>
                                <div class="ml-6 text-[10px] text-muted-foreground">
                                  {stats.a11y.hasReducedMotionOverride
                                    ? '✓ prefers-reduced-motion override detected'
                                    : '⚠ No prefers-reduced-motion override found'}
                                </div>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                CSS animations or transitions detected. Components with motion
                                should include a prefers-reduced-motion media query for users with
                                vestibular disorders.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                🟢 Has override · 🟡 No override
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    {/if}

                    <!-- Tab Order (first 10 elements) -->
                    {#if stats.a11y.tabOrder.length > 0}
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <div {...tipProps} class="mt-1.5 cursor-help">
                                <div class="flex items-center justify-between text-[10px]">
                                  <div class="flex items-center gap-2">
                                    <span class="text-base leading-none text-emerald-500">●</span>
                                    <span class="font-medium text-muted-foreground">Tab Order</span>
                                  </div>
                                  <span class="font-mono font-medium text-muted-foreground">
                                    {stats.a11y.tabOrder.length} element{stats.a11y.tabOrder
                                      .length === 1
                                      ? ''
                                      : 's'}
                                  </span>
                                </div>
                              </div>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
                            <div class="space-y-1 px-3 py-2">
                              <p class="text-xs text-primary-foreground">
                                Focusable elements in keyboard navigation order. Elements with
                                positive tabindex (shown in red) disrupt natural focus order.
                              </p>
                              <p class="font-mono text-[10px] text-primary-foreground/70">
                                Tab order follows DOM order + tabindex sorting
                              </p>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <div class="ml-6 mt-0.5 space-y-0">
                        {#each stats.a11y.tabOrder.slice(0, 10) as entry, i (entry.tag + entry.text + i)}
                          <div class="flex items-center gap-1.5 text-[10px]">
                            <span class="font-mono text-muted-foreground/50">{i + 1}.</span>
                            <span
                              class={cn(
                                'font-mono',
                                entry.tabindex > 0 ? 'text-red-400' : 'text-muted-foreground',
                              )}>&lt;{entry.tag}&gt;</span
                            >
                            {#if entry.text}
                              <span class="truncate text-muted-foreground/60">{entry.text}</span>
                            {/if}
                          </div>
                        {/each}
                        {#if stats.a11y.tabOrder.length > 10}
                          <span class="text-[10px] text-muted-foreground/50"
                            >…and {stats.a11y.tabOrder.length - 10} more</span
                          >
                        {/if}
                      </div>
                    {/if}
                  </div>{/if}
              </div>

              <!-- Console messages -->
              {#if stats.consoleMessages.length > 0}
                <div class="border-t px-3 py-2">
                  <button
                    type="button"
                    class="flex w-full items-center gap-1"
                    aria-expanded={statsConsoleOpen}
                    aria-controls="stats-console"
                    onclick={() => (statsConsoleOpen = !statsConsoleOpen)}
                  >
                    {#if statsConsoleOpen}<ChevronDown
                        class="size-3 text-muted-foreground"
                      />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                    <h4 class="text-xs font-semibold">Console ({stats.consoleMessages.length})</h4>
                  </button>
                  {#if statsConsoleOpen}<div
                      id="stats-console"
                      transition:slide={{ duration: 150 }}
                    >
                      <p class="mb-1 mt-0.5 text-[10px] text-muted-foreground">
                        Warnings and errors logged during component mount.
                      </p>
                      <div class="max-h-20 space-y-0.5 overflow-auto">
                        {#each stats.consoleMessages.slice(0, 5) as msg (msg.message)}
                          <div class="flex items-start gap-1.5 text-[10px]">
                            <span class={msg.level === 'error' ? 'text-red-500' : 'text-amber-500'}>
                              {msg.level === 'error' ? '✕' : '⚠'}
                            </span>
                            <span class="truncate text-muted-foreground">{msg.message}</span>
                          </div>
                        {/each}
                        {#if stats.consoleMessages.length > 5}
                          <span class="text-[10px] text-muted-foreground/60"
                            >…and {stats.consoleMessages.length - 5} more</span
                          >
                        {/if}
                      </div>
                    </div>{/if}
                </div>
              {/if}

              <!-- Lifecycle flags -->
              {#if stats.hasAsyncContent}
                <div class="border-t px-3 py-1.5">
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tipProps })}
                          <span
                            {...tipProps}
                            class="inline-flex cursor-help items-center gap-1 text-[10px] text-muted-foreground"
                          >
                            <Zap class="size-3" aria-hidden="true" />
                            Async content detected
                          </span>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="bottom" sideOffset={4}>
                        The DOM changed after initial mount — the component loads content
                        asynchronously.
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </div>
              {/if}

              <!-- Re-render timings -->
              {#if stats.reRenderTimings.length > 0}
                <div class="border-t px-3 py-2">
                  <button
                    type="button"
                    class="flex w-full items-center gap-1"
                    aria-expanded={statsReRenderOpen}
                    aria-controls="stats-rerender"
                    onclick={() => (statsReRenderOpen = !statsReRenderOpen)}
                  >
                    {#if statsReRenderOpen}<ChevronDown
                        class="size-3 text-muted-foreground"
                      />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                    <h4 class="text-xs font-semibold">Re-render Timings</h4>
                    <span class="ml-auto font-mono text-xs text-muted-foreground"
                      >{stats.reRenderTimings.length}</span
                    >
                  </button>
                  {#if statsReRenderOpen}<div
                      id="stats-rerender"
                      transition:slide={{ duration: 150 }}
                    >
                      <div class="mt-1 flex flex-wrap gap-1">
                        {#each stats.reRenderTimings.slice(0, 8) as timing, i (i)}
                          <span
                            class={cn(
                              'rounded px-1 py-0.5 font-mono text-[10px]',
                              timing > 50
                                ? 'bg-red-500/10 text-red-500'
                                : timing > 16
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {timing}ms
                          </span>
                        {/each}
                        {#if stats.reRenderTimings.length > 8}
                          <span class="text-[10px] text-muted-foreground/50"
                            >+{stats.reRenderTimings.length - 8}</span
                          >
                        {/if}
                      </div>
                    </div>{/if}
                </div>
              {/if}

              <!-- Prop coverage -->
              <div class="border-t px-3 py-2">
                <Tooltip.Provider>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tipProps })}
                        <button
                          {...tipProps}
                          type="button"
                          class="flex w-full cursor-help items-center gap-1"
                          aria-expanded={statsPropCoverageOpen}
                          aria-controls="stats-props"
                          onclick={() => (statsPropCoverageOpen = !statsPropCoverageOpen)}
                        >
                          {#if statsPropCoverageOpen}<ChevronDown
                              class="size-3 text-muted-foreground"
                            />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
                          <h4 class="text-xs font-semibold">Prop Coverage</h4>
                          <span class="ml-auto font-mono text-xs text-muted-foreground"
                            >{stats.propsWithDefaults}/{stats.propsTotal}</span
                          >
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="left" sideOffset={4}>
                      Ratio of props with default values. Higher coverage = more usable without
                      configuration.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
                {#if statsPropCoverageOpen}<div
                    id="stats-props"
                    transition:slide={{ duration: 150 }}
                  >
                    <div class="mt-1 flex items-center gap-2 text-xs">
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-emerald-500 transition-all"
                          style="width: {stats.propsTotal > 0
                            ? Math.round((stats.propsWithDefaults / stats.propsTotal) * 100)
                            : 0}%"
                        ></div>
                      </div>
                      <span class="font-mono text-muted-foreground"
                        >{stats.propsWithDefaults}/{stats.propsTotal}</span
                      >
                    </div>
                    {#if propsMeta.filter((p: PropMeta): Bool => p.default === '').length > 0}
                      <div class="mt-1.5 space-y-1">
                        {#if propsMeta.filter((p: PropMeta): Bool => p.default === '' && !p.optional).length > 0}
                          <div>
                            <span class="text-[10px] font-medium text-red-500"
                              >Required — no default:</span
                            >
                            <div class="mt-0.5 flex flex-wrap gap-1">
                              {#each propsMeta.filter((p: PropMeta): Bool => p.default === '' && !p.optional) as prop (prop.name)}
                                <span
                                  class="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-600 dark:text-red-400"
                                  >{prop.name}</span
                                >
                              {/each}
                            </div>
                          </div>
                        {/if}
                        {#if propsMeta.filter((p: PropMeta): Bool => p.default === '' && !!p.optional).length > 0}
                          <div>
                            <span class="text-[10px] font-medium text-amber-500"
                              >Optional — no default:</span
                            >
                            <div class="mt-0.5 flex flex-wrap gap-1">
                              {#each propsMeta.filter((p: PropMeta): Bool => p.default === '' && !!p.optional) as prop (prop.name)}
                                <span
                                  class="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400"
                                  >{prop.name}</span
                                >
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>{/if}
              </div>
            </Popover.Content>
          </Popover.Root>
        {/if}
        {#if tagName || codeText}
          <Tooltip.Provider>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    type="button"
                    {...tipProps}
                    class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onclick={() => toggleCode(cardKey)}
                    aria-expanded={Boolean(openCards[cardKey])}
                  >
                    <Code class="size-3.5" aria-hidden="true" />
                    <ChevronDown
                      class={cn('size-3 transition-transform', openCards[cardKey] && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>
                {openCards[cardKey] ? 'Collapse code' : 'Expand code'}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
          <CopyButton
            text={codeText ?? snippet}
            label="Copy code"
            class="size-7 [&_svg]:size-3.5"
          />
        {/if}
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tipProps })}
                <button
                  type="button"
                  {...tipProps}
                  class={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                    (cardConsoleOpen[cardKey] ?? false)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onclick={() => {
                    cardConsoleOpen[cardKey] = !cardConsoleOpen[cardKey];
                  }}
                  aria-expanded={Boolean(cardConsoleOpen[cardKey])}
                >
                  <Terminal class="size-3.5" aria-hidden="true" />
                  {#if (cardConsoleLogs[cardKey] ?? []).length > 0}
                    <span
                      class={cn(
                        'inline-flex h-[0.875rem] min-w-[1.25rem] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold leading-none',
                        (cardConsoleLogs[cardKey] ?? []).some((l) => l.level === 'error')
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-muted-foreground/20 text-muted-foreground',
                      )}
                    >
                      {(cardConsoleLogs[cardKey] ?? []).length > 99
                        ? '99+'
                        : (cardConsoleLogs[cardKey] ?? []).length}
                    </span>
                  {/if}
                  <ChevronDown
                    class={cn(
                      'size-3 transition-transform',
                      cardConsoleOpen[cardKey] && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="top" sideOffset={4}>
              {cardConsoleOpen[cardKey] ? 'Collapse console' : 'Expand console'}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <DropdownMenu.Root
          open={cardDropdownOpen[cardKey] ?? false}
          onOpenChange={(o) => {
            cardDropdownOpen[cardKey] = o;
            if (!o) {
              linkCopied = false;
              exportFeedback = '';
              exportInProgress = '';
            }
          }}
        >
          <DropdownMenu.Trigger
            class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <EllipsisVertical class="size-3.5" aria-hidden="true" />
            <span class="sr-only">Card options</span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="min-w-56">
            {#if componentName}
              <DropdownMenu.Item onclick={() => openIsolation(cardKey, variantKey, variantOption)}>
                <ExternalLink class="size-4" />
                Open in new tab
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  copyIsolationUrl(cardKey, variantKey, variantOption);
                }}
              >
                {#if linkCopied}
                  <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  Copied!
                {:else}
                  <Link class="size-4" />
                  Copy link
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
            {/if}
            <LensCardSettingsMenu
              active={makeActiveSettings(cardKey)}
              onSetting={(name, value) => handleCardSetting(cardKey, name, value)}
              onExport={(formatId) => handleExport(cardKey, formatId)}
              onReset={() => resetCard(cardKey)}
              {exportFeedback}
              {exportInProgress}
              showReset={false}
            />
            <!-- Browser & Device Preview submenu -->
            {#if componentName}
              <DropdownMenu.Sub
                onOpenChange={(open) => {
                  if (open) {
                    browserSearchQuery = '';
                    fetchPlaywrightDevices();
                    fetchIosDevices();
                    fetchAndroidDevices();
                    fetchEngineStatus();
                    /* Poll engine status every 5s while menu is open */
                    if (statusPollInterval) clearInterval(statusPollInterval);
                    statusPollInterval = setInterval(() => {
                      fetchEngineStatus();
                    }, 5000);
                  } else {
                    /* Stop polling when menu closes */
                    if (statusPollInterval) {
                      clearInterval(statusPollInterval);
                      statusPollInterval = null;
                    }
                  }
                }}
              >
                <DropdownMenu.SubTrigger>
                  <Camera class="size-4" />
                  Browser & Device Preview
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent class="flex max-h-96 w-80 flex-col overflow-hidden">
                  <div class="shrink-0 px-2 pb-1.5 pt-1">
                    <div
                      class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                    >
                      <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Search devices..."
                        class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        bind:value={browserSearchQuery}
                        onkeydown={(e) => e.stopPropagation()}
                        onkeyup={(e) => e.stopPropagation()}
                        onkeypress={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1" use:lockHeight>
                    <!-- Source selector (Playwright / iOS Simulator / Android Emulator) -->
                    <DropdownMenu.Label class="text-xs">Source</DropdownMenu.Label>
                    {#each [{ id: 'playwright' as ScreenshotSource, label: 'Playwright' as Str, desc: 'Headless browsers' as Str }, { id: 'ios-simulator' as ScreenshotSource, label: 'iOS Simulator' as Str, desc: 'Real Safari' as Str }, { id: 'android-emulator' as ScreenshotSource, label: 'Android Emulator' as Str, desc: 'Real Chrome' as Str }] as src (src.id)}
                      <DropdownMenu.Item
                        class={cn(
                          src.id !== 'playwright' &&
                            !engineStatus[src.id]?.available &&
                            'opacity-50',
                        )}
                        onSelect={(e) => {
                          e.preventDefault();
                          cardScreenSource[cardKey] = src.id;
                        }}
                      >
                        <Check
                          class={cn(
                            'size-4',
                            (cardScreenSource[cardKey] || 'playwright') !== src.id && 'opacity-0',
                          )}
                        />
                        {#if src.id === 'playwright'}
                          <Globe class="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {:else if src.id === 'ios-simulator'}
                          <Apple class="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {:else}
                          <Bot class="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {/if}
                        <span class="flex-1">{src.label}</span>
                        {#if src.id !== 'playwright' && !engineStatus[src.id]?.available}
                          <span class="text-[9px] font-medium text-amber-600">Setup&nbsp;→</span>
                        {:else}
                          <span class="text-[9px] text-muted-foreground/60">{src.desc}</span>
                        {/if}
                        {#if src.id !== 'playwright'}
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: tipProps })}
                                <span
                                  {...tipProps}
                                  class={cn(
                                    'ml-1 inline-block size-1.5 rounded-full cursor-help',
                                    engineStatus[src.id]?.available
                                      ? 'bg-emerald-500'
                                      : 'bg-muted-foreground/40',
                                  )}
                                ></span>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="top" sideOffset={4} class="max-w-52">
                              {#if engineStatus[src.id]?.available}
                                Available — engine detected
                              {:else if src.id === 'ios-simulator'}
                                Install Xcode and create simulators via Xcode → Window → Devices and
                                Simulators
                              {:else}
                                Install Android Studio and create AVDs via Tools → Device Manager
                              {/if}
                            </Tooltip.Content>
                          </Tooltip.Root>
                        {/if}
                      </DropdownMenu.Item>
                    {/each}
                    <!-- Summary strip: current configuration at a glance -->
                    {#if true}
                      {@const selSrc = cardScreenSource[cardKey] || 'playwright'}
                      {@const selBrowser = cardScreenBrowser[cardKey] || 'chromium'}
                      {@const selDevice = cardScreenDevice[cardKey] || ''}
                      <div class="flex items-center gap-1.5 px-3 py-1">
                        <span
                          class="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary/80"
                        >
                          {selSrc === 'playwright'
                            ? 'Playwright'
                            : selSrc === 'ios-simulator'
                              ? 'iOS'
                              : 'Android'}
                        </span>
                        {#if selSrc === 'playwright'}
                          <span class="text-[9px] text-muted-foreground">
                            {selBrowser === 'chromium'
                              ? 'Chromium'
                              : selBrowser === 'firefox'
                                ? 'Firefox'
                                : 'WebKit'}
                          </span>
                        {/if}
                        <span class="text-[9px] text-muted-foreground/40">·</span>
                        <span class="max-w-32 truncate text-[9px] text-muted-foreground">
                          {selDevice || 'Default viewport'}
                        </span>
                      </div>
                    {/if}
                    <DropdownMenu.Separator />
                    <!-- Browser engine selector (Playwright only) -->
                    {#if (cardScreenSource[cardKey] || 'playwright') === 'playwright'}
                      <DropdownMenu.Label class="text-xs">Engine</DropdownMenu.Label>
                      {#each [{ id: 'chromium' as Str, label: 'Chromium' as Str }, { id: 'firefox' as Str, label: 'Firefox' as Str }, { id: 'webkit' as Str, label: 'WebKit (Safari)' as Str }] as eng (eng.id)}
                        <DropdownMenu.Item
                          onSelect={(e) => {
                            e.preventDefault();
                            cardScreenBrowser[cardKey] = eng.id;
                          }}
                        >
                          <Check
                            class={cn(
                              'size-4',
                              (cardScreenBrowser[cardKey] || 'chromium') !== eng.id && 'opacity-0',
                            )}
                          />
                          {eng.label}
                        </DropdownMenu.Item>
                      {/each}
                      <DropdownMenu.Separator />
                      <!-- Device selector -->
                      <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                        Device
                        {#if devicesLoaded}
                          <span
                            class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                            >{playwrightDevices.length}</span
                          >
                        {/if}
                      </DropdownMenu.Label>
                      {#if !devicesLoaded}
                        <div class="flex items-center justify-center py-4">
                          <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
                        </div>
                      {:else if filteredPlaywrightDevices.length === 0}
                        <div
                          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                        >
                          <SearchX class="size-5" />
                          <div class="flex flex-col items-center gap-0.5">
                            <p class="text-xs font-medium">No devices found</p>
                            <p class="text-[11px]">Try a different search term</p>
                          </div>
                        </div>
                      {:else}
                        <DropdownMenu.Item
                          onSelect={(e) => {
                            e.preventDefault();
                            cardScreenDevice[cardKey] = '';
                          }}
                        >
                          <Check
                            class={cn(
                              'size-4',
                              (cardScreenDevice[cardKey] || '') !== '' && 'opacity-0',
                            )}
                          />
                          <span class="text-muted-foreground">Default viewport</span>
                        </DropdownMenu.Item>
                        {#if popularPlaywrightDevices.length > 0}
                          <DropdownMenu.Separator />
                          <DropdownMenu.Label class="flex items-center gap-1.5 text-[10px]">
                            <Star class="size-3 text-amber-500" aria-hidden="true" />
                            Popular
                          </DropdownMenu.Label>
                          {#each popularPlaywrightDevices as device (device.name)}
                            <DropdownMenu.Item
                              onSelect={(e) => {
                                e.preventDefault();
                                cardScreenDevice[cardKey] = device.name;
                              }}
                            >
                              <Check
                                class={cn(
                                  'size-4',
                                  (cardScreenDevice[cardKey] || '') !== device.name && 'opacity-0',
                                )}
                              />
                              <span class="flex-1 truncate">{device.name}</span>
                              {#if device.os}
                                <span class="text-[9px] text-muted-foreground/60">{device.os}</span>
                              {/if}
                              <span class="ml-auto text-[10px] text-muted-foreground"
                                >{device.width}×{device.height}</span
                              >
                            </DropdownMenu.Item>
                          {/each}
                        {/if}
                        {#each filteredDeviceCategories as category (category)}
                          <DropdownMenu.Separator />
                          <DropdownMenu.Label class="text-[10px]">{category}</DropdownMenu.Label>
                          {#each filteredPlaywrightDevices.filter((d) => inferDeviceCategory(d.name) === category) as device (device.name)}
                            <DropdownMenu.Item
                              onSelect={(e) => {
                                e.preventDefault();
                                cardScreenDevice[cardKey] = device.name;
                              }}
                            >
                              <Check
                                class={cn(
                                  'size-4',
                                  (cardScreenDevice[cardKey] || '') !== device.name && 'opacity-0',
                                )}
                              />
                              <span class="flex-1 truncate">{device.name}</span>
                              {#if device.os}
                                <span class="text-[9px] text-muted-foreground/60">{device.os}</span>
                              {/if}
                              <span class="ml-auto text-[10px] text-muted-foreground"
                                >{device.width}×{device.height}</span
                              >
                            </DropdownMenu.Item>
                          {/each}
                        {/each}
                      {/if}
                    {:else if (cardScreenSource[cardKey] || 'playwright') === 'ios-simulator'}
                      <!-- iOS Simulator device list -->
                      <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                        iOS Devices
                        {#if iosDevicesLoaded && iosDevices.length > 0}
                          <span
                            class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                            >{iosDevices.length}</span
                          >
                        {/if}
                      </DropdownMenu.Label>
                      {#if !iosDevicesLoaded}
                        <div class="flex items-center justify-center py-4">
                          <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
                        </div>
                      {:else if filteredIosDevices.length === 0}
                        <div
                          class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"
                        >
                          {#if iosDevices.length === 0}
                            <Smartphone class="size-5" />
                            <div class="flex flex-col items-center gap-1 px-4">
                              <p class="text-xs font-medium">No iOS Simulators found</p>
                              <p class="max-w-52 text-[11px] leading-snug">
                                To use real Safari rendering, install Xcode and create simulator
                                devices via <span class="font-medium text-foreground/70"
                                  >Xcode → Window → Devices and Simulators</span
                                >
                              </p>
                            </div>
                          {:else}
                            <SearchX class="size-5" />
                            <div class="flex flex-col items-center gap-0.5">
                              <p class="text-xs font-medium">No devices found</p>
                              <p class="text-[11px]">Try a different search term</p>
                            </div>
                          {/if}
                        </div>
                      {:else}
                        {#each filteredIosDevices as device, idx (idx)}
                          <DropdownMenu.Item
                            onSelect={(e) => {
                              e.preventDefault();
                              cardScreenDevice[cardKey] = (device.name ?? '') as Str;
                            }}
                          >
                            <Check
                              class={cn(
                                'size-4',
                                (cardScreenDevice[cardKey] || '') !==
                                  ((device.name ?? '') as Str) && 'opacity-0',
                              )}
                            />
                            <span class="flex-1 truncate">{device.name ?? 'Unknown'}</span>
                            {#if device.runtimeVersion}
                              <span class="text-[9px] text-muted-foreground/60"
                                >{device.runtimeVersion}</span
                              >
                            {:else if device.os}
                              <span class="text-[9px] text-muted-foreground/60">{device.os}</span>
                            {/if}
                            {#if device.screenWidth && device.screenHeight}
                              <span class="text-[10px] text-muted-foreground"
                                >{device.screenWidth}×{device.screenHeight}</span
                              >
                            {/if}
                            <Tooltip.Root delayDuration={300}>
                              <Tooltip.Trigger>
                                {#snippet child({ props: devTipProps })}
                                  <span
                                    {...devTipProps}
                                    class={cn(
                                      'ml-1 inline-block size-1.5 rounded-full cursor-help',
                                      String(device.state ?? '').toLowerCase() === 'booted'
                                        ? 'bg-emerald-500'
                                        : 'bg-muted-foreground/40',
                                    )}
                                  ></span>
                                {/snippet}
                              </Tooltip.Trigger>
                              <Tooltip.Content side="top" sideOffset={4}>
                                {String(device.state ?? '').toLowerCase() === 'booted'
                                  ? 'Booted — ready to capture'
                                  : 'Shutdown — will boot on capture'}
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </DropdownMenu.Item>
                        {/each}
                      {/if}
                    {:else if (cardScreenSource[cardKey] || 'playwright') === 'android-emulator'}
                      <!-- Android Emulator device list -->
                      <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                        Android Devices
                        {#if androidDevicesLoaded && androidDevices.length > 0}
                          <span
                            class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                            >{androidDevices.length}</span
                          >
                        {/if}
                      </DropdownMenu.Label>
                      {#if !androidDevicesLoaded}
                        <div class="flex items-center justify-center py-4">
                          <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
                        </div>
                      {:else if filteredAndroidDevices.length === 0}
                        <div
                          class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"
                        >
                          {#if androidDevices.length === 0}
                            <Smartphone class="size-5" />
                            <div class="flex flex-col items-center gap-1 px-4">
                              <p class="text-xs font-medium">No Android Emulators found</p>
                              <p class="max-w-52 text-[11px] leading-snug">
                                To use real Chrome rendering, install Android Studio and create AVDs
                                via <span class="font-medium text-foreground/70"
                                  >Tools → Device Manager</span
                                >
                              </p>
                            </div>
                          {:else}
                            <SearchX class="size-5" />
                            <div class="flex flex-col items-center gap-0.5">
                              <p class="text-xs font-medium">No devices found</p>
                              <p class="text-[11px]">Try a different search term</p>
                            </div>
                          {/if}
                        </div>
                      {:else}
                        <!-- Created AVDs -->
                        {@const createdDevices = filteredAndroidDevices.filter(
                          (d) => d.created === true,
                        )}
                        {@const uncreatedDevices = filteredAndroidDevices.filter(
                          (d) => d.created === false,
                        )}
                        {#if createdDevices.length > 0}
                          {#each createdDevices as device, idx (idx)}
                            <DropdownMenu.Item
                              onSelect={(e) => {
                                e.preventDefault();
                                cardScreenDevice[cardKey] = (device.name ?? '') as Str;
                              }}
                            >
                              <Check
                                class={cn(
                                  'size-4',
                                  (cardScreenDevice[cardKey] || '') !==
                                    ((device.name ?? '') as Str) && 'opacity-0',
                                )}
                              />
                              <span class="flex-1 truncate">{device.name ?? 'Unknown'}</span>
                              {#if device.displayTag || device.apiLevel}
                                <span class="text-[9px] text-muted-foreground/60"
                                  >{device.displayTag ? `${device.displayTag} · ` : ''}API {device.apiLevel}</span
                                >
                              {/if}
                              {#if device.width && device.height}
                                <span class="text-[10px] text-muted-foreground"
                                  >{device.width}×{device.height}</span
                                >
                              {/if}
                              <Tooltip.Root delayDuration={300}>
                                <Tooltip.Trigger>
                                  {#snippet child({ props: aDevTipProps })}
                                    <span
                                      {...aDevTipProps}
                                      class={cn(
                                        'ml-1 inline-block size-1.5 rounded-full cursor-help',
                                        device.state === 'running'
                                          ? 'bg-emerald-500'
                                          : 'bg-muted-foreground/40',
                                      )}
                                    ></span>
                                  {/snippet}
                                </Tooltip.Trigger>
                                <Tooltip.Content side="top" sideOffset={4}>
                                  {device.state === 'running'
                                    ? 'Running — ready to capture'
                                    : 'Stopped — will boot on capture'}
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </DropdownMenu.Item>
                          {/each}
                        {/if}
                        <!-- Uncreated hardware profiles -->
                        {#if uncreatedDevices.length > 0}
                          {#if createdDevices.length > 0}
                            <DropdownMenu.Separator />
                          {/if}
                          <DropdownMenu.Label
                            class="flex items-center gap-1.5 text-[10px] text-muted-foreground/70"
                          >
                            Available Profiles
                          </DropdownMenu.Label>
                          {#each uncreatedDevices as device, idx (idx)}
                            {@const isCreating =
                              creatingAvdDeviceId === ((device.deviceId ?? '') as Str)}
                            <DropdownMenu.Item
                              disabled={!!creatingAvdDeviceId}
                              onSelect={(e) => {
                                e.preventDefault();
                                createAndroidAvd(
                                  (device.deviceId ?? '') as Str,
                                  (device.name ?? '') as Str,
                                );
                              }}
                            >
                              {#if isCreating}
                                <LoaderCircle class="size-4 animate-spin text-primary" />
                              {:else}
                                <Plus class="size-4 text-muted-foreground/50" />
                              {/if}
                              <span class="flex-1 truncate text-muted-foreground"
                                >{device.name ?? 'Unknown'}</span
                              >
                              {#if device.width && device.height}
                                <span class="text-[10px] text-muted-foreground/50"
                                  >{device.width}×{device.height}</span
                                >
                              {/if}
                              {#if isCreating}
                                <span class="text-[9px] text-primary">Creating…</span>
                              {:else}
                                <span class="text-[9px] text-muted-foreground/40">Setup</span>
                              {/if}
                            </DropdownMenu.Item>
                          {/each}
                        {/if}
                      {/if}
                    {/if}
                    <DropdownMenu.Separator />
                    <!-- Capture buttons -->
                    {#if true}
                      {@const selectedSource = cardScreenSource[cardKey] || 'playwright'}
                      {@const sourceUnavailable =
                        selectedSource !== 'playwright' && !engineStatus[selectedSource]?.available}
                      <div class="sticky bottom-0 border-t bg-popover px-2 py-1.5">
                        <div class="flex gap-1.5">
                          <Tooltip.Root delayDuration={300} disabled={!sourceUnavailable}>
                            <Tooltip.Trigger disabled={sourceUnavailable}>
                              {#snippet child({ props: capTipProps })}
                                <button
                                  {...capTipProps}
                                  type="button"
                                  class="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                  disabled={cardScreenCapturing[cardKey] || sourceUnavailable}
                                  onclick={() =>
                                    captureScreenshot(cardKey, variantKey, variantOption)}
                                >
                                  {#if cardScreenCapturing[cardKey]}
                                    <LoaderCircle class="size-3.5 animate-spin" />
                                    Capturing...
                                  {:else}
                                    <Camera class="size-3.5" />
                                    Capture
                                  {/if}
                                </button>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="top" sideOffset={4}>
                              {selectedSource === 'ios-simulator'
                                ? 'iOS Simulator not available — install Xcode'
                                : 'Android Emulator not available — install Android Studio'}
                            </Tooltip.Content>
                          </Tooltip.Root>
                          {#if engineStatus['ios-simulator']?.available || engineStatus['android-emulator']?.available}
                            <Tooltip.Root delayDuration={300}>
                              <Tooltip.Trigger>
                                {#snippet child({ props: triggerProps })}
                                  <button
                                    {...triggerProps}
                                    type="button"
                                    class="flex items-center justify-center gap-1.5 rounded-md border bg-popover px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                                    disabled={cardScreenCapturing[cardKey]}
                                    onclick={() =>
                                      captureParallel(cardKey, variantKey, variantOption)}
                                  >
                                    <Layers class="size-3.5" />
                                    All
                                  </button>
                                {/snippet}
                              </Tooltip.Trigger>
                              <Tooltip.Content side="top" sideOffset={4}>
                                Capture one screenshot per engine (Playwright + any available
                                simulators) in parallel
                              </Tooltip.Content>
                            </Tooltip.Root>
                          {/if}
                          {#if componentName}
                            {@const liveEngine: Str = (() => {
                              const src: Str = cardScreenSource[cardKey] || ('playwright' as Str);
                              if (src === 'playwright') return cardScreenBrowser[cardKey] || ('chromium' as Str);
                              if (src === 'ios-simulator') return 'ios-simulator' as Str;
                              return 'android-emulator' as Str;
                            })()}
                            <Tooltip.Root delayDuration={300}>
                              <Tooltip.Trigger>
                                {#snippet child({ props: liveProps })}
                                  <button
                                    {...liveProps}
                                    type="button"
                                    class="flex items-center justify-center gap-1.5 rounded-md border bg-popover px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                                    onclick={() => {
                                      startLiveView(
                                        cardKey,
                                        componentName,
                                        liveEngine,
                                        1280 as Num,
                                        720 as Num,
                                      );
                                    }}
                                  >
                                    <Play class="size-3.5" />
                                    Live
                                  </button>
                                {/snippet}
                              </Tooltip.Trigger>
                              <Tooltip.Content side="top" sideOffset={4}>
                                Interactive live preview with real browser
                              </Tooltip.Content>
                            </Tooltip.Root>
                          {/if}
                        </div>
                      </div>
                    {/if}
                  </div>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            {/if}
            {#if getActiveSettings(cardKey).length > 0}
              <DropdownMenu.Separator />
              {#if getAllCardKeys().length > 1}
                <DropdownMenu.Item onclick={() => applySettingsToAll(cardKey)}>
                  <CopyCheck class="size-4" />
                  Apply to All Cards
                </DropdownMenu.Item>
              {/if}
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  if (!confirmDestructive(`reset-${cardKey}` as Str)) return;
                  resetCard(cardKey);
                }}
                variant="destructive"
              >
                <RotateCcw class="size-4" />
                {pendingDestructiveAction[`reset-${cardKey}`]
                  ? 'Confirm Reset'
                  : 'Reset to Defaults'}
              </DropdownMenu.Item>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={cardPreviewRefs[cardKey]}
      use:consoleCapture={cardKey}
      class={cn(
        'relative flex w-full items-center overflow-auto p-4',
        isFullscreen && 'flex-1',
        !hasViewport(cardKey) && 'justify-center',
        activeMode === 'dark' && 'dark bg-background text-foreground',
        activeMode === 'light' && 'lens-force-light bg-background text-foreground',
        activeMode === 'high-contrast' && 'lens-high-contrast bg-background text-foreground',
        activeMode === 'auto' && activeTheme && pageIsDark && 'dark',
        activeMode === 'auto' && activeTheme && !pageIsDark && 'lens-force-light',
        activeTheme && 'bg-background text-foreground',
        (cardMeasureActive[cardKey] || cardInspectActive[cardKey]) && 'cursor-crosshair',
      )}
      style={[
        getBackgroundStyle(cardKey),
        cardContentHeights[cardKey] || cardPortalHeights[cardKey]
          ? `min-height: ${Math.max(cardContentHeights[cardKey] ?? 0, cardPortalHeights[cardKey] ?? 0) + 32}px`
          : '',
        activeMode === 'light' ? 'color-scheme: light' : '',
        activeMode === 'dark' ? 'color-scheme: dark' : '',
        activeMode === 'high-contrast' ? 'color-scheme: light' : '',
        activeMode === 'auto' && activeTheme && !pageIsDark ? 'color-scheme: light' : '',
        activeMode === 'auto' && activeTheme && pageIsDark ? 'color-scheme: dark' : '',
        getFontSizeVars(cardKey),
      ]
        .filter(Boolean)
        .join('; ')}
      data-theme={activeTheme || undefined}
      data-lens-debug={cardDebugOutline[cardKey] ? cardKey : undefined}
      onmousemove={(e) => handleMeasureMove(e, cardKey)}
      onmouseleave={() => handleMeasureLeave(cardKey)}
      onclickcapture={(e) => {
        handleMeasureClick(e, cardKey);
        handleInspectClick(e, cardKey);
      }}
      onkeydown={(e) => {
        if (cardInspectActive[cardKey] && e.key === 'Escape') {
          cardInspectActive[cardKey] = false;
          cardInspectedEl[cardKey] = null;
        }
      }}
    >
      {#if hasColorMatrixSim(cardKey)}
        <svg class="absolute size-0 overflow-hidden" aria-hidden="true">
          <defs>
            <filter id={filterId(cardKey)}>
              <feColorMatrix
                type="matrix"
                values={COLOR_MATRICES[cardSimulations[cardKey] ?? ''] ?? ''}
              />
            </filter>
          </defs>
        </svg>
      {/if}
      <div
        class={cn(
          'w-full',
          hasViewport(cardKey) && 'flex max-w-full flex-col items-start overflow-x-auto',
        )}
      >
        {#if hasViewport(cardKey)}
          {@const vpLabel = getViewportPreset(cardKey)}
          {@const vpOrientation = ORIENTATION_PRESETS.find(
            (p) => p.id === (cardOrientations[cardKey] ?? 'default'),
          )}
          {#if vpLabel}
            <div class="mb-3 flex items-center gap-2">
              <span class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                {#if vpLabel.category === 'Watches'}
                  <Watch class="size-3" />
                {:else if vpLabel.category === 'Phones' || vpLabel.category === 'Foldables'}
                  <Smartphone class="size-3" />
                {:else if vpLabel.category === 'Tablets' || vpLabel.category === 'Fire Tablets' || vpLabel.category === 'E-Readers'}
                  <Tablet class="size-3" />
                {:else if vpLabel.category === 'Chromebooks' || vpLabel.category === 'Laptop / Desktop'}
                  <Monitor class="size-3" />
                {:else if vpLabel.category === 'Handhelds' || vpLabel.category === 'Smart Displays'}
                  <MonitorSmartphone class="size-3" />
                {:else if vpLabel.category === 'Automotive'}
                  <Car class="size-3" />
                {:else if vpLabel.category === 'VR / AR'}
                  <Glasses class="size-3" />
                {:else if vpLabel.category === 'Smart Appliances'}
                  <Refrigerator class="size-3" />
                {:else if vpLabel.category === 'TV'}
                  <Tv class="size-3" />
                {:else}
                  <Monitor class="size-3" />
                {/if}
                <span class="truncate">{vpLabel.label}</span>
              </span>
              <span class="font-mono text-[9px] tabular-nums text-muted-foreground/40"
                >{vpLabel.width}&times;{vpLabel.height}</span
              >
              {#if vpOrientation}
                <span class="flex items-center gap-1 text-muted-foreground/50">
                  <span
                    class="relative inline-flex items-center justify-center"
                    style="width: 12px; height: 12px;"
                  >
                    <span
                      class="rounded-[1.5px] border border-current"
                      style="width: 6px; height: 10px; transform: rotate({vpOrientation.rotation}deg);"
                    ></span>
                  </span>
                  <span class="text-[9px]">{vpOrientation.rotation}°</span>
                </span>
              {/if}
            </div>
          {/if}
        {/if}
        <div
          class={cn(
            'relative',
            hasViewport(cardKey) && 'lens-device-frame flex max-h-full flex-col',
            hasViewport(cardKey) &&
              getViewportFrameClass(getViewportPreset(cardKey)?.category ?? ''),
          )}
          style={getViewportFrameStyle(cardKey)}
        >
          {#if hasViewport(cardKey)}
            {@const vpChrome = getViewportPreset(cardKey)}
            {#if vpChrome}
              {#if vpChrome.category === 'Phones' || vpChrome.category === 'Foldables'}
                <!-- Phone: Dynamic Island / notch bar -->
                <div class="lens-device-header flex items-center justify-center px-3 py-1.5">
                  <div class="lens-device-notch"></div>
                </div>
              {:else if vpChrome.category === 'Tablets' || vpChrome.category === 'Fire Tablets'}
                <!-- Tablet: thin camera strip -->
                <div class="lens-device-header flex items-center justify-center py-1">
                  <div class="lens-device-camera"></div>
                </div>
              {:else if vpChrome.category === 'Laptop / Desktop' || vpChrome.category === 'Chromebooks'}
                <!-- Monitor/Laptop: webcam + brand bar -->
                <div class="lens-device-header flex items-center justify-center py-1.5">
                  <div class="lens-device-camera"></div>
                </div>
              {:else if vpChrome.category === 'TV'}
                <!-- TV: thin top bezel only (no camera) -->
                <div class="lens-device-header py-0.5"></div>
              {:else if vpChrome.category === 'Automotive'}
                <!-- Automotive: status bar with signal indicators -->
                <div class="lens-device-header flex items-center justify-between px-3 py-1">
                  <span class="text-[8px] font-medium opacity-40">HUD</span>
                  <span class="text-[8px] tabular-nums opacity-30">--:--</span>
                </div>
              {:else if vpChrome.category === 'Smart Displays'}
                <!-- Smart Display: status bar with time placeholder -->
                <div class="lens-device-header flex items-center justify-end px-3 py-1">
                  <div class="lens-device-camera mr-auto"></div>
                  <span class="text-[8px] tabular-nums opacity-30">12:00</span>
                </div>
              {/if}
            {/if}
          {/if}
          <div
            class={cn(
              'relative w-full',
              hasViewport(cardKey) &&
                (getViewportPreset(cardKey)?.category === 'Watches'
                  ? 'lens-device-content overflow-hidden'
                  : 'lens-device-content overflow-auto'),
            )}
            style={getViewportContentStyle(cardKey)}
            use:trackPortalSize={cardKey}
          >
            <LensPortalScope
              mode={activeMode as 'auto' | 'light' | 'dark' | 'high-contrast'}
              theme={activeTheme}
              {pageIsDark}
            >
              <div
                class={cn(hasNonAxisRotation(cardKey) && 'flex items-center justify-center')}
                style={getOrientationPadding(cardKey)}
              >
                <div
                  bind:this={cardComponentRefs[cardKey]}
                  use:trackContentSize={{
                    key: cardKey,
                    landscape: isLandscapeOrientation(cardKey),
                  }}
                  class={cn(
                    !hasViewport(cardKey) && 'w-fit',
                    activeOutline !== 'none' && 'lens-outline',
                    getMediaPrefClasses(cardKey),
                  )}
                  style={[
                    getSimulationFilter(cardKey),
                    getZoomStyle(cardKey),
                    getOrientationStyle(cardKey),
                    activeOutline !== 'none'
                      ? `--lens-outline-color: ${getOutlineColor(cardKey)}; --lens-outline-thickness: ${cardOutlineThickness[cardKey] ?? 1}px`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('; ')}
                  dir={(cardTextDir[cardKey] ?? 'auto') === 'ltr' ||
                  (cardTextDir[cardKey] ?? 'auto') === 'rtl'
                    ? /* Guard ensures 'ltr' | 'rtl' — Str too wide for dir attr */ (cardTextDir[
                        cardKey
                      ] as 'ltr' | 'rtl')
                    : undefined}
                >
                  {#key statsRefreshKey[cardKey] ?? 0}
                    <LensStats
                      {cardKey}
                      onstats={handleStats}
                      propsTotal={propsMeta.length}
                      propsWithDefaults={propsWithDefaultsCount}
                    >
                      {#if children}
                        {@render children()}
                      {:else if ContextWrapper}
                        <ContextWrapper>
                          {#if useIcon}
                            <Target {...baseProps} {...extraProps}>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                              </svg>
                              {#if requiredChildren}{requiredChildren}{/if}
                            </Target>
                          {:else if innerContent}
                            <Target {...baseProps} {...extraProps}>
                              {@render innerContent()}
                              {#if requiredChildren}{requiredChildren}{/if}
                            </Target>
                          {:else if label || requiredChildren}
                            <Target {...baseProps} {...extraProps}
                              >{requiredChildren || label}</Target
                            >
                          {:else}
                            <Target {...baseProps} {...extraProps} />
                          {/if}
                        </ContextWrapper>
                      {:else if useIcon}
                        <Target {...baseProps} {...extraProps}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                          </svg>
                          {#if requiredChildren}{requiredChildren}{/if}
                        </Target>
                      {:else if innerContent}
                        <Target {...baseProps} {...extraProps}>
                          {@render innerContent()}
                          {#if requiredChildren}{requiredChildren}{/if}
                        </Target>
                      {:else if label || requiredChildren}
                        <Target {...baseProps} {...extraProps}>{requiredChildren || label}</Target>
                      {:else}
                        <Target {...baseProps} {...extraProps} />
                      {/if}
                    </LensStats>
                  {/key}
                </div>
              </div>
            </LensPortalScope>
            {#if hasTunnelVision(cardKey)}
              <div
                class="pointer-events-none absolute inset-0"
                style="background: radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.85) 60%)"
              ></div>
            {/if}
            {#if activeGrid !== 'none'}
              <div class="pointer-events-none absolute inset-0" style={getGridStyle(cardKey)}></div>
            {/if}
            {#if cardNetworkLoading[cardKey]}
              <div
                class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm"
              >
                {#if (cardNetworkSim[cardKey] ?? 'none') === 'offline'}
                  <WifiOff class="size-6 text-destructive" />
                  <span class="text-xs font-medium text-destructive">Offline</span>
                {:else}
                  <div
                    class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
                  ></div>
                  <span class="text-xs text-muted-foreground">
                    {(cardNetworkSim[cardKey] ?? 'none') === 'custom'
                      ? `${cardCustomNetwork[cardKey]?.delay ?? 200}ms latency`
                      : (NETWORK_PRESETS.find((p) => p.id === (cardNetworkSim[cardKey] ?? 'none'))
                          ?.label ?? 'Loading')}...
                  </span>
                {/if}
              </div>
            {/if}
          </div>
          {#if hasViewport(cardKey)}
            {@const vpBottom = getViewportPreset(cardKey)}
            {#if vpBottom}
              {#if vpBottom.category === 'Phones' || vpBottom.category === 'Foldables'}
                <!-- Phone: home indicator bar -->
                <div class="lens-device-footer flex items-center justify-center py-1.5">
                  <div class="lens-device-home-indicator"></div>
                </div>
              {:else if vpBottom.category === 'Tablets' || vpBottom.category === 'Fire Tablets'}
                <!-- Tablet: thin bottom bezel -->
                <div class="lens-device-footer py-1"></div>
              {:else if vpBottom.category === 'TV'}
                <!-- TV: bottom bezel with brand area -->
                <div class="lens-device-footer flex items-center justify-center py-1.5">
                  <div class="h-px w-8 rounded-full bg-current opacity-20"></div>
                </div>
              {:else if vpBottom.category === 'Laptop / Desktop' || vpBottom.category === 'Chromebooks'}
                <!-- Monitor: chin with logo area -->
                <div class="lens-device-footer flex items-center justify-center py-1">
                  <div class="h-px w-6 rounded-full bg-current opacity-15"></div>
                </div>
              {/if}
            {/if}
          {/if}
        </div>
      </div>
      {#if cardDebugOutline[cardKey]}
        {@html `<style data-lens-debug-outline>${DEBUG_FLASH_KEYFRAMES}\n${buildDebugOutlineCSS(cardKey)}</style>`}
      {/if}
      {#if cardMeasureActive[cardKey] && cardMeasureData[cardKey]}
        {@const m = cardMeasureData[cardKey]}
        {#if m}
          <!-- Guide lines — horizontal and vertical extending from element edges -->
          <div
            class="pointer-events-none absolute border-t border-dashed border-primary/30"
            style="left:0;top:{m.absY}px;width:{m.containerW}px;"
          ></div>
          <div
            class="pointer-events-none absolute border-t border-dashed border-primary/30"
            style="left:0;top:{m.absY + m.height}px;width:{m.containerW}px;"
          ></div>
          <div
            class="pointer-events-none absolute border-l border-dashed border-primary/30"
            style="left:{m.absX}px;top:0;height:{m.containerH}px;"
          ></div>
          <div
            class="pointer-events-none absolute border-l border-dashed border-primary/30"
            style="left:{m.absX + m.width}px;top:0;height:{m.containerH}px;"
          ></div>
          <!-- Margin overlay -->
          <div
            class="pointer-events-none absolute"
            style="left:{m.content.x - m.padding.left - m.border.left - m.margin.left}px;top:{m
              .content.y -
              m.padding.top -
              m.border.top -
              m.margin.top}px;width:{m.width + m.margin.left + m.margin.right}px;height:{m.height +
              m.margin.top +
              m.margin.bottom}px;background:rgba(246,178,107,0.25);"
          ></div>
          <!-- Border overlay -->
          <div
            class="pointer-events-none absolute"
            style="left:{m.content.x - m.padding.left - m.border.left}px;top:{m.content.y -
              m.padding.top -
              m.border
                .top}px;width:{m.width}px;height:{m.height}px;background:rgba(255,229,153,0.3);"
          ></div>
          <!-- Padding overlay -->
          <div
            class="pointer-events-none absolute"
            style="left:{m.content.x - m.padding.left}px;top:{m.content.y -
              m.padding.top}px;width:{m.content.w + m.padding.left + m.padding.right}px;height:{m
              .content.h +
              m.padding.top +
              m.padding.bottom}px;background:rgba(147,196,125,0.3);"
          ></div>
          <!-- Content overlay -->
          <div
            class="pointer-events-none absolute"
            style="left:{m.content.x}px;top:{m.content.y}px;width:{m.content.w}px;height:{m.content
              .h}px;background:rgba(111,168,220,0.3);"
          ></div>
          <!-- Copied indicator -->
          {#if cardMeasureCopied[cardKey]}
            <div
              class="pointer-events-none absolute flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground shadow-md"
              style="left:{m.content.x + m.width / 2 - 32}px;top:{m.content.y +
                m.height / 2 -
                12}px;"
            >
              <Check class="size-3.5" />
              Copied
            </div>
          {/if}
        {/if}
      {/if}
    </div>
    <!-- Sticky box model info panel -->
    {#if cardMeasureActive[cardKey] && cardMeasureData[cardKey]}
      {@const md = cardMeasureData[cardKey]}
      {#if md}
        <div class="border-t bg-muted/30 px-3 py-2 text-xs" transition:slide={{ duration: 200 }}>
          <!-- Header: tag + size + layout badges + copy button -->
          <div class="mb-2 flex items-center gap-1.5">
            <code
              class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
              >&lt;{md.tag}&gt;</code
            >
            <span class="font-mono text-[10px] tabular-nums text-muted-foreground"
              >{Math.round(md.width)} × {Math.round(md.height)}</span
            >
            <span class="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
              >{md.display}</span
            >
            {#if md.position !== 'static'}
              <span class="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                >{md.position}</span
              >
            {/if}
            <button
              type="button"
              class="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onclick={() => handleMeasureClick(new MouseEvent('click'), cardKey)}
            >
              {#if cardMeasureCopied[cardKey]}
                <Check class="size-3" />
                <span>Copied</span>
              {:else}
                <ClipboardCopy class="size-3" />
                <span>Copy</span>
              {/if}
            </button>
          </div>
          <!-- Chrome DevTools-style nested box diagram -->
          <div class="flex items-start gap-3">
            <div class="font-mono text-[9px] tabular-nums">
              <!-- Margin (outermost) -->
              <div
                class="rounded border border-dashed px-2 pb-1 pt-0.5"
                style="border-color:rgba(246,178,107,0.6);background:rgba(246,178,107,0.08)"
              >
                <div class="mb-0.5 flex items-center justify-between">
                  <span
                    class="text-[8px] font-medium uppercase tracking-wider text-muted-foreground/60"
                    >margin</span
                  >
                  <span class="text-muted-foreground/50">{md.boxSizing}</span>
                </div>
                <div class="text-center text-muted-foreground">{Math.round(md.margin.top)}</div>
                <div class="flex items-center gap-1">
                  <span class="text-muted-foreground">{Math.round(md.margin.left)}</span>
                  <!-- Border -->
                  <div
                    class="flex-1 rounded border px-1.5 pb-0.5 pt-0.5"
                    style="border-color:rgba(255,229,153,0.7);background:rgba(255,229,153,0.08)"
                  >
                    <div class="text-center text-muted-foreground">{Math.round(md.border.top)}</div>
                    <div class="flex items-center gap-1">
                      <span class="text-muted-foreground">{Math.round(md.border.left)}</span>
                      <!-- Padding -->
                      <div
                        class="flex-1 rounded border px-1.5 pb-0.5 pt-0.5"
                        style="border-color:rgba(147,196,125,0.6);background:rgba(147,196,125,0.08)"
                      >
                        <div class="text-center text-muted-foreground">
                          {Math.round(md.padding.top)}
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-muted-foreground">{Math.round(md.padding.left)}</span>
                          <!-- Content (innermost) -->
                          <div
                            class="flex-1 rounded px-1.5 py-0.5 text-center font-semibold"
                            style="background:rgba(111,168,220,0.15);color:rgba(111,168,220,1)"
                          >
                            {Math.round(md.content.w)} × {Math.round(md.content.h)}
                          </div>
                          <span class="text-muted-foreground">{Math.round(md.padding.right)}</span>
                        </div>
                        <div class="text-center text-muted-foreground">
                          {Math.round(md.padding.bottom)}
                        </div>
                      </div>
                      <span class="text-muted-foreground">{Math.round(md.border.right)}</span>
                    </div>
                    <div class="text-center text-muted-foreground">
                      {Math.round(md.border.bottom)}
                    </div>
                  </div>
                  <span class="text-muted-foreground">{Math.round(md.margin.right)}</span>
                </div>
                <div class="text-center text-muted-foreground">{Math.round(md.margin.bottom)}</div>
              </div>
            </div>
            <!-- Parent offset -->
            {#if md.parentDistance}
              <div class="border-l pl-3 pt-0.5">
                <span class="text-[9px] font-medium text-muted-foreground">Parent offset</span>
                <div
                  class="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[9px] tabular-nums"
                >
                  <span class="text-muted-foreground/60">top</span>
                  <span>{Math.round(md.parentDistance.top)}</span>
                  <span class="text-muted-foreground/60">right</span>
                  <span>{Math.round(md.parentDistance.right)}</span>
                  <span class="text-muted-foreground/60">bottom</span>
                  <span>{Math.round(md.parentDistance.bottom)}</span>
                  <span class="text-muted-foreground/60">left</span>
                  <span>{Math.round(md.parentDistance.left)}</span>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
    {#if cardInspectActive[cardKey] && cardInspectedEl[cardKey]}
      {@const el = cardInspectedEl[cardKey]}
      {@const collapsed = cardInspectCollapsed[cardKey] ?? {}}
      {@const copyFeedback = cardInspectCopyFeedback[cardKey] ?? ''}
      {#if el}
        <div
          class="max-h-80 overflow-y-auto border-t bg-muted/30 text-xs"
          transition:slide={{ duration: 200 }}
        >
          <!-- Element header -->
          <div class="sticky top-0 z-10 border-b bg-muted/50 px-3 py-2 backdrop-blur-sm">
            <div class="mb-1 flex items-center gap-2">
              <code
                class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
                >&lt;{el.tag}&gt;</code
              >
              {#if el.id}<code class="font-mono text-[10px] text-muted-foreground">#{el.id}</code
                >{/if}
              <span class="ml-auto font-mono text-[10px] text-muted-foreground"
                >{el.rect.width} × {el.rect.height}px</span
              >
            </div>
            <!-- Breadcrumb -->
            <div
              class="mb-1 truncate font-mono text-[9px] text-muted-foreground/60"
              title={el.breadcrumb}
            >
              {el.breadcrumb}
            </div>
            <!-- Classes -->
            {#if el.classes}
              <div class="mb-1 flex flex-wrap gap-1">
                {#each el.classes.split(' ').filter(Boolean) as cls (cls)}
                  <code
                    class="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                    >.{cls}</code
                  >
                {/each}
              </div>
            {/if}
            <!-- Text content preview -->
            {#if el.textContent}
              <div
                class="truncate font-mono text-[9px] text-muted-foreground/50"
                title={el.textContent}
              >
                "{el.textContent}"
              </div>
            {/if}
          </div>

          <div class="flex flex-col gap-1.5 px-3 py-1.5">
            <!-- Box model summary -->
            <div class="rounded border bg-muted/20 px-2 py-1.5">
              <div class="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[10px]">
                <div>
                  <span class="text-muted-foreground/60">margin</span>
                  <span class="ml-1 font-mono"
                    >{Math.round(el.boxModel.margin.top as number)}px
                    {Math.round(el.boxModel.margin.right as number)}px
                    {Math.round(el.boxModel.margin.bottom as number)}px
                    {Math.round(el.boxModel.margin.left as number)}px</span
                  >
                </div>
                <div>
                  <span class="text-muted-foreground/60">padding</span>
                  <span class="ml-1 font-mono"
                    >{Math.round(el.boxModel.padding.top as number)}px
                    {Math.round(el.boxModel.padding.right as number)}px
                    {Math.round(el.boxModel.padding.bottom as number)}px
                    {Math.round(el.boxModel.padding.left as number)}px</span
                  >
                </div>
                <div>
                  <span class="text-muted-foreground/60">border</span>
                  <span class="ml-1 font-mono"
                    >{Math.round(el.boxModel.border.top as number)}px
                    {Math.round(el.boxModel.border.right as number)}px
                    {Math.round(el.boxModel.border.bottom as number)}px
                    {Math.round(el.boxModel.border.left as number)}px</span
                  >
                </div>
              </div>
            </div>

            <!-- DOM Attributes section -->
            {#if Object.keys(el.attrs).length > 0}
              {@const attrCollapsed = collapsed['Attributes'] ?? false}
              <div class="rounded border bg-muted/10">
                <button
                  type="button"
                  class="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-muted/30"
                  onclick={() => {
                    const c: Record<Str, Bool> = { ...collapsed };
                    c['Attributes'] = !attrCollapsed as Bool;
                    cardInspectCollapsed[cardKey] = c;
                  }}
                >
                  <ChevronDown
                    class={cn(
                      'size-3 text-muted-foreground transition-transform',
                      attrCollapsed && '-rotate-90',
                    )}
                    aria-hidden="true"
                  />
                  <span class="text-[10px] font-semibold text-muted-foreground">Attributes</span>
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground"
                    >{Object.keys(el.attrs).length}</span
                  >
                </button>
                {#if !attrCollapsed}
                  <div
                    class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0 border-t px-2 py-1"
                    transition:slide={{ duration: 150 }}
                  >
                    {#each Object.entries(el.attrs) as [prop, val] (prop)}
                      <button
                        type="button"
                        class="col-span-2 grid grid-cols-subgrid rounded-sm px-0.5 transition-colors hover:bg-muted"
                        onclick={() => copyInspectProp(cardKey, prop as Str, val as Str)}
                        title="Click to copy"
                      >
                        <span class="font-mono text-[10px] text-violet-400">{prop}</span>
                        <span
                          class="flex items-center gap-1 break-all text-left font-mono text-[10px]"
                        >
                          {#if copyFeedback === prop}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="inline size-3 text-green-500" /></span
                            >
                            <span class="text-green-500">Copied!</span>
                          {:else}
                            {val}
                          {/if}
                        </span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Accessibility section -->
            {#if Object.keys(el.a11y).length > 0}
              {@const a11yCollapsed = collapsed['Accessibility'] ?? false}
              <div class="rounded border bg-muted/10">
                <button
                  type="button"
                  class="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-muted/30"
                  onclick={() => {
                    const c: Record<Str, Bool> = { ...collapsed };
                    c['Accessibility'] = !a11yCollapsed as Bool;
                    cardInspectCollapsed[cardKey] = c;
                  }}
                >
                  <ChevronDown
                    class={cn(
                      'size-3 text-muted-foreground transition-transform',
                      a11yCollapsed && '-rotate-90',
                    )}
                    aria-hidden="true"
                  />
                  <Accessibility class="size-3 text-muted-foreground" aria-hidden="true" />
                  <span class="text-[10px] font-semibold text-muted-foreground">Accessibility</span>
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground"
                    >{Object.keys(el.a11y).length}</span
                  >
                </button>
                {#if !a11yCollapsed}
                  <div
                    class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0 border-t px-2 py-1"
                    transition:slide={{ duration: 150 }}
                  >
                    {#each Object.entries(el.a11y) as [prop, val] (prop)}
                      <button
                        type="button"
                        class="col-span-2 grid grid-cols-subgrid rounded-sm px-0.5 transition-colors hover:bg-muted"
                        onclick={() => copyInspectProp(cardKey, prop as Str, val as Str)}
                        title="Click to copy"
                      >
                        <span class="font-mono text-[10px] text-emerald-400">{prop}</span>
                        <span
                          class="flex items-center gap-1 break-all text-left font-mono text-[10px]"
                        >
                          {#if copyFeedback === prop}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="inline size-3 text-green-500" /></span
                            >
                            <span class="text-green-500">Copied!</span>
                          {:else}
                            {val}
                          {/if}
                        </span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- CSS Style groups -->
            {#each Object.entries(el.styles) as [group, props] (group)}
              {@const groupCollapsed = collapsed[group] ?? false}
              <div class="rounded border bg-muted/10">
                <button
                  type="button"
                  class="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-muted/30"
                  onclick={() => {
                    const c: Record<Str, Bool> = { ...collapsed };
                    c[group] = !groupCollapsed as Bool;
                    cardInspectCollapsed[cardKey] = c;
                  }}
                >
                  <ChevronDown
                    class={cn(
                      'size-3 text-muted-foreground transition-transform',
                      groupCollapsed && '-rotate-90',
                    )}
                    aria-hidden="true"
                  />
                  <span class="text-[10px] font-semibold text-muted-foreground">{group}</span>
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground"
                    >{Object.keys(props).length}</span
                  >
                </button>
                {#if !groupCollapsed}
                  <div
                    class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0 border-t px-2 py-1"
                    transition:slide={{ duration: 150 }}
                  >
                    {#each Object.entries(props) as [prop, val] (prop)}
                      <button
                        type="button"
                        class="col-span-2 grid grid-cols-subgrid rounded-sm px-0.5 transition-colors hover:bg-muted"
                        onclick={() => copyInspectProp(cardKey, prop as Str, val as Str)}
                        title="Click to copy"
                      >
                        <span class="font-mono text-[10px] text-muted-foreground">{prop}</span>
                        <span
                          class="flex items-center gap-1 break-all text-left font-mono text-[10px]"
                        >
                          {#if copyFeedback === prop}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="inline size-3 text-green-500" /></span
                            >
                            <span class="text-green-500">Copied!</span>
                          {:else}
                            {#if isCssColor(val as Str)}
                              <span
                                class="inline-block size-2.5 shrink-0 rounded-sm border border-border/50"
                                style="background-color: {val}"
                              ></span>
                            {/if}
                            {val}
                          {/if}
                        </span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    {#if (tagName || codeText) && openCards[cardKey]}
      <div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
        <div class="min-w-0 overflow-x-auto p-3 text-sm">
          <CodeBlock code={codeText ?? snippet} lang="svelte" />
        </div>
      </div>
    {/if}
    {#if cardConsoleOpen[cardKey]}
      {@const allLogs = cardConsoleLogs[cardKey] ?? []}
      {@const levelFilters = cardConsoleLevelFilter[cardKey] ?? {}}
      {@const searchQ = ((cardConsoleSearch[cardKey] ?? '') as string).toLowerCase()}
      {@const logs = allLogs.filter((e) => {
        if (levelFilters[e.level] === false) return false;
        if (
          searchQ &&
          !(e.message as string).toLowerCase().includes(searchQ) &&
          !(e.detail as string).toLowerCase().includes(searchQ)
        )
          return false;
        return true;
      })}
      {@const mountTime = cardConsoleMountTime[cardKey] ?? (0 as Num)}
      {@const activeFilterCount = CONSOLE_LEVELS.filter((l) => levelFilters[l.id] === false).length}
      <div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
        <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
          <button
            type="button"
            class="flex items-center gap-2 transition-colors hover:text-foreground"
            onclick={() => {
              cardConsoleExpanded[cardKey] = !(cardConsoleExpanded[cardKey] ?? true);
            }}
          >
            <ChevronDown
              class={cn(
                'size-3.5 text-muted-foreground transition-transform duration-200',
                !(cardConsoleExpanded[cardKey] ?? true) && '-rotate-90',
              )}
              aria-hidden="true"
            />
            <Terminal class="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span class="text-xs font-semibold text-muted-foreground">Console</span>
            <!-- Level count badges -->
            {#each CONSOLE_LEVELS as lvl (lvl.id)}
              {@const count = allLogs.filter((e) => e.level === lvl.id).length}
              {#if count > 0}
                <span
                  class={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-medium tabular-nums leading-none',
                    lvl.id === 'error'
                      ? 'bg-red-500/15 text-red-500'
                      : lvl.id === 'warn'
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-muted text-muted-foreground/70',
                    levelFilters[lvl.id] === false && 'opacity-30 line-through',
                  )}
                  title="{count} {lvl.label}"
                  >{count}
                  {lvl.label.toLowerCase()}{count > 1 && lvl.id !== 'info' ? 's' : ''}</span
                >
              {/if}
            {/each}
          </button>
          <div class="flex items-center gap-1">
            {#if allLogs.length > 0}
              <!-- Search input -->
              <div class="flex items-center gap-1.5 rounded-md border bg-transparent px-1.5 py-0.5">
                <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Filter..."
                  class="w-20 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
                  value={cardConsoleSearch[cardKey] ?? ''}
                  oninput={(e) => {
                    cardConsoleSearch[cardKey] = (e.currentTarget as HTMLInputElement).value as Str;
                  }}
                />
                {#if cardConsoleSearch[cardKey]}
                  <button
                    type="button"
                    class="text-muted-foreground/60 transition-colors hover:text-foreground"
                    onclick={() => {
                      cardConsoleSearch[cardKey] = '' as Str;
                    }}
                    aria-label="Clear search"
                  >
                    <X class="size-3" />
                  </button>
                {/if}
              </div>
              <!-- Level filter dropdown -->
              <DropdownMenu.Root
                onOpenChange={(open) => {
                  if (open) consoleLevelFilterSearch = '' as Str;
                }}
              >
                <DropdownMenu.Trigger>
                  {#snippet child({ props: menuProps })}
                    <button
                      {...menuProps}
                      type="button"
                      class={cn(
                        'relative inline-flex size-5 items-center justify-center rounded transition-colors',
                        activeFilterCount > 0
                          ? 'text-primary hover:bg-primary/10'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      aria-label="Filter by level"
                    >
                      <ListFilter class="size-3" />
                      {#if activeFilterCount > 0}
                        <span class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary"
                        ></span>
                      {/if}
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  align="end"
                  class="flex max-h-80 w-52 flex-col overflow-hidden"
                >
                  <div class="shrink-0 px-2 pb-1.5 pt-1">
                    <div
                      class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                    >
                      <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Search levels..."
                        class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        bind:value={consoleLevelFilterSearch}
                        onkeydown={(e) => e.stopPropagation()}
                        onkeyup={(e) => e.stopPropagation()}
                        onkeypress={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                    {#each filteredConsoleLevels as lvl (lvl.id)}
                      {@const lvCount = allLogs.filter((e) => e.level === lvl.id).length}
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          const filters: Record<Str, Bool> = { ...levelFilters };
                          filters[lvl.id] = (filters[lvl.id] === false ? true : false) as Bool;
                          cardConsoleLevelFilter[cardKey] = filters;
                        }}
                      >
                        <span class={cn('size-2 shrink-0 rounded-full', lvl.dotColor)}></span>
                        <div class="flex flex-col gap-0.5">
                          <span class="text-sm">{lvl.label}</span>
                          <span class="text-[10px] leading-tight text-muted-foreground"
                            >{lvl.description}</span
                          >
                        </div>
                        <span class="ml-auto text-[10px] tabular-nums text-muted-foreground"
                          >{lvCount}</span
                        >
                        {#if levelFilters[lvl.id] !== false}
                          <span transition:scaleTransition={{ duration: 150, start: 0.5 }}>
                            <Check class="size-3.5 text-primary" />
                          </span>
                        {/if}
                      </DropdownMenu.Item>
                    {:else}
                      <div
                        class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                      >
                        <SearchX class="size-5" />
                        <div class="flex flex-col items-center gap-0.5">
                          <p class="text-xs font-medium">No levels found</p>
                          <p class="text-[11px]">Try a different search term</p>
                        </div>
                      </div>
                    {/each}
                    {#if filteredConsoleLevels.length > 0}
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          cardConsoleLevelFilter[cardKey] = {};
                        }}
                        disabled={activeFilterCount === 0}
                      >
                        <Eye class="size-4" />
                        Show all
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          const hideAll: Record<Str, Bool> = {};
                          for (const lvl of CONSOLE_LEVELS) {
                            hideAll[lvl.id] = false as Bool;
                          }
                          cardConsoleLevelFilter[cardKey] = hideAll;
                        }}
                        disabled={activeFilterCount === CONSOLE_LEVELS.length}
                      >
                        <EyeOff class="size-4" />
                        Hide all
                      </DropdownMenu.Item>
                    {/if}
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            {/if}
            <!-- Options menu -->
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props: menuProps })}
                  <button
                    {...menuProps}
                    type="button"
                    class="relative inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Console options"
                  >
                    <EllipsisVertical class="size-3" />
                    {#if allLogs.length > 0}
                      <span
                        class="absolute -right-1 -top-1 min-w-3.5 rounded-full bg-muted px-1 text-center text-[8px] font-medium tabular-nums leading-[14px] text-muted-foreground"
                        >{allLogs.length > 99 ? '99+' : allLogs.length}</span
                      >
                    {/if}
                  </button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-44">
                <DropdownMenu.Sub
                  onOpenChange={(open) => {
                    if (open) consoleExportSearchQuery = '';
                  }}
                >
                  <DropdownMenu.SubTrigger>
                    <Download class="size-4" />
                    Export
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent class="flex max-h-[28rem] w-64 flex-col overflow-hidden">
                    <div class="shrink-0 px-2 pb-1.5 pt-1">
                      <div
                        class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                      >
                        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <input
                          type="text"
                          placeholder="Search formats..."
                          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          bind:value={consoleExportSearchQuery}
                          onkeydown={(e) => e.stopPropagation()}
                          onkeyup={(e) => e.stopPropagation()}
                          onkeypress={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                      {#each filteredConsoleExportCategories as category (category)}
                        {#if filteredConsoleExportCategories.indexOf(category) > 0}
                          <DropdownMenu.Separator />
                        {/if}
                        <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                          {#if category === 'Clipboard'}
                            <Clipboard class="size-3 text-muted-foreground" />
                          {:else if category === 'File'}
                            <Download class="size-3 text-muted-foreground" />
                          {/if}
                          {category}
                        </DropdownMenu.Label>
                        {#each filteredConsoleExportItems.filter((i) => i.category === category) as item (item.id)}
                          <DropdownMenu.Item
                            onSelect={(e) => {
                              e.preventDefault();
                              handleConsoleExport(cardKey, item.id);
                            }}
                          >
                            {#if consoleExportFeedback === item.id}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="size-4 text-green-500" /></span
                              >
                            {:else}
                              <item.icon class="size-4" />
                            {/if}
                            <div class="flex min-w-0 flex-1 flex-col">
                              <span class="flex items-center gap-2">
                                <span class="truncate">{item.label}</span>
                                {#if item.ext}
                                  <code
                                    class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                                    >{item.ext}</code
                                  >
                                {/if}
                              </span>
                              <span class="text-[10px] leading-tight text-muted-foreground"
                                >{item.description}</span
                              >
                            </div>
                          </DropdownMenu.Item>
                        {/each}
                      {:else}
                        <div
                          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                        >
                          <SearchX class="size-5" />
                          <div class="flex flex-col items-center gap-0.5">
                            <p class="text-xs font-medium">No formats found</p>
                            <p class="text-[11px]">Try a different search term</p>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    cardConsoleAutoScroll[cardKey] = !(cardConsoleAutoScroll[cardKey] ?? true);
                  }}
                >
                  <ArrowDownToLine class="size-4" />
                  Auto-scroll
                  {#if cardConsoleAutoScroll[cardKey] ?? true}
                    <span in:fade={{ duration: 150 }}
                      ><Check class="ml-auto size-3.5 text-primary" /></span
                    >
                  {/if}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    cardConsoleShowTimestamps[cardKey] = !(
                      cardConsoleShowTimestamps[cardKey] ?? true
                    );
                  }}
                >
                  <Clock class="size-4" />
                  Timestamps
                  {#if cardConsoleShowTimestamps[cardKey] ?? true}
                    <span in:fade={{ duration: 150 }}
                      ><Check class="ml-auto size-3.5 text-primary" /></span
                    >
                  {/if}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    cardConsoleWordWrap[cardKey] = !(cardConsoleWordWrap[cardKey] ?? true);
                  }}
                >
                  <WrapText class="size-4" />
                  Word wrap
                  {#if cardConsoleWordWrap[cardKey] ?? true}
                    <span in:fade={{ duration: 150 }}
                      ><Check class="ml-auto size-3.5 text-primary" /></span
                    >
                  {/if}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    const expanding: Bool = !(cardConsoleExpandAll[cardKey] ?? false);
                    cardConsoleExpandAll[cardKey] = expanding;
                    cardConsoleExpandedEntry[cardKey] = -1 as Num;
                  }}
                  disabled={logs.length === 0}
                >
                  <ChevronsUpDown class="size-4" />
                  {cardConsoleExpandAll[cardKey] ? 'Collapse all' : 'Expand all'}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!confirmDestructive(`clear-console-${cardKey}` as Str)) return;
                    cardConsoleLogs[cardKey] = [];
                  }}
                  disabled={allLogs.length === 0}
                  variant="destructive"
                >
                  <Trash2 class="size-4" />
                  {pendingDestructiveAction[`clear-console-${cardKey}`] ? 'Confirm Clear' : 'Clear'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
        {#if cardConsoleExpanded[cardKey] ?? true}
          <div
            class="max-h-64 overflow-y-auto font-mono text-[11px]"
            transition:slide={{ duration: 200 }}
            use:autoScrollConsole={{ key: cardKey, logs }}
          >
            {#if logs.length === 0}
              <div class="px-3 py-4 text-center text-[11px] text-muted-foreground/50">
                {#if allLogs.length > 0}
                  All {allLogs.length} entries hidden by filters.
                {:else}
                  No console output yet. Interact with the component to see events, mutations, and
                  logs.
                {/if}
              </div>
            {:else}
              {#each logs as entry, i (i)}
                {@const isExpanded =
                  (cardConsoleExpandAll[cardKey] ?? false) ||
                  (cardConsoleExpandedEntry[cardKey] ?? (-1 as Num)) === (i as Num)}
                <button
                  type="button"
                  class={cn(
                    'flex w-full cursor-pointer items-start gap-2 border-b border-border/30 px-3 py-1 text-left last:border-b-0 transition-colors hover:bg-muted/50',
                    entry.level === 'error' && 'bg-red-500/5',
                    entry.level === 'warn' && 'bg-amber-500/5',
                  )}
                  onclick={() => {
                    if (cardConsoleExpandAll[cardKey]) {
                      cardConsoleExpandAll[cardKey] = false as Bool;
                      cardConsoleExpandedEntry[cardKey] = -1 as Num;
                    } else {
                      cardConsoleExpandedEntry[cardKey] = isExpanded ? (-1 as Num) : (i as Num);
                    }
                  }}
                >
                  {#if cardConsoleShowTimestamps[cardKey] ?? true}
                    <Tooltip.Provider>
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: tsProps })}
                            <span
                              {...tsProps}
                              class="shrink-0 cursor-default pt-px text-[9px] tabular-nums text-muted-foreground/50"
                              >{formatConsoleTs(entry.ts)}</span
                            >
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4} class="font-mono text-xs">
                          {getAbsoluteTime(mountTime, entry.ts)}
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  {/if}
                  <span
                    class={cn(
                      'shrink-0 rounded-sm px-1 py-px text-[9px] font-semibold leading-tight',
                      getConsoleColor(entry.level),
                      entry.level === 'error'
                        ? 'bg-red-500/10'
                        : entry.level === 'warn'
                          ? 'bg-amber-500/10'
                          : entry.level === 'event'
                            ? 'bg-violet-500/10'
                            : entry.level === 'mutation'
                              ? 'bg-teal-500/10'
                              : entry.level === 'lifecycle'
                                ? 'bg-emerald-500/10'
                                : entry.level === 'render'
                                  ? 'bg-indigo-500/10'
                                  : entry.level === 'info'
                                    ? 'bg-blue-500/10'
                                    : 'bg-muted',
                    )}>{getConsoleLabel(entry.level)}</span
                  >
                  <div
                    class={cn(
                      'min-w-0 flex-1',
                      (cardConsoleWordWrap[cardKey] ?? true) ? '' : 'overflow-hidden',
                    )}
                  >
                    <span
                      class={cn(
                        (cardConsoleWordWrap[cardKey] ?? true) ? 'break-all' : 'truncate block',
                      )}>{entry.message}</span
                    >
                    {#if !isExpanded && entry.detail}
                      <span
                        class={cn(
                          'ml-1 text-muted-foreground/60',
                          (cardConsoleWordWrap[cardKey] ?? true) ? 'break-all' : 'truncate block',
                        )}>{entry.detail}</span
                      >
                    {/if}
                  </div>
                  {#if entry.source && !isExpanded}
                    <span class="shrink-0 text-[9px] text-muted-foreground/40">{entry.source}</span>
                  {/if}
                  <ChevronDown
                    class={cn(
                      'size-3 shrink-0 text-muted-foreground/30 transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
                {#if isExpanded}
                  <div
                    class="border-b border-border/30 bg-muted/30 px-3 py-1.5"
                    transition:slide={{ duration: 150 }}
                  >
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
                      <span class="text-muted-foreground/60">Time</span>
                      <span
                        >{formatConsoleTs(entry.ts)} ({getAbsoluteTime(mountTime, entry.ts)})</span
                      >
                      <span class="text-muted-foreground/60">Level</span>
                      <span class={getConsoleColor(entry.level)}
                        >{getConsoleLabel(entry.level)}</span
                      >
                      <span class="text-muted-foreground/60">Message</span>
                      <span class="break-all">{entry.message}</span>
                      {#if entry.detail}
                        <span class="text-muted-foreground/60">Detail</span>
                        <pre
                          class="whitespace-pre-wrap break-all text-muted-foreground/80">{entry.detail}</pre>
                      {/if}
                      {#if entry.source}
                        <span class="text-muted-foreground/60">Source</span>
                        <span class="text-muted-foreground/80">{entry.source}</span>
                      {/if}
                    </div>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    {#if (cardScreenshots[cardKey] ?? []).length > 0 || cardScreenCapturing[cardKey] || cardScreenError[cardKey]}
      <div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
        <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
          <button
            type="button"
            class="flex items-center gap-2 transition-colors hover:text-foreground"
            onclick={() => {
              cardScreenshotsOpen[cardKey] = !(cardScreenshotsOpen[cardKey] ?? true);
            }}
          >
            <ChevronDown
              class={cn(
                'size-3.5 text-muted-foreground transition-transform duration-200',
                !(cardScreenshotsOpen[cardKey] ?? true) && '-rotate-90',
              )}
              aria-hidden="true"
            />
            <Camera class="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span class="text-xs font-semibold text-muted-foreground">Screenshots</span>
            <span
              class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >{(cardScreenshots[cardKey] ?? []).length}</span
            >
            {#if cardScreenCapturing[cardKey] && (cardCapturingTotal[cardKey] ?? 0) > 0}
              {@const total = cardCapturingTotal[cardKey] ?? 0}
              {@const done = (total as number) - (cardCapturingSources[cardKey]?.size ?? 0)}
              <span
                class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                transition:fade={{ duration: 150 }}
              >
                <LoaderCircle class="size-2.5 animate-spin" aria-hidden="true" />
                {done} of {total}
              </span>
            {/if}
          </button>
          <div class="flex items-center gap-1.5">
            {#if (cardScreenshots[cardKey] ?? []).some((c) => c.source === 'ios-simulator' && c.safeAreaInsets)}
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: triggerProps })}
                    <button
                      {...triggerProps}
                      type="button"
                      class={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
                        showSafeAreaOverlay
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                      onclick={() => {
                        showSafeAreaOverlay = !showSafeAreaOverlay;
                      }}
                    >
                      <Ruler class="size-3.5" aria-hidden="true" />
                      Safe Area
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="top" sideOffset={4}>
                  Toggle safe area inset overlays
                </Tooltip.Content>
              </Tooltip.Root>
            {/if}
            {#if (cardScreenshots[cardKey] ?? []).some((c) => c.deviceFrame)}
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: triggerProps })}
                    <button
                      {...triggerProps}
                      type="button"
                      class={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
                        showDeviceFrame
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                      onclick={() => {
                        showDeviceFrame = !showDeviceFrame;
                      }}
                    >
                      <Smartphone class="size-3.5" aria-hidden="true" />
                      Frame
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="top" sideOffset={4}>
                  Toggle device frame bezels
                </Tooltip.Content>
              </Tooltip.Root>
            {/if}
            {#if (cardScreenshots[cardKey] ?? []).length >= 2}
              <div transition:fade={{ duration: 200 }}>
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger>
                    {#snippet child({ props: triggerProps })}
                      <button
                        {...triggerProps}
                        type="button"
                        class={cn(
                          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
                          (cardScreenCompare[cardKey] ?? false)
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                        onclick={() => {
                          cardScreenCompare[cardKey] = !(cardScreenCompare[cardKey] ?? false);
                          /* Use undefined check — 0 is a valid slider position */
                          if (cardComparePosition[cardKey] === undefined)
                            cardComparePosition[cardKey] = 50 as Num;
                          /* Default to last two screenshots */
                          const len: Num = (cardScreenshots[cardKey] ?? []).length as Num;
                          if (cardCompareLeft[cardKey] === undefined)
                            cardCompareLeft[cardKey] = ((len as number) - 2) as Num;
                          if (cardCompareRight[cardKey] === undefined)
                            cardCompareRight[cardKey] = ((len as number) - 1) as Num;
                        }}
                      >
                        <SplitSquareHorizontal class="size-3.5" aria-hidden="true" />
                        Compare
                      </button>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" sideOffset={4}>
                    Compare any two screenshots with a slider overlay
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            {/if}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props: menuProps })}
                  <button
                    {...menuProps}
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Screenshot options"
                  >
                    <EllipsisVertical class="size-3.5" aria-hidden="true" />
                  </button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-52">
                <DropdownMenu.Sub
                  onOpenChange={(open) => {
                    if (open) screenshotExportAllSearchQuery = '';
                  }}
                >
                  <DropdownMenu.SubTrigger disabled={(cardScreenshots[cardKey] ?? []).length === 0}>
                    <Download class="size-4" />
                    Export All ({(cardScreenshots[cardKey] ?? []).length})
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent class="flex max-h-[28rem] w-64 flex-col overflow-hidden">
                    <div class="shrink-0 px-2 pb-1.5 pt-1">
                      <div
                        class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                      >
                        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <input
                          type="text"
                          placeholder="Search formats..."
                          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          bind:value={screenshotExportAllSearchQuery}
                          onkeydown={(e) => e.stopPropagation()}
                          onkeyup={(e) => e.stopPropagation()}
                          onkeypress={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                      {#each filteredScreenshotExportAllCategories as category (category)}
                        {#if filteredScreenshotExportAllCategories.indexOf(category) > 0}
                          <DropdownMenu.Separator />
                        {/if}
                        <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                          {#if category === 'Clipboard'}
                            <Clipboard class="size-3 text-muted-foreground" />
                          {:else if category === 'File'}
                            <Download class="size-3 text-muted-foreground" />
                          {/if}
                          {category}
                        </DropdownMenu.Label>
                        {#each filteredScreenshotExportAllItems.filter((i) => i.category === category) as item (item.id)}
                          <DropdownMenu.Item
                            onSelect={(e) => {
                              e.preventDefault();
                              handleScreenshotExportAll(cardKey, item.id);
                            }}
                          >
                            {#if screenshotExportFeedback[cardKey] === item.id}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="size-4 text-green-500" /></span
                              >
                            {:else}
                              <item.icon class="size-4" />
                            {/if}
                            <div class="flex min-w-0 flex-1 flex-col">
                              <span class="flex items-center gap-2">
                                <span class="truncate">{item.label}</span>
                                {#if item.ext}
                                  <code
                                    class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                                    >{item.ext}</code
                                  >
                                {/if}
                              </span>
                              <span class="text-[10px] leading-tight text-muted-foreground"
                                >{item.description}</span
                              >
                            </div>
                          </DropdownMenu.Item>
                        {/each}
                      {:else}
                        <div
                          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                        >
                          <SearchX class="size-5" />
                          <div class="flex flex-col items-center gap-0.5">
                            <p class="text-xs font-medium">No formats found</p>
                            <p class="text-[11px]">Try a different search term</p>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!confirmDestructive(`clear-all-${cardKey}` as Str)) return;
                    const captures: ScreenshotCapture[] = cardScreenshots[cardKey] ?? [];
                    for (const c of captures) URL.revokeObjectURL(c.imageUrl);
                    cardScreenshots[cardKey] = [];
                    /* Auto-close compare mode when clearing all screenshots */
                    cardScreenCompare[cardKey] = false;
                    delete cardCompareLeft[cardKey];
                    delete cardCompareRight[cardKey];
                  }}
                  variant="destructive"
                >
                  <Trash2 class="size-4" />
                  {pendingDestructiveAction[`clear-all-${cardKey}`]
                    ? 'Confirm Clear All'
                    : 'Clear All'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
        {#if cardScreenshotsOpen[cardKey] ?? true}
          {#if (cardScreenCompare[cardKey] ?? false) && (cardScreenshots[cardKey] ?? []).length >= 2}
            <!-- Compare view: side-by-side slider with selectable screenshots -->
            {@const allCaptures = cardScreenshots[cardKey] ?? []}
            {@const leftIdx = Math.min(
              cardCompareLeft[cardKey] ?? ((allCaptures.length - 2) as Num),
              (allCaptures.length - 1) as Num,
            )}
            {@const rightIdx = Math.min(
              cardCompareRight[cardKey] ?? ((allCaptures.length - 1) as Num),
              (allCaptures.length - 1) as Num,
            )}
            {#if allCaptures[leftIdx] && allCaptures[rightIdx]}
              {@const leftCapture = allCaptures[leftIdx]}
              {@const rightCapture = allCaptures[rightIdx]}
              <div class="p-3" transition:slide={{ duration: 200 }}>
                <div
                  class="mx-auto max-w-2xl overflow-hidden rounded-md border bg-background shadow-sm"
                >
                  <!-- Compare header with searchable dropdown selectors -->
                  <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                    <div class="flex items-center gap-1.5">
                      <!-- Left selector -->
                      <DropdownMenu.Root
                        onOpenChange={(open) => {
                          if (open) compareLeftSearch = '' as Str;
                        }}
                      >
                        <DropdownMenu.Trigger>
                          {#snippet child({ props: leftTrigProps })}
                            <button
                              {...leftTrigProps}
                              type="button"
                              class="inline-flex items-center gap-1 rounded border bg-transparent px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:bg-muted"
                            >
                              {#if leftCapture.source === 'ios-simulator'}
                                <Apple class="size-3 text-muted-foreground" aria-hidden="true" />
                              {:else if leftCapture.source === 'android-emulator'}
                                <Bot class="size-3 text-muted-foreground" aria-hidden="true" />
                              {:else}
                                <Chrome class="size-3 text-muted-foreground" aria-hidden="true" />
                              {/if}
                              <span class="max-w-24 truncate"
                                >#{leftIdx + 1} {leftCapture.browserDisplayName}</span
                              >
                              <ChevronDown
                                class="size-3 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </button>
                          {/snippet}
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content class="flex max-h-64 w-64 flex-col overflow-hidden">
                          <div class="shrink-0 px-2 pb-1.5 pt-1">
                            <div
                              class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                            >
                              <Search
                                class="size-3 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <input
                                type="text"
                                placeholder="Search screenshots..."
                                class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                bind:value={compareLeftSearch}
                                onkeydown={(e) => e.stopPropagation()}
                                onkeyup={(e) => e.stopPropagation()}
                                onkeypress={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                            {#each allCaptures
                              .map( (cap, i) => ({ cap, idx: i, label: `#${i + 1} ${cap.browserDisplayName}${cap.device !== 'custom' ? ` · ${cap.device}` : ''}` }), )
                              .filter(({ label }) => !compareLeftSearch || label
                                    .toLowerCase()
                                    .includes(compareLeftSearch.toLowerCase())) as { cap, idx, label } (cap.timestamp)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  if (idx === rightIdx) return;
                                  cardCompareLeft[cardKey] = idx as Num;
                                }}
                                disabled={idx === rightIdx}
                                class={cn(idx === rightIdx && 'opacity-40')}
                              >
                                <Check class={cn('size-4', leftIdx !== idx && 'opacity-0')} />
                                {#if cap.source === 'ios-simulator'}
                                  <Apple class="size-3 text-muted-foreground" aria-hidden="true" />
                                {:else if cap.source === 'android-emulator'}
                                  <Bot class="size-3 text-muted-foreground" aria-hidden="true" />
                                {:else}
                                  <Chrome class="size-3 text-muted-foreground" aria-hidden="true" />
                                {/if}
                                <span class="flex-1 truncate text-[11px]">{label}</span>
                                {#if idx === rightIdx}
                                  <span class="text-[9px] italic text-muted-foreground/40">R</span>
                                {:else}
                                  <span class="text-[9px] text-muted-foreground/40"
                                    >{relativeTime(cap.timestamp)}</span
                                  >
                                {/if}
                              </DropdownMenu.Item>
                            {:else}
                              <div
                                class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                              >
                                <SearchX class="size-5" />
                                <div class="flex flex-col items-center gap-0.5">
                                  <p class="text-xs font-medium">No screenshots found</p>
                                  <p class="text-[11px]">Try a different search term</p>
                                </div>
                              </div>
                            {/each}
                          </div>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: swapTipProps })}
                            <button
                              {...swapTipProps}
                              type="button"
                              class="rounded p-0.5 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
                              onclick={() => {
                                const tmpLeft: Num | undefined = cardCompareLeft[cardKey];
                                const tmpRight: Num | undefined = cardCompareRight[cardKey];
                                cardCompareLeft[cardKey] =
                                  tmpRight ?? ((allCaptures.length - 1) as Num);
                                cardCompareRight[cardKey] =
                                  tmpLeft ?? ((allCaptures.length - 2) as Num);
                              }}
                              aria-label="Swap left and right"
                            >
                              <ArrowLeftRight class="size-3" aria-hidden="true" />
                            </button>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4}
                          >Swap left and right</Tooltip.Content
                        >
                      </Tooltip.Root>
                      <!-- Right selector -->
                      <DropdownMenu.Root
                        onOpenChange={(open) => {
                          if (open) compareRightSearch = '' as Str;
                        }}
                      >
                        <DropdownMenu.Trigger>
                          {#snippet child({ props: rightTrigProps })}
                            <button
                              {...rightTrigProps}
                              type="button"
                              class="inline-flex items-center gap-1 rounded border bg-transparent px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:bg-muted"
                            >
                              {#if rightCapture.source === 'ios-simulator'}
                                <Apple class="size-3 text-muted-foreground" aria-hidden="true" />
                              {:else if rightCapture.source === 'android-emulator'}
                                <Bot class="size-3 text-muted-foreground" aria-hidden="true" />
                              {:else}
                                <Chrome class="size-3 text-muted-foreground" aria-hidden="true" />
                              {/if}
                              <span class="max-w-24 truncate"
                                >#{rightIdx + 1} {rightCapture.browserDisplayName}</span
                              >
                              <ChevronDown
                                class="size-3 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </button>
                          {/snippet}
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content class="flex max-h-64 w-64 flex-col overflow-hidden">
                          <div class="shrink-0 px-2 pb-1.5 pt-1">
                            <div
                              class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                            >
                              <Search
                                class="size-3 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <input
                                type="text"
                                placeholder="Search screenshots..."
                                class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                bind:value={compareRightSearch}
                                onkeydown={(e) => e.stopPropagation()}
                                onkeyup={(e) => e.stopPropagation()}
                                onkeypress={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                            {#each allCaptures
                              .map( (cap, i) => ({ cap, idx: i, label: `#${i + 1} ${cap.browserDisplayName}${cap.device !== 'custom' ? ` · ${cap.device}` : ''}` }), )
                              .filter(({ label }) => !compareRightSearch || label
                                    .toLowerCase()
                                    .includes(compareRightSearch.toLowerCase())) as { cap, idx, label } (cap.timestamp)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  if (idx === leftIdx) return;
                                  cardCompareRight[cardKey] = idx as Num;
                                }}
                                disabled={idx === leftIdx}
                                class={cn(idx === leftIdx && 'opacity-40')}
                              >
                                <Check class={cn('size-4', rightIdx !== idx && 'opacity-0')} />
                                {#if cap.source === 'ios-simulator'}
                                  <Apple class="size-3 text-muted-foreground" aria-hidden="true" />
                                {:else if cap.source === 'android-emulator'}
                                  <Bot class="size-3 text-muted-foreground" aria-hidden="true" />
                                {:else}
                                  <Chrome class="size-3 text-muted-foreground" aria-hidden="true" />
                                {/if}
                                <span class="flex-1 truncate text-[11px]">{label}</span>
                                {#if idx === leftIdx}
                                  <span class="text-[9px] italic text-muted-foreground/40">L</span>
                                {:else}
                                  <span class="text-[9px] text-muted-foreground/40"
                                    >{relativeTime(cap.timestamp)}</span
                                  >
                                {/if}
                              </DropdownMenu.Item>
                            {:else}
                              <div
                                class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                              >
                                <SearchX class="size-5" />
                                <div class="flex flex-col items-center gap-0.5">
                                  <p class="text-xs font-medium">No screenshots found</p>
                                  <p class="text-[11px]">Try a different search term</p>
                                </div>
                              </div>
                            {/each}
                          </div>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: sliderTipProps })}
                            <span
                              {...sliderTipProps}
                              class="cursor-default text-[9px] tabular-nums text-muted-foreground/50"
                            >
                              {cardComparePosition[cardKey] ?? 50}%
                            </span>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4}>Slider position</Tooltip.Content>
                      </Tooltip.Root>
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: tipProps })}
                            <button
                              {...tipProps}
                              type="button"
                              class="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                              onclick={async () => {
                                const pos: Num = (cardComparePosition[cardKey] ?? 50) as Num;
                                lightboxUrl = await compositeCompareImage(
                                  leftCapture.imageUrl,
                                  rightCapture.imageUrl,
                                  pos,
                                );
                                lightboxCardKey = null;
                              }}
                              aria-label="View compare full size"
                            >
                              <ZoomIn class="size-3.5" aria-hidden="true" />
                            </button>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4}
                          >View compare full size</Tooltip.Content
                        >
                      </Tooltip.Root>
                      <!-- Export submenu for compare -->
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          {#snippet child({ props: menuProps })}
                            <button
                              {...menuProps}
                              type="button"
                              class="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                              aria-label="Compare export options"
                            >
                              <EllipsisVertical class="size-3.5" />
                            </button>
                          {/snippet}
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" class="w-52">
                          <DropdownMenu.Sub
                            onOpenChange={(open) => {
                              if (open) compareExportSearchQuery = '' as Str;
                            }}
                          >
                            <DropdownMenu.SubTrigger>
                              <Download class="size-4" />
                              Export Compare
                            </DropdownMenu.SubTrigger>
                            <DropdownMenu.SubContent
                              class="flex max-h-[28rem] w-64 flex-col overflow-hidden"
                            >
                              <div class="shrink-0 px-2 pb-1.5 pt-1">
                                <div
                                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                                >
                                  <Search
                                    class="size-3 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Search formats..."
                                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                    bind:value={compareExportSearchQuery}
                                    onkeydown={(e) => e.stopPropagation()}
                                    onkeyup={(e) => e.stopPropagation()}
                                    onkeypress={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div
                                class="flex min-h-0 flex-1 flex-col overflow-y-auto"
                                use:lockHeight
                              >
                                {#each filteredCompareExportCategories as category (category)}
                                  {#if filteredCompareExportCategories.indexOf(category) > 0}
                                    <DropdownMenu.Separator />
                                  {/if}
                                  <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                                    {#if category === 'Clipboard'}
                                      <Clipboard class="size-3 text-muted-foreground" />
                                    {:else if category === 'File'}
                                      <Download class="size-3 text-muted-foreground" />
                                    {/if}
                                    {category}
                                  </DropdownMenu.Label>
                                  {#each filteredCompareExportItems.filter((i) => i.category === category) as item (item.id)}
                                    <DropdownMenu.Item
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        const pos: Num = (cardComparePosition[cardKey] ??
                                          50) as Num;
                                        handleCompareExport(
                                          leftCapture.imageUrl,
                                          rightCapture.imageUrl,
                                          pos,
                                          leftCapture,
                                          rightCapture,
                                          item.id,
                                          `compare-${cardKey}` as Str,
                                        );
                                      }}
                                    >
                                      {#if screenshotExportFeedback[`compare-${cardKey}`] === item.id}
                                        <span in:fade={{ duration: 150 }}
                                          ><Check class="size-4 text-green-500" /></span
                                        >
                                      {:else}
                                        <item.icon class="size-4" />
                                      {/if}
                                      <div class="flex min-w-0 flex-1 flex-col">
                                        <span class="flex items-center gap-2">
                                          <span class="truncate">{item.label}</span>
                                          {#if item.ext}
                                            <code
                                              class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                                              >{item.ext}</code
                                            >
                                          {/if}
                                        </span>
                                        <span
                                          class="text-[10px] leading-tight text-muted-foreground"
                                          >{item.description}</span
                                        >
                                      </div>
                                    </DropdownMenu.Item>
                                  {/each}
                                {:else}
                                  <div
                                    class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                                  >
                                    <SearchX class="size-5" />
                                    <div class="flex flex-col items-center gap-0.5">
                                      <p class="text-xs font-medium">No formats found</p>
                                      <p class="text-[11px]">Try a different search term</p>
                                    </div>
                                  </div>
                                {/each}
                              </div>
                            </DropdownMenu.SubContent>
                          </DropdownMenu.Sub>
                          <DropdownMenu.Item
                            onSelect={async () => {
                              const pos: Num = (cardComparePosition[cardKey] ?? 50) as Num;
                              const url: Str = await compositeCompareImage(
                                leftCapture.imageUrl,
                                rightCapture.imageUrl,
                                pos,
                              );
                              window.open(url, '_blank');
                            }}
                          >
                            <ExternalLink class="size-4" />
                            Open in New Tab
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={() => {
                              const pos: Num = (cardComparePosition[cardKey] ?? 50) as Num;
                              copyCompareInfo(
                                leftCapture,
                                rightCapture,
                                leftIdx as Num,
                                rightIdx as Num,
                                pos,
                              );
                            }}
                          >
                            <ClipboardCopy class="size-4" />
                            Copy Compare Info
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item
                            onSelect={() => {
                              cardComparePosition[cardKey] = 50 as Num;
                            }}
                          >
                            <RotateCcw class="size-4" />
                            Reset Slider
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                  </div>
                  <!-- Slider viewport — both images positioned identically, left is clipped -->
                  <div class="relative overflow-hidden" style="height: clamp(200px, 40vw, 480px);">
                    <!-- Right image (background, full width) -->
                    <img
                      src={rightCapture.imageUrl}
                      alt="Right: #{rightIdx + 1} {rightCapture.browserDisplayName}"
                      class="absolute inset-0 h-full w-full object-contain"
                    />
                    <!-- Left image (foreground, clipped by slider) -->
                    <div
                      class="absolute inset-0 overflow-hidden"
                      style="clip-path: inset(0 {100 - (cardComparePosition[cardKey] ?? 50)}% 0 0);"
                    >
                      <img
                        src={leftCapture.imageUrl}
                        alt="Left: #{leftIdx + 1} {leftCapture.browserDisplayName}"
                        class="absolute inset-0 h-full w-full object-contain"
                      />
                    </div>
                    <!-- L/R side labels -->
                    <span
                      class="pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/80"
                      >L</span
                    >
                    <span
                      class="pointer-events-none absolute right-2 top-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/80"
                      >R</span
                    >
                    <!-- Slider handle -->
                    <div
                      class="absolute inset-y-0 z-10 w-0.5 bg-primary shadow-sm"
                      style="left: {cardComparePosition[cardKey] ?? 50}%;"
                    >
                      <div
                        class="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm"
                      >
                        <SplitSquareHorizontal class="size-3 text-muted-foreground" />
                      </div>
                    </div>
                    <!-- Invisible slider input with Shift+Arrow for 10% jumps -->
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cardComparePosition[cardKey] ?? 50}
                      oninput={(e) => {
                        cardComparePosition[cardKey] = Number(
                          (e.target as HTMLInputElement).value,
                        ) as Num;
                      }}
                      onkeydown={(e) => {
                        if (!e.shiftKey) return;
                        const cur: Num = (cardComparePosition[cardKey] ?? 50) as Num;
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          cardComparePosition[cardKey] = Math.max(0, (cur as number) - 10) as Num;
                        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          cardComparePosition[cardKey] = Math.min(100, (cur as number) + 10) as Num;
                        }
                      }}
                      class="absolute inset-0 z-20 size-full cursor-col-resize opacity-0"
                      aria-label="Compare slider — Shift+Arrow for 10% jumps"
                    />
                  </div>
                </div>
              </div>
            {/if}
          {/if}
          <div
            class="flex max-h-[32rem] flex-wrap gap-3 overflow-y-auto p-3"
            transition:slide={{ duration: 200 }}
          >
            {#if cardScreenError[cardKey]}
              <!-- Error feedback card -->
              <div class="flex w-full items-center justify-center">
                <div
                  class="w-[30rem] overflow-hidden rounded-md border border-destructive/30 bg-destructive/5 shadow-sm"
                >
                  <div class="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <TriangleAlert class="size-5 text-destructive" aria-hidden="true" />
                    <p class="text-xs font-medium text-destructive">Screenshot failed</p>
                    <p class="max-w-56 text-[11px] leading-snug text-muted-foreground">
                      {cardScreenError[cardKey]}
                    </p>
                    <button
                      type="button"
                      class="mt-1 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      onclick={() => {
                        cardScreenError[cardKey] = '' as Str;
                        captureScreenshot(cardKey, variantKey, variantOption);
                      }}
                    >
                      <RefreshCw class="size-3" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            {/if}
            {#if cardScreenCapturing[cardKey]}
              <!-- Per-engine loading placeholder cards -->
              {@const capturingSources = cardCapturingSources[cardKey] ?? new Set()}
              {@const sourcesToShow =
                capturingSources.size > 0
                  ? [...capturingSources]
                  : [cardScreenSource[cardKey] || 'playwright']}
              {#each sourcesToShow as placeholderSource (placeholderSource)}
                <div
                  class="w-[30rem] overflow-hidden rounded-md border bg-background shadow-sm"
                  transition:fade={{ duration: 150 }}
                >
                  <div class="flex items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
                    {#if placeholderSource === 'ios-simulator'}
                      <Apple class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {:else if placeholderSource === 'android-emulator'}
                      <Bot class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {:else}
                      <Chrome class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {/if}
                    <!-- Skeleton #N badge (matches real card's py-0.5 badge height) -->
                    <span
                      class="rounded bg-muted px-1 py-0.5 text-[8px] font-semibold leading-none text-muted-foreground/40"
                    >
                      <LoaderCircle class="inline size-2.5 animate-spin" aria-hidden="true" />
                    </span>
                    <span class="text-[11px] font-semibold text-muted-foreground">
                      {placeholderSource === 'ios-simulator'
                        ? 'Capturing iOS Safari…'
                        : placeholderSource === 'android-emulator'
                          ? 'Capturing Android Chrome…'
                          : 'Capturing Chromium…'}
                    </span>
                    <!-- Spacer + skeleton timestamp + action button placeholders to match real card header height -->
                    <span class="ml-auto h-2.5 w-10 animate-pulse rounded bg-muted/30"></span>
                    <div class="flex items-center gap-0.5">
                      <span class="rounded p-1"
                        ><span class="block size-3.5 animate-pulse rounded bg-muted/20"
                        ></span></span
                      >
                      <span class="rounded p-1"
                        ><span class="block size-3.5 animate-pulse rounded bg-muted/20"
                        ></span></span
                      >
                      <span class="rounded p-1"
                        ><span class="block size-3.5 animate-pulse rounded bg-muted/20"
                        ></span></span
                      >
                    </div>
                  </div>
                  <!-- Skeleton image area — sized to match expected screenshot aspect ratio -->
                  <div
                    class="animate-pulse bg-muted/10"
                    style="height: {estimateScreenshotHeight(cardKey)}; max-height: 24rem;"
                  ></div>
                </div>
              {/each}
            {/if}
            {#each cardScreenshots[cardKey] ?? [] as capture, idx (capture.timestamp)}
              <div class="w-[30rem] overflow-hidden rounded-md border bg-background shadow-sm">
                <!-- Header: source badge + browser name + version + device + delete -->
                <div class="flex items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
                  {#if capture.source === 'ios-simulator'}
                    <Apple class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {:else if capture.source === 'android-emulator'}
                    <Bot class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {:else}
                    <Chrome class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {/if}
                  <span
                    class="rounded bg-muted px-1 py-0.5 text-[8px] font-semibold tabular-nums leading-none text-muted-foreground"
                    >#{idx + 1}</span
                  >
                  {#if capture.source !== 'playwright'}
                    <span
                      class="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-semibold uppercase leading-none text-primary/80"
                      >{capture.source === 'ios-simulator' ? 'iOS' : 'Android'}</span
                    >
                  {/if}
                  <span class="text-[11px] font-semibold text-foreground"
                    >{capture.browserDisplayName}</span
                  >
                  {#if capture.browserVersion}
                    <span class="text-[10px] text-muted-foreground/60"
                      >v{capture.browserVersion}</span
                    >
                  {/if}
                  {#if capture.device !== 'custom'}
                    <span class="text-[10px] text-muted-foreground/60">· {capture.device}</span>
                  {/if}
                  {#if capture.deviceOS}
                    <span class="rounded bg-muted px-1 text-[9px] text-muted-foreground/70"
                      >{capture.deviceOS}</span
                    >
                  {/if}
                  <!-- Capture timestamp -->
                  <span class="ml-auto text-[9px] tabular-nums text-muted-foreground/40">
                    {relativeTime(capture.timestamp)}
                  </span>
                  <div class="flex items-center gap-0.5">
                    <!-- Recapture button -->
                    <Tooltip.Provider>
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: recapProps })}
                            <button
                              type="button"
                              {...recapProps}
                              class="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                              disabled={cardScreenCapturing[cardKey]}
                              onclick={() => {
                                /* Recapture with same source/browser/device */
                                cardScreenSource[cardKey] = capture.source;
                                if (capture.source === 'playwright') {
                                  cardScreenBrowser[cardKey] = capture.browser;
                                }
                                cardScreenDevice[cardKey] =
                                  capture.device === 'custom' ? ('' as Str) : capture.device;
                                captureScreenshot(cardKey, variantKey, variantOption);
                              }}
                              aria-label="New capture with same settings"
                            >
                              <RefreshCw class="size-3.5" aria-hidden="true" />
                            </button>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4}>
                          New capture (same settings)
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                    <!-- Performance popover (toolbar) -->
                    {#if Object.keys(capture.performance).length > 0}
                      <Popover.Root>
                        <Popover.Trigger>
                          <button
                            type="button"
                            class="rounded p-1 text-emerald-500 transition-colors hover:bg-muted"
                            aria-label="Performance statistics"
                          >
                            <Activity class="size-3.5" aria-hidden="true" />
                          </button>
                        </Popover.Trigger>
                        <Popover.Content side="bottom" align="end" class="w-64 p-0">
                          <div class="flex items-center gap-1.5 border-b px-3 py-2">
                            <Activity class="size-3 text-muted-foreground" aria-hidden="true" />
                            <h4 class="text-xs font-semibold">Performance</h4>
                          </div>
                          <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 px-3 py-2">
                            {#if capture.performance.firstContentfulPaint != null}
                              <span class="text-[10px] text-muted-foreground">FCP</span>
                              <span
                                class={cn(
                                  'text-[10px] font-mono',
                                  (capture.performance.firstContentfulPaint as Num) <= 1800
                                    ? 'text-emerald-500'
                                    : (capture.performance.firstContentfulPaint as Num) <= 3000
                                      ? 'text-amber-500'
                                      : 'text-red-500',
                                )}>{capture.performance.firstContentfulPaint}ms</span
                              >
                            {/if}
                            {#if capture.performance.firstPaint != null}
                              <span class="text-[10px] text-muted-foreground">First Paint</span>
                              <span
                                class={cn(
                                  'text-[10px] font-mono',
                                  (capture.performance.firstPaint as Num) <= 1000
                                    ? 'text-emerald-500'
                                    : (capture.performance.firstPaint as Num) <= 2500
                                      ? 'text-amber-500'
                                      : 'text-red-500',
                                )}>{capture.performance.firstPaint}ms</span
                              >
                            {/if}
                            {#if capture.performance.domContentLoaded != null}
                              <span class="text-[10px] text-muted-foreground">DCL</span>
                              <span
                                class={cn(
                                  'text-[10px] font-mono',
                                  (capture.performance.domContentLoaded as Num) <= 1500
                                    ? 'text-emerald-500'
                                    : (capture.performance.domContentLoaded as Num) <= 3000
                                      ? 'text-amber-500'
                                      : 'text-red-500',
                                )}>{capture.performance.domContentLoaded}ms</span
                              >
                            {/if}
                            {#if capture.performance.load != null}
                              <span class="text-[10px] text-muted-foreground">Load</span>
                              <span
                                class={cn(
                                  'text-[10px] font-mono',
                                  (capture.performance.load as Num) <= 2500
                                    ? 'text-emerald-500'
                                    : (capture.performance.load as Num) <= 4000
                                      ? 'text-amber-500'
                                      : 'text-red-500',
                                )}>{capture.performance.load}ms</span
                              >
                            {/if}
                            {#if capture.performance.domInteractive != null}
                              <span class="text-[10px] text-muted-foreground">Interactive</span>
                              <span
                                class={cn(
                                  'text-[10px] font-mono',
                                  (capture.performance.domInteractive as Num) <= 1500
                                    ? 'text-emerald-500'
                                    : (capture.performance.domInteractive as Num) <= 3000
                                      ? 'text-amber-500'
                                      : 'text-red-500',
                                )}>{capture.performance.domInteractive}ms</span
                              >
                            {/if}
                            {#if capture.performance.responseEnd != null}
                              <span class="text-[10px] text-muted-foreground">TTFB</span>
                              <span
                                class={cn(
                                  'text-[10px] font-mono',
                                  (capture.performance.responseEnd as Num) <= 800
                                    ? 'text-emerald-500'
                                    : (capture.performance.responseEnd as Num) <= 1800
                                      ? 'text-amber-500'
                                      : 'text-red-500',
                                )}>{capture.performance.responseEnd}ms</span
                              >
                            {/if}
                          </div>
                        </Popover.Content>
                      </Popover.Root>
                    {/if}
                    <!-- Console toggle (toolbar) -->
                    {#if capture.consoleLogs.length > 0}
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tipProps })}
                              <button
                                type="button"
                                {...tipProps}
                                class={cn(
                                  'rounded p-1 transition-colors',
                                  (screenshotConsoleExpanded[`${cardKey}-${capture.timestamp}`] ??
                                    false)
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground',
                                )}
                                onclick={() => {
                                  screenshotConsoleExpanded[`${cardKey}-${capture.timestamp}`] = !(
                                    screenshotConsoleExpanded[`${cardKey}-${capture.timestamp}`] ??
                                    false
                                  );
                                }}
                                aria-expanded={screenshotConsoleExpanded[
                                  `${cardKey}-${capture.timestamp}`
                                ] ?? false}
                              >
                                <Terminal class="size-3.5" aria-hidden="true" />
                                {#if capture.consoleLogs.some((l) => l.level === 'error')}
                                  <span
                                    class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-red-500"
                                  ></span>
                                {/if}
                              </button>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="top" sideOffset={4}>
                            {(screenshotConsoleExpanded[`${cardKey}-${capture.timestamp}`] ?? false)
                              ? 'Hide console'
                              : `Show console (${capture.consoleLogs.length})`}
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    {/if}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        {#snippet child({ props: menuProps })}
                          <button
                            {...menuProps}
                            type="button"
                            class="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Screenshot options"
                          >
                            <EllipsisVertical class="size-3.5" />
                          </button>
                        {/snippet}
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end" class="w-48">
                        <DropdownMenu.Sub
                          onOpenChange={(open) => {
                            if (open) screenshotExportSearchQuery = '';
                          }}
                        >
                          <DropdownMenu.SubTrigger>
                            <Download class="size-4" />
                            Export
                          </DropdownMenu.SubTrigger>
                          <DropdownMenu.SubContent
                            class="flex max-h-[28rem] w-64 flex-col overflow-hidden"
                          >
                            <div class="shrink-0 px-2 pb-1.5 pt-1">
                              <div
                                class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                              >
                                <Search
                                  class="size-3 shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                                <input
                                  type="text"
                                  placeholder="Search formats..."
                                  class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                  bind:value={screenshotExportSearchQuery}
                                  onkeydown={(e) => e.stopPropagation()}
                                  onkeyup={(e) => e.stopPropagation()}
                                  onkeypress={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div
                              class="flex min-h-0 flex-1 flex-col overflow-y-auto"
                              use:lockHeight
                            >
                              {#each filteredScreenshotExportCategories as category (category)}
                                {#if filteredScreenshotExportCategories.indexOf(category) > 0}
                                  <DropdownMenu.Separator />
                                {/if}
                                <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
                                  {#if category === 'Clipboard'}
                                    <Clipboard class="size-3 text-muted-foreground" />
                                  {:else if category === 'File'}
                                    <Download class="size-3 text-muted-foreground" />
                                  {/if}
                                  {category}
                                </DropdownMenu.Label>
                                {#each filteredScreenshotExportItems.filter((i) => i.category === category) as item (item.id)}
                                  <DropdownMenu.Item
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleScreenshotExport(capture, item.id, cardKey);
                                    }}
                                  >
                                    {#if screenshotExportFeedback[cardKey] === item.id}
                                      <span in:fade={{ duration: 150 }}
                                        ><Check class="size-4 text-green-500" /></span
                                      >
                                    {:else}
                                      <item.icon class="size-4" />
                                    {/if}
                                    <div class="flex min-w-0 flex-1 flex-col">
                                      <span class="flex items-center gap-2">
                                        <span class="truncate">{item.label}</span>
                                        {#if item.ext}
                                          <code
                                            class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                                            >{item.ext}</code
                                          >
                                        {/if}
                                      </span>
                                      <span class="text-[10px] leading-tight text-muted-foreground"
                                        >{item.description}</span
                                      >
                                    </div>
                                  </DropdownMenu.Item>
                                {/each}
                              {:else}
                                <div
                                  class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                                >
                                  <SearchX class="size-5" />
                                  <div class="flex flex-col items-center gap-0.5">
                                    <p class="text-xs font-medium">No formats found</p>
                                    <p class="text-[11px]">Try a different search term</p>
                                  </div>
                                </div>
                              {/each}
                            </div>
                          </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                        <DropdownMenu.Item
                          onSelect={() => {
                            window.open(capture.imageUrl, '_blank');
                          }}
                        >
                          <ExternalLink class="size-4" />
                          Open in New Tab
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onSelect={(e) => {
                            e.preventDefault();
                            copyScreenshotInfo(capture, idx as Num, `${cardKey}-${idx}` as Str);
                          }}
                        >
                          {#if copyImageInfoFeedback === `${cardKey}-${idx}`}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="size-4 text-green-500" /></span
                            >
                          {:else}
                            <ClipboardCopy class="size-4" />
                          {/if}
                          Copy Image Info
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onSelect={() => {
                            cardScreenSource[cardKey] = capture.source;
                            cardScreenBrowser[cardKey] = capture.browser;
                            cardScreenDevice[cardKey] = capture.device;
                            captureScreenshot(cardKey, variantKey, variantOption);
                          }}
                        >
                          <RefreshCw class="size-4" />
                          New Capture (Same Settings)
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          onSelect={(e) => {
                            e.preventDefault();
                            if (!confirmDestructive(`delete-${cardKey}-${idx}` as Str)) return;
                            removeScreenshot(cardKey, idx as Num);
                          }}
                          variant="destructive"
                        >
                          <Trash2 class="size-4" />
                          {pendingDestructiveAction[`delete-${cardKey}-${idx}`]
                            ? 'Confirm Delete'
                            : 'Delete'}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>
                </div>
                <!-- Screenshot image -->
                <div class="relative border-b">
                  {#if showDeviceFrame && capture.deviceFrame}
                    <!-- Device frame compositing -->
                    <button
                      type="button"
                      class="block w-full cursor-zoom-in p-2"
                      onclick={() => {
                        lightboxUrl = capture.imageUrl;
                        lightboxCardKey = cardKey;
                        lightboxIdx = idx as Num;
                      }}
                    >
                      <div
                        class="relative mx-auto"
                        style="width: {capture.deviceFrame.screenRegion.width +
                          capture.deviceFrame.screenRegion.x * 2}px; max-width: 100%;"
                      >
                        <img
                          src={capture.deviceFrame.frameId}
                          alt="Device frame"
                          class="pointer-events-none relative z-10 block w-full"
                        />
                        <img
                          src={capture.imageUrl}
                          alt="{cardKey} screenshot — {capture.browserDisplayName} {capture.device}"
                          class="absolute object-cover"
                          style="top: {capture.deviceFrame.screenRegion.y}px; left: {capture
                            .deviceFrame.screenRegion.x}px; width: {capture.deviceFrame.screenRegion
                            .width}px; height: {capture.deviceFrame.screenRegion.height}px;"
                        />
                      </div>
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="block w-full cursor-zoom-in"
                      onclick={() => {
                        lightboxUrl = capture.imageUrl;
                        lightboxCardKey = cardKey;
                        lightboxIdx = idx as Num;
                      }}
                    >
                      <img
                        src={capture.imageUrl}
                        alt="{cardKey} screenshot — {capture.browserDisplayName} {capture.device}"
                        class="max-h-96 w-full object-contain"
                      />
                    </button>
                  {/if}
                  {#if showSafeAreaOverlay && capture.source === 'ios-simulator' && capture.safeAreaInsets}
                    <!-- Safe area inset overlay (colored regions) -->
                    <div class="pointer-events-none absolute inset-0">
                      <!-- Top inset -->
                      {#if (capture.safeAreaInsets.top as number) > 0}
                        <div
                          class="absolute inset-x-0 top-0 bg-blue-500/20 border-b border-blue-500/40"
                          style="height: {capture.safeAreaInsets.top}px"
                        ></div>
                      {/if}
                      <!-- Bottom inset -->
                      {#if (capture.safeAreaInsets.bottom as number) > 0}
                        <div
                          class="absolute inset-x-0 bottom-0 bg-orange-500/20 border-t border-orange-500/40"
                          style="height: {capture.safeAreaInsets.bottom}px"
                        ></div>
                      {/if}
                    </div>
                  {/if}
                </div>

                <!-- Console logs (driven by toolbar toggle) -->
                {#if capture.consoleLogs.length > 0 && (screenshotConsoleExpanded[`${cardKey}-${capture.timestamp}`] ?? false)}
                  <div class="border-t px-2 py-1.5" transition:slide={{ duration: 200 }}>
                    <div class="mb-1 flex items-center gap-1.5">
                      <Terminal class="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <span class="text-xs font-semibold text-muted-foreground">Console</span>
                      <span class="text-[10px] text-muted-foreground/60"
                        >{capture.consoleLogs.length}</span
                      >
                    </div>
                    <div class="max-h-24 overflow-y-auto">
                      {#each capture.consoleLogs as entry (entry.text + entry.level)}
                        <div
                          class="flex gap-1.5 border-t border-dashed border-muted py-0.5 first:border-0"
                        >
                          <span
                            class="shrink-0 text-[9px] font-mono {entry.level === 'error'
                              ? 'text-red-500'
                              : entry.level === 'warn'
                                ? 'text-yellow-500'
                                : 'text-muted-foreground/60'}">{entry.level}</span
                          >
                          <span class="truncate text-[10px] font-mono text-muted-foreground"
                            >{entry.text}</span
                          >
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    <!-- Live View interactive canvas panel -->
    {#if livePreviewActive[cardKey]}
      {@const lvStatus: Str = liveViewStatus[cardKey] ?? ('connecting' as Str)}
      {@const lvFps: Num = liveViewFps[cardKey] ?? (0 as Num)}
      {@const lvLatency: Num = liveViewLatency[cardKey] ?? (0 as Num)}
      {@const lvEngine: Str = liveViewEngine[cardKey] ?? ('' as Str)}
      {@const lvCursor: Str = liveViewCursor[cardKey] ?? ('default' as Str)}
      {@const lvFullscreen: Bool = liveViewFullscreen[cardKey] ?? (false as Bool)}
      {@const lvW: Num = liveViewWidth[cardKey] ?? (1280 as Num)}
      {@const lvH: Num = liveViewHeight[cardKey] ?? (720 as Num)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={cn(
          'overflow-hidden bg-muted/20',
          lvFullscreen ? 'fixed inset-0 z-50 flex flex-col border-0' : 'border-t',
        )}
        onkeydown={(e) => handleFullscreenKeydown(e, cardKey)}
        transition:slide={{ duration: 200 }}
      >
        <!-- Live View header toolbar -->
        <div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
          <div class="flex items-center gap-2">
            <!-- Connection status dot -->
            <span
              class={cn(
                'inline-block size-2 rounded-full',
                lvStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : lvStatus === 'connecting' || lvStatus === 'reconnecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-red-500',
              )}
            ></span>
            <span class="text-xs font-semibold text-muted-foreground">Live View</span>
            <!-- Engine selector dropdown -->
            <select
              class="h-5 rounded border bg-muted px-1 text-[10px] font-medium text-muted-foreground outline-none"
              value={lvEngine}
              onchange={(e) => {
                const newEngine: Str = (e.currentTarget as HTMLSelectElement).value as Str;
                if (newEngine !== lvEngine && componentName) {
                  stopLiveView(cardKey);
                  startLiveView(cardKey, componentName, newEngine, 1280 as Num, 720 as Num);
                }
              }}
            >
              <option value="chromium">Chromium</option>
              <option value="firefox">Firefox</option>
              <option value="webkit">WebKit</option>
              <option value="android-emulator">Android</option>
            </select>
            <!-- scrcpy codec indicator for Android engine -->
            {#if lvEngine === 'android-emulator'}
              <span
                class={cn(
                  'rounded px-1 py-0.5 text-[9px] font-medium',
                  liveViewCodecMode[cardKey] === 'h264'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {liveViewCodecMode[cardKey] === 'h264' ? 'H.264' : 'JPEG'}
              </span>
            {/if}
            <!-- FPS counter -->
            {#if (lvFps as number) > 0}
              <span class="text-[10px] tabular-nums text-muted-foreground/60">
                {lvFps} fps
              </span>
            {/if}
            <!-- Latency -->
            {#if (lvLatency as number) > 0}
              <span class="text-[10px] tabular-nums text-muted-foreground/60">
                {lvLatency}ms
              </span>
            {/if}
            <!-- Resolution badge -->
            <span
              class="rounded bg-muted px-1 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground"
            >
              {lvW}&times;{lvH}
            </span>
            <!-- Viewport preset selector -->
            <select
              class="h-5 rounded border bg-muted px-1 text-[10px] font-medium text-muted-foreground outline-none"
              value=""
              onchange={(e) => {
                const val: Str = (e.currentTarget as HTMLSelectElement).value as Str;
                if (!val || !componentName) return;
                const parts: string[] = (val as string).split('x');
                const w: Num = Number.parseInt(parts[0] ?? '1280', 10) as Num;
                const h: Num = Number.parseInt(parts[1] ?? '720', 10) as Num;
                stopLiveView(cardKey);
                startLiveView(
                  cardKey,
                  componentName,
                  liveViewEngine[cardKey] ?? ('chromium' as Str),
                  w,
                  h,
                );
                /* Reset select to placeholder */
                (e.currentTarget as HTMLSelectElement).value = '';
              }}
            >
              <option value="" disabled selected>Size</option>
              <option value="375x667">iPhone SE</option>
              <option value="390x844">iPhone 14</option>
              <option value="430x932">iPhone 15 Pro Max</option>
              <option value="768x1024">iPad</option>
              <option value="1280x720">720p</option>
              <option value="1920x1080">1080p</option>
            </select>
          </div>
          <div class="flex items-center gap-1">
            <!-- Capture screenshot from Live View -->
            <button
              type="button"
              class="inline-flex items-center rounded-md border p-1 text-muted-foreground transition-colors hover:bg-muted"
              onclick={() => captureLiveViewFrame(cardKey)}
              title="Capture screenshot from Live View"
            >
              <Camera class="size-3.5" aria-hidden="true" />
            </button>
            <!-- Touch simulation toggle -->
            <button
              type="button"
              class={cn(
                'inline-flex items-center rounded-md border p-1 transition-colors hover:bg-muted',
                liveViewTouchSim[cardKey]
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground',
              )}
              onclick={() => {
                liveViewTouchSim[cardKey] = !liveViewTouchSim[cardKey] as Bool;
              }}
              title={liveViewTouchSim[cardKey]
                ? 'Disable touch simulation'
                : 'Enable touch simulation (Shift+click for multi-touch)'}
            >
              <Smartphone class="size-3.5" aria-hidden="true" />
            </button>
            <!-- Fullscreen toggle -->
            <button
              type="button"
              class="inline-flex items-center rounded-md border p-1 text-muted-foreground transition-colors hover:bg-muted"
              onclick={() => toggleLiveViewFullscreen(cardKey)}
              title={lvFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {#if lvFullscreen}
                <Minimize2 class="size-3.5" aria-hidden="true" />
              {:else}
                <Maximize2 class="size-3.5" aria-hidden="true" />
              {/if}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              onclick={() => stopLiveView(cardKey)}
            >
              <Pause class="size-3.5" aria-hidden="true" />
              Stop
            </button>
          </div>
        </div>
        <!-- Interactive canvas -->
        <div
          class={cn(
            'relative flex items-center justify-center',
            lvFullscreen ? 'flex-1 bg-black p-0' : 'bg-black/5 p-3',
          )}
        >
          <!-- Reconnecting overlay -->
          {#if lvStatus === 'reconnecting' || lvStatus === 'error'}
            {@const attempt: Num = liveViewReconnectAttempt[cardKey] ?? (0 as Num)}
            <div
              class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              {#if lvStatus === 'reconnecting'}
                <div
                  class="mb-2 size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                ></div>
                <span class="text-xs font-medium text-white">Reconnecting...</span>
                <span class="mt-0.5 text-[10px] text-white/60">
                  Attempt {attempt}/{RECONNECT_MAX_ATTEMPTS}
                </span>
              {:else}
                <span class="mb-1 text-sm text-red-400">Connection lost</span>
                <button
                  type="button"
                  class="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs text-white transition-colors hover:bg-white/20"
                  onclick={() => {
                    if (componentName) {
                      liveViewReconnectAttempt[cardKey] = 0 as Num;
                      startLiveView(
                        cardKey,
                        componentName,
                        liveViewEngine[cardKey] ?? ('chromium' as Str),
                        1280 as Num,
                        720 as Num,
                      );
                    }
                  }}
                >
                  Retry
                </button>
              {/if}
            </div>
          {/if}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <canvas
            data-live-canvas={cardKey}
            class={cn(
              'object-contain',
              lvFullscreen ? 'h-full w-full' : 'max-h-[600px] max-w-full rounded border bg-white',
            )}
            style="cursor: {lvCursor};"
            tabindex="0"
            onmousedown={(e) => {
              const canvas: HTMLCanvasElement = e.currentTarget;
              const { x, y } = canvasToViewport(e, canvas);
              if (liveViewTouchSim[cardKey]) {
                const touches = [{ x, y, id: 0 }];
                /* Shift+click simulates a two-finger pinch (mirrored point) */
                if (e.shiftKey) {
                  touches.push({
                    x: (canvas.width as number) - (x as number),
                    y: (canvas.height as number) - (y as number),
                    id: 1,
                  });
                }
                sendLiveInput(cardKey, { type: 'touchStart', touches });
              } else {
                sendLiveInput(cardKey, {
                  type: 'mouseDown',
                  x,
                  y,
                  button: e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right',
                  modifiers: getModifiers(e),
                });
              }
            }}
            onmouseup={(e) => {
              const canvas: HTMLCanvasElement = e.currentTarget;
              const { x, y } = canvasToViewport(e, canvas);
              if (liveViewTouchSim[cardKey]) {
                const touches = [{ x, y, id: 0 }];
                if (e.shiftKey) {
                  touches.push({
                    x: (canvas.width as number) - (x as number),
                    y: (canvas.height as number) - (y as number),
                    id: 1,
                  });
                }
                sendLiveInput(cardKey, { type: 'touchEnd', touches });
              } else {
                sendLiveInput(cardKey, {
                  type: 'mouseUp',
                  x,
                  y,
                  button: e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right',
                  modifiers: getModifiers(e),
                });
              }
            }}
            onmousemove={(e) => {
              const canvas: HTMLCanvasElement = e.currentTarget;
              const { x, y } = canvasToViewport(e, canvas);
              if (liveViewTouchSim[cardKey] && e.buttons > 0) {
                const touches = [{ x, y, id: 0 }];
                if (e.shiftKey) {
                  touches.push({
                    x: (canvas.width as number) - (x as number),
                    y: (canvas.height as number) - (y as number),
                    id: 1,
                  });
                }
                sendLiveInput(cardKey, { type: 'touchMove', touches });
              } else if (!liveViewTouchSim[cardKey]) {
                sendBatchedMouseMove(cardKey, { type: 'mouseMove', x, y });
              }
            }}
            onclick={(e) => {
              if (liveViewTouchSim[cardKey]) return;
              const canvas: HTMLCanvasElement = e.currentTarget;
              const { x, y } = canvasToViewport(e, canvas);
              sendLiveInput(cardKey, {
                type: 'click',
                x,
                y,
                button: e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right',
                modifiers: getModifiers(e),
                clickCount: 1,
              });
            }}
            ondblclick={(e) => {
              if (liveViewTouchSim[cardKey]) return;
              const canvas: HTMLCanvasElement = e.currentTarget;
              const { x, y } = canvasToViewport(e, canvas);
              sendLiveInput(cardKey, { type: 'dblclick', x, y });
            }}
            onwheel={(e) => {
              e.preventDefault();
              const canvas: HTMLCanvasElement = e.currentTarget;
              const { x, y } = canvasToViewport(e, canvas);
              sendLiveInput(cardKey, {
                type: 'wheel',
                x,
                y,
                deltaX: e.deltaX,
                deltaY: e.deltaY,
              });
            }}
            onkeydown={(e) => {
              e.preventDefault();
              sendLiveInput(cardKey, {
                type: 'keyDown',
                key: e.key,
                code: e.code,
                modifiers: getModifiers(e),
              });
            }}
            onkeyup={(e) => {
              e.preventDefault();
              sendLiveInput(cardKey, {
                type: 'keyUp',
                key: e.key,
                code: e.code,
                modifiers: getModifiers(e),
              });
            }}
            ontouchstart={(e) => {
              e.preventDefault();
              const canvas: HTMLCanvasElement = e.currentTarget;
              const rect: DOMRect = canvas.getBoundingClientRect();
              const touches = Array.from(e.touches).map((t, i) => ({
                x: Math.round(((t.clientX - rect.left) / rect.width) * canvas.width),
                y: Math.round(((t.clientY - rect.top) / rect.height) * canvas.height),
                id: i,
              }));
              sendLiveInput(cardKey, { type: 'touchStart', touches });
            }}
            ontouchmove={(e) => {
              e.preventDefault();
              const canvas: HTMLCanvasElement = e.currentTarget;
              const rect: DOMRect = canvas.getBoundingClientRect();
              const touches = Array.from(e.touches).map((t, i) => ({
                x: Math.round(((t.clientX - rect.left) / rect.width) * canvas.width),
                y: Math.round(((t.clientY - rect.top) / rect.height) * canvas.height),
                id: i,
              }));
              sendLiveInput(cardKey, { type: 'touchMove', touches });
            }}
            ontouchend={(e) => {
              e.preventDefault();
              const canvas: HTMLCanvasElement = e.currentTarget;
              const rect: DOMRect = canvas.getBoundingClientRect();
              const touches = Array.from(e.changedTouches).map((t, i) => ({
                x: Math.round(((t.clientX - rect.left) / rect.width) * canvas.width),
                y: Math.round(((t.clientY - rect.top) / rect.height) * canvas.height),
                id: i,
              }));
              sendLiveInput(cardKey, { type: 'touchEnd', touches });
            }}
          ></canvas>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet errorCard(cardLabel: Str, error: unknown)}
  <div class="overflow-hidden rounded-md border border-dashed bg-background">
    <div class="border-b bg-muted/30 px-3 py-1.5">
      <code class="text-xs text-muted-foreground">{cardLabel}</code>
    </div>
    <LensError
      title="Render error"
      description={getErrorCause(error)}
      class="rounded-none border-0 py-4"
    />
    <div class="max-h-48 overflow-auto border-t bg-muted/20 text-xs">
      <CodeBlock code={serializeError(error)} lang="json" />
    </div>
  </div>
{/snippet}

{#if hasVariants}
  <!-- Variant mode: per-option cards -->
  <div class={cn('space-y-4', className)}>
    {#each (meta?.variants ?? []).filter((v) => v.key) as variantKey, vi (variantKey.key ?? `fallback-${vi}`)}
      {@const variantName: Str = variantKey.key}
      {@const options: Str[] = variantKey.options}
      <div class="grid gap-3">
        {#each options as option, oi (oi)}
          {@const baseVariantProps: Record<Str, unknown> = buildVariantProps(variantName, option, variantKey.coerce)}
          {@const requiresProps: Record<Str, unknown> = Object.fromEntries(
            (variantKey.requires ?? []).map((r) => [r.prop, r.value]),
          )}
          {@const requiredChildrenValue: Str = (requiresProps['children'] as Str) ?? ''}
          {@const filteredRequires: Record<Str, unknown> = requiredChildrenValue
            ? Object.fromEntries(Object.entries(requiresProps).filter(([k]) => k !== 'children'))
            : requiresProps}
          {@const variantProps: Record<Str, unknown> = { ...filteredRequires, ...baseVariantProps }}
          {@const cardKey: Str = `${variantName}:${option}`}
          {@const snippet: Str = codeSnippet(variantName, option)}
          <svelte:boundary>
            {@render card(
              option,
              cardKey,
              snippet,
              variantProps,
              isIconOption(option),
              variantName,
              option,
              requiredChildrenValue,
            )}
            {#snippet failed(error)}
              {@render errorCard(option, error)}
            {/snippet}
          </svelte:boundary>
        {/each}
      </div>
    {/each}
  </div>
{:else}
  <!-- Default mode: single card with base props -->
  <div class={cn('', className)}>
    <svelte:boundary>
      {@render card('default', 'default', codeSnippet('', ''), {}, false, '', '', '')}
      {#snippet failed(error)}
        {@render errorCard(label || componentName || 'default', error)}
      {/snippet}
    </svelte:boundary>
  </div>
{/if}

<!-- Screenshot lightbox overlay -->
{#if lightboxUrl}
  {@const lbCaptures = lightboxCardKey ? (cardScreenshots[lightboxCardKey] ?? []) : []}
  {@const lbHasPrev = (lightboxIdx as number) > 0}
  {@const lbHasNext = (lightboxIdx as number) < lbCaptures.length - 1}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onclick={() => {
      lightboxUrl = null;
      lightboxCardKey = null;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        lightboxUrl = null;
        lightboxCardKey = null;
      }
      if (e.key === 'ArrowLeft' && lbHasPrev) {
        lightboxIdx = ((lightboxIdx as number) - 1) as Num;
        const prev: ScreenshotCapture | undefined = lbCaptures[lightboxIdx];
        if (prev) lightboxUrl = prev.imageUrl;
      }
      if (e.key === 'ArrowRight' && lbHasNext) {
        lightboxIdx = ((lightboxIdx as number) + 1) as Num;
        const next: ScreenshotCapture | undefined = lbCaptures[lightboxIdx];
        if (next) lightboxUrl = next.imageUrl;
      }
    }}
    tabindex="-1"
    use:autoFocus
    transition:fade={{ duration: 150 }}
  >
    <!-- Close button with Esc tooltip -->
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger>
          {#snippet child({ props: closeTipProps })}
            <button
              {...closeTipProps}
              type="button"
              class="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onclick={() => {
                lightboxUrl = null;
                lightboxCardKey = null;
              }}
              aria-label="Close"
            >
              <X class="size-5" />
            </button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={4} class="z-[10001]">
          Close <kbd
            class="ml-1 rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono text-[10px]"
            >Esc</kbd
          >
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>

    <!-- Previous button -->
    {#if lbHasPrev}
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: prevTipProps })}
              <button
                {...prevTipProps}
                type="button"
                class="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                onclick={(e) => {
                  e.stopPropagation();
                  lightboxIdx = ((lightboxIdx as number) - 1) as Num;
                  const prev: ScreenshotCapture | undefined = lbCaptures[lightboxIdx];
                  if (prev) lightboxUrl = prev.imageUrl;
                }}
                aria-label="Previous screenshot"
              >
                <ChevronLeft class="size-5" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right" sideOffset={4} class="z-[10001]">
            Previous <kbd
              class="ml-1 rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono text-[10px]"
              >←</kbd
            >
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {/if}

    <!-- Next button -->
    {#if lbHasNext}
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: nextTipProps })}
              <button
                {...nextTipProps}
                type="button"
                class="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                onclick={(e) => {
                  e.stopPropagation();
                  lightboxIdx = ((lightboxIdx as number) + 1) as Num;
                  const next: ScreenshotCapture | undefined = lbCaptures[lightboxIdx];
                  if (next) lightboxUrl = next.imageUrl;
                }}
                aria-label="Next screenshot"
              >
                <ChevronRight class="size-5" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="left" sideOffset={4} class="z-[10001]">
            Next <kbd
              class="ml-1 rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono text-[10px]"
              >→</kbd
            >
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {/if}

    <button
      type="button"
      class="cursor-zoom-out border-0 bg-transparent p-0"
      onclick={(e) => {
        e.stopPropagation();
        lightboxUrl = null;
        lightboxCardKey = null;
      }}
      onkeydown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          lightboxUrl = null;
          lightboxCardKey = null;
        }
      }}
    >
      <img
        src={lightboxUrl}
        alt="Screenshot preview — click to close"
        class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
      />
    </button>
    <div class="absolute bottom-4 flex items-center gap-3">
      {#if lbCaptures.length > 1}
        <span
          class="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium tabular-nums text-white/70"
        >
          {(lightboxIdx as number) + 1} / {lbCaptures.length}
        </span>
      {/if}
      <a
        href={lightboxUrl}
        target="_blank"
        rel="noopener"
        class="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
        onclick={(e) => {
          e.stopPropagation();
        }}
      >
        <ExternalLink class="mr-1.5 inline size-3" aria-hidden="true" />
        Open in new tab
      </a>
    </div>
  </div>
{/if}

<style>
  /* ── Device viewport frame — uses theme CSS variables for dark/light/theme awareness ── */

  :global(.lens-device-frame) {
    background: color-mix(in oklch, var(--muted) 80%, black 20%);
    border: 3px solid var(--border);
    box-shadow:
      0 0 0 1px color-mix(in oklch, var(--border) 60%, black 40%),
      0 2px 4px oklch(0 0 0 / 0.2),
      0 12px 40px -8px oklch(0 0 0 / 0.3),
      inset 0 1px 0 color-mix(in oklch, var(--muted) 50%, white 50%),
      inset 0 -1px 0 color-mix(in oklch, var(--border) 70%, black 30%);
    overflow: hidden;
    padding: 6px;
  }

  :global(.lens-device-header) {
    background: color-mix(in oklch, var(--muted) 70%, black 30%);
    border-bottom: 1px solid color-mix(in oklch, var(--border) 80%, black 20%);
    border-radius: inherit;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  /** Content area — the viewport's inner scrollable region between header and footer. */
  :global(.lens-device-content) {
    background: var(--background, #fff);
  }

  :global(.lens-device-footer) {
    background: color-mix(in oklch, var(--muted) 70%, black 30%);
    border-top: 1px solid color-mix(in oklch, var(--border) 80%, black 20%);
    color: var(--muted-foreground);
  }

  /* ── Phone / Foldable chrome ── */

  /** Phone Dynamic Island / notch pill. */
  :global(.lens-device-notch) {
    width: 80px;
    height: 6px;
    border-radius: 3px;
    background: color-mix(in oklch, var(--muted) 50%, black 50%);
    box-shadow: inset 0 1px 2px oklch(0 0 0 / 0.3);
  }

  /** Phone home indicator bar at the bottom. */
  :global(.lens-device-home-indicator) {
    width: 40%;
    max-width: 140px;
    height: 4px;
    border-radius: 2px;
    background: color-mix(in oklch, var(--muted-foreground) 40%, transparent 60%);
  }

  :global(.lens-device-frame-phone) {
    padding: 4px;
  }

  /* ── Watch chrome ── */

  :global(.lens-device-frame-watch) {
    padding: 12px;
  }

  /* ── Tablet chrome ── */

  /** Camera dot for tablets and monitors. */
  :global(.lens-device-camera) {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: color-mix(in oklch, var(--muted) 40%, black 60%);
    box-shadow: inset 0 0.5px 1px oklch(0 0 0 / 0.4);
  }

  :global(.lens-device-frame-tablet) {
    padding: 6px;
  }

  /* ── Handheld (Steam Deck, Switch) chrome ── */

  :global(.lens-device-frame-handheld) {
    padding: 8px;
  }

  /* ── TV chrome ── */

  :global(.lens-device-frame-tv) {
    padding: 3px;
    border-width: 4px;
  }

  /* ── Monitor / Laptop chrome ── */

  :global(.lens-device-frame-monitor) {
    padding: 4px;
    border-width: 2px;
  }

  /* ── Automotive chrome ── */

  :global(.lens-device-frame-auto) {
    padding: 4px;
    border-width: 2px;
  }

  :global(.lens-outline *) {
    outline: var(--lens-outline-thickness, 1px) solid
      var(--lens-outline-color, rgba(239, 68, 68, 0.25));
  }

  /* ── Media Query Preference emulation ── */

  /** Emulate prefers-reduced-motion: reduce — kill all animations and transitions. */
  :global(.lens-reduced-motion *),
  :global(.lens-reduced-motion *::before),
  :global(.lens-reduced-motion *::after) {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  /** Emulate prefers-contrast: more — boost contrast on the card content. */
  :global(.lens-contrast-more) {
    filter: contrast(1.5);
  }

  /** Emulate prefers-contrast: less — reduce contrast on the card content. */
  :global(.lens-contrast-less) {
    filter: contrast(0.75);
  }

  /** Emulate prefers-reduced-transparency: reduce — force full opacity. */
  :global(.lens-reduced-transparency) {
    backdrop-filter: none !important;
  }

  :global(.lens-reduced-transparency *) {
    backdrop-filter: none !important;
    opacity: 1 !important;
  }

  /** Emulate forced-colors: active — high contrast black/white mode. */
  :global(.lens-forced-colors) {
    background: Canvas !important;
    color: CanvasText !important;
    forced-color-adjust: none;
  }

  :global(.lens-forced-colors *) {
    color: CanvasText !important;
    background: Canvas !important;
    border-color: CanvasText !important;
    outline-color: CanvasText !important;
    fill: CanvasText !important;
    stroke: CanvasText !important;
    forced-color-adjust: none;
  }

  :global(.lens-forced-colors a),
  :global(.lens-forced-colors a *) {
    color: LinkText !important;
  }

  :global(.lens-forced-colors button),
  :global(.lens-forced-colors [role='button']) {
    border: 2px solid ButtonText !important;
    color: ButtonText !important;
    background: ButtonFace !important;
  }

  /** Emulate prefers-color-scheme: light — force light appearance via CSS variables. */
  :global(.lens-color-scheme-light) {
    color-scheme: light;
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
  }

  /** Emulate prefers-color-scheme: dark — force dark appearance via CSS variables. */
  :global(.lens-color-scheme-dark) {
    color-scheme: dark;
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
  }

  /** Emulate inverted-colors: inverted — invert all colors via CSS filter. */
  :global(.lens-inverted-colors) {
    filter: invert(1) hue-rotate(180deg);
  }

  /** Emulate inverted-colors — re-invert images so they look normal. */
  :global(.lens-inverted-colors img),
  :global(.lens-inverted-colors video),
  :global(.lens-inverted-colors picture),
  :global(.lens-inverted-colors svg) {
    filter: invert(1) hue-rotate(180deg);
  }

  /**
   * Emulate prefers-reduced-data: reduce — hide heavy media elements.
   * Adds a visual indicator that assets are suppressed.
   */
  :global(.lens-reduced-data img),
  :global(.lens-reduced-data video),
  :global(.lens-reduced-data iframe) {
    visibility: hidden;
    position: relative;
  }

  :global(.lens-reduced-data img::after),
  :global(.lens-reduced-data video::after) {
    content: '[data-saver]';
    visibility: visible;
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: var(--muted-foreground);
    background: var(--muted);
  }

  /**
   * Emulate color-gamut: srgb — desaturate slightly to simulate limited gamut.
   * This is a visual approximation; true gamut clamping requires ICC profiles.
   */
  :global(.lens-gamut-srgb) {
    filter: saturate(0.85);
  }

  /** Emulate color-gamut: p3 — subtle saturation boost to suggest wide gamut. */
  :global(.lens-gamut-p3) {
    filter: saturate(1.15);
  }

  /** Emulate color-gamut: rec2020 — strong saturation boost to suggest ultra-wide gamut. */
  :global(.lens-gamut-rec2020) {
    filter: saturate(1.35);
  }

  /** Emulate display-mode: standalone — hide simulated browser chrome. */
  :global(.lens-display-standalone) {
    border-radius: 0;
  }

  /** Emulate display-mode: fullscreen — remove all padding and borders. */
  :global(.lens-display-fullscreen) {
    border-radius: 0;
    padding: 0 !important;
  }

  /** Emulate display-mode: minimal-ui — subtle border to suggest minimal chrome. */
  :global(.lens-display-minimal-ui) {
    border-top: 2px solid var(--border);
  }

  /* Force light mode variables on a card preview, overriding .dark ancestor cascade. */
  :global(.lens-force-light) {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.965 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.965 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.965 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.556 0 0);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.965 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.556 0 0);
  }

  /** High contrast mode — maximized contrast for accessibility testing. */
  :global(.lens-high-contrast) {
    --background: oklch(1 0 0);
    --foreground: oklch(0 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0 0 0);
    --primary: oklch(0 0 0);
    --primary-foreground: oklch(1 0 0);
    --secondary: oklch(0.95 0 0);
    --secondary-foreground: oklch(0 0 0);
    --muted: oklch(0.93 0 0);
    --muted-foreground: oklch(0.2 0 0);
    --accent: oklch(0.93 0 0);
    --accent-foreground: oklch(0 0 0);
    --destructive: oklch(0.5 0.3 27);
    --destructive-foreground: oklch(1 0 0);
    --border: oklch(0 0 0);
    --input: oklch(0 0 0);
    --ring: oklch(0 0 0);
  }

  :global(.lens-high-contrast *) {
    border-color: oklch(0 0 0) !important;
    outline-color: oklch(0 0 0) !important;
  }
</style>
