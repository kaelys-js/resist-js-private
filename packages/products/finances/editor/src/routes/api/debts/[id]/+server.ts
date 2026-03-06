import { DebtItemSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('debts.json', DebtItemSchema);
export const DELETE = collectionDelete('debts.json', DebtItemSchema);
