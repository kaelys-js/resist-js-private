/**
 * Domain-specific category icons (commerce, gaming, healthcare, etc.).
 *
 * Split from lens-category-icons.ts to stay under the max-dependencies lint limit.
 *
 * @module
 */
import type { Component } from 'svelte';
import type { Str } from '@/schemas/common';
import Accessibility from '@lucide/svelte/icons/accessibility';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import FileText from '@lucide/svelte/icons/file-text';
import Monitor from '@lucide/svelte/icons/monitor';
import Bug from '@lucide/svelte/icons/bug';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import Banknote from '@lucide/svelte/icons/banknote';
import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import Cpu from '@lucide/svelte/icons/cpu';
import Scale from '@lucide/svelte/icons/scale';
import MapPin from '@lucide/svelte/icons/map-pin';
import Megaphone from '@lucide/svelte/icons/megaphone';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Calendar from '@lucide/svelte/icons/calendar';
import Users from '@lucide/svelte/icons/users';

/** Domain-specific category icons. */
export const DOMAIN_CATEGORY_ICONS: Record<Str, Component> = {
  commerce: ShoppingCart,
  marketing: Megaphone,
  social: Users,
  admin: ShieldCheck,
  devtools: Bug,
  finance: Banknote,
  gaming: Gamepad2,
  healthcare: HeartPulse,
  education: GraduationCap,
  iot: Cpu,
  maps: MapPin,
  mobile: Smartphone,
  desktop: Monitor,
  content: FileText,
  scheduling: Calendar,
  a11y: Accessibility,
  legal: Scale,
};
