import { LifetimeExpenseSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('lifetime-expenses.json', LifetimeExpenseSchema);
export const DELETE = collectionDelete('lifetime-expenses.json', LifetimeExpenseSchema);
