function compactText(value, fallback = "") {
  return String(value || fallback).replace(/[<>`]/g, "").replace(/\s+/g, " ").trim();
}

function feedItem(id, kind, title, detail, priority, accent, action = null) {
  return {
    id,
    kind,
    title: compactText(title, "World signal"),
    detail: compactText(detail, "The chronicle shifts."),
    priority,
    accent,
    action,
  };
}

export function buildWorldFeed({
  sharedWorld,
  latestRun = null,
  backendConnected = false,
  graveCount = 0,
  echoCount = 0,
} = {}) {
  if (!sharedWorld) {
    return [];
  }

  const feed = [
    feedItem(
      "crisis",
      "directive",
      sharedWorld.crisis?.title || "Build The Chronicle",
      sharedWorld.crisis?.detail || sharedWorld.summary,
      sharedWorld.crisis?.priority || 5,
      sharedWorld.phase?.accent || "#f0c060",
      { type: "tab", tab: "daily", label: "Open Daily Rite" },
    ),
    feedItem(
      "ritual",
      "ritual",
      `${sharedWorld.ritual?.title || "Lantern Tithe"} · ${Math.round(Number(sharedWorld.ritual?.progress || 0) * 100)}%`,
      sharedWorld.ritual?.rewardLabel || "Offer Sunstone Shards to shift the season.",
      sharedWorld.ritual?.completed ? 9 : Number(sharedWorld.ritual?.progress || 0) >= 0.75 ? 8 : 6,
      "#c8a84e",
      { type: "map", tab: "daily", target: sharedWorld.constellations?.[0] ? { x: sharedWorld.constellations[0].x, y: sharedWorld.constellations[0].y } : null, label: "Find Offering Target" },
    ),
  ];

  if (latestRun?.done) {
    const wave = Number(latestRun.deathWave || 0);
    feed.push(feedItem(
      "latest-run",
      "run",
      wave >= 30 ? "Daily Rite Cleared" : `Run Ended at Wave ${wave}`,
      wave >= 30
        ? "A clear strengthens the public chronicle and faction signal."
        : "A fall still feeds grave pressure, memory, and the next best route.",
      wave >= 30 ? 9 : 7,
      wave >= 30 ? "#d8b64c" : "#d86a4c",
      { type: "tab", tab: "daily", label: wave >= 30 ? "Compare Result" : "Review Run" },
    ));
  }

  if (sharedWorld.rival) {
    feed.push(feedItem(
      "rival",
      "rival",
      `${sharedWorld.rival.icon} ${sharedWorld.rival.playerName}`,
      sharedWorld.rival.rewardText,
      8,
      "#f0a060",
      { type: "tab", tab: "daily", label: "Hunt Rival" },
    ));
  }

  if (sharedWorld.constellations?.[0]) {
    const top = sharedWorld.constellations[0];
    feed.push(feedItem(
      "constellation",
      "grave_constellation",
      top.name || "Grave Cluster Forming",
      `${top.size} graves near (${top.x}, ${top.y}) with ${top.offerings} offerings.`,
      top.tier === "legendary" ? 10 : top.tier === "major" ? 8 : 6,
      "#bfa0ff",
      { type: "map", tab: "daily", target: { x: top.x, y: top.y }, label: "Route to Graves" },
    ));
  }

  feed.push(feedItem(
    "world-link",
    backendConnected ? "live_link" : "local_fallback",
    backendConnected ? "Live World Link" : "Local Chronicle",
    backendConnected
      ? `${graveCount} graves and ${echoCount} echoes are available to public surfaces.`
      : "The game remains playable; public writes wait for backend activation.",
    backendConnected ? 5 : 4,
    backendConnected ? "#7fd37f" : "#c68856",
    { type: "tab", tab: "settings", label: backendConnected ? "View Link" : "Backend Setup" },
  ));

  return feed.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
