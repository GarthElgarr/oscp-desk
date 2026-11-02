import { useSyncExternalStore } from "react";
import { getGlobals, getGlobalsServer, setGlobals, subscribeGlobals } from "@/lib/desk-globals";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function GlobalConfig({ onShells }: { onShells: () => void }) {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  return (
    <div className="mt-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">LOCAL IP</span>
          <input className={control} value={globals.localIp} onChange={(event) => setGlobals({ localIp: event.target.value })} placeholder="10.10.14.5" inputMode="decimal" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">INTERFACE</span>
          <input className={control} value={globals.iface} onChange={(event) => setGlobals({ iface: event.target.value })} placeholder="tun0" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">TARGET IP</span>
          <input className={control} value={globals.target} onChange={(event) => setGlobals({ target: event.target.value })} placeholder="10.10.10.10" inputMode="decimal" spellCheck={false} />
        </label>
        <div className="flex items-end">
          <button type="button" onClick={onShells} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
            Reverse shells
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        These fill nmap, UDP, hydra, nxc, impacket, wfuzz, SNMP, WinRM, msfvenom, the tunnel, uploads, and Penelope until you edit that box. Editing a box does not change these.
      </p>
    </div>
  );
}
