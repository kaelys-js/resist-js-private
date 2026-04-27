/**
 * Lens manifest for the ColorSwatch component (display category)
 * — visual color sample display used in palettes / theme
 * selectors. Tagged for color / swatch / preview / palette
 * lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['color', 'swatch', 'preview', 'palette'],
  description: 'A visual color sample display, often used in palettes or theme selectors.',
};
