/**
 * Secrets Tool — Product Flag
 *
 * Overrides the shared `--product` flag to use `StrSchema`
 * because the secrets tool accepts the special value `"all"` to
 * display secrets for all products.
 *
 * @module
 */

import type { FlagDefinition } from '@/cli/schemas';
import { StrSchema } from '@/schemas/common';
import sharedProductDefs from '@/utils/flags/shared/product';

/**
 * Product flag with `StrSchema` — accepts any string including `"all"`.
 */
const defs: readonly FlagDefinition[] = sharedProductDefs.map(
  (def: FlagDefinition): FlagDefinition => ({
    ...def,
    schema: StrSchema,
    formatError: undefined,
  }),
);

export default defs;
