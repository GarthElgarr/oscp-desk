import { useRef, useState } from "react";
import { INSTALL_TOOL_LABELS, manualInstallCommand } from "@/lib/install-tools";

export function InstallTools() {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const command = manualInstallCommand();

  async function run() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setOpen(true);
    setRunning(true);
    setOutput("");
    try {
      const response = await fetch("/api/install", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
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
        setOutput((prev) => prev + "\n[stopped]\n");
      } else {
        setOutput(err instanceof Error ? err.message : "The install failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
        >
          {running ? "Updating and installing…" : "Install requirements"}
        </button>
        <button
          type="button"
          onClick={() => abortRef.current?.abort()}
          disabled={!running}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted disabled:opacity-40"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(command).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              },
              () => setCopied(false),
            );
          }}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted"
        >
          {copied ? "Copied" : "Copy command"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Installs {INSTALL_TOOL_LABELS.join(", ")}. On Kali it runs apt-get update, then the packages, then unpacks
        rockyou. This preview is not Kali, so the same click only prints that command. It never types a sudo password.
      </p>
      {open ? (
        <pre className="mt-3 max-h-80 min-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
          {output || (running ? "Waiting for apt…" : "Output appears here. Copy command is the same install if sudo wants a password.")}
        </pre>
      ) : null}
    </div>
  );
}
