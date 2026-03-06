import { LifetimeReplacementSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('lifetime-replacements.json', LifetimeReplacementSchema);
export const POST = collectionPost('lifetime-replacements.json', LifetimeReplacementSchema);
