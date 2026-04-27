/**
 * Lens manifest for the DeviceStatus component (iot category) —
 * device online / offline indicator. Tagged for device / status
 * / online / offline lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'iot',
  tags: ['device', 'status', 'online', 'offline'],
  description: 'Device online/offline indicator.',
};
