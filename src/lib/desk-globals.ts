export type DeskGlobals = {
  localIp: string;
  iface: string;
  target: string;
};

const KEY = "oscp-desk-globals-v1";
const EMPTY: DeskGlobals = { localIp: "", iface: "", target: "" };

let current: DeskGlobals = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function clean(value: string): string {
  return value.replace(/[^\w./:-]/g, "").slice(0, 64);
}

function emit() {
  for (const listener of listeners) listener();
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<DeskGlobals>;
    current = {
      localIp: clean(typeof parsed.localIp === "string" ? parsed.localIp : ""),
      iface: clean(typeof parsed.iface === "string" ? parsed.iface : ""),
      target: clean(typeof parsed.target === "string" ? parsed.target : ""),
    };
  } catch {
    current = EMPTY;
  }
}

export function subscribeGlobals(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGlobals(): DeskGlobals {
  ensure();
  return current;
}

export function getGlobalsServer(): DeskGlobals {
  return EMPTY;
}

export function setGlobals(patch: Partial<DeskGlobals>) {
  ensure();
  current = {
    localIp: clean(patch.localIp ?? current.localIp),
    iface: clean(patch.iface ?? current.iface),
    target: clean(patch.target ?? current.target),
  };
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(current));
  emit();
}
