export const WHY: Record<string, string> = {
  "exam-order": `mkdir -p creates the host folder and does not complain if it already exists. {scans,loot,shells} makes three folders in one command. <ip> is a placeholder. Type the real address. Do not type the brackets.
The four nmap lines are the required map of the host. -Pn skips ping, because lab hosts often ignore it. -sC runs the default scripts and -sV asks for the version. -oA saves the scan in that folder. -p- is every TCP port. --min-rate 2000 keeps that pass from taking an hour. -sU is UDP, and sudo is there because UDP needs root. --top-ports 20 is the UDP pass you always run. It is not optional, and it is not all 65535 ports. The last nmap repeats scripts only on TCP ports the full scan added.`,

  "exam-stuck": `Every line starts with #, so nothing here executes. It is a checklist you read when you feel busy but have no new fact.
The point of writing it as comments is that you can paste the block into notes without the shell trying to run a sentence.`,

  "exam-proof": `id prints your user id, group id, and groups. hostname prints the machine name. hostname -I prints the IP addresses on one line. ip a is the long listing, and it pushes the flag off the screenshot, so the proof command does not use it. cat prints a file. whoami prints the Windows user. ipconfig prints the Windows addresses. type prints a Windows file, the same job as cat.
The semicolon on Linux, and & on Windows, run the next command even if one of them fails. The whole line is one screenshot. <user> is the low-priv username. Do not type the brackets. If proof.txt is not on the Administrator desktop, the flag card searches for it. Do not crop the prompt out.`,

  "recon-nmap": `nmap probes hosts and ports. -Pn skips the ping and treats the host as up, which matters when ICMP is blocked. -sC runs the default NSE scripts. -sV asks the open port what version it is. -oA writes three files (normal, grepable, XML) using the path you give, so the scan is saved in the host folder.
-p- means every TCP port from 1 to 65535, not just the common thousand. --min-rate 2000 tells nmap to send at least that many packets per second so a full port scan finishes. -sU is the UDP pass, and it is required on every host because a TCP scan cannot see SNMP, TFTP, NTP, or IKE. --top-ports 20 is those likely UDP ports, not all 65535. sudo is required for -sU. -p with a list is the follow-up: scripts and versions only on TCP ports you already know are open.
<ip> and <open> are placeholders. Replace them. Do not scan UDP 65535.`,

  "recon-search": `searchsploit looks up the local Exploit-DB copy by product name and version. The words after it are the search, not flags.
-x shows the exploit text for that EDB id instead of just the title. | head keeps the first few lines so you see whether the file is a real program or a write-up before you read hundreds of lines. head with no -n defaults to 10 lines.`,

  "svc-map": `This block is only comments. # tells the shell to ignore the line. It is the port-to-first-check map, not a command you run.
Use it to pick the next card. A port number by itself is not a finding.`,

  "svc-ftp": `ftp opens an interactive session. The Name and Password lines are typed at that prompt. anonymous with an empty password, or the password anonymous, is the first login. ls -la asks the server for a long listing. get downloads one file into the directory you started ftp from. bye closes it.
wget -m mirrors the tree. The URL carries the user, the password, and the host. nxc ftp is the same login as a one-shot check.
A file you can read is a password or a key for somewhere else. put is only useful when that directory is a web root or a job the host already runs. A banner has to say vsftpd 2.3.4 before that old backdoor is even a candidate.`,

  "svc-ssh": `nc -nv connects and prints the banner. -n skips DNS. -v is verbose. That tells you it is SSH. It does not tell you the password.
ssh user@host is a normal login. chmod 600 makes the key rw-------. SSH refuses a private key other users can read. -i selects that key.
ssh-keygen -y -f prints the public half, and asks for a passphrase if one is set. You still cannot read the passphrase out of the file. ssh2john turns the key into a hash. john --wordlist tries rockyou against it.
A shell goes to the Linux page. If you will need a tunnel, the SSH forward cards come before Chisel.`,

  "svc-smb": `nxc smb with an empty user and password is the null session. guest with an empty password is the second try. smbclient -N -L lists shares without a password. -N means do not prompt.
Inside smbclient, ls, get, and put are typed at its prompt. smbmap prints READ or WRITE. -H is the host, -u and -p the creds, -d the domain.
The -c string runs a download for you. prompt OFF stops the questions, recurse ON walks folders, mget * takes every name.
WRITE into a web root is one webshell, requested once. (Pwn3d!) from nxc means this user is an administrator, so -x whoami runs a command. -H passes an NT hash. The MS17-010 script is only worth a PoC when it prints VULNERABLE. Relay, poison, and coerce are not on this card.`,

  "svc-http": `curl -sI fetches headers only. -s is silent, -I is HEAD. whatweb names the product. gobuster dir searches for paths. -u is the site, -w is the wordlist, -q hides the misses.
echo and sudo tee -a append one hosts line so a name the site requires resolves to this IP. A second curl to that name shows whether the vhost matters.
Port 443 starts on the HTTPS card, because the certificate can change the name. A missing security header is not the bug.`,

  "svc-smtp": `nc -nv opens port 25 and shows the banner. EHLO, VRFY, and EXPN are typed at that prompt. VRFY asks whether a name is a mailbox. nmap --script smtp-commands,smtp-enum-users does the same without you typing. MAIL FROM and RCPT TO are the relay test. A 250 for a recipient you did not authenticate for means it relays. That is a note, not a shell. The names go to SMB, WinRM, and the web login.`,

  "svc-dns": `dig axfr requests the whole zone. @<ip> picks the server. NS and TXT are single record types. host -l and dnsrecon -t axfr are the same transfer in other clients. sudo tee -a appends the hostname the site requires into /etc/hosts. A new name in range gets the HTTP card. DNSAdmins is not this card.`,

  "svc-snmp": `onesixtyone guesses SNMP community strings. -c is the file of strings to try, one per line. A reply means that string is accepted.
snmpwalk walks the whole tree the device will show you. -v2c is SNMP version 2c. -c public is the community string, which acts like the password. You only walk public after onesixtyone says public works, or as the one quick try.`,

  "svc-ldap": `ldapsearch -x is a simple bind. -H is the URL. -s base reads only the root so you learn the DC= suffix. -b is that suffix. The filter stays in single quotes so the shell does not eat the parentheses. description and info are the attributes where a lab password hides. -D and -w are the bind user and password once you have them. ldaps:// is port 636. ldapdomaindump writes the directory into loot/ldap after the bind works. You try one password by hand. You do not spray the list.`,

  "svc-nfs": `showmount -e lists exports. sudo mount -t nfs attaches host:/share. -o nolock skips a lock daemon the lab often does not run. ls -la shows the owner uid. useradd -u 1000 plus sudo -u nfsuser copies a file that uid may read, which still works under root_squash. no_root_squash is the other case: a bash you copy as root and chmod 4755 stays setuid on the server. Run it with -p so bash keeps the bit. cat /etc/exports later is the line that names the option.`,

  "svc-sql": `nc -nv prints whatever the database says when you connect. nmap -sV asks that one port for a version, which is how you tell MySQL from MSSQL without guessing. -P on the mysql line is the port, capital P. A lowercase -p on mysql means the password, and a space after it makes the next word a database name, not the password.
1434/udp is the SQL Server browser. ms-sql-info can print the instance name. It does not log you in. which sqlplus prints the path of the Oracle client or prints nothing.`,

  "svc-mysql": `mysql is the Kali client. -h is the server. -P is the port, 3306 unless the scan said otherwise. -u is the user. -p with nothing after it asks for a password, and Enter means empty. -p'pass' with no space passes the password you already found.
SHOW DATABASES, USE, SHOW TABLES, and SELECT are typed at the mysql> prompt. The semicolon ends the statement. LIMIT 20 stops a huge table from filling the screen. file_priv Y means this account may read files the database user can read. LOAD_FILE does that read. It is not a shell. INTO OUTFILE and a UDF are not the next step when a table already holds a password.`,

  "svc-mssql": `nxc mssql checks a login without opening a shell. An empty -p is the one sa default. impacket-mssqlclient sa:'pass'@host is a SQL login. The domain form uses a slash and -windows-auth, because that is a Windows account, not a SQL account.
SYSTEM_USER prints who you are. IS_SRVROLEMEMBER('sysadmin') returns 1 when you can turn options on. xp_cmdshell runs one Windows command. The sp_configure and RECONFIGURE lines turn that procedure on, and only after the role check said 1. The impersonation SELECT lists logins you may become. EXECUTE AS LOGIN = 'sa' is that one attempt. A service account with SeImpersonate is the Potato card, not another query.`,

  "svc-rdp": `nxc rdp checks the password without a window. xfreerdp /v is the host. /cert:ignore skips the certificate prompt. /dynamic-resolution resizes. +clipboard shares the clipboard. /drive:loot,/tmp/loot maps a Kali folder into the desktop so you can copy the flag out. /pth is an NT hash, and only after nxc smb -H already showed admin. Logon type denied means try the same password on WinRM or SMB.`,

  "svc-winrm": `nxc winrm checks the login. -H is the NT hash instead of -p. evil-winrm is the shell. upload and download are commands inside that shell, not Windows commands. whoami /all is the first thing you type. If WinRM is closed to this user, the same password still gets an SMB listing. Do not pass -p and -H together.`,

  "web-id": `curl -s fetches the page with no progress meter. | head keeps the first 10 lines so you see the title, a generator tag, or a comment without dumping the whole site.
The login lines are comments. # means do not run them. admin/admin is something you type into the form only after the page has told you which product it is.`,

  "web-lfi": `Each curl requests one URL. -s is silent. The single quotes stop bash from eating ? and &. page= is the parameter you are testing. ../ means parent directory. Enough of them walk from the web folder to the filesystem root, then etc/passwd or windows/win.ini.
The php://filter URL is only for a parameter you have already shown can read files. convert.base64-encode makes PHP print the source in base64 instead of executing it. resource= is the file to encode.
A URL in single quotes is sent literally. Change the parameter name to match the application.`,

  "web-sqli": `curl fetches a URL. -s is silent, so you see the page and not a progress bar. The single quotes around the URL stop your shell from eating & or other characters. Double quotes are used when the payload itself contains a single quote.
id=1 is the baseline. id=1' adds a quote. If the application glues your input into a query, the extra quote breaks the SQL and the error names the engine. AND 1=1 is true, so the original row should stay. AND 1=2 is false, so the row should disappear. That difference is the proof.
SELECT chooses columns, FROM names the table, WHERE is the filter. The injection is you ending their filter and adding your own. SLEEP(3) is the MySQL delay, used only when the page body does not change. sqlmap is not the next step on this exam.`,

  "web-sqli-union": `ORDER BY N asks the database to sort by column number N. You do not care about the sort. You raise N until it errors. The last N that works is how many columns the original query returns. UNION SELECT adds your own row, and it must have that same number of columns.
-- - is a MySQL comment: two dashes, a space, then a dash so the space is obvious and the rest of the original query is ignored. group_concat joins many rows into one cell, which matters because UNION here has room for one value in the reflected column. information_schema is the database MySQL uses to describe other databases. schema_name, table_name, and column_name are the columns you read, in that order.
0x3a is a colon in hex, so the username and the hash come back as user:hash. Replace appdb and users with the names the previous query printed. A number you did not get back on the page is not the column you can see.`,

  "web-sqli-bool": `AND 1=1 keeps the row. AND 1=2 removes it. You only continue if those two responses differ. length(database()) is how many characters the current database name has. You raise the number until the true page comes back. substring(text, start, length) cuts out characters. The start index is 1, not 0. substring(database(),1,1) is the first letter. You try a, then b, until the true page returns, then move to position 2.
LIKE '%ack%' is true if those letters appear anywhere. % is any run of characters. A trailing % means "starts with". A leading % means "ends with". _ is one unknown character. The same true/false test works for a password column once you know the table: wrap the question in (SELECT password FROM users LIMIT 1). LIMIT 1 keeps the subquery to a single value.`,

  "web-sqli-time": `curl -o /dev/null discards the body. -w '%{time_total}' prints how many seconds the request took, which is the only signal this technique has. IF(condition, SLEEP(3), 0) is MySQL: when the condition is true the server waits 3 seconds, otherwise it does not. Time a true and a false before you trust it. A page that is always slow is not injectable.
length and substring are the same questions as the boolean card. You just read the clock instead of the HTML. WAITFOR DELAY '0:0:3' is the SQL Server sleep, and the leading semicolon tries to stack it as a second statement. Postgres uses pg_sleep. Oracle uses dbms_pipe.receive_message. One engine per host. Do not fire all four.`,

  "web-sqli-engine": `Every line on this card is a comment. Nothing runs. It is the lookup for the payload you already proved.
-- starts a comment. MySQL wants a space after the dashes, which is why the cards write -- -. # is also a MySQL comment. @@version is a server variable on MySQL and MSSQL. version() is the Postgres function. Oracle reads banner from v$version.
A stacked query is a second statement after a semicolon. MSSQL and Postgres often allow it. MySQL through a typical PHP page does not, so a semicolon there is not a bypass. CONCAT, +, and || join strings, and the wrong one makes a query look dead. Out-of-band DNS is a later trick that needs infrastructure you will not have on the exam.`,

  "web-sqli-login": `These lines are what you type into the username box, not a curl. OR '1'='1' makes the WHERE clause true no matter what the password is, if your quote closed theirs. AND '1'='2' makes it false. You need both. If only the true one is special, you have a login bypass. If both fail, it is not SQL. If both succeed, the form is broken and is not checking the database.
-- - comments out the rest of the query, including the password check. A single quote on its own is not this test.`,

  "web-upload": `This card has no scanner command. You use the application's own upload after a normal login. curl -s then requests the URL the application gave you for the stored file.
If the body is the command output, the server executed the file. If the body is your source code, it only stored it.`,

  "web-cmdi": `These are payloads, not shell commands you run on Kali. You put them in the field that the application passes to a system command, often a ping box.
; starts a second command after the first. | pipes the first command into the next, and on some shells the second command still runs even if ping rejects the input. id and whoami are the proof because their output is obvious and they do not change the target.`,

  "web-ssti": `These strings go into a field that is reflected back on the page. They are not shell commands. {{ }}, \${ }, and #{ } are template markers used by different engines. 7*7 is the test because the number 49 can only appear if the server evaluated the expression.
Send one at a time. The one that returns 49 tells you the engine.`,

  "web-cms": `wpscan is for WordPress. --url is the site. --enumerate u,p asks for users and plugins.
droopescan scan joomla -u runs the Joomla scan against that URL. -u is the target. Read the admin path it prints. Do not run both tools until you know which CMS you have.`,

  "web-xss": `These are strings you submit in a reflected field, not commands. <script> runs if the page inserts your input as HTML. The img line uses a broken image and onerror so the browser runs alert(1) when the image fails.
alert(1) only proves the browser executed your HTML. It is not a shell.`,

  "sh-penelope": `penelope starts the catcher. -p is the listen port. Without -p it uses 4444, so a payload aimed at 443 never arrives. -O is OSCP-safe mode: it does not load the meterpreter module and it does not run an automatic privilege-escalation module. python3 on the script is the same listener when the penelope command is not installed.
bash -c runs the quoted string. bash -i is interactive. >& /dev/tcp/host/port sends the shell to that TCP port. 0>&1 attaches stdin to the same connection. <KALI> is your VPN address.`,

  "sh-penelope-sheet": `The start lines are the same listener. -p 443,80 opens both ports. -i tun0 listens only on the VPN interface instead of every interface. -c host -p port connects out to a bind shell. That is the opposite direction from a reverse shell.
F12 detaches a PTY session and opens the menu. Ctrl+C does that for a raw shell. The banner tells you which key this session uses. Ctrl+D leaves the menu.
sessions lists what you have caught. interact 1 attaches to session 1. upload copies a Kali file onto the target. download copies a target file back. The first path is the source and the second is the destination. upgrade retries the PTY if the automatic one failed. spawn opens another shell from the same host. payloads prints a ready callback for the listener that is already open. listeners adds or stops a port without quitting. portfwd sends one local port through this session to a host the target can reach. kill 1 drops that session. help upload prints the arguments for that one command.
Those words are menu commands. In the target shell they are not programs.`,

  "sh-tty": `python3 -c runs a tiny Python program. import pty loads the pseudo-terminal module. pty.spawn("/bin/bash") starts bash attached to a terminal, which a raw netcat shell does not have.
Ctrl-Z suspends that shell and returns you to your own terminal. stty raw -echo turns off local echo and line buffering so keystrokes pass through. fg resumes the suspended shell in the foreground. export TERM=xterm tells programs such as clear and editors what terminal you are.
You type the stty line in your Kali terminal, not in the half-dead shell.`,

  "sh-msfvenom": `msfvenom builds a payload file. -p is the payload. linux/x64 and windows/x64 must match the target. shell_reverse_tcp connects back to you. LHOST is your Kali VPN IP. LPORT is the port Penelope is already listening on. -f is the file format: elf, exe, or msi. -o is the output filename.
The exec payload does not call back. CMD is the one Windows command it runs. net localgroup administrators <you> /add puts that user in the local Administrators group. You only build the format the target will actually execute.`,

  "sh-xfer-lin": `python3 -m http.server serves the current directory over HTTP. 80 is the port. Run it on Kali from the folder that contains the file.
On the target, curl -o writes the response to that path instead of the screen. wget -O does the same. The URL is your Kali IP, which the target must be able to route to.
After it lands, ls -l (long listing, no -a needed) on both sides should show the same size. A few hundred bytes that starts with <html is an error page, not the tool.`,

  "sh-xfer-win": `certutil downloads a URL. -urlcache -split -f is the form that fetches the file. The URL is the source. The last argument is the destination path.
powershell -c runs one command. IWR is Invoke-WebRequest. -OutFile is where to save it. dir is the Windows listing. Use it to compare the size with the file on Kali before you execute anything.
Quote the PowerShell so cmd does not split it.`,

  "lin-order": `id, whoami, hostname, and uname -a tell you the user, the box, and the kernel in one line. uname -a is all kernel fields: name, hostname, release, version, architecture. The semicolon runs each command even if one fails.
sudo -l lists what you may run as another user. sudo --version prints the sudo version. That version is for Baron later, not a reason to skip -l.
find / starts at the root. -perm -4000 keeps files with the setuid bit (octal 4000). The dash means "these bits are set", other bits may be set too. -type f keeps regular files. 2>/dev/null drops the Permission denied lines.
getcap -r / lists file capabilities from / downward. -r means recursive. cat /etc/crontab prints the system cron table. ls -la on /etc/cron* and the spool shows permissions on cron folders and on per-user crontabs. -l is permissions, owner, size, date. -a includes dotfiles. A w for you, or for other, on a script root runs is the lead. * expands to every name that starts with cron.
ss -tlnp lists listening TCP sockets. -t TCP, -l listening, -n numbers not names, -p the process. || runs netstat -tlnp only if ss is missing. Same four flags.`,

  "lin-sudo": `sudo -l asks sudo what this user is allowed to run. NOPASSWD on a line means no password. env_keep+=NAME means sudo will pass that environment variable through instead of deleting it.
sudo --version prints the version banner. You read it. You do not pick an exploit from it until the rest of the list is dead. A password prompt means -l cannot show you the rules yet. Baron does not need a sudoers entry, but it is still not the first check.`,

  "lin-suid": `find walks from /. -perm -4000 selects the setuid bit. -type f keeps files, not directories that merely have the bit. 2>/dev/null hides the directories you cannot enter so the list is readable.
A path under /opt, /usr/local, or /home is interesting because it is not a stock tool. passwd, sudo, and su are setuid on almost every Linux box and are not a finding by themselves.`,

  "lin-caps": `getcap -r walks from / and prints file capabilities. cap_setuid=ep on python, perl, ruby, or php means that interpreter may change its user id. The one-liner calls setuid(0) and then starts bash. cap_dac_read_search lets the same python open a file the permissions would hide, such as /etc/shadow. That prints hashes. It does not make you root by itself. Empty output, or only ping, means there is nothing to use.`,

  "lin-lxd": `id shows whether lxd is in your groups. lxc image list prints images already on the box. lxc init creates a container from one of those names. security.privileged=true makes the container root real root, not a mapped user. The device line mounts the host's / at /mnt/root inside the container. lxc start boots it. lxc exec opens a shell in it. cat then reads the host's /root/proof.txt through that mount. An empty image list means you stop. Do not download an image during the exam.`,

  "win-backup": `whoami /priv | findstr /i backup keeps the backup privilege line. Enabled is required. reg save exports a registry hive. hklm\\sam is the local account database and hklm\\system holds the boot key. Both files are required. impacket-secretsdump -sam and -system LOCAL decrypts them on Kali and prints the NTLM hashes. You pass the Administrator hash. You do not need diskshadow.`,

  "win-serverops": `whoami /groups | findstr keeps the Server Operators line. That group may reconfigure services. sc query state= all lists services, and findstr keeps the name and state lines. sc qc shows the account the service runs as. sc config changes binPath. The space after the equals sign is required. sc stop and sc start run the new binary. Pick a service you can restart that is not DNS or NTDS. Penelope is already listening.`,

  "ad-gmsa": `nxc ldap -M gmsa reads group Managed Service Account passwords your user is allowed to retrieve. The account name ends in $. -H passes the NT hash it printed. This is a domain account, so you do not add --local-auth. A [+] is a host where that account can log on. (Pwn3d!) means it is an administrator there.`,

  "ad-rbcd": `nxc ldap -M maq prints how many computer accounts you may still create. impacket-addcomputer creates HELP, which the domain stores as HELP$. -computer-pass is the password you chose. impacket-rbcd -action write sets the target computer to trust HELP$ for delegation. impacket-getST asks for a service ticket to cifs on that computer while impersonating Administrator. That is S4U, not a coerce. export KRB5CCNAME points psexec at the ccache. -k -no-pass uses the ticket. One computer. Clock skew is fixed once, then you retry the ticket once.`,

  "lin-cron": `cat /etc/crontab shows the main table, including who the job runs as. A line is minute hour day month weekday user command.
ls -la lists permissions, owner, size, and date, and -a includes hidden names. You run it on the cron directories, then again on the script a job names. You are looking for a w in your trio or in the other trio. Stock run-parts lines are not writable scripts.
./pspy64 runs pspy from the current directory. The leading ./ is required because the current directory is usually not in PATH. It shows processes that start while it is running, which is how you see a root tar that crontab does not spell out.
echo overwrites the script the job already runs. The line copies bash to /tmp/rootbash and sets the setuid bit. After the next run, ls -la shows -rwsr-xr-x root root. /tmp/rootbash -p keeps that bit. id then prints uid=0(root).`,

  "lin-ldpreload": `sudo -l | grep -i ld_preload lists your sudo rules and keeps only lines mentioning LD_PRELOAD. -i ignores case. A password prompt here means you still do not know the rules.
gcc compiles. -fPIC makes position-independent code, which shared libraries need. -shared writes a .so, not a program. -nostartfiles skips the normal C startup so a small constructor still links. -o is the output path.
sudo LD_PRELOAD=/tmp/p.so COMMAND runs that allowed command as root and tells the dynamic linker to load your library first. The variable only survives if sudo kept it. You are not editing a file in /usr/lib.`,

  "lin-ldpath": `The grep is the same check as LD_PRELOAD, for the other variable name.
ldd prints the shared libraries a binary loads, with the paths it would use. You copy one of those file names. A static binary says it is not a dynamic executable, and then this whole card is dead.
gcc -shared -fPIC -o /tmp/libselinux.so.1 writes a shared library whose filename matches what ldd printed. The output name is the library name, not a rename of the source. The source is still hijack.c.
sudo LD_LIBRARY_PATH=/tmp COMMAND tells the linker to look in /tmp before the system directories, and sudo must be keeping that variable. An empty file named like the library fails with "file too short". That is a bad hijack, not sudo blocking you.`,

  "lin-creds": `cat ~/.bash_history prints commands this user already typed. ~ is your home directory. Names starting with a dot are hidden from a plain ls, which is why you name the file directly.
find walks /home, /opt, and /var/www. -type f keeps files. -readable keeps files this user can read. The \\( \\) group is so -o (or) does not apply -readable wrong. -name matches one pattern. 2>/dev/null hides permission errors. | head stops after ten hits so you read them instead of scrolling forever.
grep -RIn searches recursively (-r and -R both recurse; -R follows some symlinks), ignores binary-ish noise with -I, and prints the line number with -n. --exclude-dir=proc skips /proc even if you widen the path. The pattern is the word password. head again keeps the first hits.`,

  "lin-groups": `id prints your uid, gid, and supplementary groups. docker or lxd in that list is the lead, if the daemon is running.
ls -la /etc/passwd /etc/shadow shows whether you can write passwd or read shadow. -l is the permission trios. -a does nothing special on these two names because you named them, but the long form is what you read: a w in the other trio on passwd is rare and enough.
docker image ls lists images already present. docker run starts a container. -v /:/mnt mounts the host root at /mnt inside the container. --rm deletes the container when it exits. -it attaches a terminal. alpine is the image. chroot /mnt sh makes that mounted host root the container's root and starts a shell. If image pull hangs, use a name from docker image ls.`,

  "lin-kernel": `uname -a prints the kernel name, version, and build. You read it only after the Baron cards are dead. pkexec --version is PwnKit, a polkit bug, and it is not a kernel bug either.
Dirty Pipe is a narrow window, kernels 5.8 through 5.16.10. A high Ubuntu patch number is often already fixed. One PoC for that exact range. If it fails, the list is finished.`,

  "win-land": `whoami prints the user. whoami /all adds groups, privileges, and the integrity level in one report. whoami /priv is only the privilege table. SeImpersonate in that table matters even when the state says Disabled. Missing means it is not there.
systeminfo dumps the OS summary. | findstr keeps lines that match. /B anchors to the start of the line. /C:"..." is a literal string, so the spaces stay. You want OS name, version, and whether it is x64.
hostname is the computer name. net user lists local users. net localgroup administrators lists who is a local admin. NT AUTHORITY\\SERVICE in your user name is not SYSTEM. High integrity without Administrators is not admin.`,

  "win-svc-perm": `accesschk asks which services you can reconfigure. /accepteula skips the licence prompt. -u hides errors, -w keeps only write access, -c means the objects are services, -q hides the banner, -v prints the rights. The user is you. * is every service. SERVICE_CHANGE_CONFIG or SERVICE_ALL_ACCESS is the hit. SERVICE_QUERY_CONFIG is not.
sc qc prints the binary path, the start type, and SERVICE_START_NAME. LocalSystem is the account you want. sc config writes a new binPath. The space after the equals sign is required. sc stop then sc start runs your exe. whoami in that process is the success: nt authority\\system. Write the original path down before you change it.`,

  "win-unquoted": `wmic service get prints the name, path, account, and start mode. findstr /i /v drops lines. The first filter removes C:\\Windows paths. The second removes any line that already contains a quote, because a quoted path is not this bug.
sc qc confirms one service. You need a space in BINARY_PATH_NAME, no quotes around it, and SERVICE_START_NAME LocalSystem.
Windows splits that path at each space, from the left. For C:\\Program Files\\Unquoted Path Service\\common files\\svc.exe it tries Program.exe, then Unquoted.exe, then Path.exe, then common.exe, and only then the real svc.exe. It does not try every file in the folder.
icacls on each parent tells you which cut you can use. (M), (F), or FILE_ADD_FILE means you can create the exe there. (RX) means you cannot. C:\\ and C:\\Program Files are usually (RX), so Program.exe is almost never the plant.
copy writes the reverse shell under the name Windows will try. sc stop and sc start make the service launch it. Success is a Penelope session whose whoami is nt authority\\system. Access is denied on sc start, and the service is not AUTO_START, means the plant sits there. Park it.`,

  "win-file": `sc qc confirms the service account. icacls on the exe, not the folder, is this bug. (F), (M), or FILE_WRITE_DATA for you or Everyone means overwrite. The first copy saves the original as svc.exe.bak. copy /Y replaces the exe and does not ask. sc stop & sc start restarts it, and & runs start even if stop complains the service was already stopped. whoami printing nt authority\\system is the success. Access is denied on the copy means this is not the bug.`,

  "win-aie": `reg query reads one value. You run it twice because both hives must be 0x1. HKLM is the machine policy. HKCU is the user policy. A missing key, or 0x0, is the normal state. One 0x1 does nothing.
msiexec /quiet /qn /i installs the MSI with no window and no prompt. The package is a reverse shell you already built. Success is Penelope receiving a session, then whoami printing nt authority\\system.`,

  "win-potato": `whoami /priv shows whether SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege is in the table. Disabled still counts. If the name is absent, skip every potato.
sc query spooler shows the Print Spooler state. RUNNING is what PrintSpoofer wants. systeminfo | findstr /C:"System Type" tells you x64 or x86 so you pick a matching exe.
PrintSpoofer.exe -i -c cmd starts an interactive process running cmd. GodPotato-NET4.exe -cmd runs one command. NET4 is for machines with .NET 4, which Server 2019 and 2022 have. JuicyPotato on those versions is the wrong tool. A 441-byte file is an HTML download, not a failed exploit.`,

  "win-tasks": `schtasks /query /fo LIST /v lists every task with its action and its account. findstr keeps the name, the program, and Run As User. SYSTEM on that line is the account you want. icacls on that program shows whether you can replace it. The Startup icacls and the two Run queries are the logon paths. HKCU runs as you, so it is not privilege escalation.
copy /Y replaces the task exe. schtasks /run /tn starts it now. /tn is the task name, including the folder. SUCCESS plus whoami nt authority\\system is the path. Access is denied on /run means the file waits for the next logon of that account.`,

  "win-creds": `cmdkey /list shows credentials Windows has saved for this user. An empty list is dead.
type prints a file. %APPDATA% expands to that user's roaming AppData. The PSReadLine file is PowerShell history.
dir /s /b searches recursively and prints only the full path. 2>nul hides errors. nul is the Windows bin. The names are unattend and sysprep files, which sometimes hold a plaintext password.
findstr /s searches subdirectories, /i ignores case, and the pattern is the word password in those extensions. Hits inside help text are not passwords.`,

  "win-sam": `reg save exports a registry hive to a file you can copy. You need to already be allowed to read SAM, SYSTEM, and SECURITY. The three files together are what secretsdump needs. SAM holds local hashes, SYSTEM holds the boot key, SECURITY holds LSA secrets.
On Kali, impacket-secretsdump -sam -system -security LOCAL decrypts those files offline. LOCAL means they are files, not a remote host.
The Mimikatz lines are typed inside Mimikatz, not in cmd. privilege::debug asks for debug rights. token::elevate tries to steal a SYSTEM token. lsadump::sam reads SAM. lsadump::secrets reads LSA secrets. The binary must be x64 on an x64 OS. An x86 build fails with 0x00000005 even when you are Administrator. A line with no cur/text is an empty secret, not a password.`,

  "win-kernel": `systeminfo > file writes the full OS summary to a file. > overwrites that file. You copy it off the box if you need a suggester.
wmic qfe lists installed hotfixes. HotFixID and InstalledOn are the columns. A long list on Server 2022 means stop. An old build with almost no KBs is the only time this card is alive, and only after privileges, services, and creds were dead.`,

  "ad-start": `whoami /all shows the domain in the username and the groups. ipconfig /all shows the DNS suffix, which a WORKGROUP box does not have in a useful way. nltest /dclist:<domain> asks who the domain controllers are. If the domain name is WORKGROUP, you are not on this page.
nxc smb checks SMB logins across a range. <cidr> is the subnet. -u and -p are the domain user and password. [+] means the password was accepted. (Pwn3d!) means that login is local admin on that host. Do not point rockyou at a domain controller.`,

  "ad-enum": `nxc smb against the DC with --users lists domain users. --groups lists groups. Same -u and -p as the creds you already hold.
bloodhound-python collects the graph. -d is the domain, -ns is the DNS server, which you set to the DC so names resolve, -c All collects every collector, --zip writes one file you import. You are looking for a short path, not a second collection.`,

  "ad-roast": `GetUserSPNs requests a Kerberos service ticket for accounts that have an SPN. -dc-ip is the domain controller. -request writes the hash. That hash is not a shell.
GetNPUsers looks for accounts that do not require Kerberos pre-authentication. -usersfile is a list of names. -no-pass tries without a password, which is the point of AS-REP. The domain/ slash form with no user is how this tool takes a user list.
hashcat cracks the file. -m is the hash type: 13100 for the TGS tickets, 18200 for AS-REP. The last argument is the wordlist. No crack means the password is not in rockyou. Move on.`,

  "ad-pth": `nxc smb with -H uses the NTLM hash instead of a password. --local-auth treats the account as a local account on each target, which is what you want for a SAM hash that is not a domain user. Without --local-auth, the same hash is tried as a domain account.
impacket-psexec tries to run a service and give you a shell. -hashes takes LM:NTLM. A leading colon means the LM half is empty and only the NT hash is set. (Pwn3d!) on a machine you already own is not a new host.`,

  "ad-dcsync": `impacket-secretsdump with a domain login against the DC asks it to replicate secrets, which is DCSync. You only get output if that account may replicate. domain/user:'pass'@dc is the login and the target in one argument.
krbtgt and Administrator in the output means you have the domain. Access denied means you are early. A golden ticket is persistence, not something you need to score.`,

  "pw-id": `hashid guesses the hash type from the string you pass. The quotes keep $ from being treated as shell variables, which Linux hashes contain.
john --list=formats prints formats John knows. | head shows the start of a long list. You use the prefix ($6$, $krb5tgs$, and so on) to pick one mode, then you crack. NTLM from a domain admin is usually passed, not cracked.`,

  "pw-john": `ssh2john turns a private key into a hash file. john does not understand the raw OpenSSH file. > writes the hash. --wordlist is the guess list. john --show prints any password already cracked for that file.
unshadow merges /etc/passwd and /etc/shadow into the one file John expects for Linux accounts. You need both. passwd alone has an x where the hash should be, and John will say no hashes loaded.
Exhausted means the wordlist ended with no hit.`,

  "pw-hashcat": `hashcat -m selects the mode. 1000 is NTLM, 5600 is NetNTLMv2, 13100 is Kerberos TGS etype 23, 18200 is AS-REP. The next argument is the hash file, one hash per line, in the format that mode expects. The last argument is the wordlist.
--show prints cracked results and does not start a new run. Status Cracked is success. Separator unmatched or a token length error means the mode or the line format is wrong, not that the password is strong.`,

  "pw-spray": `nxc smb --pass-pol prints the lockout policy: how many bad passwords and how long the lock lasts. You read that before the spray. The second command tries one password across the users in the file. --continue-on-success does not stop at the first hit, so you see every reuse.
This is not a brute force. One password, then you stop. If BadPwdCount is already near the threshold, you do not spray. A wall of failures means the password is not reused.`,

  "pv-when": `ip a shows interfaces and addresses. ip route shows which networks this host can reach directly. A second NIC in 172.16.x.x that Kali cannot see is why you pivot.
ss -tlnp lists listening TCP ports and the process name. 127.0.0.1 means localhost only, so your nmap from Kali never saw it.
On Windows, ipconfig /all shows all adapters and the DNS suffix. route print shows the routing table. netstat -ano lists sockets. -a all, -n numeric, -o includes the process id. findstr LISTENING keeps the ones that are waiting for connections.`,

  "pv-ssh": `ssh -N keeps the tunnel and does not open a shell. -L 8080:127.0.0.1:80 listens on Kali port 8080 and, from the pivot, connects to the pivot's own port 80. -L 8445:internal:445 does the same toward a second host the pivot can see, so Kali's port 8445 is that host's SMB.
-D 1080 is a SOCKS proxy. proxychains sends the next program through it. nmap -Pn -sT is required. A SYN scan through SOCKS reports ports open when they are closed. You browse http://127.0.0.1:8080 for the forwarded site. -R, when the other side must call you, is the remote-forward card.`,

  "pv-chisel": `chisel server -p 8000 --reverse listens on Kali. The pivot connects to that port. --reverse lets the client ask Kali to open the forwards. file is also on Kali, and it has to say ELF or PE before you serve the file. python http.server is the file server on Kali. curl runs on the pivot and saves the binary there. chmod +x makes it runnable.
R:socks asks Kali to open a SOCKS port, 1080, on Kali. R:8081:internal:80 asks Kali to listen on 8081 and, from the pivot, connect to that internal host. R:8081:127.0.0.1:3306 is the victim's own loopback, not Kali's. proxychains aimed at 127.0.0.1 does not reach the victim, because that address is Kali. The proxychains config line socks5 127.0.0.1 1080 is what makes nxc and nmap use the proxy. nmap still needs -sT. A subnet scan is Ligolo instead.`,

  "pv-ligolo": `ip tuntap add runs on Kali and creates the interface named ligolo, owned by you. ip link set up turns it on. file exists means it is already there, so you skip the add. ./proxy -selfcert also runs on Kali. Port 11601 is the proxy port on Kali, and -selfcert makes the certificate.
The agent runs on the pivot and dials that Kali port. -ignore-cert accepts the self-signed certificate. session and start are typed in the proxy window on Kali, not on the pivot and not in bash. start is what actually builds the tunnel. The route comes after that, in a normal Kali shell. ip route add sends one subnet the pivot can see into the tun device. nmap and nxc then run on Kali with no proxychains, because the packets are normal.
ip route del removes that route when you are finished. Leave the tun device. 240.0.0.1/32 on the ligolo device is the agent's 127.0.0.1, which is the victim, not Kali. Add it after start, and point nmap at 240.0.0.1. Do not route 127.0.0.0/8, or Kali loses its own loopback. A host that cannot reach your Kali IP cannot run this agent. That case is the callback card.`,

  "cc-gcc": `gcc compiles C. file.c is the source. -o names the output. With no -static, the binary is dynamically linked and will look for the Kali glibc on the target.
file prints the type: ELF, 32 or 64 bit, static or dynamic. ldd prints the libraries a dynamic binary needs. After gcc -static, ldd should say it is not a dynamic executable. That is what you want for an older target.
GLIBC_2.34 not found means you uploaded the dynamic build. invalid preprocessing directive #Exploit means a line starts with # and is not a real C preprocessor command. Exploit-DB headers do that. missing terminating quote means a string's closing quote is on the next line. Put the string back on one line.`,

  "cc-win": `x86_64-w64-mingw32-gcc is the 64-bit Windows cross compiler. i686-w64-mingw32-gcc is the 32-bit one. You pick from systeminfo, not from habit. -o is the output exe.
file on Kali should say PE32+ and x86-64 for a 64-bit box. PE32 (80386) is a 32-bit exe. On Server 2022 that is the wrong tool, not a broken exploit.`,

  "cc-skip": `file tells you whether the thing you downloaded is a PE, an ELF, or HTML. ls -l shows the size in the long listing. A release of GodPotato or PrintSpoofer is hundreds of kilobytes. 441 bytes is the GitHub HTML page saved under a .exe name.
The comment is the rule: download the release file, not the source view in the browser.`,

  "exam-points": `This block is comments, so pasting it does nothing. It is the scoring reminder you write down while the first scan runs.
AD is the large block. Each standalone splits into a local flag and a proof flag. The pass paths in the comments are combinations, not commands. Confirm the live OffSec page on the day, because the raw total is scaled from December 2026.`,

  "exam-breach": `The comments tell you to record the username and password the exam already gave you.
nxc smb tries that pair over SMB. The first command is the domain controller only, to see if you typed the password correctly. The second is the subnet, to see where that user is an admin. -u is the user, -p is the password. Quote the password so spaces and symbols survive.
STATUS_LOGON_FAILURE on the exam password means you mistyped it. It does not mean you should spray.`,

  "exam-hole": `Again these are comments. # lines are notes. The three labels are what you write when one idea has eaten 45 minutes: the fact you proved, the part you only hope, and the next card if you stop.
Still compiling is not one of those facts.`,

  "exam-not": `Every line is a comment on purpose. responder, bettercap, arpspoof, ntlmrelayx, aircrack, wifiphisher, shellter, and a keylogger are tools you are not starting.
OffSec does not allow poisoning or spoofing on this exam. Wi-Fi is not a target. Seeing SMB signing disabled is a note, not a reason to relay.`,

  "exam-msf": `penelope -O -p 443 is the listener. -p sets 443. -O leaves the automatic modules off. The msfvenom line builds one Windows reverse shell that speaks to that listener. LHOST is your VPN address. LPORT must be the same number.
msfvenom builds one file when you already know the target will run that format. -p is the payload, LHOST and LPORT are your listener, -f exe is a Windows executable, -o is the filename. You are not opening msfconsole to search for a module because searchsploit was empty.`,

  "recon-udp": `nmap -sU is UDP, and sudo is there because that scan needs root. --top-ports 20 is the pass you run on every host, instead of all 65535. -T4 is a faster timing template. -oA saves it next to the TCP scans.
open|filtered means nmap got no answer, which is normal for UDP. 161 is the exception: still try one community-string list. onesixtyone -c is that list. Silence from both tools means UDP is finished.`,

  "recon-hosts": `echo prints a line. | sudo tee -a appends it to /etc/hosts as root. The line is the IP, then one or more names. After that, your machine resolves those names to the lab host.
curl -sI fetches headers only. -s is silent, -I is headers. -k on the https command ignores a bad TLS certificate, which lab DCs often have. If the name returns a real site and the IP returned a default page, the name was required.`,

  "recon-folder": `mkdir -p creates the whole tree in one go. The brace lists the host folders, and the inner brace lists nmap, loot, and shells inside each of them. Replace the example IPs with the ones you were given.
The comments under it are the headings you put in notes.txt. They are not commands. The point of the folder is that the scan files survive when the terminal scrollback does not.`,

  "svc-telnet": `telnet opens a TCP session to port 23 and shows you the banner and the login prompt. nc host 23 does the same with netcat when telnet is not installed. 23 is the port.
You type a password you already found. You do not start a wordlist.`,

  "svc-mail": `nc -nv shows the banner. On POP you type USER, PASS, LIST, RETR 1, and QUIT. openssl s_client -quiet -connect host:995 is that same conversation over TLS. IMAP uses tags: a1 LOGIN, a2 LIST, a3 SELECT INBOX, a4 FETCH 1 BODY[]. You are reading one message for a password or a hostname. A failed login ends the card.`,

  "svc-tftp": `sudo nmap -sU -p 69 scans UDP 69, which needs root. tftp-enum tries common filenames because TFTP will not list a directory. atftp --get -r is the remote name and -l is the local save. put uploads, and only when you already know that name gets executed.`,

  "svc-redis": `redis-cli -h talks to Redis on that host, default port 6379. INFO server prints the version and tells you whether auth is required. NOAUTH in the reply means you need a password.
CONFIG GET dir and CONFIG GET dbfilename show where Redis would write its dump. Those only matter after INFO works without a password, and only if that directory is useful. A write you cannot confirm on the far side is dead.`,

  "svc-rsync": `rsync rsync://host/ lists modules the server will show without credentials. The second command copies one module. -a is archive mode, which keeps permissions and recurses. -v is verbose. The trailing path is your local folder.
@ERROR: auth failed means the module wants a secret you do not have.`,

  "svc-vnc": `vnc-info and vnc-title tell you if a password is required. vncviewer host:5900 opens the desktop. A cleartext password from a config is typed in. An 8-byte passwd file is the known DES blob, and you use the script you already practised for it. You do not hydra the port. 1194 is OpenVPN and is not this card.`,

  "svc-postgres": `psql is the Kali client. -h is the host, -p is the port, -U is the user, -d is the database you connect to. It prompts for a password. Empty, then postgres, then a config password.
\\conninfo, \\l, \\c, and \\dt are psql commands. They do not take a semicolon. \\l lists databases. \\c switches into one. \\dt lists its tables. SELECT current_user, usesuper is SQL and does end with a semicolon. usesuper t means this role may run COPY TO PROGRAM. That one statement runs id as the database operating-system user. usesuper f means you only have the rows.`,

  "svc-oracle": `nmap -sV on 1521 names the listener and sometimes the service name. which sqlplus tells you whether the client exists on this Kali. The sqlplus argument is user/password@//host:1521/SERVICE. system/manager is the one default. SELECT USER FROM dual and SELECT username FROM all_users are typed in SQL*Plus. No client means you stop. Installing one is not the exam move.`,

  "svc-rpc": `rpcclient -U "" -N connects with an empty user and no password. -N skips the password prompt. enumdomusers is typed inside rpcclient, which is why it is a comment here. It lists domain or SAM users when anonymous RPC is allowed.
nxc smb with empty -u and -p and --users tries the same idea over SMB. enum4linux-ng -A runs its full anonymous enumeration. -A means all the simple checks.
You save names. You do not spray them yet.`,

  "svc-krb": `nmap -p with those ports checks the AD set: Kerberos 88, LDAP 389, SMB 445, RDP 3389, WinRM 5985. 88 open means this is a domain machine. It is not a CVE to search.
nxc smb then tests the exam username. -u and -p are that user and password. Valid creds move you to the AD section. You still enumerate web and SMB on this host.`,

  "web-finger": `whatweb -a 3 raises aggression so it fetches more pages and looks harder for a product name. -a 1 would be quieter and easier to miss.
curl -sI is headers only: Server, cookies, redirects. curl -s of robots.txt shows paths the owner did not link. curl -s of the homepage piped to head -c 2000 prints the first 2000 bytes, enough for a title and comments without the whole page.
Server: Apache and an empty body means you have not identified a product yet.`,

  "web-dirs": `feroxbuster brute-forces URLs. -u is the base. -w is the wordlist. -x adds extensions, so it tries page.php and page.bak, not only a directory name. -t 50 is fifty threads. -o writes the results to a file you can read later.
The second command swaps extensions for IIS: asp, aspx, config. A 200 or 301 on a backup or an admin path is the hit. A pile of 404s means stop, not a bigger list.`,

  "web-git": `curl -s of /.git/HEAD downloads one small file. If the body is ref: refs/heads/main, the repository is on the web server.
git-dumper copies the objects it can reach into ./repo. cd repo moves you into it, and git log -p shows commit messages and the patches. | head keeps the start of what is often a long history. Passwords hide in old commits, not only in the latest file.`,

  "web-wrap": `The curl URL uses php://filter to make PHP base64-encode a file instead of executing it. resource=index.php is that file. | base64 -d decodes the body so you can read the source. Single quotes protect the URL from the shell.
The comments are the next experiments, not commands that run now: extra ../ tricks, and including a log file only after you have shown the parameter includes files. A parameter that just echoes your text is not LFI.`,

  "web-sqlmap": `Every line is a comment, so pasting the card does not run sqlmap. The exam guide groups sqlmap with automatic exploitation tools. -u would be the URL, --batch would accept defaults, --dbs would list databases, --technique=U would force UNION only. You do not use those flags on the exam.
SQLi 1 proves the parameter. SQLi 2, 3, or 4 extracts the password. If the guide later allows sqlmap, this card is the one to reread.`,

  "web-idor": `curl -s fetches one object. -H adds a header. Cookie: session=... sends your existing session so the server knows who you are. You change 15 to 14, or 15.txt to 1.txt, and compare.
401, or the same object again, means the server checked authorisation. Another user's email or file means it did not. This is the same idea as API BOLA. It is not a new bug family.`,

  "web-wp": `wpscan --url targets WordPress. --enumerate u,vp asks for users and vulnerable plugins. --plugins-detection mixed tries more than one way to see plugins.
The second command is only for a small password file you built from the box. -U is one username. -P is that short file. It is not rockyou, and it is not aimed at xmlrpc for an hour.`,

  "web-tomcat": `curl -sI checks /manager/html and /host-manager/html without downloading the body. 401 means the manager exists and wants a password. 404 means it is not there.
curl -u 'user:pass' sends HTTP basic auth. | head shows whether you got the application list or another 401. You try passwords you already have, one at a time. A 200 with a deploy form is the WAR upload. Hydra against manager is how you waste the hour.`,

  "web-jenkins": `curl -sI | head shows response headers. X-Jenkins or a Jenkins title tells you what it is. head limits the noise.
curl of /script shows whether the script console is reachable. The second form adds -u user:pass when you have a login. A form in the body is the console. A login wall and no password means stop. Do not directory-brute your way to a console that is locked.`,

  "web-csrf": `There is no tool invocation here. You resend one state-changing request, such as change-password, and you delete the CSRF parameter the second time.
It only matters if the action still succeeds and some other logged-in user will load a page you control. With no second user, the card is dead.`,

  "web-nikto": `nikto -h scans a web server. -o writes the report to a file. The & at the end backgrounds the command so your terminal comes back and you can keep working.
You do not watch it. Missing security headers are not a shell. If the file later names a path, you confirm that one path by hand.`,

  "sh-which": `which prints the path of a program if it is on PATH, and prints nothing if it is not. You list several names in one call. 2>/dev/null hides the "not found" errors so you only see what exists.
where is the Windows equivalent of which. You pick the first payload style that is actually installed. bash pasted into cmd.exe does not become bash.`,

  "sh-bash": `bash -c runs the quoted string. Inside it, bash -i is interactive. >& /dev/tcp/host/port sends the shell's output to a TCP connection. 0>&1 attaches stdin to that same connection. <KALI> is your address. 443 must already have Penelope listening.
No connection usually means the host cannot reach that IP, or you typed the VPN address wrong. Test with curl to your Kali from the target before you rewrite the payload.`,

  "sh-php": `php -r runs the quoted PHP once, no file needed. fsockopen opens a TCP socket to your listener. proc_open starts /bin/sh -i and the array ties stdin, stdout, and stderr to that socket, which is why you get a shell.
The session user will be the web user. php missing from PATH, or outbound 443 blocked, is why it fails. Try a port you already proved the firewall allows.`,

  "sh-ps": `The comment says to generate the encoded PowerShell on Kali, from a one-liner you already saved, and to start Penelope before you run it. powershell -e on the target runs that blob.
whoami in the callback is the account that executed it, often a service account, not SYSTEM. Execution policy is rarely why a generated reverse shell failed. A bad LHOST or a 441-byte file is why.`,

  "lin-pkexec": `The find lists setuid files and grep pkexec keeps only that name. -perm -4000 is the setuid bit, -type f is files, 2>/dev/null hides errors. A normal system has pkexec setuid. That fact alone is not the bug.
pkexec --version prints the polkit version. You compare it to the vulnerable build you practised, and only after the misconfig list is clean. One PoC. If it fails, stop.`,

  "lin-peas-read": `curl -sL downloads linpeas. -L follows redirects. The URL is your Kali web server. | bash -s -- -a runs the downloaded script in bash. -s lets bash read the script on stdin and still accept arguments. -- ends bash options. -a is linpeas' thorough flag. 2>/dev/null hides its errors. tee /tmp/peas.txt saves the output and still shows it.
grep then searches that file. -n prints line numbers, -i ignores case, -E turns on extended patterns so the | inside the quotes means or. head keeps ten lines. You re-run the one line by hand. A red kernel list on a patched Ubuntu is not a finding.`,

  "lin-pspy": `./pspy64 runs the 64-bit pspy binary from the current directory. ./ is required. It prints processes as they start, including ones whose command line is not in the crontab you can read.
You leave it for about two minutes. UID=0 is root. A tar with a bare * in a directory you can write is the wildcard card. A script path is something you ls -la. If you only see cron.daily, you kill it.`,

  "lin-path": `echo $PATH prints the directories this shell searches, in order, separated by colons. A root job does not use your shell's PATH. You care about the PATH inside the script or the cron line.
The echo line writes a fake cp into /tmp. The single quotes keep the shell from running the commands while you write the file. chmod +x makes it executable.
This only works if the root job calls cp with no slash, and /tmp is the first place it looks, or you can edit the script. A script that calls /usr/bin/cp is immune. /tmp/rootbash -p later keeps the setuid bit. Without -p, bash drops it.`,

  "lin-passwd": `ls -la /etc/passwd shows the permission trios. You need a w for your user or for other. -rw-r--r-- root root is the normal file and it is dead.
openssl passwd -1 makes an MD5-crypt hash. -salt x uses the salt x. pass123 is the password you are choosing. You append a line of the form name:hash:0:0:root:/root:/bin/bash. The two zeros are uid and gid, which is why that user is root. Then su to that name.
Do not delete the original contents. Screenshot before you do anything else.`,

  "lin-nfs2": `showmount -e lists exports. cat /etc/exports is how you see no_root_squash when you are already on the server. From Kali, the showmount line is the one you can always try.
sudo mount -t nfs attaches the export at /mnt/nfs. If the export says no_root_squash, files you create there as root on Kali are owned by root on the server. cp copies bash. chmod +s sets the setuid bit (the s in the owner execute position).
root_squash means your files become nobody. You can still read the share. You stop the SUID idea. On the server the shell is /share/rootbash -p.`,

  "lin-listen": `ss -tlnp lists TCP listeners with process names. -t TCP, -l listening only, -n numeric ports, -p process. || netstat -tlnp is the fallback if ss is not installed.
127.0.0.1:port was invisible to your nmap from Kali. 0.0.0.0 ports are the ones you already scanned. You then talk to the local port with mysql or curl from the box. If the client you need only exists on Kali, forward it. Chisel uses R:localport:127.0.0.1:port. Ligolo uses a route to 240.0.0.1 after start. proxychains to 127.0.0.1 hits Kali, not this host.`,

  "lin-jdebug": `ps aux lists processes. a is other users' processes, u adds the user column, x includes processes without a terminal. grep -i java keeps Java. You read the user column. Root there is the interesting case.
ss -tlnp | grep 5005 keeps the line if something is listening on the Java debug port. No debug port, or Java running as the user you already are, is dead. The process existing is not a vulnerability.`,

  "win-token": `whoami /groups prints the group list and the flags on each group, including the integrity label. whoami /priv prints privileges separately so you do not confuse a group with a privilege.
BUILTIN\\Administrators with Enabled is a real admin token. The same group with a filtered flag means UAC stripped it. You are in the group and you still do not have the power. NT AUTHORITY\\SERVICE is not SYSTEM. High Mandatory Level without Administrators is not admin. SeImpersonate on a service account is the potato card, not proof you are already admin.`,

  "win-arch": `systeminfo | findstr /C:"System Type" prints x64-based PC or X86-based PC. /C: takes the phrase literally, including the space. echo %PROCESSOR_ARCHITECTURE% prints AMD64 or x86 from the environment. %NAME% is how cmd expands a variable.
file on Kali inspects the exe before you upload it. PE32+ x86-64 matches an x64 host. PE32 (80386) is 32-bit. A 32-bit mimikatz on 64-bit Server 2022 fails with 0x00000005. That error is the wrong binary.`,

  "win-powerup": `powershell -ep bypass starts PowerShell and sets ExecutionPolicy to Bypass for this process only, so a downloaded script can run. -c is the command string. The dot-space before .\\PowerUp.ps1 dot-sources the script, which loads its functions into this session. The semicolon then runs Invoke-AllChecks.
A hit is a suggestion. You confirm it with sc qc or icacls. Access is denied on the manual command means the suggestion was wrong.`,

  "win-history": `type prints the file. %APPDATA% is the roaming profile of the current user, so the first command works without you spelling the username. The second path is the same file written out, for when the variable is not what you expect.
You are looking for a password in a command the user already ran. A missing file, or a file of only dir and cd, is dead. Check unattend and web.config next.`,

  "ad-nocreds": `nxc smb with empty user and password and --shares tries anonymous SMB. ldapsearch -x -H ldap://host -s base namingContexts asks the directory for its suffix without credentials. -x is simple auth, -s base is the root entry only.
lookupsid.py domain/ip -no-pass cycles RIDs over an anonymous IPC session and prints names when the host allows it. | head caps the output.
Access denied on all three means you wait for the exam password. You do not launch a giant name brute.`,

  "ad-bh": `bloodhound-python is the collector. -u -p -d are user, password, domain. -ns points DNS at the DC. -c All runs every collector. --zip produces the file you import once.
The lines under the comments are queries you click in the BloodHound UI, not shell commands. You want one to three edges you recognise. Collecting a second time does not create a path that was not there.`,

  "ad-acl": `net rpc password sets a user's password over RPC. The user, the new password, -U domain/you%pass as the account that has the right, and -S the DC. You run it only when BloodHound says ForceChangePassword or GenericAll on that user.
net group name user /add /domain adds you to a domain group. /add is the action. /domain talks to the domain controller instead of the local SAM. Access denied means you misread the edge. Do not try a random user next.`,

  "ad-deleg": `nxc ldap -M find-delegation runs one module that lists unconstrained and constrained delegation principals. -u and -p are your domain creds. The DC is the target because LDAP is there.
A principal you already control, with a target SPN, is the lead. Domain controllers marked unconstrained, with no coercion plan, are not your path. Relays are not the exam plan.
impacket-getST asks for a service ticket to that SPN while impersonating Administrator. export KRB5CCNAME points the next tool at the ccache. impacket-psexec -k -no-pass uses the ticket. Success is a shell on that one host whose whoami is nt authority\\system.`,

  "ad-laps": `nxc ldap -M laps reads LAPS passwords your user is allowed to see. The SMB form with --laps does the same check from the SMB modules and can target the computers directly.
A line with a computer name and a clear local Administrator password is a host admin. No output means you cannot read LAPS. That host is not automatically domain admin.
nxc smb and nxc winrm try that password on that one computer. (Pwn3d!) means you are admin there. evil-winrm -i is the host and -u and -p are the LAPS account. whoami in that shell should print administrator.`,

  "ad-gpp": `nxc smb -M gpp_password searches SYSVOL for Group Policy preference files that contain a cpassword attribute, and it decrypts the known key.
The smbclient line is the manual version. -c 'recurse;ls' lists the share recursively without an interactive session. You still have to open an xml that the module might have skipped. No cpassword means the old GPP bug is absent. A hard-coded password in a script is a different, smaller check, then you leave.
gpp-decrypt turns the cpassword string into the clear password when the module did not already print it. nxc smb with that user and that password is the one login. [+] is the success.`,

  "ad-shares": `nxc smb --shares on the subnet shows which shares this user can read. You ignore IPC$, SYSVOL, and NETLOGON once GPP is done, unless a script there has a password.
--spider walks one share. --pattern is a regular expression. pass|kdbx|xml|config keeps filenames that look like secrets. READ on a non-default share plus a password in a file is the hit. Do not download ISOs.`,

  "ad-ptt": `export KRB5CCNAME= sets the environment variable Kerberos tools read to find your ticket cache. The path is a ccache you already obtained.
nxc smb --use-kcache authenticates with that ticket instead of a password. You still pass -u so it knows which name is in the cache. impacket-psexec -k -no-pass does the same for a shell. -k means Kerberos.
Clock skew too great is a time problem. Sync once and retry once. A ticket that is valid but not an admin will not give you psexec. That ticket is not broken.`,

  "ad-adcs": `You open this card only when a domain login is already yours and roast, ACL, and shares are dead. No CA means you leave. You do not study the other ESC numbers on exam day.
certipy find lists templates. -u is user@domain, -p is the password, -dc-ip is the controller. -vulnerable hides the healthy templates. -stdout prints the result.
certipy req asks the CA for a certificate. -ca and -template are copied from the find output, not guessed. -upn administrator@domain is the ESC1 part: the template lets you put someone else's name on the certificate. That someone is Administrator, once.
certipy auth -pfx uses the certificate file the request just wrote. It prints an NT hash for that account. You pass the hash. You do not crack it. Any template that is not ESC1 is not this card.`,

  "pw-landed": `The comments are the order. You write the secret down first because the terminal will scroll it away. Step 1 is the service that contained it. Step 2 is the other listeners on that same host: nxc smb, nxc winrm, ssh, the web form, the database. One try each.
nxc smb against the DC is step 3, and only when the username looks like a domain account. A [+] there means the password is domain-valid. If that user fails everywhere, the reuse card tries the same password on the other accounts. The spray is after that.`,

  "pw-reuse": `awk -F: splits /etc/passwd on colons. $7 is the shell. The pattern keeps accounts whose shell name contains sh, so you skip nologin and false. su - switches to that user and reads the password from the keyboard. You type the one password you found. Root is a separate try, once.
nxc from Kali does the same job without a shell on the box. users.txt is those names, not a big wordlist. -p is the single password. --continue-on-success does not stop at the first hit. --local-auth on SMB and WinRM means the account is local to that host, which is what a password from a config usually is. A domain spray is the next card.`,

  "ad-zerologon": `nxc smb -M zerologon checks CVE-2020-1472. -u '' -p '' is an empty login because the check does not need your user. You run it only after roast, ACL, LAPS, shares, and local privesc are dead.
Not vulnerable means stop. Vulnerable means one exploit you have already practised, then you put the machine back the way the tool requires and you screenshot before anything else. It can break a DC.`,

  "pw-sshkey": `file id_key tells you whether this is an OpenSSH private key, a public key, or random data. The private-key header looks the same with a passphrase and without one. Reading the file will not show you the passphrase.
ssh -i uses the key. If it asks for a passphrase, you stop guessing and convert it. ssh2john writes a hash. john --wordlist cracks it. john --show prints the result. No password hashes loaded means you pointed john at the raw key. ssh that connects with no prompt means the passphrase is empty. Do not run john then.`,

  "pw-linuxhash": `unshadow combines passwd and shadow into one file. John needs the username from passwd and the hash from shadow. > u.txt writes it.
john --wordlist cracks that file. john --show prints user:password lines. No password hashes loaded means the hash field was x because you only copied passwd. Exhausted means rockyou does not contain it.
su to the user, then try the same password on root once. Lab boxes reuse it. Once.`,

  "pw-rule": `hashcat -m 1000 is NTLM again. -w 3 raises the workload. -r applies a rules file, which mutates each word (capitalise, add a digit, and so on). best64 is one small ruleset.
--show prints a crack. Exhausted a second time means stop. If the hash is NTLM, pass it. If it is a Kerberos TGS, the roast is over.`,

  "pw-hydra": `hydra tries logins. -L is a username file, -l is one username. -P is a password file. You point it at found.txt, the two or three passwords you already recovered, not at rockyou.
ssh://host is the SSH module. The http-post-form module needs the path, the body with ^USER^ and ^PASS^ placeholders, and a string that appears on failure. If you get the failure string wrong, hydra reports success when the login failed. A screen of failures ends the card. The next card is how to build that string from the browser.`,

  "pw-hydra-form": `-l is one username. -P is the small password file. -t 1 is one attempt at a time, so you do not open twenty logins at once. -f stops at the first password that works. -u loops users first: every username with password one, then every username with password two. Without -u, hydra burns the whole list against the first user and locks that account.
http-post-form takes one quoted argument with three fields separated by colons: the path, the request body, and the failure text. ^USER^ and ^PASS^ are hydra's placeholders, not something you type as the password. https-post-form is the same module on port 443. S=Location means "this text appears on success" instead of naming the failure. Use that when the error page says nothing useful.
You get the body from the browser Network tab after one failed login. Copy the request body and replace the password you typed with ^PASS^. If that body contains __VIEWSTATE or __EVENTVALIDATION, do not use hydra on it. Those values expire. The old note's rockyou commands are the shape of the line, not the list you run on the exam.`,

  "pv-proxy": `grep prints the lines that decide whether the proxy is used. localnet is a bypass list, not a list of targets. If 10.0.0.0/255.0.0.0 is uncommented, an address like 10.10.10.11 never enters the SOCKS port. The same for 172.16 and 192.168. Those three stay commented. 127.0.0.0 stays, so tools can still talk to Kali itself.
The tee writes a whole new /etc/proxychains4.conf. The quoted EOF means nothing in the file is expanded by the shell.
strict_chain uses every uncommented proxy, in order, and fails if that proxy is down. With a single socks5 line that is what you want. dynamic_chain skips a dead proxy, which only helps when you listed more than one. random_chain picks one at random. Do not turn it on.
proxy_dns sends name lookups through the proxy. quiet_mode hides the library noise. The two timeouts are milliseconds.
socks5 is the type for ssh -D and for Chisel R:socks. The port has to be the one ss shows listening. socks4 is only for an old proxy that is not socks5. An http line is a real HTTP proxy, not a raw forwarded port. Two uncommented proxy lines are a chain through both, and the second one will fail.`,

  "pv-px-use": `ss -tlnp | grep 1080 proves the SOCKS port exists before you wrap a tool. proxychains4 -q runs the next command through the file and stays quiet. -f points at a copy of the file when you do not want to change the system one.
curl, nmap -sT, smbclient, and nxc use normal TCP and obey the hook. -Pn skips ping. -sT is a full connect, which tells the truth through SOCKS. -n skips nmap's own DNS so a dead resolver does not stall the scan. -sS uses raw sockets and never enters the proxy, so ports look open or filtered. A Go binary that does not call libc also ignores the file. Set Firefox itself to SOCKS5 127.0.0.1 port 1080 and tick proxy DNS. Do not also wrap it.
If curl through the proxy sees the same thing as curl without it, the localnet lines are still bypassing the exam range.`,

  "pv-files": `python3 -m http.server 8080 is started on the pivot, the machine that can see both Kali and the internal host. The internal host then curls the pivot's IP, not your VPN IP. -o sets the output filename.
ssh -L 8080:internal:80 user@pivot is the other direction: Kali port 8080 forwards through the pivot to the internal host's port 80. Your browser uses http://127.0.0.1:8080.
A timeout to your VPN address from the internal host is expected until a tunnel faces that way. Compare file sizes before you run anything.`,

  "cc-errors": `The three numbered lines are comments naming the errors, not commands. #Exploit at the top of an Exploit-DB file is a text header. The compiler treats # as a preprocessor directive and rejects the word Exploit. Delete those lines or turn them into // comments.
A missing terminating quote is a string broken across two lines. Join it. GLIBC_2.34 not found is a dynamic binary. file ./exploit shows dynamic versus static. gcc -static rebuilds it so the target does not need Kali's glibc. Then file should say statically linked.
Do not keep uploading the same dynamic file. Do not edit a download that file says is HTML.`,

  "cc-which": `file source.c and head -n 5 show you what you actually saved. -n 5 is five lines. Real C starts with #include. A file that starts with <!DOCTYPE is the web page. A file that starts with # Exploit Title still has the EDB banner.
gcc -static builds a Linux binary that does not depend on the target's glibc. The mingw command builds a 64-bit Windows exe. file on both outputs confirms ELF static or PE32+ before you transfer. Fix the source, rebuild, compare size, then copy.`,

  "rep-live": `The Linux lines run whoami, id, hostname, and hostname -I, then cat the flag. hostname -I is one line of addresses. ip a is a long listing and it pushes the flag off the screenshot. Semicolons run the next command even if one fails. Do local.txt and proof.txt as two screenshots, because they are two privileges.
The Windows line uses & for the same reason. type prints the flag file. Public and the Administrator desktop are the usual locations. You still look if the lab named them differently.
The text goes in the report form as well as the screenshot. A closed shell forgets the flag.`,

  "rep-map": `This is a comment template, not a command. Per host you keep three things: the foothold command and the evidence, the privilege-escalation command and the evidence, and the flags. Dead ends are one line so you can explain them later.
A list of open ports with no password is not a report.`,

  "rep-flags": `find / walks the whole filesystem. -name local.txt -o -name proof.txt matches either filename. -o means or. 2>/dev/null hides the directories you cannot search. If this prints nothing, you are not the user who can read the flag yet.
dir /s /b on Windows searches recursively and prints bare paths. The * in C:\\Users\\*\\Desktop matches each user. 2>nul hides access denied. local.txt is the low user. proof.txt is the privileged user. Finding only local.txt means the box is half done.`,

  "lin-named": `Each line is one sudo invocation of a program GTFOBins already documents. sudo runs it as root only if sudo -l said NOPASSWD and did not pin the arguments. If the sudoers line includes arguments, these one-liners are rejected.
find . -exec /bin/sh -p \\; -quit starts at the current directory, and for the first match runs a shell. -p on sh and bash keeps the elevated uid. \\; ends the -exec command. -quit stops find immediately. The backslash is so the shell does not eat the semicolon.
vim -c runs an ex command. :!/bin/sh is "run a shell". awk 'BEGIN {system("/bin/sh")}' runs the shell before any input. less opens a file, and you then type !/bin/sh inside less. env /bin/sh just runs a shell. python3 -c, perl -e, and bash are the interpreter forms.
For a SUID bash you drop sudo and run the binary with -p. One binary, once. command not allowed means that line is dead.`,

  "lin-doas": `doas is the OpenBSD substitute for sudo, sometimes present on Linux. doas -l lists what you may run, the same idea as sudo -l.
ls -la /etc/doas.conf shows whether you can read or write the rules file. -l is the permission trios, owner, size, and date. doas: not found means the card is dead in one second. A password prompt means leave it, same as sudo. doas /bin/sh is the escalation when the permit line says nopass as root. id then prints uid=0(root).`,

  "lin-shadow": `ls -la on the three paths shows permissions. -l is owner, group, size, date, and the rwx trios. You need r for you on shadow or on a backup. 2>/dev/null hides the names that do not exist so a missing backup does not look like a denial.
cat /etc/shadow prints the hashes if you can read them. root:$6$ or root:$y$ is a hash, not a shell.
On Kali, unshadow merges passwd and shadow, and john --wordlist cracks the result. A hash that exhausts rockyou is dead for the exam. su - root uses a password john actually printed.`,

  "lin-sudoers-w": `ls -la prints the mode and owner of sudoers and of the drop-in directory. find ... -writable prints only objects this user can write. 2>/dev/null hides the rest.
-rw-rw-rw- means owner, group, and other can all write. That is the bug. -r--r----- root root is normal. Being able to read sudoers is not the same as a NOPASSWD rule, and it is not the same as being able to write one.
Add one line for your user. echo appends user ALL=(ALL) NOPASSWD: ALL into a file in sudoers.d. Do not delete the original. sudo -l should then show NOPASSWD: ALL, and sudo /bin/bash is the root shell. id prints uid=0(root).`,

  "lin-systemd": `systemctl list-timers --all shows every timer, including inactive ones, and when it will next fire. You are looking for a custom timer, not apt and fstrim.
find on the systemd directories with -writable -type f lists unit files you can change. 2>/dev/null hides the ones you cannot search. ls -la on the script a unit's ExecStart names shows whether the script, rather than the unit, is writable. A w in your permission trio is the lead.
systemctl restart only if you are allowed. Otherwise wait one interval, not an hour. echo replaces the script the unit already runs. It copies bash to /tmp/rootbash and sets the setuid bit, 4755. After the service runs, ls -la shows -rwsr-xr-x root root. /tmp/rootbash -p starts a root shell. id prints uid=0(root).`,

  "lin-tar-wild": `./pspy64 watches commands that start, which is how you see root running tar with a bare asterisk. The crontab you can read often does not show it.
cd moves into the directory tar is archiving. echo writes a script. The single quotes stop your shell from running cp now. touch creates two filenames that tar will treat as its own options because they start with --. checkpoint=1 makes tar fire the action. checkpoint-action runs sh on your script. The backslash before the space in sh\\ shell.sh is so the filename contains a space that tar splits the way you practised.
The next root tar creates /tmp/rootbash. ls -la then shows an s in the owner execute position, the setuid bit. You run it with -p. If pspy never shows tar, do not plant files in /tmp and hope.`,

  "lin-sock": `ls -la /var/run/docker.sock shows the socket's owner and mode. A w for your group, or for other, means you can talk to the Docker API. id shows whether you are in that group. The group is not always named docker.
docker ps lists containers if the socket accepted you. Permission denied means the listing of the socket name was not enough. docker image ls shows an image you can use without a pull. docker run -v /:/mnt mounts the host root at /mnt. --rm deletes the container when it exits. -it attaches a terminal. chroot /mnt sh makes the host root the container root. id inside it prints uid=0(root), and cat /root/proof.txt is the host flag.`,

  "lin-mysql-root": `ps aux lists processes with the user column. grep -i mysql keeps the database. grep -v grep removes the grep line itself, which would otherwise match the word mysql. You want the user column to say root. mysql running as mysql, while you are already that user, is not privilege escalation.
mysql -u root is a local login attempt. No -p means you do not even ask for a password, which is the misconfiguration when it works.
\\! id is typed inside the MySQL client. \\! runs a shell command as the operating-system user mysqld is running as. uid=0 is root. version() is not a lead.`,

  "lin-proc": `ps auxww lists processes. ww stops ps from truncating the command line, which is where a password sometimes sits. grep -i -E keeps lines matching pass, pwd, mysql, or ssh. -E is extended regex so the bars mean or. grep -v grep drops the grep process.
tr '\\0' '\\n' turns the NUL separators in the environment block into newlines so you can read it. The < redirects the file into tr. /proc/pid/environ is that process's environment. 2>/dev/null hides it when you cannot read it. The second grep keeps lines that look like secrets.
A value that su or mysql accepts is a credential. Do not dump /proc/*/mem.`,

  "lin-homes": `ls -la /home shows each home directory's owner and mode. -a includes hidden directories. A r-x or rwx for other, or a directory you own that is not your login, is worth opening. Permission denied on the others is dead.
getent passwd prints the user database, including LDAP users that are not only in the local file. awk -F: splits on colons. The condition keeps uids from 1000 up but below 65534, which skips system accounts and nobody. It prints name, home, and shell.
find looks in /home and /root for readable files with those names. -readable is this user. The \\( \\) group ties the -o names together. 2>/dev/null hides /root when you cannot enter it. A key or a history password means su or ssh, then you run the Linux order again as that user. Their sudo -l is a different answer.`,

  "lin-tmux": `ls -la on the socket directories shows who can connect. -l gives owner and mode. 2>/dev/null hides the path if tmux or screen is not installed.
screen -ls lists screen sessions. tmux -S selects a socket file instead of the default. attach joins that session. screen -x joins a screen session. id in that prompt is the check. uid=0(root) means the session was already root. permission denied, or no sockets, is a ten-second skip.`,

  "lin-dirtypipe": `uname -r prints only the kernel release, which is the number you compare. Dirty Pipe is CVE-2022-0847, kernels 5.8 through 5.16.10. Fixed in 5.16.11, 5.15.25, and 5.10.102. A Ubuntu kernel can say 5.13 and still be patched because of the package revision after the dash.
You only reach this card when every misconfig card is dead. One public PoC, built static if you compile on Kali. One failure and you stop. 5.4, 6.x, and a long Ubuntu suffix are dead.`,

  "lin-finished": `This is the whole local loop in one paste, so you can see that you actually ran it. sudo -l and sudo --version are the sudo rules and the Baron version. doas -l is the rare alternative. The semicolons keep going if doas is missing.
find and getcap are SUID and capabilities. cat and ls -la cover cron, sudoers, passwd, and shadow. Read the permission trios, not just the names. systemctl list-timers --all is custom timers. id and the docker socket are the group and socket checks. ss and ps are listeners and command lines. The find in homes is keys and history.
Password prompt, stock SUID, empty caps, stock cron, shadow denied, no docker, and no extra homes means the list is dead. Then one version bug: Baron if sudo is still in the 1.8 window, pkexec if that version matches, or Dirty Pipe if uname -r is in range. Not all three. If those are dead too, you missed a credential or a web bug.`,

  "win-which-potato": `whoami /priv is the privilege table. The potato family needs SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege present. Disabled still counts. Absent means stop.
sc query spooler shows RUNNING or STOPPED. systeminfo | findstr /B prints OS name, version, and x64 versus x86 from the start of the line.
PrintSpoofer64.exe is the x64 build, first choice when the spooler is RUNNING. -i -c starts cmd. GodPotato-NET4.exe is the choice on Server 2019, Server 2022, and Windows 10 1809 or later, and when the spooler is stopped. NET2 is only if .NET 4 is missing. JuicyPotato on 2019 and 2022 fails on CLSIDs. That tool is dead there. dir showing 441 bytes means the exe is HTML. Two real failures and you stop.`,

  "win-unattend": `dir /s /b searches each path recursively and prints only names. You pass the known Panther and Sysprep locations instead of crawling the whole disk. 2>nul drops file-not-found.
type prints the XML. You want a Password or Value element that is not the *SENSITIVE*DATA* placeholder. Then evil-winrm or runas. You are not SYSTEM yet. A full-disk findstr waits until nothing else is alive.`,

  "win-autologon": `reg query reads one value. /v is the value name. You read DefaultUserName, DefaultPassword, and AutoAdminLogon from the Winlogon key. Quote the key because it contains spaces.
DefaultPassword with a real string, for a user who is an administrator, is the cred. A missing value, or AutoAdminLogon 0 and no password, is dead. Do not keep querying the same key.`,

  "win-savecred": `cmdkey /list prints saved credentials. Currently stored credentials: none is dead.
runas /savecred /user:ADMINUSER cmd starts cmd as that user and tells runas to use the stored secret instead of asking. The new window's whoami is the check. Invalid credential means the cache is stale. Then you run the Windows order as that user, because their privileges are not yours.`,

  "win-dir-write": `sc qc shows the binary path so you know the folder. icacls on the folder and icacls on the exe are different questions. (M) or (F) on the folder, with the exe itself read-only, is this card. dir *.dll lists libraries already next to the service. You replace one of those only when the service already loads it.
The bak copy keeps the original. del removes the exe you could not overwrite in place. copy puts your shell in its place. sc stop and sc start run it. whoami printing nt authority\\system is the success. (RX) on the folder ends the card.`,

  "win-sedebug": `whoami /priv | findstr /i debug prints the SeDebugPrivilege line if it exists. Enabled means you may open processes you do not own, including LSASS. Disabled or absent is a skip.
The comments say to prefer reg save and secretsdump when you can, and to treat SeDebug as the case where registry access is denied but a process dump still works. The tool must be x64 on an x64 OS. 0x00000005 from a 32-bit binary is the architecture card. Pass the hash you obtain. Do not crack a domain admin hash you can already use.`,

  "win-takeown": `findstr /i "Restore TakeOwnership" keeps either privilege. Both missing, or both Disabled, ends the card.
takeown /f makes you the owner of that file. /f is the file. icacls /grant %USERNAME%:F then gives your user full control. %USERNAME% expands to the current account. F is full.
One failure with access denied means the privilege is not actually usable. If it works, copy SAM and SYSTEM and run secretsdump on Kali. Do not walk the disk taking ownership of everything.`,

  "win-backup-ops": `whoami /groups | findstr /i "Backup Operators" shows the group even if you skimmed past it in /all. whoami /priv | findstr /i backup shows whether SeBackupPrivilege is Enabled.
The group without the privilege enabled is not a win. Do not invent a diskshadow script. Use the SeBackupPrivilege card once, copy SAM and SYSTEM, and stop.`,

  "win-apps": `dir /s /b searches every user profile for FileZilla's sitemanager.xml and the recentservers file. 2>nul hides the misses.
reg query /s dumps a registry key and its subkeys. The PuTTY and WinSCP paths are per-user session lists. A session with no password stored is only a hostname.
The TightVNC query reads one value, Password, with /v. A host plus a password goes to SSH, SMB, or WinRM. One pass. Missing keys are dead.`,

  "win-iis": `type prints web.config and applicationHost.config. Those are the usual places IIS stores a connection string.
findstr /s /i /m searches recursively, ignores case, and prints only the filename. The pattern looks for connectionString or password under inetpub. 2>nul hides access denied.
User ID and Password in a connection string are the cred. Integrated Security=true means Windows auth, so no SQL password is stored. Access denied on inetpub ends it. MSSQL as sa is the MSSQL card. A Windows password is evil-winrm.`,

  "win-task-run": `schtasks /query /fo LIST /v | findstr filters the verbose task list down to name, action, and run-as user. icacls on the exe shows whether you can replace it. schtasks /run /tn starts it now. /tn is the task name, including the folder \\Vendor\\job.
SYSTEM plus a replaceable exe plus a successful /run is the callback. Access denied on /run, and a next run time that is not soon, means the replaced file just sits there. Start Penelope before you replace anything.`,

  "win-peas-read": `winPEASx64.exe cmd runs the 64-bit build and tells it to print plain text instead of colour codes, which is what you want in a basic shell. cmd here is winPEAS's output mode, not a new command prompt.
You then re-run whoami /priv, icacls, or sc qc on the one line that mattered. Red kernel suggestions on Server 2022, or a service it calls modifiable that icacls shows as (RX), are dead. Do not run it three times.`,

  "win-finished": `whoami /all is the identity, groups, and privileges in one shot. sc query spooler is the PrintSpoofer precondition. wmic service get dumps name, path, account, and start mode so you can see unquoted paths and LocalSystem together.
cmdkey /list is saved creds. The two reg query lines are the two AlwaysInstallElevated hives. Both must be 0x1. dir of the known unattend paths is the answer-file check. type of the PSReadLine file is history.
If all of that is empty or denied, one kernel look is allowed only when systeminfo shows an old build and almost no hotfixes. Server 2022 with a long hotfix list is not a kernel box. NT AUTHORITY\\SERVICE is not a reason to skip the list. It is a reason to read the privilege table.`,

  "script-ld-path": `python3 runs the helper with Python 3. The filename is the script. You run it only after sudo -l has shown env_keep for LD_LIBRARY_PATH and a command you may run.
The script does not invent a sudo rule. It checks that the variable is kept, uses ldd to pick a real library name, compiles a shared object, and runs the allowed command with LD_LIBRARY_PATH pointed at your directory. That is "look in my directory first", not "edit /usr/lib".
If sudo asks for a password, gcc is missing, or ldd says the binary is static, the script cannot help. Read the LD_LIBRARY_PATH card before you trust the output.`,

  "script-ld-preload": `python3 ld_preload_check.py is the LD_PRELOAD version of the same helper. You run it when sudo -l keeps LD_PRELOAD or allows SETENV, and a command is listed.
It compiles one extra library and sets LD_PRELOAD to that file for the allowed sudo command. It does not rename itself to a system library. That is the difference from the LD_LIBRARY_PATH helper, which must match a name ldd printed.
No env_keep and no SETENV means sudo will strip the variable. A SUID binary you run without sudo also ignores LD_PRELOAD. The script cannot change that.`,

  "script-cred-shell": `python3 cred_shell_helper.py asks you for an IP and one username and password you already have, then checks a short list of ports and prints the matching shell command.
You run those printed commands yourself. It does not spray, and it does not try a wordlist. If you have no password yet, do not run it. Lockout is still your problem if you start looping passwords by hand.`,

  "script-win-cred": `oscp_cred_enum.bat is a batch file. From a Windows shell you run it by name, usually after copying it to C:\\Users\\Public. cmd executes each line in the file.
It searches common password stores: history, unattend files, cmdkey, web configs. It writes the results to %TEMP%\\oscp_cred_enum.txt. %TEMP% is the temp directory. It does not dump LSASS.
An empty log means those files are not there. It does not mean there is no privilege escalation. Services and whoami /priv are the next cards. If you are already admin and need hashes, that is the SAM card, not this script.`,

  "script-linux-quick": `python3 linux_quick_check.py runs a read-only classifier on the Linux host you just landed on. It does not exploit anything.
sudo inside it is called as sudo -n -l. -n means non-interactive, so a password prompt cannot hang the script. If a password is required, sudo fails immediately and the script marks that check dead.
It prints [ALIVE], [DEAD], [LOOK], or [LATER]. ALIVE is a misconfiguration you open the matching card for. LOOK on a sudo version or on Dirty Pipe only matters when the misconfig lines were dead. LATER means do the ALIVE line first. A page of DEAD is not a reason to start a kernel search.`,

  "script-file-sanity": `python3 file_sanity.py takes filenames as arguments and classifies each one before you upload it. You pass the exe or elf you just downloaded.
It flags HTML, JSON, and tiny files that start with < or { as dead downloads. A real PE is described as PE32 (32-bit) or PE32+ (64-bit). A two-byte file that happens to start with MZ is not a PE. An ELF line tells you dynamic versus static, and warns about GLIBC_2.34, which means rebuild with gcc -static or fetch the release binary.
Run it on Kali. A 441-byte GodPotato is the GitHub HTML page. The exploit is not broken.`,

  "script-ssh-key": `python3 ssh_key_check.py reads one key file. A public key, the kind that starts with ssh-rsa or ssh-ed25519 and a long base64 blob, is dead. You cannot log in with only the public half.
A private key is only a lead. The header does not tell you whether a passphrase is set. The script runs ssh-keygen -y -P '' -f key, which asks ssh-keygen to print the public key using an empty passphrase. -P '' is that empty passphrase. -f is the file. -y writes the public key.
Exit success and a line starting with ssh- means the key has no passphrase, so ssh -i will not prompt. A passphrase error means it is protected. The script then prints the ssh2john and john commands. Protected is still alive. You cannot read the password out of the key text. If john finishes rockyou with nothing, that key is not today's path.`,

  "lin-so": `strace prints every system call the program makes. -f follows child processes. 2>&1 joins stderr into stdout so the errors are not lost. grep -iE keeps lines matching that pattern, case-insensitive. openat and open( are the calls that read a file. ENOENT and "no such file" mean the path is not there.
ls -la on that directory tells you if you can write it. -l is the long listing, -a includes dotfiles. gcc -shared -fPIC builds a shared library. -o is the output name, and the name must be the missing file, not a name you invented. You then run the SUID binary with no sudo and no LD_ variable. The kernel runs it as the file owner because of the setuid bit. LD_PRELOAD would be ignored here.`,

  "win-runonce": `reg query reads a registry key and prints its values. RunOnce is the key Windows runs a single time at the next logon. WOW6432Node is the 32-bit registry view on a 64-bit machine. A 32-bit program's Run entry can live there and not in the normal Run key.
icacls prints the ACL on the exe named in the value. You need a write or modify right on that file. HKLM means the machine, so a privileged logon can run it. HKCU means only the current user, which does not raise you.`,

  "win-regkey": `reg query /v ImagePath prints the command the service is configured to start. That value lives in the service's registry key, which is not the same permission as sc config. accesschk.exe checks access. /accepteula skips the licence prompt. -k means the target is a registry key. -v is verbose. -q hides the banner. -s recurses. -w shows write access. -u hides errors.
reg add writes ImagePath. /t REG_EXPAND_SZ is the type Windows uses for this value. /d is the new command. /f overwrites without asking. sc stop and sc start then run whatever ImagePath says. The & runs the start even if the stop complains the service was already stopped. whoami printing nt authority\\system is the success. If you cannot start the service, put the original ImagePath back.`,

  "svc-odd": `nc -nv connects to one port. -n skips DNS. -v is verbose, so you see the banner. nmap -Pn -sV -p probes that single port for a version without pinging first. searchsploit looks up the product name and version in Exploit-DB.
The port list is a comment. Those Joplin pages were names without steps. A default login is one pair from the Defaults card, typed once. rlogin and rexec are old remote logins. They only matter if you already have a user. X11 is a graphical display. No client and no auth bypass means you leave it.`,

  "pw-defaults": `Every line is a comment. This is a lookup sheet, not a command you paste into hydra. You type one pair into the product you have already identified. anonymous with an empty password is the FTP check. public and private are SNMP community strings, not usernames.
spraygen builds a small wordlist from a company name, a season, and a year. You still try one pattern at a time against users you enumerated. Pointing it at a domain with a generated book is a spray, and lockout is still your problem.`,

  "ad-dnsadmins": `whoami /groups lists groups. findstr /i DNSAdmins keeps that line if it is there. dnscmd /config /serverlevelplugindll sets the DLL the DNS service will load. The path is a UNC share, \\\\host\\share\\file, because the DC has to read it from your machine. <dc> and <KALI> are placeholders.
sc \\\\host stop dns and sc \\\\host start dns restart the service on that DC. The DLL then runs as the DNS service account, which is SYSTEM. Clearing the setting afterwards puts DNS back. Do not build the DLL unless the group line was there.`,

  "ad-powerview": `powershell -ep bypass starts PowerShell and skips the execution policy for that process. -c runs the quoted command. Import-Module loads PowerView.ps1 from the current directory. .\\ is that directory. Get-DomainUser lists users. Select-Object keeps two columns so the list is readable. description is where lab passwords hide.
Get-DomainGroupMember -Recurse lists who is in a group, including nested groups. Get-DomainComputer lists machines. Get-DomainObjectAcl -ResolveGUIDs turns the permission GUIDs into names such as GenericWrite. Invoke-Kerberoast requests TGS hashes for accounts with SPNs. Get-NetLocalGroup shows local groups on one computer, which is how you see who is admin there.
If Import-Module fails, you do not have the script. The Kali cards (nxc, BloodHound, GetUserSPNs) are the same job.`,

  "ad-shadowcred": `certipy shadow auto does the whole shadow-credential chain: it writes a key you control into msDS-KeyCredentialLink, authenticates as the target, and prints the NT hash. -u is you, -p is your password, -account is the target. Whisker.exe add is the Windows version of the write. /target is the account. /domain is the domain.
GenericWrite is the right that makes this possible. The attribute is the specific field. A 2016 or newer domain controller is the requirement from the original note. Access denied means the edge was wrong. The hash is then a normal pass-the-hash, not a new trick.`,

  "ad-persist": `impacket-ticketer forges a Kerberos ticket. -nthash is the NT hash of the account that owns the service, usually the machine account. -domain-sid is the domain SID. -spn cifs/host asks for a ticket for file access on that host. -k -no-pass on psexec uses the ticket in KRB5CCNAME and does not ask for a password. export sets that variable for the next command.
The other lines are comments. Golden uses the krbtgt hash and forges a TGT for anyone. Diamond starts from a real TGT and is easier to break. DSRM is the DC's local Administrator. Skeleton key and DCShadow both require domain admin already, and both can disturb the DC. None of them is how you get the first credential.`,

  "lin-baron": `sudo --version prints the sudo banner. You read the version line, not uname. ls -l on the sudo binary shows the permissions. command -v sudo prints the path, and the quotes keep a space in that path from splitting the command. An s in the owner's execute position means the file is setuid, so the kernel runs it as root.
There are two vulnerable windows. 1.8.2 through 1.8.31p1, fixed by 1.8.31p2. And 1.9.0 through 1.9.5p1, fixed by 1.9.5p2. A 1.9 version is not automatically safe. A distro can also patch an old number, which is why the next card's sudoedit test decides, not the number alone. You do not need a sudoers entry. A password prompt on sudo -l only means sudoers will not help you.`,

  "lin-baron-test": `sudoedit is the sudo editor. -s means "set a shell", and the following argument is what used to overflow a heap buffer when it ended in a backslash. The first command uses / as that argument.
Vulnerable sudo says / is not a regular file. Patched sudo prints a usage: line and does not crash. The second command feeds a thousand A's after a backslash. python3 -c runs one line of Python. print writes the A's. $(...) puts that output into the command. Vulnerable sudo then aborts with malloc(): corrupted top size or a segmentation fault. perl -e is the same test when python3 is missing. x 1000 repeats the letter.
If it asks for a password, the command was sudo -s, which is a shell, not sudoedit -s. A usage line with no abort means the box is patched even if the version looked old. You do not download a PoC.`,

  "lin-baron-run": `python3 -m http.server 80 serves the folder you are in. curl -o saves the PoC onto the target as baron.py. python3 baron.py runs it. id afterwards must show uid=0.
A C PoC is gcc baron.c -o baron, then ./baron. You compile on the target so the binary matches that box's libraries. Compiling on Kali and copying the file is how you get GLIBC_2.34 not found. The PoC's own target list must match cat /etc/os-release. One target, then a second only if the first says it failed. Two failures and you stop. cat /root/proof.txt is the flag, and you screenshot it before you keep enumerating.`,

  "lin-baron-fail": `file tells you whether the thing you are about to run is an ELF, a script, or an HTML page. gcc -static links the libraries into the binary so an older box does not need Kali's glibc. The second file command should say statically linked.
invalid preprocessing directive #Exploit means the Exploit-DB banner is still at the top. Those lines start with # and C treats # as a preprocessor command. Delete them, down to the first #include. A missing quote is a string that was wrapped onto two lines. Put it back on one line. head -n 2 shows the first two lines. <!DOCTYPE means you saved the browser page.`,

  "brief-exam": `mkdir -p creates the host folder and does not complain if it exists. The brace {scans,loot,shells} makes three folders in one command. The rest of the card is comments, so pasting it does not run a scan. The point is the rule: one card, read Alive and Dead, and leave it when Dead matches.`,

  "brief-recon": `nmap -Pn skips ping. -sC is the default scripts. -sV asks for versions. -oA writes the result into the scans folder under three names. -p- is every TCP port. --min-rate 2000 keeps that scan from taking the hour. -sU --top-ports 20 is the UDP pass. Run it on every host. A TCP scan cannot see those services, and a scan of all 65535 UDP ports is the time sink.`,

  "brief-svc": `nc -nv connects to one port and shows the banner. -n skips DNS. -v is verbose. The comments are the decision, not extra scans. A failure on credentials you already hold is Dead. A wordlist is not the next command.`,

  "brief-web": `curl -sI fetches only the headers. -s is silent, -I is HEAD. gobuster dir brute-forces paths. -w is the wordlist, common.txt not a huge one. -t 40 is forty threads. -q hides the noise. You then follow the Web cards in order and stop at the first bug that is Alive.`,

  "brief-sh": `penelope -O -p 443 listens before you send a payload. -p is the port. -O is the exam-safe switch. python3 -c runs one Python line. pty.spawn starts a real bash so job control works. Ctrl-Z suspends that session. stty raw -echo on Kali stops your terminal from processing keys, and fg brings the session back. export TERM=xterm makes full-screen programs work. You do this once, then you start Linux or Windows privesc.`,

  "brief-lin": `sudo -l lists what this user may run. A password prompt means you cannot use sudoers yet. find -perm -4000 lists setuid binaries. getcap -r lists file capabilities. crontab -l is your crontab. The ls of /etc/cron* is the system jobs. id prints your groups. Baron is not in this block. It comes after these are dead.`,

  "brief-win": `whoami /all prints the user, the groups, and the privileges. whoami /priv is the short privilege list. systeminfo is the patch level, and you do not act on it until the misconfig cards are dead. SeImpersonate is the Potato decision. Both registry keys must be 1 before AlwaysInstallElevated counts.`,

  "brief-ad": `nxc smb checks the password over SMB. The first target is the domain controller, so a typo dies on one host instead of locking the subnet. <cidr> is the range, and you run it only after the DC says [+]. --kerberoasting and --asreproast write hash files. Those files go to the identify builder before hashcat.`,

  "brief-pw": `-m is the hashcat mode, and it has to match the file the identify builder just wrote. john --format is the same idea. -H passes an NT hash instead of cracking it. Rockyou is one pass. Hydra is not in this block.`,

  "brief-pv": `ip a and ip route show interfaces. ss -tlnp shows listeners. curl -m 3 to your Kali IP gives up after three seconds. If it hangs, an agent that dials Kali will hang too, and the callback has to aim at the pivot. Ligolo is a real interface, so nmap is a normal nmap. Chisel and ssh -D are SOCKS, so nmap must be -sT.`,

  "brief-cc": `gcc compiles C. -o names the output. file prints the type. -static pulls the libraries in so the target does not need Kali's glibc. The mingw line builds a 64-bit Windows exe. file should say PE32+ for that one, and PE32 only when you meant 32-bit.`,

  "brief-rep": `id, hostname, and hostname -I in one shot is the Linux proof of who and where. hostname -I stays on one line so the flag remains in the screenshot. whoami /all is the Windows equivalent. type prints the flag file. You take that screenshot, and you paste the command into the report form, before you pivot.`,

  "svc-https": `curl -kI fetches HTTPS headers. -k accepts a certificate Kali does not trust. openssl s_client opens TLS, and the second openssl prints the subject and subjectAltName. That name is what you append to /etc/hosts. gobuster -k is the directory search with the bad certificate allowed. The exploit is a Web card, not the TLS version.`,

  "svc-netbios": `nbtscan and nmblookup -A ask UDP 137 for the computer name and the workgroup or domain. enum4linux-ng -A and nxc smb --users turn 139 into usernames when anonymous access works. A domain name means the AD section once you have a password. The names are saved. They are not sprayed.`,

  "svc-ntp": `nmap -sU -p 123 needs root. ntpq -c readvar and ntpdc -c monlist ask who has talked to this clock. Those addresses matter only inside the exam range. There is no shell here.`,

  "svc-rlogin": `nc -nv shows whether 512 or 513 answers. rlogin -l and rsh -l try one user you already have. The bug is .rhosts or hosts.equiv, usually seen because NFS let you read it. + + trusts everyone. You do not hydra these ports.`,

  "tun-which": `The block is the choice, written as comments so pasting it does not open a tunnel. -L brings one of their ports onto Kali. -D opens SOCKS on Kali, which then needs proxychains4.conf. -R and listener_add are the other direction: their host connects to the pivot, and the bytes come out on Kali. Ligolo is the one path that does not use that file, because the route makes the packets normal. curl -m 3 is the test that the target can dial Kali at all. -N on ssh means no shell. -f backgrounds it. chisel --reverse creates the listener on Kali. ligolo -selfcert avoids bringing your own certificate.`,

  "tun-ligolo-agent": `file must say ELF or PE before the upload. curl and chmod prepare the Linux agent. certutil -urlcache -split -f downloads the Windows one. -connect is your proxy. session and start are typed in the proxy window. connection refused means the proxy is down. A timeout means the target cannot see Kali.`,

  "tun-ligolo-back": `listener_add is typed after start. --addr is the port opened on the pivot. --to 127.0.0.1:443 is Penelope on Kali. The payload points at the pivot, not at your VPN address. A second listener on 11601 lets a deeper agent join the same proxy.`,

  "tun-chisel-win": `The server is the same reverse listener. R:socks opens SOCKS on Kali. R:8081 forwards one port. proxychains sends nxc through it. A 441-byte exe is the download page. A timeout is routing.`,

  "tun-ssh-r": `ssh -N -R keeps the tunnel and opens a port on the pivot that forwards to Kali. 127.0.0.1:4444:127.0.0.1:443 means the pivot's localhost 4444 lands on Penelope. Binding 0.0.0.0 needs GatewayPorts. ss on the pivot shows whether it listened. LHOST is the pivot.`,

  "tun-socat": `TCP-LISTEN,fork,reuseaddr accepts more than one connection and can be restarted. The second address is where each connection is sent. netsh interface portproxy is the Windows version and needs an admin shell. If socat is missing, use SSH or Chisel. Do not install packages on the exam host.`,

  "tun-fail": `curl -m 3 proves the target can reach Kali. ip link delete clears a stuck ligolo interface. ip route del removes a route you added before start. file catches an HTML download. -sT replaces a SYN scan that lied through SOCKS. 127.0.0.1 through SOCKS is Kali. The victim's loopback is a Chisel forward to 127.0.0.1 from the client, or Ligolo's 240.0.0.1 route.`,

  "cmd-use": `The lines are comments. This section is the shell phrasebook. The privilege-escalation lists are still the method.`,

  "cmd-lin-user": `useradd -m creates the home directory. -s /bin/bash sets the login shell. chpasswd reads user:password on stdin, so you do not get an interactive prompt. usermod -aG adds a group without removing the ones the user already has. sudo is the admin group on Debian and Ubuntu. wheel is the admin group on RHEL. id prints the result.
openssl passwd -1 makes a hash. The echo line appends a passwd entry whose third field is 0, which is root's user id. Replace HASH with the hash openssl printed. You only do this when you are already root and sudo is missing.`,

  "cmd-lin-find": `find / starts at the root. -name is case-sensitive and -iname is not. Quotes around '*.conf' stop your shell from expanding the star before find sees it. -type f is files, -type d is directories. -perm -4000 is the setuid bit. -perm -o+w means other people can write it. -writable means you can write it. -size +10M is larger than ten megabytes. 2>/dev/null drops the permission errors. head keeps the first ten lines.`,

  "cmd-lin-grep": `grep -R searches directories. -I skips binary files. -n adds the line number. -l prints the file name instead of the line. --exclude-dir skips proc and sys, which are not real files. -F treats the pattern as plain text, so a dot is a dot. head stops the flood. A hit in a manual page is not a password.`,

  "cmd-lin-xfer": `python3 -m http.server serves the current directory. curl -o and wget -O save the response under the name you give. scp copies over SSH you already have: the first form uploads, the second downloads. tar czf packs a directory into one file before you copy it. base64 turns a file into text you can paste through the shell. base64 -d turns it back. file and ls -l are how you know the copy is the real file and not an error page.`,

  "cmd-win-user": `net user /add creates a local account. net localgroup administrators /add puts it in the local Administrators group. Remote Desktop Users is only for an RDP login. The /domain switch creates a domain account, and you can only do that when you are already a domain admin. Access is denied means this shell is not an administrator.`,

  "cmd-win-find": `dir /s walks subfolders. /b prints the path and nothing else. 2>nul hides the file-not-found lines. where /r searches under the folder you name. icacls prints the ACL. (F) is full control and (M) is modify. Those are the rights that let you replace a file.`,

  "cmd-win-grep": `findstr /s walks matching files. /i ignores case. /n prints the line number. The files at the end are the pattern of names to open, so you do not scan every binary on the disk. Select-String is the PowerShell version. -First 20 stops it. License text is not a credential.`,

  "cmd-win-xfer": `certutil -urlcache -split -f downloads a URL to the path at the end. Invoke-WebRequest -OutFile is the PowerShell download. DownloadFile is the same job on older PowerShell. upload and download are evil-winrm commands, typed in that shell, not at cmd. smbclient //host/C$ is an admin share. put uploads and get downloads. The -c argument is the one command to run. certutil -encode and -decode are the base64 path when the host cannot route to Kali. A file of a few hundred bytes that starts with html is a failed download.`,
};
