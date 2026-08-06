import assert from "node:assert/strict";
import { createPersonaCastingSeed } from "../lib/ai/persona-seed.mjs";

const userId = "00000000-0000-4000-8000-000000000001";
const objectPath = `${userId}/profile.webp`;
const stableA = createPersonaCastingSeed(userId, objectPath, null);
const stableB = createPersonaCastingSeed(userId, objectPath, null);
const rerollA = createPersonaCastingSeed(userId, objectPath, "claim-a");
const rerollB = createPersonaCastingSeed(userId, objectPath, "claim-b");

assert.equal(stableA, stableB, "normal retry must keep the same character seed");
assert.notEqual(stableA, rerollA, "explicit reroll must differ from stable seed");
assert.notEqual(rerollA, rerollB, "reroll nonces must produce different seeds");
console.log("persona stable/reroll seed checks passed");
