import {
    array,
    check,
    InferOutput,
    parse,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { HttpsUrlSchema, RegExpSchema, type UnicodeString } from "../../../../0_config/src/utils/schemas/common.schema";

import { ERROR_MESSAGE_KEYS }
    from "../common.schema";

export const RELATED_WEBSITE_SET_DOMAIN_REGEX: RegExp = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
parse(RegExpSchema, RELATED_WEBSITE_SET_DOMAIN_REGEX)

export const DomainSchema = pipe(
    string(ERROR_MESSAGE_KEYS.RELATED_WEBSITE_SET_DOMAIN_NOT_STRING),
    regex(
        RELATED_WEBSITE_SET_DOMAIN_REGEX,
        ERROR_MESSAGE_KEYS.RELATED_WEBSITE_SET_DOMAIN_INVALID_FORMAT
    )
);

export const DomainArraySchema = array(DomainSchema, ERROR_MESSAGE_KEYS.RELATED_WEBSITE_SET_DOMAIN_ARRAY_INVALID)

export type DomainArray = InferOutput<typeof DomainArraySchema>

export const RelatedWebsiteSetSchema = pipe(
    strictObject({
        $schema: HttpsUrlSchema,
        primary: DomainSchema,
        associatedSites: DomainArraySchema,
        serviceSites: DomainArraySchema,
    }, ERROR_MESSAGE_KEYS.RELATED_WEBSITE_SET_STRICT_OBJECT_CONTRACT_VIOLATION),

    check(
        (value) => {
            const primary: UnicodeString = value.primary.toLowerCase();

            const associatedSet: Set<UnicodeString> = new Set<UnicodeString>(
                value.associatedSites.map((value: UnicodeString): UnicodeString => {
                    return value.toLowerCase();
                }),
            );

            const serviceSet: Set<UnicodeString> = new Set<UnicodeString>(
                value.serviceSites.map((value: UnicodeString): UnicodeString => {
                    return value.toLowerCase();
                }),
            );

            if (associatedSet.has(primary) === true) {
                return false;
            }

            if (serviceSet.has(primary) === true) {
                return false;
            }

            if (associatedSet.size !== value.associatedSites.length) {
                return false;
            }

            if (serviceSet.size !== value.serviceSites.length) {
                return false;
            }

            for (const site of associatedSet) {
                if (serviceSet.has(site) === true) {
                    return false;
                }
            }

            return true;
        },
        ERROR_MESSAGE_KEYS.RELATED_WEBSITE_SET_INVALID,
    )
);

export type RelatedWebsiteSet = InferOutput<typeof RelatedWebsiteSetSchema>;

export function output(config: RelatedWebsiteSet): RelatedWebsiteSet {
    return parse(RelatedWebsiteSetSchema, config)
}