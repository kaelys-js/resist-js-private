/**
 * WebForge Plugin API
 *
 * Public SDK for plugin developers. Provides typed interfaces
 * for extending the editor and runtime.
 *
 * @module
 */

import * as v from 'valibot';

/** Plugin manifest schema. */
export const PluginManifestSchema = v.strictObject({
	/** Unique plugin identifier (kebab-case). */
	id: v.pipe(v.string(), v.minLength(1), v.regex(/^[a-z0-9-]+$/)),
	/** Display name. */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Semver version string. */
	version: v.pipe(v.string(), v.regex(/^\d+\.\d+\.\d+$/)),
	/** Plugin description. */
	description: v.optional(v.string()),
	/** Minimum WebForge version required. */
	minEngineVersion: v.optional(v.string()),
});

/** Inferred plugin manifest type. */
export type PluginManifest = v.InferOutput<typeof PluginManifestSchema>;
