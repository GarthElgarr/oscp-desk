/** True when the Vite dev server must not serve this URL. The uploads route under /files/ stays open. */
export function devPathDenied(url: string): boolean {
  const path = decodePath(url);
  if (path === null) return true;
  if (path === "/") return false;
  if (path.includes("..")) return true;
  if (path.startsWith("/files/")) return false;
  if (path.startsWith("/@fs/")) return !path.includes("/node_modules/");
  const blocked = ["/scans", "/uploads", "/data", "/.grok", "/.git"];
  for (const root of blocked) {
    if (path === root || path.startsWith(`${root}/`)) return true;
  }
  if (path.startsWith("/loot-")) return true;
  const lower = path.toLowerCase();
  if (lower.endsWith(".json") || lower.includes(".env")) return true;
  return false;
}

function decodePath(url: string): string | null {
  const raw = (url.split("?")[0] ?? "/").split("#")[0] ?? "/";
  try {
    let next = raw;
    for (let i = 0; i < 2; i++) {
      const decoded = decodeURIComponent(next);
      if (decoded === next) break;
      next = decoded;
    }
    if (next.includes("\0")) return null;
    return next.startsWith("/") ? next : `/${next}`;
  } catch {
    return null;
  }
}
