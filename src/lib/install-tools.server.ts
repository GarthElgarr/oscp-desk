import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { INSTALL_PACKAGES, INSTALL_TOOL_LABELS, manualInstallCommand } from "./install-tools";

const PROBES = [
  "hydra",
  "hashcat",
  "john",
  "msfvenom",
  "nxc",
  "nmap",
  "smbclient",
  "socat",
  "proxychains4",
  "chisel",
  "searchsploit",
  "wfuzz",
] as const;

const MAX_OUT = 500_000;
const TIMEOUT_MS = 20 * 60 * 1000;

type Step = { bin: string; args: string[] };

function onKali(): boolean {
  try {
    const release = readFileSync("/etc/os-release", "utf8");
    return /^ID=kali$/m.test(release);
  } catch {
    return false;
  }
}

function asRoot(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

function apt(args: string[]): Step {
  if (asRoot()) return { bin: args[0], args: args.slice(1) };
  return { bin: "sudo", args: ["-n", ...args] };
}

function steps(): Step[] {
  const list: Step[] = [apt(["apt-get", "update"])];
  for (const pkg of INSTALL_PACKAGES) {
    list.push(apt(["apt-get", "install", "-y", pkg]));
  }
  list.push(apt(["gzip", "-dkf", "/usr/share/wordlists/rockyou.txt.gz"]));
  return list;
}

export function installRequirementsStream(signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = 0;
  let killed = false;
  let child: ReturnType<typeof spawn> | null = null;
  const kill = () => {
    killed = true;
    child?.kill("SIGTERM");
  };
  const timer = setTimeout(kill, TIMEOUT_MS);
  signal.addEventListener("abort", kill);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const push = (text: string) => {
        if (!text || sent >= MAX_OUT || closed) return;
        const slice = text.slice(0, MAX_OUT - sent);
        sent += slice.length;
        try {
          controller.enqueue(encoder.encode(slice));
        } catch {
          killed = true;
        }
        if (sent >= MAX_OUT) kill();
      };
      const run = (step: Step, quiet = false) =>
        new Promise<{ code: number | null; missing: boolean; text: string }>((resolve) => {
          let text = "";
          let missing = false;
          let settled = false;
          let probeTimer: ReturnType<typeof setTimeout> | undefined;
          const finish = (code: number | null) => {
            if (settled) return;
            settled = true;
            if (probeTimer) clearTimeout(probeTimer);
            resolve({ code, missing, text });
          };
          child = spawn(step.bin, step.args, {
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
            env: {
              ...process.env,
              DEBIAN_FRONTEND: "noninteractive",
              NEEDRESTART_MODE: "a",
              APT_LISTCHANGES_FRONTEND: "none",
            },
          });
          probeTimer = quiet
            ? setTimeout(() => {
                child?.kill("SIGTERM");
              }, 8_000)
            : undefined;
          const take = (buf: Buffer) => {
            const chunk = buf.toString();
            text += chunk;
            if (!quiet) push(chunk);
          };
          child.stdout?.on("data", take);
          child.stderr?.on("data", take);
          child.on("error", (err: NodeJS.ErrnoException) => {
            missing = err.code === "ENOENT";
            if (!missing && !quiet) push(`${err.message}\n`);
            finish(null);
          });
          child.on("close", (code) => finish(code));
        });

      try {
        if (!onKali()) {
          push(
            "This machine is not Kali, so nothing was installed.\n" +
              "Open the desk on Kali and press Install requirements again. That click runs apt-get update, then installs " +
              INSTALL_TOOL_LABELS.join(", ") +
              ".\nIf sudo wants a password, paste this instead:\n" +
              manualInstallCommand() +
              "\n",
          );
          return;
        }
        push(`Tools: ${INSTALL_TOOL_LABELS.join(", ")}\n`);
        push(`Packages: ${INSTALL_PACKAGES.join(", ")}\n`);
        push(asRoot() ? "Running as root.\n\n" : "Not root. Using sudo -n, so a password prompt will not hang.\n\n");
        let blocked = false;
        for (const step of steps()) {
          if (killed || blocked) break;
          push(`$ ${step.bin} ${step.args.join(" ")}\n`);
          const result = await run(step);
          child = null;
          if (result.missing) {
            push(
              step.bin === "sudo"
                ? "sudo was not found, and this process is not root.\n"
                : "apt-get was not found. Run the desk on Kali.\n",
            );
            push(manualInstallCommand() + "\n");
            break;
          }
          const needsPassword = /password is required|a terminal is required|no tty present/i.test(result.text);
          if (needsPassword) {
            blocked = true;
            push(
              "\nsudo wants a password, and this button will not type one.\nPaste this in a Kali terminal:\n" +
                manualInstallCommand() +
                "\n",
            );
            break;
          }
          push(`[exit ${result.code ?? "unknown"}]\n\n`);
        }
        if (!killed && !blocked) {
          push("Checking the tools the desk runs:\n");
          for (const bin of PROBES) {
            if (killed) break;
            const probe = await run({ bin, args: ["--version"] }, true);
            child = null;
            push(`${bin}: ${probe.missing ? "missing" : "present"}\n`);
          }
        }
      } catch (err) {
        push(err instanceof Error ? `${err.message}\n` : "The install failed.\n");
      } finally {
        if (killed) push("[stopped]\n");
        close();
      }
    },
    cancel() {
      kill();
    },
  });
}
