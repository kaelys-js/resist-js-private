/**
 * Lucide icon imports for Lens category visual differentiation.
 *
 * Separated from lens-categories.ts to stay under the max-dependencies lint limit.
 * Domain category icons are imported from the companion file.
 */
import type { Component } from 'svelte';
import type { Str } from '@/schemas/common';
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
import { DOMAIN_CATEGORY_ICONS } from './lens-category-icons-domain.js';

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
  ...DOMAIN_CATEGORY_ICONS,
};
