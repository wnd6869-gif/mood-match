import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const connectionCount = Number.parseInt(
  process.env.LOAD_TEST_CONNECTIONS ?? "30",
  10,
);

if (!url || !key) {
  throw new Error("Supabase public URL and publishable key are required.");
}
if (!Number.isSafeInteger(connectionCount) || connectionCount < 2 || connectionCount > 30) {
  throw new Error("LOAD_TEST_CONNECTIONS must be between 2 and 30.");
}

const topic = `mood-match-loadtest-${Date.now()}`;
const clients = [];
const subscriptions = [];
const subscriptionDurations = [];
const receivedDurations = [];
const nonce = crypto.randomUUID();
let broadcastStartedAt = 0;

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function waitForSubscription(channel, startedAt) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("subscription_timeout")), 15_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        subscriptionDurations.push(performance.now() - startedAt);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(status));
      }
    });
  });
}

try {
  for (let index = 0; index < connectionCount; index += 1) {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clients.push(client);
    const channel = client.channel(topic, {
      config: { broadcast: { ack: true, self: index === 0 } },
    });
    channel.on("broadcast", { event: "probe" }, ({ payload }) => {
      if (payload?.nonce === nonce && broadcastStartedAt > 0) {
        receivedDurations.push(performance.now() - broadcastStartedAt);
      }
    });
    subscriptions.push(channel);
  }

  await Promise.all(
    subscriptions.map((channel) => waitForSubscription(channel, performance.now())),
  );

  broadcastStartedAt = performance.now();
  const sendStatus = await subscriptions[0].send({
    type: "broadcast",
    event: "probe",
    payload: { nonce },
  });
  if (sendStatus !== "ok") throw new Error(`broadcast_${sendStatus}`);

  const deadline = Date.now() + 10_000;
  while (receivedDurations.length < connectionCount && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  console.log(
    JSON.stringify(
      {
        topic,
        connections: connectionCount,
        subscriptions: subscriptionDurations.length,
        subscriptionLatencyMs: {
          p50: Number(percentile(subscriptionDurations, 0.5).toFixed(2)),
          p95: Number(percentile(subscriptionDurations, 0.95).toFixed(2)),
          max: Number(percentile(subscriptionDurations, 1).toFixed(2)),
        },
        broadcast: {
          receivers: receivedDurations.length,
          expectedReceivers: connectionCount,
          deliveryRate: Number(((receivedDurations.length / connectionCount) * 100).toFixed(2)),
          p50Ms: Number(percentile(receivedDurations, 0.5).toFixed(2)),
          p95Ms: Number(percentile(receivedDurations, 0.95).toFixed(2)),
          maxMs: Number(percentile(receivedDurations, 1).toFixed(2)),
        },
      },
      null,
      2,
    ),
  );

  if (receivedDurations.length !== connectionCount) process.exitCode = 1;
} finally {
  await Promise.all(clients.map((client) => client.removeAllChannels()));
}
