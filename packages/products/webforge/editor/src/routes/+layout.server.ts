import type { LayoutServerLoad } from './$types';

// TODO: Proper Commenting

export const load: LayoutServerLoad = ({ locals }) => {
	return { locale: locals.locale };
};
