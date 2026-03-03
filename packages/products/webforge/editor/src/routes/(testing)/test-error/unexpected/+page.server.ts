import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	throw new Error('Unexpected test error — this simulates a server crash');
};
