/**
 * Config Init Template
 *
 * Returns the starter `resist.config.ts` content for the `init` action.
 *
 * @module
 */

import type { Str } from '@/schemas/common';

// =============================================================================
// Template
// =============================================================================

/**
 * Get the starter config template content.
 *
 * Returns a string containing a valid `resist.config.ts` file with
 * placeholder values that users should customize.
 *
 * @remarks Identity function for template retrieval — does not return `Result`
 *   because string literal access cannot fail.
 *
 * @returns The starter `resist.config.ts` file content.
 *
 * @example
 * ```typescript
 * const template: Str = getConfigTemplate();
 * // Write template to workspace root
 * ```
 */
export function getConfigTemplate(): Str {
  return `import { defineConfig } from '@/config/loader';

export default defineConfig({
\tcompany: {
\t\tname: 'My Company',
\t\tdomain: 'example.com',
\t\tsupportEmail: 'support@example.com',
\t},
\tproducts: [{ id: 'my-product', name: 'My Product' }],
\tlocales: ['en'],
\tdefaultLocale: 'en',
});
`;
}
