/**
 * Infisical Client Factory
 *
 * Creates and manages Infisical client instances.
 * Handles authentication, caching, and connection pooling.
 */

import { InfisicalClient } from '@infisical/sdk';
import { organization } from '../config/projects.ts';
import { detectEnvironment, type EnvironmentSlug } from '../config/environments.ts';

/**
 * Client configuration options
 */
export interface InfisicalClientOptions {
	/** Infisical site URL (for self-hosted) */
	siteUrl?: string;

	/** Access token (machine identity or service token) */
	accessToken?: string;

	/** Client ID for machine identity auth */
	clientId?: string;

	/** Client secret for machine identity auth */
	clientSecret?: string;

	/** Cache TTL in milliseconds (default: 5 minutes) */
	cacheTtl?: number;

	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Client instance cache
 */
let clientInstance: InfisicalClient | null = null;
let clientOptions: InfisicalClientOptions | null = null;

/**
 * Get or create a singleton Infisical client
 */
export function getClient(options?: InfisicalClientOptions): InfisicalClient {
	// Return existing client if options match
	if (clientInstance && JSON.stringify(options) === JSON.stringify(clientOptions)) {
		return clientInstance;
	}

	// Create new client
	clientInstance = createClient(options);
	clientOptions = options || null;

	return clientInstance;
}

/**
 * Create a new Infisical client (non-singleton)
 */
export function createClient(options?: InfisicalClientOptions): InfisicalClient {
	const resolvedOptions = resolveOptions(options);

	const client = new InfisicalClient({
		siteUrl: resolvedOptions.siteUrl,
		// Auth options (in order of precedence)
		...(resolvedOptions.accessToken && {
			accessToken: resolvedOptions.accessToken,
		}),
		...(resolvedOptions.clientId &&
			resolvedOptions.clientSecret && {
				clientId: resolvedOptions.clientId,
				clientSecret: resolvedOptions.clientSecret,
			}),
		// Caching
		cacheTtl: resolvedOptions.cacheTtl,
	});

	if (resolvedOptions.debug) {
		console.log('[infisical] Client created with options:', {
			siteUrl: resolvedOptions.siteUrl,
			hasAccessToken: !!resolvedOptions.accessToken,
			hasClientId: !!resolvedOptions.clientId,
			cacheTtl: resolvedOptions.cacheTtl,
		});
	}

	return client;
}

/**
 * Resolve options with environment variable fallbacks
 */
function resolveOptions(options?: InfisicalClientOptions): Required<InfisicalClientOptions> {
	return {
		siteUrl: options?.siteUrl || process.env.INFISICAL_SITE_URL || organization.siteUrl,

		accessToken: options?.accessToken || process.env.INFISICAL_TOKEN || '',

		clientId: options?.clientId || process.env.INFISICAL_CLIENT_ID || '',

		clientSecret: options?.clientSecret || process.env.INFISICAL_CLIENT_SECRET || '',

		cacheTtl: options?.cacheTtl || parseInt(process.env.INFISICAL_CACHE_TTL || '300000', 10),

		debug: options?.debug || process.env.INFISICAL_DEBUG === 'true',
	};
}

/**
 * Clear the cached client instance
 */
export function clearClient(): void {
	clientInstance = null;
	clientOptions = null;
}

/**
 * Check if client is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
	try {
		const client = getClient();
		// Try to list secrets from a known project to verify auth
		// This will throw if not authenticated
		await client.listSecrets({
			environment: detectEnvironment(),
			projectId: process.env.INFISICAL_PROJECT_ID || '',
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Get authentication method being used
 */
export function getAuthMethod(): 'token' | 'machine-identity' | 'none' {
	if (process.env.INFISICAL_TOKEN) {
		return 'token';
	}
	if (process.env.INFISICAL_CLIENT_ID && process.env.INFISICAL_CLIENT_SECRET) {
		return 'machine-identity';
	}
	return 'none';
}

/**
 * Environment variable names used by the client
 */
export const ENV_VARS = {
	SITE_URL: 'INFISICAL_SITE_URL',
	TOKEN: 'INFISICAL_TOKEN',
	CLIENT_ID: 'INFISICAL_CLIENT_ID',
	CLIENT_SECRET: 'INFISICAL_CLIENT_SECRET',
	PROJECT_ID: 'INFISICAL_PROJECT_ID',
	ENV: 'INFISICAL_ENV',
	CACHE_TTL: 'INFISICAL_CACHE_TTL',
	DEBUG: 'INFISICAL_DEBUG',
} as const;
