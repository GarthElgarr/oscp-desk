import { useMemo, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { tunnelPlan, type ChiselMode, type PivotOs, type TunnelGraph, type TunnelTool } from "@/lib/tunnel-plan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function Hint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex">
      <button
        type="button"
        className="cursor-help rounded-full border border-border px-1.5 text-[10px] leading-4 text-muted"
        aria-label={text}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-6 left-0 z-20 hidden w-64 rounded-lg border border-border bg-raised p-2 text-left font-sans text-xs font-normal normal-case tracking-normal text-fg shadow-lg group-hover/hint:block group-focus-within/hint:block"
      >
        {text}
      </span>
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="inline-flex items-center gap-2 font-mono text-xs tracking-wide text-muted">
        {label}
        <Hint text={hint} />
      </span>
      {children}
    </div>
  );
}

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
    <article className="min-w-0 overflow-visible rounded-lg border border-primary bg-surface">
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
        <Field label="KALI IP" hint="Your VPN address, the one the pivot can already reach. This is not 127.0.0.1 and not the internal network you are trying to enter.">
          <input className={control} value={kali} onChange={(e) => setKali(e.target.value)} placeholder="10.10.14.5" inputMode="decimal" spellCheck={false} />
        </Field>
        <Field label="PIVOT IP" hint="The machine you already have a shell on. It can see Kali, and it can see the network you cannot.">
          <input className={control} value={pivot} onChange={(e) => setPivot(e.target.value)} placeholder="10.10.10.20" inputMode="decimal" spellCheck={false} />
        </Field>
        <Field label="PIVOT OS" hint="Chooses the binary and the commands you type on the pivot. Linux gets the ELF. 64-bit Windows gets the exe.">
          <select className={control} value={os} onChange={(e) => setOs(e.target.value as PivotOs)}>
            <option value="linux">Linux</option>
            <option value="windows">Windows</option>
          </select>
        </Field>
        <Field label="FILE SERVER ON KALI" hint="python http.server binds this port on Kali. The pivot downloads the binary from http://KALI:this. It is not a port on the pivot, and it must not be the Chisel or Ligolo listen port.">
          <input className={control} value={filePort} onChange={(e) => setFilePort(e.target.value)} inputMode="numeric" spellCheck={false} />
        </Field>
        {tool === "chisel" ? (
          <>
            <Field label="CHISEL MODE" hint="SOCKS is a few hosts, and every tool needs proxychains. One port puts a single service onto a localhost port on Kali. Loopback is only for a service bound to 127.0.0.1 on the victim.">
              <select className={control} value={chiselMode} onChange={(e) => setChiselMode(e.target.value as ChiselMode)}>
                <option value="socks">SOCKS, a few hosts</option>
                <option value="port">One port the pivot can see</option>
                <option value="loopback">Victim loopback, 127.0.0.1</option>
              </select>
            </Field>
            <Field label="CHISEL SERVER ON KALI" hint="chisel server listens on this port on Kali. The client on the pivot connects to it. It is not the SOCKS port (1080) and not the file-server port.">
              <input className={control} value={chiselPort} onChange={(e) => setChiselPort(e.target.value)} inputMode="numeric" spellCheck={false} />
            </Field>
            {chiselMode !== "socks" ? (
              <Field label="LOCAL PORT ON KALI" hint="After the tunnel is up, you connect to 127.0.0.1 on this port on Kali. Chisel created it. The real service is still on the far side.">
                <input className={control} value={localPort} onChange={(e) => setLocalPort(e.target.value)} inputMode="numeric" spellCheck={false} />
              </Field>
            ) : null}
            {chiselMode === "loopback" ? (
              <Field label="PORT ON THE VICTIM'S 127.0.0.1" hint="The port ss or netstat showed bound to 127.0.0.1 on the pivot. It is not a port on Kali. 127.0.0.1 in the Chisel command means the victim, not you.">
                <input className={control} value={internalPort} onChange={(e) => setInternalPort(e.target.value)} placeholder="3306" inputMode="numeric" spellCheck={false} />
              </Field>
            ) : (
              <Field
                label={chiselMode === "socks" ? "HOST YOU WILL SCAN" : "HOST THE PIVOT CAN SEE"}
                hint={
                  chiselMode === "socks"
                    ? "An address on the pivot's side of the tunnel. You scan it from Kali with proxychains. It is not your VPN address."
                    : "The host the pivot can already reach. Chisel will connect to it from the pivot and show one of its ports on Kali."
                }
              >
                <input className={control} value={internal} onChange={(e) => setInternal(e.target.value)} placeholder="172.16.0.10" inputMode="decimal" spellCheck={false} />
              </Field>
            )}
            {chiselMode === "port" ? (
              <Field label="PORT ON THAT FAR HOST" hint="The service port on the host the pivot can see, such as 80 or 445. Chisel places that service on the local port on Kali. This port is not opened on Kali.">
                <input className={control} value={internalPort} onChange={(e) => setInternalPort(e.target.value)} inputMode="numeric" spellCheck={false} />
              </Field>
            ) : null}
          </>
        ) : (
          <>
            <Field label="PROXY PORT ON KALI" hint="The Ligolo proxy listens on this port on Kali. The agent on the pivot connects to it. It is not a port on the pivot, and it must not be the file-server port.">
              <input className={control} value={proxyPort} onChange={(e) => setProxyPort(e.target.value)} inputMode="numeric" spellCheck={false} />
            </Field>
            <Field label="SUBNET THE PIVOT CAN SEE" hint="The network from ip a or ipconfig on the pivot, such as 172.16.0.0/24. After start, you add a route to this on Kali. It is not your tun0 range and not 127.0.0.0/8.">
              <input className={control} value={subnet} onChange={(e) => setSubnet(e.target.value)} placeholder="172.16.0.0/24" spellCheck={false} />
            </Field>
            <Field label="ONE HOST IN THAT SUBNET" hint="One address you will nmap after the route exists. It has to sit inside the subnet above. You run that nmap on Kali, with no proxychains.">
              <input className={control} value={host} onChange={(e) => setHost(e.target.value)} placeholder="172.16.0.10" inputMode="decimal" spellCheck={false} />
            </Field>
            <div className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={loopback} onChange={(e) => setLoopback(e.target.checked)} className="size-4" />
              <span>A service is bound to 127.0.0.1 on the victim, not on Kali</span>
              <Hint text="Tick this when ss or netstat on the pivot shows 127.0.0.1. Ligolo then maps that loopback to 240.0.0.1. Routing 127.0.0.0/8 would black-hole Kali." />
            </div>
            {loopback ? (
              <Field label="PORT ON THE VICTIM'S 127.0.0.1" hint="The port bound to 127.0.0.1 on the pivot. On Kali you reach it as 240.0.0.1 and this port. 127.0.0.1 on Kali is still Kali.">
                <input className={control} value={loopPort} onChange={(e) => setLoopPort(e.target.value)} placeholder="3306" inputMode="numeric" spellCheck={false} />
              </Field>
            ) : null}
            <div className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={callback} onChange={(e) => setCallback(e.target.checked)} className="size-4" />
              <span>A far host must call back, and it cannot see Kali</span>
              <Hint text="The route lets you reach them. It does not let them reach your VPN address. This opens a port on the pivot and forwards it to Penelope on Kali." />
            </div>
            {callback ? (
              <>
                <Field label="CALLBACK PORT ON THE PIVOT" hint="Ligolo opens this port on the pivot. The far host connects here. The payload LHOST is the pivot's address, not Kali, and not 127.0.0.1.">
                  <input className={control} value={callbackPort} onChange={(e) => setCallbackPort(e.target.value)} inputMode="numeric" spellCheck={false} />
                </Field>
                <Field label="PENELOPE PORT ON KALI" hint="Penelope is already listening on this port on Kali. The pivot forwards the callback to 127.0.0.1 and this port, which is Kali's own loopback.">
                  <input className={control} value={penelopePort} onChange={(e) => setPenelopePort(e.target.value)} inputMode="numeric" spellCheck={false} />
                </Field>
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
