# Kerberos Security Desk

A local methodology desk for OSCP study. It runs on your machine. Nothing here phones home.

The security desk is the field notes for a box. Each card says what to look for, a result that means stay on it, and a result that means stop. Builders fill the commands you actually type: directories, buffer overflow, NetExec, Hydra, Impacket, Active Directory, tunnels, and file transfer.

Exam lock is the exam. Meterpreter stays on one machine, and a failed attempt still counts. sqlmap, mass scanners, spoofing, and auto-exploitation stay off. The scoring note is 70 raw points before 1 December 2026 08:00 GMT, and the scaled score after that. The AI desk is hidden while the lock is on.

The AI desk is the lab method for an AI target. Passive recon comes before a chat message. It is not part of the exam.

```bash
git clone https://github.com/GarthElgarr/oscp-desk.git
cd oscp-desk
npm install
sudo npm run dev
```

Open http://127.0.0.1:81

Run it as root. UDP and SYN scans, and the install button, need it. On Kali, that button adds the tools the Run buttons call. Those commands run on that machine only.

Marks, notes, the report, and your picture stay in the browser. They are not in this repo. Put transfer files in the uploads folder on the machine, not in git. Do not commit exam flags, target addresses, or notes from a real engagement.
