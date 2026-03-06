import { PurchaseSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('purchases.json', PurchaseSchema);
export const DELETE = collectionDelete('purchases.json', PurchaseSchema);
