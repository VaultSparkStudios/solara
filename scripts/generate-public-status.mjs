import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPublicChronicle } from "../src/game/chronicle.js";

const publicDir = join(process.cwd(), "public");
const generatedAt = new Date().toISOString();
const season = Number(process.env.VITE_SEASON_NUMBER || 1);
const seasonName = process.env.VITE_SEASON_NAME || "The Wandering Comet";

const chronicle = buildPublicChronicle({
  generatedAt,
  season,
  seasonName,
  sunState: {
    brightness: 100,
    total_deaths: 0,
  },
  leaderboard: [],
  graves: [],
  echoes: [],
  dayNumber: Math.max(1, Math.floor(Date.now() / 86400000)),
});

const status = {
  schema_version: chronicle.schema_version,
  generated_at: chronicle.generated_at,
  season: chronicle.season,
  season_name: chronicle.season_name,
  status: chronicle.status,
  shared_world: {
    summary: chronicle.shared_world.summary,
    crisis: chronicle.shared_world.crisis,
    ritual: chronicle.shared_world.ritual,
    director: chronicle.shared_world.director,
  },
  ai_policy: chronicle.ai_policy,
};

await mkdir(publicDir, { recursive: true });
await writeFile(join(publicDir, "chronicle.json"), `${JSON.stringify(chronicle, null, 2)}\n`, "utf8");
await writeFile(join(publicDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`, "utf8");

console.log("generate-public-status: wrote public/chronicle.json and public/status.json");
