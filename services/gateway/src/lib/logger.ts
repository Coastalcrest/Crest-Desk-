import pino from "pino";
import type { Logger } from "pino";

/**
 * Creates a Pino logger instance configured for Datadog correlation.
 *
 * In production, logs are shipped via pino-datadog-transport so that
 * dd-trace correlation IDs (dd.trace_id, dd.span_id) are automatically
 * attached to every log line, enabling seamless APM <-> Logs correlation
 * in the Datadog UI.
 */
function createLogger(): Logger {
  const isProduction = process.env.NODE_ENV === "production";
  const useDatadog = isProduction && process.env.DD_API_KEY;

  if (useDatadog) {
    // Full Datadog transport — only when DD_API_KEY is set
    return pino({
      level: process.env.LOG_LEVEL ?? "info",
      formatters: {
        level(label: string) {
          return { level: label };
        },
      },
      transport: {
        target: "pino-datadog-transport",
        options: {
          service: "crestdesk-gateway",
          ddsource: "nodejs",
          ddtags: `env:${process.env.DD_ENV ?? "production"}`,
        },
      },
    });
  }

  if (isProduction) {
    // Plain JSON logging to stdout (Docker / cloud environments)
    return pino({
      level: process.env.LOG_LEVEL ?? "info",
      formatters: {
        level(label: string) {
          return { level: label };
        },
      },
    });
  }

  return pino({
    level: process.env.LOG_LEVEL ?? "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
}

export const logger: Logger = createLogger();
