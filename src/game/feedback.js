export function getSharedWorldBriefing({
  sharedWorld,
  hasSunstoneShard = false,
  backendConnected = false,
  playedDailyToday = false,
  objectiveState = null,
}) {
  const cards = [
    {
      id: "pressure",
      accent: sharedWorld.phase.accent,
      title: `${sharedWorld.crisis.title} · ${sharedWorld.director.pressure}`,
      detail: sharedWorld.director.dailyModifier.effect,
    },
    {
      id: "ritual",
      accent: "#c8a84e",
      title: `${sharedWorld.ritual.title} · ${Math.round(sharedWorld.ritual.progress * 100)}%`,
      detail: hasSunstoneShard
        ? "You already carry a Sunstone Shard. One offering will move the communal ritual immediately."
        : `${sharedWorld.ritual.totalOfferings}/${sharedWorld.ritual.target} offerings recorded. ${sharedWorld.ritual.rewardLabel}`,
    },
  ];

  if (sharedWorld.rival) {
    cards.push({
      id: "rival",
      accent: "#f0a060",
      title: `${sharedWorld.rival.icon} Rival: ${sharedWorld.rival.playerName}`,
      detail: sharedWorld.rival.rewardText,
    });
  } else if (sharedWorld.prophecy?.active) {
    cards.push({
      id: "prophecy",
      accent: sharedWorld.prophecy.active.accent || "#c8a0ff",
      title: `Prophecy: ${sharedWorld.prophecy.active.title}`,
      detail: sharedWorld.prophecy.active.text,
    });
  }

  cards.push({
    id: "best-move",
    accent: backendConnected ? "#7fd37f" : "#c68856",
    title: backendConnected ? "Live World Link Active" : "Local Chronicle Fallback",
    detail: objectiveState
      ? `${playedDailyToday ? "Next best move" : "Best opening move"}: ${objectiveState.title}.`
      : backendConnected
        ? "Live async world hooks are available."
        : "Shared-world systems fall back to local-only echoes until Supabase is configured.",
  });

  return {
    headline: sharedWorld.summary,
    detail: sharedWorld.event.description,
    blessing: sharedWorld.blessing?.label || null,
    cards,
  };
}

export function getRunDebrief({
  mode,
  run,
  sharedWorld,
  objectiveState = null,
  hasSunstoneShard = false,
}) {
  if (!run?.done) {
    return null;
  }

  const isDaily = mode === "daily";
  const cleared = Number(run.deathWave || 0) >= 30;
  const accent = isDaily ? (cleared ? "#da0" : "#f44") : cleared ? "#c8a0ff" : "#f090c8";
  const modeLabel = isDaily ? "Daily Rite" : "Roguelite";
  const result = cleared ? `${modeLabel} Cleared` : `${modeLabel} Ended at Wave ${run.deathWave || 0}`;
  let impact = isDaily
    ? "Your result feeds today's communal leaderboard and faction balance."
    : "Your run strengthens your private legacy while still feeding Solara's larger chronicle.";

  if (!cleared && hasSunstoneShard) {
    impact += " The strongest recovery move is to convert your next shard into ritual progress.";
  } else if (sharedWorld.rival && !cleared) {
    impact += ` ${sharedWorld.rival.playerName}'s rival pressure is still active.`;
  } else if (sharedWorld.blessing) {
    impact += ` Next run boon: ${sharedWorld.blessing.label}.`;
  }

  const nextStep = objectiveState
    ? `${objectiveState.title}: ${objectiveState.detail}`
    : isDaily
      ? "Open the Daily Rite again when you're ready to push the season forward."
      : "Start another Roguelite push once you want another relic attempt.";
  const personalGain = cleared
    ? "Bank the clear, compare the day, then route the next run around the active modifier."
    : "Use the fall as information: adjust gear, answer the strongest world pressure, and push one wave deeper.";
  const communalGain = sharedWorld.ritual.completed
    ? "The community ritual is complete, so the next useful contribution is a stronger daily result or rival answer."
    : hasSunstoneShard
      ? `Offering your shard is the fastest direct contribution to ${sharedWorld.ritual.title}.`
      : "A better run result, grave memory, or echo reaction will still strengthen the public chronicle.";
  const nextActions = [
    {
      label: "Personal",
      detail: personalGain,
      accent: accent,
    },
    {
      label: "World",
      detail: communalGain,
      accent: "#c8a84e",
    },
    {
      label: "Director",
      detail: sharedWorld.director.mechanics?.objective || sharedWorld.director.dailyModifier.effect,
      accent: sharedWorld.phase.accent,
    },
  ];

  return {
    accent,
    result,
    impact,
    nextStep,
    nextActions,
    highlights: [
      isDaily ? "Communal leaderboard signal recorded." : "Private legacy pressure updated.",
      `${sharedWorld.director.dailyModifier.label}: ${sharedWorld.director.mechanics?.objective || sharedWorld.director.dailyModifier.effect}`,
      sharedWorld.ritual.completed
        ? "The communal ritual is complete; future runs receive softer pressure."
        : `${sharedWorld.ritual.title} is ${Math.round(sharedWorld.ritual.progress * 100)}% complete.`,
      sharedWorld.rival ? `Rival pressure remains: ${sharedWorld.rival.playerName}.` : sharedWorld.director.factionObjective,
    ],
    socialPrompt: `${result}. ${sharedWorld.summary}. ${objectiveState?.title || sharedWorld.crisis.title}.`,
    followup:
      sharedWorld.constellations[0]?.name && !cleared
        ? `The nearest high-pressure grave cluster is ${sharedWorld.constellations[0].name}.`
        : sharedWorld.director.factionObjective,
  };
}

export function getSessionDelta({
  sharedWorld,
  dailyRun = null,
  rogueRun = null,
  playedDailyToday = false,
  backendConnected = false,
  objectiveState = null,
  echoCount = 0,
  graveCount = 0,
}) {
  if (!sharedWorld) {
    return null;
  }

  const dailyDone = !!dailyRun?.done;
  const rogueDone = !!rogueRun?.done;
  const latestRun = dailyDone ? dailyRun : rogueDone ? rogueRun : null;
  const latestMode = dailyDone ? "Daily Rite" : rogueDone ? "Roguelite" : null;
  const latestWave = Number(latestRun?.deathWave || 0);

  const cards = [
    {
      id: "sun",
      label: "World Pressure",
      value: `${sharedWorld.phase.label} / ${sharedWorld.director.pressure}`,
      detail: sharedWorld.director.dailyModifier.effect,
      accent: sharedWorld.phase.accent,
    },
    {
      id: "ritual",
      label: "Ritual Progress",
      value: `${Math.round(sharedWorld.ritual.progress * 100)}%`,
      detail: `${sharedWorld.ritual.totalOfferings}/${sharedWorld.ritual.target} offerings. ${sharedWorld.ritual.rewardLabel}`,
      accent: "#c8a84e",
    },
  ];

  if (latestRun) {
    cards.unshift({
      id: "latest-run",
      label: "Latest Run",
      value: latestWave >= 30 ? `${latestMode} cleared` : `${latestMode} wave ${latestWave}`,
      detail: latestWave >= 30
        ? "Your clear strengthens today's public chronicle and faction signal."
        : "Your fall still feeds the world state, grave pressure, and next-run guidance.",
      accent: latestWave >= 30 ? "#d8b64c" : "#d86a4c",
    });
  } else if (!playedDailyToday) {
    cards.unshift({
      id: "opening",
      label: "Opening Move",
      value: "Daily Rite unplayed",
      detail: "A first run gives the day its strongest personal and communal signal.",
      accent: "#f0c060",
    });
  }

  if (sharedWorld.rival) {
    cards.push({
      id: "rival",
      label: "Rival Signal",
      value: sharedWorld.rival.playerName,
      detail: sharedWorld.rival.rewardText,
      accent: "#f0a060",
    });
  }

  cards.push({
    id: "link",
    label: backendConnected ? "Live Link" : "Local Mode",
    value: backendConnected ? `${graveCount} graves / ${echoCount} echoes` : "offline-safe",
    detail: backendConnected
      ? "Public graves, echoes, scores, and sun pressure are available for this session."
      : "The game stays playable locally; public shared-world writes wait for backend activation.",
    accent: backendConnected ? "#7fd37f" : "#c68856",
  });

  return {
    title: latestRun ? "Session Delta" : "World Delta",
    summary: objectiveState
      ? `Next best move: ${objectiveState.title}.`
      : sharedWorld.summary,
    cards,
  };
}
