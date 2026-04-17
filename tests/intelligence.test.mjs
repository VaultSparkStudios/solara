import test from "node:test";
import assert from "node:assert/strict";
import { buildConstellationObjectives } from "../src/game/constellationObjectives.js";
import { getFirstSessionPlan } from "../src/game/firstSession.js";
import { buildAiPolicy, buildIntelligenceDigest } from "../src/game/intelligencePolicy.js";
import { getDailyRitePlan } from "../src/game/directorMechanics.js";
import { getSharedWorldSnapshot } from "../src/game/sharedWorld.js";
import { buildStudioIntegrationContract } from "../src/game/telemetry.js";
import { buildWorldFeed } from "../src/game/worldFeed.js";

test("AI policy stays deterministic and zero-cost in browser by default", () => {
  const policy = buildAiPolicy({
    season: 2,
    dayNumber: 9,
    sunBrightness: 22.4,
    totalDeaths: 88,
    topRunCount: 3,
    graveCount: 12,
    echoCount: 5,
  });

  assert.equal(policy.browser_token_cost, 0);
  assert.equal(policy.paid_generation_allowed, false);
  assert.equal(policy.server_generation.fallback, "deterministic_chronicle");
  assert.match(policy.cache_key, /season:2:day:9:sun:22:deaths:88:runs:3:graves:12:echoes:5/);
});

test("world feed and Studio integration contract summarize public-safe state", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 18,
    totalDeaths: 3200,
    leaderboard: [{ faction: "eclipser", wave_reached: 12 }],
    echoes: [{ id: "echo-1", player_name: "Other", traveler_sigil: "SIG", kind: "roguelite", wave_reached: 14, commend_count: 2 }],
    graves: Array.from({ length: 6 }, (_, index) => ({ x: 8 + index, y: 12, sunstone_offerings: 20, epitaph: "ash" })),
    playerName: "Self",
    dayNumber: 9,
  });

  const feed = buildWorldFeed({ sharedWorld, backendConnected: true, graveCount: 6, echoCount: 1 });
  const contract = buildStudioIntegrationContract({
    sharedWorld,
    objectiveState: { title: "Answer Other" },
    backendConnected: true,
  });
  const digest = buildIntelligenceDigest({
    sharedWorld,
    objectiveState: { title: "Answer Other" },
  });

  assert.equal(feed[0].priority >= feed.at(-1).priority, true);
  assert.ok(feed.some((item) => item.kind === "rival"));
  assert.ok(feed.every((item) => item.action?.type));
  assert.equal(contract.schema_version, 2);
  assert.equal(contract.sparkfunnel.conversion_event, "daily_rite_start");
  assert.equal(contract.telemetry.dimensions.next_best_action, "Answer Other");
  assert.equal(digest.next_best_action, "Answer Other");
  assert.equal(digest.token_policy.browser_token_cost, 0);
});

test("Daily Rite plan turns Director mechanics into deterministic route segments", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 18,
    totalDeaths: 3200,
    leaderboard: [{ faction: "eclipser", wave_reached: 12 }],
    echoes: [{ id: "echo-1", player_name: "Other", traveler_sigil: "SIG", kind: "roguelite", wave_reached: 14, commend_count: 2 }],
    graves: Array.from({ length: 6 }, (_, index) => ({ x: 8 + index, y: 12, sunstone_offerings: 20, epitaph: "ash" })),
    playerName: "Self",
    dayNumber: 9,
  });

  const plan = getDailyRitePlan({ sharedWorld, dayNumber: 9 });

  assert.match(plan.id, /day:9/);
  assert.equal(plan.route.length, 6);
  assert.equal(plan.route[0].waveStart, 1);
  assert.equal(plan.route.at(-1).waveEnd, 30);
  assert.ok(plan.boss.pressure >= plan.enemyScale);
  assert.match(plan.shareLine, new RegExp(plan.label));
});

test("constellation objectives expose playable map routing and offering value", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 28,
    totalDeaths: 1800,
    graves: Array.from({ length: 5 }, (_, index) => ({ x: 10 + index, y: 18, sunstone_offerings: 12, epitaph: "ash" })),
  });

  const objectives = buildConstellationObjectives({
    sharedWorld,
    player: { x: 20, y: 28 },
    hasSunstoneShard: true,
  });

  assert.ok(objectives.length >= 1);
  assert.equal(objectives[0].tab, "daily");
  assert.equal(objectives[0].canOffer, true);
  assert.ok(objectives[0].urgency >= 1);
  assert.match(objectives[0].detail, /Sunstone Shard/i);
});

test("first-session planner identifies the next myth step", () => {
  const plan = getFirstSessionPlan({
    player: { eq: {}, quests: { cook: 0 } },
    isFreshAdventurer: true,
    playedDailyToday: false,
    backendConnected: false,
  });

  assert.equal(plan.title, "First Myth");
  assert.equal(plan.complete, false);
  assert.equal(plan.next.id, "equip");
  assert.equal(plan.steps.length, 4);
});
