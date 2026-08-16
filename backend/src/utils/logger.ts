/**
 * Minimal structured logger — no new dependencies.
 *
 * Production: emits single-line JSON (timestamp, level, message, meta) so
 * it's easy to ship to any log aggregator (CloudWatch, Datadog, etc.).
 * Development: emits human-readable, colorless lines for local reading.
 *
 * This intentionally does NOT pull in winston/pino to keep the dependency
 * footprint unchanged — swap the `write` implementation for a real logging
 * library later without touching any call sites.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

const write = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();

  if (isProd) {
    const line = JSON.stringify({ timestamp, level, message, ...meta });
    // eslint-disable-next-line no-console
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
    return;
  }

  const metaSuffix = meta && Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    `[${timestamp}] ${level.toUpperCase()} ${message}${metaSuffix}`
  );
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => !isProd && write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
