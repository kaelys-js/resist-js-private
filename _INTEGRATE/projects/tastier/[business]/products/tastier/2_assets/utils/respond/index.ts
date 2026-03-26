// TODO: Alias Imports
import { HTTP_STATUS_CODES } from "../../../0_config/src/utils/common/constants";

import { validateInput } from "../../../0_config/src/utils/common";

import { type UnicodeString } from "../../../0_config/src/utils/schemas/common.schema";

import { getStaticAssetResponseHeaders, inferStaticAssetResponseType, serializeResponseBodyToUnicode } from "../common";

import { respondInputParametersSchema, type RespondInputParameters, type StaticAssetResponseType } from "../schemas/common.schema";

/**
 * TODO(comment)
 * 
 * @param {!RespondInputParameters} parameters Parameters.
 * @returns {!Response}
 */
export function respond(parameters: RespondInputParameters): Response {
    const { ctx, cacheTtl, content, route }: RespondInputParameters = validateInput(respondInputParametersSchema, parameters, "input-validation");

    ctx.spanTimer.markEnd("request");
    ctx.spanTimer.markStart("response")

    const type: StaticAssetResponseType = inferStaticAssetResponseType(route)
    const body: UnicodeString = serializeResponseBodyToUnicode({ ctx, content, type, cacheTtl })
    const headers: HeadersInit = getStaticAssetResponseHeaders({ ctx, cacheTtl, content, type })

    ctx.spanTimer.markEnd("response")
    
    // TODO: Set Server-Timing

    return new Response(body, {
        headers,
        status: HTTP_STATUS_CODES.OK,
    });
}