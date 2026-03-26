import {
    array,
    check,
    InferOutput,
    maxLength,
    minLength,
    optional,
    parse,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { CONTROL_CHARACTERS } from "../../../../0_config/src/utils/common/constants";

import { NonNegativeIntegerSchema, RegExpSchema, type NonNegativeInteger, type TextFileOutput } from "../../../../0_config/src/utils/schemas/common.schema";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const APPLE_APP_ID_REGEX: RegExp = /^[A-Z0-9]{10}\.[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;
parse(RegExpSchema, APPLE_APP_ID_REGEX)

export const AppleAppIdSchema = pipe(
    string(ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLE_APP_ID_NOT_STRING),
    regex(
        APPLE_APP_ID_REGEX,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLE_APP_ID_INVALID_FORMAT
    )
);

export const APPLE_PATH_REGEX: RegExp = /^\/(?!\/)(?!.*:\/\/)[^\s]*$/;
parse(RegExpSchema, APPLE_PATH_REGEX)

export const ApplePathSchema = pipe(
    string(ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLE_PATH_NOT_STRING),
    regex(
        APPLE_PATH_REGEX,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLE_PATH_INVALID_FORMAT
    )
);

export const APPLE_APP_LINKS_PATHS_MIN_LENGTH: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, APPLE_APP_LINKS_PATHS_MIN_LENGTH)

export const AppleAppLinksPathsSchema = pipe(
    array(
        ApplePathSchema,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_PATHS_NOT_ARRAY
    ),
    minLength(
        APPLE_APP_LINKS_PATHS_MIN_LENGTH,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_PATHS_MIN_LENGTH
    )
);

export const AppleAppLinksDetailSchema = strictObject({
    appID: AppleAppIdSchema,
    paths: AppleAppLinksPathsSchema,
}, ERROR_MESSAGE_KEYS.APPLE_APP_LINKS_DETAIL_STRICT_OBJECT_INVALID);

export type AppleAppLinksDetail = InferOutput<typeof AppleAppLinksDetailSchema>;

export const APPLINKS_APPS_MAX_LENGTH: NonNegativeInteger = 0;
parse(NonNegativeIntegerSchema, APPLINKS_APPS_MAX_LENGTH)

export const APPLINKS_DETAILS_MIN_LENGTH: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, APPLINKS_DETAILS_MIN_LENGTH)

export const AppleAppLinksAppsSchema = pipe(
    array(
        string(ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLINKS_APPS_STRING_TYPE_INVALID),
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLINKS_APPS_ARRAY_TYPE_INVALID
    ),
    maxLength(
        APPLINKS_APPS_MAX_LENGTH,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLINKS_APPS_LENGTH_INVALID
    )
);

export const AppleAppLinksDetailsSchema = pipe(
    array(
        AppleAppLinksDetailSchema,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLINKS_DETAILS_ARRAY_TYPE_INVALID
    ),
    minLength(
        APPLINKS_DETAILS_MIN_LENGTH,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLINKS_DETAILS_MIN_LENGTH_INVALID
    )
);

export const AppleAppLinksSchema = strictObject({
    apps: AppleAppLinksAppsSchema,
    details: AppleAppLinksDetailsSchema
}, ERROR_MESSAGE_KEYS.APPLE_APP_LINKS_STRICT_OBJECT_INVALID);

export type AppleAppLinks = InferOutput<typeof AppleAppLinksSchema>;

export const WEB_CREDENTIALS_APPS_MIN_LENGTH: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, WEB_CREDENTIALS_APPS_MIN_LENGTH)

export const AppleWebCredentialsAppsSchema = pipe(
    array(AppleAppIdSchema, ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCIATION_WEB_CREDENTIALS_APPS_INVALID),
    minLength(
        WEB_CREDENTIALS_APPS_MIN_LENGTH,
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_WEB_CREDENTIALS_APPS_MIN_LENGTH
    )
);

export const AppleWebCredentialsSchema = strictObject({
    apps: AppleWebCredentialsAppsSchema,
}, ERROR_MESSAGE_KEYS.APPLE_WEB_CREDENTIALS_STRICT_OBJECT_INVALID);

export type AppleWebCredentials = InferOutput<typeof AppleWebCredentialsSchema>;

export const APPLE_APP_CLIPS_MIN_APPS: NonNegativeInteger = 1
parse(NonNegativeIntegerSchema, APPLE_APP_CLIPS_MIN_APPS)

export const AppleAppClipsSchema = strictObject({
    apps: pipe(
        array(
            AppleAppIdSchema,
            ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLE_APP_CLIPS_APPS_TYPE
        ),
        minLength(
            APPLE_APP_CLIPS_MIN_APPS,
            ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_APPLE_APP_CLIPS_APPS_MIN_LENGTH
        )
    ),
}, ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCIATION_APPLE_APP_CLIPS_STRICT_OBJECT);

export type AppleAppClips = InferOutput<typeof AppleAppClipsSchema>;

export const AppleAppSiteAssociationSchema = pipe(
    strictObject(
        {
            applinks: optional(AppleAppLinksSchema),
            webcredentials: optional(AppleWebCredentialsSchema),
            appclips: optional(AppleAppClipsSchema),
        },
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_AASA_ROOT_OBJECT_INVALID
    ),
    check(
        (value): boolean => {
            return (
                value.applinks !== undefined ||
                value.webcredentials !== undefined ||
                value.appclips !== undefined
            );
        },
        ERROR_MESSAGE_KEYS.APPLE_APP_SITE_ASSOCATION_AASA_REQUIRED_SECTION_MISSING
    )
);

export type AppleAppSiteAssociation = InferOutput<
    typeof AppleAppSiteAssociationSchema
>;

export function appleAppSiteAssociationToText(
    data: AppleAppSiteAssociation
): TextFileOutput {
    parse(AppleAppSiteAssociationSchema, data)

    return `${JSON.stringify(data)}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput;
}

export function output(config: AppleAppSiteAssociation): TextFileOutput {
    return appleAppSiteAssociationToText(config)
}