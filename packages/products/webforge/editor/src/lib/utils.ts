import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and tailwind-merge.
 *
 * @param inputs - Class values to merge.
 * @returns Merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

// oxlint-disable-next-line typescript/no-explicit-any -- shadcn-svelte utility type
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// oxlint-disable-next-line typescript/no-explicit-any -- shadcn-svelte utility type
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
