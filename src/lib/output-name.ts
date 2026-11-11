/** A file name saved under scans/<tool>/. No folders, no dotfiles, no source names such as package.json. */
export const OUTPUT_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}\.(?:txt|out|log|csv|pot|hc|restore)$/;

export const PLAIN_OUTPUT = "That output file has to be a plain name, such as out.txt.";

const SESSION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/;
const PRINTER = /^[A-Za-z0-9]{1,20}$/;

export function outputBasename(value: string): string | null {
  if (!OUTPUT_NAME.test(value)) return null;
  return value;
}

export function sessionBasename(value: string): string | null {
  if (!SESSION_NAME.test(value)) return null;
  return value;
}

export function wfuzzOutput(value: string): { name: string; printer: string } | null {
  const comma = value.indexOf(",");
  if (comma <= 0) return null;
  const name = outputBasename(value.slice(0, comma));
  const printer = value.slice(comma + 1);
  if (!name || !PRINTER.test(printer)) return null;
  return { name, printer };
}
