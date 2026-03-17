/**
 * Centralized Lens category configuration.
 *
 * Single source of truth for category ordering, icons, colors, descriptions,
 * and background accents used across the overview page, category page, and sidebar layout.
 */
import type { Str } from '@/schemas/common';
import type { Component } from 'svelte';
import TextCursorInput from '@lucide/svelte/icons/text-cursor-input';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Layers2 from '@lucide/svelte/icons/layers-2';
import Compass from '@lucide/svelte/icons/compass';
import Eye from '@lucide/svelte/icons/eye';
import Wrench from '@lucide/svelte/icons/wrench';
import Microscope from '@lucide/svelte/icons/microscope';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import MessageCircle from '@lucide/svelte/icons/message-circle';
import ImageIcon from '@lucide/svelte/icons/image';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Type from '@lucide/svelte/icons/type';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import PanelTopOpen from '@lucide/svelte/icons/panel-top-open';

/** Ordered list of all lens categories for sidebar and overview grouping. */
export const CATEGORY_ORDER: Str[] = [
  'form',
  'date-time',
  'disclosure',
  'layout',
  'overlay',
  'navigation',
  'display',
  'data-display',
  'typography',
  'feedback',
  'media',
  'animation',
  'utility',
  'lens',
];

/** Category-to-icon mapping for visual differentiation. */
export const CATEGORY_ICONS: Record<Str, Component> = {
  form: TextCursorInput,
  'date-time': CalendarDays,
  disclosure: PanelTopOpen,
  layout: LayoutGrid,
  overlay: Layers2,
  navigation: Compass,
  display: Eye,
  'data-display': BarChart3,
  typography: Type,
  feedback: MessageCircle,
  media: ImageIcon,
  animation: Sparkles,
  utility: Wrench,
  lens: Microscope,
};

/** Category-to-color mapping (icon + badge text color). */
export const CATEGORY_COLORS: Record<Str, Str> = {
  form: 'text-blue-600 dark:text-blue-400' as Str,
  'date-time': 'text-indigo-600 dark:text-indigo-400' as Str,
  disclosure: 'text-teal-600 dark:text-teal-400' as Str,
  layout: 'text-purple-600 dark:text-purple-400' as Str,
  overlay: 'text-amber-600 dark:text-amber-400' as Str,
  navigation: 'text-emerald-600 dark:text-emerald-400' as Str,
  display: 'text-rose-600 dark:text-rose-400' as Str,
  'data-display': 'text-cyan-600 dark:text-cyan-400' as Str,
  typography: 'text-stone-600 dark:text-stone-400' as Str,
  feedback: 'text-orange-600 dark:text-orange-400' as Str,
  media: 'text-pink-600 dark:text-pink-400' as Str,
  animation: 'text-violet-600 dark:text-violet-400' as Str,
  utility: 'text-slate-600 dark:text-slate-400' as Str,
  lens: 'text-primary' as Str,
};

/** Short description per category. */
export const CATEGORY_DESCRIPTIONS: Record<Str, Str> = {
  form: 'Input controls, selectors, and form elements' as Str,
  'date-time': 'Date pickers, calendars, and time selection' as Str,
  disclosure: 'Expandable, collapsible, and tabbed content' as Str,
  layout: 'Structural components for page and content layout' as Str,
  overlay: 'Modals, dialogs, popovers, and floating UI' as Str,
  navigation: 'Menus, breadcrumbs, toolbars, and wayfinding' as Str,
  display: 'Visual content presentation and identity' as Str,
  'data-display': 'Tables, lists, trees, charts, and structured data' as Str,
  typography: 'Text display, code blocks, and content formatting' as Str,
  feedback: 'Alerts, toasts, progress, loading, and status indicators' as Str,
  media: 'Images, galleries, and rich media components' as Str,
  animation: 'Motion effects, animated elements, and transitions' as Str,
  utility: 'Utility primitives and helper components' as Str,
  lens: 'Lens documentation system components' as Str,
};

/** Category background accent for card hover states (overview page). */
export const CATEGORY_BG_HOVER: Record<Str, Str> = {
  form: 'hover:border-blue-500/30 dark:hover:border-blue-400/30' as Str,
  'date-time': 'hover:border-indigo-500/30 dark:hover:border-indigo-400/30' as Str,
  disclosure: 'hover:border-teal-500/30 dark:hover:border-teal-400/30' as Str,
  layout: 'hover:border-purple-500/30 dark:hover:border-purple-400/30' as Str,
  overlay: 'hover:border-amber-500/30 dark:hover:border-amber-400/30' as Str,
  navigation: 'hover:border-emerald-500/30 dark:hover:border-emerald-400/30' as Str,
  display: 'hover:border-rose-500/30 dark:hover:border-rose-400/30' as Str,
  'data-display': 'hover:border-cyan-500/30 dark:hover:border-cyan-400/30' as Str,
  typography: 'hover:border-stone-500/30 dark:hover:border-stone-400/30' as Str,
  feedback: 'hover:border-orange-500/30 dark:hover:border-orange-400/30' as Str,
  media: 'hover:border-pink-500/30 dark:hover:border-pink-400/30' as Str,
  animation: 'hover:border-violet-500/30 dark:hover:border-violet-400/30' as Str,
  utility: 'hover:border-slate-500/30 dark:hover:border-slate-400/30' as Str,
  lens: 'hover:border-primary/30' as Str,
};

/** Category background accent for icon containers (category page). */
export const CATEGORY_BG: Record<Str, Str> = {
  form: 'bg-blue-500/10' as Str,
  'date-time': 'bg-indigo-500/10' as Str,
  disclosure: 'bg-teal-500/10' as Str,
  layout: 'bg-purple-500/10' as Str,
  overlay: 'bg-amber-500/10' as Str,
  navigation: 'bg-emerald-500/10' as Str,
  display: 'bg-rose-500/10' as Str,
  'data-display': 'bg-cyan-500/10' as Str,
  typography: 'bg-stone-500/10' as Str,
  feedback: 'bg-orange-500/10' as Str,
  media: 'bg-pink-500/10' as Str,
  animation: 'bg-violet-500/10' as Str,
  utility: 'bg-slate-500/10' as Str,
  lens: 'bg-primary/10' as Str,
};

/**
 * Convert a category slug to a display label.
 *
 * Handles hyphenated categories like "data-display" → "Data Display".
 *
 * @param cat - Category slug
 * @returns Human-readable label
 */
export function categoryLabel(cat: Str): Str {
  return cat
    .split('-')
    .map((w: Str): Str => (w.charAt(0).toUpperCase() + w.slice(1)) as Str)
    .join(' ') as Str;
}

/**
 * Short rule descriptions for all 18 Lens compatibility rules (R0–R17).
 *
 * Indexed by rule number. Each string clearly explains what the rule requires
 * so tooltips are self-documenting across sidebar, overview, and component pages.
 */
export const LENS_RULE_NAMES: readonly Str[] = [
  'Needs Lens conversion — has @convert-to-lens marker, needs full implementation' as Str,
  'Type fields must have @values — every Str/Num field needs a @values JSDoc tag' as Str,
  'No inline object types — extract { } types in Props to named type definitions' as Str,
  'Type fields must have JSDoc — every field in type definitions needs a /** */ comment' as Str,
  'Component must have JSDoc — script block needs a top-level /** */ description' as Str,
  'No orphaned Demo.svelte — demo files must be registered in lens.ts examples' as Str,
  'Valid lens.ts required — must export LensMeta with category, tags, and description' as Str,
  'Props must have JSDoc — every extracted prop needs a description comment' as Str,
  'Props must have @values — every Str/Num prop needs @values for mock generation' as Str,
  'Must have renderable content — needs props, variants, or examples for Lens display' as Str,
  'Directory must be kebab-case — component folder name must use kebab-case' as Str,
  'Primary .svelte file required — a .svelte file matching the directory name must exist' as Str,
  'Must use v.strictObject() — props need Valibot strictObject schema validation' as Str,
  'No bare v.object() — use v.strictObject() to reject unknown keys' as Str,
  'Must use safeParse + stripSvelteProps — validate props via safeParse, clean with stripSvelteProps' as Str,
  'No bare Valibot primitives — use StrSchema/NumSchema, not v.string()/v.number()' as Str,
  'Examples must match files — declared example names in lens.ts need matching .svelte files' as Str,
  'tv-variant tag required — components using tv() must tag with tv-variant in lens.ts' as Str,
];
