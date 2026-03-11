// TODO: Alias Imports
import { parse } from "valibot";

import { CACHE_TTL_VALUES } from "../../../0_config/src/utils/common/constants";

import { type StaticAssetCaching, staticAssetCachingSchema, type StaticAssetRouteConfig, staticAssetRouteConfig } from "../schemas/common.schema";

export const staticAssetsCaching: Readonly<StaticAssetCaching> = Object.freeze({
    "/.well-known/apple-app-site-association": CACHE_TTL_VALUES.FIVE_MINUTES,
    "/.well-known/apple-developer-domain-association": CACHE_TTL_VALUES.ONE_HOUR,
    "/.well-known/apple-developer-merchantid-domain-association": CACHE_TTL_VALUES.ONE_HOUR,
    "/.well-known/change-password": CACHE_TTL_VALUES.ONE_DAY,
    "/.well-known/gpc.json": CACHE_TTL_VALUES.FIVE_MINUTES,
    "/.well-known/mta-sts.txt": CACHE_TTL_VALUES.ONE_DAY,
    "/.well-known/pgp-key.txt": CACHE_TTL_VALUES.ONE_WEEK,
    "/.well-known/related-website-set.json": CACHE_TTL_VALUES.ONE_DAY,
    "/.well-known/security.txt": CACHE_TTL_VALUES.ONE_DAY,
    "/ads.txt": CACHE_TTL_VALUES.FIVE_MINUTES,
    "/app-ads.txt": CACHE_TTL_VALUES.FIVE_MINUTES,
    "/assetlinks.json": CACHE_TTL_VALUES.ONE_HOUR,
    "/browserconfig.xml": CACHE_TTL_VALUES.ONE_WEEK,
    "/manifest.webmanifest": CACHE_TTL_VALUES.ONE_DAY,
    "/robots.txt": CACHE_TTL_VALUES.ONE_DAY,
} satisfies StaticAssetCaching);

parse(staticAssetCachingSchema, staticAssetsCaching)

export const staticAssetConfig: Readonly<StaticAssetRouteConfig> = Object.freeze({
    // TODO: Finish
    "/.well-known/apple-app-site-association": {
        applinks: {
            apps: [],
            details: []
        },
        webcredentials: {
            apps: []
        },
        appclips: {
            apps: []
        }
    },
    "OK": {},
    "/.well-known/apple-developer-domain-association": {
        tokens: []
    },
    "/.well-known/apple-developer-merchantid-domain-association": {
        tokens: []
    },
    "/.well-known/change-password": "change-password-url",
    "/.well-known/gpc.json": {
        $schema: '',
        gpc: true,
        lastUpdated: '',
        honors: ['sale', 'sharing', 'targeted_advertising'],
        appliesTo: ['api', 'mobile_web', 'web'],
        scope: 'global',
        policy: '',
    },
    "/.well-known/mta-sts.txt": {
        version: 'STSv1',
        mode: "enforce",
        mx: [],
        maxAge: '',
    },
    "/.well-known/pgp-key.txt": {
        publicKey: ''
    },
    "/.well-known/related-website-set.json": {
        $schema: '',
        primary: '',
        associatedSites: [],
        serviceSites: []
    },
    "/.well-known/security.txt": {
        contact: [],
        canonical: '',
        preferredLanguages: [],
        policy: '',
        encryption: '',
        acknowledgements: '',
        hiring: '',
        expires: ''
    },
    "/ads.txt": {
        header: {},
        entries: [
            /*{
                adSystemDomain,
                publisherId,
                relationship,
                certificationAuthorityId
            }*/
        ],
        lastUpdated: ""
    },
    "/app-ads.txt": {
        header: {},
        entries: [
            /*{
                adSystemDomain,
                publisherId,
                relationship,
                certificationAuthorityId
            }*/
        ],
        lastUpdated: ""
    },
    "/assetlinks.json": [
        {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
                namespace: 'android_app',
                package_name: '',
                sha256_cert_fingerprints: ['']
            }
        }
    ],
    "/browserconfig.xml": {
        browserconfig: {
            msapplication: {
                tile: {
                    square70x70logo: "",
                    square150x150logo: "",
                    wide310x150logo: "",
                    square310x310logo: "",
                    tileColor: ""
                }
            }
        }
    },
    "/manifest.webmanifest": {

    },
    "/robots.txt": {
        agents: [
            {
                userAgent: '',
                rules: [
                    {
                        type: '',
                        path: ''
                    }
                ],
                crawlDelay: 0
            }
        ],
        host: '',
        sitemaps: [
            ''
        ]
    },
} satisfies StaticAssetRouteConfig)

parse(staticAssetRouteConfig, staticAssetConfig)