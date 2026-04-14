function withDirection(player, target) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dir = `${dy < 0 ? "N" : dy > 0 ? "S" : ""}${dx > 0 ? "E" : dx < 0 ? "W" : ""}` || "HERE";
  return {
    ...target,
    distance: Math.abs(dx) + Math.abs(dy),
    dir,
  };
}

export function getGuideStepLabel({ player, isFreshAdventurer, dailyRun, rogueRun, sharedWorld, hasSunstoneShard }) {
  if (!player) {
    return "Booting world...";
  }
  if (dailyRun && !dailyRun.done) {
    return `Daily Rite active: ${sharedWorld.director.dailyModifier.label} is shaping today's rooms. Head to the dungeon entrance.`;
  }
  if (rogueRun && !rogueRun.done) {
    return `Roguelite active: ${sharedWorld.director.pressure} sun pressure is changing enemy behavior.`;
  }
  if (isFreshAdventurer) {
    return "Suggested start: equip your sword, talk to Mara, finish Mara's Hearth, then start the Daily Rite.";
  }
  if (hasSunstoneShard && sharedWorld.ritual.progress < 1 && sharedWorld.constellations[0]) {
    return `Best world move: offer your Sunstone Shard at ${sharedWorld.constellations[0].name || "the largest grave cluster"} to push ${sharedWorld.ritual.title}.`;
  }
  if (sharedWorld.rival) {
    return `High-value target: answer ${sharedWorld.rival.playerName}'s rival echo during your next run.`;
  }
  return `Suggested start: open Daily Rites. Sun Director: ${sharedWorld.director.dailyModifier.label}.`;
}

export function getObjectiveState({ player, isFreshAdventurer, dailyRun, rogueRun, sharedWorld, hasSunstoneShard }) {
  if (!player) {
    return null;
  }

  let target = {
    title: "Open Daily Rites",
    detail: "The shared-world loop is strongest when you start the daily dungeon.",
    x: 8,
    y: 55,
    tab: "daily",
    accent: "#f0c060",
  };

  if (dailyRun && !dailyRun.done) {
    target = {
      title: `Daily Rite · Wave ${dailyRun.wave + 1}`,
      detail: "Reach the dungeon entrance south of The Mine and clear the next wave.",
      x: 8,
      y: 55,
      tab: "daily",
      accent: "#f0c060",
    };
  } else if (rogueRun && !rogueRun.done) {
    target = {
      title: `Roguelite Push · Wave ${rogueRun.wave + 1}`,
      detail: "Return to the dungeon entrance to continue your run and secure another relic chance.",
      x: 8,
      y: 55,
      tab: "daily",
      accent: "#c8a0ff",
    };
  } else if (isFreshAdventurer) {
    target = {
      title: "Talk to Mara",
      detail: "Start Mara's Hearth in Solara's Rest, then cook your first meal and enter the Daily Rite.",
      x: 24,
      y: 28,
      tab: "quest",
      accent: "#d8a86a",
      steps: ["Open Gear and equip your sword.", "Talk to Mara in Solara's Rest.", "Gather egg, milk, and flour.", "Finish the quest, then open Daily Rites."],
    };
  } else if ((player.quests?.cook || 0) === 1) {
    target = {
      title: "Mara's Hearth",
      detail: "Bring Mara an egg, bucket of milk, and flour to finish your first town quest.",
      x: 24,
      y: 28,
      tab: "quest",
      accent: "#d8a86a",
      steps: ["Find the ingredients around Solara's Rest.", "Return to Mara for Cooking XP and coins.", "Use the reward to start today's shared run."],
    };
  } else if ((player.quests?.rune || 0) === 1) {
    target = {
      title: "Rune Mystery",
      detail: "Dark Wizards in the Ashlands hold the air runes Sedridor wants.",
      x: 35,
      y: 3,
      tab: "quest",
      accent: "#8aa8ff",
    };
  } else if ((player.quests?.relic || 0) === 1) {
    target = {
      title: "Lost Relic",
      detail: `Collect relic parts (${player.relicParts || 0}/3) and return to the Archaeologist in The Sanctum.`,
      x: 22,
      y: 12,
      tab: "quest",
      accent: "#c8a84e",
    };
  } else if ((player.quests?.awakening || 0) === 1) {
    target = {
      title: "Final Awakening",
      detail: `Defeat the Cinderwake Colossus three times (${player.jadKills || 0}/3) before the season goes dark.`,
      x: 64,
      y: 90,
      tab: "quest",
      accent: "#ff7440",
    };
  } else if (hasSunstoneShard && sharedWorld.ritual.progress < 1 && sharedWorld.constellations[0]) {
    const cluster = sharedWorld.constellations[0];
    target = {
      title: `Support ${cluster.name || "the grave cluster"}`,
      detail: `Offer your Sunstone Shard to push ${sharedWorld.ritual.title}. The world is ${Math.round(sharedWorld.ritual.progress * 100)}% of the way to relief.`,
      x: cluster.x,
      y: cluster.y,
      tab: "daily",
      accent: "#c8a84e",
      steps: ["Open the map and locate the marked grave cluster.", "Travel there with a Sunstone Shard in inventory.", "Offer the shard to increase ritual progress and shrine pressure."],
    };
  } else if (sharedWorld.rival) {
    target = {
      title: `Answer ${sharedWorld.rival.playerName}`,
      detail: `${sharedWorld.rival.headline} Start a run and hunt the rival intrusion for boosted rewards.`,
      x: 8,
      y: 55,
      tab: "daily",
      accent: "#f0a060",
      steps: ["Open Daily Rites or Roguelite.", "Push until the rival intrudes.", "Defeat the rival for extra spoils and a stronger chronicle."],
    };
  }

  return withDirection(player, target);
}

export function getWorldActionItems({ sharedWorld, hasSunstoneShard }) {
  const actions = [
    {
      title: sharedWorld.crisis.title,
      detail: sharedWorld.crisis.detail,
      accent: sharedWorld.phase.accent,
    },
    {
      title: `${sharedWorld.ritual.title} · ${Math.round(sharedWorld.ritual.progress * 100)}%`,
      detail: hasSunstoneShard
        ? "You have a Sunstone Shard right now. One offering will immediately move the communal ritual."
        : sharedWorld.ritual.rewardLabel,
      accent: "#c8a84e",
    },
  ];

  if (sharedWorld.rival) {
    actions.push({
      title: `${sharedWorld.rival.icon} Rival: ${sharedWorld.rival.playerName}`,
      detail: sharedWorld.rival.rewardText,
      accent: "#f0a060",
    });
  } else if (sharedWorld.prophecy?.active) {
    actions.push({
      title: `Prophecy: ${sharedWorld.prophecy.active.title}`,
      detail: sharedWorld.prophecy.active.text,
      accent: sharedWorld.prophecy.active.accent || "#c8a0ff",
    });
  }

  return actions;
}
