import { useEffect, useRef, useState } from "react";
import { syncJobs } from "@/lib/live-jobs";

type View = {
  write: (data: string) => void;
  reset: () => void;
  dispose: () => void;
  focus: () => void;
};

/** A real terminal for one Penelope job. Keystrokes go to the shell. Output is what Penelope prints. */
export function ShellTerm({ jobId, output, active }: { jobId: string; output: string; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<View | null>(null);
  const seen = useRef("");
  const pending = useRef("");
  const idRef = useRef(jobId);
  const [tick, setTick] = useState(0);
  idRef.current = jobId;

  useEffect(() => {
    let disposed = false;
    let timer = 0;
    let view: View | null = null;
    let addon: { fit: () => void; dispose: () => void } | null = null;
    const onResize = () => addon?.fit();

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/xterm/css/xterm.css"),
      ]);
      if (disposed || !host.current) return;
      const next = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        theme: { background: "#0c0c0c", foreground: "#d6f5d6", cursor: "#d6f5d6" },
        scrollback: 5000,
      });
      const fitted = new FitAddon();
      next.loadAddon(fitted);
      next.open(host.current);
      fitted.fit();
      addon = fitted;
      view = next;
      term.current = next;
      next.writeln("Click here and type. This is the shell. Ctrl-C goes to the target.");
      if (!disposed) setTick((n) => n + 1);
      window.addEventListener("resize", onResize);
      next.onData((data) => {
        if (!idRef.current) return;
        pending.current += data;
        if (timer) return;
        timer = window.setTimeout(() => {
          timer = 0;
          const text = pending.current;
          pending.current = "";
          const id = idRef.current;
          if (!text || !id) return;
          void fetch("/api/jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ write: id, text, silent: true }),
          }).then(() => syncJobs());
        }, 30);
      });
    })();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      addon?.dispose();
      view?.dispose();
      term.current = null;
    };
  }, [jobId]);

  useEffect(() => {
    const view = term.current;
    if (!view) return;
    if (seen.current && !output.startsWith(seen.current)) {
      view.reset();
      seen.current = "";
    }
    const next = output.slice(seen.current.length);
    if (next) view.write(next);
    seen.current = output;
  }, [output, tick]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void syncJobs(), 150);
    return () => window.clearInterval(timer);
  }, [active]);

  return <div ref={host} className="relative h-96 overflow-hidden rounded-lg bg-[#0c0c0c]" onMouseDown={() => term.current?.focus()} />;
}
