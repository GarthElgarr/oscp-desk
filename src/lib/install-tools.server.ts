import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createTerminalFeed, openJob } from "./live-jobs.server";
import { INSTALL_PACKAGES, INSTALL_TOOL_LABELS, TOOL_CHECKS, manualInstallCommand, type InstallSummary } from "./install-tools";

const MAX_OUT = 500_000;
const TIMEOUT_MS = 20 * 60 * 1000;

type Step = { bin: string; args: string[] };
type Handle = NonNullable<ReturnType<typeof openJob>>;

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
  for (const pkg of INSTALL_PACKAGES) list.push(apt(["apt-get", "install", "-y", pkg]));
  list.push(apt(["gzip", "-dkf", "/usr/share/wordlists/rockyou.txt.gz"]));
  return list;
}

export function startInstall(id: string): boolean {
  const handle = openJob({
    id,
    tool: "install",
    title: "Install requirements",
    command: "apt-get update && apt-get install",
    timeoutMs: TIMEOUT_MS,
    maxOut: MAX_OUT,
  });
  if (!handle) return false;
  void runInstall(handle);
  return true;
}

async function runInstall(handle: Handle) {
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
      const child = spawn(step.bin, step.args, {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, DEBIAN_FRONTEND: "noninteractive", NEEDRESTART_MODE: "a", APT_LISTCHANGES_FRONTEND: "none" },
      });
      handle.attach(child);
      probeTimer = quiet ? setTimeout(() => child.kill("SIGTERM"), 8_000) : undefined;
      const feed = createTerminalFeed((line) => {
        if (!quiet) handle.push(line);
      });
      const take = (buf: Buffer) => {
        const chunk = buf.toString();
        text += chunk;
        feed.write(chunk);
      };
      child.stdout?.on("data", take);
      child.stderr?.on("data", take);
      child.on("error", (err: NodeJS.ErrnoException) => {
        missing = err.code === "ENOENT";
        feed.flush();
        if (!missing && !quiet) handle.push(`${err.message}\n`);
        finish(null);
      });
      child.on("close", (code) => {
        feed.flush();
        finish(code);
      });
    });

  let reported = false;
  const report = (summary: InstallSummary) => {
    if (reported) return;
    reported = true;
    handle.push(`@@STATUS ${JSON.stringify(summary)}@@\n`);
  };
  try {
    if (!onKali()) {
      handle.push(
        "This machine is not Kali, so nothing was installed.\n" +
          "Open the desk on Kali and press Install requirements again. That click runs apt-get update, then installs " +
          INSTALL_TOOL_LABELS.join(", ") +
          ".\nIf sudo wants a password, paste this instead:\n" +
          manualInstallCommand() +
          "\n",
      );
      report({ verdict: "fail", title: "This machine is not Kali, so nothing was installed.", outstanding: [] });
      return;
    }
    handle.push(`Tools: ${INSTALL_TOOL_LABELS.join(", ")}\n`);
    handle.push(`Packages: ${INSTALL_PACKAGES.join(", ")}\n`);
    handle.push(asRoot() ? "Running as root.\n\n" : "Not root. Using sudo -n, so a password prompt will not hang.\n\n");
    let blocked = false;
    for (const step of steps()) {
      if (handle.stopped() || blocked) break;
      handle.push(`$ ${step.bin} ${step.args.join(" ")}\n`);
      const result = await run(step);
      if (result.missing) {
        const title = step.bin === "sudo" ? "sudo was not found, and this process is not root." : "apt-get was not found. Run the desk on Kali.";
        handle.push(title + "\n");
        handle.push(manualInstallCommand() + "\n");
        report({ verdict: "fail", title, outstanding: [] });
        blocked = true;
        break;
      }
      if (/password is required|a terminal is required|no tty present/i.test(result.text)) {
        blocked = true;
        handle.push("\nsudo wants a password, and this button will not type one.\nPaste this in a Kali terminal:\n" + manualInstallCommand() + "\n");
        report({ verdict: "fail", title: "sudo wants a password, so the install did not run.", outstanding: [] });
        break;
      }
      handle.push(`[exit ${result.code ?? "unknown"}]\n\n`);
    }
    if (!handle.stopped() && !blocked) {
      handle.push("Checking the tools the desk runs:\n");
      const missing: string[] = [];
      const present: string[] = [];
      for (const check of TOOL_CHECKS) {
        if (handle.stopped()) break;
        const ok = "file" in check ? existsSync(check.file) : !(await run({ bin: check.bin, args: ["--version"] }, true)).missing;
        handle.push(`${check.label}: ${ok ? "present" : "missing"}\n`);
        (ok ? present : missing).push(check.label);
      }
      if (!handle.stopped() && missing.length === 0) report({ verdict: "pass", title: "All requirements are satisfied.", outstanding: [] });
      else if (!handle.stopped() && present.length === 0) report({ verdict: "fail", title: "None of the requirements are installed.", outstanding: missing });
      else if (!handle.stopped()) report({ verdict: "partial", title: "Some requirements are missing.", outstanding: missing });
    }
  } catch (err) {
    const title = err instanceof Error ? err.message : "The install failed.";
    handle.push(title + "\n");
    report({ verdict: "fail", title, outstanding: [] });
  } finally {
    if (handle.stopped()) handle.push("[stopped]\n");
    if (!reported) {
      report({
        verdict: "fail",
        title: handle.stopped() ? "Stopped before the checks finished." : "The install ended without a result.",
        outstanding: [],
      });
    }
    handle.finish("");
  }
}
