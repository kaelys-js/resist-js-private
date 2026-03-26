// TODO: Alias Imports
import z from "zod";

import type { ExecutionContext, RequestHandler, ResponseOrPassthrough } from "../schemas/common.schema";
import { AppError } from "../common";

/**
 * TODO(comment)
 * 
 * @param {!RequestHandler} handler TODO(comment)
 * @returns TODO
 */
export function createFetchHandler(
    handler: RequestHandler
): {
    fetch(request: Request): Promise<ResponseOrPassthrough>;
} {
    return {
        async fetch(request: Request): Promise<ResponseOrPassthrough> {
            try {
                const { getExecutionContext } = await import(
                    "../common"
                );

                const ctx: ExecutionContext = getExecutionContext(request);

                const { requestHandlerSchema } = await import("../schemas/common.schema")

                z.parse(requestHandlerSchema, handler)

                return await handler(ctx);
            } catch (error) {
                try {
                    const { captureException, failureResponse } = await import(".");

                    captureException(request, new AppError({ phase: 'handler-execution', cause: error }));

                    return failureResponse(request);
                } catch {
                    const correlationId: string = request.headers?.get?.("cf-ray") ?? crypto?.randomUUID?.()

                    return new Response(`Internal Server Error: ${correlationId}`, {
                        status: 500,
                        headers: {
                            "content-type": "text/plain; charset=utf-8",

                            "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
                            "pragma": "no-cache",
                            "expires": "0",

                            "x-content-type-options": "nosniff",
                            "x-frame-options": "DENY",
                            "referrer-policy": "no-referrer",

                            "x-request-id": crypto?.randomUUID?.(),
                            "x-correlation-id": correlationId,

                            "x-robots-tag": "noindex, nofollow"
                        }
                    });
                }
            }
        }
    };
}