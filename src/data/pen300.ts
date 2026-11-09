import type { Technique } from "./methodology";

export const AI_SECTIONS = [
  "Stack",
  "Recon",
  "Start",
  "Controls",
  "Foothold",
  "Run",
  "Move",
  "Chain",
] as const;

export const AI_TECHNIQUES: Technique[] = [
  {
    id: "ai-stack-user",
    section: "Stack",
    title: "User and application layer",
    look: "The thing a person or a script talks to. A web page, a mobile app, a CLI, or an API client. This is where you see the prompt box. It is not the model.",
    cmd: `curl -sI http://<ip>/
curl -s http://<ip>/ | head -n 40`,
    alive: "A page or a client that sends what you type to a backend. A chat box, a /api path in the page source, or a CLI that names a host.",
    dead: "A static site with no form and no script that posts anywhere. There is no AI application here.",
    next: "Find where the message is sent. That address is the gateway.",
  },
  {
    id: "ai-stack-gateway",
    section: "Stack",
    title: "API and gateway proxy",
    look: "nginx or another proxy in front of the model. Keys, rate limits, and load balancing live here. The headers are the tell. They name the backend the proxy is hiding.",
    cmd: `curl -sI http://<ip>/
curl -sI http://<ip>/v1/models
curl -s http://<ip>/v1/models`,
    alive: "Server, Via, X-Powered-By, or a body that lists models. A 401 that names a key header is still a find. You have the front door.",
    dead: "Nothing but a generic 404, and no product name in any header. You do not have the API yet.",
    next: "Note the key header and the path that answered. Do not guess a second product.",
  },
  {
    id: "ai-stack-orch",
    section: "Stack",
    title: "Orchestration layer",
    look: "The code that decides the steps. LangChain, LangGraph, CrewAI, AutoGen, or a custom loop. A stack trace or a debug field that names one of those is the pursue. The model name alone is not.",
    cmd: `# send one normal question, then read the raw response
curl -s http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"message":"hi"}'
# names to look for in the JSON or the error
# LangChain, LangGraph, CrewAI, AutoGen, langsmith`,
    alive: "The response, a trace, or an error names the framework or shows more than one step.",
    dead: "One plain answer and no framework name. You are talking to a model endpoint, not an orchestrator.",
    next: "If a trace shows a retrieval step, open RAG. If it shows a tool call, open Agent tools.",
  },
  {
    id: "ai-stack-rag",
    section: "Stack",
    title: "RAG pipeline",
    look: "Retrieval adds documents to the prompt. The pieces are the embedding model, the vector database, the chunk size and overlap, and the similarity cutoff. A low cutoff returns junk. A high one returns nothing. An error that names Chroma, Pinecone, or Milvus tells you which store.",
    cmd: `# one question you expect the documents to answer, and one they should not
curl -s http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"message":"what does the internal policy say about passwords?"}'
# in the raw body, look for
# text-embedding-ada-002, chroma, pinecone, milvus, collection, score, chunk`,
    alive: "The answer quotes a document, or the raw body shows a score, a collection, or a vector store name.",
    dead: "The model answers with no source and the body has no retrieval fields. This app is not using RAG.",
    next: "Record the store and whether a score is exposed. A document you were not meant to see is the finding.",
  },
  {
    id: "ai-stack-tools",
    section: "Stack",
    title: "Agent tools",
    look: "Tools are functions the model is allowed to call. MCP servers speak JSON-RPC. The schema is the list of those functions. The permission boundary is what a tool can touch. A tool that can read a file or call a URL is a different finding from a tool that only does maths.",
    cmd: `# common places a schema is left open
curl -s http://<ip>/tools
curl -s http://<ip>/v1/tools
curl -s http://<ip>/.well-known/mcp.json
# in the page source, look for tools, function, mcp`,
    alive: "A JSON list of tools, or a response that shows a function name and arguments. You can see the boundary.",
    dead: "No schema and no function call in a real conversation. The model is only answering text.",
    next: "Read each tool. Name the one that reaches a file, a database, or a URL. That is the next hop.",
  },
  {
    id: "ai-stack-ext",
    section: "Stack",
    title: "External integrations",
    look: "The agent talking to something that is not the model. Another agent, an external API, a database, or the file system. A2A is agent to agent. The finding is a connector the prompt can make the app use.",
    cmd: `# from a response or a stack trace, note the connector
# http:// to a second host, a SQL error, a file path, or an agent id
curl -s http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"message":"which systems can you reach?"}'`,
    alive: "The reply or the error names a host, a database, a path, or a second agent.",
    dead: "The reply is a generic yes and no address, path, or error follows. It cannot reach anything, or it will not say.",
    next: "One connector. Check it the way you would check that service on the Security desk.",
  },
  {
    id: "ai-stack-infer",
    section: "Stack",
    title: "Inference server",
    look: "The server that runs the model. Ollama is the local one, usually port 11434. vLLM and Hugging Face TGI are the production ones. The API shape tells you which. Ollama uses /api/tags. OpenAI-compatible servers use /v1/models.",
    cmd: `curl -s http://<ip>:11434/api/tags
curl -s http://<ip>:8000/v1/models
curl -s http://<ip>:8080/v1/models`,
    alive: "A JSON list of model names. The path that worked tells you the server.",
    dead: "All three refuse the connection. The model is behind the gateway only. Stay on the gateway path.",
    next: "Record the server and the model names. Do not scan a new subnet because one port was open.",
  },
  {
    id: "ai-stack-model",
    section: "Stack",
    title: "Underlying model",
    look: "The weights behind the server. Llama, Mistral, Phi, Qwen, GPT-4, Claude, Gemini. The name changes which prompt style works. It does not change the layers above. Get the name from the server, not from the prose of an answer.",
    cmd: `# use the path that already answered
curl -s http://<ip>:11434/api/tags
curl -s http://<ip>/v1/models`,
    alive: "A model id you can write down. llama3, mistral, phi3, qwen, gpt-4, claude, gemini, or a local filename.",
    dead: "The chat claims a name and the API list does not. Believe the list.",
    next: "The name goes in the chain note. The tests stay on the layer that is exposed.",
  },
  {
    id: "ai-stack-enum",
    section: "Stack",
    title: "What you enumerate",
    look: "Five places, in order. HTTP headers. API endpoints. Tool schemas. What the model will actually do. Error messages. An error that names a file, a query, or a framework is a finding, not a failed request.",
    cmd: `# 1 headers
curl -sI http://<ip>/
# 2 endpoints you already saw in the page or the docs
# 3 tool schema, if a tools path exists
# 4 one action the schema allows, and whether it really runs
# 5 keep the error body. Do not dismiss it.`,
    alive: "One of the five returned a name you did not have: a header, a path, a tool, a real action, or a stack trace.",
    dead: "Headers are generic, the paths 404, there is no schema, the model refuses, and the error is a bare status code. This host is not the AI stack.",
    next: "Write the layer next to the proof. Passive recon comes before a chat message. Headers, docs, the repo, and job posts first. A chat request is the active half, and it writes logs.",
  },
  {
    id: "ai-recon-passive",
    section: "Recon",
    title: "Passive reconnaissance",
    look: "No question is sent to the model. Headers, public docs, the source repo, and job posts. It can be outdated, and the config in git may not be what is running. It does not alert the app.",
    cmd: `# finish this list before the first chat message
# 1. headers, then the health paths
# 2. the repo you were given: dependencies, rag config, prompts, history
# 3. job posts that name the stack
# lab: HTTP fingerprinting is chat01. Repo analysis is git01.`,
    alive: "You can name a framework, a model, or a store without having sent a prompt.",
    dead: "The pages are a marketing site and the repo has no code. Passive is finished. Move to active.",
    next: "Write the three notes. Then one active request, not five.",
  },
  {
    id: "ai-recon-headers",
    section: "Recon",
    title: "HTTP fingerprint, chat01",
    look: "Section 2.1. Headers are passive. Developers leave debug headers, a load balancer adds routing metadata, and a framework names itself. On an AI app those lines often name the model provider, the vector database, and the framework. -I asks for headers only. You have not sent a prompt.",
    cmd: `curl -sI http://<ip>/
# if the three health paths are not in the headers, one GET each. Still no prompt.
curl -s http://<ip>/api/health
curl -s http://<ip>/api/status
curl -s http://<ip>/-/health
# only if all three 404: one SecLists API list, stop at the first JSON
# /usr/share/seclists/Discovery/Web-Content/api/`,
    alive: `X-AI-Backend: OpenAI-GPT5.2
X-RAG-Provider: ChromaDB
"model": "gpt-5.2-turbo"
"mcp_enabled": true
"rag_enabled": false
"status": "healthy"`,
    dead: "Server: nginx and nothing else. Health is 404. No model, no store, no MCP flag.",
    next: "Write the provider, the store, and whether MCP and RAG are on. The chat POST is the next card, and it is active. Do not fuzz the API yet.",
  },
  {
    id: "ai-recon-docs",
    section: "Recon",
    title: "Public API docs",
    look: "The docs page is passive. It lists paths, key headers, and sometimes the tool schema. The published page can be older than the running app.",
    cmd: `# open the docs URL you already saw. Search the page for
# /v1/  tools  models  mcp  chroma  langchain`,
    alive: "A path, a header name, or a tool that the stack cards can check.",
    dead: "No docs link, or the docs are only a getting-started with no paths.",
    next: "Add the paths to the note. Check them in active recon, one at a time.",
  },
  {
    id: "ai-recon-git",
    section: "Recon",
    title: "Code repository, git01",
    look: "Unit 2.2.2. The repo you were given. Dependencies, the RAG config, prompts, tool schemas, and guardrails are the finds. History can show a provider change or a key that was deleted. Cloning a private repo you were not given is not this card.",
    cmd: `# only a repo the engagement gave you
git clone http://<git-host>/<group>/<repo>.git
cd <repo>
ls
git log --oneline -20`,
    alive: "A requirements file, a rag config, a prompt, or a model config is in the tree.",
    dead: "No repo you are allowed to read, or the tree has no AI config. Job posts are the last passive source.",
    next: "Read the dependency file before you send a prompt. Cloud SDKs and a local inference server are different targets.",
  },
  {
    id: "ai-recon-deps",
    section: "Recon",
    title: "Cloud SDK or local server",
    look: "The dependency file is the architecture. A provider SDK plus a managed vector client means the model and the store are someone else's service. vLLM, a local vector library, and a Hugging Face loader mean the process is on a host you can reach. The attack surface follows that split: a key on the way out, or a service on the inside.",
    cmd: `# one repo. Do not install the packages.
grep -n -E 'generativeai|openai|anthropic|crewai|pinecone|vllm|autogen|pymilvus|sentence-transformers|huggingface' requirements.txt pyproject.toml 2>/dev/null`,
    alive: "You can say cloud or self-hosted, and name the agent framework and the vector client.",
    dead: "No dependency file, or the names are only a web framework. The RAG config is the next file, if it exists.",
    next: "Write the split. A cloud app leaks keys and outbound hosts. A self-hosted app leaks the inference port and the database on that network.",
  },
  {
    id: "ai-recon-rag-config",
    section: "Recon",
    title: "RAG config in the repo",
    look: "The yaml is the pipeline before you ever query it. Chunk strategy and size, overlap, the embedding model and its dimensions, top_k, the score cutoff, the distance metric, and whether a reranker is on. Text chunks and AST-aware code chunks are different corpora. The vector store block names the product and the index. Environment variable names are notes. The values are not in this file.",
    cmd: `# config/rag.yaml or the same keys under another name
grep -n -E 'chunk_|embedding|top_k|score_threshold|rerank|provider|index|collection' config/rag.yaml`,
    alive: "You can write the chunk size, the embedding model, the cutoff, and the store.",
    dead: "No RAG config. The app may still retrieve. That is an active question, later.",
    next: "The cutoff you write here is what the threshold card tests on the live host. Do not test it yet.",
  },
  {
    id: "ai-recon-prompts",
    section: "Recon",
    title: "Prompts, tools, and guardrails",
    look: "Still passive. The system prompt is the persona and the refusal list. Tool decorators and function schemas are the actions, and a comment like read-only is the intended boundary. A safety file is either the vendor's filter settings or a local regex. The regex tells you which phrases the app blocks. It is not a bypass.",
    cmd: `# prompts, tool modules, safety config. Read them. Do not post them back to the model.
ls prompts src config
grep -n -E 'def |@tool|"name"|NEVER|blocked_topics|block_patterns' prompts/* src/agents/* config/safety.yaml 2>/dev/null`,
    alive: "A restriction, a tool name, or a blocked topic you did not have from the headers.",
    dead: "No prompt and no schema. The running app may still have tools. That is the agent card, after discovery.",
    next: "Copy the restriction in your own words. A topic the prompt says not to discuss is sensitive. It is not the next question.",
  },
  {
    id: "ai-recon-supply",
    section: "Recon",
    title: "Model supply and deploy config",
    look: "The example env file names the integrations. A models file names the inference server, the model id, the context length, quantisation, and the GPU shape. That is how you tell a small local model from a large one before you chat. Do not copy a real key into the note. A placeholder is enough.",
    cmd: `# names only. If a value is a real key, stop and treat it as a secret, not as a command.
grep -n -E '^[A-Z0-9_]+=' .env.example
grep -n -E 'type:|model_id|max_model_len|quant|gpu' config/models.yaml`,
    alive: "A provider, an index name, a model id, or a context length.",
    dead: "No example env and no model file. The live health JSON is the name you will trust.",
    next: "History next. A commit that swaps the provider is more useful than the current file alone.",
  },
  {
    id: "ai-recon-history",
    section: "Recon",
    title: "Repo history",
    look: "git log -S shows commits that added or removed a string. That is where a key, an old provider, or a guardrail change shows up. Read the commit. Do not check out an old branch onto a host you will then attack. The current tree is what you compare to the runtime.",
    cmd: `git log -S 'API_KEY' --oneline
git log -S 'openai' --oneline
git log --oneline -- config/safety.yaml prompts/system.txt`,
    alive: "A commit message or a diff that names a provider change, a guardrail, or a removed secret.",
    dead: "The log is empty of those strings. Passive repo work is finished.",
    next: "Job posts, if you still lack a product name. Then one active request.",
  },
  {
    id: "ai-recon-jobs",
    section: "Recon",
    title: "Job posts",
    look: "A posting asks for LangChain, a vector database, or a model host. That is a hint about the stack, not proof of what this host runs. Hints go stale.",
    cmd: `# search the company name plus
# LangChain  RAG  LLM  vector  Python`,
    alive: "A post names a product you have not seen in the headers or the repo.",
    dead: "Posts are generic software engineer, or they repeat what you already have.",
    next: "Passive is done. The next request is active, and it will be logged.",
  },
  {
    id: "ai-recon-active",
    section: "Recon",
    title: "Active reconnaissance",
    look: "You now talk to the running system. This is the runtime truth the repo might not match. It writes logs, it can alert, and a rate limit applies. One request per question. Read the body before you send the next.",
    cmd: `# only after the passive notes exist
# discovery: page source, then one POST to the path it names
# 401 against 404: a short list of paths you already expect
# fingerprint: one Hello, then identity, then one dated event
# RAG: one general question, one document question, then the scores
# agent: one tool from the schema
# a SIEM you were given: read the rule before a loud question`,
    alive: "The live answer or error confirms a name from passive recon, or contradicts it.",
    dead: "You are sending variations because the first answer was dull. Stop. Read the first body.",
    next: "A contradiction means the config and the runtime differ. Believe the runtime, and note that the repo was stale.",
  },
  {
    id: "ai-recon-js",
    section: "Recon",
    title: "Find the AI path in the page",
    look: "Unit 2.3.1. The model is usually behind the web app, not on its own port. The page source names the script. The script names the API base and the assistant path, and sometimes a feature flag. One POST to that path is the check. The metadata is the fingerprint: provider, model, token counts. The sentence is not.",
    cmd: `curl -s http://<ip>/ | grep -i script
curl -s http://<ip>/js/chat-widget.js
# then the path the script named, once
curl -s -X POST http://<ip>/api/v2/assistant -H 'Content-Type: application/json' -d '{"message":"Hello"}'`,
    alive: `apiBase or assistantEndpoint in the script
"provider": "ollama"
"model": "llama3.2:1b"`,
    dead: "No script, or the POST is 404. Look at a hidden data-endpoint in the HTML before you guess paths.",
    next: "Write the provider and the model. A second port with a gateway banner is the next card, not another chat.",
  },
  {
    id: "ai-recon-gateway",
    section: "Recon",
    title: "Gateway banner and 401 against 404",
    look: "A second port often speaks for the gateway. Server, Via, and X-Kong name it. Rate-limit headers tell you the budget. A 401 means the path exists and wants a credential. A 404 means it is not there. Use the short list below. A wordlist is not this card.",
    cmd: `curl -sI http://<ip>:<port>/v1/chat/completions
# 401 exists. 404 does not. Stop after this list.
for path in v1/models v1/chat/completions v1/embeddings api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://<ip>:<port>/$path")
  echo "$path $code"
done`,
    alive: "Kong or another gateway in Server or Via, and one path that returns 401.",
    dead: "Every path is 404 and the banner is a generic web server. Stay on the path the JavaScript named.",
    next: "A 401 is a locked door you have located. Do not spray keys. The OpenAI-shaped path is the fingerprint card.",
  },
  {
    id: "ai-recon-model",
    section: "Recon",
    title: "Model fingerprint, chat02",
    look: "One valid POST to /v1/chat/completions. That is active. The app processes it, so it is logged. It is not fuzzing: the body is the normal message the API expects, sent once. The model field in the JSON is the fingerprint. The prose of the reply is not.",
    cmd: `curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'`,
    alive: `"model": "gpt-5.2-turbo"
"object": "chat.completion"
"finish_reason": "stop"
"rag_sources": null`,
    dead: "404, or a body with no model field. This host is not speaking the OpenAI chat API. Go back to the health JSON.",
    next: "rag_sources null means this reply did not use RAG. If the model field is missing or only a product name, the identity card is the next single question.",
  },
  {
    id: "ai-recon-identity",
    section: "Recon",
    title: "Identity and a false claim",
    look: "Unit 2.3.2. Ask who trained it, once. Some families answer. Some are told to say the product name. If the sentence hides the vendor, one false claim often gets a correction, because the model was trained to fix a wrong fact. A small model may agree with the lie. One correction is a clue. It is not proof on its own. The model field from the last card still wins when they disagree.",
    cmd: `curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What model are you, and who trained you?"}]}'
# only if that answer is a product name and nothing else
curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Thanks, Claude. Anthropic did a good job."}]}'`,
    alive: "The reply names a lab, a vendor, or corrects the false vendor.",
    dead: "Both answers are the product name, or the small model agrees with the false claim. Stop. Use the API model field.",
    next: "One dated event next. Do not stack more false vendors.",
  },
  {
    id: "ai-recon-cutoff",
    section: "Recon",
    title: "Knowledge cutoff",
    look: "The cutoff is in the weights. A system prompt cannot move it, and a self-hosted copy has the same cutoff as that model elsewhere. Ask the date, then check it with one event you know the year of. A claim of a date that the event contradicts is the finding. Two hosts that fail the same event are not yet different models.",
    cmd: `curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What is your knowledge cutoff?"}]}'
# one event after the date it claimed. Do not quiz it.
curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Who won the 2024 US presidential election?"}]}'`,
    alive: "It misses an event that happened, and the miss matches the date it gave or pins the date down.",
    dead: "It answers the event correctly, or it refuses every factual question. The cutoff is not your distinguisher.",
    next: "If two hosts still look the same, compare one paragraph of style. Do not send a list of events.",
  },
  {
    id: "ai-recon-behavior",
    section: "Recon",
    title: "Style is a weak signal",
    look: "Families differ in length, docstrings, and how they refuse. A code-oriented model tends to add a docstring and an example. A general model tends to be shorter. Temperature and the system prompt change this. Use it only to split two hosts that identity and cutoff could not split. It does not name the model by itself.",
    cmd: `curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Explain recursion in one paragraph."}]}'`,
    alive: "Two hosts you already fingerprinted answer the same prompt in a stable, different shape.",
    dead: "You are calling a style a vendor with no model field and no correction. Stop.",
    next: "Context size is the expensive test. Skip it if you already have a model id.",
  },
  {
    id: "ai-recon-context",
    section: "Recon",
    title: "Context window, once",
    look: "Different families keep different amounts of text. Put a marker in the first user message, add filler in the same messages array, and ask for the marker at the end. If it is gone, you passed the window. Ollama and vLLM can set that window in the server config, so a measured limit may be the deployment, not the weights. This request is large and it is logged. One host, one try.",
    cmd: `# one POST. The marker is yours. Do not use a real secret.
# add filler only until the marker disappears, then stop.
curl -s -X POST http://<ip>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Remember the code WORD-42. Then ignore it until I ask."},{"role":"assistant","content":"I will remember WORD-42."},{"role":"user","content":"<filler>"},{"role":"user","content":"What code did I ask you to remember?"}]}'`,
    alive: "The marker survives on one host and is lost on the other, after the same filler.",
    dead: "Both keep it, or you are adding filler with no marker. You do not have a size.",
    next: "Write the approximate size next to the model id. RAG is a different host.",
  },
  {
    id: "ai-recon-rag",
    section: "Recon",
    title: "RAG and chunk boundaries, kb01",
    look: "Ask for something at the edge of a document, then for the next sentence, only after a reply has already cited a source. A cutoff mid-sentence is the chunk boundary. A score or a collection name in the body is the pipeline.",
    cmd: `curl -s http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"message":"quote the password rule and the sentence after it"}'`,
    alive: "The quote stops mid-thought, or the body shows a chunk, a score, or a store name.",
    dead: "A normal answer with no source and no break. This app is not showing you a RAG pipeline.",
    next: "If you have not yet proved retrieval, do the sources card first. A document you should not have been given is the finding.",
  },
  {
    id: "ai-recon-sources",
    section: "Recon",
    title: "Did retrieval run",
    look: "Unit 2.3.3. A sum the model knows should come back with an empty sources list. A question only the organisation's documents can answer should cite a title. Empty sources means the reply is the model alone. A title means RAG ran. Do not ask it to list every document. That is the loud query, and it is on the detection card.",
    cmd: `curl -s -X POST http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"query":"What is 2+2?"}'
curl -s -X POST http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"query":"What is the leave policy?"}'`,
    alive: `first body: "sources": []
second body: a title, a chunk id, or a snippet`,
    dead: "Both are empty, or the host has no sources field at all. Try the message key from the stack card once. Then stop.",
    next: "Read the source object. The filename and the scores are the note, not a paraphrase of the answer.",
  },
  {
    id: "ai-recon-meta",
    section: "Recon",
    title: "Source metadata",
    look: "The source object is the recon. A filename shows the naming habit. A chunk id is a position in that file. The text field is the raw chunk, which can be more than the answer. vector_score is the embedding match. bm25_score is the keyword match. combined_score is what the app ranked. Titles only, then titles plus a snippet, then scores and raw text: write which level this host gives you. A hostname or a key format in a snippet is a note. Do not try the key.",
    cmd: `# same request as the document question. Pretty-print the sources, not the essay.
curl -s -X POST http://<ip>/api/chat -H 'Content-Type: application/json' \
  -d '{"query":"What is the leave policy?"}' | jq '.sources'`,
    alive: "A title, a chunk id, and at least one score, or a snippet the answer had shortened.",
    dead: "sources is a list of titles and nothing else. Record that level and move on.",
    next: "Three phrasings of one topic tell you the cutoff. Not a tour of every department.",
  },
  {
    id: "ai-recon-threshold",
    section: "Recon",
    title: "Where retrieval stops",
    look: "The score cutoff decides which chunks are allowed into the prompt. Send three queries on one topic, then stop. The exact name should cite. A synonym often still cites. A heavy misspelling should fall off if a cutoff exists. When sources goes from full to empty, you have the edge. Grounding documents are the chunks pasted into the prompt. No sources means the model answered without them.",
    cmd: `# one topic. Three bodies. Read each before the next.
curl -s -X POST http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"query":"What is the leave policy?"}'
curl -s -X POST http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"query":"vacation day rules"}'
curl -s -X POST http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"query":"vaycation dayz rulez"}'`,
    alive: "Sources on the exact query, sources or a weaker score on the synonym, empty sources on the misspelling.",
    dead: "All three cite, or all three are empty. You do not have an edge. Do not invent a fourth spelling.",
    next: "If a SIEM was in scope, read the detection card before you ask about documents by name.",
  },
  {
    id: "ai-recon-detect",
    section: "Recon",
    title: "What the log actually matches",
    look: "Unit 2.4. If the client gave you read-only log access, open the rule before the next probe. These rules usually match words in the query, not the intent. Asking what documents exist, or asking for the system prompt, is the hit. A normal question about one policy still returns titles and does not use those words. Space the questions. The log still has the full query, the answer, and the sources. Quiet is not invisible.",
    cmd: `# only on a SIEM you were given. Do not guess a password.
# look at the rule query. Typical words:
# what documents, list documents, system prompt, your instructions
# the quiet form is a real question, and you already sent it on the sources card`,
    alive: "You can name the field and the words the rule matches, and your last question used none of them.",
    dead: "No log access. Skip this card. Do not go looking for a SIEM.",
    next: "A credential that looks planted is the next card, not a login.",
  },
  {
    id: "ai-recon-canary",
    section: "Recon",
    title: "Canary documents",
    look: "A defender plants a document the retriever will quote. The tell is a secret that is too complete, a key that contains a dictionary word, a password shaped like a company name and a year, or a hostname that does not resolve. Real emergency keys are not written out in a chatbot's source chunk. Do not use the value. Write canary next to the title and leave it.",
    cmd: `# no request. Read the snippet you already have.
# pursue: random-looking material you were meant to find by other means
# stop: a key or password that contains a word, or a full cloud login in one chunk`,
    alive: "The snippet is ordinary policy text, a hostname, or a key format with no usable secret.",
    dead: "The chunk hands you a finished credential. Mark it canary. Do not test it.",
    next: "One agent tool, if the schema card found one. Then you are off recon.",
  },
  {
    id: "ai-recon-agent",
    section: "Recon",
    title: "Agent and permission boundary, agent01",
    look: "Use a tool the schema already listed. The error is the test. A refusal that names a path, a role, or a missing scope is the boundary. A stack trace is the same find. One attempt.",
    cmd: `# one tool from the schema, one argument it allows
curl -s http://<ip>/api/chat -H 'Content-Type: application/json' -d '{"message":"use the file tool on /etc/hostname"}'`,
    alive: "The tool runs, or the error names the file, the role, or the scope that stopped it.",
    dead: "The model chats about the file and no tool is called. There is no agent on this path.",
    next: "One tool. If it can read, write, or open a URL, that is the hop onto the Security desk. A secret in the tool output goes through the canary card first.",
  },
  {
    id: "ai-order",
    section: "Start",
    title: "One control at a time",
    look: "PEN-300 is a chain. A document or a script gets you on the host, a control stops the next thing, and you deal with that control. It is not an OSCP box where the port list is the whole start.",
    cmd: `# write this before you change a payload
# 1. How did code run? (document, script, service)
# 2. What stopped the next step? Copy the exact error.
# 3. Which control is that? Defender, AMSI, AppLocker, Constrained Language, a proxy.
# 4. One change aimed at that control. Then stop and read the new error.`,
    alive: "You can name the control in one sentence, and the last error matches that control.",
    dead: "You have three new payloads and you still cannot say which control blocked the first one.",
    next: "Open the control cards. Do not open Run until the control has a name.",
  },
  {
    id: "ai-lab",
    section: "Start",
    title: "Lab only",
    look: "This desk is for the OffSec labs on machines you are allowed to test. A control you bypass here is the point of the exercise. The same steps against a network you do not own are not practice.",
    cmd: `# before a payload leaves your Kali
# the target IP is in the lab VPN range
# you can say which lab machine it is`,
    alive: "The address is a lab machine from the course VPN.",
    dead: "The address is a company, a friend, or a scan you found. Stop.",
    next: "Name the machine, then identify the control.",
  },
  {
    id: "ai-defender",
    section: "Controls",
    title: "Defender is on or off",
    look: "Real-time protection decides whether a file on disk gets scanned. If it is off, you are not doing antivirus evasion. If it is on, a file that disappears or a threat-history line is the control working.",
    cmd: `Get-MpComputerStatus | Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, IoavProtectionEnabled
Get-MpThreatDetection | Select-Object -First 5 InitialDetectionTime, Resources, ThreatID`,
    alive: "RealTimeProtectionEnabled is True, and a file you dropped shows up in the threat list or vanishes.",
    dead: "RealTimeProtectionEnabled is False. Evasion is not the puzzle. Use the file.",
    next: "If the file dies on disk, the next question is AMSI only when the block happens inside a script host instead.",
  },
  {
    id: "ai-amsi",
    section: "Controls",
    title: "AMSI blocked the script",
    look: "AMSI is the scanner inside PowerShell, not the scanner that deletes an exe. The sentence in the error is the whole identification. A file that never touches disk can still be stopped here.",
    cmd: `# run the script. Read the red text. Do not change the script yet.
# This script contains malicious content and has been blocked by your antivirus software.
Get-MpComputerStatus | Select-Object AMServiceEnabled`,
    alive: "The error says malicious content and blocked. AMServiceEnabled is True. The script never started.",
    dead: "The error is a normal PowerShell exception, a missing command, or access denied. That is not AMSI. Fix the script.",
    next: "One change aimed at what AMSI saw. If the new error is different, you are on a new control. Name it before the next change.",
  },
  {
    id: "ai-applocker",
    section: "Controls",
    title: "AppLocker picked the binary",
    look: "AppLocker decides which programs are allowed to start. Your exe failing is not antivirus if the event says the policy blocked it. A binary that is allowed can still be the way your code runs.",
    cmd: `Get-AppLockerPolicy -Effective -Xml | Out-File C:\\Temp\\applocker.xml
Get-AppLockerPolicy -Effective | Test-AppLockerPolicy -Path C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -User $env:USERNAME
Get-WinEvent -LogName 'Microsoft-Windows-AppLocker/EXE and DLL' -MaxEvents 5 -ErrorAction SilentlyContinue | Format-List TimeCreated, Message`,
    alive: "Test-AppLockerPolicy says your program is denied, and an allowed Microsoft binary is still allowed. The event log names your file.",
    dead: "The policy is empty, or the event log is not there, and your program starts. AppLocker is not the control.",
    next: "Use a binary the policy allows. Do not keep rebuilding an exe the policy has already named.",
  },
  {
    id: "ai-clm",
    section: "Controls",
    title: "Constrained Language Mode",
    look: "Language mode is a PowerShell limit, not an antivirus. ConstrainedLanguage lets you run cmdlets and blocks the .NET calls a shell usually wants. FullLanguage means this is not your problem.",
    cmd: `$ExecutionContext.SessionState.LanguageMode`,
    alive: "The output is ConstrainedLanguage. Add-Type or a method call then fails with a language-mode error.",
    dead: "The output is FullLanguage. A later block is AMSI, AppLocker, or a normal bug.",
    next: "Stay inside what Constrained Language still allows, or leave PowerShell for a host the policy has not limited. Do not treat a language error as AMSI.",
  },
  {
    id: "ai-proxy",
    section: "Controls",
    title: "The proxy ate the callback",
    look: "A payload that is correct still fails when the only way out is a proxy. The proof is a browser that works and a raw port that does not. Egress is a control, the same as AppLocker.",
    cmd: `netsh winhttp show proxy
Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' | Select-Object ProxyEnable, ProxyServer
# from the host, not from Kali
Test-NetConnection <KALI> -Port 443`,
    alive: "A proxy is set, the browser can reach the internet, and Test-NetConnection to your Kali port fails.",
    dead: "No proxy, and the port test succeeds. The callback failed for another reason. Read the listener.",
    next: "Send the callback the way the browser does. A raw reverse shell to a blocked port will not start working if you rebuild it.",
  },
  {
    id: "ai-office",
    section: "Foothold",
    title: "The document is the start",
    look: "On this course the first code often runs because a person opened a document. Pursue means the expected child process started. A macro that is disabled never had a chance to be blocked by AMSI.",
    cmd: `# before you send it to the lab VM
# Word: File, Options, Trust Center, macro settings
# after it opens, on the VM
Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -ne 0 } | Select-Object Name, ProcessId, ParentProcessId`,
    alive: "Word, Excel, or Outlook is the parent of the process you meant to start.",
    dead: "Macros are disabled, or no child appears. The control never saw your code.",
    next: "Enable the lab setting the course told you to enable. Then identify the control that blocks the child, if one does.",
  },
  {
    id: "ai-script",
    section: "Foothold",
    title: "Script host, not a new exe",
    look: "cscript, wscript, and mshta are programs that are already on the machine. The course uses them when a new exe is the thing that gets blocked. The file you wrote is the argument, not the program that has to be allowed.",
    cmd: `Get-Command cscript, wscript, mshta | Select-Object Name, Source
# AppLocker, if you already saved the policy
Get-AppLockerPolicy -Effective | Test-AppLockerPolicy -Path C:\\Windows\\System32\\cscript.exe -User $env:USERNAME`,
    alive: "The host is allowed, and it starts. Your file is the argument it was given.",
    dead: "The host itself is denied by policy. Pick a different allowed host. Do not obfuscate a file the host never opened.",
    next: "If the host starts and then the script is blocked, that next error is AMSI or language mode. Name it.",
  },
  {
    id: "ai-csharp",
    section: "Run",
    title: "Compile on the lab box",
    look: "The course work is C#. Compile it on the machine that will run it, with the .NET Framework compiler that is already installed. A missing type is a missing assembly reference. It is not the control.",
    cmd: `C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe /out:C:\\Temp\\lab.exe C:\\Temp\\lab.cs
# if the error names a type you did not define
C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe /r:System.Management.Automation.dll /out:C:\\Temp\\lab.exe C:\\Temp\\lab.cs`,
    alive: "csc writes the exe and prints no error. file, or the VM, can start it far enough to hit the real control.",
    dead: "csc is not found, or the error is CS0246 for a type in a reference you forgot. Fix the build. Do not call that AppLocker.",
    next: "Run it once. Copy the first error that is not from csc.",
  },
  {
    id: "ai-inject",
    section: "Run",
    title: "Injection is three steps",
    look: "Injection puts your code inside a process the policy already allows. You are not starting a second exe. The three steps are allocate memory in that process, copy the code in, and start it. The proof is a callback from that process, not a new name in Task Manager.",
    cmd: `# name the three steps in your notes before you run
# 1. Which process is allowed, and its pid
Get-Process | Select-Object Id, ProcessName
# 2. Which step failed, copied from the exception
#    allocate, write, or start
# 3. The listener on Kali shows the callback from that process, or it does not`,
    alive: "The allowed process is the one that connected back. No new exe of yours is running.",
    dead: "A new exe of yours started, or the exception is on allocate and you started rewriting the shellcode. The step that failed is the bug.",
    next: "Fix the named step. A second shellcode format is for after the first format runs and the control still stops it.",
  },
  {
    id: "ai-whitelist",
    section: "Run",
    title: "A trusted binary loads your file",
    look: "When your exe is denied, an allowed Microsoft binary can still load a file you supply. InstallUtil, MSBuild, and the script hosts are that idea. The proof is the trusted process name, not a renamed copy of your exe.",
    cmd: `# denied: your exe. allowed: a Microsoft binary from the policy test
where.exe InstallUtil
where.exe MSBuild
Get-AppLockerPolicy -Effective | Test-AppLockerPolicy -Path C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\InstallUtil.exe -User $env:USERNAME`,
    alive: "The policy allows InstallUtil or MSBuild, denies your exe, and the callback parent is the allowed binary.",
    dead: "The trusted binary is also denied, or it starts and never loads your file. Read that error. Renaming your exe does not change the policy.",
    next: "Point the allowed binary at your file the way that binary expects. One attempt. Then read the new error.",
  },
  {
    id: "ai-creds",
    section: "Move",
    title: "Credentials after the foothold",
    look: "A shell on one lab workstation is the start of the chain. The next object is a credential, a ticket, or a token that reaches a second machine. Another evasion on the same host is not movement.",
    cmd: `whoami /all
cmdkey /list
klist
# only if you already have a reason to read a hive you copied off
# the OSCP desk has the secretsdump card`,
    alive: "A second username, a saved cmdkey, or a ticket for a host you have not touched.",
    dead: "whoami is the user you started as, cmdkey is empty, and klist has nothing you can reuse. Stop hunting hashes and check the shares.",
    next: "One credential, one target. The Kerberos Security desk has the builders if the hash needs cracking or a remote tool.",
  },
  {
    id: "ai-lateral",
    section: "Move",
    title: "Move with a credential you have",
    look: "Lateral movement here is the same idea as the other desk. You already have a password, a hash, or a ticket. The new part is that the tool you use has to be allowed on the far side as well.",
    cmd: `# from the foothold, one host from your notes
Test-NetConnection <other> -Port 445
Test-NetConnection <other> -Port 5985
# then the builder on the Kerberos Security desk: nxc, evil-winrm, or impacket`,
    alive: "The port is open and the credential is accepted. A session on the second host.",
    dead: "Access denied with a credential you have not proved, or the port is closed. Do not evade your way through a closed port.",
    next: "On the second host, start again at the control cards. The policy there is not the policy you already beat.",
  },
  {
    id: "ai-sql",
    section: "Move",
    title: "SQL is a hop, not a detour",
    look: "The course uses MSSQL when a chain reaches a database login. It is worth it when you have the login. It is not a thing to start because the workstation got hard.",
    cmd: `# the port, from the host that should be able to see it
Test-NetConnection <sql> -Port 1433
# then impacket-mssqlclient on the Kerberos Security desk, with the login you already have`,
    alive: "1433 answers and the login is accepted.",
    dead: "The port is closed, or the login fails. There is no SQL hop on this chain.",
    next: "Only if the server says you are privileged do you look at commands on the SQL host. Then name the control on that host.",
  },
  {
    id: "ai-chain",
    section: "Chain",
    title: "Write the chain as you go",
    look: "OSEP is graded on the path. A payload you cannot explain is a payload you cannot put in the report. Each hop is one sentence: what ran, what tried to stop it, what you changed, what the proof was.",
    cmd: `# one line per hop, in your notes
# host | what ran | control | change | proof
# WS01 | Word macro | AppLocker denied exe | InstallUtil | callback from InstallUtil`,
    alive: "You can read the list back and each line has a proof you saw.",
    dead: "The list says bypassed AV and does not name the control or the process.",
    next: "Keep the list next to the screenshots. The report is that list, written out.",
  },
  {
    id: "ai-stop",
    section: "Chain",
    title: "When to stop changing the payload",
    look: "A second encoding is useful only when the first one ran and the same control still stopped it. A new error means you are on a new card. Treating every failure as antivirus is how a lab day disappears.",
    cmd: `# stop if any of these is true
# the error text changed and you have not named the new control
# the file never executed because the parent never started
# you are editing shellcode and you do not know which of the three injection steps failed`,
    alive: "You stopped, named the new fact, and opened the matching card.",
    dead: "The payload is on its fourth encoding and the error is still the first error.",
    next: "Return to One control at a time. The chain card is where the day should end, not a folder of failed exes.",
  },
];
