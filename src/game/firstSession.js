export function getFirstSessionPlan({ player = null, isFreshAdventurer = false, playedDailyToday = false, backendConnected = false } = {}) {
  if (!player) {
    return null;
  }

  const hasWeapon = !!player.eq?.weapon;
  const cookQuest = Number(player.quests?.cook || 0);
  const hasDailySignal = playedDailyToday;
  const steps = [
    {
      id: "equip",
      label: "Equip A Weapon",
      done: hasWeapon,
      tab: "gear",
      detail: hasWeapon ? "Your first route can survive basic combat." : "Open Gear and equip the starter sword before leaving town.",
    },
    {
      id: "mara",
      label: "Meet Mara",
      done: cookQuest > 0,
      tab: "quest",
      x: 24,
      y: 28,
      detail: cookQuest > 0 ? "Mara's Hearth is underway." : "Talk to Mara in Solara's Rest to anchor the first town story.",
    },
    {
      id: "hearth",
      label: "Finish Mara's Hearth",
      done: cookQuest >= 2,
      tab: "quest",
      x: 24,
      y: 28,
      detail: cookQuest >= 2 ? "The first town task is complete." : "Gather egg, milk, and flour, then return to Mara.",
    },
    {
      id: "daily",
      label: "Enter Today's Rite",
      done: hasDailySignal,
      tab: "daily",
      x: 8,
      y: 55,
      detail: hasDailySignal ? "Today's shared-world signal is recorded." : "Start the Daily Rite so the first session reaches a shared-world consequence.",
    },
  ];
  const next = steps.find((step) => !step.done) || steps.at(-1);

  return {
    title: isFreshAdventurer ? "First Myth" : "Return Route",
    summary: backendConnected
      ? "Reach the Daily Rite quickly so your first actions join the live chronicle."
      : "Reach the Daily Rite quickly; live publication waits for backend activation.",
    complete: steps.every((step) => step.done),
    next,
    steps,
  };
}
