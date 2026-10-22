#!/usr/bin/env python3
"""You cannot see a passphrase by reading an OpenSSH private key.

    python3 ssh_key_check.py id_rsa [id_rsa2 ...]

Empty passphrase: ssh-keygen -y -P '' succeeds. Use the key as-is.
Protected: the same command fails. Run ssh2john, then john. Do not guess.
"""

from __future__ import annotations

import shutil
import subprocess
import sys

PRIVATE_MARKERS = (
    "BEGIN OPENSSH PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
    "BEGIN EC PRIVATE KEY",
    "BEGIN DSA PRIVATE KEY",
    "BEGIN PRIVATE KEY",
    "BEGIN ENCRYPTED PRIVATE KEY",
)


def classify(path: str) -> None:
    print(f"---- {path}")
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            first = handle.readline().strip()
            rest = handle.read(400)
    except OSError as exc:
        print(f"[DEAD] cannot read: {exc}\n")
        return
    if first.startswith("ssh-") or first.startswith("ecdsa-sha"):
        print("[DEAD] this is a public key. It will not log you in.")
        print("    You need the matching private key.\n")
        return
    if not any(mark in first or mark in rest for mark in PRIVATE_MARKERS):
        print("[DEAD] not a private key header.")
        print("    " + first[:80])
        print()
        return
    print("[LOOK] private key. The header does not say if a passphrase is set.")
    keygen = shutil.which("ssh-keygen")
    if not keygen:
        print("    ssh-keygen is missing. On Kali: ssh-keygen -y -P '' -f " + path)
        print("    If that asks or fails, it is protected: ssh2john " + path + " > key.hash")
        print()
        return
    proc = subprocess.run(
        [keygen, "-y", "-P", "", "-f", path],
        capture_output=True, text=True, timeout=10,
    )
    err = (proc.stderr or "") + (proc.stdout or "")
    if proc.returncode == 0 and proc.stdout.strip().startswith("ssh-"):
        print("[ALIVE] empty passphrase. ssh -i this key. It will not ask.")
        print()
        return
    if "incorrect passphrase" in err.lower() or "passphrase" in err.lower() or proc.returncode != 0:
        print("[ALIVE] passphrase protected. Reading the file will not show it.")
        print("    ssh2john " + path + " > key.hash")
        print("    john --wordlist=/usr/share/wordlists/rockyou.txt key.hash")
        print("    john --show key.hash")
        print("    Then: ssh -i " + path + " user@target")
        print()
        return
    print("[LOOK] ssh-keygen returned something unexpected.")
    print("    " + err.strip()[:300])
    print()


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python3 ssh_key_check.py <private-key> [more keys]")
        sys.exit(1)
    for path in sys.argv[1:]:
        classify(path)


if __name__ == "__main__":
    main()
