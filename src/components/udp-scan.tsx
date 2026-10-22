import { useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { UDP_PROBES, udpCommand, udpTarget, type UdpProbe } from "@/lib/udp-scan";

const control = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none";

export function UdpScan() {
  const [target, setTarget] = useState("");
  const [probe, setProbe] = useState<UdpProbe>("all");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const host = udpTarget(target);
  const command = useMemo(() => (host ? udpCommand(host, probe) : ""), [host, probe]);

  async function copyCmd() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function run() {
    if (!host || running) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setOutput("");
    try {
      const response = await fetch("/api/udp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: host, probe }),
        signal: controller.signal,
      });
      if (!response.body) {
        setOutput(await response.text());
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        text += decoder.decode(chunk.value, { stream: true });
        setOutput(text);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setOutput((prev) => `${prev}\n[stopped]\n`);
      } else {
        setOutput(err instanceof Error ? err.message : "The scan failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Scanner</p>
        <h2 className="text-lg font-semibold">UDP protocol scanner</h2>
        <p className="mt-1 text-sm text-muted">
          Cisco's udp-proto-scanner. It sends a real protocol packet, such as DNS, NTP, TFTP, SNMP, or IKE, and
          prints the service that answers. It does not list open and closed ports. That job is still the nmap UDP
          top 20 in the order of work. All probes on one host is slow, because the tool waits between each probe.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">TARGET</span>
          <input
            className={control}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="10.10.10.10"
            inputMode="decimal"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PROBE</span>
          <select className={control} value={probe} onChange={(event) => setProbe(event.target.value as UdpProbe)}>
            {UDP_PROBES.map((name) => (
              <option key={name} value={name}>
                {name === "all" ? "all protocols" : name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
            <button
              type="button"
              onClick={() => void copyCmd()}
              disabled={!command}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40"
            >
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {command || "Type the target address. The command appears here."}
          </pre>
        </div>
        <div>
          <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
          <p className="mt-1 text-sm text-fg">
            -p is the probe. all walks every protocol in Cisco's list. A single name, such as tftp or snmp-public,
            sends only that packet. The address is one host. A line that names a service is a reply. No line for
            that probe means it did not answer. SNMP version 1 often stays quiet unless the community string in
            the probe is one the host accepts. nmap's open|filtered line is not this result.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={!host || running}
            className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
          >
            {running ? "Scanning" : "Run"}
          </button>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            disabled={!running}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted disabled:opacity-40"
          >
            Stop
          </button>
        </div>
        <pre className="max-h-80 min-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
          {output || (running ? "Waiting for udp-proto-scanner…" : "Output appears here.")}
        </pre>
      </div>
    </article>
  );
}
