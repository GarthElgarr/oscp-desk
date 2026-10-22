import { useMemo, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { ToolRun } from "@/components/hydra-run";
import { WFUZZ_LISTS, wfuzzArgsOk, wfuzzPlan, type WfuzzList, type WfuzzMode } from "@/lib/wfuzz-args";
import { quoteHydraArg } from "@/lib/hydra-args";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

const MODES: { id: WfuzzMode; label: string; hide: string; list: WfuzzList }[] = [
  { id: "dir", label: "Directories and files", hide: "404", list: "dirb" },
  { id: "ext", label: "One extension", hide: "404", list: "files" },
  { id: "pname", label: "Parameter name", hide: "404", list: "params" },
  { id: "param", label: "Parameter value", hide: "404", list: "custom" },
  { id: "range", label: "Parameter value, a number range", hide: "", list: "custom" },
  { id: "post", label: "POST body", hide: "", list: "custom" },
  { id: "login", label: "Two lists, user and password", hide: "", list: "custom" },
  { id: "vhost", label: "Host header", hide: "", list: "dns" },
  { id: "header", label: "One header", hide: "", list: "custom" },
  { id: "cookie", label: "One cookie", hide: "", list: "custom" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export function WfuzzBuilder() {
  const [mode, setMode] = useState<WfuzzMode>("dir");
  const [url, setUrl] = useState("");
  const [listId, setListId] = useState<WfuzzList>("dirb");
  const [customList, setCustomList] = useState("found.txt");
  const [listTwo, setListTwo] = useState("found.txt");
  const [extension, setExtension] = useState(".php");
  const [param, setParam] = useState("id");
  const [postField, setPostField] = useState("q");
  const [postExtra, setPostExtra] = useState("");
  const [userField, setUserField] = useState("username");
  const [passField, setPassField] = useState("password");
  const [domain, setDomain] = useState("");
  const [headerName, setHeaderName] = useState("X-Forwarded-For");
  const [cookieName, setCookieName] = useState("session");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("20");
  const [hideCodes, setHideCodes] = useState("404");
  const [hideWords, setHideWords] = useState("");
  const [hideChars, setHideChars] = useState("");
  const [hideLines, setHideLines] = useState("");
  const [showCodes, setShowCodes] = useState("");
  const [hideRegex, setHideRegex] = useState("");
  const [showRegex, setShowRegex] = useState("");
  const [threads, setThreads] = useState("20");
  const [follow, setFollow] = useState(false);
  const [recursion, setRecursion] = useState("0");
  const [delay, setDelay] = useState("");
  const [verbose, setVerbose] = useState(true);
  const [encoder, setEncoder] = useState<"" | "urlencode" | "md5">("");
  const [proxy, setProxy] = useState("");
  const [outfile, setOutfile] = useState("");
  const [printer, setPrinter] = useState<"raw" | "json">("raw");
  const [extraHeader, setExtraHeader] = useState("");
  const [extraArgs, setExtraArgs] = useState<string[]>([]);

  const plan = useMemo(
    () =>
      wfuzzPlan({
        mode,
        url,
        listId,
        customList,
        listTwo,
        extension,
        param,
        postField,
        postExtra,
        userField,
        passField,
        domain,
        headerName,
        cookieName,
        rangeStart,
        rangeEnd,
        hideCodes,
        hideWords,
        hideChars,
        hideLines,
        showCodes,
        hideRegex,
        showRegex,
        threads,
        follow,
        recursion,
        delay,
        verbose,
        encoder,
        proxy,
        outfile,
        printer,
        extraHeader,
      }),
    [
      mode,
      url,
      listId,
      customList,
      listTwo,
      extension,
      param,
      postField,
      postExtra,
      userField,
      passField,
      domain,
      headerName,
      cookieName,
      rangeStart,
      rangeEnd,
      hideCodes,
      hideWords,
      hideChars,
      hideLines,
      showCodes,
      hideRegex,
      showRegex,
      threads,
      follow,
      recursion,
      delay,
      verbose,
      encoder,
      proxy,
      outfile,
      printer,
      extraHeader,
    ],
  );

  const args = [...plan.args, ...extraArgs];
  const runnable = plan.ready && !plan.stop && (extraArgs.length === 0 || wfuzzArgsOk(args));
  const shown = plan.ready ? ["wfuzz", ...plan.args.map(quoteHydraArg), ...extraArgs.map(quoteHydraArg)].join(" ") : "";

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">wfuzz</h2>
        <p className="mt-1 text-sm text-muted">
          FUZZ is where the wordlist goes. Hide the boring reply or every line looks like a hit. Extra flags are wfuzz
          options, not a shell. Run streams the output here.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <Field label="WHAT YOU ARE FUZZING">
          <select
            className={control}
            value={mode}
            onChange={(event) => {
              const next = event.target.value as WfuzzMode;
              const preset = MODES.find((item) => item.id === next);
              setMode(next);
              if (preset) {
                setHideCodes(preset.hide);
                setListId(preset.list);
              }
            }}
          >
            {MODES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="BASE URL">
          <input className={control} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://10.10.10.5" spellCheck={false} />
        </Field>
        {mode !== "range" ? (
          <Field label="WORDLIST">
            <select className={control} value={listId} onChange={(e) => setListId(e.target.value as WfuzzList)}>
              {WFUZZ_LISTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {mode !== "range" && listId === "custom" ? (
          <Field label="WORDLIST PATH">
            <input className={control} value={customList} onChange={(e) => setCustomList(e.target.value)} spellCheck={false} />
          </Field>
        ) : null}
        {mode === "login" ? (
          <Field label="SECOND LIST, FUZ2Z">
            <input className={control} value={listTwo} onChange={(e) => setListTwo(e.target.value)} spellCheck={false} />
          </Field>
        ) : null}
        {mode === "ext" ? (
          <Field label="EXTENSION">
            <input className={control} value={extension} onChange={(e) => setExtension(e.target.value)} placeholder=".php" spellCheck={false} />
          </Field>
        ) : null}
        {mode === "param" || mode === "range" ? (
          <Field label="PARAMETER NAME">
            <input className={control} value={param} onChange={(e) => setParam(e.target.value)} spellCheck={false} />
          </Field>
        ) : null}
        {mode === "range" ? (
          <>
            <Field label="RANGE START">
              <input className={control} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="RANGE END">
              <input className={control} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} inputMode="numeric" />
            </Field>
          </>
        ) : null}
        {mode === "post" ? (
          <>
            <Field label="BODY FIELD">
              <input className={control} value={postField} onChange={(e) => setPostField(e.target.value)} spellCheck={false} />
            </Field>
            <Field label="OTHER BODY FIELDS">
              <input className={control} value={postExtra} onChange={(e) => setPostExtra(e.target.value)} placeholder="action=search" spellCheck={false} />
            </Field>
          </>
        ) : null}
        {mode === "login" ? (
          <>
            <Field label="USERNAME FIELD">
              <input className={control} value={userField} onChange={(e) => setUserField(e.target.value)} spellCheck={false} />
            </Field>
            <Field label="PASSWORD FIELD">
              <input className={control} value={passField} onChange={(e) => setPassField(e.target.value)} spellCheck={false} />
            </Field>
          </>
        ) : null}
        {mode === "vhost" ? (
          <Field label="DOMAIN AFTER THE NAME">
            <input className={control} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="exam.htb" spellCheck={false} />
          </Field>
        ) : null}
        {mode === "header" ? (
          <Field label="HEADER NAME">
            <input className={control} value={headerName} onChange={(e) => setHeaderName(e.target.value)} spellCheck={false} />
          </Field>
        ) : null}
        {mode === "cookie" ? (
          <Field label="COOKIE NAME">
            <input className={control} value={cookieName} onChange={(e) => setCookieName(e.target.value)} spellCheck={false} />
          </Field>
        ) : null}
        <Field label="HIDE CODES --hc">
          <input className={control} value={hideCodes} onChange={(e) => setHideCodes(e.target.value)} placeholder="404" spellCheck={false} />
        </Field>
        <Field label="SHOW CODES --sc">
          <input className={control} value={showCodes} onChange={(e) => setShowCodes(e.target.value)} placeholder="200,301" spellCheck={false} />
        </Field>
        <Field label="HIDE WORDS --hw">
          <input className={control} value={hideWords} onChange={(e) => setHideWords(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="HIDE CHARS --hh">
          <input className={control} value={hideChars} onChange={(e) => setHideChars(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="HIDE LINES --hl">
          <input className={control} value={hideLines} onChange={(e) => setHideLines(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="HIDE TEXT --hs">
          <input className={control} value={hideRegex} onChange={(e) => setHideRegex(e.target.value)} placeholder="Invalid" spellCheck={false} />
        </Field>
        <Field label="SHOW TEXT --ss">
          <input className={control} value={showRegex} onChange={(e) => setShowRegex(e.target.value)} spellCheck={false} />
        </Field>
        <Field label="THREADS -t">
          <select className={control} value={threads} onChange={(e) => setThreads(e.target.value)}>
            <option value="10">10. A login or a slow app</option>
            <option value="20">20</option>
            <option value="40">40. A directory list</option>
          </select>
        </Field>
        <Field label="RECURSION -R">
          <select className={control} value={recursion} onChange={(e) => setRecursion(e.target.value)}>
            <option value="0">Off</option>
            <option value="1">1. Inside each new directory</option>
            <option value="2">2. One level further</option>
          </select>
        </Field>
        <Field label="DELAY --req-delay">
          <select className={control} value={delay} onChange={(e) => setDelay(e.target.value)}>
            <option value="">None</option>
            <option value="1">1 second</option>
            <option value="2">2 seconds</option>
          </select>
        </Field>
        <Field label="ENCODE --zE">
          <select className={control} value={encoder} onChange={(e) => setEncoder(e.target.value as typeof encoder)}>
            <option value="">None</option>
            <option value="urlencode">urlencode</option>
            <option value="md5">md5</option>
          </select>
        </Field>
        <Field label="FOLLOW -L">
          <select className={control} value={follow ? "yes" : "no"} onChange={(e) => setFollow(e.target.value === "yes")}>
            <option value="no">Off. Keep the 301</option>
            <option value="yes">Follow redirects</option>
          </select>
        </Field>
        <Field label="VERBOSE -v">
          <select className={control} value={verbose ? "yes" : "no"} onChange={(e) => setVerbose(e.target.value === "yes")}>
            <option value="yes">Show the payload</option>
            <option value="no">Results only</option>
          </select>
        </Field>
        <Field label="PROXY -p">
          <input className={control} value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="127.0.0.1:8080" spellCheck={false} />
        </Field>
        <Field label="EXTRA HEADER">
          <input className={control} value={extraHeader} onChange={(e) => setExtraHeader(e.target.value)} placeholder="X-Forwarded-For: 127.0.0.1" spellCheck={false} />
        </Field>
        <Field label="SAVE -f">
          <input className={control} value={outfile} onChange={(e) => setOutfile(e.target.value)} placeholder="wfuzz.txt" spellCheck={false} />
        </Field>
        <Field label="SAVE FORMAT">
          <select className={control} value={printer} onChange={(e) => setPrinter(e.target.value as typeof printer)}>
            <option value="raw">raw</option>
            <option value="json">json</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
            <button
              type="button"
              disabled={!shown}
              onClick={() => void navigator.clipboard.writeText(shown).catch(() => undefined)}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40"
            >
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </button>
          </div>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {shown || plan.note || "Type the base URL. The command appears when the wordlist and the filters are safe to run."}
          </pre>
        </div>
        <ToolRun
          endpoint="/api/wfuzz"
          disabled={!runnable}
          placeholder="--hc 403"
          onFlags={setExtraArgs}
          buildBody={(extra) => ({ args: [...plan.args, ...extra] })}
        />
        <div>
          <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
          <p className="mt-1 text-sm text-fg">{plan.why}</p>
          {plan.note ? <p className={"mt-2 text-sm " + (plan.stop ? "text-dead" : "text-muted")}>{plan.note}</p> : null}
        </div>
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">THEN</p>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">
            Open a 200 or a 301 in the browser. A different word count is the hit. If every line is the same size, the filter is wrong. Fix it. Do not start a bigger list.
          </pre>
        </div>
      </div>
    </article>
  );
}
