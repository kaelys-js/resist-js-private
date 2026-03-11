/**
 * Shared utility functions and types for the editor UI.
 *
 * Provides class-name merging via Tailwind Merge + clsx, and
 * generic component utility types used by shadcn-svelte.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and tailwind-merge.
 *
 * Combines multiple class values (strings, arrays, conditionals) and
 * resolves Tailwind CSS conflicts so the last utility wins.
 *
 * @param inputs - Class values to merge.
 * @returns Merged class string with Tailwind conflicts resolved.
 *
 * @example
 * ```typescript
 * cn('px-4 py-2', 'px-6');
 * // => 'px-6 py-2'
 *
 * cn('text-red-500', isActive && 'text-blue-500');
 * // => 'text-blue-500' (when isActive is true)
 * ```
 */
export function cn(...inputs: ClassValue[]): Str {
  return twMerge(clsx(inputs));
}

/**
 * Strips the `child` snippet prop from a component props type.
 *
 * Used by shadcn-svelte wrapper components that provide their own
 * child rendering and need to omit the underlying `child` prop.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- shadcn-svelte utility type
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;

/**
 * Strips the `children` snippet prop from a component props type.
 *
 * Used by shadcn-svelte wrapper components that provide their own
 * children rendering and need to omit the underlying `children` prop.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- shadcn-svelte utility type
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;

/** Strips both `child` and `children` snippet props from a component props type. */
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;

/** Adds an optional `ref` prop typed to the given HTML element for direct DOM access. */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
