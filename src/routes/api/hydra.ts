import { createFileRoute } from "@tanstack/react-router";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { hydraArgsOk } from "@/lib/hydra-args";
import { jobId, spawnLiveJob } from "@/lib/live-jobs.server";

function listFile(text: unknown): string | null {
  if (typeof text !== "string" || text.length > 20_000 || text.includes("\0")) return null;
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\r/g, "").trim())
    .filter(Boolean);
  if (lines.length < 1 || lines.length > 200 || lines.some((line) => line.length > 200)) return null;
  return `${lines.join("\n")}\n`;
}

function lootFile(args: string[], kind: "users" | "passwords"): string | null {
  return args.find((arg) => new RegExp(`^loot-${kind}-[a-z0-9]+\\.txt$`).test(arg)) ?? null;
}

export const Route = createFileRoute("/api/hydra")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const args = (body as { args?: unknown }).args;
        if (!hydraArgsOk(args)) return new Response("Those arguments are not a hydra command this desk will run.\n", { status: 400 });
        const lists = (body as { lists?: { users?: unknown; passwords?: unknown } }).lists;
        const userFile = lootFile(args, "users");
        const passFile = lootFile(args, "passwords");
        if (userFile) {
          const file = listFile(lists?.users);
          if (!file) return new Response("There are no saved users to try.\n", { status: 400 });
          writeFileSync(path.join(process.cwd(), userFile), file);
        }
        if (passFile) {
          const file = listFile(lists?.passwords);
          if (!file) return new Response("There are no saved passwords to try.\n", { status: 400 });
          writeFileSync(path.join(process.cwd(), passFile), file);
        }
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const command = ["hydra", ...args].join(" ");
        const started = spawnLiveJob({
          id,
          tool: "hydra",
          title: command,
          command,
          bin: "hydra",
          args,
          timeoutMs: 180_000,
          maxOut: 200_000,
          missing: "hydra was not found on this machine. Run the desk on Kali, where hydra is already installed.\n",
          doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[exit ${code ?? "unknown"}]\n`),
        });
        if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});