/**
 * Lens manifest for the InputOTP compound component (form
 * category) — segmented one-time-password input. Tagged for
 * input / otp / pin / one-time-password / compound lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['otp', 'code', 'pin', 'verification'],
  description: 'One-time password input with segmented character slots.',
};
