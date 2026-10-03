import { createClient } from "@supabase/supabase-js";
import { getSecret } from "./lib/secrets.mjs";
import { SHARED_WORLD_RPC_CONTRACTS, SHARED_WORLD_TABLES } from "../src/game/backendContract.js";

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

const url = getSupabaseUrl(await getSecret("VITE_SUPABASE_URL", "solara.supabase.verify"));
const anonKey = await getSecret("VITE_SUPABASE_ANON_KEY", "solara.supabase.verify");

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const checks = [
  ...(await Promise.all(SHARED_WORLD_TABLES.map((table) => tableReadCheck(supabase, table)))),
  ...(await Promise.all(SHARED_WORLD_RPC_CONTRACTS.map((contract) =>
    rpcExistsCheck(supabase, contract.name, contract.args, contract.expectedExistingMessage),
  ))),
];

const deployed = checks.every((check) => check.ok);
console.log(JSON.stringify({ deployed, checks }, null, 2));

if (!deployed) {
  process.exit(1);
}
