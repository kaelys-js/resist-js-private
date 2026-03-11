import {
    array,
    InferOutput,
    minLength,
    parse,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { NonNegativeIntegerSchema, RegExpSchema, type NonNegativeInteger, type TextFileOutput } from "../../../../0_config/src/utils/schemas/common.schema";

import { CONTROL_CHARACTERS } from "../../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_PATTERN: RegExp = /^[A-Za-z0-9._=-]+$/;
parse(RegExpSchema, APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_PATTERN)

export const AppleIdDomainAssociationTokenSchema = pipe(
    string(ERROR_MESSAGE_KEYS.APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_EXPECTED_STRING),
    regex(
        APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_PATTERN,
        ERROR_MESSAGE_KEYS.APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_INVALID_CHARSET
    )
);

export type AppleIdDomainAssociationToken = InferOutput<
    typeof AppleIdDomainAssociationTokenSchema
>;

export const APPLE_ID_DOMAIN_ASSOCIATION_MIN_TOKENS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, APPLE_ID_DOMAIN_ASSOCIATION_MIN_TOKENS)

export const AppleIdDomainAssociationTokensSchema = pipe(
    array(
        AppleIdDomainAssociationTokenSchema,
        ERROR_MESSAGE_KEYS.APPLE_ID_DOMAIN_ASSOCIATION_TOKENS_NOT_ARRAY
    ),
    minLength(
        APPLE_ID_DOMAIN_ASSOCIATION_MIN_TOKENS,
        ERROR_MESSAGE_KEYS.APPLE_ID_DOMAIN_ASSOCIATION_TOKENS_MIN_LENGTH
    )
);

export const AppleDeveloperIdDomainAssociationSchema = strictObject(
    {
        tokens: AppleIdDomainAssociationTokensSchema
    },
    ERROR_MESSAGE_KEYS.APPLE_ID_DOMAIN_ASSOCIATION_INVALID_OBJECT
);

export type AppleDeveloperIdDomainAssociation = InferOutput<
    typeof AppleDeveloperIdDomainAssociationSchema
>;

export function appleDeveloperIdDomainAssociationToText(
    data: AppleDeveloperIdDomainAssociation
): TextFileOutput {
    parse(AppleDeveloperIdDomainAssociationSchema, data)

    return `${data.tokens.join(CONTROL_CHARACTERS.NEWLINE)}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput;
}

export function output(config: AppleDeveloperIdDomainAssociation): TextFileOutput {
    return appleDeveloperIdDomainAssociationToText(config)
} 