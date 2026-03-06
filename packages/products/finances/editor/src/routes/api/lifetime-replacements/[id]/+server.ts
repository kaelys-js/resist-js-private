import { LifetimeReplacementSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('lifetime-replacements.json', LifetimeReplacementSchema);
export const DELETE = collectionDelete('lifetime-replacements.json', LifetimeReplacementSchema);
