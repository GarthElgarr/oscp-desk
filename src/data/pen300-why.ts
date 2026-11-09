export const AI_WHY: Record<string, string> = {
  "ai-stack-user": `curl -sI fetches the headers only. curl -s fetches the page. head keeps the first 40 lines so you see the title and the scripts without a full dump. A chat box or a script that posts to /api is the application. A page with no request behind it is not an AI target.`,

  "ai-stack-gateway": `The same header request against / and against /v1/models. /v1/models is the OpenAI-compatible list. A body that lists models, or a 401 that tells you the header the key goes in, means you found the proxy. Server and Via name the software in front. A generic 404 with empty product headers means try the path you saw in the page, not a list of guesses.`,

  "ai-stack-orch": `The POST is one normal message, so you can read the raw JSON. A framework name, a steps array, or a langsmith trace means something is choosing tools and retrieval before the model speaks. One plain answer means the path goes to the model and there is no orchestrator to test.`,

  "ai-stack-rag": `The question is one the documents should answer. A quoted policy, a score, a collection name, or text-embedding-ada-002 in the body means retrieval happened. Chroma, Pinecone, and Milvus are the stores. Chunk size and the similarity cutoff explain why a near miss came back or a real document did not. No source and no retrieval fields means this card is finished.`,

  "ai-stack-tools": `The three curls are the usual open schema paths. MCP is a JSON-RPC tool server. A tools array with names and arguments is the permission list. Read it. A calculator is not a file read. A tool with a path or a URL is the boundary that matters. No schema and no function call in the conversation means the model is only chatting.`,

  "ai-stack-ext": `The message asks what it can reach, and you believe a host, a path, or a SQL error more than a polite answer. A2A is another agent, not another website. One named connector is the hop. A vague yes with nothing you can connect to is a stop.`,

  "ai-stack-infer": `11434 is Ollama's port, and /api/tags lists local models. 8000 and 8080 with /v1/models are the usual vLLM and TGI ports. The path that returns JSON is the server type. Connection refused on all three means the inference port is not exposed. Use the gateway you already have.`,

  "ai-stack-model": `The model id comes from the tags or models list you already fetched. The chat's claim of its own name is not evidence. Llama, Mistral, Phi, Qwen, GPT-4, Claude, and Gemini are the families. The id tells you which prompt notes apply. It is not a new scan.`,

  "ai-stack-enum": `The five lines are the order. Headers first, because they are free. Endpoints you already saw, not a wordlist of every AI path. The tool schema if it exists. Then one action that schema allows, to see if it really runs. The error body is kept, because a stack trace names the layer. A bare 404 on all five means this host is not the stack. Passive notes come before a chat message. The chat is logged.`,

  "ai-recon-passive": `The list is the order. Headers and docs, then the repo, then job posts. Inside the repo, read the dependency file, the RAG config, the prompts, and the history before you believe a README. None of these send a prompt, so none of them alert the model host. The result can be wrong. A repo from last year is not the running config. That gap is why active recon exists, and why it comes second.`,

  "ai-recon-headers": `curl -sI sends a HEAD request. -s is silent, -I is headers only, so you do not download the page and you do not send a prompt. Server is the proxy. Custom headers are the find. X-AI-Backend names the model provider, for example OpenAI-GPT5.2. X-RAG-Provider names the vector database, for example ChromaDB. A vector database stores document chunks as embeddings so the app can search them. That header is why you later look for RAG.

A health path is a GET, still with no prompt. /api/health, /api/status, and /-/health are the usual ones. mcp_enabled true means tool schemas are exposed, so the tool card is worth opening. model is the identifier, which can be more precise than the header, such as gpt-5.2-turbo. rag_enabled false means retrieval is switched off even if the header named Chroma. status and version are the build. service is the app name.

If those three paths 404, one list under /usr/share/seclists/Discovery/Web-Content/api/ is enough. Stop at the first path that returns JSON. A second list is fuzzing. This is lab chat01.`,

  "ai-recon-model": `This POST is the first active request on the OpenAI-shaped path. /v1/chat/completions is the chat method. -X POST sets the method. The header says the body is JSON. The body is one normal user message, Hello. You are not changing it, so you are not fuzzing. You are checking that the documented method is alive.

model in the response is the fingerprint. Believe it over the sentence. object chat.completion means you hit that API. finish_reason stop means the reply ended normally. rag_sources null means no document was attached to this answer. That matches rag_enabled false. usage is the token count, prompt plus completion. A maintenance sentence is still a hit when model is filled in, because the pipeline answered. A 404 or a body with no model means this path is wrong. Return to the health JSON. If the field is missing, one identity question is the next card, not a second Hello.`,

  "ai-recon-docs": `The docs are a public page. Searching it for those words finds the paths the stack cards use. If the docs and the live headers disagree, write both down. The live one is checked with one chat completion, not a list of bodies.`,

  "ai-recon-git": `Clone only a repository the engagement gave you. git log --oneline -20 is the recent history, so you can see if the tree is busy. The files that matter are requirements, the RAG yaml, the prompt, the tool schema, and the model config. Those are the next cards. A private repo you were not given is out of scope. Lab git01 is this card.`,

  "ai-recon-deps": `grep -E prints the matching line and its number. The pattern is the two shapes. generativeai, openai, anthropic, and pinecone are clients of someone else's service. crewai is one agent framework. vllm, pymilvus, sentence-transformers, and huggingface are libraries that run on a machine in the lab. 2>/dev/null hides the missing-file error when only one of the two filenames exists. You do not pip install. The package name is the note.`,

  "ai-recon-rag-config": `The same grep, aimed at the RAG file. chunk_size and chunk_overlap are how the documents were cut. An AST strategy means the corpus is code, not prose. The embedding model and its dimensions have to match the store or search returns nothing. top_k is how many chunks come back. score_threshold is the cutoff the live threshold card will poke, later. provider and collection name the database. A \${VAR} is a name, not a secret.`,

  "ai-recon-prompts": `ls shows whether prompts and config exist. The grep looks for a tool definition, a NEVER line, a blocked topic, and a regex the app refuses. CrewAI uses a decorator. Other frameworks use a JSON schema with a name. Read-only in a description is the intended boundary, which the agent card checks once, on the running app. Do not paste the prompt back into the chat to see what happens.`,

  "ai-recon-supply": `The example env file lists variable names. A real key in a committed env file is a finding you record and do not reuse. models.yaml type is the server, model_id is the weights, max_model_len is the context the deploy asked for, and a quantisation block means the weights were compressed to fit a GPU. That length is what the context card is trying to measure, if you still need to.`,

  "ai-recon-history": `git log -S searches the changes, not just the current file. API_KEY catches a secret that was added and removed. openai catches a provider migration even when the current file says something else. The path-limited log is the guardrail and the prompt. Read the diff. Do not check the old commit out and run it.`,

  "ai-recon-jobs": `A job post is a hint. People advertise the stack they want, which may not be the stack this host runs. A new product name is worth a look in the repo and the headers. A repeat of what you have is a stop.`,

  "ai-recon-active": `These lines are the order, not a script. Discovery is the page, then one POST. The 401 list is four paths. Fingerprinting starts with Hello. RAG starts with a sum and a policy question. The agent is one tool. Each line is logged. The passive note is what you compare the answer to.`,

  "ai-recon-js": `The first curl downloads the page and grep -i script shows the script tags, ignoring case. The second curl is that file. apiBase and assistantEndpoint are the path. enableAI false means the widget is present and the model is off. The POST uses the path you just read, with one Hello. provider and model in the metadata are the fingerprint. A comment that says the file is internal does not make the GET a bypass. The server gave it to you.`,

  "ai-recon-gateway": `curl -sI is headers only. Server kong and X-Kong-Upstream-Latency mean the proxy is Kong. RateLimit headers are the budget, so you stop when the remaining count gets low. The loop asks four paths and prints only the status code. -o /dev/null drops the body. -w prints the code. 401 means the route is real and wants a credential. 404 means it is not a route. Do not add paths because four felt small.`,

  "ai-recon-identity": `The first body is one question. Read the message content and the model field. The second curl is only for a product-name answer. Thanking the wrong vendor asks the model to correct you. A correction that names a different lab is the tell. A tiny model often agrees, and that agreement is worthless. Two false vendors is you guessing. Stop.`,

  "ai-recon-cutoff": `The first question is the claim. The second is one event whose date you know. If it describes the event as still in the future, the weights stop before that date. If it answers correctly, the claim was a script or the cutoff is later. Do not walk year by year. The cutoff is the same wherever those weights run.`,

  "ai-recon-behavior": `One paragraph, the same words, on the two hosts you cannot yet split. A longer answer with a docstring habit is a hint of a code model. It is also what a system prompt can demand. Write the difference down. Do not rename the host from the prose.`,

  "ai-recon-context": `The messages array is one conversation. The marker is a word you choose. The filler is boring text, not a jailbreak. The last user turn asks for the marker. If the reply has lost it, the window or the server's num_ctx was smaller than the array. If both hosts keep it, you did not reach either limit. Do not keep adding filler after the first loss.`,

  "ai-recon-rag": `The question asks for a quote and the sentence after it. Use it only after a source has already appeared. A stop in the middle of the rule is the chunk size showing itself. A score or a collection in the JSON is the store. No source means this is not the chunk-boundary finding. Do not send a second wording until you have read the first body.`,

  "ai-recon-sources": `The first query is arithmetic. retrieval_time near zero and sources [] means the store was not used. The second query is something only an internal document would know. A title in sources means a chunk was selected and shown to the model. The answer can be wrong and the title can still be the find. Asking the bot to list its documents is the detection rule. This card does not do that.`,

  "ai-recon-meta": `jq '.sources' prints the array and drops the essay. title is the file. chunk_id is where in the file the cut landed. text is the raw chunk. vector_score is semantic similarity. bm25_score is keyword overlap. combined_score is the rank the app used. A host that returns only titles is a smaller leak. A snippet that contains a hostname is a note for the scope, not a new target you scan.`,

  "ai-recon-threshold": `Three queries, one topic, worse wording each time. The exact phrase should retrieve. The synonym tests whether the embedding still matches when the keywords change. The misspelling breaks both the keywords and the vector, so sources going empty is the cutoff. If the third query still cites, the cutoff is low or absent. A fourth spelling is fuzzing.`,

  "ai-recon-detect": `You only open this when the scope includes the log server and you were given an account. The rule is a keyword query on the question field. what documents, list documents, system prompt, and your instructions are the usual strings. Your leave-policy question does not contain them, and it still returned a title, which is the point. The log has the question anyway. Quiet means you missed the keyword rule, not that nobody can read it.`,

  "ai-recon-canary": `There is no command because the test is the snippet you already stored. A finished access key, a password with a dictionary word in it, or a login that arrives too easily is a planted document. Using it tells the defender the retrieval worked. Write canary on that title and do not authenticate with it.`,

  "ai-recon-agent": `The message names a tool you already saw in the schema, and one argument. If the tool runs, the boundary is wider than the docs said. If the error names a path, a role, or a scope, the boundary is that sentence. If the model only talks, no tool was called. This is agent01. One attempt. If the tool prints a credential, stop and use the canary card before you type it anywhere.`,


  "ai-order": `The four lines are notes, not commands. PEN-300 fails when the payload changes before the block is named. The first line is the parent that actually ran your code. The second line is the error, copied, not paraphrased. The third line is one control. The fourth line is one change. A new error after that change is a new control, and you start the list again.`,

  "ai-lab": `The two comments are the check. The course VPN range is the scope. An address outside it is not a harder lab. This desk does not decide that for you. You do, before the file is sent.`,

  "ai-defender": `Get-MpComputerStatus reads Defender's own state. RealTimeProtectionEnabled True means files are scanned as they land. IoavProtectionEnabled is the scan of downloads. Get-MpThreatDetection is the history. A file that vanishes and a row in that list is Defender, even if you expected AppLocker. RealTimeProtectionEnabled False means you are not evading anything. Use the file and move on.`,

  "ai-amsi": `The sentence about malicious content is AMSI inside the script host. The script was read and refused before it ran. That is different from Defender deleting an exe, and different from Constrained Language, which lets the script start and then blocks a call. AMServiceEnabled True supports the reading. A normal exception, a missing cmdlet, or access denied is your code. Do not bypass a bug.`,

  "ai-applocker": `Get-AppLockerPolicy -Effective is the policy that applies to you, including local and domain rules. -Xml writes it so you can read the rules later. Test-AppLockerPolicy asks that policy about one file. Denied on your exe and Allowed on a Microsoft binary is the setup for a trusted-binary card. The AppLocker event log is the confirmation. An empty policy and a program that starts means this control is absent.`,

  "ai-clm": `LanguageMode is a property of the session you are in. ConstrainedLanguage is the lockdown. FullLanguage is a normal session. A failure that names the language mode, or refuses Add-Type and .NET method calls, belongs on this card. A failure that says malicious content belongs on the AMSI card. They are often both present, and the error text says which one you just hit.`,

  "ai-proxy": `netsh winhttp show proxy is the proxy WinHTTP clients use. The registry values are the Internet Settings proxy, which is what a browser and many user programs use. ProxyEnable 1 and a ProxyServer means traffic is expected to go there. Test-NetConnection from the lab host to your Kali port is the raw path. The browser working and that test failing is the control. Rebuilding the shell does not open the port.`,

  "ai-office": `The process list is how you prove the document ran. ParentProcessId points at Word, Excel, or Outlook when the macro or the embedded object started your child. No child, and a Trust Center that has macros disabled, means the payload was never submitted to AMSI or AppLocker. Fix the lab setting the course named. Then look at the child.`,

  "ai-script": `Get-Command confirms the host exists and shows its path. Test-AppLockerPolicy on that path tells you if the host is allowed to start. The file you wrote is an argument. If the host is denied, obfuscating the argument does nothing. If the host starts and the script is then blocked, the new error is the next control.`,

  "ai-csharp": `csc.exe is the compiler that ships with the .NET Framework. The path is the 64-bit one. /out is the exe. /r adds a reference when the error is CS0246 and the type lives in an assembly you did not name. A clean compile only means the file was built. The first run is what meets the control. Compile on the lab machine so you are not also guessing about a Kali cross-compile.`,

  "ai-inject": `The three steps are the whole idea. Allocate asks the allowed process for memory. Write copies your code into that memory. Start makes the process run it. The callback then comes from that process, which is why Task Manager does not show your exe. An exception on allocate is not a shellcode problem. A new exe of yours means you did not inject. You started a program, and you are back on the AppLocker card.`,

  "ai-whitelist": `where.exe finds InstallUtil and MSBuild. Test-AppLockerPolicy on InstallUtil tells you the policy's answer. Allowed, while your exe is denied, is pursue. The callback or the process list must show that binary as the parent. A renamed exe is still your exe. The policy hashes or paths the file. It does not care what you called it.`,

  "ai-creds": `whoami /all shows the user and the privileges of this shell. cmdkey /list shows saved passwords Windows will try for you. klist shows Kerberos tickets in this session. A second name, a saved target, or a ticket you did not request is the hop. Empty output is a stop on this card. Shares and configs are the next place, not a deeper hash hunt with nothing to crack.`,

  "ai-lateral": `Test-NetConnection checks one port from the host that already has the session. 445 is SMB. 5985 is WinRM. The builders on the other desk run the tool once the port and the credential are real. Access denied on an unproven password is not a control to evade. A closed port is not a payload problem. The second host has its own policy. Start at the control cards again.`,

  "ai-sql": `1433 is the SQL port. Test-NetConnection from the machine that should see it is the check. The login you use is one you already have. The other desk builds mssqlclient. A failed login or a closed port ends the card. Commands on the SQL server come only after the server has accepted a privileged login, and the host you land on is a new control problem.`,

  "ai-chain": `The comment is the report row. Host is the machine. What ran is the parent or the binary the policy allowed. Control is the named block. Change is the one thing you did. Proof is the callback, the screenshot, or the new shell. A row without a proof does not go in the report. OSEP reads this path. A list of tool names does not explain it.`,

  "ai-stop": `The three comments are the brakes. A changed error is a new card. A parent that never started means the payload was never tested. An injection you cannot split into allocate, write, and start is not ready to rebuild. The fourth encoding of the same file, against the same sentence, is the dead case.`,
};
