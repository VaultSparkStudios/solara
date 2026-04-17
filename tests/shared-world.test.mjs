import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRunBlessing,
  getEchoBlessing,
  getSharedWorldSnapshot,
  getSunDirectorPlan,
  getSunPhase,
} from "../src/game/sharedWorld.js";
import {
  buildCommunityRitual,
  buildGraveConstellations,
  buildProphecyDeck,
  createDeathMemoryCard,
} from "../src/game/innovationSystems.js";
import { buildSavePayload, createSaveSanitizer, migrateSaveData } from "../src/game/save.js";
import {
  applyMonsterWorldState,
  getCombatBonuses,
  getDynamicWorldEvent,
  getMerchantPriceScale,
  resetRunScopedBonuses,
} from "../src/game/worldRuntime.js";
import {
  sanitizeDailyScorePayload,
  sanitizeEchoPayload,
  sanitizeGravePayload,
  sanitizeReaction,
} from "../src/game/trust.js";
import {
  getGuideStepLabel,
  getObjectiveState,
  getWorldActionItems,
} from "../src/game/objectives.js";
import {
  offerSunstoneRecord,
  reactToEchoRecord,
  submitDailyScoreRecord,
  submitGraveRecord,
  submitRemoteEcho,
} from "../src/game/sharedWorldService.js";

test("getSunPhase classifies eclipse thresholds", () => {
  assert.equal(getSunPhase(10).id, "eclipse");
  assert.equal(getSunPhase(75).id, "amber_warning");
});

test("getSharedWorldSnapshot responds to leader control and low sun", () => {
  const eclipse = getSharedWorldSnapshot({
    sunBrightness: 8,
    totalDeaths: 5000,
    leaderboard: [{ faction: "eclipser" }, { faction: "eclipser" }, { faction: "sunkeeper" }],
    echoes: [],
  });
  assert.equal(eclipse.event.id, "umbra_surge");

  const convoy = getSharedWorldSnapshot({
    sunBrightness: 88,
    totalDeaths: 120,
    leaderboard: [{ faction: "sunkeeper" }, { faction: "sunkeeper" }],
    echoes: [],
  });
  assert.equal(convoy.event.id, "sunkeeper_convoy");
  assert.equal(convoy.director.dailyModifier.id, "clear_routes");
  assert.equal(convoy.director.mechanics.id, "clear_routes");
  assert.ok(convoy.director.mechanics.rewardMultiplier >= 1);
});

test("sun director turns phase and faction state into actionable pressure", () => {
  const plan = getSunDirectorPlan(
    getSunPhase(12),
    { leader: "eclipser", contested: false },
    { label: "Umbra Surge" },
  );
  assert.equal(plan.pressure, "Emergency");
  assert.equal(plan.dailyModifier.id, "sunless_edict");
  assert.match(plan.factionObjective, /Eclipsers/);
});

test("echo blessing prefers the dominant recent signal", () => {
  const blessing = getEchoBlessing([
    { kind: "roguelite", commend_count: 2, mourn_count: 0 },
    { kind: "roguelite", commend_count: 1, mourn_count: 0 },
  ]);
  assert.equal(blessing.id, "emberspur");
});

test("applyRunBlessing mutates player with bounded bonuses", () => {
  const player = { hp: 10, mhp: 10, prayer: 1, maxPrayer: 1 };
  applyRunBlessing(player, { bonus: { hp: 4, pray: 3, atk: 1, str: 1 } });
  assert.equal(player.mhp, 10);
  assert.equal(player.hp, 10);
  assert.equal(player.maxPrayer, 1);
  assert.equal(player.prayer, 1);
  assert.equal(player.echoAtkBonus, 1);
});

test("save sanitizer removes invalid item entries and clamps values", () => {
  const sanitizeSaveData = createSaveSanitizer({
    items: { bread: { n: "Bread" }, bronze_sword: { n: "Sword" } },
    saveVersion: 5,
  });
  const result = sanitizeSaveData(
    {
      hp: 999,
      mhp: 10,
      prayer: 99,
      maxPrayer: 5,
      inv: [{ i: "bread", c: 2 }, { i: "missing", c: 1 }],
      eq: { weapon: "bronze_sword" },
      playerName: "  Test   User  ",
      travelerSigil: " sigil ",
    },
    "Fallback",
    "SIGIL-1",
  );
  assert.equal(result.data.hp, 10);
  assert.equal(result.data.prayer, 5);
  assert.deepEqual(result.data.inv, [{ i: "bread", c: 2 }]);
  assert.equal(result.data.playerName, "Test User");
  assert.ok(result.issues.length >= 2);
});

test("save migration restores modern fields and reports repair work", () => {
  const migrated = migrateSaveData({ ver: 2, hp: 5 }, 5);
  assert.equal(migrated.data.ver, 5);
  assert.deepEqual(migrated.data.rep, { guard: 0, merchant: 0, bandit: 0 });
  assert.deepEqual(migrated.data.rogueliteStats, { bestWave: 0, totalRuns: 0, relics: [] });
  assert.ok(migrated.issues.some((issue) => /migrated/i.test(issue)));

  const sanitizeSaveData = createSaveSanitizer({
    items: { bread: { n: "Bread" } },
    saveVersion: 5,
  });
  const result = sanitizeSaveData({ ver: 1, inv: [{ i: "bread", c: 1 }] }, "Fallback", "SIGIL-1");
  assert.equal(result.data.ver, 5);
  assert.ok(result.issues.some((issue) => /reputation/i.test(issue)));
});

test("save payload builder captures current player and farm patch state", () => {
  const payload = buildSavePayload({
    saveVersion: 5,
    fallbackSigil: "SIG-2",
    player: {
      sk: {},
      inv: [{ i: "bread", c: 1 }],
      eq: {},
      bank: [],
      hp: 8,
      mhp: 10,
      prayer: 1,
      maxPrayer: 1,
      quests: {},
      totalXp: 12,
      x: 2,
      y: 3,
      runE: 90,
      visitedRegions: new Set(["Solara's Rest"]),
      playerName: "Sol",
    },
    world: { objects: [{ t: "farm_patch", id: "a", seed: "herb_seed", readyAt: 1, grown: false }] },
  });

  assert.equal(payload.ver, 5);
  assert.equal(payload.travelerSigil, "SIG-2");
  assert.deepEqual(payload.visitedRegions, ["Solara's Rest"]);
  assert.equal(payload.farmPatches.length, 1);
});

test("shared-world trust helpers clamp public write payloads", () => {
  const echo = sanitizeEchoPayload({
    player_name: "  Bad <b>Name</b>  ",
    traveler_sigil: " sig ",
    kind: "script",
    headline: "visit https://bad.example",
    summary: "ok",
    wave_reached: 99999,
    faction: "void",
  });
  assert.equal(echo.player_name, "Adventurer");
  assert.equal(echo.kind, "oracle");
  assert.equal(echo.headline, "An echo stirred in Solara.");
  assert.equal(echo.wave_reached, 999);
  assert.equal(echo.faction, "neutral");
  assert.equal(sanitizeReaction("commend"), "commend");
  assert.equal(sanitizeReaction("spam"), null);

  const score = sanitizeDailyScorePayload({ player_name: "", wave_reached: 80, faction: "eclipser" });
  assert.equal(score.player_name, "Adventurer");
  assert.equal(score.wave_reached, 30);

  const grave = sanitizeGravePayload({ player_name: "Sol", epitaph: "<img>", x: -50, y: 120, wave_reached: -1 });
  assert.equal(grave.epitaph, "They fell without words.");
  assert.equal(grave.x, 0);
  assert.equal(grave.y, 99);
  assert.equal(grave.wave_reached, 0);
});

test("world runtime scales monsters and merchant prices from snapshot", () => {
  const snapshot = getSharedWorldSnapshot({
    sunBrightness: 8,
    totalDeaths: 5000,
    leaderboard: [{ faction: "eclipser" }, { faction: "eclipser" }, { faction: "sunkeeper" }],
    echoes: [],
  });
  const mon = applyMonsterWorldState({ hp: 100, mhp: 100, atk: 10, def: 8, str: 10, xp: 40 }, snapshot, "dungeon");
  assert.ok(mon.hp > 100);
  assert.ok(getMerchantPriceScale(snapshot, 0) > 1);
  assert.ok(getMerchantPriceScale(snapshot, 25) < getMerchantPriceScale(snapshot, 0));
  assert.equal(mon.worldScale >= snapshot.director.mechanics.enemyScale, true);
});

test("world runtime exposes combat bonuses and reset", () => {
  const player = { echoAtkBonus: 1, echoStrBonus: 2, echoDefBonus: 3, echoLuckBonus: 4 };
  assert.deepEqual(getCombatBonuses(player), { attack: 1, strength: 2, defence: 3, luck: 4 });
  resetRunScopedBonuses(player);
  assert.deepEqual(getCombatBonuses(player), { attack: 0, strength: 0, defence: 0, luck: 0 });
});

test("dynamic world event responds to snapshot pressure", () => {
  const eclipse = getDynamicWorldEvent(
    getSharedWorldSnapshot({ sunBrightness: 5, totalDeaths: 2000, leaderboard: [], echoes: [] }),
  );
  assert.equal(eclipse.type, "umbra_surge");
});

test("grave constellations and rituals summarize grave pressure", () => {
  const graves = Array.from({ length: 8 }, (_, index) => ({
    x: 10 + (index % 3),
    y: 20 + (index % 2),
    sunstone_offerings: 10,
    epitaph: `grave-${index}`,
  }));
  const constellations = buildGraveConstellations(graves);
  const ritual = buildCommunityRitual(graves, { severity: 3 });
  assert.equal(constellations[0].tier, "major");
  assert.equal(ritual.totalOfferings, 80);
});

test("shared world snapshot surfaces prophecy, ritual, rival, and constellations", () => {
  const snapshot = getSharedWorldSnapshot({
    sunBrightness: 18,
    totalDeaths: 3200,
    leaderboard: [{ faction: "eclipser" }],
    echoes: [{ id: "echo-1", player_name: "Other", traveler_sigil: "SIG", kind: "roguelite", wave_reached: 14, commend_count: 2 }],
    graves: Array.from({ length: 5 }, (_, index) => ({ x: 8 + index, y: 12, sunstone_offerings: 20, epitaph: "ash" })),
    playerName: "Self",
    dayNumber: 9,
  });
  assert.equal(snapshot.crisis.title, "Eclipse Protocol");
  assert.equal(snapshot.rival.playerName, "Other");
  assert.equal(snapshot.prophecy.options.length, 3);
  assert.ok(snapshot.constellations.length >= 1);
});

test("prophecy deck and death memory card are deterministic and shareable", () => {
  const prophecy = buildProphecyDeck({ dayNumber: 4, playerName: "Sol", faction: "sunkeeper", phaseId: "twilight" });
  const memory = createDeathMemoryCard({ playerName: "Sol", sigil: "SOL-1", waveReached: 12, faction: "sunkeeper", sunBrightness: 42, eventLabel: "Gravewind", constellationName: "The Field of the Fallen" });
  assert.equal(prophecy.active.id, prophecy.options[0].id);
  assert.match(memory, /SOLARA: DEATH MEMORY/);
  assert.match(memory, /The Field of the Fallen/);
});

test("objective guidance prioritizes ritual offerings when the player can help the world", () => {
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
  const player = {
    x: 20,
    y: 28,
    quests: { cook: 2, rune: 2, relic: 2, awakening: 2 },
    relicParts: 0,
    jadKills: 0,
  };
  const objective = getObjectiveState({
    player,
    isFreshAdventurer: false,
    dailyRun: null,
    rogueRun: null,
    sharedWorld,
    hasSunstoneShard: true,
  });
  assert.match(objective.title, /Support/);
  assert.equal(objective.tab, "daily");

  const label = getGuideStepLabel({
    player,
    isFreshAdventurer: false,
    dailyRun: null,
    rogueRun: null,
    sharedWorld,
    hasSunstoneShard: true,
  });
  assert.match(label, /offer your Sunstone Shard/i);
});

test("world action items surface crisis, ritual, and rival priorities", () => {
  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: 14,
    totalDeaths: 4200,
    leaderboard: [{ faction: "eclipser" }],
    echoes: [{ id: "echo-rival", player_name: "Other", traveler_sigil: "SIG", kind: "roguelite", wave_reached: 18, commend_count: 3 }],
    graves: [{ x: 12, y: 12, sunstone_offerings: 30, epitaph: "fall" }],
    playerName: "Self",
  });
  const actions = getWorldActionItems({ sharedWorld, hasSunstoneShard: true });
  assert.ok(actions.length >= 3);
  assert.equal(actions[0].title, sharedWorld.crisis.title);
  assert.match(actions[1].detail, /Sunstone Shard/i);
  assert.match(actions[2].title, /Rival/);
});

test("offerSunstoneRecord marks shrine thresholds without requiring live backend", async () => {
  const shrine = await offerSunstoneRecord({
    supabase: null,
    grave: { id: 1, sunstone_offerings: 49, is_shrine: false, is_major_shrine: false },
  });
  assert.equal(shrine.newOff, 50);
  assert.equal(shrine.becameShrine, true);
  assert.equal(shrine.becameMajorShrine, false);

  const major = await offerSunstoneRecord({
    supabase: null,
    grave: { id: 2, sunstone_offerings: 199, is_shrine: true, is_major_shrine: false },
  });
  assert.equal(major.newOff, 200);
  assert.equal(major.becameMajorShrine, true);
});

test("reactToEchoRecord validates reactions before accepting them", async () => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(key) {
      return this.store.has(key) ? this.store.get(key) : null;
    },
    setItem(key, value) {
      this.store.set(key, String(value));
    },
    removeItem(key) {
      this.store.delete(key);
    },
  };

  const accepted = await reactToEchoRecord({ supabase: null, echoId: "echo-1", reaction: "commend" });
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.reaction, "commend");

  const duplicate = await reactToEchoRecord({ supabase: null, echoId: "echo-1", reaction: "commend" });
  assert.equal(duplicate.accepted, false);

  const invalid = await reactToEchoRecord({ supabase: null, echoId: "echo-2", reaction: "spam" });
  assert.equal(invalid.accepted, false);
});

test("shared-world writes prefer Supabase RPCs before table fallback", async () => {
  const calls = [];
  const supabase = {
    rpc(name, args) {
      calls.push({ type: "rpc", name, args });
      return Promise.resolve({ data: { id: 1 }, error: null });
    },
    from(table) {
      calls.push({ type: "from", table });
      throw new Error("table fallback should not run");
    },
  };

  const scoreAccepted = await submitDailyScoreRecord({
    supabase,
    playerName: "Sol",
    waveReached: 99,
    faction: "eclipser",
    dateSeed: "solara-test",
    season: 1,
  });
  const graveAccepted = await submitGraveRecord({
    supabase,
    grave: { player_name: "Sol", traveler_sigil: "SIG", epitaph: "<b>fall</b>", x: -4, y: 200, faction: "bad", wave_reached: 1000 },
    season: 1,
    dateSeed: "solara-test",
  });

  assert.equal(scoreAccepted, true);
  assert.equal(graveAccepted, true);
  assert.equal(calls[0].name, "submit_daily_score");
  assert.equal(calls[0].args.payload.wave_reached, 30);
  assert.equal(calls[1].name, "submit_grave");
  assert.equal(calls[1].args.payload.x, 0);
  assert.equal(calls[1].args.payload.y, 99);
});

test("shared-world writes fall back to legacy table writes when RPC is unavailable", async () => {
  const calls = [];
  const tableApi = {
    insert(payload) {
      calls.push({ type: "insert", payload });
      return {
        select() {
          return {
            single() {
              return Promise.resolve({ data: { id: "row-1" }, error: null });
            },
          };
        },
      };
    },
  };
  const supabase = {
    rpc(name) {
      calls.push({ type: "rpc", name });
      return Promise.resolve({ data: null, error: { message: "missing function" } });
    },
    from(table) {
      calls.push({ type: "from", table });
      return tableApi;
    },
  };

  const accepted = await submitRemoteEcho({
    supabase,
    echo: { player_name: "Echo", traveler_sigil: "SIG", kind: "daily", headline: "hello", summary: "world", wave_reached: 8, faction: "sunkeeper" },
    season: 1,
    dateSeed: "solara-test",
  });

  assert.equal(accepted, true);
  assert.equal(calls[0].name, "submit_player_echo");
  assert.equal(calls[1].table, "player_echoes");
  assert.equal(calls[2].payload.wave_reached, 8);
});
