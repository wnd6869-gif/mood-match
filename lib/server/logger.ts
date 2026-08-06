import "server-only";
import * as Sentry from "@sentry/nextjs";

type Primitive = string | number | boolean | null | undefined;
type LoggerMetadata = Record<string, Primitive>;

function sanitizeMetadata(metadata: LoggerMetadata) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        key === "userId" && typeof value === "string"
          ? `${value.slice(0, 8)}…`
          : value,
      ]),
  );
}

function getErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined;
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

export const logger = {
  error(event: string, metadata: LoggerMetadata = {}, error?: unknown) {
    const safeMetadata = sanitizeMetadata(metadata);
    const payload = {
      event,
      ...safeMetadata,
      errorName: getErrorName(error),
      ...(process.env.NODE_ENV === "development" && error
        ? { stack: getErrorStack(error) }
        : {}),
    };

    console.error("[server-error]", payload);

    // The SDK is a no-op until SENTRY_DSN is configured. Never attach request
    // bodies, photo URLs, chat text, email addresses, or access tokens here.
    Sentry.withScope((scope) => {
      scope.setTag("event", event);
      Object.entries(safeMetadata).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });

      if (error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(event, "error");
      }
    });
  },
};
