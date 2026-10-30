/** A small screen that obeys carriage return and cursor-up, the way a terminal does. */
export function createTerminalFeed(onText: (full: string) => void) {
  const rows: string[] = [""];
  let row = 0;
  let col = 0;
  let pending = "";
  let touched = false;

  const ensure = (index: number) => {
    while (rows.length <= index) rows.push("");
  };
  const put = (ch: string) => {
    ensure(row);
    const line = rows[row];
    rows[row] = col >= line.length ? line + " ".repeat(col - line.length) + ch : line.slice(0, col) + ch + line.slice(col + 1);
    col += 1;
  };
  const eraseEnd = () => {
    ensure(row);
    rows[row] = rows[row].slice(0, col);
  };
  const render = () => {
    let end = rows.length;
    while (end > 1 && rows[end - 1] === "") end -= 1;
    return rows
      .slice(0, end)
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .filter((line) => !line.includes("Pycurl is not compiled against Openssl"))
      .join("\n");
  };
  const apply = (cmd: string, params: string) => {
    const count = Number(params.split(";")[0] || "1");
    const n = Number.isFinite(count) && count > 0 ? count : 1;
    if (cmd === "A") row = Math.max(0, row - n);
    else if (cmd === "B") {
      row += n;
      ensure(row);
    } else if (cmd === "C") col += n;
    else if (cmd === "D") col = Math.max(0, col - n);
    else if (cmd === "K") eraseEnd();
    else if (cmd === "J" && (params === "2" || params === "3")) {
      rows.splice(0, rows.length, "");
      row = 0;
      col = 0;
    }
  };
  const write = (chunk: string) => {
    touched = true;
    const text = pending + chunk;
    pending = "";
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (c === "\r") {
        col = 0;
        continue;
      }
      if (c === "\n") {
        row += 1;
        col = 0;
        ensure(row);
        continue;
      }
      if (c === "\b") {
        col = Math.max(0, col - 1);
        continue;
      }
      if (c === "\x1b") {
        const next = text[i + 1];
        if (next === "[") {
          let j = i + 2;
          let params = "";
          while (j < text.length && /[0-9;?]/.test(text[j])) {
            params += text[j];
            j += 1;
          }
          if (j >= text.length) {
            pending = text.slice(i);
            break;
          }
          apply(text[j], params);
          i = j;
          continue;
        }
        if (!next) {
          pending = text.slice(i);
          break;
        }
        continue;
      }
      if (c < " " && c !== "\t") continue;
      put(c);
    }
    onText(render());
  };
  return { write, flush: () => { if (touched) onText(render()); } };
}

export function renderTerminal(text: string): string {
  let out = "";
  const feed = createTerminalFeed((full) => {
    out = full;
  });
  feed.write(text);
  feed.flush();
  return out;
}
