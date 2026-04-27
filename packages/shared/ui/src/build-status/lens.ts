/**
 * Lens manifest for the BuildStatus component (devtools category)
 * — pass / fail status badge for CI builds. Tagged for build /
 * status / badge lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'devtools',
  tags: ['build', 'status', 'badge'],
  description: 'Build pass/fail status badge.',
};
