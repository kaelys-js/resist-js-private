import { TravelSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('travel.json', TravelSchema);
export const POST = collectionPost('travel.json', TravelSchema);
