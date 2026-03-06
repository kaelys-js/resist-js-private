import { DebtItemSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('debts.json', DebtItemSchema);
export const POST = collectionPost('debts.json', DebtItemSchema);
