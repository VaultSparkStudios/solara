import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicChronicle } from "../src/game/chronicle.js";

test("public chronicle exports deterministic public-safe shared-world status", () => {
  const chronicle = buildPublicChronicle({
    generatedAt: "2026-04-17T00:00:00.000Z",
    season: 2,
    seasonName: "Test Season",
    sunState: { brightness: 12, total_deaths: 44 },
    leaderboard: [
      { player_name: "Sol", wave_reached: 9, faction: "sunkeeper" },
      { player_name: "<bad>", wave_reached: 14, faction: "eclipser" },
    ],
    graves: [{ player_name: "Fallen", epitaph: "<script>gone</script>", wave_reached: 7, sunstone_offerings: 55 }],
    echoes: [{ player_name: "Echo", kind: "roguelite", headline: "A rival appears", wave_reached: 12, commend_count: 2 }],
    dayNumber: 7,
  });

  assert.equal(chronicle.schema_version, 1);
  assert.equal(chronicle.season, 2);
  assert.equal(chronicle.status.phase, "The Eclipse");
  assert.equal(chronicle.top_runs[0].wave_reached, 14);
  assert.equal(chronicle.graves[0].is_shrine, true);
  assert.equal(chronicle.ai_policy.browser_token_cost, 0);
  assert.equal(chronicle.ai_policy.generation_mode, "deterministic");
  assert.equal(chronicle.ai_policy.server_generation.cache_required, true);
  assert.match(chronicle.shared_world.director.mechanics.id, /sunless_edict/);
  assert.ok(chronicle.shared_world.feed.length >= 3);
  assert.equal(chronicle.shared_world.daily_rite_plan.route.length, 6);
  assert.equal(chronicle.shared_world.daily_rite_plan.boss.wave, 30);
  assert.ok(Array.isArray(chronicle.shared_world.constellation_objectives));
  assert.equal(chronicle.shared_world.intelligence.token_policy.browser_token_cost, 0);
  assert.equal(chronicle.integrations.studio_hub.status_path, "/status.json");
  assert.equal(chronicle.integrations.sparkfunnel.retention_event, "sunstone_offering");
  assert.equal(chronicle.integrations.telemetry.schema_version, 1);
  assert.doesNotMatch(JSON.stringify(chronicle), /<script>/);
});
