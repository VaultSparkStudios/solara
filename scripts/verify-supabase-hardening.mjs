import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function readDotEnv(path = ".env.local") {
  if (!existsSync(path)) {
    return {};
  }
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index);
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function getSupabaseUrl(value) {
  if (!value) {
    return "";
  }
  return value.startsWith("http") ? value : `https://${value}.supabase.co`;
}

async function tableReadCheck(supabase, table) {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true }).limit(1);
  return {
    surface: `table:${table}:read`,
    ok: !error,
    code: error?.code || null,
    message: error?.message || null,
  };
}

async function rpcExistsCheck(supabase, name, args, expectedExistingMessage) {
  const { error } = await supabase.rpc(name, args);
  const message = error?.message || "";
  const missing = error?.code === "PGRST202" || /Could not find the function/i.test(message);
  return {
    surface: `rpc:${name}:exists`,
    ok: !!error && !missing && expectedExistingMessage.test(message),
    deployed: !missing,
    code: error?.code || null,
    message: message ? message.slice(0, 180) : null,
  };
}

const env = { ...readDotEnv(), ...process.env };
const url = getSupabaseUrl(env.VITE_SUPABASE_URL);
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const checks = [
  await tableReadCheck(supabase, "daily_scores"),
  await tableReadCheck(supabase, "graves"),
  await tableReadCheck(supabase, "sun_state"),
  await tableReadCheck(supabase, "player_echoes"),
  await rpcExistsCheck(
    supabase,
    "react_to_echo",
    { p_echo_id: "__verify_no_row__", p_reaction: "__invalid__" },
    /Invalid echo reaction/i,
  ),
  await rpcExistsCheck(
    supabase,
    "offer_sunstone",
    { p_grave_id: "__verify_no_row__", p_traveler_sigil: "VERIFY" },
    /Grave not found|invalid input/i,
  ),
];

const deployed = checks.every((check) => check.ok);
console.log(JSON.stringify({ deployed, checks }, null, 2));

if (!deployed) {
  process.exit(1);
}
