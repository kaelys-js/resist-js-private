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

export const APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_PATTERN: RegExp = /^[A-Za-z0-9._=-]+$/;
parse(RegExpSchema, APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_PATTERN)

export const AppleMerchantIdDomainAssociationTokenSchema = pipe(
    string(ERROR_MESSAGE_KEYS.APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_EXPECTED_STRING),
    regex(
        APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_PATTERN,
        ERROR_MESSAGE_KEYS.APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_INVALID_CHARSET
    )
);

export type AppleMerchantIdDomainAssociationToken = InferOutput<
    typeof AppleMerchantIdDomainAssociationTokenSchema
>;

export const APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_MIN_TOKENS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_MIN_TOKENS)

export const AppleMerchantIdDomainAssociationTokensSchema = pipe(
    array(
        AppleMerchantIdDomainAssociationTokenSchema,
        ERROR_MESSAGE_KEYS.APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKENS_NOT_ARRAY
    ),
    minLength(
        APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_MIN_TOKENS,
        ERROR_MESSAGE_KEYS.APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKENS_MIN_LENGTH
    )
);

export const AppleDeveloperMerchantIdDomainAssociationSchema = strictObject(
    {
        tokens: AppleMerchantIdDomainAssociationTokensSchema
    },
    ERROR_MESSAGE_KEYS.APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_INVALID_OBJECT
);

export type AppleDeveloperMerchantIdDomainAssociation = InferOutput<
    typeof AppleDeveloperMerchantIdDomainAssociationSchema
>;

export function appleDeveloperMerchantIdDomainAssociationToText(
    data: AppleDeveloperMerchantIdDomainAssociation
): TextFileOutput {
    parse(AppleDeveloperMerchantIdDomainAssociationSchema, data)

    return `${data.tokens.join(CONTROL_CHARACTERS.NEWLINE)}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput;
}

export function output(config: AppleDeveloperMerchantIdDomainAssociation): TextFileOutput {
    return appleDeveloperMerchantIdDomainAssociationToText(config)
} 