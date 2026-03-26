# Edge CLI Tool — Feature Plans

> Implementation plans for `pnpm tool edge` — local Cloudflare edge simulation via Caddy.

## Master Plan

See `../../.claude/plans/jazzy-doodling-teacup.md` for the comprehensive master plan.

## Feature Plan Files

Each file is a self-contained implementation plan covering one feature area. Plans include full code diffs, documentation links, schema definitions, and verification steps.

| # | File | Feature Area | Phase |
|---|------|-------------|-------|
| 00 | `00-foundation.md` | Tool rename, config inheritance, schema foundation, custom Caddy build | 1 |
| 01 | `01-ssl-tls.md` | SSL/TLS settings (HSTS, min TLS, cipher suites, SSL modes, client certs) | 2 |
| 02 | `02-waf.md` | WAF (Coraza + OWASP CRS, custom rules, managed rulesets, scoring) | 3 |
| 03 | `03-rate-limiting.md` | Zone-level rate limiting (periods, actions, counting expressions) | 3 |
| 04 | `04-bot-management.md` | Bot Fight Mode, Super Bot Fight Mode, bot scores, AI bot blocking | 4 |
| 05 | `05-ip-firewall.md` | IP access rules, UA blocking, zone lockdown, security level, hotlink protection | 4 |
| 06 | `06-rules-engine.md` | Transform, redirect, origin, configuration, snippet, compression rules | 5 |
| 07 | `07-caching.md` | Cache rules, tiered cache, Cache Reserve, purge, cache deception armor | 6 |
| 08 | `08-performance.md` | HTTP/2/3, 0-RTT, Early Hints, compression, image resizing, Polish, minification | 5-6 |
| 09 | `09-access-challenges.md` | Cloudflare Access, Turnstile, managed/JS challenges, Under Attack Mode | 7 |
| 10 | `10-dns.md` | DNS records (all types), CNAME flattening, /etc/hosts generation | 1 |
| 11 | `11-email.md` | Email routing (Mailpit), catch-all, Email Workers test harness | 9 |
| 12 | `12-analytics.md` | Analytics Engine (ClickHouse), Web Analytics, Logpush, Log Explorer | 10 |
| 13 | `13-load-balancing.md` | Load balancer, pools, health monitors, steering, session affinity, waiting room | 8 |
| 14 | `14-media.md` | Stream, Images, fonts, WebRTC/RealtimeKit | 9 |
| 15 | `15-cf-fields.md` | `cf.*` request field header injection (bot, WAF, geo, TLS, timing, ray ID) | 4 |
| 16 | `16-api-security.md` | API Shield, JWT validation, schema validation, mTLS, endpoint discovery | 11 |
| 17 | `17-notifications.md` | Notification policies, alert types, local event bus | 10 |
| 18 | `18-client-security.md` | Page Shield (CSP), email obfuscation | 4 |
| 19 | `19-pulumi-output.md` | Pulumi IaC generation from edge config | 12 |

## Rules (CRITICAL)

All plans follow these rules:

- **NEVER use `v.parse`** — throws, bypasses Result system
- **ALWAYS use `safeParse` from `@/utils/result/safe`** — returns `Result<T>`
- **ALL functions return `Result<T>`** — no exceptions
- **Check `.ok` on EVERY Result** before using `.data`
- **Valibot types EVERYWHERE** — no TS builtins (`string`, `number`, `boolean`)
- **`v.strictObject`** for all config schemas
- **Complete JSDoc** with `@param` and `@returns`
- **NO barrel files** — canonical source imports only
- **NO re-exports** — update all callers when moving code

## Config Inheritance Model

Every CF setting is:
1. Definable globally in `resist.config.ts` under `tooling.edge`
2. Overridable per-product (deep merge — product values win)
3. Same schema drives both local Caddy simulation AND Pulumi Cloudflare IaC
