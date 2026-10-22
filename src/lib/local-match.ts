export type LocalHit = {
  title: string;
  state: "lead" | "dead" | "note";
  why: string;
  next: string;
};

export type LocalMatch = {
  kind: string;
  read: string;
  hits: LocalHit[];
};

type Kernel = {
  major: number;
  minor: number;
  patch: number;
  abi: number | null;
  distro: boolean;
  ubuntu: boolean;
  arch: string;
  raw: string;
};

function cmp(k: Kernel, major: number, minor: number, patch: number) {
  if (k.major !== major) return k.major - major;
  if (k.minor !== minor) return k.minor - minor;
  return k.patch - patch;
}

function ge(k: Kernel, major: number, minor: number, patch: number) {
  return cmp(k, major, minor, patch) >= 0;
}

function lt(k: Kernel, major: number, minor: number, patch: number) {
  return cmp(k, major, minor, patch) < 0;
}

function parseKernel(text: string): Kernel | null {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)(?:-(\d+))?/);
  if (!match) return null;
  const distro = /ubuntu|debian|-generic|red hat|el\d|microsoft|amzn/i.test(text) || Boolean(match[4]);
  const arch = /x86_64|amd64|aarch64|arm64|i[36]86/i.exec(text)?.[0] ?? "";
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    abi: match[4] ? Number(match[4]) : null,
    distro,
    ubuntu: /ubuntu/i.test(text),
    arch,
    raw: match[0],
  };
}

function dirtyPipe(k: Kernel): "vuln" | "safe" | "maybe" {
  if (lt(k, 5, 8, 0) || ge(k, 5, 17, 0)) return "safe";
  if (k.major === 5 && k.minor === 16) return lt(k, 5, 16, 11) ? "vuln" : "safe";
  if (k.major === 5 && k.minor === 15) return lt(k, 5, 15, 25) ? "vuln" : "safe";
  if (k.major === 5 && k.minor === 10) return lt(k, 5, 10, 102) ? "vuln" : "safe";
  return "maybe";
}

function kernelHits(k: Kernel): LocalHit[] {
  const hits: LocalHit[] = [];
  const pipe = dirtyPipe(k);
  const cow = ge(k, 2, 6, 22) && lt(k, 4, 8, 3);
  const overlay = k.ubuntu && ((k.major === 4 && k.minor === 15) || (k.major === 5 && (k.minor === 4 || k.minor === 8)));

  if (k.distro && k.abi !== null && k.patch === 0) {
    hits.push({
      title: "Distro kernel, not an upstream patch level",
      state: "note",
      why: `${k.raw} is a packaged kernel. The number after the hyphen is the distro build, not the upstream fix. 5.15.0-25 is not "5.15.25". Dirty Pipe and Dirty Cow cannot be declared from this string.`,
      next: "Finish sudo -l, SUID, capabilities, cron, and creds. Only then, one PoC you already practised for this exact package. If you do not know that package, this is not the exploit.",
    });
  }

  if (overlay) {
    hits.push({
      title: "Ubuntu OverlayFS, only if the string is Ubuntu",
      state: "note",
      why: "CVE-2021-3493 shows up on older Ubuntu kernels in the 4.15, 5.4, and 5.8 series, and Ubuntu patched it without making uname look new. A generic or Debian string is not this bug.",
      next: "Confirm the banner says Ubuntu. Misconfig list first. One PoC for that package, then stop. Do not also try Dirty Cow.",
    });
  }

  if (!k.distro && pipe === "vuln") {
    hits.push({
      title: "Dirty Pipe",
      state: "lead",
      why: `CVE-2022-0847. ${k.raw} is inside the upstream window: 5.8 through 5.16.10, except the fixed point releases 5.10.102, 5.15.25, and 5.16.11.`,
      next: "Kernel last. One PoC you have already compiled for this exact version. If it fails, the Linux list is finished.",
    });
  } else if (!k.distro && pipe === "maybe") {
    hits.push({
      title: "Dirty Pipe is possible, not proven",
      state: "note",
      why: `${k.raw} is in a 5.8 to 5.16 branch that received point-release fixes. The version is not one of the three windows that are unambiguous.`,
      next: "Do not download a new exploit. If this exact number is one you practised, one run. Otherwise stop.",
    });
  } else if (pipe === "safe" && ge(k, 5, 8, 0) === false) {
    hits.push({
      title: "Not Dirty Pipe",
      state: "dead",
      why: "Dirty Pipe starts at kernel 5.8. This build is older.",
      next: "Leave it. An older kernel is not automatically Dirty Cow either.",
    });
  } else if (pipe === "safe") {
    hits.push({
      title: "Not Dirty Pipe",
      state: "dead",
      why: `${k.raw} is on a fixed point release or newer than 5.16.10.`,
      next: "Do not run a Dirty Pipe PoC against a patched number.",
    });
  }

  if (!k.distro && cow) {
    hits.push({
      title: "Dirty Cow",
      state: "lead",
      why: `CVE-2016-5195. ${k.raw} sits in the upstream range 2.6.22 through 4.8.2. A vendor patch can still have landed without moving that number.`,
      next: "Misconfig list first. One PoC you practised. A failure means it was patched. Stop. Do not tune it.",
    });
  } else if (k.distro && cow) {
    hits.push({
      title: "Dirty Cow is not proven",
      state: "dead",
      why: "The base version is old enough, and this is a distro kernel. Ubuntu and Debian shipped the fix inside builds that still look like 3.13 and 4.4.",
      next: "Do not run Dirty Cow because the number looks old.",
    });
  } else if (!cow) {
    hits.push({
      title: "Not Dirty Cow",
      state: "dead",
      why: "Dirty Cow is kernels before 4.8.3. This build is outside that range.",
      next: "Leave it.",
    });
  }

  if (!k.distro && ge(k, 4, 4, 0) && lt(k, 4, 14, 0)) {
    hits.push({
      title: "eBPF verifier, only with the sysctl",
      state: "note",
      why: "CVE-2017-16995 needs kernel 4.4 through 4.13 and unprivileged BPF still enabled. The version alone is not the bug.",
      next: "sysctl kernel.unprivileged_bpf_disabled. A 1 or a 2 means stop. A 0 is the lead, and only after the misconfig list.",
    });
  }

  if (!overlay && hits.every((hit) => hit.state === "dead")) {
    hits.unshift({
      title: "Not on the short list",
      state: "dead",
      why: `${k.raw} does not match Dirty Pipe, Dirty Cow, or the eBPF window.`,
      next: "Stop. searchsploit of a generic 'linux kernel' is how this hour disappears. PwnKit is pkexec --version. Baron is sudo --version. Neither is uname.",
    });
  }

  return hits;
}

function sudoHits(text: string): LocalHit[] | null {
  const match = text.match(/sudo version\s+([0-9]+(?:\.[0-9]+){1,3}(?:p[0-9]+)?)/i);
  if (!match) return null;
  const version = match[1];
  const vulnerable =
    (/^1\.8\.(?:[2-9]|[12][0-9]|30|31)(?:p1)?$/.test(version) && version !== "1.8.31p2") ||
    /^1\.9\.[0-4](?:\.|$|p)/.test(version) ||
    /^1\.9\.5(?:p1)?$/.test(version);
  const patched = version === "1.8.31p2" || /^1\.9\.5p([2-9]|\d\d)/.test(version) || /^1\.9\.([6-9]|\d\d)/.test(version);
  if (vulnerable && !patched) {
    return [
      {
        title: "Baron Samedit, version only",
        state: "note",
        why: `${version} is inside 1.8.2–1.8.31p1 or 1.9.0–1.9.5p1. A backport can keep an old number and still be patched.`,
        next: "The Baron cards. sudoedit -s / is the test. A usage: line means stop. Do not fetch a PoC yet.",
      },
    ];
  }
  return [
    {
      title: "Not Baron Samedit",
      state: "dead",
      why: `${version} is 1.8.31p2, 1.9.5p2, or newer, or it is outside both windows.`,
      next: "Do not run a Baron PoC. Go back to the Linux list.",
    },
  ];
}

function windowsHits(text: string): LocalMatch | null {
  if (!/OS Name:|Windows (Server|7|8|10|11)/i.test(text)) return null;
  const name = /OS Name:\s*(.+)/i.exec(text)?.[1]?.trim() ?? "Windows";
  const build = Number(/Build\s+(\d+)/i.exec(text)?.[1] ?? /10\.0\.(\d+)/.exec(text)?.[1] ?? 0);
  const arch = /System Type:\s*(.+)/i.exec(text)?.[1]?.trim() ?? (/x64|64-bit/i.test(text) ? "x64" : "unknown");
  const hotfixes = Number(/(\d+)\s+Hotfix/i.exec(text)?.[1] ?? NaN);
  const hits: LocalHit[] = [];
  const x64 = /x64|64/i.test(arch);

  hits.push({
    title: x64 ? "64-bit binaries" : "Check the arch before you upload",
    state: "note",
    why: `System Type is ${arch}. An x86 Potato on an x64-only host is not a failed exploit.`,
    next: "whoami /priv still decides the Potato. systeminfo cannot see SeImpersonate.",
  });

  if (build >= 20348 || /server 2022|windows 11/i.test(name)) {
    hits.push({
      title: "Kernel exploit is dead",
      state: "dead",
      why: `${name}, build ${build || "current"}. A hotfix list on this generation means the kernel card is finished before you open it.`,
      next: "Services, unquoted paths, tasks, creds. Potato only if whoami /priv lists SeImpersonate. PrintSpoofer if the spooler is running, otherwise GodPotato. JuicyPotato is the wrong tool.",
    });
  } else if (build >= 17763 || /server 2019|windows 10/i.test(name)) {
    hits.push({
      title: "Not a kernel lead",
      state: "dead",
      why: `${name}, build ${build || "17763+"}. JuicyPotato does not work here. A kernel suggestion from systeminfo is the time sink.`,
      next: "whoami /priv. PrintSpoofer or GodPotato only when the privilege is present. Two failures, then stop.",
    });
  } else if (build > 0 && build <= 14393) {
    hits.push({
      title: "Old enough to look, after the list",
      state: "note",
      why: `${name}, build ${build}. ${Number.isFinite(hotfixes) ? hotfixes + " hotfix(es). " : ""}A short hotfix list is a reason to keep the kernel card for last. It is not a named exploit yet.`,
      next: "Finish the Windows misconfig cards. MS17-010 is the SMB script, one run, only if that script says VULNERABLE. Do not pick an exploit from the OS name.",
    });
  }

  if (Number.isFinite(hotfixes) && hotfixes >= 15 && !hits.some((hit) => hit.title.startsWith("Kernel"))) {
    hits.push({
      title: "Hotfix list is long",
      state: "dead",
      why: `${hotfixes} hotfixes. That is a patched box until a misconfig says otherwise.`,
      next: "Leave the kernel. Read whoami /priv and the service cards.",
    });
  }

  return {
    kind: "systeminfo",
    read: `${name}. Build ${build || "not found"}. ${arch}.`,
    hits,
  };
}

export function matchLocal(raw: string): LocalMatch | null {
  const text = raw.replace(/\r/g, "");
  if (!text.trim()) return null;

  const windows = windowsHits(text);
  if (windows && /OS Name:|Hotfix|System Type:/i.test(text)) return windows;

  const sudo = sudoHits(text);
  if (sudo && /sudo version/i.test(text) && !/Linux version|Linux \S+ \d+\.\d+/i.test(text)) {
    return { kind: "sudo", read: "sudo version, not a kernel.", hits: sudo };
  }

  const kernel = parseKernel(text);
  if (!kernel) {
    return {
      kind: "unknown",
      read: "No kernel version and no systeminfo block.",
      hits: [
        {
          title: "Nothing to match",
          state: "dead",
          why: "Paste uname -a, the Linux version line from /proc/version, sudo --version, or systeminfo.",
          next: "A product banner belongs on the service card, not here.",
        },
      ],
    };
  }

  const hits = kernelHits(kernel);
  if (sudo) hits.unshift(...sudo);
  const arch = kernel.arch ? ` ${kernel.arch}.` : "";
  return {
    kind: kernel.distro ? "distro kernel" : "upstream kernel",
    read: `${kernel.raw}.${arch} ${kernel.distro ? "Treated as a distro build." : "Treated as an upstream version."}`,
    hits,
  };
}
