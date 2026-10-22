import type { Technique } from "./methodology";

export const SERVICES_MORE: Technique[] = [
  {
    id: "svc-udp",
    section: "Services",
    title: "UDP",
    look: "This is the same UDP pass as the order of work, read from the service side. open|filtered on every port means the probe got no answer, not that the port is open. Confirm the few that answer, then leave the rest.",
    cmd: `# Required pass. Top 20, as root. Do this on every host, not only when TCP is empty.
sudo nmap -Pn -sU --top-ports 20 -T4 -oA scans/udp <ip>
# Then versions only on ports that said open, or on 161 if it said open|filtered.
sudo nmap -Pn -sU -sV -p 53,69,123,161,162,500,514,623,1900,5060,5353 <ip>
# 53 DNS. 69 TFTP, a file with no login. 123 NTP, a clock, not a shell.
# 161 SNMP, one community string. 500 IKE, a VPN transform. 623 IPMI, one default password.
# 5060 SIP, an extension is a username. 5353 mDNS, a hostname to put in /etc/hosts.
# One card for each port that really answered. Do not scan 1-65535.`,
    alive: "A port changes from open|filtered to open, and a script or a client prints data.",
    dead: "Every line is open|filtered and the follow-up clients time out. UDP is finished.",
    next: "The card for the port that answered. SNMP, TFTP, NTP, IKE, or IPMI.",
  },
  {
    id: "svc-ike",
    section: "Services",
    title: "IKE / IPsec",
    look: "UDP 500. The first check is whether it offers a VPN and which transform it wants. A group name or a pre-shared key you already have is the only way in. This is not a web bug.",
    cmd: `# FIRST
sudo nmap -Pn -sU -p 500 -sV <ip>
sudo ike-scan -M <ip>
# TALK. The transform line is the cipher it asked for.
# A handshake that completes means the PSK was right. You already had that secret.
sudo ike-scan -M --id=vpn <ip>
# USE IT
# a group name from ike-scan goes on the user list
# a PSK you already found is the VPN password, not a reason to crack a new one`,
    alive: "ike-scan prints a handshake and a transform, or an ID that is a real group name.",
    dead: "No handshake, or the scan times out. There is no IPsec service to log into.",
    next: "Try that group name on the web login or SSH. Do not brute the PSK.",
  },
  {
    id: "svc-ipmi",
    section: "Services",
    title: "IPMI",
    look: "UDP 623. The first check is the default user. A hash or a password here is for this management card, then you try it on SSH. Do not treat it as a domain.",
    cmd: `# FIRST
sudo nmap -Pn -sU -p 623 -sV --script ipmi-version <ip>
# TALK. Anonymous cipher 0 dump. One shot.
ipmitool -I lanplus -H <ip> -U '' -P '' user list
ipmitool -I lanplus -H <ip> -U ADMIN -P ADMIN chassis status
# USE IT
# a password printed by the cipher-0 bug
# then that password on SSH, not a second IPMI session`,
    alive: "A user list, or chassis status, or a hash you can crack with john --format=rakp.",
    dead: "RAKP fails and ADMIN/ADMIN is wrong. Stop. Do not hydra UDP 623.",
    next: "The password goes to SSH. The management port is finished.",
  },
  {
    id: "svc-sip",
    section: "Services",
    title: "SIP",
    look: "5060, often UDP. The first check is the methods and the extensions the server admits. An extension is a username. You do not start by flooding INVITE.",
    cmd: `# FIRST
sudo nmap -Pn -sU -sT -p 5060 -sV --script sip-methods,sip-enum-users <ip>
# TALK. One extension list, small.
svwar -m INVITE -e 100-120 <ip>
# USE IT
# an extension number becomes a username
# a password you already have can register. A wordlist against SIP is not the exam path.`,
    alive: "The script names methods, or svwar marks an extension as live.",
    dead: "No methods and no extensions. Close 5060.",
    next: "Add the extension to the user list. Try it on the web login or SSH.",
  },
  {
    id: "svc-mdns",
    section: "Services",
    title: "mDNS",
    look: "UDP 5353. The first check is the hostname the box announces. That name goes in /etc/hosts. Do not poison it and do not answer for it.",
    cmd: `# FIRST
sudo nmap -Pn -sU -p 5353 -sV --script dns-service-discovery <ip>
# TALK
avahi-browse -art
# USE IT
# a .local name you did not have
echo '<ip> printer.local' | sudo tee -a /etc/hosts`,
    alive: "A hostname or a service type you can now open in the browser.",
    dead: "No answer. mDNS is off. Do not run a poisoner.",
    next: "The HTTP or IPP card for the name you just learned.",
  },
  {
    id: "svc-finger",
    section: "Services",
    title: "Finger",
    look: "TCP 79. The first check is who is logged in and which real names exist. Finger does not give a shell. It gives usernames.",
    cmd: `# FIRST
nc -nv <ip> 79
# TALK. A blank line lists users. A name asks about one user.
finger @<ip>
finger root@<ip>
finger user@<ip>`,
    alive: "A login name, a real name, or an idle user.",
    dead: "Connection refused, or the daemon prints nobody. One try was enough.",
    next: "Those names go on the username list for SSH and the web login.",
  },
  {
    id: "svc-x11",
    section: "Services",
    title: "X11",
    look: "TCP 6000. The first check is whether the server accepts a remote display. If it does, you can read the screen or send a key. If access control is on, you are done.",
    cmd: `# FIRST
nmap -Pn -p 6000 --script x11-access <ip>
# TALK, only if the script says access is granted
xdpyinfo -display <ip>:0
xwininfo -root -tree -display <ip>:0
xwd -root -display <ip>:0 -out loot/screen.xwd
# USE IT
# a window title that is a password prompt, or a keystroke you send once
# xdotool only after xdpyinfo worked`,
    alive: "xdpyinfo prints the screen, or xwd writes a file you can open.",
    dead: "Authorization required, or the script says access denied. Stop.",
    next: "Read the screenshot. A password typed on that desktop is a credential, not a reason to keep the display open.",
  },
  {
    id: "svc-cups",
    section: "Services",
    title: "CUPS / IPP",
    look: "TCP 631. The first check is the printer web page and whether jobs or the config are readable without a login. A page that asks for a password is a web login, not a print exploit.",
    cmd: `# FIRST
curl -sI http://<ip>:631/
curl -s http://<ip>:631/printers/ | head
# TALK
curl -s http://<ip>:631/admin/ | head
# USE IT
# a printer name, a job file, or an admin page that did not ask for a password`,
    alive: "The printers page lists a queue, or admin loads without a 401.",
    dead: "401, or a connection refused. It is a normal web login if you already have a password.",
    next: "Unauthenticated admin is the bug. Otherwise treat 631 like HTTP.",
  },
  {
    id: "svc-squid",
    section: "Services",
    title: "Squid / proxy",
    look: "TCP 3128, sometimes 8080. The first check is whether it proxies for you. An open proxy can reach a port that is only internal. It is not a shell by itself.",
    cmd: `# FIRST
curl -sI -x http://<ip>:3128 http://127.0.0.1/
nmap -Pn -p 3128 --script http-open-proxy <ip>
# TALK. Ask it for the site you cannot reach directly.
curl -sI -x http://<ip>:3128 http://10.10.10.10/
# USE IT
# a page that was closed from Kali and open through the proxy
# that host is now a target. Note it. Do not spider the internet.`,
    alive: "A reply that is the internal site, not an error from the proxy.",
    dead: "407 auth required, or the proxy refuses the CONNECT. Stop.",
    next: "The internal page goes through the Web section. One parameter, then stop.",
  },
  {
    id: "svc-mongo",
    section: "Services",
    title: "MongoDB",
    look: "TCP 27017. The first check is whether it asks for a password. No login means list the databases and read. Do not start by guessing users.",
    cmd: `# FIRST
nmap -Pn -p 27017 -sV --script mongodb-info,mongodb-databases <ip>
# TALK
mongosh --host <ip> --eval 'db.adminCommand({listDatabases:1})'
mongosh --host <ip> --eval 'db.getSiblingDB("admin").getUsers()'
# USE IT
# a document that holds a password, a connection string, or a flag
# show collections, then find().limit(20). Do not dump every database.`,
    alive: "listDatabases prints names, and a collection has a password or a connection string.",
    dead: "Authentication failed, or the port is filtered. One default is enough. Do not hydra it.",
    next: "The connection string's user and password go to SSH or the web app.",
  },
  {
    id: "svc-elastic",
    section: "Services",
    title: "Elasticsearch",
    look: "TCP 9200. The first check is / without a password. Indices are the data. A query is a read, not a remote code bug, unless the version card you already matched says so.",
    cmd: `# FIRST
curl -s http://<ip>:9200/
curl -s http://<ip>:9200/_cat/indices?v
# TALK. One index that is not a system name.
curl -s 'http://<ip>:9200/<index>/_search?size=20&q=password'
# USE IT
# a hit with a password, a path, or a user`,
    alive: "The root URL names a version, and _cat/indices lists something you can search.",
    dead: "401, or the only indices are empty system indices. Leave it.",
    next: "Search one index. Then try that secret on SSH. Do not read every index.",
  },
  {
    id: "svc-docker",
    section: "Services",
    title: "Docker API",
    look: "TCP 2375 is plaintext. 2376 is TLS. The first check is /version with no client certificate. An open API is root on that host if you can create a container.",
    cmd: `# FIRST
curl -s http://<ip>:2375/version
curl -s http://<ip>:2375/containers/json
# TALK. List images, then one container whose command is the host shell.
curl -s http://<ip>:2375/images/json
# a container that bind-mounts / is the win. Confirm with docker if the CLI is easier.
docker -H tcp://<ip>:2375 ps
# USE IT
# id inside that container is root, and the mount shows the host filesystem`,
    alive: "/version returns JSON, and you can list containers.",
    dead: "Connection refused, or a TLS handshake on 2375. 2376 without a cert is the same dead end.",
    next: "One container, mount /, read the flag or the shadow. Then stop creating containers.",
  },
  {
    id: "svc-ajp",
    section: "Services",
    title: "AJP",
    look: "TCP 8009. This is Tomcat's backend, not a website. The first check is whether the AJP port answers methods. A file read is the bug people mean. Confirm the version before you send anything else.",
    cmd: `# FIRST
nmap -Pn -p 8009 -sV --script ajp-methods,ajp-headers <ip>
curl -sI http://<ip>:8080/
# TALK
# the web port next to it is 8080 or 8000. Read that page first.
# USE IT
# ajp-methods listed methods, and the HTTP port is a Tomcat you can log into
# or a version the Tomcat card already told you how to read a file from
# do not fire a proof of concept until the version line matches`,
    alive: "ajp-methods prints GET or POST, and the nearby HTTP port is Tomcat.",
    dead: "Filtered, or the HTTP port is a different product. AJP is not your way in.",
    next: "The HTTP card for that Tomcat. Manager, then a file read only if the version matches.",
  },
  {
    id: "svc-rmi",
    section: "Services",
    title: "Java RMI",
    look: "TCP 1099, sometimes a high port named in the registry. The first check is the list of bound names. A name is not a shell. You only continue if you recognise the class.",
    cmd: `# FIRST
nmap -Pn -p 1099 -sV --script rmi-dumpregistry <ip>
# TALK
# the script prints bound names and the endpoint port
# USE IT
# a known class you already have a matching exploit for
# an unknown class is a dead end. Do not guess gadgets.`,
    alive: "rmi-dumpregistry lists a bound name and a second port.",
    dead: "The registry is empty, or the only name is not one you can use. Stop.",
    next: "Search that class name. One proof of concept, or leave it.",
  },
  {
    id: "svc-svn",
    section: "Services",
    title: "Subversion",
    look: "TCP 3690, or HTTP with a /.svn directory. The first check is whether the repository lists without a password. Source is the win. A commit is not.",
    cmd: `# FIRST
svn ls svn://<ip>/
nmap -Pn -p 3690 -sV <ip>
# web copy, only if gobuster already showed it
curl -s http://<ip>/.svn/entries | head
# TALK
svn checkout svn://<ip>/ loot/svn --depth files
# USE IT
# a password, a key, or a config in the tree. Read those files. Do not commit.`,
    alive: "svn ls prints directories, or entries names real files.",
    dead: "Authorization failed, or there is no /.svn. One attempt.",
    next: "grep the checkout for password and key. Then the service is done.",
  },
  {
    id: "svc-memcache",
    section: "Services",
    title: "Memcached",
    look: "TCP 11211, sometimes UDP. The first check is stats with no login. Keys can hold a session or a password. Do not flush the cache.",
    cmd: `# FIRST
echo stats | nc -nv <ip> 11211
nmap -Pn -p 11211 --script memcached-info <ip>
# TALK. List slabs, then a few keys. Never flush_all.
echo 'stats items' | nc -nv <ip> 11211
echo 'stats cachedump 1 20' | nc -nv <ip> 11211
# get <key>
# USE IT
# a session, a password, or a connection string in a value`,
    alive: "STAT lines come back, and a key's value is a secret.",
    dead: "Connection refused, or the stats are empty of keys. Leave it.",
    next: "Use the secret once. Do not delete keys.",
  },
  {
    id: "svc-afp",
    section: "Services",
    title: "AFP",
    look: "TCP 548. Apple file sharing. The first check is a guest login and the list of volumes. A volume you can read is the same job as an SMB share.",
    cmd: `# FIRST
nmap -Pn -p 548 -sV --script afp-showmount,afp-serverinfo <ip>
# TALK
# guest, then one volume the script named
mkdir -p /tmp/afp && mount_afp afp://guest:@<ip>/share /tmp/afp
# Kali often has afp-client via nmap only. If mount_afp is missing, the script output is the check.
# USE IT
# a file on the volume: a key, a password, or a site backup`,
    alive: "afp-showmount lists a volume, or guest mounts it.",
    dead: "No volumes, or login fails and you have no password. Stop.",
    next: "Read the volume the way you read an SMB share. One interesting file, then unmount.",
  },
];
