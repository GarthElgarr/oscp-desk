import { useMemo, useState } from "react";
import { readJwt } from "@/lib/jwt-read";

export function JwtCheck() {
  const [text, setText] = useState("");
  const result = useMemo(() => readJwt(text), [text]);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">API</p>
        <h2 className="text-lg font-semibold">JWT reader</h2>
        <p className="mt-1 text-sm text-muted">
          Paste a token or a Bearer line. It splits the header and the payload in the page and tells you which card is worth a request. It does not crack it and it does not send it.
        </p>
      </div>
      <div className="px-4 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">TOKEN</span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg outline-none"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNSIsInJvbGUiOiJ1c2VyIn0.signature"
            spellCheck={false}
          />
        </label>
      </div>
      {text.trim() ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div>
            <p className="text-sm font-semibold">{result.title}</p>
            <p className="mt-1 text-sm text-muted">{result.detail}</p>
            <p className="mt-1 text-sm text-fg">{result.next}</p>
          </div>
          {result.claims.map((item) => (
            <div key={item.name} className="rounded-lg bg-bg px-3 py-3">
              <p className="font-mono text-xs text-primary">
                {item.name} <span className="text-fg">{item.value}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{item.note}</p>
            </div>
          ))}
          {result.headerText ? (
            <div className="grid gap-3 md:grid-cols-2">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">
                {result.headerText}
              </pre>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">
                {result.payloadText}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
