/**
 * Debug state schemas — re-exports from shared devtools package
 * with editor-specific URL_PARAM_PREFIX.
 *
 * @module
 */

export {
  LOG_LEVELS,
  LogLevelSchema,
  type LogLevel,
  DebugStateSchema,
  type DebugState,
  UrlOverridesSchema,
  type UrlOverrides,
} from '@/utils/devtools/debug-state-schema';

export { URL_PARAM_PREFIX } from '$lib/config/app-meta';
