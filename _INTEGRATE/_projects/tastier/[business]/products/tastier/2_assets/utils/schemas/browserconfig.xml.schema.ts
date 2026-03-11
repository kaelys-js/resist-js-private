import {
    custom,
    InferOutput,
    number,
    optional,
    parse,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { HttpsUrlSchema, type TextFileOutput, type UnicodeString, type NonNegativeInteger, UnicodeStringSchema } from "../../../0_config/src/utils/schemas/common.schema";

import { CONTROL_CHARACTERS } from "../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "./common.schema";

export const HEX_RGB_COLOR_REGEX: RegExp = /^#[0-9A-Fa-f]{6}$/

export const TileColorSchema = pipe(
    string(ERROR_MESSAGE_KEYS.BROWSER_CONFIG_XML_TILE_COLOR_TYPE),
    regex(
        HEX_RGB_COLOR_REGEX,
        ERROR_MESSAGE_KEYS.BROWSER_CONFIG_XML_TILE_COLOR_FORMAT
    )
);

export type TileColor = InferOutput<typeof TileColorSchema>;

export const POLLING_FREQUENCY_ALLOWED_VALUES: NonNegativeInteger[] = [
    30,
    60,
    360,
    720,
    1440
] as const;

export const PollingFrequencySchema = pipe(
    number(ERROR_MESSAGE_KEYS.BROWSER_CONFIG_XML_POLLING_FREQUENCY_NOT_NUMBER),
    custom(
        (value): boolean => {
            return POLLING_FREQUENCY_ALLOWED_VALUES.includes(value as (typeof POLLING_FREQUENCY_ALLOWED_VALUES)[number]) === true;
        },
        ERROR_MESSAGE_KEYS.BROWSER_CONFIG_XML_POLLING_FREQUENCY_NOT_ALLOWED
    )
);

export type PollingFrequency = InferOutput<typeof PollingFrequencySchema>;

export const TileLogosSchema = strictObject(
    {
        square70x70logo: HttpsUrlSchema,
        square150x150logo: HttpsUrlSchema,
        wide310x150logo: HttpsUrlSchema,
        square310x310logo: HttpsUrlSchema,
        tileColor: TileColorSchema,
    },
    ERROR_MESSAGE_KEYS.BROWSER_CONFIG_XML_TILE_LOGOS_INVALID_OBJECT
);

export type TileLogos = InferOutput<typeof TileLogosSchema>;

export const BadgePollingSchema = strictObject({
    uri: HttpsUrlSchema,
    frequency: PollingFrequencySchema,
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_STRICT_OBJECT_BADGE_POLLING_INVALID);

export type BadgePolling = InferOutput<typeof BadgePollingSchema>;

export const BadgeSchema = strictObject({
    polling: BadgePollingSchema,
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_BADGE_STRICT_OBJECT_INVALID);

export type Badge = InferOutput<typeof BadgeSchema>;

export const NotificationPollingSchema = strictObject({
    uri: HttpsUrlSchema,
    frequency: PollingFrequencySchema,
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_NOTIFICATION_POLLING_STRICT_OBJECT_INVALID);

export type NotificationPolling = InferOutput<typeof NotificationPollingSchema>;

export const NotificationCycleSchema = strictObject({
    uri: HttpsUrlSchema,
    frequency: PollingFrequencySchema,
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_NOTIFICATION_CYCLE_STRICT_OBJECT_INVALID);

export type NotificationCycle = InferOutput<typeof NotificationCycleSchema>;

export const NotificationSchema = strictObject({
    polling: NotificationPollingSchema,
    cycle: NotificationCycleSchema,
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_NOTIFICATION_STRICT_OBJECT_INVALID);

export type Notification = InferOutput<typeof NotificationSchema>;

export const MSApplicationSchema = strictObject({
    tile: TileLogosSchema,
    badge: optional(BadgeSchema),
    notification: optional(NotificationSchema),
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_MSAPPLICATION_STRICT_OBJECT_INVALID);

export type MSApplication = InferOutput<typeof MSApplicationSchema>;

export const BrowserConfigSchema = strictObject({
    browserconfig: strictObject({
        msapplication: MSApplicationSchema,
    })
}, ERROR_MESSAGE_KEYS.BROWSER_CONFIG_STRICT_OBJECT_INVALID)

export type BrowserConfig = InferOutput<typeof BrowserConfigSchema>;

export function escapeXml(value: UnicodeString): UnicodeString {
    parse(UnicodeStringSchema, value)

    return value
        .replace(/&(?!(?:amp|lt|gt|quot);)/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function browserConfigToXml(
    config: BrowserConfig
): TextFileOutput {
    parse(BrowserConfigSchema, config)

    const ms: MSApplication = config.browserconfig.msapplication;
    const tile: TileLogos = ms.tile;
    const badge = ms.badge;
    const notification = ms.notification;

    const nl: UnicodeString = CONTROL_CHARACTERS.NEWLINE;
    const lines: UnicodeString[] = [];

    lines.push(`<?xml version="1.0" encoding="utf-8"?>`);
    lines.push(`<browserconfig>`);
    lines.push(`  <msapplication>`);
    lines.push(`    <tile>`);
    lines.push(`      <square70x70logo src="${escapeXml(tile.square70x70logo)}" />`);
    lines.push(`      <square150x150logo src="${escapeXml(tile.square150x150logo)}" />`);
    lines.push(`      <wide310x150logo src="${escapeXml(tile.wide310x150logo)}" />`);
    lines.push(`      <square310x310logo src="${escapeXml(tile.square310x310logo)}" />`);
    lines.push(`      <tileColor>${escapeXml(tile.tileColor)}</tileColor>`);
    lines.push(`    </tile>`);

    if (badge?.polling) {
        lines.push(`    <badge>`);
        lines.push(`      <polling uri="${escapeXml(badge.polling.uri)}" frequency="${badge.polling.frequency}" />`);
        lines.push(`    </badge>`);
    }

    if (notification?.polling || notification?.cycle) {
        lines.push(`    <notification>`);
        if (notification.polling) {
            lines.push(`      <polling uri="${escapeXml(notification.polling.uri)}" frequency="${notification.polling.frequency}" />`);
        }
        if (notification.cycle) {
            lines.push(`      <cycle uri="${escapeXml(notification.cycle.uri)}" frequency="${notification.cycle.frequency}" />`);
        }
        lines.push(`    </notification>`);
    }

    lines.push(`  </msapplication>`);
    lines.push(`</browserconfig>`);

    return `${lines.join(nl)}${nl}` as TextFileOutput;
}

export function output(config: BrowserConfig): TextFileOutput {
    return browserConfigToXml(config)
}