import type { LensMeta } from '../lens/types.js';
import LensWrapper from './LensWrapper.svelte';

export const meta: LensMeta = {
	category: 'utility',
	tags: ['i18n'],
	description: 'Language selection dropdown for internationalization.',
};

/** DropdownMenu.Root context wrapper — LanguageSwitcher renders DropdownMenu.Sub which needs a Root parent. */
export const contextWrapper = LensWrapper;
