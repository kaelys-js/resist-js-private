<script lang="ts">
  /**
   * Icons — searchable Lucide icon gallery with customization controls.
   *
   * Displays a responsive grid of all available Lucide icons with
   * search filtering, category filter chips, size/stroke/color controls,
   * preview background toggle, grid density options, keyboard navigation,
   * URL state sync, a detail panel with copy-as dropdown and tag display,
   * and a page-level three-dot menu with export options for the full icon list.
   *
   * Uses import.meta.glob for reliable Vite-resolved icon loading.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
  import * as Slider from '@/ui/slider/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import Input from '@/ui/input/input.svelte';
  import Badge from '@/ui/badge/badge.svelte';
  import Shapes from '@lucide/svelte/icons/shapes';
  import SearchIcon from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import Code from '@lucide/svelte/icons/code';
  import FileCode from '@lucide/svelte/icons/file-code';
  import Hash from '@lucide/svelte/icons/hash';
  import Check from '@lucide/svelte/icons/check';
  import Tag from '@lucide/svelte/icons/tag';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Paintbrush from '@lucide/svelte/icons/paintbrush';
  import Palette from '@lucide/svelte/icons/palette';
  import SearchX from '@lucide/svelte/icons/search-x';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import type { Component } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import type { IconsData } from './+page.server.js';

  const { data }: { data: IconsData } = $props();

  /* ------------------------------------------------------------------ */
  /*  Icon module loader via import.meta.glob                            */
  /* ------------------------------------------------------------------ */

  /**
   * Vite-resolved lazy loaders for all Lucide icon .svelte components.
   * Keys are paths like `/node_modules/@lucide/svelte/dist/icons/arrow-right.svelte`.
   */
  const iconModules: Record<Str, () => Promise<{ default: Component }>> = import.meta.glob(
    '/node_modules/@lucide/svelte/dist/icons/*.svelte',
  ) as Record<Str, () => Promise<{ default: Component }>>;

  /**
   * Map from kebab-case icon name to its lazy loader function.
   * Built once from the glob result by extracting the filename.
   */
  const iconLoaders: Map<Str, () => Promise<{ default: Component }>> = new Map();
  for (const [path, loader] of Object.entries(iconModules)) {
    const match: RegExpMatchArray | null = path.match(/\/([^/]+)\.svelte$/);
    if (match) {
      iconLoaders.set(match[1] as Str, loader);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Category mapping — derived from icon name prefixes/keywords        */
  /* ------------------------------------------------------------------ */

  /**
   * Maps icon name prefixes/keywords to category labels.
   * An icon can belong to multiple categories. Order matters — first match wins for primary.
   */
  const CATEGORY_RULES: Array<{ category: Str; test: (name: Str) => Bool }> = [
    {
      category: 'Arrows' as Str,
      test: (n: Str) =>
        (n.startsWith('arrow') ||
          n.startsWith('chevron') ||
          n.startsWith('move') ||
          n.includes('corner')) as Bool,
    },
    {
      category: 'Files' as Str,
      test: (n: Str) =>
        (n.startsWith('file') || n.startsWith('folder') || n.startsWith('archive')) as Bool,
    },
    {
      category: 'Communication' as Str,
      test: (n: Str) =>
        (n.startsWith('mail') ||
          n.startsWith('message') ||
          n.startsWith('phone') ||
          n.startsWith('send') ||
          n.startsWith('inbox') ||
          n.startsWith('at-sign') ||
          n.startsWith('chat')) as Bool,
    },
    {
      category: 'Media' as Str,
      test: (n: Str) =>
        (n.startsWith('play') ||
          n.startsWith('pause') ||
          n.startsWith('volume') ||
          n.startsWith('music') ||
          n.startsWith('video') ||
          n.startsWith('camera') ||
          n.startsWith('image') ||
          n.startsWith('mic') ||
          n.startsWith('headphone') ||
          n.startsWith('speaker') ||
          n.startsWith('film') ||
          n.startsWith('podcast')) as Bool,
    },
    {
      category: 'Shapes' as Str,
      test: (n: Str) =>
        (n.startsWith('circle') ||
          n.startsWith('square') ||
          n.startsWith('triangle') ||
          n.startsWith('diamond') ||
          n.startsWith('hexagon') ||
          n.startsWith('octagon') ||
          n.startsWith('pentagon') ||
          n.startsWith('rectangle') ||
          n.startsWith('star')) as Bool,
    },
    {
      category: 'Text' as Str,
      test: (n: Str) =>
        (n.startsWith('text') ||
          n.startsWith('type') ||
          n.startsWith('heading') ||
          n.startsWith('bold') ||
          n.startsWith('italic') ||
          n.startsWith('underline') ||
          n.startsWith('strikethrough') ||
          n.startsWith('align') ||
          n.startsWith('list') ||
          n.startsWith('indent') ||
          n.startsWith('quote')) as Bool,
    },
    {
      category: 'Layout' as Str,
      test: (n: Str) =>
        (n.startsWith('layout') ||
          n.startsWith('grid') ||
          n.startsWith('sidebar') ||
          n.startsWith('panel') ||
          n.startsWith('columns') ||
          n.startsWith('rows') ||
          n.startsWith('split') ||
          n.startsWith('table')) as Bool,
    },
    {
      category: 'Charts' as Str,
      test: (n: Str) =>
        (n.startsWith('chart') ||
          n.startsWith('bar-chart') ||
          n.startsWith('pie-chart') ||
          n.startsWith('trending') ||
          n.startsWith('activity') ||
          n.startsWith('gauge')) as Bool,
    },
    {
      category: 'Weather' as Str,
      test: (n: Str) =>
        (n.startsWith('cloud') ||
          n.startsWith('sun') ||
          n.startsWith('moon') ||
          n.startsWith('wind') ||
          n.startsWith('rain') ||
          n.startsWith('snow') ||
          n.startsWith('thunder') ||
          n.startsWith('umbrella') ||
          n.startsWith('thermometer') ||
          n.startsWith('droplet')) as Bool,
    },
    {
      category: 'Security' as Str,
      test: (n: Str) =>
        (n.startsWith('lock') ||
          n.startsWith('unlock') ||
          n.startsWith('shield') ||
          n.startsWith('key') ||
          n.startsWith('fingerprint') ||
          n.startsWith('eye') ||
          n.startsWith('scan')) as Bool,
    },
    {
      category: 'Devices' as Str,
      test: (n: Str) =>
        (n.startsWith('monitor') ||
          n.startsWith('laptop') ||
          n.startsWith('tablet') ||
          n.startsWith('smartphone') ||
          n.startsWith('printer') ||
          n.startsWith('keyboard') ||
          n.startsWith('mouse') ||
          n.startsWith('cpu') ||
          n.startsWith('hard-drive') ||
          n.startsWith('server') ||
          n.startsWith('usb') ||
          n.startsWith('bluetooth') ||
          n.startsWith('wifi') ||
          n.startsWith('router')) as Bool,
    },
    {
      category: 'Users' as Str,
      test: (n: Str) =>
        (n.startsWith('user') ||
          n.startsWith('users') ||
          n.startsWith('contact') ||
          n.startsWith('person') ||
          n.startsWith('baby') ||
          n.startsWith('accessibility')) as Bool,
    },
    {
      category: 'Navigation' as Str,
      test: (n: Str) =>
        (n.startsWith('map') ||
          n.startsWith('compass') ||
          n.startsWith('navigation') ||
          n.startsWith('locate') ||
          n.startsWith('pin') ||
          n.startsWith('globe') ||
          n.startsWith('flag') ||
          n.startsWith('signpost') ||
          n.startsWith('milestone') ||
          n.startsWith('route')) as Bool,
    },
    {
      category: 'Tools' as Str,
      test: (n: Str) =>
        (n.startsWith('wrench') ||
          n.startsWith('hammer') ||
          n.startsWith('scissors') ||
          n.startsWith('paint') ||
          n.startsWith('brush') ||
          n.startsWith('ruler') ||
          n.startsWith('crop') ||
          n.startsWith('eraser') ||
          n.startsWith('pen') ||
          n.startsWith('pencil') ||
          n.startsWith('pipette') ||
          n.startsWith('slice') ||
          n.startsWith('wand')) as Bool,
    },
    {
      category: 'Commerce' as Str,
      test: (n: Str) =>
        (n.startsWith('shopping') ||
          n.startsWith('cart') ||
          n.startsWith('credit-card') ||
          n.startsWith('wallet') ||
          n.startsWith('receipt') ||
          n.startsWith('banknote') ||
          n.startsWith('coins') ||
          n.startsWith('badge') ||
          n.startsWith('tag') ||
          n.startsWith('gift') ||
          n.startsWith('store') ||
          n.startsWith('package')) as Bool,
    },
    {
      category: 'Time' as Str,
      test: (n: Str) =>
        (n.startsWith('clock') ||
          n.startsWith('timer') ||
          n.startsWith('calendar') ||
          n.startsWith('alarm') ||
          n.startsWith('hourglass') ||
          n.startsWith('watch') ||
          n.startsWith('history') ||
          n.startsWith('stopwatch')) as Bool,
    },
    {
      category: 'Social' as Str,
      test: (n: Str) =>
        (n.startsWith('share') ||
          n.startsWith('heart') ||
          n.startsWith('thumb') ||
          n.startsWith('bookmark') ||
          n.startsWith('bell') ||
          n.startsWith('megaphone') ||
          n.startsWith('rss')) as Bool,
    },
  ];

  /**
   * Get all category tags for a given icon name.
   *
   * @param name - Kebab-case icon name
   * @returns Array of category labels
   */
  function getIconCategories(name: Str): Str[] {
    const cats: Str[] = [];
    for (const rule of CATEGORY_RULES) {
      if (rule.test(name)) cats.push(rule.category);
    }
    return cats;
  }

  /**
   * Build a map from category → icon names for the entire library.
   * Used for category filter chips. Includes "Other" for uncategorized icons.
   */
  const categoryMap: Map<Str, Set<Str>> = new Map();
  const categorizedIcons: Set<Str> = new Set();
  for (const name of data.names) {
    const cats: Str[] = getIconCategories(name);
    if (cats.length > 0) {
      categorizedIcons.add(name);
      for (const cat of cats) {
        if (!categoryMap.has(cat)) categoryMap.set(cat, new Set());
        categoryMap.get(cat)?.add(name);
      }
    }
  }

  /* Add "Other" bucket for icons that match no category rules */
  const uncategorizedSet: Set<Str> = new Set(data.names.filter((n) => !categorizedIcons.has(n)));
  if (uncategorizedSet.size > 0) {
    categoryMap.set('Other' as Str, uncategorizedSet);
  }

  /** Sorted category names with icon counts ("Other" always last). */
  const allCategories: Array<{ name: Str; count: Num }> = [...categoryMap.entries()]
    .map(([name, icons]) => ({ name, count: icons.size as Num }))
    .toSorted((a, b) => {
      if (a.name === 'Other') return 1;
      if (b.name === 'Other') return -1;
      return a.name.localeCompare(b.name);
    });

  /* ------------------------------------------------------------------ */
  /*  Default values                                                     */
  /* ------------------------------------------------------------------ */

  const DEFAULT_SIZE: Num = 24 as Num;
  const DEFAULT_STROKE: Num = 2 as Num;
  const DEFAULT_COLOR: Str = 'currentColor' as Str;
  const DEFAULT_BG: Str = 'auto' as Str;
  const DEFAULT_DENSITY: Str = 'comfortable' as Str;
  const DEFAULT_THEME: Str = '' as Str;

  /* ------------------------------------------------------------------ */
  /*  Theme presets (matches LensCardSettingsMenu)                       */
  /* ------------------------------------------------------------------ */

  /** Theme preset descriptor. */
  type ThemePreset = { id: Str; label: Str; dot: Str; description: Str; category: Str };

  /** Available theme presets with color dot, description, and category. */
  const THEME_PRESETS: ThemePreset[] = [
    {
      id: '' as Str,
      label: 'Default' as Str,
      dot: '' as Str,
      description: 'Inherits from system theme' as Str,
      category: 'Base' as Str,
    },
    {
      id: 'midnight' as Str,
      label: 'Midnight' as Str,
      dot: 'oklch(0.55 0.22 260)' as Str,
      description: 'Deep navy with blue accents' as Str,
      category: 'Cool' as Str,
    },
    {
      id: 'ocean' as Str,
      label: 'Ocean' as Str,
      dot: 'oklch(0.52 0.15 200)' as Str,
      description: 'Calm teal-blue palette' as Str,
      category: 'Cool' as Str,
    },
    {
      id: 'slate' as Str,
      label: 'Slate' as Str,
      dot: 'oklch(0.48 0.08 240)' as Str,
      description: 'Muted blue-grey tones' as Str,
      category: 'Cool' as Str,
    },
    {
      id: 'warm' as Str,
      label: 'Warm' as Str,
      dot: 'oklch(0.50 0.16 50)' as Str,
      description: 'Golden amber warmth' as Str,
      category: 'Warm' as Str,
    },
    {
      id: 'sunset' as Str,
      label: 'Sunset' as Str,
      dot: 'oklch(0.55 0.20 30)' as Str,
      description: 'Orange-red gradient feel' as Str,
      category: 'Warm' as Str,
    },
    {
      id: 'copper' as Str,
      label: 'Copper' as Str,
      dot: 'oklch(0.52 0.16 60)' as Str,
      description: 'Rich earthy copper' as Str,
      category: 'Warm' as Str,
    },
    {
      id: 'rose' as Str,
      label: 'Rose' as Str,
      dot: 'oklch(0.55 0.18 350)' as Str,
      description: 'Soft pink accents' as Str,
      category: 'Warm' as Str,
    },
    {
      id: 'lavender' as Str,
      label: 'Lavender' as Str,
      dot: 'oklch(0.52 0.20 290)' as Str,
      description: 'Light purple harmony' as Str,
      category: 'Cool' as Str,
    },
    {
      id: 'amethyst' as Str,
      label: 'Amethyst' as Str,
      dot: 'oklch(0.52 0.22 310)' as Str,
      description: 'Deep purple richness' as Str,
      category: 'Cool' as Str,
    },
    {
      id: 'forest' as Str,
      label: 'Forest' as Str,
      dot: 'oklch(0.50 0.16 155)' as Str,
      description: 'Natural green tones' as Str,
      category: 'Cool' as Str,
    },
    {
      id: 'aurora' as Str,
      label: 'Aurora' as Str,
      dot: 'oklch(0.52 0.15 170)' as Str,
      description: 'Northern lights palette' as Str,
      category: 'Cool' as Str,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  URL state initialization                                           */
  /* ------------------------------------------------------------------ */

  /** Read initial values from URL search params (if present). */
  const initParams: URLSearchParams = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  );

  /** Search query for filtering icons. */
  let searchQuery: Str = $state((initParams.get('q') ?? '') as Str);

  /** Preview icon size in px (12–64). Single number for bits-ui type="single". */
  let previewSize: Num = $state(
    (initParams.has('size') ? Number(initParams.get('size')) || DEFAULT_SIZE : DEFAULT_SIZE) as Num,
  );

  /** Preview stroke width (0.5–4). Single number for bits-ui type="single". */
  let strokeWidth: Num = $state(
    (initParams.has('stroke')
      ? Number(initParams.get('stroke')) || DEFAULT_STROKE
      : DEFAULT_STROKE) as Num,
  );

  /** Icon color — 'currentColor' uses theme foreground. */
  let iconColor: Str = $state((initParams.get('color') ?? DEFAULT_COLOR) as Str);

  /** Preview background mode: 'auto' follows theme, 'light'/'dark' forces background. */
  let previewBg: Str = $state((initParams.get('bg') ?? DEFAULT_BG) as Str);

  /** Grid density: 'compact' (10 cols), 'comfortable' (6 cols), 'large' (4 cols). */
  let gridDensity: Str = $state((initParams.get('density') ?? DEFAULT_DENSITY) as Str);

  /** Active theme preset ID ('' = default/inherit). */
  let activeTheme: Str = $state((initParams.get('theme') ?? DEFAULT_THEME) as Str);

  /** Search query for filtering theme presets in the submenu. */
  let themeSearchQuery: Str = $state('' as Str);

  /** Currently selected icon name (null = no selection). */
  let selectedIcon: Str | null = $state((initParams.get('icon') ?? null) as Str | null);

  /** Active category filters (empty = show all, multiple = union). */
  let activeCategories: Str[] = $state(
    initParams.has('categories')
      ? ((initParams.get('categories') ?? '').split(',').filter((s) => s.length > 0) as Str[])
      : [],
  );

  /** Index of the currently focused icon in the grid (for keyboard navigation). */
  let focusedIndex: Num = $state(-1 as Num);

  /** Cache of loaded icon components. */
  const iconCache: Map<Str, Component> = new Map();

  /** Set of icons currently being loaded. */
  const loadingIcons: Set<Str> = new Set();

  /** Reactive trigger for icon loading — incremented when new icons finish loading. */
  let loadTick: Num = $state(0 as Num);

  /** SVG markup string for the selected icon (for CopyButton). */
  let selectedSvgMarkup: Str = $state('' as Str);

  /** Whether any control has been changed from defaults. */
  const isCustomized: Bool = $derived(
    (previewSize !== DEFAULT_SIZE ||
      strokeWidth !== DEFAULT_STROKE ||
      iconColor !== DEFAULT_COLOR ||
      previewBg !== DEFAULT_BG ||
      gridDensity !== DEFAULT_DENSITY ||
      activeTheme !== DEFAULT_THEME ||
      activeCategories.length > 0) as Bool,
  );

  /** Feedback state for detail panel copy dropdown — tracks which format was just copied. */
  let detailCopyFeedback: Str = $state('' as Str);

  /** Feedback state for page-level export menu. */
  let pageExportFeedback: Str = $state('' as Str);

  /* ------------------------------------------------------------------ */
  /*  Derived                                                            */
  /* ------------------------------------------------------------------ */

  /** Filtered icon names based on search and active categories (union). */
  const filteredNames: Str[] = $derived.by((): Str[] => {
    let result: Str[] = data.names;

    /* Category filter — union of all selected categories */
    if (activeCategories.length > 0) {
      const unionSet: Set<Str> = new Set();
      for (const cat of activeCategories) {
        const catIcons: Set<Str> | undefined = categoryMap.get(cat);
        if (catIcons) {
          for (const icon of catIcons) unionSet.add(icon);
        }
      }
      result = result.filter((name) => unionSet.has(name)) as Str[];
    }

    /* Search filter */
    if (searchQuery.length > 0) {
      const q: Str = searchQuery.toLowerCase() as Str;
      result = result.filter((name) => name.toLowerCase().includes(q)) as Str[];
    }

    return result;
  });

  /** Number of visible icons (pagination). */
  let visibleCount: Num = $state(200 as Num);

  /** Icons to display (paginated). */
  const displayNames: Str[] = $derived(filteredNames.slice(0, visibleCount as number) as Str[]);

  /** Whether there are more icons to show. */
  const hasMore: Bool = $derived((visibleCount as number) < filteredNames.length);

  /** Grid column classes based on density. */
  const gridCols: Str = $derived.by((): Str => {
    if (gridDensity === 'compact')
      return 'grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12' as Str;
    if (gridDensity === 'large')
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' as Str;
    return 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8' as Str;
  });

  /** Light-mode foreground color from :root in app.css. */
  const LIGHT_FOREGROUND: Str = 'oklch(0.145 0 0)' as Str;
  /** Dark-mode foreground color from .dark in app.css. */
  const DARK_FOREGROUND: Str = 'oklch(0.985 0 0)' as Str;

  /**
   * Theme primary colors for light and dark modes, extracted from app.css.
   * Keys are theme IDs, values are `{ light, dark }` primary colors.
   */
  const THEME_PRIMARY: Record<Str, { light: Str; dark: Str }> = {
    midnight: { light: 'oklch(0.55 0.22 260)' as Str, dark: 'oklch(0.7 0.2 260)' as Str },
    ocean: { light: 'oklch(0.52 0.15 200)' as Str, dark: 'oklch(0.68 0.14 200)' as Str },
    slate: { light: 'oklch(0.48 0.08 240)' as Str, dark: 'oklch(0.68 0.06 240)' as Str },
    warm: { light: 'oklch(0.5 0.16 50)' as Str, dark: 'oklch(0.7 0.14 50)' as Str },
    sunset: { light: 'oklch(0.55 0.2 30)' as Str, dark: 'oklch(0.7 0.18 30)' as Str },
    copper: { light: 'oklch(0.52 0.16 60)' as Str, dark: 'oklch(0.7 0.14 60)' as Str },
    rose: { light: 'oklch(0.55 0.18 350)' as Str, dark: 'oklch(0.7 0.16 350)' as Str },
    lavender: { light: 'oklch(0.52 0.2 290)' as Str, dark: 'oklch(0.68 0.18 290)' as Str },
    amethyst: { light: 'oklch(0.52 0.22 310)' as Str, dark: 'oklch(0.68 0.2 310)' as Str },
    forest: { light: 'oklch(0.5 0.16 155)' as Str, dark: 'oklch(0.68 0.16 155)' as Str },
    aurora: { light: 'oklch(0.52 0.15 170)' as Str, dark: 'oklch(0.68 0.14 170)' as Str },
  };

  /**
   * Effective icon color for rendering.
   *
   * Priority: custom hex > theme+mode > theme auto > mode only > currentColor.
   * Only changes icon color — never touches backgrounds.
   */
  const effectiveIconColor: Str = $derived.by((): Str => {
    /* Custom hex color always wins */
    if (iconColor !== 'currentColor') return iconColor;

    const themePrimary: { light: Str; dark: Str } | undefined = THEME_PRIMARY[activeTheme];

    /* Theme + explicit mode — use the theme's mode-specific primary */
    if (themePrimary && previewBg === 'dark') return themePrimary.dark;
    if (themePrimary && previewBg === 'light') return themePrimary.light;

    /* Theme + auto mode — use the theme's light primary (var(--primary) from CSS) */
    if (themePrimary) return 'var(--primary)' as Str;

    /* No theme, explicit mode — use appropriate foreground color */
    if (previewBg === 'dark') return DARK_FOREGROUND;
    if (previewBg === 'light') return LIGHT_FOREGROUND;

    /* Default — inherit from page */
    return 'currentColor' as Str;
  });

  /** Theme presets filtered by search query. */
  const filteredThemePresets: ThemePreset[] = $derived(
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

  /** Unique theme categories present in the filtered results. */
  const filteredThemeCategories: Str[] = $derived([
    ...new Set(filteredThemePresets.map((p) => p.category)),
  ] as Str[]);

  /** Active theme display label for the submenu trigger badge. */
  const activeThemeLabel: Str = $derived.by((): Str => {
    if (activeTheme === '') return '' as Str;
    const preset: ThemePreset | undefined = THEME_PRESETS.find((p) => p.id === activeTheme);
    return preset ? (preset.label as Str) : ('' as Str);
  });

  /** Header subtitle — shows filtered count when searching or filtering by category. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery.length > 0 || activeCategories.length > 0) {
      const parts: Str[] = [];
      if (activeCategories.length > 0) parts.push(activeCategories.join(', ') as Str);
      if (searchQuery.length > 0) parts.push(`"${searchQuery}"` as Str);
      return `${filteredNames.length.toLocaleString()} of ${data.names.length.toLocaleString()} icons${parts.length > 0 ? ` · ${parts.join(' · ')}` : ''}` as Str;
    }
    return `${data.names.length.toLocaleString()} Lucide icons available in the library` as Str;
  });

  /**
   * Convert kebab-case to PascalCase.
   *
   * @param name - Kebab-case string
   * @returns PascalCase string
   */
  function toPascal(name: Str): Str {
    return name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') as Str;
  }

  /* ------------------------------------------------------------------ */
  /*  Syntax-highlighted code snippets                                   */
  /* ------------------------------------------------------------------ */

  /** CSS classes for syntax token types. */
  const SYN_KW: Str = 'text-purple-500 dark:text-purple-400' as Str;
  const SYN_STR: Str = 'text-green-600 dark:text-green-400' as Str;
  const SYN_TAG: Str = 'text-blue-500 dark:text-blue-400' as Str;
  const SYN_ATTR: Str = 'text-orange-500 dark:text-orange-400' as Str;
  const SYN_PUNCT: Str = 'text-muted-foreground/60' as Str;

  /**
   * Build highlighted HTML for the Svelte import statement.
   *
   * @param name - Kebab-case icon name
   * @returns HTML string with syntax-colored spans
   */
  function highlightImport(name: Str): Str {
    const pascal: Str = toPascal(name);
    return `<span class="${SYN_KW}">import</span> ${pascal} <span class="${SYN_KW}">from</span> <span class="${SYN_STR}">'@lucide/svelte/icons/${name}'</span><span class="${SYN_PUNCT}">;</span>` as Str;
  }

  /**
   * Build highlighted HTML for the usage example.
   *
   * @param name - Kebab-case icon name
   * @returns HTML string with syntax-colored spans
   */
  function highlightUsage(name: Str): Str {
    const pascal: Str = toPascal(name);
    return `<span class="${SYN_PUNCT}">&lt;</span><span class="${SYN_TAG}">${pascal}</span> <span class="${SYN_ATTR}">class</span><span class="${SYN_PUNCT}">=</span><span class="${SYN_STR}">"size-4"</span> <span class="${SYN_PUNCT}">/&gt;</span>` as Str;
  }

  /**
   * Build highlighted HTML for the HTML data-lucide usage.
   *
   * @param name - Kebab-case icon name
   * @returns HTML string with syntax-colored spans
   */
  function highlightHtml(name: Str): Str {
    return `<span class="${SYN_PUNCT}">&lt;</span><span class="${SYN_TAG}">i</span> <span class="${SYN_ATTR}">data-lucide</span><span class="${SYN_PUNCT}">=</span><span class="${SYN_STR}">"${name}"</span><span class="${SYN_PUNCT}">&gt;&lt;/</span><span class="${SYN_TAG}">i</span><span class="${SYN_PUNCT}">&gt;</span>` as Str;
  }

  /** Plain-text versions for clipboard copy. */
  const importSvelte: Str = $derived.by((): Str => {
    if (!selectedIcon) return '' as Str;
    const pascal: Str = toPascal(selectedIcon);
    return `import ${pascal} from '@lucide/svelte/icons/${selectedIcon}';` as Str;
  });

  const usageExample: Str = $derived.by((): Str => {
    if (!selectedIcon) return '' as Str;
    const pascal: Str = toPascal(selectedIcon);
    return `<${pascal} class="size-4" />` as Str;
  });

  const usageCss: Str = $derived.by((): Str => {
    if (!selectedIcon) return '' as Str;
    return `<i data-lucide="${selectedIcon}"></i>` as Str;
  });

  /* ------------------------------------------------------------------ */
  /*  Page-level export items (follows sidebar export pattern)           */
  /* ------------------------------------------------------------------ */

  /** Export menu item descriptor. */
  type ExportItem = {
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
    description: Str;
    ext: Str;
  };

  /** Page-level export menu items. */
  const PAGE_EXPORT_ITEMS: ExportItem[] = [
    {
      id: 'copy-json' as Str,
      label: 'Copy as JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Icon names array' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-markdown' as Str,
      label: 'Copy as Markdown' as Str,
      icon: FileText,
      category: 'Clipboard' as Str,
      description: 'Formatted table for docs' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-json' as Str,
      label: 'Download JSON' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Structured data file' as Str,
      ext: '.json' as Str,
    },
    {
      id: 'download-markdown' as Str,
      label: 'Download Markdown' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Formatted doc file' as Str,
      ext: '.md' as Str,
    },
  ];

  /** Unique export categories. */
  const PAGE_EXPORT_CATEGORIES: Str[] = [...new Set(PAGE_EXPORT_ITEMS.map((p) => p.category))];

  /* ------------------------------------------------------------------ */
  /*  Clear selection when search yields 0 results                       */
  /* ------------------------------------------------------------------ */

  $effect(() => {
    if (filteredNames.length === 0) {
      selectedIcon = null;
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Reset visible count when search/category changes                   */
  /* ------------------------------------------------------------------ */

  $effect(() => {
    /* Reference searchQuery and activeCategories to re-run when they change */
    const _q: Str = searchQuery;
    const _c: Num = activeCategories.length as Num;
    visibleCount = 200 as Num;
    focusedIndex = -1 as Num;
  });

  /* ------------------------------------------------------------------ */
  /*  URL state sync — update URL params when state changes              */
  /* ------------------------------------------------------------------ */

  $effect(() => {
    if (typeof window === 'undefined') return;

    const params: URLSearchParams = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (activeCategories.length > 0) params.set('categories', activeCategories.join(','));
    if (selectedIcon) params.set('icon', selectedIcon);
    if (gridDensity !== DEFAULT_DENSITY) params.set('density', gridDensity);
    if (previewSize !== DEFAULT_SIZE) params.set('size', String(previewSize));
    if (strokeWidth !== DEFAULT_STROKE) params.set('stroke', String(strokeWidth));
    if (iconColor !== DEFAULT_COLOR) params.set('color', iconColor);
    if (previewBg !== DEFAULT_BG) params.set('bg', previewBg);
    if (activeTheme !== DEFAULT_THEME) params.set('theme', activeTheme);

    const qs: Str = params.toString() as Str;
    const newUrl: Str = `${window.location.pathname}${qs ? `?${qs}` : ''}` as Str;

    /* Only update if different — prevents infinite loops */
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      goto(newUrl, { replaceState: true, keepFocus: true, noScroll: true });
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */

  /** Confirm gate for "Reset to defaults" (resets after 3s). */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer ID for reset confirm auto-dismiss. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Reset all controls to their default values. */
  function resetDefaults(): void {
    previewSize = DEFAULT_SIZE;
    strokeWidth = DEFAULT_STROKE;
    iconColor = DEFAULT_COLOR;
    previewBg = DEFAULT_BG;
    gridDensity = DEFAULT_DENSITY;
    activeTheme = DEFAULT_THEME;
    activeCategories = [];
  }

  /**
   * Handle "Reset to defaults" with 2-step confirmation.
   * First click arms, second click executes. Resets after 3s.
   */
  function handleReset(): void {
    if (confirmingReset) {
      resetDefaults();
      confirmingReset = false as Bool;
      if (confirmResetTimer) clearTimeout(confirmResetTimer);
    } else {
      confirmingReset = true as Bool;
      confirmResetTimer = setTimeout((): void => {
        confirmingReset = false as Bool;
      }, 3000);
    }
  }

  /**
   * Toggle a category in the active selection.
   *
   * @param cat - Category name to toggle
   */
  function toggleCategory(cat: Str): void {
    const idx: Num = activeCategories.indexOf(cat) as Num;
    if ((idx as number) >= 0) {
      activeCategories = activeCategories.filter((c) => c !== cat) as Str[];
    } else {
      activeCategories = [...activeCategories, cat] as Str[];
    }
  }

  /**
   * Get sample icon names for a category tooltip.
   *
   * @param catName - Category name
   * @returns Array of sample icon names (max 12)
   */
  function categorySamples(catName: Str): Str[] {
    const icons: Set<Str> | undefined = categoryMap.get(catName);
    if (!icons) return [];
    return [...icons] as Str[];
  }

  /**
   * Load an icon component via the glob-resolved loader.
   *
   * @param name - Kebab-case icon name
   */
  async function loadIcon(name: Str): Promise<void> {
    if (iconCache.has(name) || loadingIcons.has(name)) return;
    const loader = iconLoaders.get(name);
    if (!loader) return;

    loadingIcons.add(name);
    try {
      const mod = await loader();
      iconCache.set(name, mod.default as Component);
      loadTick = ((loadTick as number) + 1) as Num;
    } catch {
      /* Icon load failed — module may be missing or corrupt */
    } finally {
      loadingIcons.delete(name);
    }
  }

  /**
   * Get a cached icon component (returns undefined if not loaded yet).
   *
   * @param name - Icon name
   * @returns Component or undefined
   */
  function getIcon(name: Str): Component | undefined {
    /* Reference loadTick to trigger reactive updates when icons finish loading */
    const _tick: Num = loadTick;
    return iconCache.get(name);
  }

  /**
   * Handle icon card click — select and load the icon.
   *
   * @param name - Icon name
   */
  async function selectIcon(name: Str): Promise<void> {
    selectedIcon = selectedIcon === name ? null : name;
    if (selectedIcon) {
      await loadIcon(selectedIcon);
      /* Grab SVG markup after render tick for CopyButton */
      requestAnimationFrame(() => {
        const el: HTMLElement | null = document.querySelector(`[data-detail-svg] svg`);
        selectedSvgMarkup = (el?.outerHTML ?? '') as Str;
      });
    }
  }

  /**
   * Copy text with visual feedback for the detail panel copy dropdown.
   *
   * @param formatId - Copy format identifier
   * @param text - Text to copy
   */
  async function handleDetailCopy(formatId: Str, text: Str): Promise<void> {
    await clipboardCopy(text);
    detailCopyFeedback = formatId;
    setTimeout(() => {
      detailCopyFeedback = '' as Str;
    }, 2000);
  }

  /**
   * Build export data and handle page-level export actions.
   *
   * @param formatId - Export format identifier
   */
  async function handlePageExport(formatId: Str): Promise<void> {
    const names: Str[] = filteredNames;
    let content: Str = '' as Str;
    let filename: Str = '' as Str;

    if (formatId === 'copy-json') {
      content = JSON.stringify(names, null, 2) as Str;
      await clipboardCopy(content);
    } else if (formatId === 'copy-markdown') {
      const rows: Str[] = names.map(
        (n) => `| ${n} | \`${toPascal(n)}\` | \`@lucide/svelte/icons/${n}\` |` as Str,
      );
      content =
        `| Name | Component | Import |\n|------|-----------|--------|\n${rows.join('\n')}` as Str;
      await clipboardCopy(content);
    } else if (formatId === 'download-json') {
      content = JSON.stringify(names, null, 2) as Str;
      filename = 'lucide-icons.json' as Str;
    } else if (formatId === 'download-markdown') {
      const rows: Str[] = names.map(
        (n) => `| ${n} | \`${toPascal(n)}\` | \`@lucide/svelte/icons/${n}\` |` as Str,
      );
      content =
        `# Lucide Icons\n\n${names.length} icons\n\n| Name | Component | Import |\n|------|-----------|--------|\n${rows.join('\n')}\n` as Str;
      filename = 'lucide-icons.md' as Str;
    }

    if (filename) {
      const blob: Blob = new Blob([content], { type: 'text/plain' });
      const url: Str = URL.createObjectURL(blob) as Str;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    pageExportFeedback = formatId;
    setTimeout(() => {
      pageExportFeedback = '' as Str;
    }, 2000);
  }

  /**
   * Download the selected icon as an SVG file.
   */
  function downloadSelectedSvg(): void {
    if (!selectedIcon || !selectedSvgMarkup) return;
    const blob: Blob = new Blob([selectedSvgMarkup], { type: 'image/svg+xml' });
    const url: Str = URL.createObjectURL(blob) as Str;
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = url;
    a.download = `${selectedIcon}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Show more icons. */
  function showMore(): void {
    visibleCount = ((visibleCount as number) + 200) as Num;
  }

  /**
   * Svelte action to lazy-load icons as they scroll into view.
   *
   * @param node - The icon card element with a data-icon attribute
   * @returns Svelte action destroy handler
   */
  function observeIcon(node: HTMLElement): { destroy: () => void } {
    const name: Str = node.dataset['icon'] as Str;
    const observer: IntersectionObserver = new IntersectionObserver(
      async (entries) => {
        const visible: IntersectionObserverEntry[] = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          await loadIcon(name);
          observer.unobserve(node);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return {
      destroy(): void {
        observer.disconnect();
      },
    };
  }

  /**
   * Svelte action for infinite scroll sentinel — loads more icons when scrolled into view.
   *
   * @param node - The sentinel element at the bottom of the grid
   * @returns Svelte action destroy handler
   */
  function observeSentinel(node: HTMLElement): { destroy: () => void } {
    const observer: IntersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          showMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return {
      destroy(): void {
        observer.disconnect();
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  lockHeight action — prevents SubContent from shrinking on filter   */
  /* ------------------------------------------------------------------ */

  /**
   * Svelte action that locks an element's height to its initial rendered value.
   * Prevents SubContent from shrinking when filtering, avoiding GraceArea close.
   *
   * @param node - The scrollable container element
   * @returns Action lifecycle with destroy cleanup
   */
  function lockHeight(node: HTMLElement): { destroy: () => void } {
    const raf: Num = requestAnimationFrame((): void => {
      node.style.minHeight = `${node.offsetHeight}px`;
    }) as Num;
    return {
      destroy(): void {
        cancelAnimationFrame(raf as number);
        node.style.minHeight = '';
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Keyboard navigation                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Estimate the number of columns currently visible based on grid density.
   * Used for arrow-up/arrow-down movement.
   *
   * @returns Estimated column count
   */
  function estimateColumns(): Num {
    if (gridDensity === 'compact') return 10 as Num;
    if (gridDensity === 'large') return 4 as Num;
    return 6 as Num;
  }

  /**
   * Handle keydown events for grid navigation.
   *
   * - ArrowRight/ArrowLeft: move focus between icons
   * - ArrowUp/ArrowDown: jump by row
   * - Enter: select focused icon
   * - Escape: close detail panel or clear search
   * - / (slash): focus search input
   *
   * @param e - Keyboard event
   */
  function handleKeydown(e: KeyboardEvent): void {
    /* Don't intercept when typing in an input field */
    const target: HTMLElement = e.target as HTMLElement;
    const isInput: Bool = (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable) as Bool;

    if (e.key === 'Escape') {
      if (selectedIcon) {
        selectedIcon = null;
        e.preventDefault();
      } else if (searchQuery) {
        searchQuery = '' as Str;
        e.preventDefault();
      }
      return;
    }

    /* Slash to focus search (when not in an input) */
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      const searchInput: HTMLInputElement | null = document.querySelector('[data-icon-search]');
      searchInput?.focus();
      return;
    }

    /* Arrow keys for grid navigation (only when not in an input) */
    if (isInput) return;

    const cols: Num = estimateColumns();
    const total: Num = displayNames.length as Num;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusedIndex = Math.min((focusedIndex as number) + 1, (total as number) - 1) as Num;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusedIndex = Math.max((focusedIndex as number) - 1, 0) as Num;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next: Num = ((focusedIndex as number) + (cols as number)) as Num;
      focusedIndex = ((next as number) < (total as number) ? next : focusedIndex) as Num;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev: Num = ((focusedIndex as number) - (cols as number)) as Num;
      focusedIndex = ((prev as number) >= 0 ? prev : focusedIndex) as Num;
    } else if (e.key === 'Enter' && (focusedIndex as number) >= 0) {
      e.preventDefault();
      const name: Str | undefined = displayNames[focusedIndex as number];
      if (name) selectIcon(name);
    }
  }

  /**
   * Scroll the focused icon card into view when focusedIndex changes.
   */
  $effect(() => {
    if ((focusedIndex as number) < 0) return;
    const card: HTMLElement | null = document.querySelector(`[data-grid-index="${focusedIndex}"]`);
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="w-full" onkeydown={handleKeydown}>
  <!-- Sticky header + controls (matches component page LensHeader pattern) -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <Shapes class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Icons</h1>
        <p class="text-sm text-muted-foreground">{headerSubtitle}</p>
      </div>

      <!-- Page-level three-dot menu -->
      <DropdownMenu.Root>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps })}
                <DropdownMenu.Trigger>
                  {#snippet child({ props: triggerProps })}
                    <button
                      type="button"
                      class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      {...tooltipProps}
                      {...triggerProps}
                    >
                      <EllipsisVertical class="size-4" />
                      <span class="sr-only">Page options</span>
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Page options</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <DropdownMenu.Content align="end" sideOffset={4}>
          <!-- Export submenu -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <DownloadIcon class="mr-2 size-4" />
              Export
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-64">
              {#each PAGE_EXPORT_CATEGORIES as category (category)}
                <DropdownMenu.Label
                  class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                >
                  {#if category === 'Clipboard'}
                    <Clipboard class="size-3" />
                  {:else}
                    <DownloadIcon class="size-3" />
                  {/if}
                  {category}
                </DropdownMenu.Label>
                {#each PAGE_EXPORT_ITEMS.filter((p) => p.category === category) as item (item.id)}
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      handlePageExport(item.id);
                    }}
                  >
                    {#if pageExportFeedback === item.id}
                      <span in:fade={{ duration: 150 }}
                        ><Check class="mr-2 size-4 text-green-500" /></span
                      >
                    {:else}
                      <item.icon class="mr-2 size-4" />
                    {/if}
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="text-sm">{item.label}</span>
                      <span class="text-[11px] text-muted-foreground/60">{item.description}</span>
                    </div>
                    {#if item.ext}
                      <code
                        class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                        >{item.ext}</code
                      >
                    {/if}
                  </DropdownMenu.Item>
                {/each}
              {/each}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />

          <!-- Customize submenu (all appearance settings) -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <SlidersHorizontal class="mr-2 size-4" />
              Customize
              {#if isCustomized}
                <span
                  class="ml-auto shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                  >Modified</span
                >
              {/if}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-72">
              <!-- Grid Density section -->
              <DropdownMenu.Label
                class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
              >
                <LayoutGrid class="size-3" />
                Grid Density
              </DropdownMenu.Label>
              {#each [{ v: 'compact', l: 'Compact', d: 'Small cards, more icons per row' }, { v: 'comfortable', l: 'Comfortable', d: 'Balanced size with icon names' }, { v: 'large', l: 'Large', d: 'Larger previews, fewer per row' }] as opt (opt.v)}
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    gridDensity = opt.v as Str;
                  }}
                >
                  <Check
                    class={cn(
                      'size-4 shrink-0 transition-opacity duration-150',
                      gridDensity !== opt.v && 'opacity-0',
                    )}
                  />
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="text-sm">{opt.l}</span>
                    <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                  </div>
                </DropdownMenu.Item>
              {/each}

              <DropdownMenu.Separator />

              <!-- Color Mode section -->
              <DropdownMenu.Label
                class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
              >
                <Paintbrush class="size-3" />
                Color Mode
              </DropdownMenu.Label>
              {#each [{ v: 'auto', l: 'Auto', d: 'Icons inherit page color' }, { v: 'light', l: 'Light', d: 'Dark icons (light mode style)' }, { v: 'dark', l: 'Dark', d: 'Light icons (dark mode style)' }] as opt (opt.v)}
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    previewBg = opt.v as Str;
                  }}
                >
                  <Check
                    class={cn(
                      'size-4 shrink-0 transition-opacity duration-150',
                      previewBg !== opt.v && 'opacity-0',
                    )}
                  />
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="text-sm">{opt.l}</span>
                    <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                  </div>
                </DropdownMenu.Item>
              {/each}

              <DropdownMenu.Separator />

              <!-- Theme sub-submenu -->
              <DropdownMenu.Sub
                onOpenChange={(open) => {
                  if (open) themeSearchQuery = '' as Str;
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
                    <div
                      class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                    >
                      <SearchIcon
                        class="size-3 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
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
                    {#each filteredThemeCategories as themeCategory (themeCategory)}
                      <DropdownMenu.Label class="text-xs">{themeCategory}</DropdownMenu.Label>
                      {#each filteredThemePresets.filter((p) => p.category === themeCategory) as preset (preset.id)}
                        <DropdownMenu.Item
                          closeOnSelect={false}
                          onclick={() => {
                            activeTheme = preset.id;
                          }}
                        >
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
                            <span class="text-[11px] text-muted-foreground"
                              >{preset.description}</span
                            >
                          </div>
                        </DropdownMenu.Item>
                      {/each}
                      {#if themeCategory !== filteredThemeCategories[filteredThemeCategories.length - 1]}
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

              <DropdownMenu.Separator />

              <!-- Icon Style section (sliders) -->
              <DropdownMenu.Label
                class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
              >
                <SlidersHorizontal class="size-3" />
                Icon Style
              </DropdownMenu.Label>
              <div class="flex flex-col gap-3 px-2 py-1.5">
                <!-- Size slider -->
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">Size</span>
                    <span class="font-mono text-xs text-muted-foreground">{previewSize}px</span>
                  </div>
                  <Slider.Root type="single" bind:value={previewSize} min={12} max={64} step={2} />
                </div>

                <!-- Stroke slider -->
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">Stroke</span>
                    <span class="font-mono text-xs text-muted-foreground"
                      >{Number(strokeWidth).toFixed(1)}</span
                    >
                  </div>
                  <Slider.Root
                    type="single"
                    bind:value={strokeWidth}
                    min={0.5}
                    max={4}
                    step={0.25}
                  />
                </div>

                <!-- Color picker -->
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">Color</span>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      class="size-6 cursor-pointer rounded border bg-transparent p-0.5"
                      value={iconColor === 'currentColor' ? '#000000' : iconColor}
                      oninput={(e) => {
                        /* HTMLInputElement cast — event target is always the color input */
                        iconColor = (e.target as HTMLInputElement).value as Str;
                      }}
                    />
                    {#if iconColor !== 'currentColor'}
                      <button
                        type="button"
                        class="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                        onclick={() => {
                          iconColor = 'currentColor' as Str;
                        }}
                      >
                        <RotateCcw class="size-3" />
                      </button>
                    {:else}
                      <span class="text-xs text-muted-foreground/60">Theme</span>
                    {/if}
                  </div>
                </div>
              </div>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- Reset -->
          <DropdownMenu.Item
            variant="destructive"
            disabled={!isCustomized}
            onSelect={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <Trash2 class="mr-2 size-4" />
            {confirmingReset ? 'Confirm Reset' : 'Reset to defaults'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Search -->
    <div class="relative">
      <SearchIcon
        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="text"
        placeholder="Search {data.names.length.toLocaleString()} icons..."
        class="pl-10 pr-8"
        bind:value={searchQuery}
        data-icon-search
      />
      {#if searchQuery}
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          onclick={() => {
            searchQuery = '' as Str;
          }}
          aria-label="Clear search"
        >
          <X class="size-4" />
        </button>
      {/if}
    </div>

    <!-- Category filter chips -->
    <div class="flex flex-wrap gap-1.5">
      <button
        type="button"
        class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {activeCategories.length ===
        0
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
        onclick={() => {
          activeCategories = [];
        }}
      >
        All
      </button>
      {#each allCategories as cat (cat.name)}
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={400}>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {activeCategories.includes(
                    cat.name,
                  )
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
                  onclick={() => toggleCategory(cat.name)}
                >
                  <Tag class="size-3 shrink-0 opacity-60" />
                  {cat.name}
                  <span class="opacity-60">{cat.count}</span>
                  {#if activeCategories.includes(cat.name)}
                    <X class="size-3 opacity-70" />
                  {/if}
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content
              side="bottom"
              class="max-h-64 max-w-xs overflow-y-auto p-3"
              portalProps={{ disabled: true }}
            >
              <div class="flex flex-col gap-1">
                {#each categorySamples(cat.name) as sample (sample)}
                  <div class="flex items-center gap-2 text-xs">
                    <Tag class="size-3 shrink-0 text-muted-foreground/50" />
                    <span class="font-mono text-[11px]">{sample}</span>
                  </div>
                {/each}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {/each}
      {#if activeCategories.length > 0}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            activeCategories = [];
          }}
        >
          <X class="size-3" />
          Clear selection
        </button>
      {/if}
    </div>
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
    <!-- Detail panel (selected icon) -->
    {#if selectedIcon && filteredNames.length > 0}
      <div class="rounded-lg border bg-card p-6" transition:slide={{ duration: 200 }}>
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
          <!-- Large preview -->
          <div
            data-theme={activeTheme || undefined}
            class="flex shrink-0 items-center justify-center rounded-xl border bg-muted/30"
            style="width: 120px; height: 120px; color: {effectiveIconColor};"
            data-detail-svg
          >
            {#if getIcon(selectedIcon)}
              {@const IconComp = getIcon(selectedIcon)}
              {#if IconComp}
                <IconComp size={64} {strokeWidth} color={effectiveIconColor} />
              {/if}
            {:else}
              <div class="size-16 animate-pulse rounded bg-muted"></div>
            {/if}
          </div>

          <div class="min-w-0 flex-1 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <!-- Click icon name to copy -->
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {#snippet child({ props })}
                        <button
                          {...props}
                          type="button"
                          class="rounded px-1 font-mono text-sm font-semibold transition-colors hover:bg-muted"
                          onclick={() =>
                            handleDetailCopy('name' as Str, selectedIcon ?? ('' as Str))}
                        >
                          {#if detailCopyFeedback === 'name'}
                            <span class="text-green-500">{selectedIcon}</span>
                          {:else}
                            {selectedIcon}
                          {/if}
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>Click to copy name</Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
                <!-- Click PascalCase badge to copy -->
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {#snippet child({ props })}
                        <button
                          {...props}
                          type="button"
                          onclick={() =>
                            handleDetailCopy(
                              'pascal' as Str,
                              toPascal(selectedIcon ?? ('' as Str)),
                            )}
                        >
                          <Badge
                            variant="secondary"
                            class="cursor-pointer text-[10px] transition-colors hover:bg-secondary/80"
                          >
                            {#if detailCopyFeedback === 'pascal'}
                              <Check class="mr-0.5 inline size-3 text-green-500" />
                            {/if}
                            {toPascal(selectedIcon ?? ('' as Str))}
                          </Badge>
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>Click to copy component name</Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>

              <div class="flex items-center gap-1">
                <!-- Copy as... dropdown -->
                <DropdownMenu.Root>
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tooltipProps })}
                          <DropdownMenu.Trigger>
                            {#snippet child({ props: triggerProps })}
                              <button
                                type="button"
                                class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                {...tooltipProps}
                                {...triggerProps}
                              >
                                <ClipboardCopy class="size-4" />
                                <span class="sr-only">Copy as</span>
                              </button>
                            {/snippet}
                          </DropdownMenu.Trigger>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={4}>Copy as...</Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  <DropdownMenu.Content align="end" class="w-72">
                    <DropdownMenu.Label
                      class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                    >
                      <Clipboard class="size-3" />
                      Clipboard
                    </DropdownMenu.Label>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDetailCopy('svg' as Str, selectedSvgMarkup);
                      }}
                    >
                      {#if detailCopyFeedback === 'svg'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="mr-2 size-4 text-green-500" /></span
                        >
                      {:else}
                        <Code class="mr-2 size-4" />
                      {/if}
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">Copy SVG</span>
                        <span class="text-[11px] text-muted-foreground/60">Raw SVG markup</span>
                      </div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDetailCopy('svelte' as Str, importSvelte);
                      }}
                    >
                      {#if detailCopyFeedback === 'svelte'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="mr-2 size-4 text-green-500" /></span
                        >
                      {:else}
                        <FileCode class="mr-2 size-4" />
                      {/if}
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">Copy Svelte Import</span>
                        <span class="font-mono text-[11px] text-muted-foreground/60"
                          >{importSvelte}</span
                        >
                      </div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDetailCopy('usage' as Str, usageExample);
                      }}
                    >
                      {#if detailCopyFeedback === 'usage'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="mr-2 size-4 text-green-500" /></span
                        >
                      {:else}
                        <Code class="mr-2 size-4" />
                      {/if}
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">Copy Usage</span>
                        <span class="font-mono text-[11px] text-muted-foreground/60"
                          >{usageExample}</span
                        >
                      </div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDetailCopy('html' as Str, usageCss);
                      }}
                    >
                      {#if detailCopyFeedback === 'html'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="mr-2 size-4 text-green-500" /></span
                        >
                      {:else}
                        <Hash class="mr-2 size-4" />
                      {/if}
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">Copy HTML</span>
                        <span class="font-mono text-[11px] text-muted-foreground/60"
                          >{usageCss}</span
                        >
                      </div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Label
                      class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                    >
                      <DownloadIcon class="size-3" />
                      File
                    </DropdownMenu.Label>
                    <DropdownMenu.Item onclick={downloadSelectedSvg}>
                      <DownloadIcon class="mr-2 size-4" />
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">Download SVG</span>
                        <span class="text-[11px] text-muted-foreground/60"
                          >Save as {selectedIcon}.svg</span
                        >
                      </div>
                      <code
                        class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                        >.svg</code
                      >
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>

                <!-- Close button with tooltip -->
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {#snippet child({ props })}
                        <button
                          {...props}
                          type="button"
                          class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onclick={() => {
                            selectedIcon = null;
                          }}
                        >
                          <X class="size-4" />
                          <span class="sr-only">Close</span>
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="top" sideOffset={4}>Close</Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </div>

            <!-- Tags / Categories -->
            {#if selectedIcon && getIconCategories(selectedIcon).length > 0}
              <div class="flex flex-wrap items-center gap-1">
                {#each getIconCategories(selectedIcon) as cat (cat)}
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props })}
                          <button
                            {...props}
                            type="button"
                            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            onclick={() => {
                              toggleCategory(cat);
                              selectedIcon = null;
                            }}
                          >
                            <Tag class="size-3 shrink-0 opacity-60" />
                            {cat}
                          </button>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="bottom" sideOffset={4}>Filter by {cat}</Tooltip.Content
                      >
                    </Tooltip.Root>
                  </Tooltip.Provider>
                {/each}
              </div>
            {/if}

            <!-- Code snippets with syntax highlighting -->
            <div class="grid gap-2">
              <div class="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">
                <code class="select-all">{@html highlightImport(selectedIcon)}</code>
              </div>
              <div class="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">
                <code class="select-all">{@html highlightUsage(selectedIcon)}</code>
              </div>
              <div class="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">
                <code class="select-all">{@html highlightHtml(selectedIcon)}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Icon grid -->
    {#if filteredNames.length === 0}
      <LensEmpty
        title="No results"
        actionLabel="Clear filters"
        onaction={() => {
          searchQuery = '' as Str;
          activeCategories = [];
        }}
      >
        {#snippet icon()}
          <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
            <SearchIcon class="size-8 text-muted-foreground/20" />
          </div>
        {/snippet}
        {#snippet descriptionSnippet()}
          {#if searchQuery && activeCategories.length > 0}
            No icons matching "<span class="font-medium text-muted-foreground/60"
              >{searchQuery}</span
            >" in {activeCategories.join(', ')}.
          {:else if searchQuery}
            No icons matching "<span class="font-medium text-muted-foreground/60"
              >{searchQuery}</span
            >".
          {:else if activeCategories.length > 0}
            No icons in the selected categories.
          {:else}
            No icons found.
          {/if}
        {/snippet}
      </LensEmpty>
    {:else}
      <div class="grid gap-2 {gridCols}">
        {#each displayNames as name, idx (name)}
          <button
            type="button"
            class="group flex flex-col items-center gap-2 rounded-lg border p-3 transition-all duration-150 hover:scale-[1.02] hover:border-primary/30 hover:shadow-sm {selectedIcon ===
            name
              ? 'border-primary bg-primary/5 shadow-sm'
              : (focusedIndex as number) === idx
                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                : 'hover:bg-muted/50'}"
            onclick={() => selectIcon(name)}
            title={name}
            data-icon={name}
            data-grid-index={idx}
            use:observeIcon
          >
            <div
              data-theme={activeTheme || undefined}
              class="flex items-center justify-center rounded-md transition-colors"
              style="width: {previewSize}px; height: {previewSize}px; color: {effectiveIconColor};"
            >
              {#if getIcon(name)}
                {@const IconComp = getIcon(name)}
                {#if IconComp}
                  <IconComp size={previewSize} {strokeWidth} />
                {/if}
              {:else}
                <div
                  class="animate-pulse rounded bg-muted"
                  style="width: {previewSize}px; height: {previewSize}px;"
                ></div>
              {/if}
            </div>
            <span class="w-full truncate text-center text-[10px] text-muted-foreground">
              {name}
            </span>
          </button>
        {/each}
      </div>

      <!-- Infinite scroll sentinel -->
      {#if hasMore}
        <div use:observeSentinel class="flex justify-center py-4">
          <span class="text-xs text-muted-foreground">Loading more icons...</span>
        </div>
      {/if}
    {/if}
  </div>
</div>
