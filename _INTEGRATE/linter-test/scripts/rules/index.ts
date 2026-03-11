/**
 * Resist Linter - Rule Loader and Registry
 *
 * Auto-discovers rules from:
 *   - scripts/rules/typescript/*.ts
 *   - scripts/rules/checks/**\/*.ts
 */

import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
	Rule,
	TypeScriptRule,
	RuleModule,
	LoadedRules,
	Stage,
	RuleContext,
	LintResult,
} from './types.js';
import { runTypeScriptRules } from './oxc-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Rule Discovery
// =============================================================================

/**
 * Recursively find all .ts files in a directory
 */
async function findRuleFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return files;
	}

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await findRuleFiles(fullPath)));
		} else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.startsWith('_')) {
			// Skip index.ts, types.ts, utils.ts, and files starting with _
			if (!['index.ts', 'types.ts', 'utils.ts', 'oxc-runner.ts'].includes(entry.name)) {
				files.push(fullPath);
			}
		}
	}

	return files;
}

/**
 * Load a rule module
 */
async function loadRuleModule(filePath: string): Promise<Rule[]> {
	try {
		// Convert .ts to .js for import (assuming compiled)
		const jsPath = filePath.replace(/\.ts$/, '.js');
		const module = (await import(jsPath)) as RuleModule;

		const rules: Rule[] = [];

		if (module.default) {
			if (Array.isArray(module.default)) {
				rules.push(...module.default);
			} else {
				rules.push(module.default);
			}
		}

		if (module.rules) {
			rules.push(...module.rules);
		}

		return rules;
	} catch (error) {
		console.error(`Failed to load rule from ${filePath}:`, error);
		return [];
	}
}

/**
 * Load all rules from the rules directory
 */
export async function loadRules(): Promise<LoadedRules> {
	const rulesDir = __dirname;
	const ruleFiles = await findRuleFiles(rulesDir);

	const all: Rule[] = [];
	const byId = new Map<string, Rule>();
	const byCategory = new Map<string, Rule[]>();
	const byStage = new Map<Stage, Rule[]>();
	const typescript: TypeScriptRule[] = [];
	const workspace: Rule[] = [];
	const packageRules: Rule[] = [];

	for (const file of ruleFiles) {
		const rules = await loadRuleModule(file);

		for (const rule of rules) {
			// Skip if duplicate ID
			if (byId.has(rule.id)) {
				console.warn(`Duplicate rule ID: ${rule.id}`);
				continue;
			}

			all.push(rule);
			byId.set(rule.id, rule);

			// Index by category
			for (const category of rule.categories) {
				const existing = byCategory.get(category) || [];
				existing.push(rule);
				byCategory.set(category, existing);
			}

			// Index by stage
			for (const stage of rule.stages) {
				const existing = byStage.get(stage) || [];
				existing.push(rule);
				byStage.set(stage, existing);
			}

			// Categorize by scope
			if (rule.scope.type === 'file' && 'visitor' in rule) {
				typescript.push(rule as TypeScriptRule);
			} else if (rule.scope.type === 'workspace') {
				workspace.push(rule);
			} else if (rule.scope.type === 'package') {
				packageRules.push(rule);
			}
		}
	}

	return {
		all,
		byId,
		byCategory,
		byStage,
		typescript,
		workspace,
		package: packageRules,
	};
}

// =============================================================================
// Rule Execution
// =============================================================================

export interface RunOptions {
	/** Filter by stage */
	stage?: Stage;

	/** Filter by categories */
	categories?: string[];

	/** Filter by rule IDs */
	ruleIds?: string[];

	/** Apply fixes */
	fix?: boolean;
}

/**
 * Run rules on a single file
 */
export async function runFileRules(
	filePath: string,
	content: string,
	rules: LoadedRules,
	context: RuleContext,
	options: RunOptions = {}
): Promise<LintResult[]> {
	const results: LintResult[] = [];

	// Filter rules by stage
	let applicableRules = rules.typescript;
	if (options.stage) {
		applicableRules = applicableRules.filter((r) => r.stages.includes(options.stage!));
	}
	if (options.categories?.length) {
		applicableRules = applicableRules.filter((r) =>
			r.categories.some((c) => options.categories!.includes(c))
		);
	}
	if (options.ruleIds?.length) {
		applicableRules = applicableRules.filter((r) => options.ruleIds!.includes(r.id));
	}

	// Filter by file pattern
	applicableRules = applicableRules.filter((rule) => {
		if (rule.scope.type !== 'file') return false;
		return rule.scope.patterns.some((pattern) => {
			// Simple pattern matching
			if (pattern.startsWith('**/*.')) {
				const ext = pattern.slice(4);
				return filePath.endsWith(ext);
			}
			if (pattern.startsWith('*.')) {
				const ext = pattern.slice(1);
				return filePath.endsWith(ext);
			}
			return filePath.includes(pattern);
		});
	});

	if (applicableRules.length === 0) {
		return results;
	}

	// Run TypeScript rules via oxc
	const tsResults = await runTypeScriptRules(filePath, content, applicableRules);
	results.push(...tsResults);

	return results;
}

/**
 * Run workspace-scoped rules
 */
export async function runWorkspaceRules(
	rules: LoadedRules,
	context: RuleContext,
	options: RunOptions = {}
): Promise<LintResult[]> {
	const results: LintResult[] = [];

	let applicableRules = rules.workspace;
	if (options.stage) {
		applicableRules = applicableRules.filter((r) => r.stages.includes(options.stage!));
	}
	if (options.categories?.length) {
		applicableRules = applicableRules.filter((r) =>
			r.categories.some((c) => options.categories!.includes(c))
		);
	}
	if (options.ruleIds?.length) {
		applicableRules = applicableRules.filter((r) => options.ruleIds!.includes(r.id));
	}

	for (const rule of applicableRules) {
		try {
			const ruleResults = await rule.check(context);
			results.push(...ruleResults);
		} catch (error) {
			console.error(`Error running rule ${rule.id}:`, error);
		}
	}

	return results;
}

/**
 * Run package-scoped rules
 */
export async function runPackageRules(
	rules: LoadedRules,
	context: RuleContext,
	options: RunOptions = {}
): Promise<LintResult[]> {
	const results: LintResult[] = [];

	let applicableRules = rules.package;
	if (options.stage) {
		applicableRules = applicableRules.filter((r) => r.stages.includes(options.stage!));
	}
	if (options.categories?.length) {
		applicableRules = applicableRules.filter((r) =>
			r.categories.some((c) => options.categories!.includes(c))
		);
	}
	if (options.ruleIds?.length) {
		applicableRules = applicableRules.filter((r) => options.ruleIds!.includes(r.id));
	}

	if (applicableRules.length === 0) {
		return results;
	}

	// Get all packages
	const packages = await context.getWorkspacePackages();

	for (const rule of applicableRules) {
		try {
			const ruleResults = await rule.check(context);
			results.push(...ruleResults);
		} catch (error) {
			console.error(`Error running rule ${rule.id}:`, error);
		}
	}

	return results;
}

/**
 * Run all applicable rules
 */
export async function runAllRules(
	context: RuleContext,
	options: RunOptions = {}
): Promise<LintResult[]> {
	const rules = await loadRules();
	const results: LintResult[] = [];

	// Run workspace rules
	const workspaceResults = await runWorkspaceRules(rules, context, options);
	results.push(...workspaceResults);

	// Run package rules
	const packageResults = await runPackageRules(rules, context, options);
	results.push(...packageResults);

	// File rules are run separately per-file from lint.mjs

	return results;
}

// =============================================================================
// Utility Exports
// =============================================================================

export { createRuleContext } from './utils.js';
export type { Rule, TypeScriptRule, LintResult, RuleContext, Stage } from './types.js';
