/**
 * Lens manifest for the ConfigProvider component (utility
 * category) — context provider that sets global configuration
 * (theme, locale, size) for all child components. Tagged for
 * provider / config / theme / context lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'utility',
  tags: ['provider', 'config', 'theme', 'context'],
  description:
    'A context provider that sets global configuration for all child components, including theme, locale, and size.',
};
