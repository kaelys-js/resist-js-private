/**
 * Cloudflare Workers Integration
 *
 * Type-safe utilities for accessing secrets in Cloudflare Workers.
 * Secrets are synced automatically via Infisical's Cloudflare Workers Sync.
 */

import * as v from 'valibot';
import { ProductSecretsSchema, type ProductSecrets } from '../config/schemas.ts';

/**
 * Cloudflare Workers environment bindings type
 * Extend this with your own bindings (KV, D1, etc.)
 */
export interface CloudflareEnv extends ProductSecrets {
	// Add Cloudflare-specific bindings here
	// DB: D1Database;
	// KV: KVNamespace;
	// QUEUE: Queue;
}

/**
 * Validate Worker environment bindings at startup
 *
 * @example
 * ```ts
 * export default {
 *   async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
 *     const secrets = validateEnv(env);
 *     // secrets.DATABASE_URL is now typed and validated
 *   }
 * }
 * ```
 */
export function validateEnv(env: unknown): ProductSecrets {
	// Filter to only string values (exclude bindings like D1, KV, etc.)
	const secrets: Record<string, unknown> = {};

	if (env && typeof env === 'object') {
		for (const [key, value] of Object.entries(env)) {
			if (typeof value === 'string') {
				secrets[key] = value;
			}
		}
	}

	const result = v.safeParse(ProductSecretsSchema, secrets);

	if (!result.success) {
		const issues = result.issues
			.map((issue) => {
				const path = issue.path?.map((p) => p.key).join('.') || 'root';
				return `${path}: ${issue.message}`;
			})
			.join(', ');

		throw new Error(`Environment validation failed: ${issues}`);
	}

	return result.output;
}

/**
 * Create a type-safe secrets proxy with lazy validation
 *
 * @example
 * ```ts
 * const secrets = createSecretsProxy(env);
 * // Access is validated on first use
 * const dbUrl = secrets.DATABASE_URL; // Throws if missing/invalid
 * ```
 */
export function createSecretsProxy(env: unknown): ProductSecrets {
	let validated: ProductSecrets | null = null;

	return new Proxy({} as ProductSecrets, {
		get(_, prop: string) {
			// Validate on first access
			if (!validated) {
				validated = validateEnv(env);
			}
			return validated[prop as keyof ProductSecrets];
		},
		has(_, prop: string) {
			if (!validated) {
				validated = validateEnv(env);
			}
			return prop in validated;
		},
		ownKeys() {
			if (!validated) {
				validated = validateEnv(env);
			}
			return Object.keys(validated);
		},
		getOwnPropertyDescriptor(_, prop: string) {
			if (!validated) {
				validated = validateEnv(env);
			}
			if (prop in validated) {
				return {
					configurable: true,
					enumerable: true,
					value: validated[prop as keyof ProductSecrets],
				};
			}
			return undefined;
		},
	});
}

/**
 * Get a single secret from Worker env with type safety
 */
export function getEnvSecret<K extends keyof ProductSecrets>(env: unknown, key: K): ProductSecrets[K] {
	const secrets = validateEnv(env);
	return secrets[key];
}

/**
 * Check if a secret exists and is non-empty
 */
export function hasEnvSecret(env: unknown, key: string): boolean {
	if (!env || typeof env !== 'object') return false;
	const value = (env as Record<string, unknown>)[key];
	return typeof value === 'string' && value.length > 0;
}

/**
 * Safe secret access with fallback
 */
export function getEnvSecretOrDefault<K extends keyof ProductSecrets>(
	env: unknown,
	key: K,
	defaultValue: ProductSecrets[K]
): ProductSecrets[K] {
	try {
		const secrets = validateEnv(env);
		return secrets[key] ?? defaultValue;
	} catch {
		return defaultValue;
	}
}

/**
 * Middleware to validate env at worker startup
 *
 * @example
 * ```ts
 * export default {
 *   async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
 *     const { secrets, error } = withValidatedEnv(env);
 *     if (error) {
 *       return new Response(`Config error: ${error}`, { status: 500 });
 *     }
 *     // Use secrets safely
 *   }
 * }
 * ```
 */
export function withValidatedEnv(env: unknown): { secrets: ProductSecrets | null; error: string | null } {
	try {
		return { secrets: validateEnv(env), error: null };
	} catch (e) {
		return { secrets: null, error: e instanceof Error ? e.message : 'Unknown error' };
	}
}

/**
 * Type guard for checking if env has required secrets
 */
export function hasRequiredSecrets(env: unknown, keys: (keyof ProductSecrets)[]): boolean {
	if (!env || typeof env !== 'object') return false;

	for (const key of keys) {
		const value = (env as Record<string, unknown>)[key];
		if (typeof value !== 'string' || value.length === 0) {
			return false;
		}
	}

	return true;
}
