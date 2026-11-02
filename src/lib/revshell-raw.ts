export type RevshellData = {
  specialCommands: Record<string, string>;
  reverseShellCommands: { name: string; command: string }[];
};

export function rawShell(
  data: RevshellData,
  input: { name: string; ip: string; port: string; shell: string; value: string | null },
): string | null {
  if (input.value != null && input.value !== "") return clip(input.value);
  const name = input.name;
  const selected = data.reverseShellCommands.find((item) => item.name === name);
  if (!selected) return null;
  return clip(fill(data, selected.command, input));
}

function clip(text: string): string {
  return text.replace(/\r/g, "").slice(0, 50000);
}

function fill(data: RevshellData, command: string, input: { ip: string; port: string; shell: string }): string {
  const ip = input.ip.replace(/[\r\n]/g, "");
  const port = input.port.replace(/[\r\n]/g, "");
  const shell = input.shell.replace(/[\r\n]/g, "");
  if (command === "PowerShell #3 (Base64)") {
    return "powershell -e " + btoa(swap(data.specialCommands["PowerShell payload"] ?? "", ip, port, shell));
  }
  if (command === "PowerShell #5 (stderr support) (Base64)") {
    return "powershell -e " + btoa(swap(data.specialCommands["PowerShell +stderr payload"] ?? "", ip, port, shell));
  }
  return swap(command, ip, port, shell);
}

function swap(command: string, ip: string, port: string, shell: string): string {
  return command.replaceAll("{ip}", ip).replaceAll("{port}", port).replaceAll("{shell}", shell);
}
