import { useEffect, useRef, useState, type ClipboardEvent as ReactClip, type KeyboardEvent as ReactKey, type MouseEvent as ReactMouse } from "react";
import { syncJobs } from "@/lib/live-jobs";

type View = {
  write: (data: string) => void;
  reset: () => void;
  dispose: () => void;
  focus: () => void;
};

function keyToData(event: ReactKey): string | null {
  if (event.altKey || event.metaKey || event.nativeEvent.isComposing) return null;
  if (event.ctrlKey) {
    const key = event.key.toLowerCase();
    if (key.length === 1 && key >= "a" && key <= "z") return String.fromCharCode(key.charCodeAt(0) - 96);
    return null;
  }
  if (event.key === "Enter") return "\n";
  if (event.key === "Backspace") return "\x7f";
  if (event.key === "Tab") return "\t";
  if (event.key === "Escape") return "\x1b";
  if (event.key === "ArrowUp") return "\x1b[A";
  if (event.key === "ArrowDown") return "\x1b[B";
  if (event.key === "ArrowRight") return "\x1b[C";
  if (event.key === "ArrowLeft") return "\x1b[D";
  if (event.key === "Home") return "\x1b[H";
  if (event.key === "End") return "\x1b[F";
  if (event.key === "Delete") return "\x1b[3~";
  if (event.key.length === 1) return event.key;
  return null;
}

/** What the user should see for keys the remote shell will not echo. Penelope often has no TTY. */
function echoLocal(view: View, data: string) {
  if (data === "\x7f") {
    view.write("\b \b");
    return;
  }
  if (data === "\n" || data === "\r") {
    view.write("\r\n");
    return;
  }
  if (data === "\x03") {
    view.write("^C\r\n");
    return;
  }
  const shown = data.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
  if (shown) view.write(shown);
}

/** A real terminal for one Penelope job. Keystrokes go to the shell. Output is what Penelope prints. */
export function ShellTerm({ jobId, output, active, onKeys }: { jobId: string; output: string; active: boolean; onKeys: (text: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<View | null>(null);
  const seen = useRef("");
  const echoed = useRef("");
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
        disableStdin: true,
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        theme: { background: "#0c0c0c", foreground: "#d6f5d6", cursor: "#d6f5d6" },
        scrollback: 5000,
      });
      const fitted = new FitAddon();
      next.loadAddon(fitted);
      next.open(host.current);
      try {
        fitted.fit();
      } catch {
        /* the box has no size yet */
      }
      addon = fitted;
      view = next;
      term.current = next;
      host.current.focus();
      next.writeln("Click this black box and type. Letters show here as you type, and Enter runs the line.");
      if (!disposed) setTick((n) => n + 1);
      window.addEventListener("resize", onResize);
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
      echoed.current = "";
    }
    let next = output.slice(seen.current.length);
    if (echoed.current && next.startsWith(echoed.current)) {
      next = next.slice(echoed.current.length);
      echoed.current = "";
    } else if (echoed.current && echoed.current.startsWith(next)) {
      echoed.current = echoed.current.slice(next.length);
      next = "";
    }
    if (next) view.write(next);
    seen.current = output;
  }, [output, tick]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void syncJobs(), 150);
    return () => window.clearInterval(timer);
  }, [active]);

  function send(data: string) {
    const view = term.current;
    if (view) {
      echoLocal(view, data);
      const shown = data === "\n" || data === "\r" ? "\r\n" : data === "\x7f" ? "\b \b" : data.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
      if (shown) echoed.current += shown;
    }
    onKeysRef.current(data);
  }

  function focusTerm(event: ReactMouse) {
    event.preventDefault();
    host.current?.focus();
  }

  function onKeyDown(event: ReactKey) {
    const data = keyToData(event);
    if (!data) return;
    event.preventDefault();
    send(data);
  }

  function onPaste(event: ReactClip) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    send(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  }

  return (
    <>
      <style>{".shell-term .xterm-helper-textarea{pointer-events:none!important;}"}</style>
      <div
        ref={host}
        tabIndex={0}
        className="shell-term relative h-96 cursor-text overflow-hidden rounded-lg bg-[#0c0c0c] outline-none focus:ring-1 focus:ring-primary"
        onMouseDown={focusTerm}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
    </>
  );
}
