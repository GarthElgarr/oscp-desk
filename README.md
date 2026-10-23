# OSCP desk

A local methodology desk for OSCP study. It runs on your machine. Nothing here phones home.

```bash
git clone https://github.com/GarthElgarr/oscp-desk.git
cd oscp-desk
npm install
sudo npm run dev
```

Open http://127.0.0.1:8080

Run it as root. UDP and SYN scans, and the install button, need it. Started as root, those commands run directly. `sudo -n` is only the fallback when the process is not root, and a password prompt then stops the scan instead of waiting.

On Kali, the install button on the opening page adds the tools the Run buttons call (hydra, wfuzz, and the rest). Those buttons run on that machine only.

Marks, notes, the report, and your picture stay in the browser. They are not in this repo. Put transfer files in the uploads folder on the machine, not in git. Do not commit exam flags, target addresses, or notes from a real engagement.
