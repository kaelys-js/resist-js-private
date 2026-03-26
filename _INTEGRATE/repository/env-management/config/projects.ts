/**
 * Project Definitions
 *
 * Defines the Infisical project structure for the monorepo.
 * Each product gets its own project with environment-specific secrets.
 */

import * as v from 'valibot';
import type { EnvironmentSlug } from './environments.ts';

/**
 * Project type - either global (shared) or product-specific
 */
export const ProjectTypeSchema = v.picklist(['global', 'product']);
export type ProjectType = v.InferOutput<typeof ProjectTypeSchema>;

/**
 * Infisical project configuration
 */
export interface ProjectConfig {
	/** Unique project identifier (set after creation in Infisical) */
	readonly id?: string;
	/** Project slug (URL-safe name) */
	readonly slug: string;
	/** Human-readable name */
	readonly name: string;
	/** Project description */
	readonly description: string;
	/** Project type */
	readonly type: ProjectType;
	/** Cloudflare Workers to sync secrets to (per environment) */
	readonly cloudflareWorkers?: Partial<Record<EnvironmentSlug, string[]>>;
	/** Secret folders within the project */
	readonly folders?: string[];
}

/**
 * Global project - shared secrets across all products
 */
export const globalProject: ProjectConfig = {
	slug: 'global',
	name: 'Global',
	description: 'Shared secrets across all products (Cloudflare, GitHub, Turbo)',
	type: 'global',
	folders: ['/', '/cloudflare', '/github', '/turbo'],
};

/**
 * Factory function to create a product project config
 */
export function createProductProject(
	slug: string,
	name: string,
	options: Partial<Omit<ProjectConfig, 'slug' | 'name' | 'type'>> = {}
): ProjectConfig {
	return {
		slug,
		name,
		description: options.description || `Secrets for ${name} product`,
		type: 'product',
		cloudflareWorkers: options.cloudflareWorkers || {
			dev: [`${slug}-api-dev`, `${slug}-marketing-dev`],
			staging: [`${slug}-api-staging`, `${slug}-marketing-staging`],
			prod: [`${slug}-api`, `${slug}-marketing`],
		},
		folders: options.folders || ['/', '/api', '/app', '/marketing'],
	};
}

/**
 * Example product projects (customize for your products)
 */
export const productProjects: ProjectConfig[] = [
	// Add your products here using createProductProject()
	// createProductProject('myapp', 'My App', {
	//   description: 'My awesome application',
	// }),
];

/**
 * All projects combined
 */
export const allProjects: ProjectConfig[] = [globalProject, ...productProjects];

/**
 * Get project by slug
 */
export function getProjectBySlug(slug: string): ProjectConfig | undefined {
	return allProjects.find((p) => p.slug === slug);
}

/**
 * Infisical organization configuration
 */
export interface OrganizationConfig {
	/** Organization slug */
	readonly slug: string;
	/** Organization name */
	readonly name: string;
	/** Infisical instance URL (for self-hosted) */
	readonly siteUrl: string;
}

/**
 * Default organization config
 */
export const organization: OrganizationConfig = {
	slug: 'resist-js',
	name: 'resist.js',
	siteUrl: process.env.INFISICAL_SITE_URL || 'https://app.infisical.com',
};
