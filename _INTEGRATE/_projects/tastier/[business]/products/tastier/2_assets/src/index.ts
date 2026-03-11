// TODO: Alias Imports
import type { ExecutionContext, ResponseOrPassthrough } from "../../0_config/src/utils/schemas/common.schema";

import { createFetchHandler } from "../../0_config/src/utils/common/handle-request";

import type { StaticAssetPayload } from "../utils/schemas/common.schema";

export default createFetchHandler(
    async (ctx: ExecutionContext): Promise<ResponseOrPassthrough> => {
        const { getStaticAssetPayload } = await import("../utils/common");

        const { cacheTtl, content, route }: StaticAssetPayload =
            await getStaticAssetPayload(ctx);

        if (content !== undefined) {
            const { respond } = await import("../utils/respond");

            return respond({
                ctx,
                cacheTtl,
                content,
                route
            });
        }
    }
);
