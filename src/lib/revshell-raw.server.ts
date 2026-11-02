import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { rawShell, type RevshellData } from "@/lib/revshell-raw";

let data: RevshellData | null = null;

function load(): RevshellData {
  if (data) return data;
  const code = readFileSync(join(process.cwd(), "public/revshells/js/data.js"), "utf8");
  const sandbox: { exports: { rsgData?: RevshellData } } = { exports: {} };
  vm.runInNewContext(code, sandbox, { filename: "revshells-data.js" });
  if (!sandbox.exports.rsgData) throw new Error("revshells data did not load");
  data = sandbox.exports.rsgData;
  return data;
}

export function rawShellFromQuery(input: { name: string; ip: string; port: string; shell: string; value: string | null }): string | null {
  return rawShell(load(), input);
}
