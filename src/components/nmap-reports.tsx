import { useEffect, useState, useSyncExternalStore } from "react";
import { getJobs, getJobsServer, subscribeJobs } from "@/lib/live-jobs";
import { deskCard } from "@/lib/nmap-card";

type Script = { id: string; output: string };
type Port = { proto: string; port: string; state: string; service: string; detail: string; scripts: Script[] };
type Host = { addr: string; hostname: string; state: string; ports: Port[] };

function text(node: Element | null, attr: string): string {
  return node?.getAttribute(attr)?.trim() ?? "";
}

export function parseNmapXml(xml: string): { hosts: Host[]; error: string } {
  if (!xml.includes("<nmaprun")) return { hosts: [], error: "That file is not an nmap XML report." };
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return { hosts: [], error: "The XML did not parse." };
  const hosts = [...doc.querySelectorAll("host")].map((host) => {
    const addr = text(host.querySelector("address[addrtype='ipv4']") ?? host.querySelector("address"), "addr");
    const hostname = text(host.querySelector("hostname"), "name");
    const state = text(host.querySelector("status"), "state") || "unknown";
    const ports = [...host.querySelectorAll("port")].map((port) => {
      const service = port.querySelector("service");
      const product = [text(service, "product"), text(service, "version"), text(service, "extrainfo")].filter(Boolean).join(" ");
      return {
        proto: text(port, "protocol") || "tcp",
        port: text(port, "portid"),
        state: text(port.querySelector("state"), "state") || "unknown",
        service: text(service, "name"),
        detail: product,
        scripts: [...port.querySelectorAll("script")].map((script) => ({
          id: text(script, "id"),
          output: (script.getAttribute("output") ?? "").slice(0, 4000),
        })),
      };
    });
    return { addr: addr || "unknown", hostname, state, ports };
  });
  if (hosts.length === 0) return { hosts: [], error: "The XML parsed, but it has no hosts." };
  return { hosts, error: "" };
}

function interesting(port: Port): boolean {
  return port.state === "open" || port.state === "open|filtered";
}

export function NmapReports({ onOpenCard }: { onOpenCard?: (id: string, section: string) => void }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [html, setHtml] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [openScript, setOpenScript] = useState<string | null>(null);
  const jobs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);
  const nmapRunning = jobs.filter((job) => job.tool === "nmap" && job.running).length;

  function loadList() {
    void fetch("/api/nmap")
      .then((response) => (response.ok ? response.json() : { names: [] }))
      .then((body: { names?: string[] }) => setSaved(Array.isArray(body.names) ? body.names : []))
      .catch(() => setSaved([]));
  }

  useEffect(() => {
    loadList();
  }, [nmapRunning]);

  function showXml(xml: string, title: string) {
    const parsed = parseNmapXml(xml);
    setHtml("");
    setLabel(title);
    setHosts(parsed.hosts);
    setError(parsed.error);
    setOpenScript(null);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("That file is over 5 MB.");
      setHosts([]);
      setHtml("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (file.name.endsWith(".xml") || text.includes("<nmaprun")) {
        showXml(text, file.name);
        return;
      }
      if (file.name.endsWith(".html") || file.name.endsWith(".htm") || /<html/i.test(text.slice(0, 400))) {
        setHosts([]);
        setError("");
        setLabel(file.name);
        setHtml(text);
        return;
      }
      setHosts([]);
      setHtml("");
      setError("Upload an nmap .xml or the HTML made from one.");
    };
    reader.readAsText(file);
  }

  async function openSaved(name: string) {
    const response = await fetch(`/api/nmap?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    showXml(await response.text(), `${name}.xml`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
        <div className="border-b border-border px-4 py-3">
          <p className="font-mono text-xs text-primary">Reports</p>
          <h2 className="text-lg font-semibold">Nmap output</h2>
          <p className="mt-1 text-sm text-muted">
            XML is drawn as hosts and ports. HTML is shown as the page nmap produced, with scripts off. A scan started
            above is listed here when its XML has been written.
          </p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border px-3 text-sm text-fg">
            <input
              type="file"
              accept=".xml,.html,.htm,text/xml,text/html"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            Upload an nmap XML or HTML file
          </label>
          {saved.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {saved.map((name) => (
                <span key={name} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void openSaved(name)}
                    className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 font-mono text-xs text-fg"
                  >
                    {name}.xml
                  </button>
                  <a
                    href={`/api/nmap?name=${encodeURIComponent(name)}&html=1`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-primary"
                  >
                    HTML
                  </a>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No saved XML in the scans folder yet.</p>
          )}
          {error ? <p className="text-sm text-dead">{error}</p> : null}
          {label && !error ? <p className="font-mono text-xs text-muted">{label}</p> : null}
          {html ? (
            <iframe title="Nmap HTML report" sandbox="" srcDoc={html} className="h-[32rem] w-full rounded-lg border border-border bg-white" />
          ) : null}
          {hosts.length > 0 ? (
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} />
              Show closed and filtered ports
            </label>
          ) : null}
          {hosts.map((host) => {
            const ports = showClosed ? host.ports : host.ports.filter(interesting);
            const hidden = host.ports.length - ports.length;
            return (
              <section key={`${host.addr}-${host.hostname}`} className="rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2">
                  <h3 className="font-mono text-sm text-fg">{host.addr}</h3>
                  <p className="text-xs text-muted">
                    {host.hostname || "no hostname"} · {host.state}
                    {hidden > 0 ? ` · ${hidden} closed or filtered hidden` : ""}
                  </p>
                </div>
                {ports.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted">No open ports in this file.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="font-mono text-xs text-muted">
                        <tr>
                          <th className="px-3 py-2 font-normal">Port</th>
                          <th className="px-3 py-2 font-normal">State</th>
                          <th className="px-3 py-2 font-normal">Service</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ports.map((port) => {
                          const card = deskCard(port.port, port.service);
                          return (
                          <tr key={`${port.proto}-${port.port}`} className="border-t border-border align-top">
                            <td className="px-3 py-2 font-mono text-xs">
                              {card && onOpenCard ? (
                                <button type="button" onClick={() => onOpenCard(card.id, card.section)} className="text-primary underline" title={`Open the ${card.title} card`}>
                                  {port.port}/{port.proto}
                                </button>
                              ) : (
                                `${port.port}/${port.proto}`
                              )}
                            </td>
                            <td className={"px-3 py-2 " + (interesting(port) ? "text-alive" : "text-muted")}>{port.state}</td>
                            <td className="px-3 py-2">
                              <p>{[port.service, port.detail].filter(Boolean).join(" ") || "unknown"}</p>
                              {port.scripts.map((script) => {
                                const key = `${host.addr}-${port.port}-${script.id}`;
                                const open = openScript === key;
                                return (
                                  <div key={script.id} className="mt-2">
                                    <button type="button" onClick={() => setOpenScript(open ? null : key)} className="font-mono text-xs text-primary">
                                      {open ? "Hide" : "Show"} {script.id}
                                    </button>
                                    {open ? <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-muted">{script.output}</pre> : null}
                                  </div>
                                );
                              })}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </article>
    </div>
  );
}
