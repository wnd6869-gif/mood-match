import "server-only";

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
    const payload = {
      event,
      ...sanitizeMetadata(metadata),
      errorName: getErrorName(error),
      ...(process.env.NODE_ENV === "development" && error
        ? { stack: getErrorStack(error) }
        : {}),
    };

    console.error("[server-error]", payload);
  },
};
