const chip = "rounded-md border border-white/30 bg-black/20 px-2 py-1 text-center text-xs text-white";

export function AiStack() {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-[#120818] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-center">
        <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">AI System Component Stack</h2>
        <div className="flex flex-col gap-2 text-white">
          <Layer className="border-[#7f93b8]/50 bg-gradient-to-r from-[#243044] to-[#3d4f68]" title="User/Application Layer" detail="Web UI, Mobile App, CLI, and API Clients" />
          <Layer className="border-[#6d8f78]/50 bg-gradient-to-r from-[#3d5a4c] to-[#1e3a32]" title="API/Gateway Proxy" detail="nginx, API Keys, Rate Limiting, and Load Balancing | Headers reveal backend info" />
          <div className="rounded-lg border border-[#9b7ec4]/50 bg-gradient-to-r from-[#4a3470] to-[#6a4d92] px-3 py-3 text-center">
            <p className="text-lg font-semibold">Orchestration Layer</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <span className={chip}>LangChain</span>
              <span className={chip}>LangGraph</span>
              <span className={chip}>CrewAI/AutoGen</span>
              <span className={chip}>Custom Orchestration</span>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Box className="border-[#c47a8a]/40 bg-gradient-to-br from-[#6a3044] to-[#8a4058]" title="RAG Pipeline" lines={["Embeddings (text-embedding-ada-002)", "Vector DB (ChromaDB, Pinecone, Milvus)", "Chunking (size, overlap, strategy)", "Similarity Threshold"]} />
            <Box className="border-[#c4a15a]/40 bg-gradient-to-br from-[#6a5020] to-[#8a6a30]" title="Agent Tools" lines={["MCP Servers (JSON-RPC)", "Tool Schemas (tool decorators)", "Function Calling", "Permission Boundaries"]} />
            <Box className="border-[#6aaa78]/40 bg-gradient-to-br from-[#1e4a32] to-[#2a6a44]" title="External Integrations" lines={["A2A Protocol (Agent-to-Agent)", "External APIs", "Database Connectors", "File System Access"]} />
          </div>
          <div className="rounded-lg border border-[#c47858]/40 bg-gradient-to-r from-[#6a3858] to-[#8a5040] px-3 py-3 text-center">
            <p className="text-lg font-semibold">Inference Server</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <span className={chip}>Ollama (local)</span>
              <span className={chip}>VLLM (production)</span>
              <span className={chip}>TGI (Hugging Face)</span>
            </div>
          </div>
          <Layer className="border-[#6a5a8a]/50 bg-gradient-to-r from-[#241838] to-[#3a2858]" title="Underlying Model" detail="Llama 3.x, Mistral 7B, Phi-3, Qwen 2.5, GPT-4, Claude, and Gemini" />
          <div className="rounded-lg border border-[#5a5070]/50 bg-[#1a1428] px-3 py-3 text-center">
            <p className="text-lg font-semibold">Enumeration Targets</p>
            <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
              <Dot color="bg-[#5b9bd5]" label="HTTP Headers" />
              <Dot color="bg-[#b07ad6]" label="API Endpoints" />
              <Dot color="bg-[#6dbf7a]" label="Tool Schemas" />
              <Dot color="bg-[#d66a5a]" label="Model Behavior" />
              <Dot color="bg-[#e0a84a]" label="Error Messages" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Layer({ className, title, detail }: { className: string; title: string; detail: string }) {
  return (
    <div className={"rounded-lg border px-3 py-3 text-center " + className}>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-xs text-white/80">{detail}</p>
    </div>
  );
}

function Box({ className, title, lines }: { className: string; title: string; lines: string[] }) {
  return (
    <div className={"rounded-lg border px-3 py-3 text-center " + className}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-white/80">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={"size-2 rounded-full " + color} />
      {label}
    </span>
  );
}
