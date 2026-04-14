import {
  appendLocalEcho,
  loadLocalEchoes,
  recordEchoReactionLocal,
} from "./clientStore.js";
import {
  sanitizeDailyScorePayload,
  sanitizeOfferingCount,
  sanitizeReaction,
} from "./trust.js";

export async function fetchEchoFeed({ supabase, limit = 12, localLimit = 24 }) {
  const localEchoes = loadLocalEchoes(localLimit);
  if (!supabase) {
    return localEchoes.slice(0, limit);
  }
  const { data } = await supabase
    .from("player_echoes")
    .select("id,player_name,traveler_sigil,kind,headline,summary,wave_reached,faction,created_at,commend_count,heed_count,mourn_count")
    .order("created_at", { ascending: false })
    .limit(limit);
  const merged = [...(data || [])];
  localEchoes.forEach((echo) => {
    if (!merged.some((entry) => entry.id === echo.id)) {
      merged.push(echo);
    }
  });
  merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return merged.slice(0, limit);
}

export function persistLocalEcho(echo, limit = 24) {
  return appendLocalEcho(echo, limit);
}

export async function submitRemoteEcho({ supabase, echo, season, dateSeed }) {
  if (!supabase) {
    return false;
  }
  await supabase.from("player_echoes").insert({
    player_name: echo.player_name,
    traveler_sigil: echo.traveler_sigil,
    kind: echo.kind,
    headline: echo.headline,
    summary: echo.summary,
    wave_reached: echo.wave_reached,
    faction: echo.faction,
    season,
    date_seed: dateSeed,
  });
  return true;
}

export async function reactToEchoRecord({ supabase, echoId, reaction }) {
  const safeReaction = sanitizeReaction(reaction);
  if (!safeReaction || !echoId) {
    return { accepted: false, reaction: null };
  }
  if (!recordEchoReactionLocal(echoId, safeReaction)) {
    return { accepted: false, reaction: safeReaction };
  }
  if (supabase && !String(echoId).startsWith("echo-")) {
    await supabase.rpc("react_to_echo", { p_echo_id: echoId, p_reaction: safeReaction });
  }
  return { accepted: true, reaction: safeReaction };
}

export async function fetchDailyLeaderboardRecords({ supabase, dateSeed, limit = 10 }) {
  if (!supabase) {
    return [];
  }
  const { data } = await supabase
    .from("daily_scores")
    .select("player_name,wave_reached,faction")
    .eq("date_seed", dateSeed)
    .order("wave_reached", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function submitDailyScoreRecord({ supabase, playerName, waveReached, faction, dateSeed, season }) {
  if (!supabase) {
    return false;
  }
  const score = sanitizeDailyScorePayload({
    player_name: playerName,
    wave_reached: waveReached,
    faction,
  });
  await supabase.from("daily_scores").insert({ ...score, date_seed: dateSeed, season });
  return true;
}

export async function fetchSunStateRecord({ supabase }) {
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.from("sun_state").select("brightness,total_deaths").single();
  return data || null;
}

export async function fetchGraveRecords({ supabase, season, limit = 200 }) {
  if (!supabase) {
    return [];
  }
  const { data } = await supabase
    .from("graves")
    .select("id,player_name,epitaph,x,y,faction,wave_reached,season,date_seed,created_at,sunstone_offerings,is_shrine,is_major_shrine")
    .eq("season", season)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function submitGraveRecord({ supabase, grave, season, dateSeed }) {
  if (!supabase) {
    return false;
  }
  await supabase.from("graves").insert({ ...grave, season, date_seed: dateSeed });
  return true;
}

export async function incrementDeathCounterRecord({ supabase }) {
  if (!supabase) {
    return false;
  }
  await supabase.rpc("increment_death_counter");
  return true;
}

export async function offerSunstoneRecord({ supabase, grave }) {
  const newOff = sanitizeOfferingCount((grave?.sunstone_offerings || 0) + 1);
  const update = { sunstone_offerings: newOff };
  let becameShrine = false;
  let becameMajorShrine = false;

  if (newOff >= 200 && !grave?.is_major_shrine) {
    update.is_major_shrine = true;
    update.is_shrine = true;
    becameMajorShrine = true;
  } else if (newOff >= 50 && !grave?.is_shrine) {
    update.is_shrine = true;
    becameShrine = true;
  }

  if (supabase && grave?.id != null) {
    await supabase.from("graves").update(update).eq("id", grave.id);
  }

  return {
    update,
    newOff,
    becameShrine,
    becameMajorShrine,
  };
}
