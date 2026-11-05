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
