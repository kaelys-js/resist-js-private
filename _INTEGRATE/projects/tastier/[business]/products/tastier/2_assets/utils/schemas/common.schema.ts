// TODO: Alias Imports

import { any, InferOutput, instance, literal, picklist, strictObject, string, unknown } from "valibot";

// TODO: Fix imports
import { cacheTtlSecondsSchema, pathnameSchema, UnicodeStringSchema } from "../../../0_config/src/utils/schemas/common.schema";
import { CACHE_TTL_VALUES } from "../../../0_config/src/utils/common/constants";
import { AppleAppSiteAssociationSchema } from "./well-known/apple-app-site-association.schema.json";
import { ChangePasswordUrlSchema } from "./well-known/change-password.schema";
import { AppleDeveloperIdDomainAssociationSchema } from "./well-known/apple-developer-domain-assocation.schema";
import { AppleDeveloperMerchantIdDomainAssociationSchema } from "./well-known/apple-developer-merchantid-domain-assocation.schema";
import { GPCSchema } from "./well-known/gpc.json.schema"
import { MtaStsSchema } from "./well-known/mta-sts.txt.schema";
import { PgpKeySchema } from "./well-known/pgp-key.txt.schema";
import { RelatedWebsiteSetSchema } from "./well-known/related-website-set.json.schema";
import { SecurityTxtSchema } from "./well-known/security.txt.schema"
import { AdsTxtSchema } from "./ads.txt.schema";
import { AssetLinksSchema } from "./assetlinks.json.schema";
import { BrowserConfigSchema } from "./browserconfig.xml.schema";
import { RobotsTxtSchema } from "./robots.txt.schema";
import { ManifestJsonSchema } from "./manifest.webmanifest.schema";

export const ERROR_MESSAGE_KEYS = {
    CHANGE_PASSWORD_URL_NOT_STRING:
        "The change password URL was expected to be provided as a string value, but a non-string value was received, which violates the schema’s contractual requirement for textual URL input.",
    CHANGE_PASSWORD_URL_NOT_URL:
        "The change password URL was expected to be a valid absolute HTTP or HTTPS URL, but the provided string does not conform to standard URL syntax, breaking the schema’s structural URL requirements.",
    CHANGE_PASSWORD_URL_INVALID:
        "The change password URL must be a valid absolute HTTP or HTTPS URL that ends exactly with '/change-password', contains no query parameters or fragments, and was rejected because the provided value does not meet these contractual structural requirements.",

    PGP_PUBLIC_KEY_BLOCK_NOT_STRING:
        "The provided value was expected to be a string containing a complete ASCII-armored OpenPGP public key block, but a non-string value was received, which violates the schema’s type contract and prevents structural validation.",
    PGP_PUBLIC_KEY_BLOCK_INVALID_ARMOR:
        "The provided string was expected to contain exactly one properly delimited ASCII-armored OpenPGP public key block with no surrounding content, but the received value did not match the required BEGIN and END boundary structure, breaking the schema’s structural and semantic contract.",
    PGP_KEY_DOCUMENT_INVALID:
        "The provided PGP key document was expected to be a strict object containing exactly one valid publicKey property and no unknown fields, but the received value failed to meet these structural requirements, breaking the schema’s explicit object-boundary guarantees.",

    ADS_TXT_COMMENT_NOT_STRING: "The ads.txt comment value was expected to be a string but a non-string value was provided, which violates the schema’s contractual requirement that each ads.txt line be represented as textual data.",
    ADS_TXT_COMMENT_INVALID_FORMAT: "The ads.txt comment line was expected to begin immediately with a hash character without any leading whitespace, but the provided value did not meet this requirement, violating the structural definition of a valid ads.txt comment line.",

    ADS_TXT_AD_SYSTEM_DOMAIN_NOT_STRING:
        "The advertising system domain was expected to be a string value representing a valid domain name, but a non-string value was received, which violates the structural requirement of the ads.txt schema.",
    ADS_TXT_AD_SYSTEM_DOMAIN_INVALID:
        "The advertising system domain was expected to be a syntactically valid domain containing at least one dot and a recognized top-level domain, but the provided value did not conform to domain name standards, breaking the semantic contract of the ads.txt specification.",
    ADS_TXT_PUBLISHER_ID_NOT_STRING:
        "The publisher account identifier was expected to be a string value, but a non-string value was received, which violates the structural contract required for ads.txt publisher identification.",
    ADS_TXT_PUBLISHER_ID_INVALID:
        "The publisher account identifier was expected to contain only alphanumeric characters, dots, underscores, or hyphens as defined by ads.txt conventions, but the provided value included invalid characters, breaking the semantic validity of the record.",
    ADS_TXT_RELATIONSHIP_INVALID:
        "The relationship field was expected to be either the literal value DIRECT or RESELLER as defined by the IAB ads.txt specification, but a different value was received, which violates the contractual enumeration constraints of the schema.",
    ADS_TXT_CERT_AUTH_ID_NOT_STRING:
        "The certification authority identifier was expected to be a string value when provided, but a non-string value was received, which violates the structural requirements of the optional ads.txt fourth column.",
    ADS_TXT_CERT_AUTH_ID_INVALID:
        "The certification authority identifier was expected to be a strictly alphanumeric string assigned by a recognized certification authority, but the provided value did not meet this requirement, breaking the semantic integrity of the ads.txt entry.",
    ADS_TXT_LAST_UPDATED_TYPE: "The lastUpdated field must be provided as a string value representing a calendar date, but a non-string value was received, which violates the schema’s requirement for a textual ISO-8601 date representation.",
    ADS_TXT_LAST_UPDATED_FORMAT: "The lastUpdated field must conform to the ISO-8601 date-only format YYYY-MM-DD, but the provided value does not match this structure, breaking the schema’s contractual requirement for a valid and unambiguous update date.",

    ROBOTS_TXT_PATH_EXPECTED_STRING:
        "The robots.txt path value was expected to be a string representing a valid robots rule path, but a non-string value was received, which violates the schema contract requiring textual path definitions.",
    ROBOTS_TXT_PATH_INVALID_FORMAT:
        "The robots.txt path value was expected to start with a forward slash and contain no whitespace while optionally including wildcards or end anchors, but the provided value does not meet these structural requirements and therefore breaks the robots.txt path format contract.",

    ROBOTS_TXT_SITEMAP_URL_TYPE_INVALID:
        "The sitemap URL value was expected to be a string representing an absolute HTTPS URL, but a non-string value was received, which violates the schema’s structural requirement for a textual URL representation.",
    ROBOTS_TXT_SITEMAP_URL_FORMAT_INVALID:
        "The sitemap URL value was expected to be a fully qualified absolute HTTPS URL with no whitespace, but the provided value did not conform to this format, breaking the schema’s contractual and semantic requirements for valid sitemap discovery.",

    ROBOTS_TXT_HOST_NOT_STRING:
        "The host value must be a string representing a hostname, but a non-string value was received, which violates the schema contract requiring textual hostname data.",
    ROBOTS_TXT_HOST_INVALID_FORMAT:
        "The host value must be a valid hostname containing only allowed labels and a valid top-level domain, but the provided value did not conform to hostname structural requirements and therefore cannot be accepted.",

    ROBOTS_TXT_CRAWL_DELAY_EXPECTED_NUMBER: "The Crawl-delay value was expected to be a numeric value, but a non-numeric value was received, which violates the schema because crawl rate limits must be expressed as a number of seconds.",
    ROBOTS_TXT_CRAWL_DELAY_EXPECTED_INTEGER: "The Crawl-delay value was expected to be an integer representing whole seconds, but a non-integer value was received, which breaks the schema because fractional seconds are not permitted for crawl delay directives.",
    ROBOTS_TXT_CRAWL_DELAY_EXPECTED_NON_NEGATIVE: "The Crawl-delay value was expected to be zero or a positive integer, but a negative value was received, which violates the schema because crawl delays cannot represent negative time.",

    ROBOTS_TXT_ROBOTS_RULE_TYPE_NOT_STRING:
        "The robots rule directive type was expected to be a string value representing an Allow or Disallow directive, but a non-string value was received, which violates the contractual requirement for directive normalization.",
    ROBOTS_TXT_ROBOTS_RULE_TYPE_INVALID_VALUE:
        "The robots rule directive type was expected to be either Allow or Disallow in a case-insensitive form, but an unsupported value was received, which breaks the semantic constraints of the robots.txt specification.",
    ROBOTS_TXT_ROBOTS_RULE_PATH_NOT_STRING:
        "The robots rule path was expected to be a string representing a valid robots.txt path, but a non-string value was received, which violates the structural requirements of path matching.",
    ROBOTS_TXT_ROBOTS_RULE_PATH_INVALID_FORMAT:
        "The robots rule path was expected to start with a forward slash and contain no whitespace to conform to robots.txt path semantics, but an invalid path format was received, breaking the schema’s semantic contract.",

    ROBOTS_TXT_USER_AGENT_NOT_STRING:
        "The user-agent value must be provided as a string because the robots.txt specification requires a textual identifier and a non-string value cannot be interpreted or matched correctly.",
    ROBOTS_TXT_USER_AGENT_INVALID_TOKEN:
        "The user-agent value must be either a single asterisk wildcard or a valid non-empty user-agent token without control characters or comment markers, and the provided value violates this structural requirement.",
    ROBOTS_TXT_RULES_NOT_ARRAY:
        "Each robots rule directive must be provided as a string because directives are defined as textual keywords and any other type breaks the contractual schema.",
    ROBOTS_TXT_RULES_EMPTY:
        "The rules array must contain at least one robots.txt rule because an empty ruleset provides no allow or disallow directives and therefore violates the structural and semantic requirements of a valid user-agent block.",

    ROBOTS_TXT_SITEMAP_ARRAY_EXPECTED: "The sitemaps field was expected to be an array of absolute sitemap URLs, but a non-array value was received, violating the structural contract.",
    ROBOTS_TXT_SITEMAP_ARRAY_MIN_LENGTH: "When provided, the sitemaps array was expected to contain at least one sitemap URL, but it was empty, which breaks the sitemap declaration contract.",

    ROBOTS_TXT_USER_AGENT_BLOCK_ARRAY_EXPECTED: "The agents field was expected to be an array of user-agent blocks, but a non-array value was received, which breaks the structural requirement for defining crawler-specific rules.",
    ROBOTS_TXT_USER_AGENT_BLOCK_ARRAY_MIN_LENGTH: "At least one user-agent block was expected in the agents array, but none were provided, which makes the robots.txt document semantically invalid.",


    ROBOTS_TXT_ROOT_OBJECT_EXPECTED: "The robots.txt root document was expected to be a structured object representing a parsed robots.txt file, but a non-object value was received, which violates the required contractual structure for directive grouping.",

    RELATED_WEBSITE_SET_DOMAIN_NOT_STRING:
        "A registrable domain name was expected to be provided as a string value, but a non-string value was received, which violates the schema contract because domain validation rules can only be applied to textual input.",
    RELATED_WEBSITE_SET_DOMAIN_ARRAY_INVALID:
        "A list of registrable domain names was expected to be provided as an array of valid domain strings, but the received value did not conform to this requirement, violating the schema contract for defining related website set domains.",
    RELATED_WEBSITE_SET_DOMAIN_INVALID_FORMAT:
        "A valid registrable domain name without scheme, port, path, query, or fragment was expected, containing at least one dot and properly formed labels, but the provided value did not meet these structural requirements and therefore cannot represent a valid domain.",

    RELATED_WEBSITE_SET_INVALID: "The related website set was rejected because the primary domain was expected to be unique and excluded from all site lists, the associatedSites and serviceSites arrays were expected to contain no duplicate values, and both site lists were expected to be mutually exclusive, but the provided data violated one or more of these contractual and structural requirements.",

    MTA_STS_TXT_MX_EXPECTED_STRING:
        "The MTA-STS MX value was expected to be a string representing a fully qualified domain name or an allowed wildcard hostname, but a non-string value was received, which violates the schema’s contractual requirement for textual hostname representation.",
    MTA_STS_TXT_MX_INVALID_HOSTNAME:
        "The MTA-STS MX value was expected to be a valid fully qualified domain name or a wildcard domain with the wildcard only in the leftmost label and a valid alphabetic top-level domain, but the provided value does not conform to hostname structural rules, breaking the schema’s semantic and structural constraints.",

    MTA_STS_TXT_VERSION_INVALID: "The version field must contain the exact literal value 'STSv1', but a different value was provided, which violates the fixed protocol version requirement defined by the MTA-STS specification.",
    MTA_STS_TXT_MODE_INVALID: "The mode field must be one of the explicitly supported values 'enforce', 'testing', or 'none', but an unsupported value was received, breaking the policy enforcement contract.",
    MTA_STS_TXT_MX_ARRAY_TYPE: "The mx field must be provided as an array of MX objects, but a value of an incompatible type was supplied, violating the structural requirements of the policy.",
    MTA_STS_TXT_MX_ARRAY_MIN_LENGTH: "The mx field must contain at least one MX entry, but an empty array was received, which makes the policy semantically invalid.",
    MTA_STS_TXT_MX_PATTERN_TYPE: "Each MX pattern must be provided as a string value, but a non-string value was encountered, violating the MX matching rules defined by the MTA-STS specification.",
    MTA_STS_TXT_MX_PATTERN_MIN_LENGTH: "Each MX pattern string must contain at least one character, but an empty string was provided, which is not a valid MX match pattern.",
    MTA_STS_TXT_MAX_AGE_TYPE: "The maxAge field must be provided as a numeric value representing seconds, but a non-numeric value was received, violating the policy lifetime contract.",
    MTA_STS_TXT_MAX_AGE_INTEGER: "The maxAge field must be a whole integer number of seconds, but a non-integer numeric value was provided, violating caching duration semantics.",
    MTA_STS_TXT_MAX_AGE_MIN: "The maxAge field must be greater than or equal to zero seconds, but a negative value was received, which is not a valid policy lifetime.",

    APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_EXPECTED_STRING:
        "The Apple merchant ID domain association token was expected to be a string value, but a non-string value was provided, which violates the schema contract requiring an opaque ASCII-safe textual token issued by Apple.",
    APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKEN_INVALID_CHARSET:
        "The Apple merchant ID domain association token was expected to contain only ASCII-safe, non-whitespace characters commonly used in base64 or base64url-like encodings, but the provided value contained one or more invalid characters, breaking the structural and semantic constraints of the token format.",

    APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_INVALID_OBJECT: "The apple developer merchant ID domain association payload was expected to be a strict object containing only defined properties, but a non-object or an object with unknown properties was received, which violates the schema’s structural contract.",
    APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKENS_NOT_ARRAY: "The tokens property was expected to be an array of valid merchant ID domain association tokens, but a value of a different type was received, which breaks the schema’s structural requirements.",
    APPLE_MERCHANT_ID_DOMAIN_ASSOCIATION_TOKENS_MIN_LENGTH: "The tokens property was expected to contain at least one valid merchant ID domain association token, but an empty array was received, which violates the schema’s semantic requirement for meaningful content.",

    APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_EXPECTED_STRING:
        "The Apple ID domain association token was expected to be a string value, but a non-string value was provided, which violates the schema contract requiring an opaque ASCII-safe textual token issued by Apple.",
    APPLE_ID_DOMAIN_ASSOCIATION_TOKEN_INVALID_CHARSET:
        "The Apple ID domain association token was expected to contain only ASCII-safe, non-whitespace characters commonly used in base64 or base64url-like encodings, but the provided value contained one or more invalid characters, breaking the structural and semantic constraints of the token format.",

    APPLE_ID_DOMAIN_ASSOCIATION_INVALID_OBJECT: "The apple developer ID domain association payload was expected to be a strict object containing only defined properties, but a non-object or an object with unknown properties was received, which violates the schema’s structural contract.",
    APPLE_ID_DOMAIN_ASSOCIATION_TOKENS_NOT_ARRAY: "The tokens property was expected to be an array of valid ID domain association tokens, but a value of a different type was received, which breaks the schema’s structural requirements.",
    APPLE_ID_DOMAIN_ASSOCIATION_TOKENS_MIN_LENGTH: "The tokens property was expected to contain at least one valid ID domain association token, but an empty array was received, which violates the schema’s semantic requirement for meaningful content.",

    APPLE_APP_SITE_ASSOCATION_APPLE_APP_ID_NOT_STRING:
        "The Apple App ID value was expected to be a string but a non-string value was provided, which violates the schema requirement that the identifier be expressed as a textual value.",
    APPLE_APP_SITE_ASSOCATION_APPLE_APP_ID_INVALID_FORMAT:
        "The Apple App ID value was expected to follow the exact <TEAM_ID>.<BUNDLE_ID> format with a 10-character uppercase alphanumeric Team ID and a valid reverse-DNS iOS bundle identifier, but the provided value did not satisfy these structural and semantic constraints and therefore breaks the schema contract.",
    APPLE_APP_SITE_ASSOCATION_APPLE_PATH_NOT_STRING:
        "The Apple URL path value was expected to be a string representing an absolute path, but a non-string value was provided, which violates the schema’s contractual requirement for a textual path representation.",
    APPLE_APP_SITE_ASSOCATION_APPLE_PATH_INVALID_FORMAT:
        "The Apple URL path was expected to be an absolute path beginning with a single leading slash and containing no scheme, host, or whitespace, but the provided value did not satisfy these structural and semantic constraints, rendering it invalid for Apple API usage.",
    APPLE_APP_SITE_ASSOCATION_PATHS_NOT_ARRAY:
        "The paths field was expected to be an array of valid Apple app link path definitions, but a non-array value was received, which violates the structural contract required for deterministic path matching.",
    APPLE_APP_SITE_ASSOCATION_PATHS_MIN_LENGTH:
        "The paths field was expected to contain at least one Apple app link path entry, but an empty array was received, which violates the semantic requirement that an app must declare at least one eligible URL pattern.",
    APPLE_APP_SITE_ASSOCATION_APPLINKS_APPS_STRING_TYPE_INVALID:
        "The applinks.apps field was expected to be an array of strings, but a non-string value was received, which violates the Apple Universal Links specification requirement that all apps entries be string typed identifiers.",
    APPLE_APP_SITE_ASSOCATION_APPLINKS_APPS_LENGTH_INVALID:
        "The applinks.apps field was expected to be an empty array, but one or more entries were provided, which violates the Apple Universal Links contractual requirement that this array exist but contain no values.",
    APPLE_APP_SITE_ASSOCATION_APPLINKS_DETAILS_ARRAY_TYPE_INVALID:
        "The applinks.details field was expected to be an array of valid applinks detail objects, but a non-array or structurally invalid value was received, which breaks the required schema structure for Universal Links configuration.",
    APPLE_APP_SITE_ASSOCATION_APPLINKS_DETAILS_MIN_LENGTH_INVALID:
        "The applinks.details field was expected to contain at least one valid detail object, but an empty array was received, which violates the Apple Universal Links requirement that at least one app association be declared.",
    APPLE_APP_SITE_ASSOCATION_WEB_CREDENTIALS_APPS_MIN_LENGTH: "The apps field was expected to be a non-empty array containing at least one valid Apple App ID, but an empty array was provided, which violates the contractual requirement for Shared Web Credentials configuration.",
    APPLE_APP_SITE_ASSOCIATION_WEB_CREDENTIALS_APPS_INVALID:
        "A non-empty array of valid Apple application identifiers was expected for the web credentials configuration, but the provided value was not an array of valid app identifiers, violating the schema contract required for Apple App Site Association.",
    APPLE_APP_SITE_ASSOCATION_APPLE_APP_CLIPS_APPS_TYPE:
        "The Apple App Clips configuration requires the apps field to be an array of valid Apple application identifiers, but a non-array or structurally invalid value was provided, which violates the schema’s requirement for a list-based association contract.",
    APPLE_APP_SITE_ASSOCATION_APPLE_APP_CLIPS_APPS_MIN_LENGTH:
        "The Apple App Clips configuration requires the apps field to contain at least one associated Apple application identifier, but an empty array was provided, which breaks the contractual requirement that App Clips must be linked to at least one app.",
    APPLE_APP_SITE_ASSOCATION_AASA_ROOT_OBJECT_INVALID:
        "The apple-app-site-association value must be a JSON object without unknown properties, but a non-object or structurally invalid value was received, which violates Apple’s documented file format contract.",
    APPLE_APP_SITE_ASSOCATION_AASA_REQUIRED_SECTION_MISSING:
        "The apple-app-site-association object must define at least one of the applinks, webcredentials, or appclips sections, but none were provided, which breaks the minimum structural requirements mandated by Apple.",
    APPLE_APP_SITE_ASSOCATION_APPLINKS_APPS_ARRAY_TYPE_INVALID:
        "The applinks.apps field was expected to be an array of strings, but a non-array value was received, which breaks the structural contract of the Apple App Site Association applinks definition.",

    GPC_JSON_TIMESTAMP_TYPE:
        "The timestamp value must be a string, but a non-string value was provided, which violates the schema requirement for a textual ISO 8601 / RFC 3339 UTC timestamp representation.",
    GPC_JSON_TIMESTAMP_FORMAT:
        "The timestamp value must be a UTC ISO 8601 / RFC 3339 string in the exact format YYYY-MM-DDTHH:mm:ssZ with zero-padded components and no fractional seconds, but the provided value does not conform to this mandatory structural and semantic contract.",
    GPC_JSON_HONOR_INVALID:
        "The Global Privacy Control honor category value must be one of the explicitly permitted identifiers sale, sharing, or targeted_advertising, but an unsupported value was provided, which violates the schema’s contractual requirement for a regulated and enumerated data-processing classification.",
    GPC_JSON_APPLIES_TO_INVALID:
        "The Global Privacy Control appliesTo value must be exactly one of the permitted context identifiers 'web', 'mobile_web', or 'api', but a different or unsupported value was provided, which violates the schema’s contractual requirement for a strictly enumerated execution context.",
    GPC_JSON_SCOPE_INVALID: "The GPC scope value was expected to be exactly \"global\", but a different value was received, which violates the schema contract because only a single, universally applicable GPC scope is structurally and semantically supported.",
    GPC_JSON_FLAG_TRUE: "The Global Privacy Control flag was expected to be explicitly set to true, but a different value was provided, which violates the contractual requirement that a valid GPC declaration must always assert an active signal.",
    GPC_JSON_HONORS_ARRAY_INVALID: "The honors field was expected to be an array of valid Global Privacy Control honor categories, but the provided value does not conform to the required array structure, breaking the schema’s structural contract.",
    GPC_JSON_HONORS_MIN_LENGTH: "The honors field was expected to contain at least one valid honor category, but an empty array was provided, which violates the semantic requirement that at least one category must be honored.",
    GPC_JSON_APPLIES_TO_ARRAY_INVALID: "The appliesTo field was expected to be an array of valid application contexts, but the provided value does not match the required array structure, breaking the schema’s structural contract.",
    GPC_JSON_APPLIES_TO_MIN_LENGTH: "The appliesTo field was expected to contain at least one valid application context, but an empty array was provided, which violates the semantic requirement that the GPC signal must apply to at least one context.",

    ASSET_LINKS_JSON_ANDROID_SHA256_FINGERPRINT_TYPE:
        "An Android SHA-256 certificate fingerprint was expected to be provided as a string value, but a non-string value was received, which violates the schema contract requiring a textual hexadecimal representation.",
    ASSET_LINKS_JSON_ANDROID_SHA256_FINGERPRINT_FORMAT:
        "An Android SHA-256 certificate fingerprint was expected to consist of exactly 32 colon-separated hexadecimal byte pairs, but the provided value did not conform to this structure, breaking the required cryptographic and structural constraints.",
    ASSET_LINKS_JSON_NAMESPACE_INVALID:
        "The namespace value was expected to be the fixed literal 'android_app', but a different value was provided, which violates the Asset Links contract requiring an explicit Android application target namespace.",
    ASSET_LINKS_JSON_PACKAGE_NAME_TYPE_INVALID:
        "The package_name field was expected to be a string representing an Android applicationId, but a non-string value was provided, breaking the schema’s type requirements.",
    ASSET_LINKS_JSON_PACKAGE_NAME_FORMAT_INVALID:
        "The package_name value was expected to be a valid Android applicationId using lowercase letters, digits, underscores, and dot-separated segments starting with a letter, but the provided value does not conform to this format, violating Android package naming rules.",
    ASSET_LINKS_JSON_CERT_FINGERPRINTS_TYPE_INVALID:
        "The sha256_cert_fingerprints field was expected to be an array of SHA-256 certificate fingerprint values, but a non-array value was provided, violating the structural requirements of the Asset Links schema.",
    ASSET_LINKS_JSON_CERT_FINGERPRINTS_MIN_LENGTH_INVALID:
        "The sha256_cert_fingerprints array was expected to contain at least one SHA-256 certificate fingerprint, but an empty array was provided, which violates the requirement that at least one signing certificate be declared for verification.",
    ASSET_LINKS_JSON_RELATION_NOT_ARRAY:
        "The relation field must be provided as an array of Android Asset Links permission identifiers, but a non-array value was received, which violates the required list-based structure of the Asset Links contract.",
    ASSET_LINKS_JSON_RELATION_INVALID_VALUE:
        "Each relation entry must be a valid Android Asset Links permission string recognized by the platform, but an unsupported or malformed value was received, which breaks the semantic requirements of Android App Link verification.",
    ASSET_LINKS_JSON_RELATION_EMPTY:
        "The relation array must contain at least one valid permission identifier, but an empty array was provided, which fails to establish any authorized relationship and violates the schema’s minimum cardinality requirement.",
    ASSET_LINKS_JSON_ARRAY: "The asset links value was expected to be a JSON array of valid asset link statements, but a non-array value was provided, which violates the required top-level structural contract for Android Digital Asset Links.",
    ASSET_LINKS_JSON_MIN_LENGTH: "The asset links array was expected to contain at least one asset link statement, but an empty array was received, which breaks the minimum cardinality requirement defined by the Android Digital Asset Links specification.",

    SECURITY_TXT_MAILTO_TYPE_INVALID:
        "The provided value was expected to be a string representing a valid mailto URI, but a non-string value was received, which violates the schema’s requirement for a textual RFC 6068 mailto representation.",
    SECURITY_TXT_MAILTO_FORMAT_INVALID:
        "The provided string was expected to be a mailto URI in the form 'mailto:user@example.com' containing exactly one valid email address with no whitespace or query parameters, but the received value does not conform to the required structural and semantic constraints defined by the schema.",
    SECURITY_TXT_CONTACT_EXPECTED_STRING: "The security contact value was expected to be a string but a non-string value was provided, which violates the schema’s contractual requirement for a textual contact reference.",
    SECURITY_TXT_CONTACT_INVALID_FORMAT: "The security contact value was expected to be either a valid mailto URI containing a syntactically valid email address or a valid HTTPS URL without whitespace, but the provided value did not conform to these strict structural requirements.",
    SECURITY_TXT_LANGUAGE_TAG_NOT_STRING: "The language tag value must be provided as a string, but a non-string value was received, which violates the schema requirement that language tags be represented as textual identifiers.",
    SECURITY_TXT_LANGUAGE_TAG_INVALID_FORMAT: "The language tag value must conform to the RFC 5646 syntax for well-formed language tags, but the provided value does not match the required structural pattern and therefore cannot be interpreted as a valid language identifier.",
    SECURITY_TXT_TIMESTAMP_NOT_STRING:
        "The timestamp value was expected to be a string representing an RFC 3339 UTC timestamp, but a non-string value was received, which violates the schema’s structural requirement for textual date-time encoding.",
    SECURITY_TXT_TIMESTAMP_INVALID_RFC3339_UTC:
        "The timestamp value was expected to conform to the RFC 3339 UTC format using a Z suffix with optional fractional seconds, but the received value does not match this format, breaking the schema’s contractual requirement for a valid UTC-based timestamp.",
    SECURITY_TXT_CANONICAL_URL: "The security.txt URL must be a valid HTTPS URL that resolves exactly to /.well-known/security.txt without any query string or fragment, but a value was provided that does not meet this exact canonical path and protocol requirement, which breaks the contractual and semantic guarantees of the security.txt discovery mechanism.",
    SECURITY_TXT_CONTACT_MIN_LENGTH:
        "The security.txt schema requires at least one Contact entry, but the provided value contained zero entries, which violates the mandatory reporting channel requirement defined by the contract.",
    SECURITY_TXT_PREFERRED_LANGUAGES_MIN_LENGTH:
        "The security.txt schema requires at least one Preferred-Languages entry, but the provided value contained zero entries, which breaks the required communication language declaration defined by the schema.",
    SECURITY_TXT_EXPIRES_FUTURE_UTC:
        "The Expires field was expected to be a valid RFC 3339 UTC timestamp set strictly in the future, but the provided value was either not a valid timestamp or represented a time that has already passed, violating the temporal validity requirements of the schema.",

    HEALTH_JSON_CHECK_STATE_INVALID:
        "The health check state value must be one of the explicitly allowed operational status identifiers (pass, warn, fail, maintenance, or unknown), but a different or invalid value was provided, which violates the schema’s contractual requirement for standardized and semantically meaningful service health reporting.",
    HEALTH_JSON_CHECKS_OBJECT_INVALID:
        "The health checks object was expected to be a strict object containing exactly the required service health state properties (self, app, marketing, api, analytics, and assets), but the received value was missing one or more required keys, included unknown keys, or did not conform to the required structure, which violates the contractual requirement for explicit and complete system health reporting.",
    HEALTH_JSON_OBJECT:
        "The health JSON payload was expected to be a strictly validated object containing all required health check fields with no additional properties, but the received value either was not an object or violated the required structural contract, which breaks the stability and machine-readability guarantees of the health schema.",

    STATUS_JSON_TIMESTAMP_STRING_TYPE:
        "The value provided for the timestamp field must be a string, but a non-string value was received, which violates the schema’s contractual requirement for a textual RFC 3339 UTC timestamp representation.",
    STATUS_JSON_TIMESTAMP_RFC_3339_UTC_FORMAT:
        "The value provided for the timestamp field must be a valid RFC 3339 / ISO 8601 UTC timestamp in the exact format YYYY-MM-DDTHH:mm:ssZ without fractional seconds or time zone offsets, but the received value does not conform to this structure and therefore breaks the schema’s structural and semantic requirements.",
    STATUS_JSON_LOCALE_NOT_STRING:
        "The locale value was expected to be a valid string representing a language or language-region identifier, but a non-string value was provided, which violates the schema contract requiring textual locale identifiers for correct parsing and validation.",
    STATUS_JSON_LOCALE_INVALID_FORMAT:
        "The locale value was expected to conform to a valid BCP 47–style locale tag format consisting of a 2–3 letter language code optionally followed by hyphen-separated alphanumeric subtags, but the provided value did not match this structure, breaking the schema’s structural and semantic requirements for locale normalization.",
    STATUS_JSON_LOCALIZED_TEXT_RECORD_INVALID:
        'The localized text value was expected to be a record keyed by valid locale identifiers, but a value with an incompatible structure or invalid keys was received, which violates the schema contract by breaking the required locale-indexed mapping.',
    STATUS_JSON_LOCALIZED_TEXT_VALUE_INVALID:
        'Each localized text entry was expected to be a string value associated with a valid locale key, but a non-string or incompatible value was received, which violates the schema contract by breaking the required textual content semantics.',
    STATUS_JSON_INCIDENT_UPDATE_SCHEMA_INVALID: "The incident update object was expected to strictly conform to the incident update schema with a valid timestamp, a valid incident status, and a properly structured localized message, but the received value failed to meet one or more of these contractual, structural, or semantic requirements, making it invalid for safe processing.",
    STATUS_JSON_INCIDENT_ID_INVALID_TYPE:
        'The incident identifier must be provided as a string value, but a non-string value was received, which violates the schema contract requiring a textual UUID representation.',
    STATUS_JSON_INCIDENT_ID_INVALID_UUID:
        "The incident identifier was expected to be a valid UUID string, but a value that does not conform to the UUID format was received, which violates the schema’s requirement for globally unique and contractually valid incident identification.",
    STATUS_JSON_INCIDENT_COMPONENTS_MIN_LENGTH:
        "The incident was expected to reference at least one affected component, but an empty component list was received, which violates the schema’s structural requirement to explicitly declare impacted system components.",
    STATUS_JSON_INCIDENT_STRICT_OBJECT_VIOLATION:
        "The incident object was expected to strictly conform to the defined incident schema without additional or unknown properties, but extraneous or invalid fields were received, which violates the schema’s contractual and structural integrity guarantees.",
    STATUS_JSON_MAINTENANCE_ID_REQUIRED:
        "The maintenance identifier must be provided as a non-empty string value, but the received value was missing or invalid, which violates the schema requirement for uniquely identifying a maintenance record.",
    STATUS_JSON_MAINTENANCE_COMPONENTS_MIN_LENGTH:
        "The maintenance components field must contain at least one valid component identifier, but an empty array was received, which violates the schema requirement that a maintenance event must impact one or more components.",
    STATUS_JSON_UPTIME_PERCENTAGE_TYPE:
        'The uptime percentage value must be a numeric value, but a non-numeric value was provided, which violates the schema requirement that uptime percentages be represented as numbers.',
    STATUS_JSON_UPTIME_PERCENTAGE_MIN:
        'The uptime percentage value must be greater than or equal to the minimum allowed value of 0, but a smaller value was provided, which violates the schema’s defined lower boundary.',
    STATUS_JSON_UPTIME_PERCENTAGE_MAX:
        'The uptime percentage value must be less than or equal to the maximum allowed value of 100, but a larger value was provided, which violates the schema’s defined upper boundary.',

    BROWSER_CONFIG_XML_TILE_COLOR_TYPE: "The tile color value must be provided as a string, but a non-string value was received, which violates the schema contract requiring textual hexadecimal color representation.",
    BROWSER_CONFIG_XML_TILE_COLOR_FORMAT: "The tile color value must be a valid hexadecimal RGB color in the format #RRGGBB, but the provided value does not conform to this structure, breaking the schema’s semantic color format requirements.",

    BROWSER_CONFIG_XML_POLLING_FREQUENCY_NOT_NUMBER: "The polling frequency value must be a numeric value expressed in minutes, but a non-numeric value was provided, which violates the schema requirement for a valid polling interval representation.",
    BROWSER_CONFIG_XML_POLLING_FREQUENCY_NOT_ALLOWED: "The polling frequency value must exactly match one of the explicitly approved minute intervals, but an unsupported value was provided, which violates the schema’s contractual constraints on allowed polling frequencies.",
    BROWSER_CONFIG_XML_TILE_LOGOS_INVALID_OBJECT:
        "The tile logos configuration was expected to be a strictly defined object containing all required HTTPS logo URLs and a valid tile color value, but the provided value did not conform to the required object structure, violating the schema’s contractual requirements.",

    APPLE_APP_LINKS_DETAIL_STRICT_OBJECT_INVALID:
        "The Apple App Links detail object must contain only the explicitly defined properties appID and paths, but one or more unexpected properties were received, which violates the schema’s closed-object contract and breaks its structural and contractual requirements.",
    APPLE_APP_LINKS_STRICT_OBJECT_INVALID: "The Apple App Links object must contain only the explicitly defined properties 'apps' and 'details', but one or more unexpected properties were received, which violates the schema’s closed-object contract and breaks the structural guarantees required for Apple App Links configuration.",
    APPLE_WEB_CREDENTIALS_STRICT_OBJECT_INVALID:
        "The AppleWebCredentials object must contain only the explicitly defined properties required by the schema, but one or more unexpected properties were received, which violates the schema’s closed and strictly enforced structural contract.",
    APPLE_APP_SITE_ASSOCIATION_APPLE_APP_CLIPS_STRICT_OBJECT:
        "The Apple App Clips object must contain only the explicitly defined properties and no additional keys, but one or more unexpected properties were provided, which violates the schema’s strict structural contract and prevents reliable validation and downstream processing.",
    GPC_JSON_STRICT_OBJECT: "The GPC configuration object must contain only the explicitly defined properties and no additional keys, but one or more unexpected properties were received, which violates the schema’s closed-object contractual requirements and makes the payload invalid.",
    MTA_STS_MX_STRICT_OBJECT_INVALID: "The MTA-STS MX object must contain only the explicitly defined properties and no additional keys, but one or more unexpected properties were received, violating the schema’s closed and contractually strict object shape.",
    MTA_STS_STRICT_OBJECT_INVALID:
        "The MTA-STS policy object must contain exactly the properties version, mode, mx, and maxAge, but one or more unexpected or missing properties were received, which violates the schema’s closed-object contract and breaks the structural guarantees required for correct MTA-STS policy interpretation.",
    RELATED_WEBSITE_SET_STRICT_OBJECT_CONTRACT_VIOLATION: "The provided object must contain exactly and only the explicitly defined properties $schema, primary, associatedSites, and serviceSites, but one or more unexpected or missing properties were detected, which violates the schema’s closed-object contractual requirements and renders the structure invalid.",
    SECURITY_TXT_STRICT_OBJECT_INVALID: "The security.txt object must contain only the explicitly defined properties contact, canonical, preferredLanguages, policy, encryption, acknowledgments, hiring, and expires, but one or more unexpected properties were received, violating the schema’s closed-object contract and rendering the configuration invalid.",
    ADS_TXT_ENTRY_STRICT_OBJECT_INVALID: "The ads.txt entry must be an object containing only the explicitly defined properties adSystemDomain, publisherId, relationship, and certificationAuthorityId, but one or more unexpected properties were received, which violates the schema’s closed and strictly enforced structural contract.",
    ADS_TXT_STRICT_OBJECT_INVALID: "The ads.txt object must contain exactly the properties header, entries, and lastUpdated with no additional or unknown fields, but one or more unexpected properties were received, which violates the schema’s closed-object contractual requirements and breaks structural integrity guarantees.",
    ASSET_LINKS_TARGET_STRICT_OBJECT_INVALID:
        "The AssetLinks target object must contain only the explicitly defined properties namespace, package_name, and sha256_cert_fingerprints, but one or more unexpected properties were received, which violates the schema’s strict closed-object contract and makes the structure invalid.",
    ASSET_LINKS_ENTRY_STRICT_OBJECT_INVALID:
        "The asset links entry must be an object containing only the explicitly defined properties 'relation' and 'target', but one or more unexpected or missing properties were received, which violates the schema’s strict structural contract and prevents reliable interpretation of the asset links declaration.",
    BROWSER_CONFIG_STRICT_OBJECT_BADGE_POLLING_INVALID: "The badge polling object must contain only the properties 'uri' and 'frequency' with no additional keys, but one or more unexpected properties were received, which violates the schema’s strict closed-object contract.",
    BROWSER_CONFIG_BADGE_STRICT_OBJECT_INVALID: "The badge object must contain only the explicitly defined properties and no additional keys, but one or more unexpected properties were received, violating the schema’s closed object contract.",
    BROWSER_CONFIG_NOTIFICATION_POLLING_STRICT_OBJECT_INVALID:
        "The notification polling object must contain only the properties 'uri' and 'frequency', but one or more unexpected or missing properties were provided, which violates the schema’s strict object contract and breaks the guaranteed structure required for notification polling configuration.",
    BROWSER_CONFIG_NOTIFICATION_CYCLE_STRICT_OBJECT_INVALID:
        "The notification cycle configuration must be an object containing only the properties 'uri' and 'frequency', but one or more unexpected properties were provided, which violates the schema’s closed and strictly defined structural contract.",
    BROWSER_CONFIG_NOTIFICATION_STRICT_OBJECT_INVALID: "The notification object must contain only the explicitly defined properties 'polling' and 'cycle', but one or more unexpected properties were received, which violates the schema’s closed-object contract and makes the notification configuration invalid.",
    BROWSER_CONFIG_MSAPPLICATION_STRICT_OBJECT_INVALID:
        "The msapplication object must contain only the explicitly defined properties tile, badge, and notification, but additional or unexpected properties were received, which violates the schema’s closed-object contract and prevents reliable structural validation.",
    BROWSER_CONFIG_STRICT_OBJECT_INVALID:
        "The browser configuration object must contain only the explicitly defined properties and no additional keys, but one or more unexpected properties were received, which violates the schema’s closed-object contractual requirements and prevents reliable, deterministic parsing.",
    ROBOTS_TXT_ROBOTS_USER_AGENT_BLOCK_STRICT_OBJECT_INVALID: "The robots.txt user-agent block must be an object containing only the properties userAgent, rules, and crawlDelay, but one or more unexpected or missing properties were received, which violates the schema’s strict closed-object contract and makes the block structurally invalid.",
    ROBOTS_TXT_ROBOTS_RULE_STRICT_OBJECT_INVALID:
        "The robots.txt rule must be a strictly defined object containing only the properties 'type' and 'path', but additional or unexpected properties were received, which violates the schema’s closed-object contract and prevents reliable interpretation of the rule.",

    STATUS_JSON_MAINTENANCE_UPDATE_STRICT_OBJECT_INVALID:
        "The maintenance update object must contain only the explicitly defined properties timestamp, status, and message, but one or more unexpected properties were received, which violates the schema’s closed-object contract and prevents reliable validation and processing.",
    STATUS_JSON_MAINTENANCE_UPDATES_INVALID:
        "A list of maintenance update entries was expected to be provided as an array of valid maintenance update objects, but the received value did not conform to this requirement, violating the schema contract for status maintenance updates.",
    STATUS_JSON_MAINTENANCE_STRICT_OBJECT: "The maintenance object must contain only the explicitly defined properties id, status, impact, components, scheduledStart, scheduledEnd, startedAt, completedAt, description, and updates, but one or more unexpected properties were received, which violates the schema’s strict closed-object contract and prevents reliable validation and processing.",
    STATUS_JSON_COMPONENTS_STRICT_OBJECT_INVALID:
        "The status JSON components object must contain exactly the predefined component keys and no additional properties, but one or more unexpected or missing fields were provided, which violates the schema’s closed-object contract and breaks the structural guarantees required for reliable status reporting.",
    STATUS_JSON_UPTIME_STRICT_OBJECT_INVALID:
        "The uptime status object must contain only the properties last24h, last7d, and last30d with valid uptime percentage values, but additional or unexpected properties were received, which violates the schema’s strict closed-object contract and makes the structure invalid for reliable status interpretation.",
    ADS_TXT_HEADER_STRICT_OBJECT_INVALID:
        "The ads.txt header object must contain only the explicitly defined properties and no additional fields were permitted, but unexpected properties were received, which violates the schema’s closed-object contract and guarantees about structural integrity.",
    ADS_TXT_STRICT_OBJECT_VIOLATION: "The object contained one or more properties that are not defined in the schema, which violates the strict object contract requiring only explicitly declared keys and disallowing any additional properties.",

    STATUS_JSON_SYSTEM_STATUS_STRICT_OBJECT_INVALID:
        "The system status object must contain only the explicitly defined properties and no additional fields were permitted, but one or more unexpected properties were received, which violates the strict object contract required for deterministic system status validation.",
    STATUS_JSON_COMPONENT_STATUS_INVALID: "The component status value must be one of the explicitly allowed operational states (operational, degraded, partial_outage, or major_outage), but a value outside this closed enumeration was received, which violates the schema’s requirement for a strictly controlled and contractually stable status indicator.",
    STATUS_JSON_COMPONENT_ID_STRICT_OBJECT_VIOLATION:
        "The Status JSON component identifier object must contain only the explicitly defined properties required by the schema, but one or more unexpected properties were provided, which violates the strict object contract and breaks the structural guarantees relied upon by downstream consumers.",
    STATUS_JSON_INCIDENT_STATUS_INVALID_VALUE:
        "The incident status value is invalid because it was expected to be one of the allowed enumerated values (investigating, identified, monitoring, or resolved), but a different value was received, violating the schema’s constrained state contract.",
    STATUS_JSON_IMPACT_INVALID:
        "The status impact value must be one of the explicitly allowed literals 'none', 'partial', or 'major', but a different value was received, which violates the schema’s closed enumeration contract and breaks downstream semantic guarantees.",
    STATUS_JSON_MAINTENANCE_STATUS_INVALID:
        "The maintenance status must be one of the explicitly supported lifecycle values defined by the schema, but an unsupported or unknown value was received, which violates the contractually enforced state model for maintenance status representation.",
    STATUS_JSON_STATUS_STRICT_OBJECT_INVALID:
        "The status JSON root object must contain only the explicitly defined Status JSON fields, but one or more unexpected or undeclared properties were received, which violates the schema’s strict closed-object contract and breaks structural compatibility with the Status JSON specification.",
    STATUS_JSON_INCIDENT_UPDATES_INVALID_TYPE:
        "The updates field was expected to be an array of incident update objects, but a value of a different structure or type was received, violating the schema’s structural contract.",
    STATUS_JSON_INCIDENTS_ARRAY_INVALID: "The incidents field was expected to be an array of valid incident objects, but a value of an incorrect type or structure was received, violating the schema’s requirement for normalized incident entries.",
    STATUS_JSON_MAINTENANCE_ARRAY_INVALID: "The maintenance field was expected to be an array of valid maintenance objects, but a value of an incorrect type or structure was received, violating the schema’s requirement for normalized maintenance entries.",

    STATIC_ASSET_ROUTE_CONFIG_INVALID:
        "The static asset route configuration object does not match the required schema, which violates the contract for defining valid static asset routing behavior.",

    STATIC_ASSET_PAYLOAD_INVALID:
        "The static asset payload object does not match the required schema, which violates the contract for delivering a valid static asset response.",

    RESPOND_INPUT_PARAMETERS_INVALID:
        "The respond input parameters object does not match the required schema, which violates the contract for constructing a valid static asset response.",

    STATIC_ASSET_CACHING_INVALID:
        "The static asset caching configuration object does not match the required schema, which violates the contract that enforces correct cache time-to-live values for each allowed static asset path."
} as const;

export const STATIC_ASSET_RESPONSE_TYPE = Object.freeze({
    TEXT: "text",
    JSON: "json",
    XML: "xml",
    WEB_MANIFEST: "manifest"
} as const);

export type StaticAssetResponseType =
    typeof STATIC_ASSET_RESPONSE_TYPE[keyof typeof STATIC_ASSET_RESPONSE_TYPE];

export const staticAssetRouteConfig = strictObject({
    "/.well-known/apple-app-site-association": AppleAppSiteAssociationSchema,
    "/.well-known/apple-developer-domain-association": AppleDeveloperIdDomainAssociationSchema,
    "/.well-known/apple-developer-merchantid-domain-association": AppleDeveloperMerchantIdDomainAssociationSchema,
    "/.well-known/change-password": ChangePasswordUrlSchema,
    "/.well-known/gpc.json": GPCSchema,
    "/.well-known/mta-sts.txt": MtaStsSchema,
    "/.well-known/pgp-key.txt": PgpKeySchema,
    "/.well-known/related-website-set.json": RelatedWebsiteSetSchema,
    "/.well-known/security.txt": SecurityTxtSchema,
    "/ads.txt": AdsTxtSchema,
    "/app-ads.txt": AdsTxtSchema,
    "/assetlinks.json": AssetLinksSchema,
    "/browserconfig.xml": BrowserConfigSchema,
    "/manifest.webmanifest": ManifestJsonSchema,
    "/robots.txt": RobotsTxtSchema,
}, ERROR_MESSAGE_KEYS.STATIC_ASSET_ROUTE_CONFIG_INVALID)

export type StaticAssetRouteConfig = InferOutput<typeof staticAssetRouteConfig>

export const staticAssetCachingSchema = strictObject({
    "/.well-known/apple-app-site-association": literal(CACHE_TTL_VALUES.FIVE_MINUTES),  // TODO: Error Message
    "/.well-known/apple-developer-domain-association": literal(CACHE_TTL_VALUES.ONE_HOUR),
    "/.well-known/apple-developer-merchantid-domain-association": literal(CACHE_TTL_VALUES.ONE_HOUR),
    "/.well-known/change-password": literal(CACHE_TTL_VALUES.ONE_DAY),
    "/.well-known/gpc.json": literal(CACHE_TTL_VALUES.FIVE_MINUTES),
    "/.well-known/mta-sts.txt": literal(CACHE_TTL_VALUES.ONE_DAY),
    "/.well-known/pgp-key.txt": literal(CACHE_TTL_VALUES.ONE_WEEK),
    "/.well-known/related-website-set.json": literal(CACHE_TTL_VALUES.ONE_DAY),
    "/.well-known/security.txt": literal(CACHE_TTL_VALUES.ONE_DAY),
    "/ads.txt": literal(CACHE_TTL_VALUES.FIVE_MINUTES),
    "/app-ads.txt": literal(CACHE_TTL_VALUES.FIVE_MINUTES),
    "/assetlinks.json": literal(CACHE_TTL_VALUES.ONE_HOUR),
    "/browserconfig.xml": literal(CACHE_TTL_VALUES.ONE_WEEK),
    "/manifest.webmanifest": literal(CACHE_TTL_VALUES.ONE_DAY),
    "/robots.txt": literal(CACHE_TTL_VALUES.ONE_DAY)
}, ERROR_MESSAGE_KEYS.STATIC_ASSET_CACHING_INVALID)

export type StaticAssetCaching = InferOutput<typeof staticAssetCachingSchema>

export const staticAssetPayloadSchema = strictObject({
    cacheTtl: cacheTtlSecondsSchema,
    content: UnicodeStringSchema,
    route: pathnameSchema
}, ERROR_MESSAGE_KEYS.STATIC_ASSET_PAYLOAD_INVALID)

export type StaticAssetPayload = InferOutput<typeof staticAssetPayloadSchema>

export const respondInputParametersSchema = strictObject({
    cacheTtl: cacheTtlSecondsSchema,
    content: unknown(),
    route: pathnameSchema,
    ctx: strictObject({
        request: instance(Request),
        spanTimer: strictObject({
            markStart: any(),
            markEnd: any()
        }) // TODO: Fix
    })
}, ERROR_MESSAGE_KEYS.RESPOND_INPUT_PARAMETERS_INVALID);

export type RespondInputParameters = InferOutput<typeof respondInputParametersSchema>;

export const staticAssetSerializeInputParametersSchema = strictObject({
    cacheTtl: cacheTtlSecondsSchema,
    content: unknown(),
    type: picklist(Object.values(STATIC_ASSET_RESPONSE_TYPE)), // TODO: error message
    ctx: strictObject({
        request: instance(Request),
        spanTimer: strictObject({
            markStart: any(),
            markEnd: any()
        }) // TODO: Fix
    })
}, ERROR_MESSAGE_KEYS.RESPOND_INPUT_PARAMETERS_INVALID);


export type StaticAssetSerializeInputParameters = InferOutput<typeof staticAssetSerializeInputParametersSchema>;
