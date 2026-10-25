export const QUICK_COMMUNITIES = ["public", "private", "manager", "community"] as const;
export const SSID_OID = "1.2.840.10036";
export const CISCO_SSID_OID = "1.3.6.1.4.1.14179.2.2";

const COMMUNITY = /^[A-Za-z0-9_.:@-]{1,32}$/;
const OID = /^(?:[A-Za-z][A-Za-z0-9-]{0,48}|[0-9]+(?:\.[0-9]+){1,48})$/;

export type SnmpHit = { host: string; community: string; detail: string };
export type SnmpPair = { name: string; value: string };
export type SnmpSsid = { ssid: string; index: string; where: string };
export type SnmpView = {
  kind: "onesixtyone" | "walk" | "empty";
  note: string;
  hits: SnmpHit[];
  system: SnmpPair[];
  ssids: SnmpSsid[];
  interfaces: SnmpPair[];
  listeners: SnmpPair[];
  software: string[];
  processes: string[];
  other: SnmpPair[];
  otherLeft: number;
};

export function snmpTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const target = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return null;
  const parts = target.split(".").map((part) => Number(part));
  if (parts.some((part) => part > 255)) return null;
  if (target === "0.0.0.0" || target === "255.255.255.255" || target === "169.254.169.254") return null;
  if (parts[0] >= 224 || parts[0] === 127) return null;
  return target;
}

export function communityList(value: unknown, quick: boolean): string[] | null {
  if (quick) return [...QUICK_COMMUNITIES];
  if (typeof value !== "string") return null;
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 1 || lines.length > 40) return null;
  if (!lines.every((line) => COMMUNITY.test(line))) return null;
  return lines;
}

export function snmpCommunity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return COMMUNITY.test(text) ? text : null;
}

export function snmpOid(value: unknown): string | null {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return "";
  return OID.test(text) ? text : null;
}

export function onesixtyPlan(target: string, communities: string[]): { command: string; args: string[]; communities: string[] } {
  return { command: `onesixtyone -c communities.txt ${target}`, args: ["-c", "communities.txt", target], communities };
}

export function walkPlan(target: string, version: "1" | "2c", community: string, oid: string): { command: string; args: string[] } {
  const args = ["-v", version, "-c", community, "-Oa", "-Cc", "-t", "1", "-r", "1", target];
  if (oid) args.push(oid);
  return { command: ["snmpwalk", ...args].join(" "), args };
}

const TYPE = /^(?:STRING|INTEGER|Integer32|Unsigned32|Hex-STRING|Timeticks|OID|IpAddress|Counter32|Counter64|Gauge32|Opaque|BITS|Network Address):\s*/;

function cleanValue(value: string): string {
  let text = value.trim();
  text = text.replace(/^"|"$/g, "");
  text = text.replace(/\s+/g, " ").trim();
  const status = text.match(/^([A-Za-z]+)\(\d+\)$/);
  return status ? status[1] : text;
}

function normalName(raw: string): string {
  let name = raw.trim();
  if (name.startsWith("iso.")) name = `1.${name.slice(4)}`;
  if (name.startsWith(".")) name = name.slice(1);
  return name;
}

const NAMES: [string, string][] = [
  ["1.3.6.1.2.1.1.1.", "sysDescr"],
  ["1.3.6.1.2.1.1.2.", "sysObjectID"],
  ["1.3.6.1.2.1.1.3.", "sysUpTime"],
  ["1.3.6.1.2.1.1.4.", "sysContact"],
  ["1.3.6.1.2.1.1.5.", "sysName"],
  ["1.3.6.1.2.1.1.6.", "sysLocation"],
  ["1.3.6.1.2.1.2.2.1.2.", "ifDescr"],
  ["1.3.6.1.2.1.2.2.1.6.", "ifPhysAddress"],
  ["1.3.6.1.2.1.2.2.1.8.", "ifOperStatus"],
  ["1.3.6.1.2.1.25.4.2.1.2.", "hrSWRunName"],
  ["1.3.6.1.2.1.25.6.3.1.2.", "hrSWInstalledName"],
  ["1.2.840.10036.1.1.1.9.", "dot11DesiredSSID"],
  ["1.3.6.1.4.1.14179.2.2.1.4.", "bsnDot11EssSsid"],
  ["1.3.6.1.4.1.9.9.513.1.1.1.5.", "cDot11SSID"],
];

function friendly(name: string): string {
  const leaf = name.includes("::") ? (name.split("::").pop() ?? name) : name;
  for (const [prefix, label] of NAMES) {
    if (name.startsWith(prefix) || name.includes(prefix)) return `${label}.${name.slice(name.lastIndexOf(prefix) + prefix.length)}`;
  }
  return leaf;
}

function indexOf(name: string): string {
  const match = name.match(/(\d+)\s*$/);
  return match?.[1] ?? "";
}

function whereOf(name: string): string {
  if (name.includes("1.2.840.10036") || /dot11/i.test(name)) return "IEEE";
  if (name.includes("14179") || /bsn/i.test(name)) return "Cisco";
  if (name.includes("9.9.513") || /cDot11/i.test(name)) return "Cisco IOS";
  return "Wireless";
}

function isSsid(name: string): boolean {
  return /ssid|wlanProfile|dot11Desired|essSsid|cDot11SSID|cLApIfSsid|1\.2\.840\.10036\.1\.1\.1\.9\.|1\.3\.6\.1\.4\.1\.14179\.2\.2\.1\.4\.|1\.3\.6\.1\.4\.1\.9\.9\.513\.1\.1\.1\.5\./i.test(name);
}

function bucket(name: string): "system" | "iface" | "listen" | "software" | "process" | "ssid" | "other" {
  if (isSsid(name)) return "ssid";
  if (/sysDescr|sysName|sysContact|sysLocation|sysUpTime|sysObjectID|1\.3\.6\.1\.2\.1\.1\.[1-6]\./.test(name)) return "system";
  if (/ifDescr|ifName|ifPhysAddress|ifOperStatus|ifType|1\.3\.6\.1\.2\.1\.2\.2\.1\.[268]\./.test(name)) return "iface";
  if (/tcpConn|udpLocal|1\.3\.6\.1\.2\.1\.6\.13|1\.3\.6\.1\.2\.1\.7\.5/.test(name)) return "listen";
  if (/hrSWInstalledName|1\.3\.6\.1\.2\.1\.25\.6\.3\.1\.2/.test(name)) return "software";
  if (/hrSWRunName|1\.3\.6\.1\.2\.1\.25\.4\.2\.1\.2/.test(name)) return "process";
  return "other";
}

function listenerLabel(name: string, value: string): string {
  const match = name.match(/(\d+\.\d+\.\d+\.\d+)\.(\d+)\.(\d+\.\d+\.\d+\.\d+)\.(\d+)\s*$/);
  if (!match) return `${friendly(name)} ${value}`;
  return `${match[1]}:${match[2]} ${value}`;
}

export function parseSnmpOutput(raw: string): SnmpView {
  const text = raw.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
  const hits: SnmpHit[] = [];
  const system: SnmpPair[] = [];
  const ssids: SnmpSsid[] = [];
  const iface = new Map<string, { name: string; status: string; mac: string }>();
  const listeners: SnmpPair[] = [];
  const software: string[] = [];
  const processes: string[] = [];
  const other: SnmpPair[] = [];
  let walkLines = 0;
  let otherLeft = 0;
  let pending = "";

  const flush = (line: string) => {
    const hit = line.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+\[([^\]\n]+)\]\s*(.*)$/);
    if (hit) {
      hits.push({ host: hit[1], community: hit[2].trim(), detail: hit[3].trim() });
      return;
    }
    const eq = line.indexOf(" = ");
    if (eq < 1) return;
    walkLines += 1;
    const name = normalName(line.slice(0, eq));
    const value = cleanValue(line.slice(eq + 3).replace(TYPE, ""));
    if (!value || value === "No more variables left in this MIB View") return;
    const kind = bucket(name);
    if (kind === "ssid") {
      ssids.push({ ssid: value, index: indexOf(name), where: whereOf(name) });
      return;
    }
    if (kind === "system") {
      system.push({ name: friendly(name).replace(/\.\d+$/, ""), value });
      return;
    }
    if (kind === "iface") {
      const index = indexOf(name) || name;
      const row = iface.get(index) ?? { name: "", status: "", mac: "" };
      const label = friendly(name);
      if (label.startsWith("ifDescr") || label.startsWith("ifName")) row.name = value;
      else if (label.startsWith("ifOperStatus")) row.status = value;
      else if (label.startsWith("ifPhysAddress")) row.mac = value;
      iface.set(index, row);
      return;
    }
    if (kind === "listen") {
      listeners.push({ name: listenerLabel(name, value), value });
      return;
    }
    if (kind === "software") {
      if (!software.includes(value)) software.push(value);
      return;
    }
    if (kind === "process") {
      if (!processes.includes(value)) processes.push(value);
      return;
    }
    if (other.length < 40) other.push({ name: friendly(name), value });
    else otherLeft += 1;
  };

  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("$ ") || trimmed.startsWith("[") || trimmed.startsWith("Scanning ")) continue;
    if (trimmed.includes(" = ") || /^\d{1,3}(?:\.\d{1,3}){3}\s+\[/.test(trimmed)) {
      if (pending) flush(pending);
      pending = trimmed;
    } else if (pending) {
      pending += ` ${trimmed}`;
    }
  }
  if (pending) flush(pending);

  const interfaces = [...iface.entries()].map(([index, row]) => ({
    name: row.name || `if ${index}`,
    value: [row.status, row.mac].filter(Boolean).join(" · "),
  }));
  const kind = hits.length ? "onesixtyone" : walkLines ? "walk" : "empty";
  const note =
    kind === "onesixtyone"
      ? "A community in square brackets is one the host accepted. Use that string for the walk."
      : kind === "walk"
        ? ssids.length
          ? "SSID rows are the wireless names in this walk. The other tables are the rest of the dump, grouped."
          : "No SSID was in this walk. Quick SSID walk asks the IEEE tree. A Cisco controller is OID 1.3.6.1.4.1.14179.2.2."
        : "Nothing to read yet. onesixtyone prints a community in square brackets. snmpwalk prints OID = value.";
  return {
    kind,
    note,
    hits,
    system,
    ssids,
    interfaces,
    listeners: listeners.slice(0, 40),
    software: software.slice(0, 40),
    processes: processes.slice(0, 40),
    other,
    otherLeft,
  };
}
