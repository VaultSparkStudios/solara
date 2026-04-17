import { getSessionDelta, getSharedWorldBriefing } from "./feedback.js";
import { buildConstellationObjectives } from "./constellationObjectives.js";
import { buildAiPolicy, buildIntelligenceDigest } from "./intelligencePolicy.js";
import { getDailyRitePlan } from "./directorMechanics.js";
import { getSharedWorldSnapshot } from "./sharedWorld.js";
import { buildStudioIntegrationContract } from "./telemetry.js";
import { buildWorldFeed } from "./worldFeed.js";

function sortByWave(entries = []) {
  return [...entries].sort((a, b) => Number(b?.wave_reached || 0) - Number(a?.wave_reached || 0));
}

function safeEntryText(value, fallback = "") {
  return String(value || fallback).replace(/[<>`]/g, "").replace(/\s+/g, " ").trim();
}

function summarizeFaction(entries = []) {
  const counts = { sunkeeper: 0, eclipser: 0, neutral: 0 };
  entries.forEach((entry) => {
    const faction = entry?.faction === "sunkeeper" || entry?.faction === "eclipser" ? entry.faction : "neutral";
    counts[faction] += 1;
  });
  return counts;
}

export function buildPublicChronicle({
  generatedAt = new Date().toISOString(),
  season = 1,
  seasonName = "The Wandering Comet",
  sunState = {},
  leaderboard = [],
  graves = [],
  echoes = [],
  dayNumber = 1,
} = {}) {
  const brightness = Math.max(0, Math.min(100, Number(sunState.brightness ?? 100)));
  const totalDeaths = Math.max(0, Math.floor(Number(sunState.total_deaths ?? sunState.totalDeaths ?? 0)));
  const topRuns = sortByWave(leaderboard).slice(0, 5).map((entry, index) => ({
    rank: index + 1,
    player_name: safeEntryText(entry.player_name, "Adventurer").slice(0, 16),
    wave_reached: Math.max(0, Math.floor(Number(entry.wave_reached || 0))),
    faction: entry.faction === "sunkeeper" || entry.faction === "eclipser" ? entry.faction : "neutral",
  }));
  const publicGraves = graves.slice(0, 8).map((grave) => ({
    player_name: safeEntryText(grave.player_name, "Unknown").slice(0, 16),
    epitaph: safeEntryText(grave.epitaph, "They fell without words.").slice(0, 80),
    wave_reached: Math.max(0, Math.floor(Number(grave.wave_reached || 0))),
    faction: grave.faction === "sunkeeper" || grave.faction === "eclipser" ? grave.faction : "neutral",
    sunstone_offerings: Math.max(0, Math.floor(Number(grave.sunstone_offerings || 0))),
    is_shrine: !!grave.is_shrine || Number(grave.sunstone_offerings || 0) >= 50,
    is_major_shrine: !!grave.is_major_shrine || Number(grave.sunstone_offerings || 0) >= 200,
  }));
  const publicEchoes = echoes.slice(0, 6).map((echo) => ({
    player_name: safeEntryText(echo.player_name, "Adventurer").slice(0, 16),
    kind: safeEntryText(echo.kind, "oracle").slice(0, 24),
    headline: safeEntryText(echo.headline, "An echo stirred in Solara.").slice(0, 96),
    wave_reached: Math.max(0, Math.floor(Number(echo.wave_reached || 0))),
    faction: echo.faction === "sunkeeper" || echo.faction === "eclipser" ? echo.faction : "neutral",
    reactions: {
      commend: Math.max(0, Math.floor(Number(echo.commend_count || 0))),
      heed: Math.max(0, Math.floor(Number(echo.heed_count || 0))),
      mourn: Math.max(0, Math.floor(Number(echo.mourn_count || 0))),
    },
  }));

  const sharedWorld = getSharedWorldSnapshot({
    sunBrightness: brightness,
    totalDeaths,
    leaderboard: topRuns,
    echoes: publicEchoes,
    graves: publicGraves,
    dayNumber,
  });
  const briefing = getSharedWorldBriefing({
    sharedWorld,
    backendConnected: true,
    objectiveState: { title: sharedWorld.crisis.title },
  });
  const delta = getSessionDelta({
    sharedWorld,
    playedDailyToday: topRuns.length > 0,
    backendConnected: true,
    objectiveState: { title: sharedWorld.crisis.title },
    echoCount: publicEchoes.length,
    graveCount: publicGraves.length,
  });
  const aiPolicy = buildAiPolicy({
    season,
    dayNumber,
    sunBrightness: brightness,
    totalDeaths,
    topRunCount: topRuns.length,
    graveCount: publicGraves.length,
    echoCount: publicEchoes.length,
  });
  const integrationContract = buildStudioIntegrationContract({
    sharedWorld,
    objectiveState: { title: sharedWorld.crisis.title },
    backendConnected: true,
  });
  const intelligence = buildIntelligenceDigest({
    sharedWorld,
    objectiveState: { title: sharedWorld.crisis.title },
    aiPolicy,
  });
  const worldFeed = buildWorldFeed({
    sharedWorld,
    backendConnected: true,
    graveCount: publicGraves.length,
    echoCount: publicEchoes.length,
  });
  const dailyRitePlan = getDailyRitePlan({ sharedWorld, dayNumber });
  const constellationObjectives = buildConstellationObjectives({ sharedWorld, hasSunstoneShard: false });

  return {
    schema_version: 1,
    generated_at: generatedAt,
    season,
    season_name: seasonName,
    status: {
      sun_brightness: brightness,
      total_deaths: totalDeaths,
      phase: sharedWorld.phase.label,
      pressure: sharedWorld.director.pressure,
      faction_counts: summarizeFaction(topRuns),
      grave_count: publicGraves.length,
      shrine_count: publicGraves.filter((grave) => grave.is_shrine).length,
      echo_count: publicEchoes.length,
    },
    shared_world: {
      summary: sharedWorld.summary,
      crisis: sharedWorld.crisis,
      ritual: sharedWorld.ritual,
      director: {
        pressure: sharedWorld.director.pressure,
        daily_modifier: sharedWorld.director.dailyModifier,
        faction_objective: sharedWorld.director.factionObjective,
        mechanics: sharedWorld.director.mechanics,
      },
      briefing,
      delta,
      feed: worldFeed,
      intelligence,
      daily_rite_plan: dailyRitePlan,
      constellation_objectives: constellationObjectives.slice(0, 5),
    },
    top_runs: topRuns,
    graves: publicGraves,
    echoes: publicEchoes,
    social_hooks: {
      headline: briefing.headline,
      call_to_action: sharedWorld.crisis.detail,
      share_text: `${sharedWorld.summary} — ${sharedWorld.crisis.title}. Play Solara: Sunfall.`,
      discord_command_hint: "/sun /leaderboard /graves /prophecy",
      twitch_panel_line: `${sharedWorld.phase.label} · ${sharedWorld.director.pressure} · ${publicGraves.length} graves`,
    },
    integrations: {
      schema_version: integrationContract.schema_version,
      studio_hub: {
        status_path: "/status.json",
        chronicle_path: "/chronicle.json",
        recommended_refresh_seconds: 300,
        card_status: integrationContract.studio_hub.card_status,
        next_action: integrationContract.studio_hub.next_action,
      },
      social_dashboard: {
        headline: briefing.headline,
        directive: sharedWorld.crisis.title,
        tags: sharedWorld.director.mechanics.telemetryTags,
        share_prompt: integrationContract.social_dashboard.share_prompt,
      },
      sparkfunnel: {
        primary_hook: sharedWorld.crisis.detail,
        conversion_event: integrationContract.sparkfunnel.conversion_event,
        retention_event: integrationContract.sparkfunnel.retention_event,
        reactivation_event: integrationContract.sparkfunnel.reactivation_event,
        audience_state: integrationContract.sparkfunnel.audience_state,
      },
      telemetry: integrationContract.telemetry,
    },
    ai_policy: aiPolicy,
  };
}
