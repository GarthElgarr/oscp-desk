import { useState } from "react";
import { JobList } from "@/components/job-list";
import { launchJob } from "@/lib/live-jobs";
import { parseExtraFlags } from "@/lib/hydra-args";

export function ToolRun({
  endpoint,
  tool,
  disabled,
  placeholder,
  onFlags,
  buildBody,
  buildQuick,
  quickHint,
}: {
  endpoint: string;
  tool: string;
  disabled: boolean;
  placeholder: string;
  onFlags: (extra: string[]) => void;
  buildBody: (extra: string[]) => Record<string, unknown>;
  buildQuick?: () => Record<string, unknown>;
  quickHint?: string;
}) {
  const [flags, setFlags] = useState("");
  const parsed = parseExtraFlags(flags);
  const canRun = !disabled && parsed.ok;

  function changeFlags(value: string) {
    setFlags(value);
    const next = parseExtraFlags(value);
    onFlags(next.ok ? next.args : []);
  }

  async function run(body: Record<string, unknown>) {
    const listed = typeof body.command === "string" ? body.command : typeof body.args === "object" && Array.isArray(body.args) ? `${tool} ${body.args.join(" ")}` : tool;
    await launchJob(endpoint, body, { tool, title: listed.slice(0, 80), command: listed.slice(0, 200) });
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
          {parsed.ok ? "Added to the command. Not a shell. Kill stops the run. Remove drops it from the list." : parsed.error}
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run(buildBody(parsed.ok ? parsed.args : []))}
          disabled={!canRun}
          className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
        >
          Run
        </button>
        {buildQuick ? (
          <button
            type="button"
            onClick={() => {
              const body = buildQuick();
              if (body) void run(body);
            }}
            disabled={disabled}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg disabled:opacity-40"
          >
            Quick run
          </button>
        ) : null}
      </div>
      {quickHint ? <p className="text-xs text-muted">{quickHint}</p> : null}
      <p className="text-sm text-muted">Leaving this page does not stop a run. It is still here when you come back, and under Runs.</p>
      <JobList tool={tool} />
    </div>
  );
}

export function HydraRun({
  args,
  quickArgs,
  disabled,
  onFlags,
  lists,
}: {
  args: string[];
  quickArgs: string[];
  disabled: boolean;
  onFlags: (flags: string, extra: string[]) => void;
  lists?: { users?: string; passwords?: string };
}) {
  return (
    <ToolRun
      endpoint="/api/hydra"
      tool="hydra"
      disabled={disabled || args.length === 0}
      placeholder="-V -I"
      onFlags={(extra) => onFlags("", extra)}
      buildBody={(extra) => ({ args: [...args, ...extra], lists })}
      buildQuick={() => ({ args: quickArgs, lists })}
      quickHint="Quick run is -t 1 -f -I -V plus the host and the list. It skips the optional flags. Saved loot lists are written again for that run."
    />
  );
}
