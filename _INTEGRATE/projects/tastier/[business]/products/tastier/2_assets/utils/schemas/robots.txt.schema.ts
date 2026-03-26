import {
    array,
    type InferOutput,
    integer,
    minLength,
    minValue,
    number,
    parse,
    pipe,
    regex,
    strictObject,
    string,
    transform,
} from "valibot";

import { NonNegativeIntegerSchema, RegExpSchema, type TextFileOutput, type UnicodeString, type NonNegativeInteger } from "../../../0_config/src/utils/schemas/common.schema";

import { CONTROL_CHARACTERS, EMPTY_STRING } from "../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "./common.schema";

export const ROBOTS_TXT_PATH_REGEX: RegExp = /^\/[^\s]*$/;
parse(RegExpSchema, ROBOTS_TXT_PATH_REGEX)

export const RobotsTxtPathSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ROBOTS_TXT_PATH_EXPECTED_STRING),
    regex(
        ROBOTS_TXT_PATH_REGEX,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_PATH_INVALID_FORMAT
    )
);

export type RobotsTxtPath = InferOutput<typeof RobotsTxtPathSchema>;

export const ROBOTS_TXT_SITEMAP_URL_REGEX: RegExp = /^https:\/\/\S+$/;
parse(RegExpSchema, ROBOTS_TXT_SITEMAP_URL_REGEX)

export const RobotsTxtSitemapUrlSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ROBOTS_TXT_SITEMAP_URL_TYPE_INVALID),
    regex(
        ROBOTS_TXT_SITEMAP_URL_REGEX,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_SITEMAP_URL_FORMAT_INVALID
    )
);

export type RobotsTxtSitemapUrl = InferOutput<typeof RobotsTxtSitemapUrlSchema>;

export const ROBOTS_TXT_HOSTNAME_REGEX: RegExp = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
parse(RegExpSchema, ROBOTS_TXT_HOSTNAME_REGEX)

export const RobotsTxtHostSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ROBOTS_TXT_HOST_NOT_STRING),
    regex(ROBOTS_TXT_HOSTNAME_REGEX, ERROR_MESSAGE_KEYS.ROBOTS_TXT_HOST_INVALID_FORMAT),
);

export type RobotsTxtHost = InferOutput<typeof RobotsTxtHostSchema>;

export const ROBOTS_TXT_MIN_CRAWL_DELAY: NonNegativeInteger = 0;
parse(NonNegativeIntegerSchema, ROBOTS_TXT_MIN_CRAWL_DELAY)

export const RobotsTxtCrawlDelaySchema = pipe(
    number(ERROR_MESSAGE_KEYS.ROBOTS_TXT_CRAWL_DELAY_EXPECTED_NUMBER),
    integer(ERROR_MESSAGE_KEYS.ROBOTS_TXT_CRAWL_DELAY_EXPECTED_INTEGER),
    minValue(ROBOTS_TXT_MIN_CRAWL_DELAY, ERROR_MESSAGE_KEYS.ROBOTS_TXT_CRAWL_DELAY_EXPECTED_NON_NEGATIVE)
);

export type RobotsTxtCrawlDelay = InferOutput<typeof RobotsTxtCrawlDelaySchema>;

export const ROBOTS_TXT_ROBOTS_RULE_TYPE_REGEX: RegExp = /^(allow|disallow)$/i
parse(RegExpSchema, ROBOTS_TXT_ROBOTS_RULE_TYPE_REGEX)

export const RobotsTxtRobotsRuleTypeSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROBOTS_RULE_TYPE_NOT_STRING),
    regex(
        ROBOTS_TXT_ROBOTS_RULE_TYPE_REGEX,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROBOTS_RULE_TYPE_INVALID_VALUE
    ),
    transform((value: UnicodeString): UnicodeString => {
        return value.toLowerCase();
    })
);

export const ROBOTS_TXT_RULE_PATH_REGEX: RegExp = /^\/[^\s]*$/
parse(RegExpSchema, ROBOTS_TXT_RULE_PATH_REGEX)

export const RobotsTxtRobotsRulePathSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROBOTS_RULE_PATH_NOT_STRING),
    regex(
        ROBOTS_TXT_RULE_PATH_REGEX,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROBOTS_RULE_PATH_INVALID_FORMAT
    )
);

export const RobotsTxtRobotsRuleSchema = strictObject({
    type: RobotsTxtRobotsRuleTypeSchema,
    path: RobotsTxtRobotsRulePathSchema,
}, ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROBOTS_RULE_STRICT_OBJECT_INVALID);

export type RobotsRule = InferOutput<typeof RobotsTxtRobotsRuleSchema>;

export const ROBOTS_TXT_USER_AGENT_REGEX: RegExp = /^(?:\*|[^\x00-\x1F#]+)$/;
parse(RegExpSchema, ROBOTS_TXT_USER_AGENT_REGEX)

export const ROBOTS_TXT_MIN_RULE_COUNT: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, ROBOTS_TXT_MIN_RULE_COUNT)

export const RobotsTxtRobotsUserAgentTokenSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ROBOTS_TXT_USER_AGENT_NOT_STRING),
    regex(ROBOTS_TXT_USER_AGENT_REGEX, ERROR_MESSAGE_KEYS.ROBOTS_TXT_USER_AGENT_INVALID_TOKEN)
);

export const RobotsTxtRobotsRulesArraySchema = pipe(
    array(RobotsTxtRobotsRuleSchema, ERROR_MESSAGE_KEYS.ROBOTS_TXT_RULES_NOT_ARRAY),
    minLength(ROBOTS_TXT_MIN_RULE_COUNT, ERROR_MESSAGE_KEYS.ROBOTS_TXT_RULES_EMPTY)
);

export const RobotsTxtRobotsUserAgentBlockSchema = strictObject({
    userAgent: RobotsTxtRobotsUserAgentTokenSchema,
    rules: RobotsTxtRobotsRulesArraySchema,
    crawlDelay: RobotsTxtCrawlDelaySchema,
}, ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROBOTS_USER_AGENT_BLOCK_STRICT_OBJECT_INVALID);

export type RobotsTxtRobotsUserAgentToken = InferOutput<typeof RobotsTxtRobotsUserAgentTokenSchema>;
export type RobotsTxtRobotsRule = InferOutput<typeof RobotsTxtRobotsRuleSchema>;
export type RobotsTxtRobotsRulesArray = InferOutput<typeof RobotsTxtRobotsRulesArraySchema>;
export type RobotsTxtRobotsUserAgentBlock = InferOutput<typeof RobotsTxtRobotsUserAgentBlockSchema>;

export const ROBOTS_TXT_MIN_USER_AGENTS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, ROBOTS_TXT_MIN_USER_AGENTS)

export const ROBOTS_TXT_MIN_SITEMAPS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, ROBOTS_TXT_MIN_SITEMAPS)

export const RobotsTxtUserAgentBlocksSchema = pipe(
    array(
        RobotsTxtRobotsUserAgentBlockSchema,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_USER_AGENT_BLOCK_ARRAY_EXPECTED
    ),
    minLength(
        ROBOTS_TXT_MIN_USER_AGENTS,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_USER_AGENT_BLOCK_ARRAY_MIN_LENGTH
    )
);

export const RobotsTxtSitemapsSchema = pipe(
    array(
        RobotsTxtSitemapUrlSchema,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_SITEMAP_ARRAY_EXPECTED
    ),
    minLength(
        ROBOTS_TXT_MIN_SITEMAPS,
        ERROR_MESSAGE_KEYS.ROBOTS_TXT_SITEMAP_ARRAY_MIN_LENGTH
    )
);

export const RobotsTxtSchema = strictObject(
    {
        agents: RobotsTxtUserAgentBlocksSchema,
        host: RobotsTxtHostSchema,
        sitemaps: RobotsTxtSitemapsSchema,
    },
    ERROR_MESSAGE_KEYS.ROBOTS_TXT_ROOT_OBJECT_EXPECTED
);

export type RobotsTxt = InferOutput<typeof RobotsTxtSchema>;

export function robotsTxtToText(data: RobotsTxt): TextFileOutput {
    parse(RobotsTxtSchema, data)

    const lines: UnicodeString[] = [];

    const ROBOTS_TXT_CONSTANTS = Object.freeze({
        CrawlDelay: 'Crawl-delay',
        Host: 'Host',
        Sitemap: "Sitemap",
        UserAgent: 'User-agent'
    } as const);

    for (const agent of data.agents) {
        lines.push(`${ROBOTS_TXT_CONSTANTS.UserAgent}: ${agent.userAgent}`);

        for (const rule of agent.rules) {
            lines.push(`${rule.type.charAt(0).toUpperCase()}${rule.type.substring(1)}: ${rule.path}`);
        }

        lines.push(`${ROBOTS_TXT_CONSTANTS.CrawlDelay}: ${agent.crawlDelay}`);

        lines.push(EMPTY_STRING);
    }

    lines.push(`${ROBOTS_TXT_CONSTANTS.Host}: ${data.host}`);

    for (const sitemap of data.sitemaps) {
        lines.push(`${ROBOTS_TXT_CONSTANTS.Sitemap}: ${sitemap}`);
    }

    return `${lines.join(CONTROL_CHARACTERS.NEWLINE).trimEnd()}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput;
}

export function output(config: RobotsTxt): TextFileOutput {
    return robotsTxtToText(config)
}