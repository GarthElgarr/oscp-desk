export const MATRIX_COLOR_KEY = "oscp-matrix-color";
export const DESK_RAIN = "#5aa878";
export const SHELL_RAIN = "#4696ff";

const listeners = new Set<() => void>();
let current = "";
let loaded = false;

function hexOk(value: string): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : "";
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  current = hexOk(localStorage.getItem(MATRIX_COLOR_KEY) ?? "");
}

export function subscribeMatrixColor(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMatrixColor(): string {
  ensure();
  return current;
}

export function getMatrixColorServer(): string {
  return "";
}

export function setMatrixColor(value: string) {
  ensure();
  current = hexOk(value);
  if (typeof window !== "undefined") {
    if (current) localStorage.setItem(MATRIX_COLOR_KEY, current);
    else localStorage.removeItem(MATRIX_COLOR_KEY);
  }
  for (const listener of listeners) listener();
}

export function rainPalette(hex: string): { fade: string; head: string; body: string; page: string } {
  const rgb = parseHex(hex) ?? parseHex(DESK_RAIN)!;
  const head = mix(rgb, { r: 255, g: 255, b: 255 }, 0.72);
  const fade = mix(rgb, { r: 0, g: 0, b: 0 }, 0.9);
  const page = mix(rgb, { r: 0, g: 0, b: 0 }, 0.93);
  return {
    fade: rgba(fade, 0.16),
    head: rgba(head, 0.95),
    body: rgba(rgb, 0.75),
    page: `rgb(${page.r}, ${page.g}, ${page.b})`,
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const safe = hexOk(hex);
  if (!safe) return null;
  return {
    r: Number.parseInt(safe.slice(1, 3), 16),
    g: Number.parseInt(safe.slice(3, 5), 16),
    b: Number.parseInt(safe.slice(5, 7), 16),
  };
}

function mix(from: { r: number; g: number; b: number }, to: { r: number; g: number; b: number }, amount: number) {
  const keep = 1 - amount;
  return {
    r: Math.round(from.r * keep + to.r * amount),
    g: Math.round(from.g * keep + to.g * amount),
    b: Math.round(from.b * keep + to.b * amount),
  };
}

function rgba(color: { r: number; g: number; b: number }, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}
