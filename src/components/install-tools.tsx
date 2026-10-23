import { useRef, useState } from "react";
import { Check, CircleX, TriangleAlert } from "lucide-react";
import { INSTALL_TOOL_LABELS, manualInstallCommand, takeInstallStatus, type InstallSummary } from "@/lib/install-tools";

function Verdict({ summary }: { summary: InstallSummary }) {
  if (summary.verdict === "pass") {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-alive">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-alive text-bg">
          <Check className="size-4" aria-hidden="true" />
        </span>
        {summary.title}
      </p>
    );
  }
  if (summary.verdict === "partial") {
    return (
      <div className="mt-3 rounded-lg border border-[#8a5a20] bg-[#2a2116] px-3 py-3">
        <p className="flex items-center gap-2 text-sm text-[#e0a15a]">
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
          {summary.title}
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-fg">
          {summary.outstanding.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-dead/40 bg-dead-bg px-3 py-3">
      <p className="flex items-center gap-2 text-sm text-dead">
        <CircleX className="size-5 shrink-0" aria-hidden="true" />
        {summary.title || "The install failed."}
      </p>
      {summary.outstanding.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-fg">
          {summary.outstanding.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function InstallTools() {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [summary, setSummary] = useState<InstallSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const command = manualInstallCommand();

  function apply(text: string) {
    const next = takeInstallStatus(text);
    setOutput(next.output);
    if (next.summary) setSummary(next.summary);
  }

  async function run() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setOpen(true);
    setRunning(true);
    setOutput("");
    setSummary(null);
    let raw = "";
    try {
      const response = await fetch("/api/install", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        signal: controller.signal,
      });
      if (!response.body) {
        apply(await response.text());
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        raw += decoder.decode(chunk.value, { stream: true });
        apply(raw);
      }
      raw += decoder.decode();
      apply(raw);
      if (!takeInstallStatus(raw).summary) {
        setSummary({ verdict: "fail", title: "The install ended without a result.", outstanding: [] });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        apply(raw + "\n[stopped]\n");
        setSummary({ verdict: "fail", title: "Stopped before the checks finished.", outstanding: [] });
      } else {
        setSummary({
          verdict: "fail",
          title: err instanceof Error ? err.message : "The install failed.",
          outstanding: [],
        });
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
      {summary && !running ? <Verdict summary={summary} /> : null}
      {open ? (
        <pre className="mt-3 max-h-80 min-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
          {output || (running ? "Waiting for apt…" : "Output appears here. Copy command is the same install if sudo wants a password.")}
        </pre>
      ) : null}
    </div>
  );
}
