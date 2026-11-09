export function AiRecon() {
  return (
    <section className="overflow-hidden rounded-lg border border-primary/50 bg-bg/80 p-4 text-fg sm:p-5">
      <p className="text-center font-mono text-xs tracking-[0.22em] text-primary">TWO SIGNALS · ONE TARGET</p>
      <h2 className="mt-2 rounded-md border border-primary/40 bg-raised px-3 py-3 text-center text-lg font-semibold tracking-wide text-fg">Reconnaissance methods</h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel
          tone="border border-[#3df0ff]/50 bg-[#062833]"
          title="Passive reconnaissance"
          subtitle="No direct interaction with the AI system"
          techniques={["HTTP headers and response metadata", "Public API documentation", "Repo files: dependencies, RAG config, prompts, history", "Job posts for the stack"]}
          advantages={["Undetectable", "No rate limit", "History is still there"]}
          limits={["May be outdated", "Incomplete", "Config is not the runtime"]}
          labs={["2.2.1 HTTP fingerprint (chat01)", "2.2.2 Code repository (git01)"]}
        />
        <Panel
          tone="border border-[#ff4d9a]/50 bg-[#2a1024]"
          title="Active reconnaissance"
          subtitle="Direct interaction with the AI system"
          techniques={["The assistant path in the page source", "401 against 404 on paths you already expect", "Identity, cutoff, and one style check", "RAG sources, scores, and the cutoff", "One tool, then the log rule if you have it"]}
          advantages={["Runtime truth", "Hidden features", "Tests what it actually does"]}
          limits={["Writes logs", "Can alert", "Rate limits apply"]}
          labs={["2.3.1 Service discovery", "2.3.2 Model fingerprint (chat02)", "2.3.3 RAG sources (kb01, kb02)", "2.4 Logs, if you were given them"]}
        />
      </div>
      <p className="mt-3 text-center font-mono text-xs tracking-wide text-muted">Use both. Passive first, then one active request at a time.</p>
    </section>
  );
}

function Panel({
  tone,
  title,
  subtitle,
  techniques,
  advantages,
  limits,
  labs,
}: {
  tone: string;
  title: string;
  subtitle: string;
  techniques: string[];
  advantages: string[];
  limits: string[];
  labs: string[];
}) {
  return (
    <div className={"rounded-lg p-3 text-white " + tone}>
      <p className="text-center text-lg font-semibold">{title}</p>
      <p className="text-center text-xs text-white/80">{subtitle}</p>
      <div className="mt-3 rounded-md bg-white/15 p-3">
        <p className="text-center text-xs font-semibold tracking-wide">Techniques</p>
        <ul className="mt-2 space-y-1 text-sm">
          {techniques.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-alive/40 bg-alive-bg p-2 text-xs text-fg">
          <p className="font-semibold">Advantages</p>
          <ul className="mt-1 space-y-1">
            {advantages.map((item) => (
              <li key={item}>+ {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-primary/30 bg-raised p-2 text-xs text-fg">
          <p className="font-semibold">Limitations</p>
          <ul className="mt-1 space-y-1">
            {limits.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-2 rounded-md bg-white/15 p-2 text-xs">
        <p className="font-semibold">Lab sections</p>
        <ul className="mt-1 space-y-1">
          {labs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
