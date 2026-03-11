/*
    TODO:
    detailed commenting
    valibot typing

# TODO:
# - New Log Level: TRACE
# - Timestamps To UTC
# - Automatically include stack trace for WARN/ERROR/FATAL levels.
# - Prevent log flooding
# - Inject correlation IDs into logs for tracing across services or processes.
# - Include Memory/CPU/Storage/Network Stats
# - Colored Output For Each Log Level, Disabble on non-TTY, CI, Test. Support 256-color/TrueColor terminals.
# - Format (JSON, Plain, CSV, YAML, syslog)
# - Reporters (Console, File, Function)
# - Tracing / Span Logging
# - Set file Permission (umask override) on Log File
# - Reporter Options: File
#   - Path/Name (Auto Create Path)
#   - Rotate After Log File Size
#   - # Of Log Files to Keep

# - Log env on startup of Dockerfile shell script

# REQUIRED: Anything wrong with this? Any bugs or edge cases? Fix them all. Recheck your work until no bugs or edge cases remain, I don't want to ask multiple times. Provide the updated code inline in this chat. Do not remove any existing functionality. Any missing dependency checks? Add detailed commenting on what this does.
REQUIRED: Continually recheck your work so I don't have to ask again. I expect that next time I ask there are no bugs or edge cases remaining.
    */

// log_json.ts

import { hostname } from "os";
import { execSync } from "child_process";
import { cwd } from "process";
import { randomUUID } from "crypto";

// ------------------------
// Types
// ------------------------

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
type LogContext = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

// ------------------------
// Env Utilities
// ------------------------

function getEnvFlag(name: string): boolean {
  return process.env[name]?.toLowerCase() === "true";
}

function getEnvString(name: string): string | undefined {
  return process.env[name]?.trim();
}

const LOG_ENV = getEnvString("LOG_ENV")?.toUpperCase() || "";
const LOG_LEVEL = getEnvString("LOG_LEVEL")?.toUpperCase();
const LOG_PRETTY = getEnvFlag("LOG_PRETTY");

// ------------------------
// Initialization
// ------------------------

const DEFAULT_USER = process.env.USER ?? execSync("whoami").toString().trim();

let GLOBAL_CONTEXT: LogContext = {};
try {
  if (process.env.LOG_CONTEXT) {
    GLOBAL_CONTEXT = JSON.parse(process.env.LOG_CONTEXT);
  }
} catch {
  log_internal_error("Invalid LOG_CONTEXT: must be valid JSON");
}

// ------------------------
// Helpers
// ------------------------

function getMetadata() {
  return {
    timestamp: new Date().toISOString(),
    hostname: hostname(),
    pid: process.pid,
    script: Bun.argv[1]?.split("/").pop() || "unknown",
    user: DEFAULT_USER,
    cwd: cwd(),
    uuid: randomUUID(),
  };
}

function isSerializable(obj: unknown): boolean {
  try {
    JSON.stringify(obj);
    return true;
  } catch {
    return false;
  }
}

function normalizeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function log_internal_error(message: string) {
  const entry = {
    ...getMetadata(),
    level: "ERROR",
    message,
    error: true,
  };
  const out = LOG_PRETTY ? JSON.stringify(entry, null, 2) : JSON.stringify(entry);
  console.error(out);
}

function safeLog(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    log_internal_error("Logging failed: " + (err instanceof Error ? err.message : String(err)));
  }
}

// ------------------------
// Main Logger
// ------------------------

function log_json(level: string, message: string, context: LogContext = {}): void {
  level = level.toUpperCase();
  message = message.trim();

  if (!(level in LEVELS)) {
    log_internal_error(`Invalid log level '${level}'. Use one of: ${Object.keys(LEVELS).join(", ")}`);
    return;
  }

  if (LOG_ENV === "PRODUCTION" && level === "DEBUG") return;

  if (LOG_LEVEL) {
    if (LOG_LEVEL in LEVELS) {
      if (LEVELS[level as LogLevel] < LEVELS[LOG_LEVEL as LogLevel]) return;
    } else {
      log_internal_error(`Invalid LOG_LEVEL '${LOG_LEVEL}'. Ignoring threshold filter.`);
    }
  }

  if (!message) {
    log_internal_error("Log message cannot be empty or whitespace.");
    return;
  }

  if (context.error instanceof Error) {
    context.error = normalizeError(context.error);
  }

  if (!isSerializable(context)) {
    log_internal_error("Context must be JSON-serializable.");
    return;
  }

  const logEntry: Record<string, unknown> = {
    ...getMetadata(),
    level,
    message,
    log_level_name: level.toLowerCase(),
    log_level_value: LEVELS[level as LogLevel],
    ...GLOBAL_CONTEXT,
    ...context,
  };

  const startTime = Number(process.env.LOG_START_TIME);
  if (!isNaN(startTime)) {
    logEntry.duration_ms = Date.now() - startTime;
  }

  if (level === "DEBUG" || level === "FATAL") {
    logEntry.caller = new Error().stack?.split("\n")[3]?.trim();
  }

  const output = LOG_PRETTY ? JSON.stringify(logEntry, null, 2) : JSON.stringify(logEntry);
  const stream = (level === "ERROR" || level === "FATAL") ? console.error : console.log;
  stream(output);
}

// ------------------------
// Named Level Shortcuts
// ------------------------

const log = {
  debug: (msg: string, ctx?: LogContext) => log_json("DEBUG", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log_json("INFO", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log_json("WARN", msg, ctx),
  error: (msg: string, ctx?: LogContext) => log_json("ERROR", msg, ctx),
  fatal: (msg: string, ctx?: LogContext) => log_json("FATAL", msg, ctx),
};

// ------------------------
// Fatal Shortcut with Exit
// ------------------------

function fatal(message: string, context: LogContext = {}, code = 1): never {
  log.fatal(message, context);
  process.exit(code);
}

// ------------------------
// Exported
// ------------------------

export { log_json, safeLog, log, fatal };

// ------------------------
// Optional Example Usage
// ------------------------

// safeLog(() => log.info("Starting up", { event: "init" }));
// safeLog(() => log.error("Missing config", { error: new Error("Missing token") }));
// fatal("Unrecoverable failure", { component: "bootstrap" });
