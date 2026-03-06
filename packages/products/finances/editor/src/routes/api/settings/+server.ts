import { SettingsSchema } from '$lib/schemas/finances';
import { singletonGet, singletonPut } from '../_helpers';
export const GET = singletonGet('settings.json', SettingsSchema);
export const PUT = singletonPut('settings.json', SettingsSchema);
