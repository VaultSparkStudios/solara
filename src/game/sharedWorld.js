import { buildSharedWorldSystems } from "./innovationSystems.js";
import { getDirectorGameplayPlan } from "./directorMechanics.js";

export function getSunPhase(sunBrightness) {
  const value = Math.max(0, Math.min(100, Number(sunBrightness) || 0));
  if (value > 80) {
    return { id: "full_dawn", label: "Full Dawn", accent: "#f0c060", severity: 0 };
  }
  if (value > 60) {
    return { id: "amber_warning", label: "Amber Warning", accent: "#d88a36", severity: 1 };
  }
  if (value > 40) {
    return { id: "twilight", label: "The Twilight", accent: "#b06048", severity: 2 };
  }
  if (value > 20) {
    return { id: "dimming", label: "The Dimming", accent: "#8a3040", severity: 3 };
  }
  return { id: "eclipse", label: "The Eclipse", accent: "#7040a0", severity: 4 };
}

export function getFactionBalance(entries = []) {
  const counts = { sunkeeper: 0, eclipser: 0, neutral: 0 };
  for (const entry of entries) {
    const faction = entry?.faction === "sunkeeper" || entry?.faction === "eclipser" ? entry.faction : "neutral";
    counts[faction] += 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [leader, leaderCount] = ranked[0];
  const [, secondCount] = ranked[1];
  return {
    counts,
    leader,
    leadMargin: leaderCount - secondCount,
    contested: leaderCount === secondCount,
  };
}

export function getEchoBlessing(echoes = []) {
  const recent = echoes.slice(0, 3);
  if (!recent.length) {
    return null;
  }
  const weights = { attack: 0, defence: 0, prayer: 0, luck: 0 };
  for (const echo of recent) {
    if (echo?.kind === "roguelite") {
      weights.attack += 2;
    } else if (echo?.kind === "death") {
      weights.defence += 2;
    } else {
      weights.prayer += 1;
      weights.luck += 1;
    }
    if (echo?.commend_count > echo?.mourn_count) {
      weights.luck += 1;
    }
    if (echo?.mourn_count > echo?.commend_count) {
      weights.defence += 1;
    }
  }
  const [type, score] = Object.entries(weights).sort((a, b) => b[1] - a[1])[0];
  if (!score) {
    return null;
  }
  const map = {
    attack: { id: "emberspur", label: "Emberspur", description: "+1 Strength and Attack for your next run.", bonus: { atk: 1, str: 1 } },
    defence: { id: "graveward", label: "Graveward", description: "+2 Defence and +4 max HP for your next run.", bonus: { def: 2, hp: 4 } },
    prayer: { id: "oracle_hum", label: "Oracle Hum", description: "+3 max Prayer for your next run.", bonus: { pray: 3 } },
    luck: { id: "fortune_ash", label: "Fortune Ash", description: "A drifting boon of luck and momentum.", bonus: { luck: 1 } },
  };
  return map[type];
}

export function getSunDirectorPlan(phase, faction, event) {
  const severity = phase?.severity || 0;
  const factionLeader = faction?.contested ? "contested" : faction?.leader || "neutral";
  const pressure =
    severity >= 4
      ? "Emergency"
      : severity >= 3
        ? "High"
        : severity >= 2
          ? "Rising"
          : "Stable";
  const dailyModifiers = {
    full_dawn: { id: "clear_routes", label: "Clear Routes", effect: "Daily Rite rooms favor recovery, scouting, and predictable enemy packs." },
    amber_warning: { id: "amber_tax", label: "Amber Tax", effect: "Merchants tighten prices and late waves add extra coin rewards." },
    twilight: { id: "mirror_graves", label: "Mirror Graves", effect: "Grave clusters are more likely to seed warnings, rivals, and shrine routes." },
    dimming: { id: "ash_pressure", label: "Ash Pressure", effect: "Enemies hit harder, but ritual offerings push back more world pressure." },
    eclipse: { id: "sunless_edict", label: "Sunless Edict", effect: "Rivals and crisis encounters intensify. Surviving deep waves pays out better." },
  };
  const factionObjective =
    factionLeader === "sunkeeper"
      ? "Sunkeepers are stabilizing supply routes. Keep the lead by completing runs and funding shrines."
      : factionLeader === "eclipser"
        ? "Eclipsers are darkening the roads. Push deeper waves to claim the season's harder rewards."
        : factionLeader === "contested"
          ? "Faction pressure is tied. One strong Daily Rite can swing today's world tone."
          : "No faction controls the day. Any run can define the next pulse.";
  return {
    pressure,
    dailyModifier: dailyModifiers[phase?.id] || dailyModifiers.full_dawn,
    ambience:
      severity >= 4
        ? "The sky should feel wrong: darker roads, sharper warnings, and urgent shrine calls."
        : severity >= 3
          ? "Ash and gravewind should color the map, with stronger calls toward offerings."
          : severity >= 2
            ? "The world should hint at instability without blocking normal play."
            : "The world should feel open, readable, and generous to new routes.",
    npcTone:
      severity >= 3
        ? "NPCs warn about falling light, grave clusters, and the cost of reckless deaths."
        : "NPCs point players toward useful work, daily runs, and shrine offerings.",
    musicCue:
      severity >= 4 ? "eclipse_alarm" : severity >= 3 ? "gravewind_low" : severity >= 2 ? "twilight_pulse" : "dawn_route",
    factionObjective,
    eventLabel: event?.label || "Steady Flame",
  };
}

export function getSharedWorldSnapshot({
  sunBrightness,
  totalDeaths,
  leaderboard = [],
  echoes = [],
  graves = [],
  playerName = "Adventurer",
  dayNumber = 1,
  now = new Date(),
}) {
  const phase = getSunPhase(sunBrightness);
  const faction = getFactionBalance(leaderboard);
  const blessing = getEchoBlessing(echoes);
  const month = now.getMonth() + 1;

  let event = {
    id: "steady_flame",
    label: "Steady Flame",
    icon: "☀️",
    description: "The season is stable. Trade and travel remain predictable.",
    enemyScale: 1,
    merchantScale: 1,
  };

  if (phase.id === "eclipse") {
    event = {
      id: "umbra_surge",
      label: "Umbra Surge",
      icon: "🌑",
      description: "The last light is failing. Hostile forces surge and roguelite pushes grow harsher.",
      enemyScale: 1.16,
      merchantScale: 1.08,
    };
  } else if (phase.id === "dimming") {
    event = {
      id: "gravewind",
      label: "Gravewind",
      icon: "🕯️",
      description: "Fresh graves stir the world. Echoes carry stronger warnings into the next run.",
      enemyScale: 1.08,
      merchantScale: 1.04,
    };
  } else if (faction.leader === "sunkeeper" && !faction.contested) {
    event = {
      id: "sunkeeper_convoy",
      label: "Sunkeeper Convoy",
      icon: "☀️",
      description: "Sunkeeper pressure stabilizes trade routes. Supplies cost less and recovery is easier.",
      enemyScale: 0.98,
      merchantScale: 0.92,
    };
  } else if (faction.leader === "eclipser" && !faction.contested) {
    event = {
      id: "eclipser_omen",
      label: "Eclipser Omen",
      icon: "🌘",
      description: "Eclipser influence darkens the roads. Enemies harden and prices drift upward.",
      enemyScale: 1.1,
      merchantScale: 1.06,
    };
  } else if (month === 10) {
    event = {
      id: "harvest_pyre",
      label: "Harvest Pyre",
      icon: "🔥",
      description: "Seasonal pyres draw wanderers and relic-seekers. Crafting routes feel unusually alive.",
      enemyScale: 1.03,
      merchantScale: 0.97,
    };
  }

  const baseSnapshot = {
    phase,
    faction,
    blessing,
    event,
  };
  const systems = buildSharedWorldSystems({
    graves,
    echoes,
    playerName,
    dayNumber,
    snapshot: baseSnapshot,
  });

  if (systems.ritual.completed) {
    event = {
      ...event,
      id: `${event.id}_ritualized`,
      description: `${event.description} A completed communal ritual softens the world and strengthens blessings.`,
      enemyScale: Number((event.enemyScale * 0.97).toFixed(3)),
      merchantScale: Number((event.merchantScale * 0.94).toFixed(3)),
    };
  }

  const director = getSunDirectorPlan(phase, faction, event);
  const mechanics = getDirectorGameplayPlan({
    sharedWorld: {
      phase,
      faction,
      ritual: systems.ritual,
      rival: systems.rival,
      constellations: systems.constellations,
    },
    director,
    event,
  });
  event = {
    ...event,
    director,
    dailyModifier: director.dailyModifier,
    pressure: director.pressure,
  };

  const summaryParts = [
    `${event.icon} ${event.label}`,
    phase.label,
    `${Number(totalDeaths || 0).toLocaleString()} fallen`,
  ];
  if (systems.rival) {
    summaryParts.push(`${systems.rival.icon} Rival: ${systems.rival.playerName}`);
  }
  if (systems.constellations[0]?.name) {
    summaryParts.push(`✝ ${systems.constellations[0].name}`);
  }

  return {
    phase,
    faction,
    blessing,
    event,
    crisis: systems.crisis,
    ritual: systems.ritual,
    rival: systems.rival,
    prophecy: systems.prophecy,
    constellations: systems.constellations,
    director: {
      ...director,
      mechanics,
    },
    summary: summaryParts.join(" · "),
  };
}

export function applyRunBlessing(player, blessing) {
  if (!player || !blessing?.bonus) {
    return;
  }
  const bonus = blessing.bonus;
  if (bonus.hp) {
    player.hp = Math.min(player.mhp, player.hp + bonus.hp);
  }
  if (bonus.pray) {
    player.prayer = Math.min(player.maxPrayer, player.prayer + bonus.pray);
  }
  if (bonus.atk) {
    player.echoAtkBonus = (player.echoAtkBonus || 0) + bonus.atk;
  }
  if (bonus.str) {
    player.echoStrBonus = (player.echoStrBonus || 0) + bonus.str;
  }
  if (bonus.def) {
    player.echoDefBonus = (player.echoDefBonus || 0) + bonus.def;
  }
  if (bonus.luck) {
    player.echoLuckBonus = (player.echoLuckBonus || 0) + bonus.luck;
  }
}
