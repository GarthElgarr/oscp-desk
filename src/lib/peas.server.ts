import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";
import { STANDARD_UPLOADS, peasBytesOk, peasHostOk, pickAsset, type StandardUpload } from "./peas";
import { writePrivateFileAsync } from "./private-file.ts";
import { uploadsRoot } from "./uploads.server";

const run = promisify(execFile);

export type PeasResult = {
  lines: string[];
};

type Asset = { name: string; url: string };

const FLATTEN_ZIP = `
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
for name in z.namelist():
    base = name.replace("\\\\", "/").split("/")[-1]
    if not base or base.startswith(".") or ".." in name.split("/"):
        continue
    open(sys.argv[2] + "/" + base, "wb").write(z.read(name))
`;

const FLATTEN_TAR = `
import sys, tarfile
t = tarfile.open(sys.argv[1])
for member in t.getmembers():
    if not member.isfile():
        continue
    base = member.name.replace("\\\\", "/").split("/")[-1]
    if not base or base.startswith(".") or ".." in member.name.split("/"):
        continue
    handle = t.extractfile(member)
    if handle:
        open(sys.argv[2] + "/" + base, "wb").write(handle.read())
`;

async function releaseAssets(repo: string): Promise<Asset[] | string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "oscp-desk" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return `GitHub returned ${response.status}`;
  const body = (await response.json()) as { assets?: { name?: unknown; browser_download_url?: unknown }[] };
  if (!Array.isArray(body.assets)) return "GitHub did not list the release files";
  const assets: Asset[] = [];
  for (const item of body.assets) {
    if (typeof item.name !== "string" || typeof item.browser_download_url !== "string") continue;
    if (!peasHostOk(item.browser_download_url)) continue;
    assets.push({ name: item.name, url: item.browser_download_url });
  }
  return assets;
}

async function unpack(pack: "gzip" | "zip" | "tar", bytes: Buffer, want: string): Promise<Buffer | string> {
  if (pack === "gzip") {
    try {
      return gunzipSync(bytes);
    } catch {
      return "the gzip archive did not open";
    }
  }
  const dir = await mkdtemp(path.join(tmpdir(), "oscp-upload-"));
  try {
    const archive = path.join(dir, pack === "zip" ? "archive.zip" : "archive.tar.gz");
    const out = path.join(dir, "out");
    await mkdir(out);
    await writePrivateFileAsync(archive, bytes);
    const script = pack === "zip" ? FLATTEN_ZIP : FLATTEN_TAR;
    await run("python3", ["-c", script, archive, out], { timeout: 30_000 });
    const names = await readdir(out);
    const exact = names.find((name) => name === want);
    const picked = exact ?? (names.length === 1 ? names[0] : "");
    if (!picked) return "the archive did not contain one binary";
    return await readFile(path.join(out, picked));
  } catch (err) {
    const message = err instanceof Error ? err.message : "the archive did not open";
    return message;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function sourceUrl(item: StandardUpload, cache: Map<string, Asset[] | string>): Promise<{ url: string } | { error: string }> {
  if (item.pack === "raw") return { url: item.url };
  let assets = cache.get(item.repo);
  if (!assets) {
    assets = await releaseAssets(item.repo);
    cache.set(item.repo, assets);
  }
  if (typeof assets === "string") return { error: `${item.name}: ${assets}` };
  const name = pickAsset(
    assets.map((asset) => asset.name),
    item.asset,
  );
  const asset = assets.find((item) => item.name === name);
  if (!asset) return { error: `${item.name}: the latest release has no matching 64-bit file` };
  return { url: asset.url };
}

async function one(root: string, item: StandardUpload, force: boolean, cache: Map<string, Asset[] | string>): Promise<string> {
  const dest = path.join(root, item.name);
  if (!force) {
    const existing = await stat(dest).catch(() => null);
    if (existing?.isFile() && existing.size > 4096) return `${item.name}: already in the uploads folder`;
  }
  try {
    const found = await sourceUrl(item, cache);
    if ("error" in found) return found.error;
    const response = await fetch(found.url, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
    if (!response.ok) return `${item.name}: the download returned ${response.status}`;
    if (!peasHostOk(response.url)) return `${item.name}: the download left GitHub, so it was not saved`;
    const downloaded = Buffer.from(await response.arrayBuffer());
    const head = downloaded.subarray(0, 80);
    const text = head.toString("latin1").toLowerCase();
    if (text.startsWith("<!") || text.includes("<html")) return `${item.name}: the download was a web page, so it was not saved`;
    const bytes = item.pack === "raw" ? downloaded : await unpack(item.pack, downloaded, item.name);
    if (typeof bytes === "string") return `${item.name}: ${bytes}`;
    if (!peasBytesOk(item.name, bytes.length, bytes.subarray(0, 80))) return `${item.name}: the download was not the binary, so it was not saved`;
    await writePrivateFileAsync(dest, bytes);
    return `${item.name}: saved (${Math.round(bytes.length / 1024)} KB)`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "download failed";
    return `${item.name}: ${message}`;
  }
}

/** Fetch the standard transfer files. Existing files stay unless force is set. */
export async function ensureStandardUploads(force = false): Promise<PeasResult> {
  const root = uploadsRoot();
  await mkdir(root, { recursive: true });
  const cache = new Map<string, Asset[] | string>();
  const lines: string[] = [];
  for (const item of STANDARD_UPLOADS) lines.push(await one(root, item, force, cache));
  return { lines };
}
