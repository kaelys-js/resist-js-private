/**
 * Test route that triggers a 403 Forbidden error for error page testing.
 *
 * @module
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Throws a 403 Forbidden error — never returns page data.
 *
 * @returns Never — always throws a SvelteKit error
 */
export const load: PageServerLoad = () => {
	error(403, { message: 'Forbidden' });
};
