export function AiRecon() {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-[#f4f6f8] p-4 text-[#1c2430] sm:p-5">
      <p className="text-center text-sm text-[#5c6b7a]">Two complementary approaches to information gathering</p>
      <h2 className="mt-2 rounded-md bg-[#1b2430] px-3 py-3 text-center text-lg font-semibold tracking-wide text-white">Reconnaissance methods</h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel
          tone="bg-[#3d7ec4]"
          title="Passive reconnaissance"
          subtitle="No direct interaction with the AI system"
          techniques={["HTTP headers and response metadata", "Public API documentation", "Source repository (GitHub, GitLab)", "Job posts for the stack"]}
          advantages={["Undetectable", "No rate limit", "History is still there"]}
          limits={["May be outdated", "Incomplete", "Config is not the runtime"]}
          labs={["2.1 HTTP fingerprinting (chat01)", "2.2 Code repository (git01)"]}
        />
        <Panel
          tone="bg-[#d4543c]"
          title="Active reconnaissance"
          subtitle="Direct interaction with the AI system"
          techniques={["Model behaviour and knowledge cutoff", "Tool enumeration by using one", "RAG probing at the chunk boundary", "Permission boundary from the error"]}
          advantages={["Runtime truth", "Hidden features", "Tests what it actually does"]}
          limits={["Writes logs", "Can alert", "Rate limits apply"]}
          labs={["3.1 Model fingerprint (chat02)", "3.2–3.3 RAG and agent (kb01, agent01)"]}
        />
      </div>
      <p className="mt-3 text-center text-sm text-[#5c6b7a]">Use both. Passive first, then one active request at a time.</p>
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
        <div className="rounded-md bg-[#2f7a62] p-2 text-xs">
          <p className="font-semibold">Advantages</p>
          <ul className="mt-1 space-y-1">
            {advantages.map((item) => (
              <li key={item}>+ {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md bg-[#4d5d73] p-2 text-xs">
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
