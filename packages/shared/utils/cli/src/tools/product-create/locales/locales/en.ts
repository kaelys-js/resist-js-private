/**
 * Product Create English Strings
 *
 * @module
 */

import type { ProductCreateStrings } from '@/cli/tools/product-create/locales/schema';

/** English strings for product-create. */
export const en: ProductCreateStrings = {
  name: 'product-create',
  description: 'Create a new product from template',

  flags: {
    product: 'Name of the product to create',
  },

  examples: [
    {
      command: '{pmTool} product-create --product myapp',
      description: 'Create a new product called "myapp"',
    },
    {
      command: '{pmTool} product-create -p myapp --dry-run',
      description: 'Preview what would be created without making changes',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Product created successfully' },
    { code: 1, description: 'Product creation failed or validation error' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Dry-run
  dryRunPrefix: '[dry-run]',
  dryRunWouldCreate: 'Would create product: {name}',
  dryRunSourcePath: 'Source: {path}',
  dryRunTargetPath: 'Target: {path}',

  // Progress
  creating: 'Creating product: {name}',
  copyingTemplate: 'Copying template files',

  // Success
  success: 'Product "{name}" created successfully!',
  projectPath: 'Location: {path}',
  nextStepsHeader: 'Next steps:',
  stepInstall: '1. Install dependencies',
  stepCd: '2. cd {productsDir}/{name}',
  stepConfig: '3. Update config/ with your product settings',
  hintDevProxy: 'If the dev proxy is running, restart it to pick up the new product',
};
