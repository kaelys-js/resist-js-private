<script lang="ts">
  /**
   * Shared dropdown menu content for Lens card settings.
   *
   * Renders Background, Zoom, Outline, Grid, Orientation, Color Mode,
   * Theme, Media Preferences, Network Simulation, Viewport, Accessibility,
   * Text Direction, Font Size, Export, and Reset submenus. Used by both
   * the per-card dropdown in LensComponentRenderer and the section-level
   * dropdown in the component page.
   *
   * @example
   * ```svelte
   * <DropdownMenu.Content>
   *   <LensCardSettingsMenu
   *     active={activeSettings}
   *     onSetting={(name, value) => applyToCard(key, name, value)}
   *     onExport={(id) => handleExport(key, id)}
   *     onReset={() => resetCard(key)}
   *   />
   * </DropdownMenu.Content>
   * ```
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import type { Component } from 'svelte';
  import ColorPicker from '../color-picker/ColorPicker.svelte';
  import { Slider } from '../slider/index.js';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import { cn } from '../utils.js';

  /* ── Icons ── */
  import Check from '@lucide/svelte/icons/check';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Paintbrush from '@lucide/svelte/icons/paintbrush';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import Maximize from '@lucide/svelte/icons/maximize';
  import SquareDashedMousePointer from '@lucide/svelte/icons/square-dashed-mouse-pointer';
  import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
  import Smartphone from '@lucide/svelte/icons/smartphone';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Palette from '@lucide/svelte/icons/palette';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Wifi from '@lucide/svelte/icons/wifi';
  import WifiOff from '@lucide/svelte/icons/wifi-off';
  import Tablet from '@lucide/svelte/icons/tablet';
  import Eye from '@lucide/svelte/icons/eye';
  import Languages from '@lucide/svelte/icons/languages';
  import ALargeSmall from '@lucide/svelte/icons/a-large-small';
  import Download from '@lucide/svelte/icons/download';
  import FileImage from '@lucide/svelte/icons/file-image';
  import FileType from '@lucide/svelte/icons/file-type';
  import FileCode from '@lucide/svelte/icons/file-code';
  import Globe from '@lucide/svelte/icons/globe';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import Link from '@lucide/svelte/icons/link';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';

  /* ------------------------------------------------------------------ */
  /*  Props                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Active card settings — current values for rendering check marks.
   * All fields optional; defaults applied internally.
   */
  type ActiveSettings = {
    /** Background preset id or hex color. */
    bg?: Str;
    /** Zoom level (1 = 100%). */
    zoom?: Num;
    /** Outline preset id, hex color, or 'none'. */
    outline?: Str;
    /** Grid preset id, hex color, or 'none'. */
    grid?: Str;
    /** Grid cell size in px. */
    gridSize?: Num;
    /** Grid fill preset id, hex color, or 'none'. */
    gridFill?: Str;
    /** Orientation preset id. */
    orientation?: Str;
    /** Color mode preset id ('auto' | 'light' | 'dark'). */
    mode?: Str;
    /** Theme preset id. */
    theme?: Str;
    /** Accessibility simulation id. */
    sim?: Str;
    /** Text direction ('auto' | 'ltr' | 'rtl'). */
    dir?: Str;
    /** Font size override in px (0 = default). */
    fontSize?: Num;
    /** Network simulation preset id. */
    networkSim?: Str;
    /** Viewport preset id or 'auto'. */
    viewport?: Str;
    /** Media query preferences keyed by pref name. */
    mediaPrefs?: Record<Str, Str>;
    /** Custom network delay config. */
    customNetwork?: { delay: Num; label: Str };
    /** Custom viewport dimensions. */
    customViewport?: { w: Num; h: Num };
  };

  let {
    active = {},
    onSetting,
    onExport,
    onReset,
    showExport = true,
    showReset = true,
    exportFeedback = '',
    exportInProgress = '',
  }: {
    /** Current active settings for check marks. */
    active?: ActiveSettings;
    /** Called when any setting changes. */
    onSetting: (name: Str, value: unknown) => void;
    /** Called when an export format is selected. */
    onExport?: (formatId: Str) => void;
    /** Called when reset is selected. */
    onReset?: () => void;
    /** Whether to show the Export submenu. */
    showExport?: Bool;
    /** Whether to show the Reset item. */
    showReset?: Bool;
    /** Current export feedback item id (shows check icon). */
    exportFeedback?: Str;
    /** Current export in-progress item id (shows spinner). */
    exportInProgress?: Str;
  } = $props();

  /* ------------------------------------------------------------------ */
  /*  Active value getters (with defaults)                               */
  /* ------------------------------------------------------------------ */

  const activeBg: Str = $derived(active.bg ?? 'default');
  const activeZoom: Num = $derived(active.zoom ?? 1);
  const activeOutline: Str = $derived(active.outline ?? 'none');
  const activeGrid: Str = $derived(active.grid ?? 'none');
  const activeGridFill: Str = $derived(active.gridFill ?? 'none');
  const activeOrientation: Str = $derived(active.orientation ?? 'default');
  const activeMode: Str = $derived(active.mode ?? 'auto');
  const activeTheme: Str = $derived(active.theme ?? '');
  const activeSim: Str = $derived(active.sim ?? 'none');
  const activeDir: Str = $derived(active.dir ?? 'auto');
  const activeFontSize: Num = $derived(active.fontSize ?? 0);
  const activeNetworkSim: Str = $derived(active.networkSim ?? 'none');
  const activeViewport: Str = $derived(active.viewport ?? 'auto');
  const activeMediaPrefs: Record<Str, Str> = $derived(active.mediaPrefs ?? {});
  const activeCustomNetwork: { delay: Num; label: Str } = $derived(
    active.customNetwork ?? { delay: 200, label: 'Custom' },
  );
  const activeCustomViewport: { w: Num; h: Num } = $derived(
    active.customViewport ?? { w: 1024, h: 768 },
  );

  /* ------------------------------------------------------------------ */
  /*  lockHeight Svelte action                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Svelte action that locks an element's min-height to its current height
   * on mount, preventing layout shift when filtering reduces content.
   *
   * @param node - The DOM element to lock height on
   * @returns Svelte action lifecycle object with destroy method
   */
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

  /* ------------------------------------------------------------------ */
  /*  Preset constants                                                   */
  /* ------------------------------------------------------------------ */

  /** Background color presets. */
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
  ];

  /** Zoom level presets. */
  const ZOOM_PRESETS: Array<{ value: Num; label: Str }> = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.25, label: '125%' },
    { value: 1.5, label: '150%' },
    { value: 2, label: '200%' },
    { value: 3, label: '300%' },
    { value: 4, label: '400%' },
  ];

  /** Zoom limits. */
  const ZOOM_STEP: Num = 0.25;
  const ZOOM_MIN: Num = 0.25;
  const ZOOM_MAX: Num = 4;

  /** Outline color presets. */
  const OUTLINE_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.25)' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.35)' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.35)' },
    { id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.35)' },
    { id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)' },
    { id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.25)' },
  ];

  /** Default grid cell size in px. */
  const GRID_DEFAULT_SIZE: Num = 16;

  /** Grid line color presets. */
  const GRID_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
    { id: 'light', label: 'Light', color: 'rgba(0, 0, 0, 0.06)' },
    { id: 'medium', label: 'Medium', color: 'rgba(0, 0, 0, 0.12)' },
    { id: 'dark', label: 'Dark', color: 'rgba(0, 0, 0, 0.25)' },
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.15)' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.2)' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.2)' },
  ];

  /** Grid fill color presets. */
  const GRID_FILL_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
    { id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)' },
    { id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.3)' },
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.08)' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.08)' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.08)' },
    { id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.08)' },
  ];

  /** Orientation presets. */
  const ORIENTATION_PRESETS: Array<{ id: Str; label: Str; rotation: Num }> = [
    { id: 'portrait-primary', label: 'Portrait Primary (0°)', rotation: 0 },
    { id: 'portrait-secondary', label: 'Portrait Secondary (180°)', rotation: 180 },
    { id: 'landscape-primary', label: 'Landscape Primary (90°)', rotation: 90 },
    { id: 'landscape-secondary', label: 'Landscape Secondary (270°)', rotation: 270 },
  ];

  /** Color mode presets. */
  const MODE_PRESETS: Array<{ id: Str; label: Str; icon: Component }> = [
    { id: 'auto', label: 'Auto (inherit)', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];

  /** Theme presets. */
  const THEME_PRESETS: Array<{ id: Str; label: Str; dot: Str }> = [
    { id: '', label: 'Default (inherit)', dot: '' },
    { id: 'midnight', label: 'Midnight', dot: 'oklch(0.55 0.22 260)' },
    { id: 'warm', label: 'Warm', dot: 'oklch(0.50 0.16 50)' },
    { id: 'forest', label: 'Forest', dot: 'oklch(0.50 0.16 155)' },
    { id: 'ocean', label: 'Ocean', dot: 'oklch(0.52 0.15 200)' },
    { id: 'rose', label: 'Rose', dot: 'oklch(0.55 0.18 350)' },
    { id: 'lavender', label: 'Lavender', dot: 'oklch(0.52 0.20 290)' },
    { id: 'sunset', label: 'Sunset', dot: 'oklch(0.55 0.20 30)' },
    { id: 'slate', label: 'Slate', dot: 'oklch(0.48 0.08 240)' },
    { id: 'copper', label: 'Copper', dot: 'oklch(0.52 0.16 60)' },
    { id: 'aurora', label: 'Aurora', dot: 'oklch(0.52 0.15 170)' },
    { id: 'amethyst', label: 'Amethyst', dot: 'oklch(0.52 0.22 310)' },
  ];

  /** Media query preference groups. */
  const MEDIA_PREF_GROUPS: Array<{
    pref: Str;
    label: Str;
    defaultValue: Str;
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
  ];

  /** Network simulation presets with latency delays in ms (-1 = permanent/offline). */
  const NETWORK_PRESETS: Array<{
    id: Str;
    label: Str;
    delay: Num;
    description: Str;
    category: Str;
  }> = [
    { id: 'none', label: 'No throttling', delay: 0, description: '', category: '' },
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
    {
      id: 'offline',
      label: 'Offline',
      delay: -1,
      description: 'No connection',
      category: 'Special',
    },
  ];

  /** Viewport presets organized by device category. Width and height in CSS pixels. */
  const VIEWPORT_PRESETS: Array<{ id: Str; label: Str; width: Num; height: Num; category: Str }> = [
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
    { id: 'iphone-xr', label: 'iPhone XR / 11', width: 414, height: 896, category: 'Phones' },
    { id: 'iphone-12', label: 'iPhone 12 / 13 / 14', width: 390, height: 844, category: 'Phones' },
    {
      id: 'iphone-12-pro-max',
      label: 'iPhone 12 Pro Max / 13 Pro Max',
      width: 428,
      height: 926,
      category: 'Phones',
    },
    {
      id: 'iphone-14-pro',
      label: 'iPhone 14 Pro / 15 / 16',
      width: 393,
      height: 852,
      category: 'Phones',
    },
    {
      id: 'iphone-14-pro-max',
      label: 'iPhone 14 Pro Max / 15 Plus / 16 Plus',
      width: 430,
      height: 932,
      category: 'Phones',
    },
    { id: 'iphone-16-pro', label: 'iPhone 16 Pro', width: 402, height: 874, category: 'Phones' },
    {
      id: 'iphone-16-pro-max',
      label: 'iPhone 16 Pro Max',
      width: 440,
      height: 956,
      category: 'Phones',
    },
    { id: 'pixel-7', label: 'Pixel 7 / 7a', width: 412, height: 915, category: 'Phones' },
    { id: 'pixel-8', label: 'Pixel 8', width: 412, height: 915, category: 'Phones' },
    { id: 'pixel-9', label: 'Pixel 9', width: 412, height: 924, category: 'Phones' },
    { id: 'pixel-9-pro-xl', label: 'Pixel 9 Pro XL', width: 448, height: 998, category: 'Phones' },
    {
      id: 'galaxy-z-fold-inner',
      label: 'Galaxy Z Fold (Inner)',
      width: 717,
      height: 840,
      category: 'Foldables',
    },
    { id: 'galaxy-z-flip', label: 'Galaxy Z Flip', width: 412, height: 846, category: 'Foldables' },
    { id: 'ipad-mini', label: 'iPad Mini', width: 744, height: 1133, category: 'Tablets' },
    { id: 'ipad-10', label: 'iPad (10th gen)', width: 820, height: 1180, category: 'Tablets' },
    { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180, category: 'Tablets' },
    { id: 'ipad-pro-11', label: 'iPad Pro 11"', width: 834, height: 1194, category: 'Tablets' },
    { id: 'ipad-pro-13', label: 'iPad Pro 13"', width: 1024, height: 1366, category: 'Tablets' },
    { id: 'galaxy-tab-s9', label: 'Galaxy Tab S9', width: 800, height: 1280, category: 'Tablets' },
    {
      id: 'galaxy-tab-s9-ultra',
      label: 'Galaxy Tab S9 Ultra',
      width: 1200,
      height: 1920,
      category: 'Tablets',
    },
    { id: 'surface-go', label: 'Surface Go', width: 1024, height: 768, category: 'Tablets' },
    { id: 'surface-pro-9', label: 'Surface Pro 9', width: 1368, height: 912, category: 'Tablets' },
    {
      id: 'laptop-sm',
      label: 'Small Laptop (13")',
      width: 1280,
      height: 800,
      category: 'Laptops / Desktops',
    },
    {
      id: 'laptop-md',
      label: 'Laptop (14–15")',
      width: 1440,
      height: 900,
      category: 'Laptops / Desktops',
    },
    {
      id: 'laptop-lg',
      label: 'MacBook Pro 16"',
      width: 1728,
      height: 1117,
      category: 'Laptops / Desktops',
    },
    {
      id: 'desktop-hd',
      label: 'Desktop HD',
      width: 1920,
      height: 1080,
      category: 'Laptops / Desktops',
    },
    {
      id: 'desktop-2k',
      label: 'Desktop 2K / QHD',
      width: 2560,
      height: 1440,
      category: 'Laptops / Desktops',
    },
    {
      id: 'desktop-4k',
      label: 'Desktop 4K',
      width: 3840,
      height: 2160,
      category: 'Laptops / Desktops',
    },
    {
      id: 'tesla-model3',
      label: 'Tesla Model 3 / Y',
      width: 1200,
      height: 720,
      category: 'Automotive',
    },
    {
      id: 'tesla-model-s',
      label: 'Tesla Model S / X',
      width: 2200,
      height: 1300,
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
    { id: 'tv-hd', label: 'TV 720p / HD', width: 1280, height: 720, category: 'TV' },
    { id: 'tv-fhd', label: 'TV 1080p / Full HD', width: 1920, height: 1080, category: 'TV' },
    { id: 'tv-4k', label: 'TV 4K / Ultra HD', width: 3840, height: 2160, category: 'TV' },
  ];

  /** Color vision deficiency menu items. */
  const COLOR_VISION_ITEMS: Array<{ id: Str; label: Str }> = [
    { id: 'protanopia', label: 'Protanopia (no red)' },
    { id: 'protanomaly', label: 'Protanomaly (low red)' },
    { id: 'deuteranopia', label: 'Deuteranopia (no green)' },
    { id: 'deuteranomaly', label: 'Deuteranomaly (low green)' },
    { id: 'tritanopia', label: 'Tritanopia (no blue)' },
    { id: 'tritanomaly', label: 'Tritanomaly (low blue)' },
    { id: 'achromatopsia', label: 'Achromatopsia (no color)' },
    { id: 'achromatomaly', label: 'Achromatomaly (low color)' },
  ];

  /** Vision impairment menu items. */
  const VISION_ITEMS: Array<{ id: Str; label: Str }> = [
    { id: 'blurred-vision', label: 'Blurred Vision' },
    { id: 'cataracts', label: 'Cataracts' },
    { id: 'low-contrast', label: 'Low Contrast' },
    { id: 'tunnel-vision', label: 'Tunnel Vision' },
  ];

  /** Text direction presets. */
  const DIR_PRESETS: Array<{ id: Str; label: Str }> = [
    { id: 'auto', label: 'Auto' },
    { id: 'ltr', label: 'LTR (Left to Right)' },
    { id: 'rtl', label: 'RTL (Right to Left)' },
  ];

  /** Font size presets. */
  const FONT_SIZE_PRESETS: Array<{ px: Num; label: Str }> = [
    { px: 0, label: 'Default' },
    { px: 12, label: '12px' },
    { px: 14, label: '14px' },
    { px: 16, label: '16px' },
    { px: 18, label: '18px' },
    { px: 20, label: '20px' },
    { px: 24, label: '24px' },
  ];

  /** Export format menu items. */
  const EXPORT_ITEMS: Array<{ id: Str; label: Str; icon: Component; category: Str }> = [
    { id: 'png', label: 'PNG', icon: FileImage, category: 'Image' },
    { id: 'jpeg', label: 'JPEG', icon: FileImage, category: 'Image' },
    { id: 'svg', label: 'SVG', icon: FileImage, category: 'Image' },
    { id: 'webp', label: 'WebP', icon: FileImage, category: 'Image' },
    { id: 'html', label: 'HTML', icon: FileType, category: 'Document' },
    { id: 'standalone-html', label: 'Standalone HTML', icon: Globe, category: 'Document' },
    { id: 'copy-image', label: 'Copy as Image', icon: Clipboard, category: 'Clipboard' },
    { id: 'copy-html', label: 'Copy as HTML', icon: FileType, category: 'Clipboard' },
    { id: 'copy-svelte', label: 'Copy as Svelte', icon: FileCode, category: 'Clipboard' },
    { id: 'copy-data-uri', label: 'Copy as Data URI', icon: Link, category: 'Clipboard' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Search state                                                       */
  /* ------------------------------------------------------------------ */

  let bgSearchQuery: Str = $state('');
  let outlineSearchQuery: Str = $state('');
  let gridSearchQuery: Str = $state('');
  let orientationSearchQuery: Str = $state('');
  let modeSearchQuery: Str = $state('');
  let themeSearchQuery: Str = $state('');
  let mediaPrefSearchQuery: Str = $state('');
  let networkSearchQuery: Str = $state('');
  let viewportSearchQuery: Str = $state('');
  let simSearchQuery: Str = $state('');
  let dirSearchQuery: Str = $state('');
  let fontSizeSearchQuery: Str = $state('');
  let exportSearchQuery: Str = $state('');

  /* ------------------------------------------------------------------ */
  /*  Filtered derivations                                               */
  /* ------------------------------------------------------------------ */

  const filteredBgPresets = $derived(
    bgSearchQuery.length === 0
      ? BG_PRESETS
      : BG_PRESETS.filter((p) => p.label.toLowerCase().includes(bgSearchQuery.toLowerCase())),
  );
  const filteredOutlinePresets = $derived(
    outlineSearchQuery.length === 0
      ? OUTLINE_PRESETS
      : OUTLINE_PRESETS.filter((p) =>
          p.label.toLowerCase().includes(outlineSearchQuery.toLowerCase()),
        ),
  );
  const filteredGridPresets = $derived(
    gridSearchQuery.length === 0
      ? GRID_PRESETS
      : GRID_PRESETS.filter((p) => p.label.toLowerCase().includes(gridSearchQuery.toLowerCase())),
  );
  const filteredOrientationPresets = $derived(
    orientationSearchQuery.length === 0
      ? ORIENTATION_PRESETS
      : ORIENTATION_PRESETS.filter((p) =>
          p.label.toLowerCase().includes(orientationSearchQuery.toLowerCase()),
        ),
  );
  const filteredModePresets = $derived(
    modeSearchQuery.length === 0
      ? MODE_PRESETS
      : MODE_PRESETS.filter((p) => p.label.toLowerCase().includes(modeSearchQuery.toLowerCase())),
  );
  const filteredThemePresets = $derived(
    themeSearchQuery.length === 0
      ? THEME_PRESETS
      : THEME_PRESETS.filter((p) => p.label.toLowerCase().includes(themeSearchQuery.toLowerCase())),
  );
  const filteredMediaPrefGroups = $derived(
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
  const filteredNetworkPresets = $derived(
    NETWORK_PRESETS.filter(
      (item) =>
        item.id === 'none' || item.label.toLowerCase().includes(networkSearchQuery.toLowerCase()),
    ),
  );
  const filteredNetworkCategories: Str[] = $derived([
    ...new Set(filteredNetworkPresets.filter((p) => p.category).map((p) => p.category)),
  ]);
  const filteredViewportPresets = $derived(
    VIEWPORT_PRESETS.filter((item) =>
      item.label.toLowerCase().includes(viewportSearchQuery.toLowerCase()),
    ),
  );
  const filteredViewportCategories: Str[] = $derived([
    ...new Set(filteredViewportPresets.map((p) => p.category)),
  ]);
  const filteredColorItems = $derived(
    COLOR_VISION_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(simSearchQuery.toLowerCase()),
    ),
  );
  const filteredVisionItems = $derived(
    VISION_ITEMS.filter((item) => item.label.toLowerCase().includes(simSearchQuery.toLowerCase())),
  );
  const filteredDirPresets = $derived(
    dirSearchQuery.length === 0
      ? DIR_PRESETS
      : DIR_PRESETS.filter((p) => p.label.toLowerCase().includes(dirSearchQuery.toLowerCase())),
  );
  const filteredFontSizePresets = $derived(
    fontSizeSearchQuery.length === 0
      ? FONT_SIZE_PRESETS
      : FONT_SIZE_PRESETS.filter((p) =>
          p.label.toLowerCase().includes(fontSizeSearchQuery.toLowerCase()),
        ),
  );
  const filteredExportItems = $derived(
    exportSearchQuery.length === 0
      ? EXPORT_ITEMS
      : EXPORT_ITEMS.filter((p) => p.label.toLowerCase().includes(exportSearchQuery.toLowerCase())),
  );
  const filteredExportCategories: Str[] = $derived([
    ...new Set(filteredExportItems.map((p) => p.category)),
  ]);

  /* ------------------------------------------------------------------ */
  /*  Zoom helpers                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Get formatted zoom level label.
   *
   * @returns Human-readable zoom label
   */
  function getZoomLabel(): Str {
    return `${Math.round(activeZoom * 100)}%` as Str;
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Background submenu                                                -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) bgSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Paintbrush class="size-4" />
    Background
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search backgrounds..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={bgSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Background Color</DropdownMenu.Label>
      {#each filteredBgPresets as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('bg', preset.id)}>
          <div class="flex items-center gap-2">
            <Check class={cn('size-4 shrink-0', activeBg !== preset.id && 'opacity-0')} />
            {#if preset.id !== 'default'}
              <span
                class="inline-block size-3.5 shrink-0 rounded-sm border"
                style={preset.style || 'background-color: transparent'}
              ></span>
            {/if}
            {preset.label}
          </div>
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No backgrounds found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
      <DropdownMenu.Separator />
      <div class="px-2 py-1.5">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
        <ColorPicker
          value={activeBg.startsWith('#') ? activeBg : '#ffffff'}
          onValueChange={(v) => onSetting('bg', v)}
        />
      </div>
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Zoom submenu                                                      -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger>
    <ZoomIn class="size-4" />
    Zoom ({getZoomLabel()})
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="w-52">
    <DropdownMenu.Label class="text-xs">Zoom Actions</DropdownMenu.Label>
    <DropdownMenu.Item
      onclick={() => onSetting('zoom', Math.min(activeZoom + ZOOM_STEP, ZOOM_MAX))}
      disabled={activeZoom >= ZOOM_MAX}
    >
      <ZoomIn class="size-4" />
      Zoom in
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => onSetting('zoom', Math.max(activeZoom - ZOOM_STEP, ZOOM_MIN))}
      disabled={activeZoom <= ZOOM_MIN}
    >
      <ZoomOut class="size-4" />
      Zoom out
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => onSetting('zoom', 1)} disabled={activeZoom === 1}>
      <Maximize class="size-4" />
      Fit (100%)
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Label class="text-xs">Zoom Level</DropdownMenu.Label>
    {#each ZOOM_PRESETS as preset (preset.value)}
      <DropdownMenu.Item onclick={() => onSetting('zoom', preset.value)}>
        <Check class={cn('size-4', activeZoom !== preset.value && 'opacity-0')} />
        {preset.label}
      </DropdownMenu.Item>
    {/each}
    <DropdownMenu.Separator />
    <div class="px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom ({getZoomLabel()})</p>
      <Slider
        type="single"
        value={Math.round(activeZoom * 100)}
        min={ZOOM_MIN * 100}
        max={ZOOM_MAX * 100}
        step={5}
        onValueChange={(v) => onSetting('zoom', v / 100)}
      />
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Outline submenu                                                   -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) outlineSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <SquareDashedMousePointer class="size-4" />
    Outline
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search outlines..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={outlineSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Outline Color</DropdownMenu.Label>
      <DropdownMenu.Item onclick={() => onSetting('outline', 'none')}>
        <Check class={cn('size-4 shrink-0', activeOutline !== 'none' && 'opacity-0')} />
        None
      </DropdownMenu.Item>
      {#each filteredOutlinePresets as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('outline', preset.id)}>
          <div class="flex items-center gap-2">
            <Check class={cn('size-4 shrink-0', activeOutline !== preset.id && 'opacity-0')} />
            <span
              class="inline-block size-3.5 shrink-0 rounded-sm border"
              style="background-color: {preset.color}"
            ></span>
            {preset.label}
          </div>
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No outlines found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
      <DropdownMenu.Separator />
      <div class="px-2 py-1.5">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
        <ColorPicker
          value={activeOutline.startsWith('#') ? activeOutline : '#ef4444'}
          onValueChange={(v) => onSetting('outline', v)}
        />
      </div>
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Grid submenu                                                      -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) gridSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Grid3x3 class="size-4" />
    Grid
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search grids..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={gridSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Grid Background Color</DropdownMenu.Label>
      <DropdownMenu.Item onclick={() => onSetting('grid', 'none')}>
        <Check class={cn('size-4 shrink-0', activeGrid !== 'none' && 'opacity-0')} />
        None
      </DropdownMenu.Item>
      {#each filteredGridPresets as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('grid', preset.id)}>
          <div class="flex items-center gap-2">
            <Check class={cn('size-4 shrink-0', activeGrid !== preset.id && 'opacity-0')} />
            <span
              class="inline-block size-3.5 shrink-0 rounded-sm border"
              style="background-color: {preset.color}"
            ></span>
            {preset.label}
          </div>
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No grid styles found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
      <DropdownMenu.Separator />
      <div class="px-2 py-1.5">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Grid Background Color</p>
        <ColorPicker
          value={activeGrid.startsWith('#') ? activeGrid : '#000000'}
          onValueChange={(v) => onSetting('grid', v)}
        />
      </div>
      <DropdownMenu.Separator />
      <DropdownMenu.Label class="text-xs">Grid Fill Color</DropdownMenu.Label>
      <DropdownMenu.Item onclick={() => onSetting('gridFill', 'none')}>
        <Check class={cn('size-4 shrink-0', activeGridFill !== 'none' && 'opacity-0')} />
        None (transparent)
      </DropdownMenu.Item>
      {#each GRID_FILL_PRESETS as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('gridFill', preset.id)}>
          <div class="flex items-center gap-2">
            <Check class={cn('size-4 shrink-0', activeGridFill !== preset.id && 'opacity-0')} />
            <span
              class="inline-block size-3.5 shrink-0 rounded-sm border"
              style="background-color: {preset.color}"
            ></span>
            {preset.label}
          </div>
        </DropdownMenu.Item>
      {/each}
      <DropdownMenu.Separator />
      <div class="px-2 py-1.5">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Grid Fill Color</p>
        <ColorPicker
          value={activeGridFill.startsWith('#') ? activeGridFill : '#ffffff'}
          onValueChange={(v) => onSetting('gridFill', v)}
        />
      </div>
      <DropdownMenu.Separator />
      <div class="px-2 py-1.5">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">
          Size ({active.gridSize ?? GRID_DEFAULT_SIZE}px)
        </p>
        <Slider
          type="single"
          value={active.gridSize ?? GRID_DEFAULT_SIZE}
          min={4}
          max={128}
          step={4}
          onValueChange={(v) => onSetting('gridSize', v)}
        />
      </div>
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Orientation submenu                                               -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) orientationSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Smartphone class="size-4" />
    Orientation
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-64 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search orientations..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={orientationSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Orientation</DropdownMenu.Label>
      <DropdownMenu.Item onclick={() => onSetting('orientation', 'default')}>
        <Check class={cn('size-4 shrink-0', activeOrientation !== 'default' && 'opacity-0')} />
        Default (none)
      </DropdownMenu.Item>
      {#each filteredOrientationPresets as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('orientation', preset.id)}>
          <div class="flex items-center gap-2">
            <Check class={cn('size-4 shrink-0', activeOrientation !== preset.id && 'opacity-0')} />
            <span
              class="relative inline-flex items-center justify-center"
              style="width: 16px; height: 16px;"
            >
              <span
                class="rounded-[2px] border border-current"
                style="width: 8px; height: 14px; transform: rotate({preset.rotation}deg);"
              >
                <span
                  class="absolute rounded-full bg-current"
                  style="width: 3px; height: 3px; bottom: 1px; left: 50%; transform: translateX(-50%);"
                ></span>
              </span>
            </span>
            {preset.label}
          </div>
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No orientations found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Color Mode submenu                                                -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) modeSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Sun class="size-4" />
    Color Mode
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search modes..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={modeSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Color Mode</DropdownMenu.Label>
      {#each filteredModePresets as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('mode', preset.id)}>
          <Check class={cn('size-4 shrink-0', activeMode !== preset.id && 'opacity-0')} />
          <preset.icon class="size-4" />
          {preset.label}
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No color modes found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Theme submenu                                                     -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) themeSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Palette class="size-4" />
    Theme
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search themes..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={themeSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Theme</DropdownMenu.Label>
      {#each filteredThemePresets as preset (preset.id)}
        <DropdownMenu.Item onclick={() => onSetting('theme', preset.id)}>
          <div class="flex items-center gap-2">
            <Check class={cn('size-4 shrink-0', activeTheme !== preset.id && 'opacity-0')} />
            {#if preset.dot}
              <span
                class="inline-block size-3.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
                style="background-color: {preset.dot}"
              ></span>
            {/if}
            {preset.label}
          </div>
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No themes found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Media Preferences submenu                                         -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) mediaPrefSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <SlidersHorizontal class="size-4" />
    Media Preferences
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-56 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search preferences..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={mediaPrefSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      {#each filteredMediaPrefGroups as group (group.pref)}
        <DropdownMenu.Label class="text-xs">{group.label}</DropdownMenu.Label>
        {#each group.options as option (option.value)}
          <DropdownMenu.Item
            onclick={() => onSetting('mediaPref', { pref: group.pref, value: option.value })}
          >
            <Check
              class={cn(
                'size-4 shrink-0',
                (activeMediaPrefs[group.pref] ?? group.defaultValue) !== option.value &&
                  'opacity-0',
              )}
            />
            {option.label}
          </DropdownMenu.Item>
        {/each}
        {#if group !== filteredMediaPrefGroups[filteredMediaPrefGroups.length - 1]}
          <DropdownMenu.Separator />
        {/if}
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No preferences found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Network Simulation submenu                                        -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) networkSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Wifi class="size-4" />
    Network Simulation
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={networkSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex max-h-72 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Throttling</DropdownMenu.Label>
      <DropdownMenu.Item onclick={() => onSetting('networkSim', 'none')}>
        <Check class={cn('size-4 shrink-0', activeNetworkSim !== 'none' && 'opacity-0')} />
        No throttling
      </DropdownMenu.Item>
      {#each filteredNetworkCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredNetworkPresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item onclick={() => onSetting('networkSim', preset.id)}>
            <div class="flex items-center gap-2">
              <Check class={cn('size-4 shrink-0', activeNetworkSim !== preset.id && 'opacity-0')} />
              {#if preset.id === 'offline'}
                <WifiOff class="size-3.5 text-destructive" />
              {/if}
              <div class="flex flex-col">
                <span>{preset.label}</span>
                {#if preset.description}
                  <span class="text-[10px] leading-tight text-muted-foreground"
                    >{preset.description}</span
                  >
                {/if}
              </div>
            </div>
          </DropdownMenu.Item>
        {/each}
      {/each}
      {#if filteredNetworkCategories.length === 0}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No network presets found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/if}
    </div>
    <DropdownMenu.Separator />
    <div class="shrink-0 px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">
        Custom Latency ({activeCustomNetwork.delay}ms)
      </p>
      <Slider
        type="single"
        value={activeCustomNetwork.delay}
        min={0}
        max={10000}
        step={50}
        onValueChange={(v) => onSetting('customNetworkDelay', v)}
        onValueCommit={() => onSetting('networkSim', 'custom')}
      />
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Viewport submenu                                                  -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) viewportSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Tablet class="size-4" />
    Viewport
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search devices..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={viewportSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex max-h-72 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Size</DropdownMenu.Label>
      <DropdownMenu.Item onclick={() => onSetting('viewport', 'auto')}>
        <Check class={cn('size-4 shrink-0', activeViewport !== 'auto' && 'opacity-0')} />
        Auto (full width)
      </DropdownMenu.Item>
      {#each filteredViewportCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredViewportPresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item onclick={() => onSetting('viewport', preset.id)}>
            <div class="flex items-center gap-2">
              <Check class={cn('size-4 shrink-0', activeViewport !== preset.id && 'opacity-0')} />
              <div class="flex flex-col">
                <span class="truncate">{preset.label}</span>
                <span class="text-[10px] leading-tight text-muted-foreground"
                  >{preset.width} &times; {preset.height}</span
                >
              </div>
            </div>
          </DropdownMenu.Item>
        {/each}
      {/each}
      {#if filteredViewportCategories.length === 0}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No devices found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/if}
    </div>
    <DropdownMenu.Separator />
    <div class="shrink-0 px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">
        Custom Width ({activeCustomViewport.w}px)
      </p>
      <Slider
        type="single"
        value={activeCustomViewport.w}
        min={100}
        max={3840}
        step={10}
        onValueChange={(v) => onSetting('customViewportW', v)}
        onValueCommit={() => onSetting('viewport', 'custom')}
      />
    </div>
    <div class="shrink-0 px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">
        Custom Height ({activeCustomViewport.h}px)
      </p>
      <Slider
        type="single"
        value={activeCustomViewport.h}
        min={100}
        max={2160}
        step={10}
        onValueChange={(v) => onSetting('customViewportH', v)}
        onValueCommit={() => onSetting('viewport', 'custom')}
      />
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Accessibility submenu                                             -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) simSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Eye class="size-4" />
    Accessibility
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="w-56">
    <div class="px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={simSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex max-h-60 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Item onclick={() => onSetting('sim', 'none')}>
        <Check class={cn('size-4 shrink-0', activeSim !== 'none' && 'opacity-0')} />
        None
      </DropdownMenu.Item>
      {#if filteredColorItems.length > 0}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">Color Vision</DropdownMenu.Label>
        {#each filteredColorItems as item (item.id)}
          <DropdownMenu.Item onclick={() => onSetting('sim', item.id)}>
            <Check class={cn('size-4', activeSim !== item.id && 'opacity-0')} />
            {item.label}
          </DropdownMenu.Item>
        {/each}
      {/if}
      {#if filteredVisionItems.length > 0}
        {#if filteredColorItems.length > 0}
          <DropdownMenu.Separator />
        {/if}
        <DropdownMenu.Label class="text-xs">Vision Impairments</DropdownMenu.Label>
        {#each filteredVisionItems as item (item.id)}
          <DropdownMenu.Item onclick={() => onSetting('sim', item.id)}>
            <Check class={cn('size-4', activeSim !== item.id && 'opacity-0')} />
            {item.label}
          </DropdownMenu.Item>
        {/each}
      {/if}
      {#if filteredColorItems.length === 0 && filteredVisionItems.length === 0}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No simulations found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/if}
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Text Direction submenu                                            -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) dirSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <Languages class="size-4" />
    Text Direction
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={dirSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Direction</DropdownMenu.Label>
      {#each filteredDirPresets as item (item.id)}
        <DropdownMenu.Item onclick={() => onSetting('dir', item.id)}>
          <Check class={cn('size-4', activeDir !== item.id && 'opacity-0')} />
          {item.label}
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No directions found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Font Size submenu                                                 -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) fontSizeSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <ALargeSmall class="size-4" />
    Font Size
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search sizes..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={fontSizeSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Presets</DropdownMenu.Label>
      {#each filteredFontSizePresets as item (item.px)}
        <DropdownMenu.Item onclick={() => onSetting('fontSize', item.px)}>
          <Check class={cn('size-4', activeFontSize !== item.px && 'opacity-0')} />
          {item.label}
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No sizes found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
      <DropdownMenu.Separator />
      <div class="px-2 py-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-muted-foreground">Custom</span>
          <span class="font-mono text-[11px] font-medium text-muted-foreground"
            >{activeFontSize || 16}px</span
          >
        </div>
        <input
          type="range"
          min="8"
          max="48"
          step="1"
          value={activeFontSize || 16}
          class="mt-1 w-full accent-primary"
          oninput={(e) => onSetting('fontSize', Number((e.target as HTMLInputElement).value))}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Export submenu                                                    -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

{#if showExport && onExport}
  <DropdownMenu.Separator />
  <DropdownMenu.Sub
    onOpenChange={(open) => {
      if (open) exportSearchQuery = '';
    }}
  >
    <DropdownMenu.SubTrigger>
      <Download class="size-4" />
      Export
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
      <div class="shrink-0 px-2 pb-1.5 pt-1">
        <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
          <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search formats..."
            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            bind:value={exportSearchQuery}
            onkeydown={(e) => e.stopPropagation()}
            onkeyup={(e) => e.stopPropagation()}
            onkeypress={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
        {#each filteredExportCategories as category (category)}
          {#if filteredExportCategories.indexOf(category) > 0}
            <DropdownMenu.Separator />
          {/if}
          <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
          {#each filteredExportItems.filter((i) => i.category === category) as item (item.id)}
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                onExport(item.id);
              }}
            >
              {#if exportInProgress === item.id}
                <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
              {:else if exportFeedback === item.id}
                <Check class="size-4 text-green-500" />
              {:else}
                <item.icon class="size-4" />
              {/if}
              {item.label}
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
{/if}

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Reset to Defaults                                                 -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

{#if showReset && onReset}
  <DropdownMenu.Separator />
  <DropdownMenu.Item onclick={() => onReset()}>
    <RotateCcw class="size-4" />
    Reset to Defaults
  </DropdownMenu.Item>
{/if}
