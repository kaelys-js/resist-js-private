// TODO: Alias Imports

import { parse } from "valibot"

import { AppError, getRequestPathname, getResponseHeaders, getStandardSecurityResponseHeaders } from "../../../0_config/src/utils/common"

import { type CacheTtlSeconds, type NonNegativeInteger, type Pathname, pathnameSchema, UnicodeStringSchema, type ExecutionContext, type UnicodeString } from "../../../0_config/src/utils/schemas/common.schema"

import { staticAssetConfig, staticAssetsCaching } from "../config"

import { type StaticAssetResponseType, type StaticAssetPayload, type StaticAssetRouteConfig, staticAssetRouteConfig, STATIC_ASSET_RESPONSE_TYPE, StaticAssetSerializeInputParameters, staticAssetSerializeInputParametersSchema, staticAssetPayloadSchema } from "../schemas/common.schema"

export function getStaticAssetRouteConfig(route: Pathname): Readonly<StaticAssetRouteConfig> {
    parse(pathnameSchema, route)

    return Object.freeze(parse(staticAssetRouteConfig, staticAssetConfig[route]))
}

export async function getStaticAssetPayload(ctx: ExecutionContext): Promise<Readonly<StaticAssetPayload>> {
    try {
        const route: Pathname = getRequestPathname(ctx.request)
        const config: StaticAssetRouteConfig = getStaticAssetRouteConfig(route)
        const cacheTtl: CacheTtlSeconds = staticAssetsCaching[route]
        const content: UnicodeString = (await import(`../schemas${route}.schema`)).output(config[route])

        return Object.freeze(parse(staticAssetPayloadSchema, { cacheTtl, content, route }))
    } catch (error) {
        throw new AppError({ phase: "asset-validation", cause: error })
    }
}

export function inferStaticAssetResponseType(
    route: Pathname
): StaticAssetResponseType {
    parse(pathnameSchema, route)

    switch (true) {
        case route.endsWith(".json"):
            return STATIC_ASSET_RESPONSE_TYPE.JSON;

        case route.endsWith(".webmanifest"):
            return STATIC_ASSET_RESPONSE_TYPE.WEB_MANIFEST;

        case route.endsWith(".txt"):
            return STATIC_ASSET_RESPONSE_TYPE.TEXT;

        case route.endsWith(".xml"):
            return STATIC_ASSET_RESPONSE_TYPE.XML;

        case route === "/.well-known/apple-app-site-association":
        case route === "/.well-known/apple-developer-domain-association":
        case route === "/.well-known/apple-developer-merchantid-domain-association":
            return STATIC_ASSET_RESPONSE_TYPE.JSON;

        case route === "/.well-known/change-password":
            return STATIC_ASSET_RESPONSE_TYPE.TEXT;

        default:
            return STATIC_ASSET_RESPONSE_TYPE.TEXT;
    }
}

export function serializeResponseBodyToUnicode(parameters: StaticAssetSerializeInputParameters): UnicodeString {
    parse(staticAssetSerializeInputParametersSchema, parameters)

    const { content, type }: StaticAssetSerializeInputParameters = parameters

    try {
        return parse(UnicodeStringSchema, type === STATIC_ASSET_RESPONSE_TYPE.JSON
            ? JSON.stringify(content)
            : `${String(content).trimEnd()}\n`);
    } catch (error) {
        throw new AppError({ phase: "serialization", cause: error })
    }
}

export function getStaticAssetResponseHeaders(parameters: StaticAssetSerializeInputParameters): HeadersInit {
    parse(staticAssetSerializeInputParametersSchema, parameters)

    const { cacheTtl, content, ctx, type }: StaticAssetSerializeInputParameters = parameters

    const encoder: TextEncoder = new TextEncoder();
    const contentLength: NonNegativeInteger = encoder.encode(<UnicodeString>content).length;

    return {
        ...getStandardSecurityResponseHeaders(ctx.request),
        ...getResponseHeaders({ type, cacheTtl, contentLength })
    }
}