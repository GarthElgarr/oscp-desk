#!/usr/bin/env python3
"""Say whether a file is a real program before you upload it.

    python3 file_sanity.py GodPotato.exe shell.elf linpeas.sh

DEAD if it is HTML, a GitHub page, or a few hundred bytes.
ALIVE if it is a PE or an ELF of a sensible size.
A Kali-built dynamic ELF often dies on the target with GLIBC_2.34.
"""

from __future__ import annotations

import os
import struct
import sys


def head(path: str, n: int = 256) -> bytes:
    with open(path, "rb") as handle:
        return handle.read(n)


def pe_arch(blob: bytes) -> str:
    if len(blob) < 64 or blob[:2] != b"MZ":
        return "not a PE"
    pe_off = struct.unpack_from("<I", blob, 0x3C)[0]
    if pe_off + 6 > len(blob):
        return "PE header truncated"
    if blob[pe_off:pe_off + 4] != b"PE\x00\x00":
        return "MZ but not a PE"
    machine = struct.unpack_from("<H", blob, pe_off + 4)[0]
    names = {0x14C: "PE32 x86", 0x8664: "PE32+ x64"}
    return names.get(machine, "PE machine 0x%X" % machine)


def classify(path: str) -> None:
    if not os.path.isfile(path):
        print(f"[DEAD] {path}")
        print("    not a file\n")
        return
    size = os.path.getsize(path)
    blob = head(path, 512)
    sample = blob.lstrip().lower()
    print(f"---- {path}  ({size} bytes)")
    if size < 800 and (sample.startswith(b"<") or sample.startswith(b"{") or b"<html" in sample or b"404" in sample):
        print("[DEAD] HTML, JSON, or an error page saved under a program name.")
        print("    A real Potato or PrintSpoofer is hundreds of KB, not a few hundred bytes.\n")
        return
    if sample.startswith(b"<html") or sample.startswith(b"<!doctype") or b"<html" in sample[:200]:
        print("[DEAD] This is a web page. You downloaded the wrong URL.\n")
        return
    if blob.startswith(b"MZ"):
        kind = pe_arch(blob)
        if kind.startswith("not") or "truncated" in kind:
            print("[DEAD] starts with MZ but is not a usable PE. " + kind)
            print("    Size is " + str(size) + " bytes. A real build is much larger.\n")
            return
        state = "ALIVE" if size > 8000 else "LOOK"
        print(f"[{state}] {kind}")
        if "x86" in kind:
            print("    32-bit. Do not run this on a 64-bit-only tool (Mimikatz on Server 2022).")
        if size < 8000:
            print("    Small for a release binary. Compare with the size on the download page.")
        print()
        return
    if blob.startswith(b"\x7fELF"):
        elf_class = blob[4]
        bits = "64-bit" if elf_class == 2 else "32-bit" if elf_class == 1 else "unknown"
        static = b"ld-linux" not in blob and b"/lib" not in blob[:200]
        # interpreter lives further in; `file` is the reliable check when present
        print(f"[ALIVE] ELF {bits}, {size} bytes")
        print("    On Kali run: file " + path)
        print("    If it says dynamically linked, the target may say GLIBC_2.34 not found.")
        print("    Rebuild with gcc -static, or use a release binary built for that OS.")
        if static:
            print("    No dynamic linker string in the first 512 bytes. Confirm with ldd.")
        print()
        return
    if blob.startswith(b"#!/"):
        print("[ALIVE] script")
        print("    " + blob.splitlines()[0].decode("ascii", "replace"))
        print()
        return
    print("[LOOK] unknown type")
    print("    First bytes: " + blob[:24].hex())
    print("    Run: file " + path)
    print()


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python3 file_sanity.py <file> [file...]")
        sys.exit(1)
    for path in sys.argv[1:]:
        classify(path)


if __name__ == "__main__":
    main()
