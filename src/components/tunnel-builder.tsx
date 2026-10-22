import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { tunnelPlan, type ChiselMode, type PivotOs, type TunnelGraph, type TunnelTool } from "@/lib/tunnel-plan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          },
          () => setCopied(false),
        );
      }}
      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted"
    >
      <Copy className="size-3.5" aria-hidden="true" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Machine({ y, name, addr, role }: { y: number; name: string; addr: string; role: string }) {
  return (
    <g>
      <rect x="16" y={y} width="288" height="68" rx="10" fill="#171d19" stroke="#2c3830" />
      <text x="32" y={y + 20} fill="#d4a054" fontSize="11" fontFamily="IBM Plex Mono, ui-monospace, monospace">
        {name}
      </text>
      <text x="32" y={y + 42} fill="#e7eee8" fontSize="15">
        {addr}
      </text>
      <text x="32" y={y + 60} fill="#93a398" fontSize="12">
        {role}
      </text>
    </g>
  );
}

function DownEdge({ y, label }: { y: number; label: string }) {
  return (
    <g>
      <line x1="292" y1={y + 8} x2="292" y2={y + 40} stroke="#7dcaa0" strokeWidth="2" />
      <path d={`M287 ${y + 36} L292 ${y + 48} L297 ${y + 36}`} fill="none" stroke="#7dcaa0" strokeWidth="2" />
      <text x="276" y={y + 36} fill="#7dcaa0" fontSize="12" textAnchor="end">
        {label}
      </text>
    </g>
  );
}

function UpEdge({ y, label, extra, live }: { y: number; label: string; extra?: string; live: boolean }) {
  const color = live ? "#d4a054" : "#e08a78";
  return (
    <g>
      <line
        x1="28"
        y1={y + 52}
        x2="28"
        y2={live ? y + 16 : y + 10}
        stroke={color}
        strokeWidth="2"
        strokeDasharray={live ? undefined : "4 3"}
      />
      {live ? <path d={`M23 ${y + 18} L28 ${y + 8} L33 ${y + 18}`} fill="none" stroke={color} strokeWidth="2" /> : null}
      <text x="44" y={extra ? y + 24 : y + 36} fill={color} fontSize="12">
        {label}
      </text>
      {extra ? (
        <text x="44" y={y + 42} fill={color} fontSize="12">
          {extra}
        </text>
      ) : null}
    </g>
  );
}

function PathGraph({ graph }: { graph: TunnelGraph }) {
  const caption = `${graph.kali.name} ${graph.kali.addr}. Up: ${graph.dial}. Down: ${graph.reachTop}. ${graph.pivot.name} ${graph.pivot.addr}. Up: ${graph.backLower}. Down: ${graph.reachBottom}. ${graph.far.name} ${graph.far.addr}.`;
  return (
    <figure className="mt-4">
      <svg viewBox="0 0 320 348" role="img" className="h-auto w-full" aria-label={caption}>
        <rect width="320" height="348" rx="12" fill="#101410" />
        <Machine y={8} name={graph.kali.name} addr={graph.kali.addr} role={graph.kali.role} />
        <UpEdge y={76} label={graph.dial} extra={graph.backLive ? graph.backUpper : undefined} live />
        <DownEdge y={76} label={graph.reachTop} />
        <Machine y={140} name={graph.pivot.name} addr={graph.pivot.addr} role={graph.pivot.role} />
        <UpEdge y={208} label={graph.backLower} live={graph.backLive} />
        <DownEdge y={208} label={graph.reachBottom} />
        <Machine y={272} name={graph.far.name} addr={graph.far.addr} role={graph.far.role} />
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="text-primary">Gold, up: they connect toward Kali</span>
        <span className="text-alive">Green, down: you reach them</span>
        <span className="text-dead">Dashed: that path does not exist</span>
      </figcaption>
    </figure>
  );
}

export function TunnelBuilder() {
  const [tool, setTool] = useState<TunnelTool>("chisel");
  const [os, setOs] = useState<PivotOs>("linux");
  const [kali, setKali] = useState("");
  const [pivot, setPivot] = useState("");
  const [filePort, setFilePort] = useState("80");
  const [chiselMode, setChiselMode] = useState<ChiselMode>("socks");
  const [chiselPort, setChiselPort] = useState("8000");
  const [localPort, setLocalPort] = useState("8081");
  const [internal, setInternal] = useState("");
  const [internalPort, setInternalPort] = useState("80");
  const [proxyPort, setProxyPort] = useState("11601");
  const [subnet, setSubnet] = useState("172.16.0.0/24");
  const [host, setHost] = useState("");
  const [callback, setCallback] = useState(false);
  const [callbackPort, setCallbackPort] = useState("443");
  const [penelopePort, setPenelopePort] = useState("443");
  const [loopback, setLoopback] = useState(false);
  const [loopPort, setLoopPort] = useState("");

  const plan = useMemo(
    () =>
      tunnelPlan({
        tool,
        os,
        kali,
        pivot,
        filePort,
        chiselMode,
        chiselPort,
        localPort,
        internal,
        internalPort,
        proxyPort,
        subnet,
        host,
        callback,
        callbackPort,
        penelopePort,
        loopback,
        loopPort,
      }),
    [
      tool,
      os,
      kali,
      pivot,
      filePort,
      chiselMode,
      chiselPort,
      localPort,
      internal,
      internalPort,
      proxyPort,
      subnet,
      host,
      callback,
      callbackPort,
      penelopePort,
      loopback,
      loopPort,
    ],
  );

  const all = plan.steps.map((step, index) => `# ${index + 1}. ${step.side}: ${step.title}\n${step.cmd}`).join("\n\n");

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">Tunnel</h2>
        <p className="mt-1 text-sm text-muted">
          Chisel or Ligolo. Each step says what has to be true, then the command with your addresses. Victim loopback
          is a separate path: 127.0.0.1 on the victim is not 127.0.0.1 on Kali. This does not start the tunnel. You run the commands.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pt-4">
        {(
          [
            ["chisel", "Chisel"],
            ["ligolo", "Ligolo"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            className={
              "inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-sm " +
              (tool === id ? "border-primary bg-raised text-fg" : "border-border bg-bg text-muted")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">KALI IP</span>
          <input className={control} value={kali} onChange={(e) => setKali(e.target.value)} placeholder="10.10.14.5" inputMode="decimal" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PIVOT IP</span>
          <input className={control} value={pivot} onChange={(e) => setPivot(e.target.value)} placeholder="10.10.10.20" inputMode="decimal" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PIVOT OS</span>
          <select className={control} value={os} onChange={(e) => setOs(e.target.value as PivotOs)}>
            <option value="linux">Linux</option>
            <option value="windows">Windows</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">FILE SERVER PORT</span>
          <input className={control} value={filePort} onChange={(e) => setFilePort(e.target.value)} inputMode="numeric" spellCheck={false} />
        </label>
        {tool === "chisel" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">CHISEL MODE</span>
              <select className={control} value={chiselMode} onChange={(e) => setChiselMode(e.target.value as ChiselMode)}>
                <option value="socks">SOCKS, a few hosts</option>
                <option value="port">One port the pivot can see</option>
                <option value="loopback">Victim loopback, 127.0.0.1</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">CHISEL PORT</span>
              <input className={control} value={chiselPort} onChange={(e) => setChiselPort(e.target.value)} inputMode="numeric" spellCheck={false} />
            </label>
            {chiselMode !== "socks" ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-xs tracking-wide text-muted">KALI LOCAL PORT</span>
                <input className={control} value={localPort} onChange={(e) => setLocalPort(e.target.value)} inputMode="numeric" spellCheck={false} />
              </label>
            ) : null}
            {chiselMode === "loopback" ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-xs tracking-wide text-muted">PORT ON THE VICTIM</span>
                <input className={control} value={internalPort} onChange={(e) => setInternalPort(e.target.value)} placeholder="3306" inputMode="numeric" spellCheck={false} />
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-xs tracking-wide text-muted">{chiselMode === "socks" ? "HOST TO SCAN" : "HOST THE PIVOT CAN SEE"}</span>
                <input className={control} value={internal} onChange={(e) => setInternal(e.target.value)} placeholder="172.16.0.10" inputMode="decimal" spellCheck={false} />
              </label>
            )}
            {chiselMode === "port" ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-xs tracking-wide text-muted">PORT ON THAT HOST</span>
                <input className={control} value={internalPort} onChange={(e) => setInternalPort(e.target.value)} inputMode="numeric" spellCheck={false} />
              </label>
            ) : null}
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">PROXY PORT</span>
              <input className={control} value={proxyPort} onChange={(e) => setProxyPort(e.target.value)} inputMode="numeric" spellCheck={false} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">SUBNET ON THE PIVOT</span>
              <input className={control} value={subnet} onChange={(e) => setSubnet(e.target.value)} placeholder="172.16.0.0/24" spellCheck={false} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">ONE HOST IN THAT SUBNET</span>
              <input className={control} value={host} onChange={(e) => setHost(e.target.value)} placeholder="172.16.0.10" inputMode="decimal" spellCheck={false} />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={loopback} onChange={(e) => setLoopback(e.target.checked)} className="size-4" />
              A service is bound to the victim's 127.0.0.1
            </label>
            {loopback ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-xs tracking-wide text-muted">PORT ON 127.0.0.1</span>
                <input className={control} value={loopPort} onChange={(e) => setLoopPort(e.target.value)} placeholder="3306" inputMode="numeric" spellCheck={false} />
              </label>
            ) : null}
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={callback} onChange={(e) => setCallback(e.target.checked)} className="size-4" />
              The far side must call back, and it cannot see Kali
            </label>
            {callback ? (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-mono text-xs tracking-wide text-muted">PORT ON THE PIVOT</span>
                  <input className={control} value={callbackPort} onChange={(e) => setCallbackPort(e.target.value)} inputMode="numeric" spellCheck={false} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-mono text-xs tracking-wide text-muted">PENELOPE PORT ON KALI</span>
                  <input className={control} value={penelopePort} onChange={(e) => setPenelopePort(e.target.value)} inputMode="numeric" spellCheck={false} />
                </label>
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        <p className="font-mono text-xs tracking-wide text-primary">WHAT THIS TUNNEL IS</p>
        <p className="mt-1 text-sm text-fg">{plan.summary}</p>
        {plan.notes.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-primary">
            {plan.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <PathGraph graph={plan.graph} />

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">STEPS</p>
          <CopyButton text={all} />
        </div>
        <ol className="mt-2 flex flex-col gap-3">
          {plan.steps.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-border bg-bg p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-fg">
                  <span className="font-mono text-xs text-primary">
                    {index + 1} {step.side}
                  </span>
                  <span className="mt-1 block">{step.title}</span>
                </p>
                <CopyButton text={step.cmd} />
              </div>
              <p className="mt-2 text-sm text-muted">{step.why}</p>
              <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
                {step.cmd}
              </pre>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
