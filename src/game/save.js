export function safeNum(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

export function sanitizeText(value, maxLen, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }
  const clean = value.replace(/\s+/g, " ").trim().slice(0, maxLen);
  return clean || fallback;
}

export function migrateSaveData(raw, saveVersion) {
  const issues = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { data: raw, issues };
  }

  const fromVersion = Number.isFinite(Number(raw.ver)) ? Number(raw.ver) : 0;
  const migrated = { ...raw };

  if (fromVersion < saveVersion) {
    issues.push(`Save migrated from v${fromVersion || "unknown"} to v${saveVersion}.`);
  }

  if (!migrated.rep || typeof migrated.rep !== "object" || Array.isArray(migrated.rep)) {
    migrated.rep = { guard: 0, merchant: 0, bandit: 0 };
    issues.push("Missing reputation data was restored.");
  }
  if (!migrated.rogueliteStats || typeof migrated.rogueliteStats !== "object" || Array.isArray(migrated.rogueliteStats)) {
    migrated.rogueliteStats = { bestWave: 0, totalRuns: 0, relics: [] };
    issues.push("Missing roguelite stats were restored.");
  }
  if (!Array.isArray(migrated.activePrayers)) {
    migrated.activePrayers = [];
  }
  if (!Array.isArray(migrated.codex)) {
    migrated.codex = [];
  }
  if (!Array.isArray(migrated.sideQuests)) {
    migrated.sideQuests = [];
  }

  migrated.ver = saveVersion;
  return { data: migrated, issues };
}

export function buildSavePayload({ player, world, saveVersion, fallbackSigil = "NO-SIGIL" } = {}) {
  if (!player) {
    return null;
  }
  return {
    ver: saveVersion,
    sk: player.sk,
    inv: player.inv,
    eq: player.eq,
    bank: player.bank,
    hp: player.hp,
    mhp: player.mhp,
    prayer: player.prayer,
    maxPrayer: player.maxPrayer,
    quests: player.quests,
    desertKills: player.desertKills,
    goblinKills: player.goblinKills || 0,
    totalXp: player.totalXp,
    x: player.x,
    y: player.y,
    runE: player.runE,
    achievements: player.achievements,
    autoRetaliate: player.autoRetaliate,
    slayerTask: player.slayerTask,
    haunted: player.haunted,
    jogreKills: player.jogreKills,
    demonKills: player.demonKills,
    jadKills: player.jadKills,
    relicParts: player.relicParts,
    buffs: player.buffs,
    ironman: player.ironman,
    visitedRegions: [...(player.visitedRegions || [])],
    cookCount: player.cookCount,
    activePrayers: player.activePrayers || [],
    shipmentFish: player.shipmentFish || 0,
    iceWarriorKills: player.iceWarriorKills || 0,
    monsterKills: player.monsterKills || {},
    pet: player.pet,
    questPoints: player.questPoints || 0,
    unlocks: player.unlocks || [],
    rep: player.rep || { guard: 0, merchant: 0, bandit: 0 },
    lastFireTile: player.lastFireTile,
    prestige: player.prestige || {},
    farmPatches: world?.objects?.filter((o) => o.t === "farm_patch").map((o) => ({ id: o.id, seed: o.seed, readyAt: o.readyAt, grown: o.grown })),
    playerName: player.playerName || "Adventurer",
    travelerSigil: player.travelerSigil || fallbackSigil,
    camp: player.camp,
    campBank: player.campBank || [],
    appearance: player.appearance || { skin: "#f0d8a0", hair: "#333", outfit: "#2266cc" },
    codex: player.codex || [],
    sideQuests: player.sideQuests || [],
    dailyChallengeProgress: player.dailyChallengeProgress || 0,
    rogueliteStats: player.rogueliteStats || { bestWave: 0, totalRuns: 0, relics: [] },
  };
}

export function createSaveSanitizer({ items, saveVersion }) {
  const sanitizeItemStack = (stack) => {
    if (!stack || typeof stack !== "object" || typeof stack.i !== "string" || !items[stack.i]) {
      return null;
    }
    return {
      i: stack.i,
      c: Math.max(1, Math.floor(safeNum(stack.c, 1, 1, 999999))),
    };
  };

  return function sanitizeSaveData(raw, fallbackName, fallbackSigil) {
    const issues = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        data: null,
        issues: ["Save was unreadable. Starting fresh."],
      };
    }

    const migrated = migrateSaveData(raw, saveVersion);
    issues.push(...migrated.issues);
    const source = migrated.data;

    const inv = (Array.isArray(source.inv) ? source.inv : []).map(sanitizeItemStack).filter(Boolean).slice(0, 64);
    const bank = (Array.isArray(source.bank) ? source.bank : []).map(sanitizeItemStack).filter(Boolean).slice(0, 512);
    const gear = source.eq && typeof source.eq === "object" && !Array.isArray(source.eq) ? source.eq : {};
    const rep = source.rep && typeof source.rep === "object" && !Array.isArray(source.rep) ? source.rep : {};
    const rogueliteStats =
      source.rogueliteStats && typeof source.rogueliteStats === "object" && !Array.isArray(source.rogueliteStats)
        ? source.rogueliteStats
        : {};
    const sanitized = {
      ver: saveVersion,
      sk: source.sk && typeof source.sk === "object" && !Array.isArray(source.sk) ? source.sk : {},
      inv,
      eq: {
        weapon: typeof gear.weapon === "string" && items[gear.weapon] ? gear.weapon : null,
        shield: typeof gear.shield === "string" && items[gear.shield] ? gear.shield : null,
        head: typeof gear.head === "string" && items[gear.head] ? gear.head : null,
        body: typeof gear.body === "string" && items[gear.body] ? gear.body : null,
        legs: typeof gear.legs === "string" && items[gear.legs] ? gear.legs : null,
        ring: typeof gear.ring === "string" && items[gear.ring] ? gear.ring : null,
        cape: typeof gear.cape === "string" && items[gear.cape] ? gear.cape : null,
      },
      bank,
      hp: safeNum(source.hp, 10, 1, 9999),
      mhp: safeNum(source.mhp, 10, 1, 9999),
      prayer: safeNum(source.prayer, 1, 0, 9999),
      maxPrayer: safeNum(source.maxPrayer, 1, 0, 9999),
      quests: source.quests && typeof source.quests === "object" && !Array.isArray(source.quests) ? source.quests : {},
      desertKills: safeNum(source.desertKills, 0, 0, 999999),
      goblinKills: safeNum(source.goblinKills, 0, 0, 999999),
      totalXp: safeNum(source.totalXp, 0, 0, 999999999),
      x: safeNum(source.x, 20, 0, 99),
      y: safeNum(source.y, 28, 0, 99),
      runE: safeNum(source.runE, 100, 0, 100),
      achievements: Array.isArray(source.achievements) ? source.achievements.filter((v) => typeof v === "string").slice(0, 256) : [],
      autoRetaliate: source.autoRetaliate !== false,
      slayerTask: source.slayerTask && typeof source.slayerTask === "object" ? source.slayerTask : null,
      haunted: safeNum(source.haunted, 0, 0, 999999),
      jogreKills: safeNum(source.jogreKills, 0, 0, 999999),
      demonKills: safeNum(source.demonKills, 0, 0, 999999),
      jadKills: safeNum(source.jadKills, 0, 0, 999999),
      relicParts: safeNum(source.relicParts, 0, 0, 999999),
      buffs: source.buffs && typeof source.buffs === "object" && !Array.isArray(source.buffs) ? source.buffs : {},
      ironman: !!source.ironman,
      visitedRegions: Array.isArray(source.visitedRegions) ? source.visitedRegions.filter((v) => typeof v === "string").slice(0, 256) : [],
      cookCount: safeNum(source.cookCount, 0, 0, 999999),
      activePrayers: Array.isArray(source.activePrayers) ? source.activePrayers.filter((v) => typeof v === "string").slice(0, 32) : [],
      shipmentFish: safeNum(source.shipmentFish, 0, 0, 999999),
      iceWarriorKills: safeNum(source.iceWarriorKills, 0, 0, 999999),
      monsterKills: source.monsterKills && typeof source.monsterKills === "object" && !Array.isArray(source.monsterKills) ? source.monsterKills : {},
      pet: typeof source.pet === "string" && items[source.pet] ? source.pet : null,
      questPoints: safeNum(source.questPoints, 0, 0, 999999),
      unlocks: Array.isArray(source.unlocks) ? source.unlocks.filter((v) => typeof v === "string").slice(0, 64) : [],
      rep: {
        guard: safeNum(rep.guard, 0, -999999, 999999),
        merchant: safeNum(rep.merchant, 0, -999999, 999999),
        bandit: safeNum(rep.bandit, 0, -999999, 999999),
      },
      lastFireTile: source.lastFireTile && typeof source.lastFireTile === "object" ? source.lastFireTile : null,
      prestige: source.prestige && typeof source.prestige === "object" && !Array.isArray(source.prestige) ? source.prestige : {},
      farmPatches: Array.isArray(source.farmPatches) ? source.farmPatches.filter((v) => v && typeof v === "object").slice(0, 64) : [],
      playerName: sanitizeText(source.playerName, 16, fallbackName),
      travelerSigil: sanitizeText(source.travelerSigil, 24, fallbackSigil),
      camp: source.camp && typeof source.camp === "object" ? source.camp : null,
      campBank: (Array.isArray(source.campBank) ? source.campBank : []).map(sanitizeItemStack).filter(Boolean).slice(0, 128),
      appearance: source.appearance && typeof source.appearance === "object" && !Array.isArray(source.appearance) ? source.appearance : { skin: "#f0d8a0", hair: "#333", outfit: "#2266cc" },
      codex: Array.isArray(source.codex) ? source.codex.filter((v) => typeof v === "string").slice(0, 256) : [],
      sideQuests: Array.isArray(source.sideQuests) ? source.sideQuests.filter((v) => v && typeof v === "object").slice(0, 128) : [],
      dailyChallengeProgress: safeNum(source.dailyChallengeProgress, 0, 0, 999999),
      rogueliteStats: {
        bestWave: safeNum(rogueliteStats.bestWave, 0, 0, 999999),
        totalRuns: safeNum(rogueliteStats.totalRuns, 0, 0, 999999),
        relics: Array.isArray(rogueliteStats.relics)
          ? rogueliteStats.relics.filter((v) => typeof v === "string").slice(0, 64)
          : [],
      },
    };

    if (sanitized.hp > sanitized.mhp) {
      sanitized.hp = sanitized.mhp;
      issues.push("Current HP was above max HP and was repaired.");
    }
    if (sanitized.prayer > sanitized.maxPrayer) {
      sanitized.prayer = sanitized.maxPrayer;
      issues.push("Prayer points were above max and were repaired.");
    }
    if (inv.length !== (Array.isArray(source.inv) ? source.inv.length : 0)) {
      issues.push("Some invalid inventory entries were discarded.");
    }
    if (bank.length !== (Array.isArray(source.bank) ? source.bank.length : 0)) {
      issues.push("Some invalid bank entries were discarded.");
    }

    return { data: sanitized, issues };
  };
}
