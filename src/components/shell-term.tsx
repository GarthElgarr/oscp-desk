import { useEffect, useRef, useState, type ClipboardEvent as ReactClip, type KeyboardEvent as ReactKey } from "react";
import { TermBox } from "@/components/term-box";
import { syncJobs } from "@/lib/live-jobs";

type View = {
  write: (data: string) => void;
  reset: () => void;
  dispose: () => void;
  focus: () => void;
  hasSelection: () => boolean;
  getSelection: () => string;
};

function keyToData(event: ReactKey): string | null {
  if (event.altKey || event.metaKey || event.nativeEvent.isComposing) return null;
  if (event.ctrlKey) {
    if (event.shiftKey) return null;
    const key = event.key.toLowerCase();
    if (key.length === 1 && key >= "a" && key <= "z") return String.fromCharCode(key.charCodeAt(0) - 96);
    return null;
  }
  if (event.key === "Enter") return "\r";
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

/** A real terminal for one Penelope job. Keystrokes go to the shell. Output is what Penelope prints. */
export function ShellTerm({ jobId, output, active, onKeys }: { jobId: string; output: string; active: boolean; onKeys: (text: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<View | null>(null);
  const seen = useRef("");
  const idRef = useRef(jobId);
  const onKeysRef = useRef(onKeys);
  const fitRef = useRef<(() => void) | null>(null);
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
      fitRef.current = () => {
        try {
          fitted.fit();
        } catch {
          /* the box has no size yet */
        }
      };
      host.current.focus();
      next.writeln("Click this black box and type. Drag across text to copy it. Ctrl+V pastes. Ctrl+Shift+C copies again.");
      if (!disposed) setTick((n) => n + 1);
      window.addEventListener("resize", onResize);
    })();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      addon?.dispose();
      view?.dispose();
      term.current = null;
      fitRef.current = null;
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

  function send(data: string) {
    onKeysRef.current(data);
  }

  async function copySelection() {
    const text = term.current?.hasSelection() ? term.current.getSelection() : "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  function focusTerm() {
    host.current?.focus();
  }

  async function pasteClipboard() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    if (!text) return;
    send(text.replace(/\r\n/g, "\r").replace(/\n/g, "\r"));
  }

  function onKeyDown(event: ReactKey) {
    const key = event.key.toLowerCase();
    if (event.ctrlKey && event.shiftKey && key === "c") {
      event.preventDefault();
      void copySelection();
      return;
    }
    if ((event.ctrlKey && key === "v") || (event.shiftKey && event.key === "Insert")) {
      event.preventDefault();
      void pasteClipboard();
      return;
    }
    const data = keyToData(event);
    if (!data) return;
    event.preventDefault();
    send(data);
  }

  function onPaste(event: ReactClip) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    send(text.replace(/\r\n/g, "\r").replace(/\n/g, "\r"));
  }

  return (
    <>
      <style>{".shell-term .xterm-helper-textarea{pointer-events:none!important;}"}</style>
      <TermBox className="rounded-lg bg-[#0c0c0c]" onResize={() => fitRef.current?.()}>
        <div
          ref={host}
          tabIndex={0}
          className="shell-term relative h-full min-h-full w-full cursor-text overflow-hidden bg-[#0c0c0c] outline-none focus:ring-1 focus:ring-primary"
          onMouseDown={focusTerm}
          onMouseUp={() => void copySelection()}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      </TermBox>
    </>
  );
}
