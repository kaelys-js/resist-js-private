/**
 * Secrets Search
 *
 * Searches secrets across Infisical folders by key name pattern.
 *
 * @module
 */

import * as v from 'valibot';

import { StrSchema, type Str } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { EnvironmentName } from '@/schemas/core-config/environment';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { discoverProducts } from '@/utils/core/products';
import { fetchSecretsJson } from '@/cli/tools/secrets/utils/infisical';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a search result entry. */
export const SearchResultSchema = v.strictObject({
  key: StrSchema,
  path: StrSchema,
  project: StrSchema,
});

/** @see {@link SearchResultSchema} */
export type SearchResult = v.InferOutput<typeof SearchResultSchema>;

// =============================================================================
// Functions
// =============================================================================

/**
 * Search secrets by key name pattern across all folders.
 *
 * @param query - Search query (case-insensitive substring match).
 * @param environment - Target environment.
 * @param config - Core configuration.
 * @returns `Result<readonly SearchResult[]>` — matching results.
 */
export async function searchSecrets(
  query: Str,
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<readonly SearchResult[]>> {
  const lowerQuery: Str = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search global secrets
  const globalResult: Result<Record<string, string>> = await fetchSecretsJson(environment, config);
  if (globalResult.ok) {
    for (const key of Object.keys(globalResult.data)) {
      if (key.toLowerCase().includes(lowerQuery)) {
        results.push({ key, path: '/', project: 'global' });
      }
    }
  }

  // Search product secrets
  const productsResult: Result<readonly Str[]> = discoverProducts();
  if (productsResult.ok) {
    for (const productName of productsResult.data) {
      const productPath: Str = `/products/${productName}`;
      const productResult: Result<Record<string, string>> = await fetchSecretsJson(
        environment,
        config,
        productPath,
      );
      if (productResult.ok) {
        for (const key of Object.keys(productResult.data)) {
          if (key.toLowerCase().includes(lowerQuery)) {
            results.push({ key, path: productPath, project: productName });
          }
        }
      }
    }
  }

  return okUnchecked(results);
}
