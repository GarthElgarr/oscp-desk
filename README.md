# OSCP desk

## CHANGES

- Exam lock stays on after a Meterpreter attempt. Turning it off, clearing the Metasploit list, or blanking the host is refused, and a second machine is still refused.
- A restore cannot drop Meterpreter history while the exam is locked. A superset of the same entries is allowed.
- Clearing scans no longer deletes the exam ledger. It lives in `data/exam-ledger.json`.
- john and hashcat only write under `scans/crack`. Absolute paths and flags that are not on the allow-list are refused.
- nmap refuses glued output and input-list flags, script files, and a second address. Exact `-oA` is still saved as `scans/<name>`.
- Hydra `-o`, `-M`, `-C`, `-L`, and `-P` must be a `scans/hydra` loot file, a plain filename, or a Kali wordlist. nmap, hydra, wfuzz, Impacket, AD, SNMP, UDP, and Penelope refuse a target outside the exam scope, and a banned command, before anything starts.
- The Vite dev server returns 404 for scans, uploads, data, git, env, json, and loot files. `/files/` still serves uploads.
- `npm run lint` is clean and `npm test` runs every test under `src/lib`.
- Builder tests cover thread caps, wordlist roots, a `/16`, a leading zero, and a quote in a password. An unknown SQL step returns an error instead of throwing.
- A shell port must be 1–65535. A missing page says it is not on this desk and links home. An upload over 210 MB is refused before it is read, more than 10 files are refused, and an existing file is kept unless `overwrite=1`. `OPTIONS /api/*` returns 403.
- After a Meterpreter attempt, scope cannot be narrowed. A list of hosts can still gain a machine. A subnet scope cannot take an extra host. The scope Remove button uses the same exam-attempt check as the server: a row recorded while the lock was on. Lab rows do not count.
- Turning exam lock on is refused while lab Metasploit rows are still on the ledger. Clear them first. A lab row is not copied into the Meterpreter machine.
- Every AD hour step has a Copy button.
- An exam ledger error sits at the top of the lock box and clears on the next success.
- nxc says whether the problem is a subnet wider than /24, a leading zero, or the user name.
- The report scoring note says 70 raw points before 1 Dec 2026 08:00 GMT, and the scaled score after that.
- Filled local.txt and proof.txt are not exported as "not compromised" unless REACHED was set to that on purpose.
- A transfer file picks Linux or Windows from its extension. The user can still change it. The uploads listing says which port the file host is on and whether it is listening. A different port tells you to run python3 -m http.server. A port below 1024 warns only when that host is not listening. OSCP_FILE_PORT changes the listener, and the default is 80.
- The builder tabs say dirs and bof. The tool ids are unchanged.
- The AI desk recon now covers repository files, page-source discovery, a short 401-against-404 list, model identity and cutoff, RAG source metadata, keyword log rules, and canary documents.

A local methodology desk for OSCP study. It runs on your machine. Nothing here phones home.

```bash
git clone https://github.com/GarthElgarr/oscp-desk.git
cd oscp-desk
npm install
sudo npm run dev
```

Open http://127.0.0.1:81

Run it as root. UDP and SYN scans, and the install button, need it. Started as root, those commands run directly. `sudo -n` is only the fallback when the process is not root, and a password prompt then stops the scan instead of waiting.

On Kali, the install button on the opening page adds the tools the Run buttons call (hydra, wfuzz, and the rest). Those buttons run on that machine only.

Marks, notes, the report, and your picture stay in the browser. They are not in this repo. Put transfer files in the uploads folder on the machine, not in git. Do not commit exam flags, target addresses, or notes from a real engagement.
