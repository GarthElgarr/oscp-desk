import path from "node:path";
import { spawnLiveJob } from "./live-jobs.server";
import { udpArgs, udpCommand, udpProbe, udpTarget } from "./udp-scan";

const TIMEOUT_MS = 4 * 60 * 1000;

function scriptPath(): string {
  return path.resolve(process.cwd(), "tools/udp-proto-scanner/udp-proto-scanner.pl");
}

export function udpRequest(body: unknown): { command: string; args: string[] } | null {
  if (!body || typeof body !== "object") return null;
  const row = body as { target?: unknown; probe?: unknown };
  const target = udpTarget(row.target);
  const probe = udpProbe(row.probe);
  if (!target || !probe) return null;
  return { command: udpCommand(target, probe), args: udpArgs(target, probe) };
}

export function startUdpScan(id: string, command: string, args: string[]): boolean {
  return spawnLiveJob({
    id,
    tool: "udp",
    title: command,
    command,
    bin: "perl",
    args: [scriptPath(), ...args],
    timeoutMs: TIMEOUT_MS,
    missing: "perl was not found. Run the desk on Kali.\n",
    doneLine: (code, stopped) => {
      if (stopped) return "\n[stopped]\n";
      const note =
        code === 0
          ? "A named service means that probe got a reply. Silence on a probe means that service did not answer. This is not a list of open ports.\n"
          : "";
      return `\n[udp-proto-scanner exit ${code ?? "unknown"}]\n${note}`;
    },
  });
}
