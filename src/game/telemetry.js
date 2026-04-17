export const TELEMETRY_SCHEMA_VERSION = 1;

export const TELEMETRY_EVENTS = {
  DAILY_RITE_START: "daily_rite_start",
  DAILY_RITE_END: "daily_rite_end",
  ROGUELITE_START: "roguelite_start",
  ROGUELITE_END: "roguelite_end",
  FIRST_QUEST_COMPLETE: "first_quest_complete",
  SUNSTONE_OFFERING: "sunstone_offering",
  SHARE_COPY: "share_copy",
  SAVE_IMPORT_REPAIRED: "save_import_repaired",
  BACKEND_WRITE_REJECTED: "backend_write_rejected",
};

function countRisk(sharedWorld = {}) {
  const pressure = Number(sharedWorld?.phase?.severity || 0);
  const ritualGap = 1 - Number(sharedWorld?.ritual?.progress || 0);
  const rivalRisk = sharedWorld?.rival ? 1 : 0;
  return Math.max(0, Math.min(10, Math.round(pressure * 1.7 + ritualGap * 2 + rivalRisk)));
}

export function buildTelemetryPlan({ sharedWorld, objectiveState = null, backendConnected = false } = {}) {
  const mechanics = sharedWorld?.director?.mechanics;
  return {
    schema_version: TELEMETRY_SCHEMA_VERSION,
    privacy: "public-safe aggregates only; no raw saves, private notes, credentials, or internal ops data",
    recommended_events: [
      TELEMETRY_EVENTS.DAILY_RITE_START,
      TELEMETRY_EVENTS.DAILY_RITE_END,
      TELEMETRY_EVENTS.SUNSTONE_OFFERING,
      TELEMETRY_EVENTS.SHARE_COPY,
      TELEMETRY_EVENTS.BACKEND_WRITE_REJECTED,
    ],
    funnels: {
      activation: ["menu_play", TELEMETRY_EVENTS.DAILY_RITE_START, TELEMETRY_EVENTS.DAILY_RITE_END],
      retention: [TELEMETRY_EVENTS.DAILY_RITE_START, TELEMETRY_EVENTS.SUNSTONE_OFFERING, TELEMETRY_EVENTS.SHARE_COPY],
      recovery: [TELEMETRY_EVENTS.SAVE_IMPORT_REPAIRED, TELEMETRY_EVENTS.BACKEND_WRITE_REJECTED],
    },
    dimensions: {
      backend_connected: !!backendConnected,
      pressure: sharedWorld?.director?.pressure || "unknown",
      phase: sharedWorld?.phase?.id || "unknown",
      daily_modifier: sharedWorld?.director?.dailyModifier?.id || "unknown",
      next_best_action: objectiveState?.title || sharedWorld?.crisis?.title || "unknown",
      tags: mechanics?.telemetryTags || [],
    },
    risk_score: countRisk(sharedWorld),
  };
}

export function buildStudioIntegrationContract({ sharedWorld, objectiveState = null, backendConnected = false } = {}) {
  const telemetry = buildTelemetryPlan({ sharedWorld, objectiveState, backendConnected });
  return {
    schema_version: 2,
    refresh_seconds: 300,
    studio_hub: {
      card_status: sharedWorld?.phase?.label || "Unknown",
      card_subtitle: sharedWorld?.summary || "The sun waits for a signal.",
      next_action: objectiveState?.title || sharedWorld?.crisis?.title || "Open Daily Rites",
    },
    social_dashboard: {
      headline: sharedWorld?.summary || "Solara: Sunfall",
      directive: sharedWorld?.crisis?.title || "Build The Chronicle",
      tags: telemetry.dimensions.tags,
      share_prompt: sharedWorld?.crisis?.detail || "Enter today's Daily Rite.",
    },
    sparkfunnel: {
      conversion_event: TELEMETRY_EVENTS.DAILY_RITE_START,
      retention_event: TELEMETRY_EVENTS.SUNSTONE_OFFERING,
      reactivation_event: TELEMETRY_EVENTS.SHARE_COPY,
      audience_state: telemetry.risk_score >= 7 ? "crisis" : telemetry.risk_score >= 4 ? "warming" : "stable",
    },
    telemetry,
  };
}
