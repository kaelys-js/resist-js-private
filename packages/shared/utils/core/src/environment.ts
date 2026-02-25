/**
 * Environment Detection
 *
 * Pure utilities for detecting runtime environment properties.
 * No CLI dependencies — suitable for use in any context.
 * Safe to call in any runtime (Node, Cloudflare Worker, browser).
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
	BoolSchema,
	ColorLevelSchema,
	EnvironmentConfigSchema,
	RequiredRuntimeSchema,
	RuntimeInfoSchema,
	RuntimeKindSchema,
	StrSchema,
	type AgentInfo,
	type Bool,
	type ColorLevel,
	type EnvironmentConfig,
	type EnvRecordWithUndefined,
	type OptionalNodeProcess,
	type ProviderInfo,
	type RequiredRuntime,
	type RuntimeInfo,
	type RuntimeKind,
	type Str,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { detectAgent } from '@/utils/core/agent';
import { getEnvRecord, isTTY } from '@/utils/core/process';
import { detectProvider } from '@/utils/core/provider';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Global Access (single globalThis access points)
// =============================================================================

/**
 * Gets the global `process` object if available.
 *
 * This is the **single access point** for `globalThis.process` in the entire
 * codebase. All other functions must use `getProcess()` or `hasNodeProcess()`
 * instead of accessing `globalThis.process` directly.
 *
 * @returns `OptionalNodeProcess` — the process object, or `undefined`
 *          in non-Node environments (browser, Cloudflare Workers without
 *          `nodejs_compat`).
 *
 * @example
 * ```typescript
 * const proc = getProcess();
 * if (proc) {
 *   proc.cwd(); // safe — narrowed to NodeJS.Process
 * }
 * ```
 */
export function getProcess(): OptionalNodeProcess {
	return globalThis.process !== undefined ? globalThis.process : undefined;
}

/**
 * Check if browser globals (`window` and `document`) are available.
 *
 * Single access point for `globalThis.window` and `globalThis.document`.
 *
 * @returns `Result<Bool>` — `true` when both `window` and `document` exist.
 *
 * @example
 * ```typescript
 * const result = hasBrowserGlobals();
 * if (result.ok && result.data) {
 *   // running in a browser
 * }
 * ```
 */
export function hasBrowserGlobals(): Result<Bool> {
	return ok(BoolSchema, globalThis.window !== undefined && globalThis.document !== undefined);
}

// =============================================================================
// Process Detection
// =============================================================================

/**
 * Check if `globalThis.process` is available.
 *
 * Centralised guard — all process-existence checks must use this function
 * instead of inline `typeof globalThis.process !== 'undefined'`.
 *
 * @returns `Result<Bool>` — `true` when `globalThis.process` exists (Node.js, Deno, Bun,
 *          CF Workers with `nodejs_compat`), `false` otherwise (browser).
 *
 * @example
 * ```typescript
 * const result = hasNodeProcess();
 * if (result.ok && result.data) {
 *   const proc = getProcess();
 *   proc.cwd(); // safe — hasNodeProcess() guarantees existence
 * }
 * ```
 */
export function hasNodeProcess(): Result<Bool> {
	return ok(BoolSchema, getProcess() !== undefined);
}

// =============================================================================
// Runtime Detection
// =============================================================================

/**
 * Detects the current runtime environment.
 *
 * Detection order (most specific first):
 * 1. Deno — has `Deno` global
 * 2. Bun — has `Bun` global
 * 3. Edge-light — has `EdgeRuntime` global string (Vercel Edge Runtime)
 * 4. Fastly — has `fastly` global (Fastly Compute)
 * 5. Netlify — has `Netlify` global object (Netlify Edge Functions)
 * 6. Service Worker — has `ServiceWorkerGlobalScope`
 * 7. SharedWorker — has `SharedWorkerGlobalScope` (before generic WorkerGlobalScope)
 * 8. Web Worker — has `WorkerGlobalScope` but no window/document
 * 9. Browser — has `window` and `document`
 * 10. Node TTY vs pipe — has `process.stdout`
 * 11. Cloudflare Worker / edge — fallback
 *
 * Safe to call in any environment — never accesses `process` without
 * checking `typeof` first.
 *
 * @returns `Result<RuntimeKind>` — detected runtime kind, or a validation error.
 *
 * @example
 * ```typescript
 * const runtime = detectRuntime();
 * if (runtime.ok && runtime.data === 'browser') { // adapt output }
 * ```
 */
export function detectRuntime(): Result<RuntimeKind> {
	// 1. Deno — has Deno global
	if ((globalThis as Record<Str, unknown>).Deno !== undefined) {
		return ok(RuntimeKindSchema, 'deno');
	}

	// 2. Bun — has Bun global
	if ((globalThis as Record<Str, unknown>).Bun !== undefined) {
		return ok(RuntimeKindSchema, 'bun');
	}

	// typeof guard prevents ReferenceError in environments where these globals don't exist
	const _g: Record<Str, unknown> = globalThis as Record<Str, unknown>;

	// 3. Edge-light (Vercel Edge Runtime) — has EdgeRuntime global string
	if (typeof _g.EdgeRuntime === 'string') {
		return ok(RuntimeKindSchema, 'edge-light');
	}

	// 4. Fastly Compute — has fastly global
	if (_g.fastly !== undefined) {
		return ok(RuntimeKindSchema, 'fastly');
	}

	// 5. Netlify Edge Functions — has Netlify global object
	if (_g.Netlify !== undefined) {
		return ok(RuntimeKindSchema, 'netlify');
	}

	// 6. Service Worker — has ServiceWorkerGlobalScope
	if (
		_g.ServiceWorkerGlobalScope !== undefined &&
		_g.self !== undefined &&
		_g.self instanceof (_g.ServiceWorkerGlobalScope as { new (): unknown; prototype: unknown })
	) {
		return ok(RuntimeKindSchema, 'service-worker');
	}

	// 7. SharedWorker — has SharedWorkerGlobalScope (before generic WorkerGlobalScope)
	if (
		_g.SharedWorkerGlobalScope !== undefined &&
		_g.self !== undefined &&
		_g.self instanceof (_g.SharedWorkerGlobalScope as { new (): unknown; prototype: unknown })
	) {
		return ok(RuntimeKindSchema, 'shared-worker');
	}

	// 8. Web Worker — has WorkerGlobalScope but no window/document
	if (
		_g.WorkerGlobalScope !== undefined &&
		_g.self !== undefined &&
		_g.self instanceof (_g.WorkerGlobalScope as { new (): unknown; prototype: unknown })
	) {
		return ok(RuntimeKindSchema, 'web-worker');
	}

	// 9. Browser — has window and document globals
	const browserResult: Result<Bool> = hasBrowserGlobals();
	if (!browserResult.ok) return browserResult;
	if (browserResult.data) {
		return ok(RuntimeKindSchema, 'browser');
	}

	// 10. Node TTY vs pipe
	const proc: OptionalNodeProcess = getProcess();
	if (!proc || proc.stdout === undefined) {
		// 11. Cloudflare Worker / edge — fallback
		return ok(RuntimeKindSchema, 'worker');
	}
	if (proc.stdout.isTTY) {
		return ok(RuntimeKindSchema, 'node-tty');
	}
	return ok(RuntimeKindSchema, 'node-pipe');
}

// =============================================================================
// Color Detection
// =============================================================================

/**
 * Detects terminal color support level.
 *
 * Evaluation order (highest priority first):
 * 1. `NO_COLOR` env var → level 0 (spec: https://no-color.org/)
 * 2. `FORCE_COLOR` env var → level by value (`''`/`'1'` = 1, `'2'` = 2, `'3'` = 3, `'0'` = 0)
 * 3. Non-TTY environments → level 0 (except CI with known color support)
 * 4. `COLORTERM=truecolor` or `COLORTERM=24bit` → level 3
 * 5. `TERM=xterm-256color` or other 256-color terminals → level 2
 * 6. CI with known color support (GitHub Actions, Travis, etc.) → level 1
 * 7. Windows 10+ → level 1
 * 8. TTY → level 1
 * 9. Fallback → level 0
 *
 * @param env - Environment variable record (from `getEnvRecord()`).
 * @param tty - Whether stdout is a TTY (from `isTTY()`).
 * @param ci - Whether running in CI (`env.CI !== undefined`).
 * @returns `Result<ColorLevel>` — detected color support level.
 *
 * @example
 * ```typescript
 * const envResult: Result<EnvRecordWithUndefined> = getEnvRecord();
 * if (!envResult.ok) return envResult;
 * const ttyResult: Result<Bool> = isTTY();
 * if (!ttyResult.ok) return ttyResult;
 * const colorResult: Result<ColorLevel> = detectColorLevel(envResult.data, ttyResult.data, envResult.data.CI !== undefined);
 * if (!colorResult.ok) return colorResult;
 * colorResult.data; // 0 | 1 | 2 | 3
 * ```
 */
export function detectColorLevel(
	env: EnvRecordWithUndefined,
	tty: Bool,
	ci: Bool,
): Result<ColorLevel> {
	// 1. NO_COLOR — spec: https://no-color.org/
	if (env.NO_COLOR !== undefined) {
		return ok(ColorLevelSchema, 0);
	}

	// 2. FORCE_COLOR — explicit override
	if (env.FORCE_COLOR !== undefined) {
		const val: Str = env.FORCE_COLOR;
		if (val === '0') return ok(ColorLevelSchema, 0);
		if (val === '2') return ok(ColorLevelSchema, 2);
		if (val === '3') return ok(ColorLevelSchema, 3);
		// '' or '1' or 'true' or any other truthy value
		return ok(ColorLevelSchema, 1);
	}

	// 3. Non-TTY — no color (unless CI with known support, handled below)
	if (!tty && !ci) {
		return ok(ColorLevelSchema, 0);
	}

	// 4. COLORTERM=truecolor or 24bit → level 3
	const colorterm: Str | undefined = env.COLORTERM;
	if (colorterm === 'truecolor' || colorterm === '24bit') {
		return ok(ColorLevelSchema, 3);
	}

	// 5. 256-color terminals
	const term: Str | undefined = env.TERM;
	if (term !== undefined && term.includes('256color')) {
		return ok(ColorLevelSchema, 2);
	}

	// 6. CI with known color support
	if (ci) {
		// GitHub Actions, Travis CI, CircleCI, GitLab CI, Buildkite, Drone, AppVeyor
		// all support at least basic ANSI colors
		const ciWithColor: Bool =
			env.GITHUB_ACTIONS !== undefined ||
			env.TRAVIS !== undefined ||
			env.CIRCLECI !== undefined ||
			env.GITLAB_CI !== undefined ||
			env.BUILDKITE !== undefined ||
			env.DRONE !== undefined ||
			env.APPVEYOR !== undefined ||
			env.CODEBUILD_BUILD_ARN !== undefined ||
			env.TEAMCITY_VERSION !== undefined;
		if (ciWithColor) {
			return ok(ColorLevelSchema, 1);
		}
		// Unknown CI — no color by default
		return ok(ColorLevelSchema, 0);
	}

	// 7. Windows — modern Windows terminal supports basic colors
	const proc: OptionalNodeProcess = getProcess();
	if (proc?.platform === 'win32') {
		return ok(ColorLevelSchema, 1);
	}

	// 8. TTY — basic color support
	if (tty) {
		return ok(ColorLevelSchema, 1);
	}

	// 9. Fallback — no color
	return ok(ColorLevelSchema, 0);
}

// =============================================================================
// Runtime Info
// =============================================================================

/**
 * Detects runtime kind with version information.
 *
 * Combines {@link detectRuntime} with version extraction:
 * - **Node.js**: `process.versions.node`
 * - **Deno**: `Deno.version.deno`
 * - **Bun**: `Bun.version`
 * - **Others**: `undefined`
 *
 * @returns `Result<RuntimeInfo>` — runtime kind and version.
 *
 * @example
 * ```typescript
 * const infoResult: Result<RuntimeInfo> = detectRuntimeInfo();
 * if (!infoResult.ok) return infoResult;
 * infoResult.data.name;    // e.g., 'node-tty'
 * infoResult.data.version; // e.g., '20.11.0'
 * ```
 */
export function detectRuntimeInfo(): Result<RuntimeInfo> {
	const runtimeResult: Result<RuntimeKind> = detectRuntime();
	if (!runtimeResult.ok) return runtimeResult;
	const kind: RuntimeKind = runtimeResult.data;

	const _g: Record<Str, unknown> = globalThis as Record<Str, unknown>;

	const version: Str | undefined = (() => {
		// Node.js — process.versions.node
		if (kind === 'node-tty' || kind === 'node-pipe') {
			const proc: OptionalNodeProcess = getProcess();
			if (!proc) return;
			const { versions } = proc as unknown as { versions?: { node?: Str } };
			if (typeof versions !== 'object' || versions === null) return;
			const nodeVer: unknown = (versions as Record<Str, unknown>).node;
			return typeof nodeVer === 'string' ? nodeVer : undefined;
		}
		// Deno — Deno.version.deno
		if (kind === 'deno') {
			const deno: unknown = _g.Deno;
			if (typeof deno !== 'object' || deno === null) return;
			const ver: unknown = (deno as Record<Str, unknown>).version;
			if (typeof ver !== 'object' || ver === null) return;
			const denoVer: unknown = (ver as Record<Str, unknown>).deno;
			return typeof denoVer === 'string' ? denoVer : undefined;
		}
		// Bun — Bun.version
		if (kind === 'bun') {
			const bun: unknown = _g.Bun;
			if (typeof bun !== 'object' || bun === null) return;
			const bunVer: unknown = (bun as Record<Str, unknown>).version;
			return typeof bunVer === 'string' ? bunVer : undefined;
		}
	})();

	return ok(RuntimeInfoSchema, { name: kind, version });
}

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Detects environment variables affecting runtime behavior.
 * Called once at startup, before flag parsing.
 *
 * Safe to call in any runtime — guards all `process` access with
 * `typeof` checks. Returns sensible defaults in non-Node environments.
 *
 * @returns `Result<EnvironmentConfig>` — detected environment configuration, or a validation error.
 *
 * @example
 * ```typescript
 * const env = detectEnvironment();
 * if (!env.ok) return env;
 * if (env.data.isCI) { ... }
 * ```
 */
export function detectEnvironment(): Result<EnvironmentConfig> {
	const envResult: Result<EnvRecordWithUndefined> = getEnvRecord();
	if (!envResult.ok) return envResult;
	const env: EnvRecordWithUndefined = envResult.data;

	const ttyResult: Result<Bool> = isTTY();
	if (!ttyResult.ok) return ttyResult;

	const browserResult: Result<Bool> = hasBrowserGlobals();
	if (!browserResult.ok) return browserResult;

	const runtimeResult: Result<RuntimeKind> = detectRuntime();
	if (!runtimeResult.ok) return runtimeResult;

	// ─── Platform detection helpers ───
	const _globalRecord: Record<Str, unknown> = globalThis as Record<Str, unknown>;

	const _hasElectron: Bool = (() => {
		const proc: OptionalNodeProcess = getProcess();
		if (!proc) return false;
		const { versions } = proc as unknown as { versions?: { electron?: Str } };
		return typeof versions === 'object' && versions !== null && 'electron' in versions;
	})();

	const _capacitorPlatform: Str | undefined = (() => {
		const cap: unknown = _globalRecord.Capacitor;
		if (typeof cap !== 'object' || cap === null) return;
		const { getPlatform } = cap as Record<Str, unknown>;
		if (typeof getPlatform !== 'function') return;
		const platform: unknown = (getPlatform as () => unknown)();
		if (platform === 'ios' || platform === 'android' || platform === 'web') return platform as Str;
	})();

	// ─── Provider detection ───
	const providerResult: Result<ProviderInfo | undefined> = detectProvider(env);
	if (!providerResult.ok) return providerResult;

	// ─── Agent detection ───
	const agentResult: Result<AgentInfo | undefined> = detectAgent(env);
	if (!agentResult.ok) return agentResult;

	// ─── Color level ───
	const colorResult: Result<ColorLevel> = detectColorLevel(
		env,
		ttyResult.data,
		env.CI !== undefined,
	);
	if (!colorResult.ok) return colorResult;

	// ─── Node version ───
	const nodeVersionStr: Str | undefined = (() => {
		const proc: OptionalNodeProcess = getProcess();
		if (!proc) return;
		const { versions } = proc as unknown as { versions?: { node?: Str } };
		return typeof versions === 'object' && versions !== null
			? ((versions as Record<Str, unknown>).node as Str | undefined)
			: undefined;
	})();
	const nodeMajor: number | undefined =
		nodeVersionStr !== undefined
			? Number.parseInt(nodeVersionStr.split('.')[0] ?? '', 10) || undefined
			: undefined;

	return ok(EnvironmentConfigSchema, {
		// Color & TTY
		noColor: env.NO_COLOR !== undefined,
		forceColor: env.FORCE_COLOR !== undefined,
		isTTY: ttyResult.data,

		// CI Providers
		isCI: env.CI !== undefined,
		isGitHubActions: env.GITHUB_ACTIONS !== undefined,
		isGitLabCI: env.GITLAB_CI !== undefined,
		isTravisCI: env.TRAVIS !== undefined,
		isJenkins: env.JENKINS_URL !== undefined,
		isAzurePipelines: env.TF_BUILD !== undefined,
		isBitbucketPipelines: env.BITBUCKET_PIPELINE_UUID !== undefined,
		isCircleCI: env.CIRCLECI !== undefined,

		// Container & Cloud Environments
		isDocker: env.DOCKER !== undefined || env.container !== undefined,
		isWSL: env.WSL_DISTRO_NAME !== undefined,
		isCodespaces: env.CODESPACES !== undefined,

		// Testing Environments
		isVitest: env.VITEST !== undefined,
		isJest: env.JEST_WORKER_ID !== undefined,

		// Runtime Environments
		isCloudflareWorker: runtimeResult.data === 'worker' && !browserResult.data,
		isBrowser: browserResult.data,
		isDeno: _globalRecord.Deno !== undefined,
		isBun: _globalRecord.Bun !== undefined,
		isNode: runtimeResult.data === 'node-tty' || runtimeResult.data === 'node-pipe',
		isWebWorker: runtimeResult.data === 'web-worker',
		isSharedWorker: runtimeResult.data === 'shared-worker',
		isServiceWorker: runtimeResult.data === 'service-worker',

		// Platform Environments
		isCapacitor: _globalRecord.Capacitor !== undefined,
		isElectronRenderer: browserResult.data && _hasElectron,
		isElectronMain: !browserResult.data && _hasElectron,
		isTauri: _globalRecord.__TAURI__ !== undefined,
		isReactNative: (() => {
			const nav: unknown = _globalRecord.navigator;
			if (typeof nav !== 'object' || nav === null) return false;
			return (nav as Record<Str, unknown>).product === 'ReactNative';
		})(),

		// Capacitor Native Platform
		isIOS: _capacitorPlatform === 'ios',
		isAndroid: _capacitorPlatform === 'android',
		isMacOS: (() => {
			const proc: OptionalNodeProcess = getProcess();
			if (proc?.platform === 'darwin') return true;
			if (browserResult.data && typeof navigator !== 'undefined') {
				return navigator.platform?.startsWith('Mac') ?? false;
			}
			return false;
		})(),

		// Capacitor Platform String
		capacitorPlatform: _capacitorPlatform as 'ios' | 'android' | 'web' | undefined,

		// Environment Modes
		isDebug: env.DEBUG !== undefined,
		isTest: env.NODE_ENV === 'test' || env.TEST !== undefined,
		isProduction: env.NODE_ENV === 'production',
		isDevelopment: env.NODE_ENV === 'development' || env.NODE_ENV === 'dev',
		isMinimal:
			env.CI !== undefined || env.NODE_ENV === 'test' || env.TEST !== undefined || !ttyResult.data,

		// Platform (OS)
		isWindows: (() => {
			const p: OptionalNodeProcess = getProcess();
			return p?.platform === 'win32';
		})(),
		isLinux: (() => {
			const p: OptionalNodeProcess = getProcess();
			return p?.platform === 'linux';
		})(),

		// SSH
		isSSH: env.SSH_CONNECTION !== undefined || env.SSH_TTY !== undefined,

		// Color Support
		isColorSupported: colorResult.data > 0,
		colorLevel: colorResult.data,

		// Runtime Environments (edge variants)
		isEdgeLight: runtimeResult.data === 'edge-light',
		isFastly: runtimeResult.data === 'fastly',
		isNetlify: runtimeResult.data === 'netlify',
		isCloudflarePages: env.CF_PAGES !== undefined,
		isDenoDeployStaging: _globalRecord.Deno !== undefined && env.DENO_DEPLOYMENT_ID !== undefined,

		// PR Detection
		isPR: providerResult.data?.isPR ?? null,

		// Runtime Version Info
		nodeVersion: nodeVersionStr,
		nodeMajorVersion: nodeMajor,

		// Provider & Agent
		provider: providerResult.data,
		agent: agentResult.data,
	});
}

// =============================================================================
// Runtime Guards
// =============================================================================

/**
 * Returns a `RUNTIME.UNSUPPORTED` error result.
 *
 * Called on the unhappy path when a lazy-loaded Node.js module is
 * `undefined`. Intended to be paired with local narrowing:
 *
 * ```typescript
 * const path = nodePath;
 * if (!path) return requireRuntime('joinPath', 'node');
 * path.join(...segments); // TypeScript narrows path to NodePath
 * ```
 *
 * @param functionName - Name of the calling function (for error metadata). Validated via `StrSchema`.
 * @param runtime - Required runtime family. Validated via `RequiredRuntimeSchema`.
 * @returns `Result<never>` with `RUNTIME.UNSUPPORTED` error.
 *
 * @example
 * ```typescript
 * const fs = nodeFs;
 * if (!fs) return requireRuntime('readFile', 'node');
 * fs.readFileSync(filePath); // narrowed, no assertion needed
 * ```
 */
export function requireRuntime(functionName: Str, runtime: RequiredRuntime): Result<never> {
	const nameResult: Result<Str> = safeParse(StrSchema, functionName);
	if (!nameResult.ok) return nameResult;
	const runtimeResult: Result<RequiredRuntime> = safeParse(RequiredRuntimeSchema, runtime);
	if (!runtimeResult.ok) return runtimeResult;
	return err(ERRORS.RUNTIME.UNSUPPORTED, {
		meta: { requires: runtimeResult.data, function: nameResult.data },
	});
}
