/** Cisco CX Security udp-proto-scanner. Probe names match `udp-proto-scanner.pl -l`. */
export const UDP_PROBES = [
  "all",
  "DNSStatusRequest",
  "DNSVersionBindReq",
  "NBTStat",
  "NTPRequest",
  "RPCCheck",
  "SNMPv3GetRequest",
  "chargen",
  "citrix",
  "daytime",
  "db2",
  "echo",
  "gtpv1",
  "ike",
  "ms-sql",
  "ms-sql-slam",
  "netop",
  "ntp",
  "rpc",
  "snmp-public",
  "systat",
  "tftp",
  "time",
  "xdmcp",
] as const;

export type UdpProbe = (typeof UDP_PROBES)[number];

const PROBE_SET = new Set<string>(UDP_PROBES);

export function udpProbe(value: unknown): UdpProbe | null {
  return typeof value === "string" && PROBE_SET.has(value) ? (value as UdpProbe) : null;
}

/** One IPv4 address. No hostnames, no ranges, no cloud metadata address. */
export function udpTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const target = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return null;
  const parts = target.split(".").map((part) => Number(part));
  if (parts.some((part) => part > 255)) return null;
  if (target === "0.0.0.0" || target === "255.255.255.255" || target === "169.254.169.254") return null;
  if (parts[0] >= 224 || parts[0] === 127) return null;
  return target;
}

export function udpArgs(target: string, probe: UdpProbe): string[] {
  return ["-p", probe, target];
}

/** What you would type. The page runs the same arguments against the bundled script. */
export function udpCommand(target: string, probe: UdpProbe): string {
  return ["udp-proto-scanner.pl", ...udpArgs(target, probe)].join(" ");
}
