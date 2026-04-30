/**
 * Lazy Node.js Built-in Module Accessors
 *
 * Defers loading of Node.js built-in modules via top-level `await`
 * with `try/catch`. In non-Node runtimes, exports resolve to
 * `undefined` without crashing.
 *
 * Contract: callers must check for `undefined` before using any
 * export. Use local narrowing — never use non-null assertion (`!`).
 *
 * @module
 */

import type { Bool } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type * as NodeOsModule from 'node:os';
import type * as NodeFsModule from 'node:fs';
import type * as NodePathModule from 'node:path';
import type * as NodeUrlModule from 'node:url';
import type * as NodeNetModule from 'node:net';
import type * as NodeChildProcessModule from 'node:child_process';
import { hasNodeProcess } from '@/utils/core/environment';

/** Structural type of `node:os`. */
export type NodeOs = typeof NodeOsModule;

/** Structural type of `node:fs`. */
export type NodeFs = typeof NodeFsModule;

/** Structural type of `node:path`. */
export type NodePath = typeof NodePathModule;

/** Structural type of `node:url`. */
export type NodeUrl = typeof NodeUrlModule;

/** Structural type of `node:net`. */
export type NodeNet = typeof NodeNetModule;

/** Structural type of `node:child_process`. */
export type NodeChildProcess = typeof NodeChildProcessModule;

// ─── Optional Node Module Type Aliases ────────────────────────────────
// Defined here (not in `schemas/common`) to avoid a circular dependency.
// Structural types from `node:*` modules cannot be expressed as Valibot
// primitives. Type aliases suffice — callers narrow with `if (!mod)`.

/** `NodeOs` or `undefined` — lazy-loaded `node:os` module. */
export type OptionalNodeOs = NodeOs | undefined;

/** `NodeFs` or `undefined` — lazy-loaded `node:fs` module. */
export type OptionalNodeFs = NodeFs | undefined;

/** `NodePath` or `undefined` — lazy-loaded `node:path` module. */
export type OptionalNodePath = NodePath | undefined;

/** `NodeUrl` or `undefined` — lazy-loaded `node:url` module. */
export type OptionalNodeUrl = NodeUrl | undefined;

/** `NodeNet` or `undefined` — lazy-loaded `node:net` module. */
export type OptionalNodeNet = NodeNet | undefined;

/** `NodeChildProcess` or `undefined` — lazy-loaded `node:child_process` module. */
export type OptionalNodeChildProcess = NodeChildProcess | undefined;

/**
 * Loads a Node built-in module, returning `undefined` if unavailable.
 *
 * @param specifier - The module specifier to import (e.g. `'node:os'`).
 * @returns The loaded module, or `undefined` if the import fails.
 */
async function tryImport<T>(specifier: string): Promise<T | undefined> {
  try {
    return (await import(/* @vite-ignore */ specifier)) as T;
  } catch {
    /* non-Node */
    return undefined;
  }
}

let _nodeOs: OptionalNodeOs;
let _nodeFs: OptionalNodeFs;
let _nodePath: OptionalNodePath;
let _nodeUrl: OptionalNodeUrl;
let _nodeNet: OptionalNodeNet;
let _nodeChildProcess: OptionalNodeChildProcess;

const hasNode: Result<Bool> = hasNodeProcess();

if (hasNode.ok && hasNode.data) {
  _nodeOs = await tryImport<NodeOs>('node:os');
  _nodeFs = await tryImport<NodeFs>('node:fs');
  _nodePath = await tryImport<NodePath>('node:path');
  _nodeUrl = await tryImport<NodeUrl>('node:url');
  _nodeNet = await tryImport<NodeNet>('node:net');
  _nodeChildProcess = await tryImport<NodeChildProcess>('node:child_process');
}

/** `node:os` module, or `undefined` in non-Node runtimes. */
const nodeOs: OptionalNodeOs = _nodeOs;

/** `node:fs` module, or `undefined` in non-Node runtimes. */
const nodeFs: OptionalNodeFs = _nodeFs;

/** `node:path` module, or `undefined` in non-Node runtimes. */
const nodePath: OptionalNodePath = _nodePath;

/** `node:url` module, or `undefined` in non-Node runtimes. */
const nodeUrl: OptionalNodeUrl = _nodeUrl;

/** `node:net` module, or `undefined` in non-Node runtimes. */
const nodeNet: OptionalNodeNet = _nodeNet;

/** `node:child_process` module, or `undefined` in non-Node runtimes. */
const nodeChildProcess: OptionalNodeChildProcess = _nodeChildProcess;

export { nodeOs, nodeFs, nodePath, nodeUrl, nodeNet, nodeChildProcess };
