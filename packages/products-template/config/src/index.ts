/**
 * Product Configuration
 *
 * Defines this product's identity, enabled layers, and any
 * overrides of global tooling settings.
 *
 * @module
 */

import { defineProductConfig } from '@/config/loader';

export default defineProductConfig({
  id: 'my-product',
  name: 'My Product',
  description: '',
  layers: {
    api: true,
    app: true,
    marketing: true,
    status: true,
    assets: true,
  },
});
