import { performance } from "node:perf_hooks";

const target = new URL(process.env.LOAD_TEST_URL ?? "http://127.0.0.1:3000/");
const concurrency = Number.parseInt(process.env.LOAD_TEST_CONCURRENCY ?? "10", 10);
const requestsPerWorker = Number.parseInt(
  process.env.LOAD_TEST_REQUESTS_PER_WORKER ?? "10",
  10,
);

if (
  !Number.isSafeInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 100 ||
  !Number.isSafeInteger(requestsPerWorker) ||
  requestsPerWorker < 1 ||
  requestsPerWorker > 100
) {
  throw new Error("Concurrency and requests per worker must be between 1 and 100.");
}

const samples = [];

async function requestOnce() {
  const startedAt = performance.now();
  try {
    const response = await fetch(target, {
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(15_000),
    });
    await response.arrayBuffer();
    samples.push({ duration: performance.now() - startedAt, status: response.status });
  } catch (error) {
    samples.push({
      duration: performance.now() - startedAt,
      status: 0,
      error: error instanceof Error ? error.name : "request_error",
    });
  }
}

async function worker() {
  for (let index = 0; index < requestsPerWorker; index += 1) {
    await requestOnce();
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const totalDuration = performance.now() - startedAt;
const durations = samples.map(({ duration }) => duration).sort((a, b) => a - b);
const percentile = (value) => {
  if (durations.length === 0) return 0;
  return durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)];
};
const successCount = samples.filter(({ status }) => status >= 200 && status < 400).length;
const statusCounts = Object.fromEntries(
  [...new Set(samples.map(({ status }) => status))]
    .sort((left, right) => left - right)
    .map((status) => [status, samples.filter((sample) => sample.status === status).length]),
);

console.log(
  JSON.stringify(
    {
      target: target.toString(),
      concurrency,
      requests: samples.length,
      successCount,
      errorRate: Number((((samples.length - successCount) / samples.length) * 100).toFixed(2)),
      requestsPerSecond: Number((samples.length / (totalDuration / 1_000)).toFixed(2)),
      latencyMs: {
        p50: Number(percentile(0.5).toFixed(2)),
        p95: Number(percentile(0.95).toFixed(2)),
        max: Number(percentile(1).toFixed(2)),
      },
      statusCounts,
    },
    null,
    2,
  ),
);

if (successCount !== samples.length) process.exitCode = 1;
