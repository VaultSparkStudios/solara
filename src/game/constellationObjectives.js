function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function routeDistance(player = {}, target = {}) {
  return Math.abs(Number(player.x || 0) - Number(target.x || 0)) + Math.abs(Number(player.y || 0) - Number(target.y || 0));
}

export function buildConstellationObjective(cluster, { player = null, hasSunstoneShard = false, ritual = null, faction = "neutral" } = {}) {
  if (!cluster) {
    return null;
  }

  const shrineProgress = clamp(Number(cluster.offerings || 0) / 50, 0, 1);
  const majorProgress = clamp(Number(cluster.offerings || 0) / 200, 0, 1);
  const canOffer = !!hasSunstoneShard && !ritual?.completed;
  const distance = player ? routeDistance(player, cluster) : null;
  const tierValue = cluster.tier === "legendary" ? 5 : cluster.tier === "major" ? 4 : cluster.tier === "minor" ? 3 : 1;
  const urgency = clamp(
    tierValue + (canOffer ? 2 : 0) + (ritual && ritual.progress >= 0.75 && !ritual.completed ? 2 : 0) - (distance != null && distance > 60 ? 1 : 0),
    1,
    10,
  );

  return {
    id: `constellation:${cluster.key}`,
    title: cluster.name || "Grave Cluster",
    detail: canOffer
      ? `Offer a Sunstone Shard here to push ${ritual?.title || "the communal rite"} and strengthen this landmark.`
      : cluster.blessing
        ? `${cluster.blessing.label} can shape future runs from this landmark.`
        : "This cluster is not yet strong enough to grant a landmark blessing.",
    x: cluster.x,
    y: cluster.y,
    tab: "daily",
    accent: "#bfa0ff",
    tier: cluster.tier,
    size: cluster.size,
    offerings: cluster.offerings,
    distance,
    urgency,
    faction,
    shrineProgress,
    majorProgress,
    canOffer,
    reward: cluster.blessing?.label || (majorProgress >= 1 ? "Major shrine pressure" : shrineProgress >= 1 ? "Shrine pressure" : "Landmark growth"),
    steps: canOffer
      ? ["Open the map and route to the grave cluster.", "Reach the marked graves with a Sunstone Shard.", "Offer the shard to advance the ritual and strengthen the landmark."]
      : ["Visit the landmark when routing a Daily Rite.", "React to nearby echoes or return with a Sunstone Shard.", "Use the cluster as a future shrine route."],
  };
}

export function buildConstellationObjectives({ sharedWorld, player = null, hasSunstoneShard = false } = {}) {
  const clusters = sharedWorld?.constellations || [];
  return clusters
    .map((cluster) => buildConstellationObjective(cluster, {
      player,
      hasSunstoneShard,
      ritual: sharedWorld?.ritual,
      faction: sharedWorld?.faction?.leader || "neutral",
    }))
    .filter(Boolean)
    .sort((a, b) => b.urgency - a.urgency || b.offerings - a.offerings || (a.distance ?? 9999) - (b.distance ?? 9999));
}
