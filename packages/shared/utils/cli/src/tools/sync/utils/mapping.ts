/**
 * Sync Mapping
 *
 * With templates at template/packages/ mirroring the workspace root,
 * output path = template path with .hbs extension stripped.
 *
 * No complex mapping needed - the directory structure IS the mapping.
 *
 * @module
 */

import type { TemplateContext } from '@/cli/tools/sync/utils/transform';
import {
  BoolSchema,
  StrArraySchema,
  StrSchema,
  type Bool,
  type OptionalStr,
  type Str,
  type StrArray,
} from '@/schemas/common';
import { type Result, ok } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Skip Patterns
// =============================================================================

/**
 * Templates to skip during processing.
 * Use this for partials, includes, or templates that shouldn't generate files.
 */
export const SKIP_TEMPLATES: StrArray = ['_partials/'];

/**
 * Templates that are conditional based on package manager.
 * Maps template paths to the package manager they require.
 */
export const PM_CONDITIONAL_TEMPLATES: Record<Str, Str> = {
  'packages/pnpm-workspace.yaml': 'pnpm',
};

/**
 * Templates conditional on git provider.
 * Maps output path prefixes to the provider they require.
 * Directory prefixes (ending with `/`) cause all templates under them to be skipped.
 * Individual files are cleaned up when switching providers.
 */
export const PROVIDER_CONDITIONAL_TEMPLATES: Record<Str, Str> = {
  // GitHub
  '.github/': 'github',
  '.actrc': 'github',
  // GitLab
  '.gitlab/': 'gitlab',
  '.gitlab-ci.yml': 'gitlab',
};

/**
 * Templates conditional on feature flags in the template context.
 * Maps output path prefixes to boolean context keys.
 * When the context key resolves to `false`, all templates under that prefix are skipped.
 *
 * For example, setting `tooling.devContainer.enabled: false` in resist.config.ts
 * causes all `.devcontainer/` templates to be skipped during sync.
 */
const FEATURE_CONDITIONAL_TEMPLATES: Record<Str, Str> = {
  '.devcontainer/': 'tooling.devContainer.enabled',
  '.coder/': 'tooling.coder.enabled',
  '.actrc': 'tooling.ci.enabled',
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Resolve the output path for a template.
 * Simply strips the .hbs extension since template structure mirrors workspace.
 *
 * @param templatePath - Path to the template file (relative to templates/).
 * @returns `Result<Str>` — output path relative to workspace root, or a validation error.
 */
export function resolveOutputPath(templatePath: Str): Result<Str> {
  const parsed: Result<Str> = safeParse(StrSchema, templatePath);
  if (!parsed.ok) return parsed;
  const normalized: Str = parsed.data.replace(/^\.\//, '');
  const output: Str = normalized.replace(/\.hbs$/, '');
  return ok(StrSchema, output);
}

/**
 * Check if a template should be skipped.
 *
 * @param templatePath - Path to the template file.
 * @param context - Template context (optional, for conditional skipping).
 * @returns `Result<Bool>` — `true` if template should not be processed, or a validation error.
 */
export function shouldSkipTemplate(templatePath: Str, context?: TemplateContext): Result<Bool> {
  const parsed: Result<Str> = safeParse(StrSchema, templatePath);
  if (!parsed.ok) return parsed;
  const normalized: Str = parsed.data.replace(/^\.\//, '');

  // Check static skip patterns
  if (
    SKIP_TEMPLATES.some((pattern: Str) => normalized === pattern || normalized.startsWith(pattern))
  ) {
    return ok(BoolSchema, true);
  }

  // Check package manager conditional templates
  if (context) {
    const outputResult: Result<Str> = resolveOutputPath(normalized);
    if (!outputResult.ok) return outputResult;
    const requiredPm: OptionalStr = PM_CONDITIONAL_TEMPLATES[outputResult.data];
    if (requiredPm && context['pm.name'] !== requiredPm) {
      return ok(BoolSchema, true);
    }

    // Check git provider conditional templates
    for (const [prefix, requiredProvider] of Object.entries(PROVIDER_CONDITIONAL_TEMPLATES)) {
      if (outputResult.data.startsWith(prefix) && context['git.provider'] !== requiredProvider) {
        return ok(BoolSchema, true);
      }
    }

    // Check feature-flag conditional templates
    for (const [prefix, contextKey] of Object.entries(FEATURE_CONDITIONAL_TEMPLATES)) {
      if (outputResult.data.startsWith(prefix) && context[contextKey] === false) {
        return ok(BoolSchema, true);
      }
    }
  }

  return ok(BoolSchema, false);
}

/**
 * Get stale conditional template outputs that should be cleaned up.
 *
 * For each entry in `PM_CONDITIONAL_TEMPLATES` and `PROVIDER_CONDITIONAL_TEMPLATES`,
 * if the current config does not match the required value, the output file is stale
 * and should be deleted. Directory prefixes (ending with `/`) are skipped since
 * `deleteFile()` operates on individual files.
 *
 * @param context - Template context with current PM and provider configuration.
 * @returns `Result<StrArray>` — workspace-relative paths to clean up, or a structured error.
 */
export function getStaleConditionalOutputs(context: TemplateContext): Result<StrArray> {
  const stale: StrArray = [];

  for (const [outputPath, requiredPm] of Object.entries(PM_CONDITIONAL_TEMPLATES)) {
    if (context['pm.name'] !== requiredPm) {
      stale.push(outputPath);
    }
  }

  for (const [outputPath, requiredProvider] of Object.entries(PROVIDER_CONDITIONAL_TEMPLATES)) {
    if (context['git.provider'] !== requiredProvider && !outputPath.endsWith('/')) {
      stale.push(outputPath);
    }
  }

  return ok(StrArraySchema, stale);
}
