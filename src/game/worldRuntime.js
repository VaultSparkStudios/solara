export function getMerchantPriceScale(snapshot, merchantRep = 0) {
  const base = snapshot?.director?.mechanics?.merchantScale || snapshot?.event?.merchantScale || 1;
  const repDiscount = merchantRep >= 25 ? 0.85 : merchantRep >= 10 ? 0.9 : 1;
  const ritualDiscount = snapshot?.ritual?.completed ? 0.95 : 1;
  return base * repDiscount * ritualDiscount;
}

export function getCombatBonuses(player = {}) {
  return {
    attack: Number(player.echoAtkBonus || 0),
    strength: Number(player.echoStrBonus || 0),
    defence: Number(player.echoDefBonus || 0),
    luck: Number(player.echoLuckBonus || 0),
  };
}

export function resetRunScopedBonuses(player) {
  if (!player) {
    return;
  }
  player.echoAtkBonus = 0;
  player.echoStrBonus = 0;
  player.echoDefBonus = 0;
  player.echoLuckBonus = 0;
}

export function applyMonsterWorldState(monster, snapshot, context = "world") {
  if (!monster) {
    return monster;
  }
  const enemyScale = snapshot?.director?.mechanics?.enemyScale || snapshot?.event?.enemyScale || 1;
  const phaseSeverity = snapshot?.phase?.severity || 0;
  const dungeonScale = context === "dungeon" ? 1 + phaseSeverity * 0.03 : 1;
  const factionScale =
    snapshot?.faction?.leader === "eclipser" && !snapshot?.faction?.contested
      ? 1.04
      : snapshot?.faction?.leader === "sunkeeper" && !snapshot?.faction?.contested && context === "world"
        ? 0.98
        : 1;
  const crisisScale = 1 + (snapshot?.crisis?.priority >= 9 ? 0.03 : 0);
  const ritualScale = snapshot?.ritual?.completed ? 0.98 : 1;
  const rivalScale = monster?.isEchoRival ? snapshot?.rival?.bonusScale || 1.12 : 1;
  const scale = enemyScale * dungeonScale * factionScale * crisisScale * ritualScale * rivalScale;
  monster.worldScale = Number(scale.toFixed(3));
  monster.hp = Math.max(1, Math.round(monster.hp * scale));
  monster.mhp = Math.max(1, Math.round(monster.mhp * scale));
  monster.atk = Math.max(1, Math.round(monster.atk * Math.max(1, scale * 0.92)));
  monster.def = Math.max(0, Math.round(monster.def * Math.max(1, scale * 0.86)));
  monster.str = Math.max(1, Math.round(monster.str * Math.max(1, scale * 0.92)));
  monster.xp = Math.max(1, Math.round(monster.xp * Math.max(1, scale * 0.9)));
  monster.worldStateTag = snapshot?.event?.id || "steady_flame";
  if (monster?.isEchoRival && snapshot?.rival) {
    monster.nm = `${snapshot.rival.playerName}'s ${snapshot.rival.title}`;
    monster.echoSigil = snapshot.rival.sigil;
    monster.examine = `${snapshot.rival.headline} Sigil: ${snapshot.rival.sigil}.`;
  }
  return monster;
}

export function getDynamicWorldEvent(snapshot) {
  const phase = snapshot?.phase?.id || "full_dawn";
  const leader = snapshot?.faction?.leader || "neutral";
  if (phase === "eclipse") {
    return {
      type: "umbra_surge",
      msg: "🌑 Umbra Surge: shadow creatures spill across the roads.",
      duration: 120000,
      monsterName: "Necromancer",
      count: 4,
    };
  }
  if (phase === "dimming") {
    return {
      type: "gravewind",
      msg: "🕯️ Gravewind: the dead stir near old battle paths.",
      duration: 120000,
      monsterName: "Skeleton",
      count: 4,
    };
  }
  if (leader === "sunkeeper" && !snapshot?.faction?.contested) {
    return {
      type: "sunkeeper_convoy",
      msg: "☀️ A Sunkeeper convoy reaches town with discounted supplies.",
      duration: 120000,
      merchant: true,
    };
  }
  if (leader === "eclipser" && !snapshot?.faction?.contested) {
    return {
      type: "eclipser_omen",
      msg: "🌘 Eclipser Omen: hostile raiders shadow the frontier.",
      duration: 120000,
      monsterName: "Bandit",
      count: 5,
    };
  }
  if (snapshot?.rival) {
    return {
      type: "echo_rival",
      msg: `⚔️ ${snapshot.rival.playerName}'s echo is hunting the frontier.`,
      duration: 120000,
      monsterName: snapshot.rival.monsterName,
      count: 1,
    };
  }
  return {
    type: "merchant",
    msg: "⚠️ A Desert Merchant has appeared near The Amber District for 2 minutes!",
    duration: 120000,
    merchant: true,
  };
}
