/**
 * Product Configuration
 *
 * Defines this product's identity, enabled layers, and any
 * overrides of global tooling settings.
 *
 * @module
 */

import { defineProductConfig } from '@/config/loader';
import type { Description } from '@/schemas/common';

export default defineProductConfig({
  id: 'my-product',
  name: 'My Product',
  description: '' as Description, // cast safe: empty string for template placeholder
  layers: {
    api: true,
    app: true,
    marketing: true,
    status: true,
    assets: true,
  },
});
