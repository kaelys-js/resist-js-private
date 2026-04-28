/**
 * Lens manifest for the EnvironmentSwitcher component (admin
 * category) — dev / staging / prod environment selector.
 * Tagged for environment / switcher / dev / prod lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'admin',
  tags: ['environment', 'switcher', 'dev', 'prod'],
  description: 'Dev/staging/prod env selector.',
};
