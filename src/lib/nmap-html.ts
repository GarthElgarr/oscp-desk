const AMP = "&" + "amp;";
const LT = "&" + "lt;";
const GT = "&" + "gt;";
const QUOT = "&" + "quot;";
const APOS = "&" + "apos;";

function entity(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => point(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => point(Number(num)))
    .replaceAll(LT, "<")
    .replaceAll(GT, ">")
    .replaceAll(QUOT, '"')
    .replaceAll(APOS, "'")
    .replaceAll(AMP, "&");
}

function point(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return "";
  return String.fromCodePoint(n);
}

function esc(value: string): string {
  return value.replaceAll("&", AMP).replaceAll("<", LT).replaceAll(">", GT).replaceAll('"', QUOT);
}

function attr(source: string, name: string): string {
  const match = source.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? entity(match[1]) : "";
}

function blocks(source: string, tag: string): string[] {
  const found: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*/>|<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "g");
  for (const match of source.matchAll(re)) found.push(match[0]);
  return found;
}

/** A self-contained page for one saved nmap XML file. Closed ports stay out of the table. */
export function nmapReportHtml(xml: string, name: string): string {
  const title = esc(name);
  if (!xml.includes("<nmaprun")) {
    return page(title, "<p>That file is not an nmap XML report.</p>");
  }
  const hosts = blocks(xml, "host");
  if (hosts.length === 0) return page(title, "<p>The XML parsed, but it has no hosts.</p>");
  const body = hosts
    .map((host) => {
      const addr = attr(host, "addr") || "unknown";
      const hostname = attr(host.match(/<hostname\b[^>]*>/)?.[0] ?? "", "name");
      const state = attr(host.match(/<status\b[^>]*>/)?.[0] ?? "", "state") || "unknown";
      const ports = blocks(host, "port").map((port) => {
        const open = port.match(/<port\b[^>]*>/)?.[0] ?? "";
        const service = port.match(/<service\b[^>]*>/)?.[0] ?? "";
        const detail = [attr(service, "product"), attr(service, "version"), attr(service, "extrainfo")].filter(Boolean).join(" ");
        const scripts = blocks(port, "script")
          .map((script) => {
            const id = attr(script, "id");
            const output = attr(script, "output").slice(0, 8000);
            return `<h3>${esc(id)}</h3><pre>${esc(output)}</pre>`;
          })
          .join("");
        return {
          state: attr(port.match(/<state\b[^>]*>/)?.[0] ?? "", "state") || "unknown",
          line: `<tr><td>${esc(attr(open, "portid"))}/${esc(attr(open, "protocol") || "tcp")}</td><td>${esc(attr(port.match(/<state\b[^>]*>/)?.[0] ?? "", "state"))}</td><td>${esc([attr(service, "name"), detail].filter(Boolean).join(" ") || "unknown")}${scripts}</td></tr>`,
        };
      });
      const shown = ports.filter((port) => port.state === "open" || port.state === "open|filtered");
      const hidden = ports.length - shown.length;
      const rows = shown.length
        ? `<table><thead><tr><th>Port</th><th>State</th><th>Service</th></tr></thead><tbody>${shown.map((port) => port.line).join("")}</tbody></table>`
        : "<p>No open ports in this file.</p>";
      return `<section><h2>${esc(addr)}</h2><p class="meta">${esc(hostname || "no hostname")} · ${esc(state)}${hidden ? ` · ${hidden} closed or filtered left out` : ""}</p>${rows}</section>`;
    })
    .join("");
  return page(title, body);
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — nmap</title>
<style>
  body { margin: 0; background: #101410; color: #e7eee8; font: 16px/1.5 "Source Sans 3", sans-serif; }
  main { max-width: 52rem; margin: 0 auto; padding: 1.5rem; }
  h1 { font-size: 1.4rem; margin: 0 0 1rem; }
  h2 { font: 600 1.1rem/1.3 ui-monospace, monospace; margin: 0; }
  h3 { font: 500 0.8rem/1.3 ui-monospace, monospace; color: #d4a054; margin: 0.8rem 0 0.3rem; }
  section { border: 1px solid #2c3830; border-radius: 0.65rem; padding: 0.8rem 1rem; margin: 0 0 1rem; }
  .meta { color: #93a398; font-size: 0.85rem; margin: 0.2rem 0 0.6rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 0.45rem 0.4rem; border-top: 1px solid #2c3830; }
  th { color: #93a398; font-weight: 500; font-size: 0.75rem; }
  td:first-child { font-family: ui-monospace, monospace; white-space: nowrap; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #101410; padding: 0.6rem; border-radius: 0.4rem; font-size: 0.8rem; }
</style>
</head>
<body>
<main>
<h1>${title}</h1>
${body}
</main>
</body>
</html>`;
}
