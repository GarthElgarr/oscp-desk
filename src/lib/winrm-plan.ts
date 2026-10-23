function hostOk(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(value);
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function winrmPlan(input: {
  host: string;
  user: string;
  secret: string;
  mode: "pass" | "hash";
  ssl: boolean;
}): { command: string; why: string } | { error: string } {
  const host = input.host.trim();
  const user = input.user.trim();
  const secret = input.secret.trim();
  if (!hostOk(host)) return { error: "The target is one IP or one host name." };
  if (!/^[A-Za-z0-9][A-Za-z0-9._$@-]{0,64}$/.test(user)) return { error: "The user is the account name, not domain\\user." };
  if (input.mode === "hash") {
    if (!/^[0-9a-fA-F]{32}$/.test(secret)) return { error: "The hash is the NT half, 32 hex characters. Do not include the LM half." };
  } else if (secret.length < 1 || secret.length > 128 || /[\r\n\0]/.test(secret)) {
    return { error: "The password is one line." };
  }
  const auth = input.mode === "hash" ? `-H ${secret}` : `-p ${quote(secret)}`;
  const ssl = input.ssl ? " -S" : "";
  return {
    command: `evil-winrm -i ${host} -u ${user} ${auth}${ssl}`,
    why: input.ssl
      ? "Paste this into your own terminal. -S is HTTPS, port 5986. -H is the NT hash and -p is a password. Never pass both. The desk would close this shell. whoami is the first command. upload and download are typed inside the shell, not in cmd."
      : "Paste this into your own terminal. nxc already said this login works. -i is the target, port 5985. -H is the NT hash and -p is a password. Never pass both. The desk would close this shell. whoami is the first command. upload and download are typed inside the shell, not in cmd.",
  };
}
