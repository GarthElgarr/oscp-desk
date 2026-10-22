import type { Technique } from "./methodology";

export const BRIEFS: Technique[] = [
  {
    id: "brief-exam",
    section: "Exam",
    title: "How a section works",
    look: "Each card is one question. Alive means you stay on that fact and use it. Dead means you tick it and move to Next. You do not rerun a dead card because the output felt close.",
    cmd: `# One host folder before any scan
mkdir -p ~/exam/<ip>/{scans,loot,shells}
# The loop, and the only loop
# TCP quick, all TCP, UDP top 20, then the service card for each open port
# shell, that OS page from the top, loot, one spray
# pivot only if a second network exists
# Time sinks that are not progress: skipping UDP, PEAS before sudo -l, rockyou at a DC, a kernel exploit before the misconfig list`,
    alive: "You can say the next single command out loud. The host folder has the scan in it.",
    dead: "You are reading cards that do not match an open port or the OS you are on.",
    next: "Order of work, then the port or the OS. The finished card at the end of Linux or Windows is a real stop.",
  },
  {
    id: "brief-recon",
    section: "Recon",
    title: "What recon is allowed to finish",
    look: "Recon ends when every open TCP port has a name and you have also run the UDP top 20. It does not end when you have run every scanner you own, and it does not end after TCP alone.",
    cmd: `# Pass 1: top TCP ports, scripts, versions, saved. Read this while pass 2 runs.
nmap -Pn -sC -sV -oA scans/quick <ip>
# Pass 2: all TCP, no scripts, just the list
nmap -Pn -p- --min-rate 2000 -oA scans/full <ip>
# Pass 3: UDP. Required on every host. Top 20, not 65535.
sudo nmap -Pn -sU --top-ports 20 -T4 -oA scans/udp <ip>
# Pass 4: scripts only on TCP ports pass 2 added
nmap -Pn -sC -sV -p <new-ports> -oA scans/svc <ip>`,
    alive: "A short list of open TCP ports, each with a version or a service name, plus a finished UDP top 20 under scans/.",
    dead: "A full UDP 65535 scan, or no UDP scan at all. Directory brute force before you have read the HTTP banner is the same kind of waste.",
    next: "One Services card per open port. Unknown port: banner, then searchsploit, then leave it.",
  },
  {
    id: "brief-svc",
    section: "Services",
    title: "One port, one question",
    look: "The port number picks the card. You want one of three things: anonymous access, a credential you already have, or a version that matches a single public bug. You do not want a wordlist.",
    cmd: `# Banner first, always
nc -nv <ip> <port>
# Then the card for that port, and only that card
# FTP: anonymous. SSH: keys and the password you found, not hydra. SMB: null then guest. HTTP: the Web section.
# SNMP: public. NFS: showmount. Redis: no auth. A database: the one default user, empty password, then the password you already found.`,
    alive: "You got a file, a login, or a version string you can search.",
    dead: "Authentication failed on the creds you actually possess. Hydra against rockyou is not the recovery. The next port is.",
    next: "If the service gave you a shell, stop scanning and open Shells, then the OS page. If it gave you a password, try it on the other open ports before you continue.",
  },
  {
    id: "brief-web",
    section: "Web",
    title: "Web is one parameter",
    look: "Name the product first. Then one input that looks like a file path, a query, a template, or a command. Confirm the bug in the browser. Only then repeat it with curl.",
    cmd: `# What is it
curl -sI http://<ip>/
# What is exposed
gobuster dir -u http://<ip>/ -w /usr/share/wordlists/dirb/common.txt -t 40 -q
# Then, in this order, and stop at the first alive bug
# LFI / traversal, SQLi (the six cards), command injection, SSTI, upload, known CMS
# sqlmap is not the exam method. The SQLi cards are.`,
    alive: "The response changed in a way you can explain: a file, a database error, a sleep, or a command's output.",
    dead: "A scanner list of missing headers, or a parameter that reflects your input and does nothing else. XSS that does not steal a useful cookie is a note, not a shell.",
    next: "A shell goes to Shells. A credential goes to the other services and then Passwords. Do not start a second bug class while the first one is alive.",
  },
  {
    id: "brief-sh",
    section: "Shells",
    title: "One callback, then upgrade",
    look: "Penelope is listening before you execute anything. The payload matches something the box actually has. You upgrade the TTY before sudo, editors, or passwords.",
    cmd: `# Kali, first
penelope -O -p 443
# Then the smallest payload the target can run
# bash /dev/tcp, python3, php, or a file from the msfvenom builder
# After the session lands
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl-Z, then on Kali
stty raw -echo; fg
export TERM=xterm`,
    alive: "whoami is a real user on that host and the arrow keys work.",
    dead: "A second payload style when the first session is already open. Or a 441-byte file. Or a shell that dies because you never started the listener.",
    next: "Linux or Windows, the first card, immediately. Do not enum from the one-liner.",
  },
  {
    id: "brief-lin",
    section: "Linux",
    title: "Linux is a list, then a version",
    look: "Every card is the same shape. The first lines identify the avenue. The numbered commands are the escalation. The alive text is the output you should see if it worked. Order is sudo -l, SUID, capabilities, cron, PATH, credentials, groups. Baron and the kernel come after that list is dead.",
    cmd: `# The whole list, in order, before any exploit
sudo -l
find / -perm -4000 -type f 2>/dev/null
getcap -r / 2>/dev/null
crontab -l; ls -la /etc/cron* /var/spool/cron 2>/dev/null
id
# A password prompt on sudo -l means sudoers is useless until you know the password.
# It does not mean sudo itself is patched. Baron does not need a sudoers entry.`,
    alive: "One misconfiguration you can turn into root without compiling anything.",
    dead: "The list is clean. Then, and only then, sudo --version for Baron, pkexec --version for PwnKit, uname for a kernel bug.",
    next: "Follow the cards. The finished card means stop, even if linpeas is still red.",
  },
  {
    id: "brief-win",
    section: "Windows",
    title: "Windows is privileges, then files",
    look: "Every card is the same shape. The first lines identify the avenue. The numbered commands are the escalation. The alive text is the output you should see if it worked. whoami /priv decides Potatoes. Services, unquoted paths, ImagePath, tasks, and AlwaysInstallElevated are the misconfigs. Creds on disk come before any kernel suggestion.",
    cmd: `whoami /all
whoami /priv
systeminfo
# Then, in order
# service permissions, unquoted paths, writable service binary, registry ImagePath, startup and RunOnce
# AlwaysInstallElevated needs BOTH HKLM and HKCU
# SeImpersonate: PrintSpoofer if the spooler is running, otherwise GodPotato. Two failures, then stop.`,
    alive: "A service you can change, a writable path in front of a space, a password in a file, or SeImpersonate plus a Potato that actually runs.",
    dead: "An x86 exe on an x64 host, a 441-byte HTML download, or a kernel exploit on Server 2022 with a long hotfix list.",
    next: "The landing card. The Windows finished card is the stop. NT SERVICE or High integrity without Administrators is not an admin shell.",
  },
  {
    id: "brief-ad",
    section: "Active Directory",
    title: "You already have a domain user",
    look: "Every card is the same shape. The first lines identify the avenue. The numbered commands are the escalation. The alive text is the output you should see if it worked. Prove the exam password on one domain controller, then enumerate, roast, BloodHound, ACLs, LAPS, and shares. One spray of a password you found.",
    cmd: `# Prove it on the DC first
nxc smb <dc> -u <user> -p '<pass>'
# Then the subnet, once
nxc smb <cidr> -u <user> -p '<pass>'
# Roast only after that [+]
nxc ldap <dc> -u <user> -p '<pass>' --kerberoasting kerb.txt
nxc ldap <dc> -u <user> -p '<pass>' --asreproast asrep.txt`,
    alive: "[+] on the DC, and either a (Pwn3d!) host or a hash you can crack or pass.",
    dead: "STATUS_LOGON_FAILURE on the DC. The password is wrong. Do not spray the subnet. Do not start with a golden ticket, DCShadow, or skeleton key.",
    next: "BloodHound if the login is valid. The path it draws is the order. A golden ticket is persistence after you already own the domain.",
  },
  {
    id: "brief-pw",
    section: "Passwords",
    title: "Format the hash, then one list",
    look: "A wrong -m wastes the run. Secretsdump is not an NT hash until you cut it down to 32 hex. NetNTLMv2 and Kerberos must stay whole. The identify builder does that cut.",
    cmd: `# Paste the line into Builders -> identify
# It writes the hashcat file and the John file
# Then one of these, not both, and not a mask marathon
hashcat -m <mode> hashes.txt /usr/share/wordlists/rockyou.txt
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.john
# NT hash of a domain account: pass it before you crack it
nxc smb <dc> -u <user> -H <nt>`,
    alive: "Cracked, or a password you already found that works on a second service.",
    dead: "Exhausted on rockyou. One best64 pass only if the password looks human. Then stop. Hydra never sees rockyou.",
    next: "The password goes to SSH, SMB, WinRM, and sudo, by hand, one try. Then it can be the single spray password.",
  },
  {
    id: "brief-pv",
    section: "Tunneling",
    title: "Pivot only for a network you cannot see",
    look: "A second interface, a route, or a port on 127.0.0.1. One tool. SSH if you already have SSH. Ligolo when you will scan a subnet. Chisel for SOCKS or one port. A callback from a host that cannot see Kali has to land on the pivot, not on your VPN address.",
    cmd: `ip a; ip route
ss -tlnp
# Windows
ipconfig /all
route print
netstat -ano | findstr LISTENING
# prove the direction before you upload anything
curl -m 3 -sI http://<KALI>/
# hangs: the target cannot reach you. Do not start an agent that dials Kali.
# answers: Ligolo or Chisel reverse is allowed
# SSH -L and -D need no binary
# nmap through SOCKS is -sT. -sS lies.
# nmap through Ligolo is a normal nmap`,
    alive: "You can reach an IP or a port that nmap from Kali could not.",
    dead: "The tunnel is up and the new host has the same ports you already enumerated. Tear it down and go back to the host you were on.",
    next: "The new subnet starts again at Recon. Full methodology. Do not skip straight to an exploit.",
  },
  {
    id: "brief-cc",
    section: "Compile",
    title: "Compile on the box that will run it",
    look: "A release binary beats a build. If you must compile, do it on the target. A Kali-built dynamic ELF dies on an older box with GLIBC_2.34. That is not the exploit failing.",
    cmd: `# On the target, if gcc exists
gcc exploit.c -o exploit
file exploit
# On Kali, only if the target has no compiler
gcc -static exploit.c -o exploit
file exploit
# Windows
x86_64-w64-mingw32-gcc exploit.c -o exploit.exe
file exploit.exe`,
    alive: "file says statically linked ELF, or PE32+ for a 64-bit Windows host, and the size is tens of kilobytes.",
    dead: "GLIBC_2.34, a # Exploit Title line, a missing quote, or a 441-byte HTML file you saved from the browser.",
    next: "Fix that one error, rebuild once, run once. If the program runs and says the target is not vulnerable, believe it.",
  },
  {
    id: "brief-rep",
    section: "Report",
    title: "Write the sentence while the shell is open",
    look: "The report is the commands you actually ran, the output that proved them, and the proof flag. Not the checks that were dead.",
    cmd: `# The moment you change user
id; hostname; ip a | head
# Windows
whoami /all
type C:\\Users\\<user>\\Desktop\\proof.txt
# Save the scan and the one exploit command in the host folder
# Screenshot: who you were, the command, who you are, the flag`,
    alive: "A stranger could repeat your path from the notes without your memory.",
    dead: "You pivoted away and can no longer remember which password or which file. Go back and capture it before the next host.",
    next: "Paste that command and the flag into the report form in the Report section before the next host.",
  },
];
