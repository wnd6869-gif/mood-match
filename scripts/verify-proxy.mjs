import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { shouldRedirectModeratedUser } from "../lib/moderation-redirect.mjs";

globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const nextTesting = await import("next/experimental/testing/server.js");
const doesProxyMatch =
  nextTesting.unstable_doesProxyMatch ??
  nextTesting.unstable_doesMiddlewareMatch;

const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

for (const status of ["restricted", "suspended", "banned"]) {
  assert.equal(shouldRedirectModeratedUser(status), true, `${status} must redirect`);
}
assert.equal(shouldRedirectModeratedUser("active"), false);
assert.equal(doesProxyMatch({ config, nextConfig: {}, url: "/home" }), true);
assert.equal(doesProxyMatch({ config, nextConfig: {}, url: "/_next/static/chunk.js" }), false);
assert.equal(doesProxyMatch({ config, nextConfig: {}, url: "/avatar.png" }), false);

console.log("proxy matcher and moderation redirect checks passed");
