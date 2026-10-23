import { useEffect, useRef, useState } from "react";
import { syncJobs } from "@/lib/live-jobs";

type View = {
  write: (data: string) => void;
  reset: () => void;
  dispose: () => void;
  focus: () => void;
};

/** A real terminal for one Penelope job. Keystrokes go to the shell. Output is what Penelope prints. */
export function ShellTerm({ jobId, output, active, onKeys }: { jobId: string; output: string; active: boolean; onKeys: (text: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<View | null>(null);
  const seen = useRef("");
  const idRef = useRef(jobId);
  const onKeysRef = useRef(onKeys);
  const [tick, setTick] = useState(0);
  idRef.current = jobId;
  onKeysRef.current = onKeys;

  useEffect(() => {
    let disposed = false;
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
      const area = host.current.querySelector(".xterm-helper-textarea");
      if (area instanceof HTMLTextAreaElement) {
        area.style.left = "0";
        area.style.top = "0";
        area.style.width = "1px";
        area.style.height = "1px";
        area.style.opacity = "0";
        area.style.zIndex = "6";
      }
      try {
        fitted.fit();
      } catch {
        /* the box has no size yet */
      }
      next.focus();
      addon = fitted;
      view = next;
      term.current = next;
      next.writeln("Click here and type once a shell is on screen. Ctrl-C goes to the target.");
      if (!disposed) setTick((n) => n + 1);
      window.addEventListener("resize", onResize);
      next.onData((data) => {
        if (!idRef.current) return;
        onKeysRef.current(data);
      });
    })();

    return () => {
      disposed = true;
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

  return (
    <>
      <style>{".shell-term .xterm-helper-textarea{left:0!important;top:0!important;width:1px!important;height:1px!important;opacity:0!important;z-index:6!important;}"}</style>
      <div
        ref={host}
        tabIndex={0}
        className="shell-term relative h-96 cursor-text overflow-hidden rounded-lg bg-[#0c0c0c] outline-none"
        onMouseDown={() => term.current?.focus()}
      />
    </>
  );
}
