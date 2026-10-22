import { useRef, useState } from "react";
import { parseExtraFlags } from "@/lib/hydra-args";

export function ToolRun({
  endpoint,
  disabled,
  placeholder,
  onFlags,
  buildBody,
  buildQuick,
  quickHint,
}: {
  endpoint: string;
  disabled: boolean;
  placeholder: string;
  onFlags: (extra: string[]) => void;
  buildBody: (extra: string[]) => unknown;
  buildQuick?: () => unknown;
  quickHint?: string;
}) {
  const [flags, setFlags] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const parsed = parseExtraFlags(flags);
  const canRun = !disabled && parsed.ok && !running;

  function changeFlags(value: string) {
    setFlags(value);
    const next = parseExtraFlags(value);
    onFlags(next.ok ? next.args : []);
  }

  async function run(body: unknown) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setOutput("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
        setOutput(err instanceof Error ? err.message : "The run failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-mono text-xs text-muted">EXTRA FLAGS</span>
        <input
          value={flags}
          onChange={(event) => changeFlags(event.target.value)}
          placeholder={placeholder}
          className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none"
        />
        <span className={"text-xs " + (parsed.ok ? "text-muted" : "text-dead")}>
          {parsed.ok ? "Added to the crack command. Not a shell. Stop ends the run." : parsed.error}
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run(buildBody(parsed.ok ? parsed.args : []))}
          disabled={!canRun}
          className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
        >
          {running ? "Running" : "Run"}
        </button>
        {buildQuick ? (
          <button
            type="button"
            onClick={() => void run(buildQuick())}
            disabled={disabled || running}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg disabled:opacity-40"
          >
            Quick run
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => abortRef.current?.abort()}
          disabled={!running}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted disabled:opacity-40"
        >
          Stop
        </button>
      </div>
      {quickHint ? <p className="text-xs text-muted">{quickHint}</p> : null}
      <pre className="max-h-80 min-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
        {output || (running ? "Waiting for output…" : "Output appears here.")}
      </pre>
    </div>
  );
}

export function HydraRun({
  args,
  quickArgs,
  disabled,
  onFlags,
}: {
  args: string[];
  quickArgs: string[];
  disabled: boolean;
  onFlags: (flags: string, extra: string[]) => void;
}) {
  return (
    <ToolRun
      endpoint="/api/hydra"
      disabled={disabled || args.length === 0}
      placeholder="-V -I"
      onFlags={(extra) => onFlags("", extra)}
      buildBody={(extra) => ({ args: [...args, ...extra] })}
      buildQuick={() => ({ args: quickArgs })}
      quickHint="Quick run is -t 1 -f -I -V plus the host and the list. It skips the optional flags."
    />
  );
}
