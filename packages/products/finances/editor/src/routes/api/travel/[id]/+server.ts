import { TravelSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('travel.json', TravelSchema);
export const DELETE = collectionDelete('travel.json', TravelSchema);
