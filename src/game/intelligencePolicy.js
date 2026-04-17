export const AI_GENERATION_MODE = "deterministic";
export const AI_POLICY_VERSION = 2;

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}

export function buildAiPolicy({
  season = 1,
  dayNumber = 1,
  sunBrightness = 100,
  totalDeaths = 0,
  topRunCount = 0,
  graveCount = 0,
  echoCount = 0,
  serverGenerationEnabled = false,
  maxServerTokensPerDay = 0,
} = {}) {
  const safeSeason = Math.max(1, Math.floor(Number(season) || 1));
  const safeDay = Math.max(1, Math.floor(Number(dayNumber) || 1));
  const brightness = Math.round(clampNumber(sunBrightness, 0, 100, 100));
  const deaths = Math.max(0, Math.floor(Number(totalDeaths) || 0));
  const runs = Math.max(0, Math.floor(Number(topRunCount) || 0));
  const graves = Math.max(0, Math.floor(Number(graveCount) || 0));
  const echoes = Math.max(0, Math.floor(Number(echoCount) || 0));
  const dailyBudget = Math.max(0, Math.floor(Number(maxServerTokensPerDay) || 0));
  const paidAllowed = !!serverGenerationEnabled && dailyBudget > 0;

  return {
    version: AI_POLICY_VERSION,
    browser_token_cost: 0,
    generation_mode: AI_GENERATION_MODE,
    paid_generation_allowed: paidAllowed,
    server_generation: {
      allowed: paidAllowed,
      max_tokens_per_day: dailyBudget,
      cache_required: true,
      fallback: "deterministic_chronicle",
      input_policy: "structured_public_state_only",
    },
    cache_key: `season:${safeSeason}:day:${safeDay}:sun:${brightness}:deaths:${deaths}:runs:${runs}:graves:${graves}:echoes:${echoes}`,
  };
}

export function buildIntelligenceDigest({ sharedWorld, objectiveState = null, aiPolicy = null } = {}) {
  const mechanics = sharedWorld?.director?.mechanics;
  const pressure = sharedWorld?.director?.pressure || "Stable";
  const ritual = sharedWorld?.ritual;
  const crisis = sharedWorld?.crisis;
  const rival = sharedWorld?.rival;

  return {
    headline: sharedWorld?.summary || "Solara awaits a signal.",
    read: [
      `${pressure} pressure is active.`,
      crisis ? `${crisis.title}: ${crisis.detail}` : "No crisis directive is active.",
      ritual ? `${ritual.title} is ${Math.round(Number(ritual.progress || 0) * 100)}% complete.` : "No ritual state is available.",
      rival ? `${rival.playerName}'s rival echo is active.` : "No rival echo is active.",
    ],
    next_best_action: objectiveState?.title || crisis?.title || "Open Daily Rites",
    tuning: mechanics
      ? {
          enemy_scale: mechanics.enemyScale,
          merchant_scale: mechanics.merchantScale,
          reward_multiplier: mechanics.rewardMultiplier,
          tags: mechanics.telemetryTags,
        }
      : null,
    token_policy: aiPolicy || buildAiPolicy(),
  };
}
