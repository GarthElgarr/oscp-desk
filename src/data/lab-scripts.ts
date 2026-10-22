import credShell from "./lab-scripts/cred_shell_helper.py?raw";
import fileSanity from "./lab-scripts/file_sanity.py?raw";
import ldPath from "./lab-scripts/ld_library_path_check.py?raw";
import ldPreload from "./lab-scripts/ld_preload_check.py?raw";
import linuxQuick from "./lab-scripts/linux_quick_check.py?raw";
import credBat from "./lab-scripts/oscp_cred_enum.bat?raw";
import sshKey from "./lab-scripts/ssh_key_check.py?raw";

export type LabScript = {
  id: string;
  title: string;
  file: string;
  look: string;
  run: string;
  alive: string;
  dead: string;
  next: string;
  source: string;
};

export const LAB_SCRIPTS: LabScript[] = [
  {
    id: "script-ld-path",
    title: "LD_LIBRARY_PATH helper",
    file: "ld_library_path_check.py",
    look: "sudo -l keeps LD_LIBRARY_PATH and names a command you may run. gcc is on the box. This is the lab helper that builds the library and runs that command. It is not a reason to skip sudo -l.",
    run: "python3 ld_library_path_check.py",
    alive: "It picks a real library name from ldd, compiles a .so, and the allowed sudo command starts. whoami is root, or /tmp/shroot -p is a root shell after a crash.",
    dead: "sudo still asks for a password, env_keep is missing, gcc is missing, or ldd says the binary is static. Stop. The script cannot invent a sudo rule.",
    next: "Copy the file onto the machine you are working from. Read the LD_LIBRARY_PATH card before you run it.",
    source: ldPath,
  },
  {
    id: "script-ld-preload",
    title: "LD_PRELOAD helper",
    file: "ld_preload_check.py",
    look: "sudo -l keeps LD_PRELOAD, or SETENV is allowed, and a command is listed. This helper compiles one extra library and points LD_PRELOAD at it. It does not rename itself to a system library.",
    run: "python3 ld_preload_check.py",
    alive: "sudo LD_PRELOAD=/tmp/preload.so <allowed-command> starts, and you get a root shell or /tmp/shroot -p.",
    dead: "No env_keep and no SETENV. sudo strips LD_PRELOAD. Also dead if the only SUID binary you have is being run without sudo: the linker ignores LD_* then.",
    next: "Copy the file. If the constructor crashes the program, the card on LD_PRELOAD explains why. Do not rewrite the script in the exam.",
    source: ldPreload,
  },
  {
    id: "script-cred-shell",
    title: "Creds to shell helper",
    file: "cred_shell_helper.py",
    look: "You already have one username and one password. You want the single command for each open door (SSH, WinRM, SMB, RDP, MSSQL) instead of guessing the tool.",
    run: "python3 cred_shell_helper.py",
    alive: "It prints a copy-paste command next to a port that actually answered. You run that command yourself.",
    dead: "You have no password yet. Do not point this at a domain with a guessed wordlist. It is not a sprayer. Lockout is still your problem if you start looping passwords by hand.",
    next: "Run it on Kali. Paste only the lines for ports it marked open.",
    source: credShell,
  },
  {
    id: "script-win-cred",
    title: "Windows cred enum",
    file: "oscp_cred_enum.bat",
    look: "A Windows shell, low priv or admin. You want history, unattend, saved cmdkey, web.config, and other common password files. It does not dump LSASS.",
    run: "oscp_cred_enum.bat",
    alive: "It writes %TEMP%\\oscp_cred_enum.txt and the log contains a password, a connection string, or a cmdkey target you did not already have.",
    dead: "The log is only whoami and empty finds. That means the common files are not there. Move on to services and privileges. Do not treat an empty log as 'no privilege escalation'.",
    next: "Copy the bat into C:\\Users\\Public, run it, then type the log. If admin=1 and you still need hashes, SAM is a different card.",
    source: credBat,
  },
  {
    id: "script-linux-quick",
    title: "Linux quick check",
    file: "linux_quick_check.py",
    look: "You just landed on Linux and you want the list classified for you. Read only. It does not exploit anything. sudo is called with -n so a password prompt cannot hang the script.",
    run: "python3 linux_quick_check.py",
    alive: "[ALIVE] next to NOPASSWD, an odd SUID, a capability, a writable shadow, a real cron script, docker.sock, or a localhost port.",
    dead: "A page of [DEAD]. [LOOK] on sudo 1.8.x or Dirty Pipe only matters when the misconfig lines were dead. [LATER] means do the ALIVE line first.",
    next: "Copy it to the target. Run it once. Open the card named in the ALIVE line. Do not start a kernel search because the script printed DEAD.",
    source: linuxQuick,
  },
  {
    id: "script-file-sanity",
    title: "File sanity before upload",
    file: "file_sanity.py",
    look: "You are about to transfer an exe or elf. This tells you if the file is HTML, 32-bit, or a dynamic Kali binary that will die with GLIBC_2.34.",
    run: "python3 file_sanity.py GodPotato.exe shell.elf",
    alive: "PE32+ x64 or ELF, and the size is in the same range as the release. Not 441 bytes.",
    dead: "HTML, JSON, or a few hundred bytes. Or PE32 x86 when the box is x64 and the tool must match. That is a bad download, not a broken exploit.",
    next: "Run it on Kali before certutil or wget. If it says dynamic ELF, rebuild with gcc -static or fetch the release binary.",
    source: fileSanity,
  },
  {
    id: "script-ssh-key",
    title: "SSH key passphrase check",
    file: "ssh_key_check.py",
    look: "You found a private key. The header looks the same whether or not it has a passphrase. This tries an empty passphrase and tells you the next command.",
    run: "python3 ssh_key_check.py id_rsa",
    alive: "Empty passphrase: ssh -i works with no prompt. Protected: it prints the ssh2john and john lines. Protected is still alive. You just cannot read the password off the file.",
    dead: "The file is a public key (ssh-rsa AAAA...) or it is not a key at all.",
    next: "Run it on Kali against the file you downloaded. If john exhausts rockyou, the key is not your path today.",
    source: sshKey,
  },
];
