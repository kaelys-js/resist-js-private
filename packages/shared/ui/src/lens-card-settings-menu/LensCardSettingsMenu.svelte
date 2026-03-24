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
  import { fade } from 'svelte/transition';
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
  import Signal from '@lucide/svelte/icons/signal';
  import Satellite from '@lucide/svelte/icons/satellite';
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
  import Watch from '@lucide/svelte/icons/watch';
  import Laptop from '@lucide/svelte/icons/laptop';
  import Car from '@lucide/svelte/icons/car';
  import Glasses from '@lucide/svelte/icons/glasses';
  import Tv from '@lucide/svelte/icons/tv';
  import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
  import Image from '@lucide/svelte/icons/image';
  import AppWindow from '@lucide/svelte/icons/app-window';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import BookOpenText from '@lucide/svelte/icons/book-open-text';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import Share2 from '@lucide/svelte/icons/share-2';

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
    /** Outline thickness in px (1-8). */
    outlineThickness?: Num;
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
    /** Custom rotation angle in degrees (0-359). */
    customRotation?: Num;
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
  const activeOutlineThickness: Num = $derived(active.outlineThickness ?? 1);
  const activeGrid: Str = $derived(active.grid ?? 'none');
  const activeGridFill: Str = $derived(active.gridFill ?? 'none');
  const activeOrientation: Str = $derived(active.orientation ?? 'default');
  const activeOrientationLabel: Str = $derived.by((): Str => {
    const id: Str = activeOrientation;
    if (id === 'default') {
      return '' as Str;
    }
    if (id === 'custom') {
      const deg: Num = active.customRotation ?? 0;
      return `${deg}°` as Str;
    }
    const preset = ORIENTATION_PRESETS.find((p) => p.id === id);
    return preset ? (`${preset.rotation}°` as Str) : ('' as Str);
  });
  const activeMode: Str = $derived(active.mode ?? 'auto');
  const activeTheme: Str = $derived(active.theme ?? '');
  const activeSim: Str = $derived(active.sim ?? 'none');
  const activeSimLabel: Str = $derived.by((): Str => {
    const sim: Str = activeSim;
    if (sim === 'none') {
      return '' as Str;
    }
    const color = COLOR_VISION_ITEMS.find((i) => i.id === sim);
    if (color) {
      return color.label;
    }
    const vision = VISION_ITEMS.find((i) => i.id === sim);
    if (vision) {
      return vision.label;
    }
    return '' as Str;
  });
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

  /** Whether any settings differ from defaults (used to disable Reset). */
  const hasActiveOverrides: Bool = $derived(
    Object.values(active).some((v: unknown): boolean => v !== undefined),
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

  /** Background color presets with categories and descriptions. */
  const BG_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** CSS inline style for the background. */
    style: Str;
    /** Hex value or pattern description. */
    description: Str;
    /** Grouping category. */
    category: Str;
  }> = [
    {
      id: 'default',
      label: 'Default',
      style: '',
      description: 'Inherits from theme',
      category: 'Solid',
    },
    {
      id: 'white',
      label: 'White',
      style: 'background-color: #ffffff',
      description: '#ffffff',
      category: 'Solid',
    },
    {
      id: 'light',
      label: 'Light',
      style: 'background-color: #f8f8f8',
      description: '#f8f8f8',
      category: 'Solid',
    },
    {
      id: 'light-gray',
      label: 'Light Gray',
      style: 'background-color: #e5e5e5',
      description: '#e5e5e5',
      category: 'Solid',
    },
    {
      id: 'medium-gray',
      label: 'Medium Gray',
      style: 'background-color: #a3a3a3',
      description: '#a3a3a3',
      category: 'Solid',
    },
    {
      id: 'dark-gray',
      label: 'Dark Gray',
      style: 'background-color: #404040',
      description: '#404040',
      category: 'Solid',
    },
    {
      id: 'near-black',
      label: 'Near Black',
      style: 'background-color: #1a1a1a',
      description: '#1a1a1a',
      category: 'Solid',
    },
    {
      id: 'black',
      label: 'Black',
      style: 'background-color: #000000',
      description: '#000000',
      category: 'Solid',
    },
    {
      id: 'checkerboard',
      label: 'Checkerboard',
      style:
        'background-image: repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%); background-size: 16px 16px',
      description: 'Transparency indicator',
      category: 'Pattern',
    },
    {
      id: 'dot-grid',
      label: 'Dot Grid',
      style:
        'background-image: radial-gradient(circle, #d4d4d4 1px, transparent 1px); background-size: 16px 16px',
      description: 'Alignment reference dots',
      category: 'Pattern',
    },
    {
      id: 'cross-hatch',
      label: 'Cross Hatch',
      style:
        'background-image: linear-gradient(45deg, #d4d4d4 1px, transparent 1px), linear-gradient(-45deg, #d4d4d4 1px, transparent 1px); background-size: 12px 12px',
      description: 'Diagonal cross pattern',
      category: 'Pattern',
    },
    {
      id: 'diagonal-stripes',
      label: 'Diagonal Stripes',
      style:
        'background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, #d4d4d4 8px, #d4d4d4 9px); background-size: 16px 16px',
      description: '45° repeating lines',
      category: 'Pattern',
    },
    {
      id: 'horizontal-lines',
      label: 'Horizontal Lines',
      style:
        'background-image: repeating-linear-gradient(0deg, transparent, transparent 7px, #d4d4d4 7px, #d4d4d4 8px)',
      description: 'Ruled notebook lines',
      category: 'Pattern',
    },
    {
      id: 'graph-paper',
      label: 'Graph Paper',
      style:
        'background-image: linear-gradient(#d4d4d4 1px, transparent 1px), linear-gradient(90deg, #d4d4d4 1px, transparent 1px); background-size: 16px 16px',
      description: '16px square grid',
      category: 'Pattern',
    },
  ];

  /** Zoom level presets with descriptions. */
  const ZOOM_PRESETS: Array<{
    /** Zoom multiplier (1 = 100%). */
    value: Num;
    /** Display label. */
    label: Str;
    /** Brief description. */
    description: Str;
  }> = [
    { value: 0.25, label: '25%', description: 'Quarter size' },
    { value: 0.33, label: '33%', description: 'Third size' },
    { value: 0.5, label: '50%', description: 'Half size' },
    { value: 0.67, label: '67%', description: 'Two-thirds size' },
    { value: 0.75, label: '75%', description: 'Three-quarters' },
    { value: 1, label: '100%', description: 'Default — actual size' },
    { value: 1.25, label: '125%', description: 'Slight magnification' },
    { value: 1.5, label: '150%', description: '1.5\u00D7 magnification' },
    { value: 1.75, label: '175%', description: 'Near double' },
    { value: 2, label: '200%', description: 'Retina 2\u00D7' },
    { value: 2.5, label: '250%', description: '2.5\u00D7 magnification' },
    { value: 3, label: '300%', description: 'Retina 3\u00D7' },
    { value: 4, label: '400%', description: 'Extreme zoom' },
    { value: 5, label: '500%', description: 'Maximum zoom' },
  ];

  /** Zoom limits. */
  const ZOOM_STEP: Num = 0.25;
  const ZOOM_MIN: Num = 0.25;
  const ZOOM_MAX: Num = 5;

  /** Outline color presets with categories and RGBA descriptions. */
  const OUTLINE_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** CSS rgba color value. */
    color: Str;
    /** RGBA value description. */
    description: Str;
    /** Grouping category. */
    category: Str;
  }> = [
    {
      id: 'red',
      label: 'Red',
      color: 'rgba(239, 68, 68, 0.25)',
      description: 'rgba(239, 68, 68, 0.25)',
      category: 'Warm',
    },
    {
      id: 'orange',
      label: 'Orange',
      color: 'rgba(249, 115, 22, 0.3)',
      description: 'rgba(249, 115, 22, 0.3)',
      category: 'Warm',
    },
    {
      id: 'yellow',
      label: 'Yellow',
      color: 'rgba(234, 179, 8, 0.35)',
      description: 'rgba(234, 179, 8, 0.35)',
      category: 'Warm',
    },
    {
      id: 'pink',
      label: 'Pink',
      color: 'rgba(236, 72, 153, 0.3)',
      description: 'rgba(236, 72, 153, 0.3)',
      category: 'Warm',
    },
    {
      id: 'blue',
      label: 'Blue',
      color: 'rgba(59, 130, 246, 0.35)',
      description: 'rgba(59, 130, 246, 0.35)',
      category: 'Cool',
    },
    {
      id: 'cyan',
      label: 'Cyan',
      color: 'rgba(6, 182, 212, 0.3)',
      description: 'rgba(6, 182, 212, 0.3)',
      category: 'Cool',
    },
    {
      id: 'teal',
      label: 'Teal',
      color: 'rgba(20, 184, 166, 0.3)',
      description: 'rgba(20, 184, 166, 0.3)',
      category: 'Cool',
    },
    {
      id: 'green',
      label: 'Green',
      color: 'rgba(34, 197, 94, 0.35)',
      description: 'rgba(34, 197, 94, 0.35)',
      category: 'Cool',
    },
    {
      id: 'purple',
      label: 'Purple',
      color: 'rgba(168, 85, 247, 0.3)',
      description: 'rgba(168, 85, 247, 0.3)',
      category: 'Accent',
    },
    {
      id: 'lime',
      label: 'Lime',
      color: 'rgba(132, 204, 22, 0.3)',
      description: 'rgba(132, 204, 22, 0.3)',
      category: 'Accent',
    },
    {
      id: 'white',
      label: 'White',
      color: 'rgba(255, 255, 255, 0.5)',
      description: 'rgba(255, 255, 255, 0.5)',
      category: 'Neutral',
    },
    {
      id: 'black',
      label: 'Black',
      color: 'rgba(0, 0, 0, 0.25)',
      description: 'rgba(0, 0, 0, 0.25)',
      category: 'Neutral',
    },
  ];

  /** Default grid cell size in px. */
  const GRID_DEFAULT_SIZE: Num = 16;

  /** Grid line color presets with RGBA descriptions. */
  const GRID_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** CSS rgba color value. */
    color: Str;
    /** RGBA value description. */
    description: Str;
  }> = [
    { id: 'light', label: 'Light', color: 'rgba(0, 0, 0, 0.06)', description: '6% black' },
    { id: 'medium', label: 'Medium', color: 'rgba(0, 0, 0, 0.12)', description: '12% black' },
    { id: 'dark', label: 'Dark', color: 'rgba(0, 0, 0, 0.25)', description: '25% black' },
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.15)', description: '15% opacity' },
    {
      id: 'orange',
      label: 'Orange',
      color: 'rgba(249, 115, 22, 0.15)',
      description: '15% opacity',
    },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.2)', description: '20% opacity' },
    { id: 'cyan', label: 'Cyan', color: 'rgba(6, 182, 212, 0.15)', description: '15% opacity' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.2)', description: '20% opacity' },
    {
      id: 'purple',
      label: 'Purple',
      color: 'rgba(168, 85, 247, 0.15)',
      description: '15% opacity',
    },
  ];

  /** Grid fill color presets with RGBA descriptions. */
  const GRID_FILL_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** CSS rgba color value. */
    color: Str;
    /** RGBA value description. */
    description: Str;
  }> = [
    { id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)', description: '50% white' },
    { id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.3)', description: '30% black' },
    { id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.08)', description: '8% opacity' },
    { id: 'orange', label: 'Orange', color: 'rgba(249, 115, 22, 0.08)', description: '8% opacity' },
    { id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.08)', description: '8% opacity' },
    { id: 'cyan', label: 'Cyan', color: 'rgba(6, 182, 212, 0.08)', description: '8% opacity' },
    { id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.08)', description: '8% opacity' },
    { id: 'purple', label: 'Purple', color: 'rgba(168, 85, 247, 0.08)', description: '8% opacity' },
    { id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.08)', description: '8% opacity' },
  ];

  /** Orientation presets grouped by type. */
  const ORIENTATION_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Rotation angle in degrees. */
    rotation: Num;
    /** Brief description. */
    description: Str;
    /** Category for grouped display. */
    category: Str;
  }> = [
    {
      id: 'portrait-primary',
      label: 'Portrait',
      rotation: 0,
      description: 'Natural upright (0°)',
      category: 'Standard',
    },
    {
      id: 'landscape-primary',
      label: 'Landscape',
      rotation: 90,
      description: 'Rotated right (90°)',
      category: 'Standard',
    },
    {
      id: 'portrait-secondary',
      label: 'Portrait Inverted',
      rotation: 180,
      description: 'Upside down (180°)',
      category: 'Standard',
    },
    {
      id: 'landscape-secondary',
      label: 'Landscape Inverted',
      rotation: 270,
      description: 'Rotated left (270°)',
      category: 'Standard',
    },
    {
      id: 'tilt-15',
      label: 'Slight Tilt',
      rotation: 15,
      description: 'Subtle clockwise lean',
      category: 'Tilted',
    },
    {
      id: 'tilt-30',
      label: 'Moderate Tilt',
      rotation: 30,
      description: 'Noticeable clockwise lean',
      category: 'Tilted',
    },
    {
      id: 'tilt-345',
      label: 'Slight Counter-Tilt',
      rotation: 345,
      description: 'Subtle counter-clockwise lean',
      category: 'Tilted',
    },
    {
      id: 'tilt-330',
      label: 'Moderate Counter-Tilt',
      rotation: 330,
      description: 'Noticeable counter-clockwise lean',
      category: 'Tilted',
    },
    {
      id: 'diagonal-45',
      label: 'Diagonal Right',
      rotation: 45,
      description: '45° clockwise diagonal',
      category: 'Diagonal',
    },
    {
      id: 'diagonal-135',
      label: 'Diagonal Down-Right',
      rotation: 135,
      description: '135° rotation',
      category: 'Diagonal',
    },
    {
      id: 'diagonal-225',
      label: 'Diagonal Down-Left',
      rotation: 225,
      description: '225° rotation',
      category: 'Diagonal',
    },
    {
      id: 'diagonal-315',
      label: 'Diagonal Left',
      rotation: 315,
      description: '315° counter-clockwise diagonal',
      category: 'Diagonal',
    },
  ];

  /** Color mode presets with descriptions and CSS query info. */
  const MODE_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Lucide icon component. */
    icon: Component;
    /** Brief description. */
    description: Str;
    /** CSS media query reference. */
    query: Str;
  }> = [
    {
      id: 'auto',
      label: 'Auto',
      icon: Monitor,
      description: 'Follows system preference',
      query: 'prefers-color-scheme',
    },
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Forces light color scheme',
      query: 'prefers-color-scheme: light',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Forces dark color scheme',
      query: 'prefers-color-scheme: dark',
    },
    {
      id: 'high-contrast',
      label: 'High Contrast',
      icon: Sun,
      description: 'Maximized contrast for accessibility',
      query: 'prefers-contrast: more',
    },
  ];

  /** Theme presets with descriptions and categories. */
  const THEME_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Color dot CSS value. */
    dot: Str;
    /** Brief description. */
    description: Str;
    /** Category for grouped display. */
    category: Str;
  }> = [
    {
      id: '',
      label: 'Default',
      dot: '',
      description: 'Inherits from system theme',
      category: 'Base',
    },
    {
      id: 'midnight',
      label: 'Midnight',
      dot: 'oklch(0.55 0.22 260)',
      description: 'Deep blues and indigo tones',
      category: 'Cool',
    },
    {
      id: 'ocean',
      label: 'Ocean',
      dot: 'oklch(0.52 0.15 200)',
      description: 'Calm aquatic blues',
      category: 'Cool',
    },
    {
      id: 'slate',
      label: 'Slate',
      dot: 'oklch(0.48 0.08 240)',
      description: 'Subtle blue-grey neutrals',
      category: 'Cool',
    },
    {
      id: 'warm',
      label: 'Warm',
      dot: 'oklch(0.50 0.16 50)',
      description: 'Amber and earth tones',
      category: 'Warm',
    },
    {
      id: 'sunset',
      label: 'Sunset',
      dot: 'oklch(0.55 0.20 30)',
      description: 'Orange and golden hues',
      category: 'Warm',
    },
    {
      id: 'copper',
      label: 'Copper',
      dot: 'oklch(0.52 0.16 60)',
      description: 'Rich metallic bronze',
      category: 'Warm',
    },
    {
      id: 'rose',
      label: 'Rose',
      dot: 'oklch(0.55 0.18 350)',
      description: 'Soft pinks and magentas',
      category: 'Vivid',
    },
    {
      id: 'lavender',
      label: 'Lavender',
      dot: 'oklch(0.52 0.20 290)',
      description: 'Purple and violet accents',
      category: 'Vivid',
    },
    {
      id: 'amethyst',
      label: 'Amethyst',
      dot: 'oklch(0.52 0.22 310)',
      description: 'Deep purple gemstone tones',
      category: 'Vivid',
    },
    {
      id: 'forest',
      label: 'Forest',
      dot: 'oklch(0.50 0.16 155)',
      description: 'Natural greens and moss',
      category: 'Vivid',
    },
    {
      id: 'aurora',
      label: 'Aurora',
      dot: 'oklch(0.52 0.15 170)',
      description: 'Northern lights teal-green',
      category: 'Vivid',
    },
  ];

  /** Media query preference groups with descriptions and CSS query names. */
  const MEDIA_PREF_GROUPS: Array<{
    /** CSS media feature name. */
    pref: Str;
    /** Display label. */
    label: Str;
    /** What this preference controls. */
    description: Str;
    /** CSS media query syntax. */
    query: Str;
    /** Default/neutral value. */
    defaultValue: Str;
    /** Available options with descriptions. */
    options: Array<{ value: Str; label: Str; description: Str }>;
  }> = [
    {
      pref: 'reduced-motion',
      label: 'Reduced Motion',
      description: 'Controls animation and transition behavior',
      query: 'prefers-reduced-motion',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference', description: 'Animations play normally' },
        { value: 'reduce', label: 'Reduce', description: 'Disables animations and transitions' },
      ],
    },
    {
      pref: 'contrast',
      label: 'Contrast',
      description: 'Adjusts contrast level for readability',
      query: 'prefers-contrast',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference', description: 'Default contrast levels' },
        { value: 'more', label: 'More', description: 'Increase contrast between colors' },
        { value: 'less', label: 'Less', description: 'Decrease contrast for comfort' },
      ],
    },
    {
      pref: 'reduced-transparency',
      label: 'Reduced Transparency',
      description: 'Controls translucent overlay behavior',
      query: 'prefers-reduced-transparency',
      defaultValue: 'no-preference',
      options: [
        {
          value: 'no-preference',
          label: 'No Preference',
          description: 'Transparency effects enabled',
        },
        { value: 'reduce', label: 'Reduce', description: 'Replace translucent with opaque' },
      ],
    },
    {
      pref: 'forced-colors',
      label: 'Forced Colors',
      description: 'Simulates Windows High Contrast mode',
      query: 'forced-colors',
      defaultValue: 'none',
      options: [
        { value: 'none', label: 'None', description: 'Colors render as authored' },
        { value: 'active', label: 'Active', description: 'System-enforced color palette' },
      ],
    },
    {
      pref: 'color-scheme',
      label: 'Color Scheme',
      description: 'Light or dark appearance preference',
      query: 'prefers-color-scheme',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference', description: 'No explicit preference' },
        { value: 'light', label: 'Light', description: 'Prefers light backgrounds' },
        { value: 'dark', label: 'Dark', description: 'Prefers dark backgrounds' },
      ],
    },
    {
      pref: 'color-gamut',
      label: 'Color Gamut',
      description: 'Simulates display color range capability',
      query: 'color-gamut',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference', description: 'Default display gamut' },
        { value: 'srgb', label: 'sRGB', description: 'Standard gamut (most displays)' },
        { value: 'p3', label: 'Display P3', description: 'Wide gamut (modern phones/Macs)' },
        { value: 'rec2020', label: 'Rec. 2020', description: 'Ultra-wide gamut (HDR displays)' },
      ],
    },
    {
      pref: 'inverted-colors',
      label: 'Inverted Colors',
      description: 'Simulates OS-level color inversion',
      query: 'inverted-colors',
      defaultValue: 'none',
      options: [
        { value: 'none', label: 'None', description: 'Colors render normally' },
        { value: 'inverted', label: 'Inverted', description: 'All colors are inverted' },
      ],
    },
    {
      pref: 'reduced-data',
      label: 'Reduced Data',
      description: 'User prefers less data usage',
      query: 'prefers-reduced-data',
      defaultValue: 'no-preference',
      options: [
        { value: 'no-preference', label: 'No Preference', description: 'Load all assets normally' },
        { value: 'reduce', label: 'Reduce', description: 'Minimize data transfer' },
      ],
    },
    {
      pref: 'display-mode',
      label: 'Display Mode',
      description: 'Simulates PWA display context',
      query: 'display-mode',
      defaultValue: 'browser',
      options: [
        { value: 'browser', label: 'Browser', description: 'Standard browser tab with UI chrome' },
        { value: 'standalone', label: 'Standalone', description: 'App-like window, no browser UI' },
        { value: 'fullscreen', label: 'Fullscreen', description: 'Fills entire screen, no chrome' },
        {
          value: 'minimal-ui',
          label: 'Minimal UI',
          description: 'Browser with minimal navigation',
        },
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
    {
      id: 'none',
      label: 'No throttling',
      delay: 0,
      description: 'Full speed, no artificial delay',
      category: '',
    },
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
  const VIEWPORT_PRESETS: Array<{
    /** Preset identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Width in CSS pixels. */
    width: Num;
    /** Height in CSS pixels. */
    height: Num;
    /** Device category. */
    category: Str;
    /** Brief description. */
    description: Str;
  }> = [
    /* ── Watches ─────────────────────────────────────────────── */
    {
      id: 'watch-sm',
      label: 'Apple Watch (38–40mm)',
      width: 197,
      height: 162,
      category: 'Watches',
      description: 'Series 4/5/6/7/SE small',
    },
    {
      id: 'watch-md',
      label: 'Apple Watch (42–44mm)',
      width: 224,
      height: 184,
      category: 'Watches',
      description: 'Series 4/5/6/7/SE large',
    },
    {
      id: 'watch-ultra',
      label: 'Apple Watch Ultra (49mm)',
      width: 205,
      height: 251,
      category: 'Watches',
      description: 'Ultra/Ultra 2',
    },
    {
      id: 'watch-galaxy',
      label: 'Galaxy Watch',
      width: 240,
      height: 240,
      category: 'Watches',
      description: 'Galaxy Watch 4/5/6',
    },
    {
      id: 'watch-wear-os',
      label: 'Wear OS (round)',
      width: 240,
      height: 240,
      category: 'Watches',
      description: 'Pixel Watch, TicWatch',
    },
    /* ── Phones ──────────────────────────────────────────────── */
    {
      id: 'galaxy-z-fold-cover',
      label: 'Galaxy Z Fold (Cover)',
      width: 323,
      height: 694,
      category: 'Phones',
      description: 'Fold 4/5 outer display',
    },
    {
      id: 'galaxy-s25',
      label: 'Galaxy S25 / S24 / S23',
      width: 360,
      height: 800,
      category: 'Phones',
      description: 'Samsung flagship',
    },
    {
      id: 'galaxy-a-760',
      label: 'Galaxy A (budget, 760)',
      width: 360,
      height: 760,
      category: 'Phones',
      description: 'Budget Android',
    },
    {
      id: 'galaxy-a-780',
      label: 'Galaxy A13 / A23',
      width: 360,
      height: 780,
      category: 'Phones',
      description: 'Mid-range Android',
    },
    {
      id: 'galaxy-a-804',
      label: 'Galaxy A (mid, 804)',
      width: 360,
      height: 804,
      category: 'Phones',
      description: 'Mid-range Android',
    },
    {
      id: 'galaxy-a-806',
      label: 'Galaxy A / Xiaomi (806)',
      width: 360,
      height: 806,
      category: 'Phones',
      description: 'Popular Android viewport',
    },
    {
      id: 'iphone-se',
      label: 'iPhone SE',
      width: 375,
      height: 667,
      category: 'Phones',
      description: 'Classic 4.7" form factor',
    },
    {
      id: 'iphone-x',
      label: 'iPhone X / XS / 12 Mini / 13 Mini',
      width: 375,
      height: 812,
      category: 'Phones',
      description: 'First notch iPhones',
    },
    {
      id: 'galaxy-s24',
      label: 'Galaxy S24 / A55',
      width: 384,
      height: 832,
      category: 'Phones',
      description: 'Samsung mid flagship',
    },
    {
      id: 'galaxy-a-854',
      label: 'Galaxy A14 / A series (854)',
      width: 384,
      height: 854,
      category: 'Phones',
      description: 'Budget Galaxy A',
    },
    {
      id: 'galaxy-a-857',
      label: 'Galaxy A series (857)',
      width: 384,
      height: 857,
      category: 'Phones',
      description: 'Mid-range Galaxy A',
    },
    {
      id: 'galaxy-s25-new',
      label: 'Galaxy S25 / S25+',
      width: 385,
      height: 854,
      category: 'Phones',
      description: 'Latest Samsung flagship',
    },
    {
      id: 'iphone-16',
      label: 'iPhone 16 / 15 / 14 / 13 / 12',
      width: 390,
      height: 844,
      category: 'Phones',
      description: 'Standard 6.1" OLED',
    },
    {
      id: 'xiaomi-851',
      label: 'Xiaomi / Samsung (851)',
      width: 393,
      height: 851,
      category: 'Phones',
      description: 'Popular Android viewport',
    },
    {
      id: 'iphone-16-pro',
      label: 'iPhone 16 Pro / 15 Pro / Z Flip',
      width: 393,
      height: 852,
      category: 'Phones',
      description: 'Dynamic Island Pro',
    },
    {
      id: 'galaxy-a54',
      label: 'Galaxy A54 / A55',
      width: 393,
      height: 873,
      category: 'Phones',
      description: 'Mid-range Samsung',
    },
    {
      id: 'iphone-17',
      label: 'iPhone 17 / 17 Pro',
      width: 402,
      height: 874,
      category: 'Phones',
      description: 'Next-gen iPhone',
    },
    {
      id: 'pixel-10-pro',
      label: 'Pixel 10 Pro',
      width: 410,
      height: 892,
      category: 'Phones',
      description: 'Latest Pixel Pro',
    },
    {
      id: 'pixel-9-pro',
      label: 'Pixel 9 Pro / OnePlus',
      width: 412,
      height: 892,
      category: 'Phones',
      description: 'Pixel 9 Pro flagship',
    },
    {
      id: 'pixel-10',
      label: 'Pixel 10 / 9 / 8 / 7 / Galaxy S Ultra',
      width: 412,
      height: 915,
      category: 'Phones',
      description: 'Stock Android standard',
    },
    {
      id: 'iphone-11',
      label: 'iPhone 11 / XR / Pixel Pro XL',
      width: 414,
      height: 896,
      category: 'Phones',
      description: 'LCD era large',
    },
    {
      id: 'iphone-16-plus',
      label: 'iPhone 16 Plus / 15 Plus / 12 Pro Max / 13 Pro Max',
      width: 428,
      height: 926,
      category: 'Phones',
      description: 'Large 6.7" OLED',
    },
    {
      id: 'iphone-16-pro-max',
      label: 'iPhone 16 Pro Max / 15 Pro Max / 14 Pro Max',
      width: 430,
      height: 932,
      category: 'Phones',
      description: 'Largest Pro Max',
    },
    {
      id: 'iphone-17-pro-max',
      label: 'iPhone 17 Pro Max',
      width: 440,
      height: 956,
      category: 'Phones',
      description: 'Next-gen Pro Max',
    },
    /* ── Foldables ───────────────────────────────────────────── */
    {
      id: 'galaxy-z-fold-main',
      label: 'Galaxy Z Fold (Main)',
      width: 619,
      height: 876,
      category: 'Foldables',
      description: 'Fold 4/5 inner display',
    },
    {
      id: 'galaxy-z-flip',
      label: 'Galaxy Z Flip',
      width: 412,
      height: 846,
      category: 'Foldables',
      description: 'Clamshell foldable',
    },
    {
      id: 'pixel-fold-main',
      label: 'Pixel Fold (Main)',
      width: 692,
      height: 1004,
      category: 'Foldables',
      description: 'Google foldable inner',
    },
    /* ── E-Readers ───────────────────────────────────────────── */
    {
      id: 'kindle-pw',
      label: 'Kindle Paperwhite',
      width: 632,
      height: 842,
      category: 'E-Readers',
      description: 'E-ink reader 6.8"',
    },
    {
      id: 'kindle-oasis',
      label: 'Kindle Oasis',
      width: 640,
      height: 920,
      category: 'E-Readers',
      description: 'Premium E-ink 7"',
    },
    /* ── Fire Tablets ────────────────────────────────────────── */
    {
      id: 'fire-7',
      label: 'Amazon Fire 7',
      width: 600,
      height: 1024,
      category: 'Fire Tablets',
      description: 'Budget 7" tablet',
    },
    {
      id: 'fire-hd-8',
      label: 'Amazon Fire HD 8',
      width: 601,
      height: 1007,
      category: 'Fire Tablets',
      description: 'Mid-range 8" tablet',
    },
    {
      id: 'fire-hd-10',
      label: 'Amazon Fire HD 10',
      width: 810,
      height: 1080,
      category: 'Fire Tablets',
      description: '10.1" tablet',
    },
    {
      id: 'fire-max-11',
      label: 'Amazon Fire Max 11',
      width: 1200,
      height: 2000,
      category: 'Fire Tablets',
      description: 'Premium 11" tablet',
    },
    /* ── Tablets ─────────────────────────────────────────────── */
    {
      id: 'ipad-mini',
      label: 'iPad Mini',
      width: 744,
      height: 1133,
      category: 'Tablets',
      description: '8.3" compact tablet',
    },
    {
      id: 'surface-go',
      label: 'Surface Go',
      width: 768,
      height: 1024,
      category: 'Tablets',
      description: 'Microsoft 10.5"',
    },
    {
      id: 'galaxy-tab',
      label: 'Galaxy Tab S7+ / S9',
      width: 800,
      height: 1280,
      category: 'Tablets',
      description: 'Samsung tablet',
    },
    {
      id: 'ipad-10',
      label: 'iPad 10th gen',
      width: 810,
      height: 1080,
      category: 'Tablets',
      description: 'Standard iPad',
    },
    {
      id: 'ipad-air',
      label: 'iPad Air',
      width: 820,
      height: 1180,
      category: 'Tablets',
      description: 'M-series chip',
    },
    {
      id: 'ipad-pro-11',
      label: 'iPad Pro 11"',
      width: 834,
      height: 1194,
      category: 'Tablets',
      description: 'Pro compact',
    },
    {
      id: 'surface-pro',
      label: 'Surface Pro',
      width: 912,
      height: 1368,
      category: 'Tablets',
      description: 'Microsoft 13"',
    },
    {
      id: 'ipad-pro-12',
      label: 'iPad Pro 12.9" / 13"',
      width: 1024,
      height: 1366,
      category: 'Tablets',
      description: 'Pro full-size',
    },
    {
      id: 'xiaomi-pad',
      label: 'Xiaomi Pad 6',
      width: 1200,
      height: 2000,
      category: 'Tablets',
      description: 'Android 12.4" tablet',
    },
    /* ── Chromebooks ─────────────────────────────────────────── */
    {
      id: 'chromebook',
      label: 'Chromebook (common)',
      width: 1366,
      height: 768,
      category: 'Chromebooks',
      description: 'Standard Chromebook',
    },
    {
      id: 'chromebook-hd',
      label: 'Chromebook HD+',
      width: 1536,
      height: 864,
      category: 'Chromebooks',
      description: 'High-res Chromebook',
    },
    /* ── Handhelds ───────────────────────────────────────────── */
    {
      id: 'steam-deck',
      label: 'Steam Deck',
      width: 1280,
      height: 800,
      category: 'Handhelds',
      description: 'Valve handheld',
    },
    {
      id: 'steam-deck-oled',
      label: 'Steam Deck OLED',
      width: 1280,
      height: 800,
      category: 'Handhelds',
      description: 'OLED variant',
    },
    {
      id: 'switch',
      label: 'Nintendo Switch',
      width: 1280,
      height: 720,
      category: 'Handhelds',
      description: 'Original / Lite',
    },
    {
      id: 'switch-oled',
      label: 'Nintendo Switch OLED',
      width: 1280,
      height: 720,
      category: 'Handhelds',
      description: '7" OLED model',
    },
    {
      id: 'switch-2',
      label: 'Nintendo Switch 2',
      width: 1920,
      height: 1080,
      category: 'Handhelds',
      description: 'Next-gen Nintendo',
    },
    {
      id: 'ps-portal',
      label: 'PlayStation Portal',
      width: 1920,
      height: 1080,
      category: 'Handhelds',
      description: 'PS5 Remote Play',
    },
    {
      id: 'rog-ally',
      label: 'ASUS ROG Ally',
      width: 1920,
      height: 1080,
      category: 'Handhelds',
      description: 'Windows handheld',
    },
    {
      id: 'lenovo-legion-go',
      label: 'Lenovo Legion Go',
      width: 2560,
      height: 1600,
      category: 'Handhelds',
      description: 'QHD+ handheld',
    },
    /* ── Laptop / Desktop ───────────────────────────────────── */
    {
      id: 'laptop-sm',
      label: 'Laptop (small)',
      width: 1280,
      height: 800,
      category: 'Laptop / Desktop',
      description: 'MacBook Air 13"',
    },
    {
      id: 'laptop-lg',
      label: 'Laptop (large)',
      width: 1440,
      height: 900,
      category: 'Laptop / Desktop',
      description: 'Standard 14–15" laptop',
    },
    {
      id: 'desktop-fhd',
      label: 'Desktop Full HD',
      width: 1920,
      height: 1080,
      category: 'Laptop / Desktop',
      description: '1080p Full HD',
    },
    {
      id: 'desktop-qhd',
      label: 'Desktop QHD',
      width: 2560,
      height: 1440,
      category: 'Laptop / Desktop',
      description: '1440p QHD',
    },
    {
      id: 'ultrawide',
      label: 'Ultrawide',
      width: 3440,
      height: 1440,
      category: 'Laptop / Desktop',
      description: '21:9 ultrawide',
    },
    {
      id: 'desktop-4k',
      label: 'Desktop 4K',
      width: 3840,
      height: 2160,
      category: 'Laptop / Desktop',
      description: '2160p Ultra HD',
    },
    /* ── Smart Displays ─────────────────────────────────────── */
    {
      id: 'echo-show-5',
      label: 'Echo Show 5',
      width: 960,
      height: 480,
      category: 'Smart Displays',
      description: 'Amazon 5.5"',
    },
    {
      id: 'nest-hub',
      label: 'Google Nest Hub',
      width: 1024,
      height: 600,
      category: 'Smart Displays',
      description: 'Google 7"',
    },
    {
      id: 'echo-show-8',
      label: 'Echo Show 8',
      width: 1200,
      height: 800,
      category: 'Smart Displays',
      description: 'Amazon 8"',
    },
    {
      id: 'echo-show-10',
      label: 'Echo Show 10',
      width: 1200,
      height: 800,
      category: 'Smart Displays',
      description: 'Amazon 10.1" rotating',
    },
    {
      id: 'nest-hub-max',
      label: 'Google Nest Hub Max',
      width: 1280,
      height: 800,
      category: 'Smart Displays',
      description: 'Google 10"',
    },
    {
      id: 'echo-show-15',
      label: 'Echo Show 15',
      width: 1920,
      height: 1080,
      category: 'Smart Displays',
      description: 'Amazon 15.6" wall mount',
    },
    /* ── iOS Widgets ─────────────────────────────────────────── */
    {
      id: 'ios-widget-sm',
      label: 'Small Widget',
      width: 170,
      height: 170,
      category: 'iOS Widgets',
      description: 'iPhone home screen',
    },
    {
      id: 'ios-widget-md',
      label: 'Medium Widget',
      width: 364,
      height: 170,
      category: 'iOS Widgets',
      description: 'iPhone home screen',
    },
    {
      id: 'ios-widget-lg',
      label: 'Large Widget',
      width: 364,
      height: 382,
      category: 'iOS Widgets',
      description: 'iPhone home screen',
    },
    {
      id: 'ios-widget-xl',
      label: 'Extra Large Widget',
      width: 795,
      height: 382,
      category: 'iOS Widgets',
      description: 'iPad only',
    },
    /* ── Android Widgets ─────────────────────────────────────── */
    {
      id: 'android-widget-1x1',
      label: '1×1 Widget',
      width: 57,
      height: 57,
      category: 'Android Widgets',
      description: 'Smallest widget cell',
    },
    {
      id: 'android-widget-2x1',
      label: '2×1 Widget',
      width: 130,
      height: 57,
      category: 'Android Widgets',
      description: 'Wide single row',
    },
    {
      id: 'android-widget-2x2',
      label: '2×2 Widget',
      width: 130,
      height: 130,
      category: 'Android Widgets',
      description: 'Small square widget',
    },
    {
      id: 'android-widget-3x2',
      label: '3×2 Widget',
      width: 203,
      height: 130,
      category: 'Android Widgets',
      description: 'Medium widget',
    },
    {
      id: 'android-widget-4x1',
      label: '4×1 Widget',
      width: 276,
      height: 57,
      category: 'Android Widgets',
      description: 'Full-width bar',
    },
    {
      id: 'android-widget-4x2',
      label: '4×2 Widget',
      width: 276,
      height: 130,
      category: 'Android Widgets',
      description: 'Full-width medium',
    },
    {
      id: 'android-widget-4x3',
      label: '4×3 Widget',
      width: 276,
      height: 203,
      category: 'Android Widgets',
      description: 'Full-width large',
    },
    {
      id: 'android-widget-4x4',
      label: '4×4 Widget',
      width: 276,
      height: 276,
      category: 'Android Widgets',
      description: 'Maximum widget size',
    },
    /* ── App Icons ────────────────────────────────────────────── */
    {
      id: 'icon-ios-appstore',
      label: 'iOS App Store',
      width: 1024,
      height: 1024,
      category: 'App Icons',
      description: 'App Store listing icon',
    },
    {
      id: 'icon-ios-3x',
      label: 'iPhone @3x',
      width: 180,
      height: 180,
      category: 'App Icons',
      description: 'Super Retina devices',
    },
    {
      id: 'icon-ios-2x',
      label: 'iPhone @2x',
      width: 120,
      height: 120,
      category: 'App Icons',
      description: 'Retina devices',
    },
    {
      id: 'icon-ipad-pro',
      label: 'iPad Pro',
      width: 167,
      height: 167,
      category: 'App Icons',
      description: 'iPad Pro @2x',
    },
    {
      id: 'icon-ipad',
      label: 'iPad',
      width: 152,
      height: 152,
      category: 'App Icons',
      description: 'iPad @2x',
    },
    {
      id: 'icon-ios-spotlight',
      label: 'iOS Spotlight @3x',
      width: 87,
      height: 87,
      category: 'App Icons',
      description: 'Search results',
    },
    {
      id: 'icon-ios-settings',
      label: 'iOS Settings @3x',
      width: 58,
      height: 58,
      category: 'App Icons',
      description: 'Settings app',
    },
    {
      id: 'icon-android-play',
      label: 'Google Play Store',
      width: 512,
      height: 512,
      category: 'App Icons',
      description: 'Play Store listing',
    },
    {
      id: 'icon-android-xxxhdpi',
      label: 'Android xxxhdpi',
      width: 192,
      height: 192,
      category: 'App Icons',
      description: '4x density',
    },
    {
      id: 'icon-android-xxhdpi',
      label: 'Android xxhdpi',
      width: 144,
      height: 144,
      category: 'App Icons',
      description: '3x density',
    },
    {
      id: 'icon-android-xhdpi',
      label: 'Android xhdpi',
      width: 96,
      height: 96,
      category: 'App Icons',
      description: '2x density',
    },
    {
      id: 'icon-android-hdpi',
      label: 'Android hdpi',
      width: 72,
      height: 72,
      category: 'App Icons',
      description: '1.5x density',
    },
    {
      id: 'icon-android-mdpi',
      label: 'Android mdpi',
      width: 48,
      height: 48,
      category: 'App Icons',
      description: '1x baseline density',
    },
    {
      id: 'icon-macos-appstore',
      label: 'macOS App Store',
      width: 1024,
      height: 1024,
      category: 'App Icons',
      description: 'Mac App Store',
    },
    {
      id: 'icon-macos-512',
      label: 'macOS 512',
      width: 512,
      height: 512,
      category: 'App Icons',
      description: 'Finder @2x',
    },
    {
      id: 'icon-macos-256',
      label: 'macOS 256',
      width: 256,
      height: 256,
      category: 'App Icons',
      description: 'Finder',
    },
    {
      id: 'icon-macos-128',
      label: 'macOS 128',
      width: 128,
      height: 128,
      category: 'App Icons',
      description: 'Dock @2x',
    },
    {
      id: 'icon-watchos-appstore',
      label: 'watchOS App Store',
      width: 1024,
      height: 1024,
      category: 'App Icons',
      description: 'Watch App Store',
    },
    {
      id: 'icon-watchos-home',
      label: 'watchOS Home 44mm',
      width: 88,
      height: 88,
      category: 'App Icons',
      description: 'Watch home screen',
    },
    /* ── Favicons ─────────────────────────────────────────────── */
    {
      id: 'favicon-pwa-512',
      label: 'PWA Icon 512',
      width: 512,
      height: 512,
      category: 'Favicons',
      description: 'Splash screen',
    },
    {
      id: 'favicon-pwa-192',
      label: 'PWA Icon 192',
      width: 192,
      height: 192,
      category: 'Favicons',
      description: 'Home screen icon',
    },
    {
      id: 'favicon-apple-touch',
      label: 'Apple Touch Icon',
      width: 180,
      height: 180,
      category: 'Favicons',
      description: 'iOS bookmark',
    },
    {
      id: 'favicon-32',
      label: 'Favicon 32x32',
      width: 32,
      height: 32,
      category: 'Favicons',
      description: 'Browser tab icon',
    },
    {
      id: 'favicon-16',
      label: 'Favicon 16x16',
      width: 16,
      height: 16,
      category: 'Favicons',
      description: 'Smallest favicon',
    },
    /* ── Social Media / OG ───────────────────────────────────── */
    {
      id: 'og-image',
      label: 'OG Image',
      width: 1200,
      height: 630,
      category: 'Social / OG',
      description: 'Facebook / LinkedIn',
    },
    {
      id: 'twitter-card',
      label: 'Twitter Card',
      width: 1200,
      height: 675,
      category: 'Social / OG',
      description: 'X / Twitter summary',
    },
    {
      id: 'instagram-post',
      label: 'Instagram Post',
      width: 1080,
      height: 1080,
      category: 'Social / OG',
      description: 'Square feed post',
    },
    {
      id: 'instagram-story',
      label: 'Instagram Story',
      width: 1080,
      height: 1920,
      category: 'Social / OG',
      description: '9:16 vertical',
    },
    {
      id: 'youtube-thumb',
      label: 'YouTube Thumbnail',
      width: 1280,
      height: 720,
      category: 'Social / OG',
      description: 'Video thumbnail',
    },
    /* ── Automotive ───────────────────────────────────────────── */
    {
      id: 'car-cluster',
      label: 'Car Instrument Cluster',
      width: 1280,
      height: 480,
      category: 'Automotive',
      description: 'Digital instrument panel',
    },
    {
      id: 'carplay',
      label: 'Apple CarPlay (wide)',
      width: 1920,
      height: 720,
      category: 'Automotive',
      description: 'Ultrawide CarPlay',
    },
    {
      id: 'android-auto',
      label: 'Android Auto',
      width: 1280,
      height: 720,
      category: 'Automotive',
      description: 'Standard auto display',
    },
    {
      id: 'tesla-rear',
      label: 'Tesla Rear Display',
      width: 1440,
      height: 900,
      category: 'Automotive',
      description: 'Rear passenger screen',
    },
    {
      id: 'tesla-3y',
      label: 'Tesla Model 3 / Y',
      width: 1920,
      height: 1200,
      category: 'Automotive',
      description: '15" center display',
    },
    {
      id: 'tesla-sx',
      label: 'Tesla Model S / X',
      width: 2200,
      height: 1300,
      category: 'Automotive',
      description: '17" center display',
    },
    {
      id: 'mbux',
      label: 'Mercedes MBUX Hyperscreen',
      width: 2400,
      height: 900,
      category: 'Automotive',
      description: '56" spanning display',
    },
    /* ── VR / AR ──────────────────────────────────────────────── */
    {
      id: 'quest-browser',
      label: 'Meta Quest Browser',
      width: 1280,
      height: 670,
      category: 'VR / AR',
      description: 'Quest 2/3/Pro browser',
    },
    {
      id: 'vision-pro',
      label: 'Apple Vision Pro (Safari)',
      width: 1280,
      height: 720,
      category: 'VR / AR',
      description: 'visionOS Safari',
    },
    /* ── Smart Appliances ────────────────────────────────────── */
    {
      id: 'family-hub',
      label: 'Samsung Family Hub (21.5")',
      width: 1920,
      height: 1080,
      category: 'Smart Appliances',
      description: 'Smart fridge display',
    },
    {
      id: 'family-hub-plus',
      label: 'Samsung Family Hub+ (32")',
      width: 1920,
      height: 1080,
      category: 'Smart Appliances',
      description: 'Large fridge display',
    },
    /* ── Kiosk / Signage ─────────────────────────────────────── */
    {
      id: 'kiosk-portrait',
      label: 'Kiosk Portrait',
      width: 1080,
      height: 1920,
      category: 'Kiosk / Signage',
      description: 'Vertical kiosk',
    },
    {
      id: 'kiosk-landscape',
      label: 'Kiosk Landscape',
      width: 1920,
      height: 1080,
      category: 'Kiosk / Signage',
      description: 'Horizontal kiosk',
    },
    /* ── TV ───────────────────────────────────────────────────── */
    {
      id: 'tv-sd',
      label: 'TV 480p / SD',
      width: 854,
      height: 480,
      category: 'TV',
      description: 'Standard definition',
    },
    {
      id: 'tv-hd',
      label: 'TV 720p / HD',
      width: 1280,
      height: 720,
      category: 'TV',
      description: 'Standard HD',
    },
    {
      id: 'tv-fhd',
      label: 'TV 1080p / Full HD',
      width: 1920,
      height: 1080,
      category: 'TV',
      description: 'Full HD 1080p',
    },
    {
      id: 'tv-4k',
      label: 'TV 4K / Ultra HD',
      width: 3840,
      height: 2160,
      category: 'TV',
      description: 'Ultra HD 4K',
    },
    {
      id: 'tv-8k',
      label: 'TV 8K',
      width: 7680,
      height: 4320,
      category: 'TV',
      description: 'Ultra HD 8K',
    },
  ];

  /** Color vision deficiency menu items grouped by cone type. */
  const COLOR_VISION_ITEMS: Array<{
    /** Simulation identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Brief clinical description. */
    description: Str;
    /** Approximate population prevalence. */
    prevalence: Str;
    /** Cone type category. */
    category: Str;
    /** Category dot color (Tailwind bg class). */
    dotColor: Str;
  }> = [
    {
      id: 'protanopia',
      label: 'Protanopia',
      description: 'No red cones — reds appear dark',
      prevalence: '~1%',
      category: 'Red (Protan)',
      dotColor: 'bg-red-500',
    },
    {
      id: 'protanomaly',
      label: 'Protanomaly',
      description: 'Weak red cones — reduced red sensitivity',
      prevalence: '~1%',
      category: 'Red (Protan)',
      dotColor: 'bg-red-500',
    },
    {
      id: 'deuteranopia',
      label: 'Deuteranopia',
      description: 'No green cones — greens appear beige',
      prevalence: '~1%',
      category: 'Green (Deutan)',
      dotColor: 'bg-green-500',
    },
    {
      id: 'deuteranomaly',
      label: 'Deuteranomaly',
      description: 'Weak green cones — most common CVD',
      prevalence: '~5%',
      category: 'Green (Deutan)',
      dotColor: 'bg-green-500',
    },
    {
      id: 'tritanopia',
      label: 'Tritanopia',
      description: 'No blue cones — blues appear green',
      prevalence: '~0.01%',
      category: 'Blue (Tritan)',
      dotColor: 'bg-blue-500',
    },
    {
      id: 'tritanomaly',
      label: 'Tritanomaly',
      description: 'Weak blue cones — reduced blue-yellow range',
      prevalence: '~0.01%',
      category: 'Blue (Tritan)',
      dotColor: 'bg-blue-500',
    },
    {
      id: 'achromatopsia',
      label: 'Achromatopsia',
      description: 'No color cones — full grayscale vision',
      prevalence: '~0.003%',
      category: 'Full (Achromat)',
      dotColor: 'bg-zinc-400',
    },
    {
      id: 'achromatomaly',
      label: 'Achromatomaly',
      description: 'Weak color cones — severely muted colors',
      prevalence: 'rare',
      category: 'Full (Achromat)',
      dotColor: 'bg-zinc-400',
    },
  ];

  /** Vision impairment simulation items. */
  const VISION_ITEMS: Array<{
    /** Simulation identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Brief description of the visual effect. */
    description: Str;
    /** Approximate population prevalence or context. */
    prevalence: Str;
    /** Impairment category. */
    category: Str;
  }> = [
    {
      id: 'blurred-vision',
      label: 'Blurred Vision',
      description: 'Uncorrected refractive error',
      prevalence: '~43%',
      category: 'Refractive',
    },
    {
      id: 'presbyopia',
      label: 'Presbyopia',
      description: 'Age-related near-focus loss (40+)',
      prevalence: '~25%',
      category: 'Refractive',
    },
    {
      id: 'cataracts',
      label: 'Cataracts',
      description: 'Clouded lens — hazy, yellowed vision',
      prevalence: '~15%',
      category: 'Degenerative',
    },
    {
      id: 'macular-degeneration',
      label: 'Macular Degeneration',
      description: 'Central vision loss — blurred center',
      prevalence: '~9%',
      category: 'Degenerative',
    },
    {
      id: 'glaucoma',
      label: 'Glaucoma',
      description: 'Optic nerve damage — peripheral loss',
      prevalence: '~3%',
      category: 'Degenerative',
    },
    {
      id: 'tunnel-vision',
      label: 'Tunnel Vision',
      description: 'Extreme peripheral vision loss',
      prevalence: '~2%',
      category: 'Degenerative',
    },
    {
      id: 'low-contrast',
      label: 'Low Contrast',
      description: 'Reduced contrast sensitivity',
      prevalence: 'common',
      category: 'Environmental',
    },
    {
      id: 'sunlight-glare',
      label: 'Sunlight Glare',
      description: 'Outdoor screen readability loss',
      prevalence: 'common',
      category: 'Environmental',
    },
    {
      id: 'color-desaturation',
      label: 'Color Desaturation',
      description: 'Age-related color fading (60+)',
      prevalence: '~20%',
      category: 'Environmental',
    },
  ];

  /** Text direction presets. */
  const DIR_PRESETS: Array<{
    /** Unique item identifier. */
    id: Str;
    /** Direction value applied to the component (auto, ltr, rtl, inherit). */
    dir: Str;
    /** Display label. */
    label: Str;
    /** What this direction does. */
    description: Str;
    /** Example languages/scripts. */
    examples: Str;
    /** Flow arrow indicator. */
    arrow: Str;
    /** Grouping category. */
    category: Str;
  }> = [
    {
      id: 'auto',
      dir: 'auto',
      label: 'Auto',
      description: 'Browser detects from content',
      examples: 'Unicode Bidi Algorithm',
      arrow: '↔',
      category: 'Base',
    },
    {
      id: 'ltr',
      dir: 'ltr',
      label: 'LTR',
      description: 'Left-to-right text flow',
      examples: 'Most Western languages',
      arrow: '→',
      category: 'Base',
    },
    {
      id: 'rtl',
      dir: 'rtl',
      label: 'RTL',
      description: 'Right-to-left text flow',
      examples: 'Arabic, Hebrew, Persian',
      arrow: '←',
      category: 'Base',
    },
    {
      id: 'inherit',
      dir: 'inherit',
      label: 'Inherit',
      description: 'Inherit from parent element',
      examples: 'Matches container direction',
      arrow: '↕',
      category: 'Base',
    },
    {
      id: 'ltr-latin',
      dir: 'ltr',
      label: 'Latin',
      description: 'Western European scripts',
      examples: 'English, French, German, Spanish, Portuguese',
      arrow: '→',
      category: 'LTR Scripts',
    },
    {
      id: 'ltr-cyrillic',
      dir: 'ltr',
      label: 'Cyrillic',
      description: 'Eastern European & Central Asian',
      examples: 'Russian, Ukrainian, Bulgarian, Serbian',
      arrow: '→',
      category: 'LTR Scripts',
    },
    {
      id: 'ltr-cjk',
      dir: 'ltr',
      label: 'CJK Horizontal',
      description: 'East Asian horizontal layout',
      examples: 'Chinese, Japanese, Korean',
      arrow: '→',
      category: 'LTR Scripts',
    },
    {
      id: 'ltr-devanagari',
      dir: 'ltr',
      label: 'Devanagari',
      description: 'South Asian Indic scripts',
      examples: 'Hindi, Sanskrit, Marathi, Nepali',
      arrow: '→',
      category: 'LTR Scripts',
    },
    {
      id: 'ltr-thai',
      dir: 'ltr',
      label: 'Thai / Khmer',
      description: 'Southeast Asian scripts',
      examples: 'Thai, Cambodian, Lao',
      arrow: '→',
      category: 'LTR Scripts',
    },
    {
      id: 'ltr-greek',
      dir: 'ltr',
      label: 'Greek',
      description: 'Hellenic script',
      examples: 'Modern Greek, Ancient Greek',
      arrow: '→',
      category: 'LTR Scripts',
    },
    {
      id: 'rtl-arabic',
      dir: 'rtl',
      label: 'Arabic',
      description: 'Arabic script family',
      examples: 'Arabic, Urdu, Pashto, Sindhi',
      arrow: '←',
      category: 'RTL Scripts',
    },
    {
      id: 'rtl-hebrew',
      dir: 'rtl',
      label: 'Hebrew',
      description: 'Hebrew script',
      examples: 'Hebrew, Yiddish, Ladino',
      arrow: '←',
      category: 'RTL Scripts',
    },
    {
      id: 'rtl-persian',
      dir: 'rtl',
      label: 'Persian / Farsi',
      description: 'Persian script variant',
      examples: 'Persian, Dari, Tajik',
      arrow: '←',
      category: 'RTL Scripts',
    },
    {
      id: 'rtl-syriac',
      dir: 'rtl',
      label: 'Syriac / Thaana',
      description: 'Historic & island RTL scripts',
      examples: 'Syriac, Dhivehi (Maldivian)',
      arrow: '←',
      category: 'RTL Scripts',
    },
  ];

  /** Font size presets organized by typographic category. */
  const FONT_SIZE_PRESETS: Array<{
    /** Size in pixels (0 = browser default). */
    px: Num;
    /** Display label. */
    label: Str;
    /** Scale factor relative to 16px base. */
    scale: Str;
    /** Typographic category for grouped display. */
    category: Str;
  }> = [
    { px: 0, label: 'Default (16px)', scale: '1.0x', category: '' },
    { px: 8, label: '8px', scale: '0.50x', category: 'Small' },
    { px: 9, label: '9px', scale: '0.56x', category: 'Small' },
    { px: 10, label: '10px', scale: '0.63x', category: 'Small' },
    { px: 11, label: '11px', scale: '0.69x', category: 'Small' },
    { px: 12, label: '12px', scale: '0.75x', category: 'Small' },
    { px: 13, label: '13px', scale: '0.81x', category: 'Body' },
    { px: 14, label: '14px', scale: '0.88x', category: 'Body' },
    { px: 15, label: '15px', scale: '0.94x', category: 'Body' },
    { px: 16, label: '16px', scale: '1.0x', category: 'Body' },
    { px: 17, label: '17px', scale: '1.06x', category: 'Body' },
    { px: 18, label: '18px', scale: '1.13x', category: 'Body' },
    { px: 20, label: '20px', scale: '1.25x', category: 'Heading' },
    { px: 22, label: '22px', scale: '1.38x', category: 'Heading' },
    { px: 24, label: '24px', scale: '1.50x', category: 'Heading' },
    { px: 28, label: '28px', scale: '1.75x', category: 'Heading' },
    { px: 32, label: '32px', scale: '2.0x', category: 'Heading' },
    { px: 36, label: '36px', scale: '2.25x', category: 'Heading' },
    { px: 40, label: '40px', scale: '2.50x', category: 'Display' },
    { px: 48, label: '48px', scale: '3.0x', category: 'Display' },
    { px: 56, label: '56px', scale: '3.50x', category: 'Display' },
    { px: 64, label: '64px', scale: '4.0x', category: 'Display' },
    { px: 72, label: '72px', scale: '4.50x', category: 'Display' },
    { px: 96, label: '96px', scale: '6.0x', category: 'Display' },
    { px: 128, label: '128px', scale: '8.0x', category: 'Display' },
  ];

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

  /* ------------------------------------------------------------------ */
  /*  Search state                                                       */
  /* ------------------------------------------------------------------ */

  let zoomSearchQuery: Str = $state('');
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

  /** Whether the reset confirmation is pending (two-click destructive pattern). */
  let pendingReset: Bool = $state(false);

  /* ------------------------------------------------------------------ */
  /*  Filtered derivations                                               */
  /* ------------------------------------------------------------------ */

  const filteredZoomPresets = $derived(
    zoomSearchQuery.length === 0
      ? ZOOM_PRESETS
      : ZOOM_PRESETS.filter((p) => {
          const q: Str = zoomSearchQuery.toLowerCase() as Str;
          return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }),
  );
  const filteredBgPresets = $derived(
    bgSearchQuery.length === 0
      ? BG_PRESETS
      : BG_PRESETS.filter((p) => {
          const q: Str = bgSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );
  const filteredBgCategories: Str[] = $derived([
    ...new Set(filteredBgPresets.map((p) => p.category)),
  ]);
  const activeBgLabel: Str = $derived.by((): Str => {
    if (activeBg === 'default') {
      return '' as Str;
    }
    if (activeBg.startsWith('#')) {
      return activeBg as Str;
    }
    const preset = BG_PRESETS.find((p) => p.id === activeBg);
    return preset ? (preset.label as Str) : ('' as Str);
  });
  const filteredOutlinePresets = $derived(
    outlineSearchQuery.length === 0
      ? OUTLINE_PRESETS
      : OUTLINE_PRESETS.filter((p) => {
          const q: Str = outlineSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );
  const filteredOutlineCategories: Str[] = $derived([
    ...new Set(filteredOutlinePresets.map((p) => p.category)),
  ]);
  const activeOutlineLabel: Str = $derived.by((): Str => {
    if (activeOutline === 'none') {
      return '' as Str;
    }
    if (activeOutline.startsWith('#')) {
      return activeOutline as Str;
    }
    const preset = OUTLINE_PRESETS.find((p) => p.id === activeOutline);
    return preset ? (preset.label as Str) : ('' as Str);
  });
  const filteredGridPresets = $derived(
    gridSearchQuery.length === 0
      ? GRID_PRESETS
      : GRID_PRESETS.filter((p) => {
          const q: Str = gridSearchQuery.toLowerCase() as Str;
          return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }),
  );
  const filteredGridFillPresets = $derived(
    gridSearchQuery.length === 0
      ? GRID_FILL_PRESETS
      : GRID_FILL_PRESETS.filter((p) => {
          const q: Str = gridSearchQuery.toLowerCase() as Str;
          return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }),
  );
  const activeGridLabel: Str = $derived.by((): Str => {
    if (activeGrid === 'none') {
      return '' as Str;
    }
    if (activeGrid.startsWith('#')) {
      return activeGrid as Str;
    }
    const preset = GRID_PRESETS.find((p) => p.id === activeGrid);
    return preset ? (preset.label as Str) : ('' as Str);
  });
  const filteredOrientationPresets = $derived(
    orientationSearchQuery.length === 0
      ? ORIENTATION_PRESETS
      : ORIENTATION_PRESETS.filter((p) => {
          const q: Str = orientationSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );
  const filteredOrientationCategories: Str[] = $derived([
    ...new Set(filteredOrientationPresets.map((p) => p.category)),
  ]);
  const filteredModePresets = $derived(
    modeSearchQuery.length === 0
      ? MODE_PRESETS
      : MODE_PRESETS.filter((p) => {
          const q: Str = modeSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.query.toLowerCase().includes(q)
          );
        }),
  );
  const activeModeLabel: Str = $derived.by((): Str => {
    if (activeMode === 'auto') {
      return '' as Str;
    }
    const preset = MODE_PRESETS.find((p) => p.id === activeMode);
    return preset ? (preset.label as Str) : ('' as Str);
  });
  const filteredThemePresets = $derived(
    themeSearchQuery.length === 0
      ? THEME_PRESETS
      : THEME_PRESETS.filter((p) => {
          const q: Str = themeSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );
  const filteredThemeCategories: Str[] = $derived([
    ...new Set(filteredThemePresets.map((p) => p.category)),
  ]);
  const activeThemeLabel: Str = $derived.by((): Str => {
    if (activeTheme === '') {
      return '' as Str;
    }
    const preset = THEME_PRESETS.find((p) => p.id === activeTheme);
    return preset ? (preset.label as Str) : ('' as Str);
  });
  const filteredMediaPrefGroups = $derived(
    mediaPrefSearchQuery.length === 0
      ? MEDIA_PREF_GROUPS
      : MEDIA_PREF_GROUPS.filter((g) => {
          const q: Str = mediaPrefSearchQuery.toLowerCase() as Str;
          return (
            g.label.toLowerCase().includes(q) ||
            g.description.toLowerCase().includes(q) ||
            g.query.toLowerCase().includes(q) ||
            g.options.some(
              (o) => o.label.toLowerCase().includes(q) || o.description.toLowerCase().includes(q),
            )
          );
        }),
  );
  const activeMediaPrefCount: Num = $derived(
    MEDIA_PREF_GROUPS.filter((g) => {
      const val: Str = activeMediaPrefs[g.pref] ?? g.defaultValue;
      return val !== g.defaultValue;
    }).length as Num,
  );
  const filteredNetworkPresets = $derived(
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
  const filteredNetworkCategories: Str[] = $derived([
    ...new Set(filteredNetworkPresets.filter((p) => p.category).map((p) => p.category)),
  ]);
  const activeNetworkLabel: Str = $derived.by(() => {
    if (activeNetworkSim === 'none') {
      return '' as Str;
    }
    if (activeNetworkSim === 'custom') {
      return `Custom ${activeCustomNetwork.delay}ms` as Str;
    }
    const found = NETWORK_PRESETS.find((p) => p.id === activeNetworkSim);
    return (found?.label ?? '') as Str;
  });
  const filteredViewportPresets = $derived(
    viewportSearchQuery.length === 0
      ? VIEWPORT_PRESETS
      : VIEWPORT_PRESETS.filter((item) => {
          const q: Str = viewportSearchQuery.toLowerCase() as Str;
          const dims: Str = `${item.width}x${item.height}` as Str;
          return (
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            dims.includes(q)
          );
        }),
  );
  const filteredViewportCategories: Str[] = $derived([
    ...new Set(filteredViewportPresets.map((p) => p.category)),
  ]);
  const activeViewportLabel: Str = $derived.by((): Str => {
    if (activeViewport === 'auto') {
      return '' as Str;
    }
    if (activeViewport === 'custom') {
      return `${activeCustomViewport.w}×${activeCustomViewport.h}` as Str;
    }
    const found = VIEWPORT_PRESETS.find((p) => p.id === activeViewport);
    return found ? (found.label as Str) : ('' as Str);
  });
  const filteredColorItems = $derived(
    COLOR_VISION_ITEMS.filter((item) => {
      const q: Str = simSearchQuery.toLowerCase() as Str;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }),
  );
  const filteredColorCategories: Str[] = $derived([
    ...new Set(filteredColorItems.filter((p) => p.category).map((p) => p.category)),
  ]);
  const filteredVisionItems = $derived(
    VISION_ITEMS.filter((item) => {
      const q: Str = simSearchQuery.toLowerCase() as Str;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }),
  );
  const filteredVisionCategories: Str[] = $derived([
    ...new Set(filteredVisionItems.filter((p) => p.category).map((p) => p.category)),
  ]);
  const filteredDirPresets = $derived(
    dirSearchQuery.length === 0
      ? DIR_PRESETS
      : DIR_PRESETS.filter((p) => {
          const q: Str = dirSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.examples.toLowerCase().includes(q)
          );
        }),
  );
  const filteredDirCategories: Str[] = $derived([
    ...new Set(filteredDirPresets.map((p) => p.category)),
  ]);
  const activeDirLabel: Str = $derived.by((): Str => {
    if (activeDir === 'auto') {
      return '' as Str;
    }
    const base = DIR_PRESETS.find((p) => p.category === 'Base' && p.dir === activeDir);
    return base ? (base.label as Str) : ('' as Str);
  });
  const filteredFontSizePresets = $derived(
    FONT_SIZE_PRESETS.filter(
      (item) =>
        item.px === 0 || item.label.toLowerCase().includes(fontSizeSearchQuery.toLowerCase()),
    ),
  );
  const filteredFontSizeCategories: Str[] = $derived([
    ...new Set(filteredFontSizePresets.filter((p) => p.category).map((p) => p.category)),
  ]);
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
    {#if activeBgLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeBgLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
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
      {#each filteredBgCategories as category (category)}
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredBgPresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('bg', preset.id)}>
            <Check
              class={cn(
                'size-4 shrink-0 transition-opacity duration-150',
                activeBg !== preset.id && 'opacity-0',
              )}
            />
            {#if preset.id !== 'default'}
              <span
                class="inline-block size-4 shrink-0 rounded-sm border"
                style={preset.style || 'background-color: transparent'}
              ></span>
            {/if}
            <div class="flex flex-col">
              <span>{preset.label}</span>
              <span class="font-mono text-[10px] leading-tight text-muted-foreground"
                >{preset.description}</span
              >
            </div>
          </DropdownMenu.Item>
        {/each}
        {#if category !== filteredBgCategories[filteredBgCategories.length - 1]}
          <DropdownMenu.Separator />
        {/if}
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
    </div>
    <DropdownMenu.Separator />
    <div class="shrink-0 px-2 py-1.5">
      <div class="mb-1.5 flex items-center justify-between">
        <p class="text-xs font-medium text-muted-foreground">Custom Color</p>
        {#if activeBg.startsWith('#')}
          <span class="font-mono text-[10px] text-muted-foreground">{activeBg}</span>
        {/if}
      </div>
      <ColorPicker
        value={activeBg.startsWith('#') ? activeBg : '#ffffff'}
        onValueChange={(v) => onSetting('bg', v)}
      />
    </div>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Zoom submenu                                                      -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<DropdownMenu.Sub
  onOpenChange={(open) => {
    if (open) zoomSearchQuery = '';
  }}
>
  <DropdownMenu.SubTrigger>
    <ZoomIn class="size-4" />
    Zoom
    <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
      >{getZoomLabel()}</span
    >
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-96 w-72 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search zoom levels..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={zoomSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <!-- Zoom Actions -->
      <DropdownMenu.Label class="text-xs">Actions</DropdownMenu.Label>
      <DropdownMenu.Item
        closeOnSelect={false}
        onclick={() => onSetting('zoom', Math.min(activeZoom + ZOOM_STEP, ZOOM_MAX))}
        disabled={activeZoom >= ZOOM_MAX}
      >
        <ZoomIn class="size-4" />
        <div class="flex flex-col gap-0.5">
          <span class="text-sm">Zoom In</span>
          <span class="text-[11px] text-muted-foreground">Increase by 25%</span>
        </div>
      </DropdownMenu.Item>
      <DropdownMenu.Item
        closeOnSelect={false}
        onclick={() => onSetting('zoom', Math.max(activeZoom - ZOOM_STEP, ZOOM_MIN))}
        disabled={activeZoom <= ZOOM_MIN}
      >
        <ZoomOut class="size-4" />
        <div class="flex flex-col gap-0.5">
          <span class="text-sm">Zoom Out</span>
          <span class="text-[11px] text-muted-foreground">Decrease by 25%</span>
        </div>
      </DropdownMenu.Item>
      <DropdownMenu.Item
        closeOnSelect={false}
        onclick={() => onSetting('zoom', 1)}
        disabled={activeZoom === 1}
      >
        <Maximize class="size-4" />
        <div class="flex flex-col gap-0.5">
          <span class="text-sm">Reset (100%)</span>
          <span class="text-[11px] text-muted-foreground">Restore to actual size</span>
        </div>
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      <!-- Zoom Level Presets -->
      <DropdownMenu.Label class="text-xs">Zoom Level</DropdownMenu.Label>
      {#each filteredZoomPresets as preset (preset.value)}
        <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('zoom', preset.value)}>
          <Check
            class={cn(
              'size-4 shrink-0 transition-opacity duration-150',
              activeZoom !== preset.value && 'opacity-0',
            )}
          />
          <div class="flex flex-col gap-0.5">
            <span class="text-sm">{preset.label}</span>
            <span class="text-[11px] text-muted-foreground">{preset.description}</span>
          </div>
        </DropdownMenu.Item>
      {:else}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No zoom levels found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/each}
    </div>
    <!-- Sticky custom section -->
    <DropdownMenu.Separator />
    <div class="shrink-0 px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom ({getZoomLabel()})</p>
      <Slider
        type="single"
        value={Math.round(activeZoom * 100)}
        min={ZOOM_MIN * 100}
        max={ZOOM_MAX * 100}
        step={1}
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
    {#if activeOutlineLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeOutlineLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
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
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('outline', 'none')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeOutline !== 'none' && 'opacity-0',
          )}
        />
        None
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      {#each filteredOutlineCategories as category (category)}
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredOutlinePresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('outline', preset.id)}>
            <Check
              class={cn(
                'size-4 shrink-0 transition-opacity duration-150',
                activeOutline !== preset.id && 'opacity-0',
              )}
            />
            <span
              class="inline-block size-4 shrink-0 rounded-sm border"
              style="background-color: {preset.color}"
            ></span>
            <div class="flex flex-col">
              <span>{preset.label}</span>
              <span class="font-mono text-[10px] leading-tight text-muted-foreground"
                >{preset.description}</span
              >
            </div>
          </DropdownMenu.Item>
        {/each}
        {#if category !== filteredOutlineCategories[filteredOutlineCategories.length - 1]}
          <DropdownMenu.Separator />
        {/if}
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
    </div>
    <DropdownMenu.Separator />
    <div class="shrink-0 space-y-3 px-2 py-1.5">
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <p class="text-xs font-medium text-muted-foreground">Custom Color</p>
          {#if activeOutline.startsWith('#')}
            <span class="font-mono text-[10px] text-muted-foreground">{activeOutline}</span>
          {/if}
        </div>
        <ColorPicker
          value={activeOutline.startsWith('#') ? activeOutline : '#ef4444'}
          onValueChange={(v) => onSetting('outline', v)}
        />
      </div>
      <div>
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">
          Thickness ({activeOutlineThickness}px)
        </p>
        <div class="mb-2.5 flex gap-1">
          {#each [1, 2, 3, 4] as px (px)}
            <button
              type="button"
              class={cn(
                'flex-1 rounded border px-1 py-0.5 text-center font-mono text-[10px] transition-colors',
                activeOutlineThickness === px
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
              onclick={() => onSetting('outlineThickness', px)}
            >
              {px}px
            </button>
          {/each}
        </div>
        <Slider
          type="single"
          value={activeOutlineThickness}
          min={1}
          max={8}
          step={1}
          onValueChange={(v) => onSetting('outlineThickness', v)}
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
    {#if activeGridLabel}
      <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
        >{activeGridLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-96 w-72 flex-col overflow-hidden">
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
      <!-- Grid Line Color -->
      <DropdownMenu.Label class="text-xs">Line Color</DropdownMenu.Label>
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('grid', 'none')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeGrid !== 'none' && 'opacity-0',
          )}
        />
        <div class="flex flex-col gap-0.5">
          <span class="text-sm">None</span>
          <span class="text-[11px] text-muted-foreground">No grid lines</span>
        </div>
      </DropdownMenu.Item>
      {#each filteredGridPresets as preset (preset.id)}
        <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('grid', preset.id)}>
          <Check
            class={cn(
              'size-4 shrink-0 transition-opacity duration-150',
              activeGrid !== preset.id && 'opacity-0',
            )}
          />
          <span
            class="inline-block size-3.5 shrink-0 rounded-sm border"
            style="background-color: {preset.color}"
          ></span>
          <div class="flex flex-col gap-0.5">
            <span class="text-sm">{preset.label}</span>
            <span class="text-[11px] text-muted-foreground">{preset.description}</span>
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
      <!-- Grid Fill Color -->
      <DropdownMenu.Label class="text-xs">Fill Color</DropdownMenu.Label>
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('gridFill', 'none')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeGridFill !== 'none' && 'opacity-0',
          )}
        />
        <div class="flex flex-col gap-0.5">
          <span class="text-sm">None</span>
          <span class="text-[11px] text-muted-foreground">Transparent background</span>
        </div>
      </DropdownMenu.Item>
      {#each filteredGridFillPresets as preset (preset.id)}
        <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('gridFill', preset.id)}>
          <Check
            class={cn(
              'size-4 shrink-0 transition-opacity duration-150',
              activeGridFill !== preset.id && 'opacity-0',
            )}
          />
          <span
            class="inline-block size-3.5 shrink-0 rounded-sm border"
            style="background-color: {preset.color}"
          ></span>
          <div class="flex flex-col gap-0.5">
            <span class="text-sm">{preset.label}</span>
            <span class="text-[11px] text-muted-foreground">{preset.description}</span>
          </div>
        </DropdownMenu.Item>
      {/each}
    </div>
    <!-- Sticky custom section -->
    <DropdownMenu.Separator />
    <div class="shrink-0 space-y-3 px-2 py-1.5">
      <div>
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Line Color</p>
        <ColorPicker
          value={activeGrid.startsWith('#') ? activeGrid : '#000000'}
          onValueChange={(v) => onSetting('grid', v)}
        />
      </div>
      <div>
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Fill Color</p>
        <ColorPicker
          value={activeGridFill.startsWith('#') ? activeGridFill : '#ffffff'}
          onValueChange={(v) => onSetting('gridFill', v)}
        />
      </div>
      <div>
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
    {#if activeOrientationLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeOrientationLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
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
    <div class="flex max-h-80 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Default</DropdownMenu.Label>
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('orientation', 'default')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeOrientation !== 'default' && 'opacity-0',
          )}
        />
        None (no rotation)
      </DropdownMenu.Item>
      {#each filteredOrientationCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredOrientationPresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item
            closeOnSelect={false}
            onclick={() => onSetting('orientation', preset.id)}
          >
            <div class="flex items-center gap-2">
              <Check
                class={cn(
                  'size-4 shrink-0 transition-opacity duration-150',
                  activeOrientation !== preset.id && 'opacity-0',
                )}
              />
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
              <div class="flex flex-col">
                <span class="text-sm">{preset.label}</span>
                <span class="text-[11px] text-muted-foreground">{preset.description}</span>
              </div>
            </div>
            <span class="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
              >{preset.rotation}°</span
            >
          </DropdownMenu.Item>
        {/each}
      {/each}
      {#if filteredOrientationCategories.length === 0}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No orientations found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/if}
    </div>
    <DropdownMenu.Separator />
    <div class="shrink-0 px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">
        Custom ({activeOrientation === 'custom' ? (active.customRotation ?? 0) : 0}°)
      </p>
      <Slider
        type="single"
        value={activeOrientation === 'custom' ? (active.customRotation ?? 0) : 0}
        min={0}
        max={359}
        step={1}
        onValueChange={(v) => {
          onSetting('customRotation', v);
          onSetting('orientation', 'custom');
        }}
      />
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
    {#if activeModeLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeModeLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-96 w-72 flex-col overflow-hidden">
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
      {#each filteredModePresets as preset (preset.id)}
        <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('mode', preset.id)}>
          <Check
            class={cn(
              'size-4 shrink-0 transition-opacity duration-150',
              activeMode !== preset.id && 'opacity-0',
            )}
          />
          <preset.icon class="size-4 shrink-0" />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="text-sm">{preset.label}</span>
              <code
                class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                >{preset.query}</code
              >
            </div>
            <span class="text-[11px] text-muted-foreground">{preset.description}</span>
          </div>
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
    {#if activeThemeLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeThemeLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
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
      {#each filteredThemeCategories as category (category)}
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredThemePresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('theme', preset.id)}>
            <Check
              class={cn(
                'size-4 shrink-0 transition-opacity duration-150',
                activeTheme !== preset.id && 'opacity-0',
              )}
            />
            {#if preset.dot}
              <span
                class="inline-block size-4 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
                style="background-color: {preset.dot}"
              ></span>
            {/if}
            <div class="flex flex-col gap-0.5">
              <span class="text-sm">{preset.label}</span>
              <span class="text-[11px] text-muted-foreground">{preset.description}</span>
            </div>
          </DropdownMenu.Item>
        {/each}
        {#if category !== filteredThemeCategories[filteredThemeCategories.length - 1]}
          <DropdownMenu.Separator />
        {/if}
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
    {#if activeMediaPrefCount > 0}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeMediaPrefCount}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[32rem] w-72 flex-col overflow-hidden">
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
        <DropdownMenu.Label class="flex items-center gap-2 text-xs">
          <span>{group.label}</span>
          <code
            class="ml-auto rounded bg-muted px-1 text-center font-mono text-[9px] text-muted-foreground/70"
            >{group.query}</code
          >
        </DropdownMenu.Label>
        <div class="px-2 pb-1">
          <p class="text-[11px] leading-tight text-muted-foreground">{group.description}</p>
        </div>
        {#each group.options as option (option.value)}
          <DropdownMenu.Item
            closeOnSelect={false}
            onclick={() => onSetting('mediaPref', { pref: group.pref, value: option.value })}
          >
            <Check
              class={cn(
                'size-4 shrink-0',
                (activeMediaPrefs[group.pref] ?? group.defaultValue) !== option.value &&
                  'opacity-0',
              )}
            />
            <div class="flex flex-col">
              <span>{option.label}</span>
              <span class="text-[11px] leading-tight text-muted-foreground"
                >{option.description}</span
              >
            </div>
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
    {#if activeMediaPrefCount > 0}
      <DropdownMenu.Separator />
      <div class="shrink-0 p-1">
        <DropdownMenu.Item
          closeOnSelect={false}
          onclick={() => {
            for (const group of MEDIA_PREF_GROUPS) {
              onSetting('mediaPref', { pref: group.pref, value: group.defaultValue });
            }
          }}
          variant="destructive"
        >
          <RotateCcw class="size-4" />
          Reset All Preferences
          <span class="ml-auto font-mono text-[10px] text-muted-foreground"
            >{activeMediaPrefCount} active</span
          >
        </DropdownMenu.Item>
      </div>
    {/if}
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
    {#if activeNetworkLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeNetworkLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search presets..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={networkSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex max-h-72 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('networkSim', 'none')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeNetworkSim !== 'none' && 'opacity-0',
          )}
        />
        <div class="flex flex-col">
          <span>No throttling</span>
          <span class="text-[10px] leading-tight text-muted-foreground"
            >Full speed, no artificial delay</span
          >
        </div>
      </DropdownMenu.Item>
      {#each filteredNetworkCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
          {#if category === 'Mobile'}
            <Signal class="size-3 text-muted-foreground" />
          {:else if category === 'Fixed'}
            <Wifi class="size-3 text-muted-foreground" />
          {:else if category === 'Satellite'}
            <Satellite class="size-3 text-muted-foreground" />
          {:else if category === 'Special'}
            <WifiOff class="size-3 text-muted-foreground" />
          {/if}
          {category}
        </DropdownMenu.Label>
        {#each filteredNetworkPresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item
            closeOnSelect={false}
            onclick={() => onSetting('networkSim', preset.id)}
          >
            <Check
              class={cn(
                'size-4 shrink-0 transition-opacity duration-150',
                activeNetworkSim !== preset.id && 'opacity-0',
              )}
            />
            {#if preset.id === 'offline'}
              <WifiOff class="size-3.5 text-destructive" />
            {/if}
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-2">
                <span class="truncate">{preset.label}</span>
                {#if preset.delay > 0}
                  <code
                    class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                    >{preset.delay >= 1000
                      ? `${(preset.delay / 1000).toFixed(preset.delay % 1000 === 0 ? 0 : 1)}s`
                      : `${preset.delay}ms`}</code
                  >
                {:else if preset.delay === -1}
                  <code
                    class="ml-auto shrink-0 rounded bg-destructive/10 px-1 py-0.5 font-mono text-lg leading-none text-destructive"
                    >∞</code
                  >
                {/if}
              </span>
              {#if preset.description}
                <span class="text-[10px] leading-tight text-muted-foreground"
                  >{preset.description}</span
                >
              {/if}
            </div>
          </DropdownMenu.Item>
        {/each}
      {/each}
      {#if filteredNetworkCategories.length === 0 && activeNetworkSim !== 'none'}
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
      <p class="mb-1 text-xs font-medium text-muted-foreground">
        Custom Latency ({activeCustomNetwork.delay}ms)
      </p>
      <div class="mb-2.5 flex gap-1">
        {#each [100, 500, 1000, 3000] as ms (ms)}
          <button
            type="button"
            class={cn(
              'flex-1 rounded border px-1 py-0.5 text-center font-mono text-[10px] transition-colors',
              activeNetworkSim === 'custom' && activeCustomNetwork.delay === ms
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
            onclick={() => {
              onSetting('customNetworkDelay', ms);
              onSetting('networkSim', 'custom');
            }}>{ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}</button
          >
        {/each}
      </div>
      <Slider
        type="single"
        value={activeCustomNetwork.delay}
        min={0}
        max={10000}
        step={50}
        onValueChange={(v) => onSetting('customNetworkDelay', v)}
        onValueCommit={() => onSetting('networkSim', 'custom')}
      />
      <div class="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0ms</span>
        <span>10,000ms</span>
      </div>
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
    {#if activeViewportLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeViewportLabel}</span
      >
    {/if}
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
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Size</DropdownMenu.Label>
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('viewport', 'auto')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeViewport !== 'auto' && 'opacity-0',
          )}
        />
        <div class="flex flex-col">
          <span>Auto (full width)</span>
          <span class="font-mono text-[10px] leading-tight text-muted-foreground"
            >Match container width</span
          >
        </div>
      </DropdownMenu.Item>
      {#each filteredViewportCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
          {#if category === 'Watches'}
            <Watch class="size-3" />
          {:else if category === 'Phones'}
            <Smartphone class="size-3" />
          {:else if category === 'Foldables'}
            <Smartphone class="size-3" />
          {:else if category === 'E-Readers'}
            <BookOpenText class="size-3" />
          {:else if category === 'Fire Tablets'}
            <Tablet class="size-3" />
          {:else if category === 'Tablets'}
            <Tablet class="size-3" />
          {:else if category === 'Chromebooks'}
            <Laptop class="size-3" />
          {:else if category === 'Handhelds'}
            <Gamepad2 class="size-3" />
          {:else if category === 'Laptop / Desktop'}
            <Laptop class="size-3" />
          {:else if category === 'Smart Displays'}
            <MonitorSmartphone class="size-3" />
          {:else if category === 'iOS Widgets'}
            <LayoutGrid class="size-3" />
          {:else if category === 'Android Widgets'}
            <LayoutGrid class="size-3" />
          {:else if category === 'App Icons'}
            <AppWindow class="size-3" />
          {:else if category === 'Favicons'}
            <Image class="size-3" />
          {:else if category === 'Social / OG'}
            <Share2 class="size-3" />
          {:else if category === 'Automotive'}
            <Car class="size-3" />
          {:else if category === 'VR / AR'}
            <Glasses class="size-3" />
          {:else if category === 'Smart Appliances'}
            <MonitorSmartphone class="size-3" />
          {:else if category === 'Kiosk / Signage'}
            <MonitorSmartphone class="size-3" />
          {:else if category === 'TV'}
            <Tv class="size-3" />
          {/if}
          {category}
        </DropdownMenu.Label>
        {#each filteredViewportPresets.filter((p) => p.category === category) as preset (preset.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('viewport', preset.id)}>
            <Check
              class={cn(
                'size-4 shrink-0 transition-opacity duration-150',
                activeViewport !== preset.id && 'opacity-0',
              )}
            />
            <div class="flex flex-col">
              <span class="truncate">{preset.label}</span>
              <span class="font-mono text-[10px] leading-tight text-muted-foreground"
                >{preset.width} &times; {preset.height} — {preset.description}</span
              >
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
    <div class="sticky bottom-0 bg-popover">
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
    {#if activeSimLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeSimLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search simulations..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={simSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex max-h-80 flex-col overflow-y-auto" use:lockHeight>
      {#each filteredColorCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredColorItems.filter((p) => p.category === category) as item (item.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('sim', item.id)}>
            <div class="flex items-center gap-2">
              <Check
                class={cn(
                  'size-4 shrink-0 transition-opacity duration-150',
                  activeSim !== item.id && 'opacity-0',
                )}
              />
              <span class={cn('size-2 shrink-0 rounded-full', item.dotColor)}></span>
              <div class="flex flex-col">
                <span class="text-sm">{item.label}</span>
                <span class="text-[11px] text-muted-foreground">{item.description}</span>
              </div>
            </div>
            <span class="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
              >{item.prevalence}</span
            >
          </DropdownMenu.Item>
        {/each}
      {/each}
      {#each filteredVisionCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredVisionItems.filter((p) => p.category === category) as item (item.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('sim', item.id)}>
            <div class="flex items-center gap-2">
              <Check
                class={cn(
                  'size-4 shrink-0 transition-opacity duration-150',
                  activeSim !== item.id && 'opacity-0',
                )}
              />
              <div class="flex flex-col">
                <span class="text-sm">{item.label}</span>
                <span class="text-[11px] text-muted-foreground">{item.description}</span>
              </div>
            </div>
            <span class="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
              >{item.prevalence}</span
            >
          </DropdownMenu.Item>
        {/each}
      {/each}
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
    <DropdownMenu.Separator />
    <div class="shrink-0">
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('sim', 'none')}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeSim !== 'none' && 'opacity-0',
          )}
        />
        None (reset)
      </DropdownMenu.Item>
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
    {#if activeDirLabel}
      <span
        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{activeDirLabel}</span
      >
    {/if}
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="flex max-h-80 w-72 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-1.5 pt-1">
      <div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search directions..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          bind:value={dirSearchQuery}
          onkeydown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
      {#each filteredDirCategories as category (category)}
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredDirPresets.filter((p) => p.category === category) as item (item.id)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('dir', item.dir)}>
            <Check
              class={cn(
                'size-4 transition-opacity duration-150',
                activeDir !== item.dir && 'opacity-0',
              )}
            />
            <div class="flex flex-1 items-center gap-2">
              <span class="font-mono text-base leading-none text-muted-foreground"
                >{item.arrow}</span
              >
              <div class="flex flex-col">
                <span>{item.label}</span>
                <span class="text-[11px] leading-tight text-muted-foreground"
                  >{item.description}</span
                >
                <span class="text-[10px] leading-tight text-muted-foreground/70"
                  >{item.examples}</span
                >
              </div>
            </div>
          </DropdownMenu.Item>
        {/each}
        {#if category !== filteredDirCategories[filteredDirCategories.length - 1]}
          <DropdownMenu.Separator />
        {/if}
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
    <DropdownMenu.Separator />
    <div class="shrink-0 px-3 py-2">
      <p class="text-[11px] leading-relaxed text-muted-foreground">
        The <code class="rounded bg-muted px-1 font-mono text-[10px]">dir</code> attribute controls text
        alignment, punctuation placement, and bidirectional text rendering. Test RTL to catch layout mirroring
        issues.
      </p>
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
  <DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
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
    <div class="flex max-h-72 flex-col overflow-y-auto" use:lockHeight>
      <DropdownMenu.Label class="text-xs">Base</DropdownMenu.Label>
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('fontSize', 0)}>
        <Check
          class={cn(
            'size-4 shrink-0 transition-opacity duration-150',
            activeFontSize !== 0 && 'opacity-0',
          )}
        />
        Default (16px)
        <span class="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">1.0x</span>
      </DropdownMenu.Item>
      {#each filteredFontSizeCategories as category (category)}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
        {#each filteredFontSizePresets.filter((p) => p.category === category) as preset (preset.px)}
          <DropdownMenu.Item closeOnSelect={false} onclick={() => onSetting('fontSize', preset.px)}>
            <Check
              class={cn(
                'size-4 shrink-0 transition-opacity duration-150',
                activeFontSize !== preset.px && 'opacity-0',
              )}
            />
            {preset.label}
            <span class="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground"
              >{preset.scale}</span
            >
          </DropdownMenu.Item>
        {/each}
      {/each}
      {#if filteredFontSizeCategories.length === 0}
        <div
          class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
        >
          <SearchX class="size-5" />
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-xs font-medium">No sizes found</p>
            <p class="text-[11px]">Try a different search term</p>
          </div>
        </div>
      {/if}
    </div>
    <DropdownMenu.Separator />
    <div class="shrink-0 px-2 py-1.5">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">
        Custom ({activeFontSize || 16}px &middot; {((activeFontSize || 16) / 16).toFixed(2)}x)
      </p>
      <Slider
        type="single"
        value={activeFontSize || 16}
        min={4}
        max={128}
        step={1}
        onValueChange={(v) => onSetting('fontSize', v)}
      />
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
    <DropdownMenu.SubContent class="flex max-h-[28rem] w-64 flex-col overflow-hidden">
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
          <DropdownMenu.Label class="flex items-center gap-1.5 text-xs">
            {#if category === 'Image'}
              <FileImage class="size-3 text-muted-foreground" />
            {:else if category === 'Document'}
              <FileType class="size-3 text-muted-foreground" />
            {:else if category === 'Clipboard'}
              <Clipboard class="size-3 text-muted-foreground" />
            {/if}
            {category}
          </DropdownMenu.Label>
          {#each filteredExportItems.filter((i) => i.category === category) as item (item.id)}
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                onExport(item.id);
              }}
            >
              {#if exportInProgress === item.id}
                <span in:fade={{ duration: 150 }}>
                  <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
                </span>
              {:else if exportFeedback === item.id}
                <span in:fade={{ duration: 150 }}>
                  <Check class="size-4 text-green-500" />
                </span>
              {:else}
                <span in:fade={{ duration: 150 }}>
                  <item.icon class="size-4"></item.icon>
                </span>
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
{/if}

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  Reset to Defaults                                                 -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

{#if showReset && onReset}
  <DropdownMenu.Separator />
  <DropdownMenu.Item
    onSelect={(e) => {
      e.preventDefault();
      if (pendingReset) {
        pendingReset = false;
        onReset();
      } else {
        pendingReset = true;
        setTimeout((): Void => {
          pendingReset = false;
        }, 3000);
      }
    }}
    variant="destructive"
    disabled={!hasActiveOverrides}
  >
    <RotateCcw class="size-4" />
    {pendingReset ? 'Confirm Reset' : 'Reset to Defaults'}
  </DropdownMenu.Item>
{/if}
