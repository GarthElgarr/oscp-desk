import { accessLabel, hostLabel, hostStarted, type ExamReport, type HostReport } from "./report-model";

export type JpegShot = { jpeg: Uint8Array; w: number; h: number };

const PAGE_W = 595;
const PAGE_H = 842;
const LEFT = 54;
const RIGHT = 541;
const CONTENT_W = RIGHT - LEFT;
const WIDTHS: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833,
  n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
};

type Font = "F1" | "F2" | "F3";

function normalize(input: string): string {
  return input
    .replaceAll("\u2014", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u2026", "...")
    .replaceAll("\u00a0", " ")
    .replaceAll(/[^\u0000-\u00ff]/g, "?");
}

function textWidth(text: string, size: number, mono: boolean): number {
  if (mono) return text.length * size * 0.6;
  let width = 0;
  for (const ch of text) width += ((WIDTHS[ch] ?? 500) * size) / 1000;
  return width;
}

function fit(text: string, size: number, max: number): string {
  const full = normalize(text);
  if (max <= 0) return "";
  if (textWidth(full, size, false) <= max) return full;
  const mark = "...";
  let shown = full;
  while (shown.length > 0 && textWidth(shown + mark, size, false) > max) shown = shown.slice(0, -1);
  if (!shown) return textWidth(mark, size, false) <= max ? mark : "";
  return shown + mark;
}

function wrap(text: string, size: number, mono: boolean, max: number): string[] {
  const lines: string[] = [];
  for (const raw of normalize(text).split("\n")) {
    if (!raw.trim()) {
      lines.push("");
      continue;
    }
    let cur = "";
    for (const word of raw.split(/(\s+)/)) {
      if (!word) continue;
      if (textWidth(cur + word, size, mono) <= max) {
        cur += word;
        continue;
      }
      if (cur.trim()) lines.push(cur.replace(/\s+$/, ""));
      let piece = word.replace(/^\s+/, "");
      if (textWidth(piece, size, mono) <= max) {
        cur = piece;
        continue;
      }
      let chunk = "";
      for (const ch of piece) {
        if (textWidth(chunk + ch, size, mono) > max && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      cur = chunk;
    }
    lines.push(cur.replace(/\s+$/, ""));
  }
  return lines.length ? lines : [""];
}

function pdfString(text: string): string {
  let out = "(";
  for (const ch of normalize(text)) {
    const code = ch.charCodeAt(0);
    if (code === 40 || code === 41 || code === 92) out += `\\${ch}`;
    else if (code < 32 || code > 126) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += ch;
  }
  return `${out})`;
}

function enc(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

type PageImage = { name: string; jpeg: Uint8Array; w: number; h: number; ref: number };
type Page = { cmds: string[]; images: PageImage[] };

export function buildReportPdf(report: ExamReport, shots: Map<string, JpegShot>): Uint8Array {
  const pages: Page[] = [];
  let y = 0;
  let figure = 0;

  function page(): Page {
    const next: Page = { cmds: [], images: [] };
    pages.push(next);
    const n = pages.length;
    next.cmds.push("0.35 0.35 0.35 rg", "BT", "/F1 9 Tf", `1 0 0 1 ${LEFT} 812 Tm`, `${pdfString("OSCP Exam Report")} Tj`, "ET");
    const title = "OSCP Exam Report";
    const titleW = textWidth(title, 9, false);
    const id = fit(report.osid.trim() || "OS-XXXXX", 9, Math.max(36, CONTENT_W - titleW - 16));
    const idW = textWidth(id, 9, false);
    const idX = Math.max(LEFT, RIGHT - idW);
    next.cmds.push("BT", "/F1 9 Tf", `1 0 0 1 ${idX.toFixed(2)} 812 Tm`, `${pdfString(id)} Tj`, "ET", "0.75 0.75 0.75 RG", "0.6 w", `${LEFT} 804 m ${RIGHT} 804 l S`);
    next.cmds.push("0.35 0.35 0.35 rg", "BT", "/F1 9 Tf", `1 0 0 1 ${LEFT} 32 Tm`, `${pdfString(`Page ${n}`)} Tj`, "ET", "0 0 0 rg");
    y = 786;
    return next;
  }

  function cur(): Page {
    return pages[pages.length - 1] ?? page();
  }

  function need(height: number) {
    if (!pages.length || y - height < 52) page();
  }

  function line(text: string, font: Font, size: number, mono: boolean, color = "0 0 0") {
    const rows = wrap(text, size, mono, CONTENT_W);
    for (const row of rows) {
      need(size + 4);
      y -= size;
      if (row) {
        cur().cmds.push(`${color} rg`, "BT", `/${font} ${size} Tf`, `1 0 0 1 ${LEFT} ${y.toFixed(2)} Tm`, `${pdfString(row)} Tj`, "ET");
      }
      y -= 4;
    }
  }

  function gap(n: number) {
    y -= n;
  }

  function paragraph(text: string, font: Font, size: number, mono: boolean, leading: number, color = "0 0 0") {
    const lines = wrap(text.trim() ? text : "Not recorded.", size, mono, CONTENT_W);
    for (const row of lines) {
      need(leading);
      y -= leading;
      if (row) {
        cur().cmds.push(`${color} rg`, "BT", `/${font} ${size} Tf`, `1 0 0 1 ${LEFT} ${y.toFixed(2)} Tm`, `${pdfString(row)} Tj`, "ET");
      }
    }
  }

  function heading(text: string, size: number, before: number) {
    need(before + size + 16);
    gap(before);
    line(text, "F2", size, false);
  }

  function prose(text: string, empty: string) {
    const body = text.trim() || empty;
    if (!body) return;
    const lines = wrap(body, 9, true, CONTENT_W - 16);
    let index = 0;
    while (index < lines.length) {
      if (y - 24 < 52) page();
      const fit = Math.max(1, Math.floor((y - 52 - 12) / 12));
      const slice = lines.slice(index, index + fit);
      const height = slice.length * 12 + 12;
      const top = y;
      const bottom = y - height;
      cur().cmds.push("0.96 0.96 0.96 rg", `${LEFT} ${bottom.toFixed(2)} ${CONTENT_W} ${height.toFixed(2)} re f`);
      slice.forEach((row, rowIndex) => {
        if (!row) return;
        const baseline = top - 14 - rowIndex * 12;
        cur().cmds.push("0 0 0 rg", "BT", "/F3 9 Tf", `1 0 0 1 ${LEFT + 8} ${baseline.toFixed(2)} Tm`, `${pdfString(row)} Tj`, "ET");
      });
      y = bottom - 8;
      index += slice.length;
    }
  }

  function meta(label: string, value: string) {
    const rows = wrap(value.trim() || "Not recorded", 11, false, CONTENT_W - 110);
    for (let i = 0; i < rows.length; i += 1) {
      need(16);
      y -= 14;
      if (i === 0) {
        cur().cmds.push("BT", "/F2 11 Tf", `1 0 0 1 ${LEFT} ${y.toFixed(2)} Tm`, `${pdfString(label)} Tj`, "ET");
      }
      cur().cmds.push("BT", "/F1 11 Tf", `1 0 0 1 ${LEFT + 110} ${y.toFixed(2)} Tm`, `${pdfString(rows[i])} Tj`, "ET");
    }
  }

  function table(rows: string[][]) {
    const cols = [150, 110, 227];
    const rowH = 18;
    const all = [["Host", "IP", "Reached"], ...rows];
    for (const row of all) {
      need(rowH + 2);
      y -= rowH;
      cur().cmds.push("0.75 0.75 0.75 RG", "0.4 w", `${LEFT} ${y.toFixed(2)} ${CONTENT_W} ${rowH} re S`);
      let x = LEFT + 4;
      row.forEach((cell, index) => {
        const font: Font = all[0] === row ? "F2" : "F1";
        const shown = fit(cell, 9, cols[index] - 8);
        cur().cmds.push("0 0 0 rg", "BT", `/${font} 9 Tf`, `1 0 0 1 ${x} ${(y + 5).toFixed(2)} Tm`, `${pdfString(shown)} Tj`, "ET");
        x += cols[index];
      });
    }
    gap(8);
  }

  function image(shot: JpegShot, caption: string) {
    const jpeg = shot.jpeg;
    const valid =
      jpeg &&
      jpeg.length > 4 &&
      jpeg[0] === 0xff &&
      jpeg[1] === 0xd8 &&
      Number.isFinite(shot.w) &&
      Number.isFinite(shot.h) &&
      shot.w > 0 &&
      shot.h > 0;
    if (!valid) {
      prose("", "Screenshot could not be placed. The file was empty or not a JPEG.");
      return;
    }
    const iw = Math.max(1, Math.round(shot.w));
    const ih = Math.max(1, Math.round(shot.h));
    let dw = CONTENT_W;
    let dh = (ih * dw) / iw;
    const maxH = 360;
    if (!Number.isFinite(dh) || dh <= 0) {
      prose("", "Screenshot could not be placed. The file was empty or not a JPEG.");
      return;
    }
    if (dh > maxH) {
      dh = maxH;
      dw = (iw * dh) / ih;
    }
    if (y - (dh + 28) < 52) page();
    figure += 1;
    y -= dh;
    const name = `Im${figure}`;
    const x = LEFT + Math.max(0, (CONTENT_W - dw) / 2);
    cur().images.push({ name, jpeg, w: iw, h: ih, ref: 0 });
    cur().cmds.push("q", `${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`, `/${name} Do`, "Q");
    gap(4);
    line(`Figure ${figure}. ${caption.trim() || "Proof screenshot."}`, "F1", 9, false, "0.25 0.25 0.25");
    gap(6);
  }

  function hostBlock(host: HostReport, number: string, index: number) {
    const os = host.os.trim() ? ` (${host.os.trim()})` : "";
    heading(`${number} ${hostLabel(host, index)} - ${host.ip.trim() || "IP not recorded"}${os}`, 13, 12);
    paragraph(`Reached: ${accessLabel(host.access)}.`, "F1", 11, false, 14);
    heading(`${number}.1 Service enumeration`, 12, 8);
    prose(host.enumeration, "Not recorded.");
    heading(`${number}.2 Initial access`, 12, 8);
    prose(host.foothold, "Not recorded.");
    heading(`${number}.3 Privilege escalation`, 12, 8);
    prose(host.privesc, host.access === "full" ? "Not recorded." : "Privilege escalation was not reached.");
    heading(`${number}.4 Proof`, 12, 8);
    paragraph(`local.txt: ${host.localFlag.trim() || "Not obtained."}`, "F1", 11, false, 14);
    paragraph(`proof.txt: ${host.proofFlag.trim() || "Not obtained."}`, "F1", 11, false, 14);
    for (const shot of host.shots) {
      const file = shots.get(shot.id);
      if (!file) {
        prose("", "Screenshot file was not in this browser.");
        continue;
      }
      image(file, shot.caption);
    }
  }

  page();
  gap(80);
  line("OFFENSIVE SECURITY", "F1", 11, false, "0.25 0.25 0.25");
  gap(8);
  line("OSCP Exam Report", "F2", 22, false);
  gap(16);
  meta("Student", report.name);
  meta("OSID", report.osid);
  meta("Email", report.email);
  meta("Exam date", report.examDate);
  meta("Report date", report.reportDate);

  page();
  heading("1. Introduction", 16, 4);
  prose(report.intro, "Not recorded.");
  heading("2. High-level summary", 16, 14);
  const started = report.hosts.filter(hostStarted);
  if (started.length) {
    table(
      started.map((host) => {
        const index = report.hosts.filter((item) => item.kind === host.kind).indexOf(host);
        return [hostLabel(host, index), host.ip.trim() || "-", accessLabel(host.access)];
      }),
    );
  }
  prose(report.summary, "Not recorded.");
  heading("3. Recommendations", 16, 14);
  prose(report.recommendations, started.some((host) => host.fix.trim()) ? "" : "Not recorded.");
  for (const host of started) {
    if (!host.fix.trim()) continue;
    const index = report.hosts.filter((item) => item.kind === host.kind).indexOf(host);
    paragraph(`${hostLabel(host, index)} - ${host.fix.trim()}`, "F1", 11, false, 14);
  }

  heading("4. Independent challenges", 16, 14);
  const stand = started.filter((host) => host.kind === "standalone");
  if (!stand.length) prose("", "No standalone host is included.");
  stand.forEach((host, index) => hostBlock(host, `4.${index + 1}`, index));

  heading("5. Active Directory", 16, 14);
  heading("5.1 Domain", 12, 8);
  const domainText = [report.domain.trim() && `Domain: ${report.domain.trim()}`, report.adUser.trim() && `Starting credential: ${report.adUser.trim()}`, report.adNarrative.trim()]
    .filter(Boolean)
    .join("\n");
  prose(domainText, "Not recorded.");
  const ad = started.filter((host) => host.kind === "ad");
  if (!ad.length) prose("", "No Active Directory host is included.");
  ad.forEach((host, index) => hostBlock(host, `5.${index + 2}`, index));

  const fonts = [
    enc("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    enc("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
    enc("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>"),
  ];
  const pageObjs: Uint8Array[] = [];
  const contentObjs: Uint8Array[] = [];
  const imageObjs: Uint8Array[] = [];
  let nextId = 6 + pages.length * 2;
  for (const item of pages) {
    for (const image of item.images) {
      image.ref = nextId;
      nextId += 1;
      const header = enc(`<< /Type /XObject /Subtype /Image /Width ${image.w} /Height ${image.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`);
      const footer = enc("\nendstream");
      imageObjs.push(concat([header, image.jpeg, footer]));
    }
  }
  pages.forEach((item, index) => {
    const contentId = 7 + index * 2;
    const xobjects = item.images.map((image) => `/${image.name} ${image.ref} 0 R`).join(" ");
    const dict = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> /XObject << ${xobjects} >> >> /Contents ${contentId} 0 R >>`;
    pageObjs.push(enc(dict));
    const stream = item.cmds.join("\n");
    const streamBytes = enc(stream);
    contentObjs.push(concat([enc(`<< /Length ${streamBytes.length} >>\nstream\n`), streamBytes, enc("\nendstream")]));
  });

  const kids = pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ");
  const objects: Uint8Array[] = [
    enc("<< /Type /Catalog /Pages 2 0 R >>"),
    enc(`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`),
    ...fonts,
  ];
  pages.forEach((_, index) => {
    objects.push(pageObjs[index], contentObjs[index]);
  });
  objects.push(...imageObjs);

  const header = enc("%PDF-1.4\n");
  const chunks: Uint8Array[] = [header];
  const offsets = [0];
  let pos = header.length;
  objects.forEach((obj, index) => {
    offsets.push(pos);
    const lead = enc(`${index + 1} 0 obj\n`);
    const tail = enc("\nendobj\n");
    chunks.push(lead, obj, tail);
    pos += lead.length + obj.length + tail.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) xref += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF`;
  chunks.push(enc(xref));
  return concat(chunks);
}
