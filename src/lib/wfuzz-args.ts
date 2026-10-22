import { quoteHydraArg } from "./hydra-args";

const SHELL = /[;|`$<>\\\n\r\0]/;
const BLOCKED = /rockyou|\/etc\/|\/proc\/|\/dev\/|\/root\/|\/home\//i;

function unsafe(arg: string): boolean {
  return SHELL.test(arg) || arg.includes("&&") || arg.startsWith("&") || arg.endsWith("&") || arg.includes("..") || BLOCKED.test(arg);
}

const FLAGS_VALUE = new Set([
  "-t",
  "-R",
  "-s",
  "-e",
  "-p",
  "-u",
  "-X",
  "-d",
  "-H",
  "-b",
  "-z",
  "-w",
  "-f",
  "-o",
  "--hc",
  "--hl",
  "--hw",
  "--hh",
  "--sc",
  "--sl",
  "--sw",
  "--sh",
  "--hs",
  "--ss",
  "--req-delay",
  "--conn-delay",
  "--basic",
  "--ntlm",
  "--digest",
  "--zE",
]);

const FLAGS_BARE = new Set(["-c", "-v", "-V", "-L", "-Z", "--follow", "--dry-run"]);

export const WFUZZ_LISTS = [
  { id: "dirb", label: "dirb common.txt", path: "/usr/share/wordlists/dirb/common.txt" },
  { id: "common", label: "SecLists common.txt", path: "/usr/share/seclists/Discovery/Web-Content/common.txt" },
  { id: "raft", label: "raft-small-words", path: "/usr/share/seclists/Discovery/Web-Content/raft-small-words.txt" },
  { id: "files", label: "raft-small-files", path: "/usr/share/seclists/Discovery/Web-Content/raft-small-files.txt" },
  { id: "params", label: "burp parameter names", path: "/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt" },
  { id: "dns", label: "subdomains, top 5000", path: "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt" },
  { id: "custom", label: "A file you name", path: "" },
] as const;

export type WfuzzList = (typeof WFUZZ_LISTS)[number]["id"];
export type WfuzzMode = "dir" | "ext" | "param" | "pname" | "post" | "login" | "vhost" | "header" | "cookie" | "range";

export type WfuzzInput = {
  mode: WfuzzMode;
  url: string;
  listId: WfuzzList;
  customList: string;
  listTwo: string;
  extension: string;
  param: string;
  postField: string;
  postExtra: string;
  userField: string;
  passField: string;
  domain: string;
  headerName: string;
  cookieName: string;
  rangeStart: string;
  rangeEnd: string;
  hideCodes: string;
  hideWords: string;
  hideChars: string;
  hideLines: string;
  showCodes: string;
  hideRegex: string;
  showRegex: string;
  threads: string;
  follow: boolean;
  recursion: string;
  delay: string;
  verbose: boolean;
  encoder: "" | "urlencode" | "md5";
  proxy: string;
  outfile: string;
  printer: "raw" | "json";
  extraHeader: string;
};

export type WfuzzPlan = {
  ready: boolean;
  args: string[];
  command: string;
  why: string;
  note: string;
  stop: boolean;
};

export function wfuzzListPath(id: WfuzzList, custom: string): string {
  if (id === "custom") return cleanList(custom);
  return WFUZZ_LISTS.find((item) => item.id === id)?.path ?? "";
}

export function cleanList(raw: string): string {
  const path = raw.trim();
  if (!path || path.includes("..") || BLOCKED.test(path) || SHELL.test(path)) return "";
  if (!/^[A-Za-z0-9_./+-]+$/.test(path)) return "";
  if (path.startsWith("/") && !path.startsWith("/usr/share/seclists/") && !path.startsWith("/usr/share/wordlists/")) return "";
  return path;
}

function cleanUrl(raw: string): string {
  const url = raw.trim();
  if (!/^https?:\/\/[A-Za-z0-9._:-]+(?::\d{1,5})?(?:\/[A-Za-z0-9._~:/?@[\]!$&'()*+,;=%-]*)?$/.test(url)) return "";
  if (SHELL.test(url) || url.includes("..") || url.includes("&&")) return "";
  return url;
}

function codes(raw: string): string {
  const text = raw.trim();
  if (!text || !/^\d{3}(,\d{3}){0,7}$/.test(text)) return "";
  return text.split(",").every((part) => {
    const n = Number(part);
    return n >= 100 && n <= 599;
  })
    ? text
    : "";
}

function nums(raw: string): string {
  const text = raw.trim();
  if (!text || !/^\d{1,7}(,\d{1,7}){0,5}$/.test(text)) return "";
  return text;
}

function nameOk(raw: string): string {
  const text = raw.trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(text) ? text : "";
}

function placeFuzz(url: string, mode: WfuzzMode, extension: string, param: string): string {
  if (url.includes("FUZZ") || url.includes("FUZ2Z")) return url;
  const cut = url.indexOf("?");
  const path = cut === -1 ? url : url.slice(0, cut);
  const query = cut === -1 ? "" : url.slice(cut);
  if (mode === "dir") return `${path.replace(/\/$/, "")}/FUZZ${query}`;
  if (mode === "ext") return `${path.replace(/\/$/, "")}/FUZZ${extension}${query}`;
  if (mode === "param" || mode === "range") return url.includes("?") ? `${url}&${param}=FUZZ` : `${url}?${param}=FUZZ`;
  if (mode === "pname") return url.includes("?") ? `${url}&FUZZ=1` : `${url}?FUZZ=1`;
  return url;
}

export function wfuzzPlan(input: WfuzzInput): WfuzzPlan {
  const base = cleanUrl(input.url);
  const extension = /^\.[A-Za-z0-9]{1,8}$/.test(input.extension.trim()) ? input.extension.trim() : "";
  const param = nameOk(input.param);
  const postField = nameOk(input.postField);
  const userField = nameOk(input.userField);
  const passField = nameOk(input.passField);
  const headerName = nameOk(input.headerName);
  const cookieName = nameOk(input.cookieName);
  const domain = /^[A-Za-z0-9.-]{1,80}$/.test(input.domain.trim()) ? input.domain.trim() : "";
  const list = input.mode === "range" ? "" : wfuzzListPath(input.listId, input.customList);
  const second = cleanList(input.listTwo);
  const hideCodes = codes(input.hideCodes);
  const showCodes = codes(input.showCodes);
  const hideWords = nums(input.hideWords);
  const hideChars = nums(input.hideChars);
  const hideLines = nums(input.hideLines);
  const hideRegex = input.hideRegex.trim();
  const showRegex = input.showRegex.trim();
  const regexOk = (value: string) => value === "" || (value.length <= 80 && !SHELL.test(value));
  const threads = input.threads === "10" || input.threads === "40" ? input.threads : "20";
  const recursion = input.recursion === "1" || input.recursion === "2" ? input.recursion : "";
  const delay = input.delay === "1" || input.delay === "2" ? input.delay : "";
  const proxy = /^127\.0\.0\.1:\d{1,5}$/.test(input.proxy.trim()) ? input.proxy.trim() : "";
  const proxyPort = proxy ? Number(proxy.split(":")[1]) : 0;
  const outfile = /^[A-Za-z0-9._-]{1,64}$/.test(input.outfile.trim()) ? input.outfile.trim() : "";
  const extraHeader = /^[A-Za-z0-9-]{1,40}: ?[A-Za-z0-9._~:/?&=%+-]{1,120}$/.test(input.extraHeader.trim())
    ? input.extraHeader.trim()
    : "";
  const postExtra = /^[A-Za-z0-9._~=&%+-]{0,160}$/.test(input.postExtra.trim()) ? input.postExtra.trim() : "";
  const start = /^\d{1,6}$/.test(input.rangeStart.trim()) ? Number(input.rangeStart) : NaN;
  const end = /^\d{1,6}$/.test(input.rangeEnd.trim()) ? Number(input.rangeEnd) : NaN;
  const rangeOk = Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start && end - start <= 499 && end <= 100000;

  const notes: string[] = [];
  const usesCustom = input.mode !== "range" && input.listId === "custom";
  const rockyou = (usesCustom && /rockyou/i.test(input.customList)) || (input.mode === "login" && /rockyou/i.test(input.listTwo));
  if (rockyou) notes.push("That list is rockyou. WFuzz is not where it belongs. Use a small file, or a SecLists discovery list.");
  if (input.url.trim() && !base) notes.push("The URL needs http:// or https:// and a host. A bare IP is not a URL.");
  if (usesCustom && input.customList.trim() && !list) {
    notes.push("The wordlist must be a file name, or a path under /usr/share/seclists or /usr/share/wordlists. No .. and no /etc.");
  }
  if (input.mode === "login" && input.listTwo.trim() && !second) {
    notes.push("The second list follows the same path rules as the first.");
  }
  if (input.mode === "range" && (input.rangeStart.trim() || input.rangeEnd.trim()) && !rangeOk) {
    notes.push("The range is at most 500 numbers, for example 1 to 20.");
  }
  if (input.hideCodes.trim() && !hideCodes) notes.push("Hide codes are HTTP statuses separated by commas, such as 404,403.");
  if (input.showCodes.trim() && !showCodes) notes.push("Show codes are HTTP statuses separated by commas, such as 200,301.");
  if ((input.hideWords.trim() && !hideWords) || (input.hideChars.trim() && !hideChars) || (input.hideLines.trim() && !hideLines)) {
    notes.push("Hide words, chars, and lines are numbers. Read them off one normal reply.");
  }
  if (!regexOk(hideRegex) || !regexOk(showRegex)) notes.push("The filter text has a character this runner will not pass through.");
  if (input.proxy.trim() && (!proxy || proxyPort < 1 || proxyPort > 65535)) notes.push("The proxy, if you set one, is 127.0.0.1 and a port. That is Burp on Kali.");
  if (input.follow) notes.push("Follow is on. A 301 is fetched, and you can miss the directory that redirected.");
  if (recursion) notes.push("Recursion multiplies the wordlist by every new directory. 1 is already a lot.");
  if (input.mode === "vhost" && !hideChars && !hideWords && !hideLines) {
    notes.push("A vhost scan without a hide size prints the default site once per word. Request the IP, then hide that character count.");
  }
  if (input.extraHeader.trim() && !extraHeader) notes.push("The extra header must look like Name: value. No spaces in the name.");
  if (input.mode === "post" && input.postExtra.trim() && !postExtra) notes.push("Other body fields must look like action=search. No spaces or quotes.");
  if (input.mode === "ext" && input.extension.trim() && !extension) notes.push("The extension starts with a dot, such as .php or .bak.");
  if (input.mode === "login") notes.push("Requests are the first list times the second list. Two names and three passwords is six requests.");
  if (input.mode === "vhost" && input.domain.trim() && !domain) {
    notes.push("The domain is the part after the guessed name, such as exam.htb. Leave it blank to replace the whole Host header.");
  }
  if (input.outfile.trim() && !outfile) notes.push("The save name is one file name, such as wfuzz.txt. No folders.");

  const url = base ? placeFuzz(base, input.mode, extension || ".php", param || "id") : "";
  let body = "";
  if (input.mode === "post" && postField) {
    body = [postExtra, `${postField}=FUZZ`].filter(Boolean).join("&");
  }
  if (input.mode === "login" && userField && passField) {
    body = `${userField}=FUZZ&${passField}=FUZ2Z`;
  }
  const hostHeader = input.mode === "vhost" ? (domain ? `Host: FUZZ.${domain}` : "Host: FUZZ") : "";
  const customHeader = input.mode === "header" && headerName ? `${headerName}: FUZZ` : "";
  const cookie = input.mode === "cookie" && cookieName ? `${cookieName}=FUZZ` : "";

  const needsList = input.mode !== "range";
  const needsSecond = input.mode === "login";
  const modeReady =
    Boolean(url) &&
    (input.mode !== "ext" || Boolean(extension)) &&
    (input.mode !== "param" && input.mode !== "range" || Boolean(param)) &&
    (input.mode !== "post" || Boolean(body)) &&
    (input.mode !== "login" || Boolean(body)) &&
    (input.mode !== "header" || Boolean(customHeader)) &&
    (input.mode !== "cookie" || Boolean(cookie)) &&
    (input.mode !== "range" || rangeOk) &&
    (!needsList || Boolean(list)) &&
    (!needsSecond || Boolean(second)) &&
    regexOk(hideRegex) &&
    regexOk(showRegex) &&
    (!input.url.trim() || Boolean(base)) &&
    (!input.hideCodes.trim() || Boolean(hideCodes)) &&
    (!input.showCodes.trim() || Boolean(showCodes)) &&
    (!input.hideWords.trim() || Boolean(hideWords)) &&
    (!input.hideChars.trim() || Boolean(hideChars)) &&
    (!input.hideLines.trim() || Boolean(hideLines)) &&
    (!input.proxy.trim() || (Boolean(proxy) && proxyPort >= 1 && proxyPort <= 65535)) &&
    (!input.outfile.trim() || Boolean(outfile)) &&
    (!input.extraHeader.trim() || Boolean(extraHeader)) &&
    (input.mode !== "post" || !input.postExtra.trim() || Boolean(postExtra)) &&
    (input.mode !== "vhost" || !input.domain.trim() || Boolean(domain)) &&
    (input.mode !== "ext" || Boolean(extension));

  const args: string[] = [];
  if (modeReady && !rockyou) {
    if (input.mode === "range") args.push("-z", `range,${start}-${end}`);
    else args.push("-z", `file,${list}`);
    if (needsSecond) args.push("-z", `file,${second}`);
    if (input.encoder) args.push("--zE", input.encoder);
    if (hostHeader) args.push("-H", hostHeader);
    if (customHeader) args.push("-H", customHeader);
    if (extraHeader) args.push("-H", extraHeader);
    if (cookie) args.push("-b", cookie);
    if (body) {
      args.push("-X", "POST", "-d", body, "-H", "Content-Type: application/x-www-form-urlencoded");
    }
    if (hideCodes) args.push("--hc", hideCodes);
    if (showCodes) args.push("--sc", showCodes);
    if (hideWords) args.push("--hw", hideWords);
    if (hideChars) args.push("--hh", hideChars);
    if (hideLines) args.push("--hl", hideLines);
    if (hideRegex) args.push("--hs", hideRegex);
    if (showRegex) args.push("--ss", showRegex);
    args.push("-t", threads);
    if (input.verbose) args.push("-v");
    if (input.follow) args.push("-L");
    if (recursion) args.push("-R", recursion);
    if (delay) args.push("--req-delay", delay);
    if (proxy && proxyPort >= 1 && proxyPort <= 65535) args.push("-p", proxy);
    if (outfile) args.push("-f", `${outfile},${input.printer}`);
    args.push("-u", url);
  }

  return {
    ready: args.length > 0,
    args,
    command: args.length ? ["wfuzz", ...args.map(quoteHydraArg)].join(" ") : "",
    why: whyFor(input.mode),
    note: notes.join(" "),
    stop: rockyou,
  };
}

function whyFor(mode: WfuzzMode): string {
  const filters =
    "--hc hides status codes. 404 is the usual miss, and hiding 403 as well throws away locked directories. --hw, --hh, and --hl hide a word count, a character count, or a line count from one normal reply. --sc is the opposite: show only those codes. --hs and --ss hide or show a line of text. -t is how many requests are in flight. -v prints each payload. -L follows redirects. -R recurses into new directories. --req-delay waits between requests. -p is a proxy, and here that means Burp on 127.0.0.1. -f writes the result. The first -z list replaces FUZZ. A second replaces FUZ2Z.";
  const lead: Record<WfuzzMode, string> = {
    dir: "FUZZ is each line of the wordlist, requested as a path. A 200 is a file. A 301 is a directory. Read those before you change lists.",
    ext: "FUZZ keeps the word and the extension is fixed, so page becomes page.php. A backup of a page you already saw is often the files list with .bak, not another directory list.",
    param: "The parameter name stays and the value changes. Hide the size of one ordinary reply, or a miss and a hit look identical. This is for id, file, page, or template.",
    pname: "The value stays and the name changes. You are looking for a parameter the page did not show. burp-parameter-names is the list that matches this job.",
    post: "The URL stays still and FUZZ is in the body. POST is set for you, with the form content type. Hide the word count of one failed reply before you trust a hit.",
    login: "FUZZ is the first file and FUZ2Z is the second, so the run is the product of the two lengths. This is a tiny check, not a password attack. Hydra is the login tool when you already know the form.",
    vhost: "The URL stays on the IP. The Host header is the name being guessed. The default site answers every word with the same size, so you hide that size or the terminal is noise.",
    header: "One header value is the wordlist. The name stays. Use it when the app trusts a header you can see in the request, not as a general scan.",
    cookie: "The cookie value is the wordlist. This is for a cookie the app uses as a switch or a name. A session token is not something you fuzz from a directory list.",
    range: "range replaces FUZZ with integers, and there is no wordlist. The span is capped. An id from 1 to 50 is a check. A span of thousands is how the afternoon goes.",
  };
  return `${lead[mode]} ${filters}`;
}

export function wfuzzArgsOk(args: unknown): args is string[] {
  if (!Array.isArray(args) || args.length < 4 || args.length > 48) return false;
  if (
    !args.every(
      (arg) => typeof arg === "string" && arg.length > 0 && arg.length <= 400 && !unsafe(arg),
    )
  ) {
    return false;
  }
  if (!args.some((arg) => /^https?:\/\//.test(arg))) return false;
  if (!args.some((arg) => arg.includes("FUZZ"))) return false;
  let sawPayload = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("-")) continue;
    const takesValue = FLAGS_VALUE.has(arg);
    if (!takesValue && !FLAGS_BARE.has(arg)) return false;
    const value = args[i + 1];
    if (takesValue && (value === undefined || value.startsWith("-"))) return false;
    if (arg === "-t") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 40) return false;
    }
    if (arg === "-R") {
      if (value !== "1" && value !== "2") return false;
    }
    if (arg === "-p") {
      const match = /^127\.0\.0\.1:(\d{1,5})$/.exec(value);
      const port = match ? Number(match[1]) : 0;
      if (!match || port < 1 || port > 65535) return false;
    }
    if (arg === "--zE" && !/^[a-z0-9-]{1,40}$/.test(value)) return false;
    if (arg === "-z") {
      const range = /^range,(\d+)-(\d+)$/.exec(value);
      if (/^file,.+$/.test(value)) sawPayload = true;
      else if (range) {
        const from = Number(range[1]);
        const to = Number(range[2]);
        if (to < from || to - from > 499 || to > 100000) return false;
        sawPayload = true;
      } else return false;
    }
    if (arg === "-w") sawPayload = true;
  }
  return sawPayload;
}
