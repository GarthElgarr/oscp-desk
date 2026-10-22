#!/usr/bin/env python3
"""Read-only Linux check. Prints ALIVE or DEAD. Does not exploit anything.

    python3 linux_quick_check.py

Copy it to the target and run it as the user you landed as.
A password prompt is avoided: sudo is called with -n.
"""

from __future__ import annotations

import os
import re
import subprocess

STANDARD_SUID = {
    "passwd", "chsh", "chfn", "newgrp", "gpasswd", "sudo", "su", "mount",
    "umount", "fusermount", "fusermount3", "ping", "ping6", "ntfs-3g",
    "snap-confine", "ssh-keysign", "crontab", "wall", "write", "expiry",
    "unix_chkpwd", "pam_timestamp_check", "mount.nfs", "umount.nfs",
    "chpasswd", "pkexec", "dbus-daemon-launch-helper", "chage", "bwrap",
    "sudoedit", "pppd", "at", "locate", "ssh-agent",
}

INTERESTING_CAPS = (
    "cap_setuid", "cap_setgid", "cap_dac_override", "cap_dac_read_search",
    "cap_sys_admin", "cap_sys_ptrace", "cap_net_bind_service",
)


def run(argv: list[str], timeout: int = 15) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            argv, capture_output=True, text=True, timeout=timeout, errors="replace",
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, str(exc)
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def say(state: str, title: str, detail: str) -> None:
    print(f"[{state}] {title}")
    for line in detail.strip().splitlines()[:8]:
        print(f"    {line}")
    print()


def sudo_block() -> bool:
    code, out = run(["sudo", "-n", "-l"])
    low = out.lower()
    if "a password is required" in low or "sorry" in low:
        say("DEAD", "sudo -l", "sudo -n -l wants a password. You cannot use sudo until you know it.")
        return False
    if code != 0 and "nopasswd" not in low:
        say("DEAD", "sudo -l", out.strip() or "sudo -n -l failed")
        return False
    alive = False
    notes = []
    for line in out.splitlines():
        text = line.strip()
        if "NOPASSWD" in text or "env_keep" in text.lower() or "SETENV" in text:
            notes.append(text)
            alive = True
    if alive:
        say("ALIVE", "sudo -l", "\n".join(notes) + "\nNext: Named binary card, or the LD_* card if env_keep is listed.")
    else:
        say("DEAD", "sudo -l", "No NOPASSWD and no env_keep. Output started:\n" + "\n".join(out.splitlines()[:6]))
    return alive


def sudo_version(already_alive: bool) -> None:
    _, out = run(["sudo", "--version"])
    match = re.search(r"Sudo version\s+(\d+\.\d+\.\d+(?:p\d+)?)", out)
    if not match:
        say("DEAD", "sudo version", "Could not read sudo --version.")
        return
    ver = match.group(1)
    baron = False
    parts = re.match(r"1\.8\.(\d+)(p(\d+))?", ver)
    if parts:
        minor = int(parts.group(1))
        patch = int(parts.group(3) or 0)
        if minor < 31 or (minor == 31 and patch < 2):
            baron = minor >= 2 or ver.startswith("1.8.")
            if minor < 2:
                baron = False
    if baron and not already_alive:
        say("LOOK", "sudo version " + ver, "In the Baron Samedit window (1.8.2 through 1.8.31p1). Misconfig was dead, so this is the sudo card, not a kernel card.")
    elif baron and already_alive:
        say("LATER", "sudo version " + ver, "Baron window, but a sudo -l line is already ALIVE. Do that first.")
    else:
        say("DEAD", "sudo version " + ver, "Not the 1.8.2-1.8.31p1 window.")


def suid_and_caps() -> bool:
    hit = False
    _, out = run(["find", "/", "-perm", "-4000", "-type", "f"], timeout=40)
    odd = []
    for line in out.splitlines():
        path = line.strip()
        if not path.startswith("/"):
            continue
        name = os.path.basename(path)
        custom = name not in STANDARD_SUID or path.startswith(("/opt/", "/home/", "/usr/local/", "/var/"))
        if custom:
            odd.append(path)
    if odd:
        hit = True
        say("ALIVE", "SUID outside the stock set", "\n".join(odd[:12]) + "\nNext: Named binary card if the name is known. Else -h, strings, ltrace.")
    else:
        say("DEAD", "SUID", "Only stock setuid tools (passwd, sudo, su, mount, and the usual helpers).")
    _, caps = run(["getcap", "-r", "/"], timeout=40)
    interesting = []
    for line in caps.splitlines():
        if any(cap in line for cap in INTERESTING_CAPS) and "ping" not in line and "mtr" not in line:
            interesting.append(line.strip())
    if interesting:
        hit = True
        say("ALIVE", "capabilities", "\n".join(interesting[:8]))
    else:
        say("DEAD", "capabilities", "No cap_setuid or other interesting capability.")
    return hit


def files_and_cron() -> bool:
    hit = False
    for path in ("/etc/passwd", "/etc/shadow", "/etc/sudoers"):
        if os.path.exists(path) and os.access(path, os.W_OK):
            hit = True
            say("ALIVE", "writable " + path, "You can write it. See the writable passwd or writable sudoers card.")
        elif path == "/etc/shadow" and os.access(path, os.R_OK):
            hit = True
            say("ALIVE", "readable /etc/shadow", "Hash, not a shell. unshadow then john. Stop if rockyou exhausts.")
    if not hit:
        say("DEAD", "passwd, shadow, sudoers", "Not writable, and shadow is not readable.")
    _, cron = run(["cat", "/etc/crontab"])
    jobs = []
    for line in cron.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        if "run-parts" in line:
            continue
        if re.match(r"^[\d*][\d*,/\- ]*\s+\S+", line) or line.startswith("@"):
            jobs.append(line.strip())
    if jobs:
        hit = True
        say("ALIVE", "crontab is not only run-parts", "\n".join(jobs[:8]) + "\nNext: ls -la the script. Writable means replace it.")
    else:
        say("DEAD", "crontab", "Only stock run-parts lines, or the file was not readable.")
    return hit


def docker_and_listen() -> bool:
    hit = False
    sock = "/var/run/docker.sock"
    if os.path.exists(sock) and (os.access(sock, os.R_OK) or os.access(sock, os.W_OK)):
        hit = True
        say("ALIVE", "docker.sock", sock + " is usable by this user. Groups card: mount the host and chroot.")
    else:
        say("DEAD", "docker.sock", "Missing or not accessible.")
    _, listeners = run(["ss", "-tln"])
    local = [ln.strip() for ln in listeners.splitlines() if "127.0.0.1" in ln or "[::1]" in ln]
    if local:
        hit = True
        say("ALIVE", "localhost listeners", "\n".join(local[:8]) + "\nKali nmap never saw these. Talk to them on the box.")
    else:
        say("DEAD", "localhost listeners", "ss showed nothing bound only to localhost, or ss is missing.")
    return hit


def version_notes(busy: bool) -> None:
    _, uname = run(["uname", "-r"])
    rel = uname.strip().split()[0] if uname.strip() else "?"
    match = re.match(r"(\d+)\.(\d+)\.(\d+)", rel)
    dirty = False
    if match:
        major, minor, patch = (int(match.group(i)) for i in (1, 2, 3))
        num = (major, minor, patch)
        dirty = (5, 8, 0) <= num <= (5, 16, 10)
    if dirty and not busy:
        say("LOOK", "uname -r " + rel, "Inside the Dirty Pipe window and the misconfig checks were dead. One PoC only. A Ubuntu patch level may already be fixed.")
    else:
        say("DEAD", "uname -r " + rel, "Not a reason to open linux-exploit-suggester." if not dirty else "Dirty Pipe window, but something above is already ALIVE. Do that first.")


def main() -> None:
    print("linux_quick_check  (read only, no exploits)\n")
    if os.geteuid() == 0:
        print("[ALIVE] euid is already 0. Read proof.txt. Do not keep enumerating.")
        return
    busy = False
    busy = sudo_block() or busy
    busy = suid_and_caps() or busy
    busy = files_and_cron() or busy
    busy = docker_and_listen() or busy
    sudo_version(busy)
    version_notes(busy)
    if busy:
        print("Stop at the first ALIVE. Do not start a kernel exploit.")
    else:
        print("Misconfig list is dead. Only Baron, pkexec, or Dirty Pipe if their LOOK line printed. One of them, then stop.")


if __name__ == "__main__":
    main()
