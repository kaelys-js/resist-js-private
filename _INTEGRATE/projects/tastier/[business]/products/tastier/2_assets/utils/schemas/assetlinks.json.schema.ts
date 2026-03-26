import {
    array,
    InferOutput,
    minLength,
    parse,
    picklist,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { type NonNegativeInteger, NonNegativeIntegerSchema, RegExpSchema } from "../../../0_config/src/utils/schemas/common.schema";

import { ERROR_MESSAGE_KEYS } from "./common.schema";

export const ANDROID_SHA256_FINGERPRINT_REGEX: RegExp =
    /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
parse(RegExpSchema, ANDROID_SHA256_FINGERPRINT_REGEX)

export const AndroidSha256FingerprintSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_ANDROID_SHA256_FINGERPRINT_TYPE),
    regex(
        ANDROID_SHA256_FINGERPRINT_REGEX,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_ANDROID_SHA256_FINGERPRINT_FORMAT
    )
);

export type AndroidSha256Fingerprint = InferOutput<
    typeof AndroidSha256FingerprintSchema
>;

export const NAMESPACE_ANDROID_APP: "android_app" = "android_app" as const;

export const PACKAGE_NAME_REGEX: RegExp = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
parse(RegExpSchema, PACKAGE_NAME_REGEX)

export const MIN_CERT_FINGERPRINTS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MIN_CERT_FINGERPRINTS)

export const AssetLinksTargetNamespaceSchema = picklist(
    [NAMESPACE_ANDROID_APP],
    ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_NAMESPACE_INVALID
);

export const AssetLinksTargetPackageNameSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_PACKAGE_NAME_TYPE_INVALID),
    regex(
        PACKAGE_NAME_REGEX,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_PACKAGE_NAME_FORMAT_INVALID
    )
);

export type AssetLinksTargetPackageName = InferOutput<
    typeof AssetLinksTargetPackageNameSchema
>;

export const AssetLinksTargetFingerprintsSchema = pipe(
    array(
        AndroidSha256FingerprintSchema,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_CERT_FINGERPRINTS_TYPE_INVALID
    ),
    minLength(
        MIN_CERT_FINGERPRINTS,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_CERT_FINGERPRINTS_MIN_LENGTH_INVALID
    )
);

export type AssetLinksTargetFingerprints = InferOutput<
    typeof AssetLinksTargetFingerprintsSchema
>;

export const AssetLinksTargetSchema = strictObject({
    namespace: AssetLinksTargetNamespaceSchema,
    package_name: AssetLinksTargetPackageNameSchema,
    sha256_cert_fingerprints: AssetLinksTargetFingerprintsSchema
}, ERROR_MESSAGE_KEYS.ASSET_LINKS_TARGET_STRICT_OBJECT_INVALID);

export type AssetLinksTarget = InferOutput<typeof AssetLinksTargetSchema>;

export const AssetLinksRelationValueSchema = picklist(
    ["delegate_permission/common.handle_all_urls"],
    ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_RELATION_INVALID_VALUE
);

export const ASSET_LINKS_RELATION_MIN_LENGTH: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, ASSET_LINKS_RELATION_MIN_LENGTH)

export const AssetLinksRelationArraySchema = pipe(
    array(
        AssetLinksRelationValueSchema,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_RELATION_NOT_ARRAY
    ),
    minLength(
        ASSET_LINKS_RELATION_MIN_LENGTH,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_RELATION_EMPTY
    )
);

export type AssetLinksRelationArray = InferOutput<
    typeof AssetLinksRelationArraySchema
>;

export const AssetLinksEntrySchema = strictObject({
    relation: AssetLinksRelationArraySchema,
    target: AssetLinksTargetSchema
}, ERROR_MESSAGE_KEYS.ASSET_LINKS_ENTRY_STRICT_OBJECT_INVALID);

export type AssetLinksEntry = InferOutput<typeof AssetLinksEntrySchema>;

export const ASSETLINKS_MIN_LENGTH: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, ASSETLINKS_MIN_LENGTH)

export const AssetLinksSchema = pipe(
    array(
        AssetLinksEntrySchema,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_ARRAY
    ),
    minLength(
        ASSETLINKS_MIN_LENGTH,
        ERROR_MESSAGE_KEYS.ASSET_LINKS_JSON_MIN_LENGTH
    )
);

export type AssetLinks = InferOutput<typeof AssetLinksSchema>;

export function output(config: AssetLinks): AssetLinks {
    return parse(AssetLinksSchema, config)
}