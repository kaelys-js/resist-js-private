import { LifetimeExpenseSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('lifetime-expenses.json', LifetimeExpenseSchema);
export const POST = collectionPost('lifetime-expenses.json', LifetimeExpenseSchema);
