import { PurchaseSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('purchases.json', PurchaseSchema);
export const POST = collectionPost('purchases.json', PurchaseSchema);
