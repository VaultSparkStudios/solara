import test from "node:test";
import assert from "node:assert/strict";
import { getRunDebrief, getSessionDelta, getSharedWorldBriefing } from "../src/game/feedback.js";
import { getSharedWorldSnapshot } from "../src/game/sharedWorld.js";

test("shared world briefing prioritizes ritual and objective feedback", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 18,
    totalDeaths: 3200,
    leaderboard: [{ faction: "eclipser" }],
    echoes: [{ id: "echo-1", player_name: "Other", traveler_sigil: "SIG", kind: "roguelite", wave_reached: 14, commend_count: 2 }],
    graves: Array.from({ length: 5 }, (_, index) => ({ x: 8 + index, y: 12, sunstone_offerings: 20, epitaph: "ash" })),
    playerName: "Self",
    dayNumber: 9,
  });

  const briefing = getSharedWorldBriefing({
    sharedWorld,
    hasSunstoneShard: true,
    backendConnected: true,
    playedDailyToday: false,
    objectiveState: { title: "Support The Field of the Fallen" },
  });

  assert.match(briefing.headline, /fallen|Rival/i);
  assert.equal(briefing.cards[1].id, "ritual");
  assert.match(briefing.cards[1].detail, /Sunstone Shard/i);
  assert.equal(briefing.cards.at(-1).id, "best-move");
  assert.match(briefing.cards.at(-1).detail, /Support The Field of the Fallen/);
});

test("run debrief explains impact and next step after a failed daily rite", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 28,
    totalDeaths: 1800,
    leaderboard: [],
    echoes: [],
    graves: Array.from({ length: 5 }, (_, index) => ({
      x: 10 + index,
      y: 18,
      sunstone_offerings: 12,
      epitaph: "ash",
    })),
  });

  const debrief = getRunDebrief({
    mode: "daily",
    run: { done: true, deathWave: 7 },
    sharedWorld,
    objectiveState: { title: "Support the grave cluster", detail: "Offer your Sunstone Shard at the marked graves." },
    hasSunstoneShard: true,
  });

  assert.equal(debrief.result, "Daily Rite Ended at Wave 7");
  assert.match(debrief.impact, /leaderboard/i);
  assert.match(debrief.impact, /ritual progress/i);
  assert.match(debrief.nextStep, /Support the grave cluster/);
  assert.ok(debrief.highlights.length >= 3);
  assert.equal(debrief.nextActions[0].label, "Personal");
  assert.match(debrief.nextActions[1].detail, /Lantern Tithe|Ashwake Vigil|Solar Communion/i);
  assert.match(debrief.socialPrompt, /Daily Rite Ended/);
});

test("session delta summarizes run state, world pressure, and live link", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 18,
    totalDeaths: 3200,
    leaderboard: [{ faction: "eclipser" }],
    echoes: [{ id: "echo-1", player_name: "Other", traveler_sigil: "SIG", kind: "roguelite", wave_reached: 14, commend_count: 2 }],
    graves: Array.from({ length: 5 }, (_, index) => ({ x: 8 + index, y: 12, sunstone_offerings: 20, epitaph: "ash" })),
    playerName: "Self",
  });

  const delta = getSessionDelta({
    sharedWorld,
    dailyRun: { done: true, deathWave: 9 },
    playedDailyToday: true,
    backendConnected: true,
    objectiveState: { title: "Answer Other" },
    echoCount: 3,
    graveCount: 12,
  });

  assert.equal(delta.title, "Session Delta");
  assert.equal(delta.cards[0].id, "latest-run");
  assert.match(delta.cards[0].value, /Daily Rite wave 9/);
  assert.match(delta.summary, /Answer Other/);
  assert.equal(delta.cards.at(-1).value, "12 graves / 3 echoes");
});
