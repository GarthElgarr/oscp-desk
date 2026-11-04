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

  "ai-recon-passive": `The list is the order. Headers and docs, then the repo, then job posts. None of these send a prompt, so none of them alert the model host. The result can be wrong. A repo from last year is not the running config. That gap is why active recon exists, and why it comes second.`,

  "ai-recon-headers": `curl -sI is headers only. The second curl is the page, and head stops it at 80 lines. This is lab chat01. You are looking for a product name or a path. A login and a prompt are a later card.`,

  "ai-recon-docs": `The docs are a public page. Searching it for those words finds the paths the stack cards use. If the docs and the live headers disagree, write both down. The live one is checked in active recon.`,

  "ai-recon-git": `git log -20 is the recent history. git log -S 'api_key' finds commits that added or removed that string, which is where a key is often left behind. Search the names only in a repository you are allowed to read. A private repo you were not given is out of scope. Lab git01 is this card.`,

  "ai-recon-jobs": `A job post is a hint. People advertise the stack they want, which may not be the stack this host runs. A new product name is worth a look in the repo and the headers. A repeat of what you have is a stop.`,

  "ai-recon-active": `These lines are the lab map, not three commands to fire together. chat02 is the model. kb01 is the documents. agent01 is the tools. Each one is a request to the running app, so each one is logged and each one counts against a rate limit. The passive note is what you compare the answer to.`,

  "ai-recon-model": `/v1/models is the list, and it beats the prose. The second request is one question about the cutoff. A year that matches Llama, Mistral, Phi, Qwen, GPT-4, Claude, or Gemini is the fingerprint. An invented year is not. This is chat02.`,

  "ai-recon-rag": `The question asks for a quote and the sentence after it. A stop in the middle of the rule is the chunk size showing itself. A score or a collection in the JSON is the store. No source means this is not kb01's finding. Do not send a second wording until you have read the first body.`,

  "ai-recon-agent": `The message names a tool you already saw in the schema, and one argument. If the tool runs, the boundary is wider than the docs said. If the error names a path, a role, or a scope, the boundary is that sentence. If the model only talks, no tool was called. This is agent01. One attempt.`,


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
