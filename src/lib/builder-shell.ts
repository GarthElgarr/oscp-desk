import { Copy } from "lucide-react";
import { createElement, useState, type ReactNode } from "react";

export function Shell({ title, blurb, command, why, error }: { title: string; blurb: string; command: string; why: string; error: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return createElement(
    "article",
    { className: "min-w-0 overflow-hidden rounded-lg border border-primary bg-surface" },
    createElement(
      "div",
      { className: "border-b border-border px-4 py-3" },
      createElement("p", { className: "font-mono text-xs text-primary" }, "Builder"),
      createElement("h2", { className: "text-lg font-semibold" }, title),
      createElement("p", { className: "mt-1 text-sm text-muted" }, blurb),
    ),
    createElement(
      "div",
      { className: "flex flex-col gap-3 px-4 py-4" },
      createElement(
        "div",
        { className: "flex items-center justify-between gap-2" },
        createElement("p", { className: "font-mono text-xs tracking-wide text-muted" }, "COMMAND"),
        createElement(
          "button",
          {
            type: "button",
            disabled: !command,
            onClick: () => {
              void navigator.clipboard
                .writeText(command)
                .then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                })
                .catch(() => setCopied(false));
            },
            className: "inline-flex min-h-11 items-center gap-1 text-xs text-muted disabled:opacity-40",
          },
          createElement(Copy, { className: "size-3.5", "aria-hidden": true }),
          copied ? "Copied" : "Copy",
        ),
      ),
      createElement("pre", { className: "whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg" }, command || error),
      command ? createElement("p", { className: "text-sm text-fg" }, why) : null,
    ),
  );
}
