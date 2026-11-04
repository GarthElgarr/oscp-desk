import type { Technique } from "./methodology";

export const AI_SECTIONS = [
  "Start",
  "Controls",
  "Foothold",
  "Run",
  "Move",
  "Chain",
] as const;

export const AI_TECHNIQUES: Technique[] = [
  {
    id: "ai-order",
    section: "Start",
    title: "One control at a time",
    look: "PEN-300 is a chain. A document or a script gets you on the host, a control stops the next thing, and you deal with that control. It is not an OSCP box where the port list is the whole start.",
    cmd: `# write this before you change a payload
# 1. How did code run? (document, script, service)
# 2. What stopped the next step? Copy the exact error.
# 3. Which control is that? Defender, AMSI, AppLocker, Constrained Language, a proxy.
# 4. One change aimed at that control. Then stop and read the new error.`,
    alive: "You can name the control in one sentence, and the last error matches that control.",
    dead: "You have three new payloads and you still cannot say which control blocked the first one.",
    next: "Open the control cards. Do not open Run until the control has a name.",
  },
  {
    id: "ai-lab",
    section: "Start",
    title: "Lab only",
    look: "This desk is for the OffSec labs on machines you are allowed to test. A control you bypass here is the point of the exercise. The same steps against a network you do not own are not practice.",
    cmd: `# before a payload leaves your Kali
# the target IP is in the lab VPN range
# you can say which lab machine it is`,
    alive: "The address is a lab machine from the course VPN.",
    dead: "The address is a company, a friend, or a scan you found. Stop.",
    next: "Name the machine, then identify the control.",
  },
  {
    id: "ai-defender",
    section: "Controls",
    title: "Defender is on or off",
    look: "Real-time protection decides whether a file on disk gets scanned. If it is off, you are not doing antivirus evasion. If it is on, a file that disappears or a threat-history line is the control working.",
    cmd: `Get-MpComputerStatus | Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, IoavProtectionEnabled
Get-MpThreatDetection | Select-Object -First 5 InitialDetectionTime, Resources, ThreatID`,
    alive: "RealTimeProtectionEnabled is True, and a file you dropped shows up in the threat list or vanishes.",
    dead: "RealTimeProtectionEnabled is False. Evasion is not the puzzle. Use the file.",
    next: "If the file dies on disk, the next question is AMSI only when the block happens inside a script host instead.",
  },
  {
    id: "ai-amsi",
    section: "Controls",
    title: "AMSI blocked the script",
    look: "AMSI is the scanner inside PowerShell, not the scanner that deletes an exe. The sentence in the error is the whole identification. A file that never touches disk can still be stopped here.",
    cmd: `# run the script. Read the red text. Do not change the script yet.
# This script contains malicious content and has been blocked by your antivirus software.
Get-MpComputerStatus | Select-Object AMServiceEnabled`,
    alive: "The error says malicious content and blocked. AMServiceEnabled is True. The script never started.",
    dead: "The error is a normal PowerShell exception, a missing command, or access denied. That is not AMSI. Fix the script.",
    next: "One change aimed at what AMSI saw. If the new error is different, you are on a new control. Name it before the next change.",
  },
  {
    id: "ai-applocker",
    section: "Controls",
    title: "AppLocker picked the binary",
    look: "AppLocker decides which programs are allowed to start. Your exe failing is not antivirus if the event says the policy blocked it. A binary that is allowed can still be the way your code runs.",
    cmd: `Get-AppLockerPolicy -Effective -Xml | Out-File C:\\Temp\\applocker.xml
Get-AppLockerPolicy -Effective | Test-AppLockerPolicy -Path C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -User $env:USERNAME
Get-WinEvent -LogName 'Microsoft-Windows-AppLocker/EXE and DLL' -MaxEvents 5 -ErrorAction SilentlyContinue | Format-List TimeCreated, Message`,
    alive: "Test-AppLockerPolicy says your program is denied, and an allowed Microsoft binary is still allowed. The event log names your file.",
    dead: "The policy is empty, or the event log is not there, and your program starts. AppLocker is not the control.",
    next: "Use a binary the policy allows. Do not keep rebuilding an exe the policy has already named.",
  },
  {
    id: "ai-clm",
    section: "Controls",
    title: "Constrained Language Mode",
    look: "Language mode is a PowerShell limit, not an antivirus. ConstrainedLanguage lets you run cmdlets and blocks the .NET calls a shell usually wants. FullLanguage means this is not your problem.",
    cmd: `$ExecutionContext.SessionState.LanguageMode`,
    alive: "The output is ConstrainedLanguage. Add-Type or a method call then fails with a language-mode error.",
    dead: "The output is FullLanguage. A later block is AMSI, AppLocker, or a normal bug.",
    next: "Stay inside what Constrained Language still allows, or leave PowerShell for a host the policy has not limited. Do not treat a language error as AMSI.",
  },
  {
    id: "ai-proxy",
    section: "Controls",
    title: "The proxy ate the callback",
    look: "A payload that is correct still fails when the only way out is a proxy. The proof is a browser that works and a raw port that does not. Egress is a control, the same as AppLocker.",
    cmd: `netsh winhttp show proxy
Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' | Select-Object ProxyEnable, ProxyServer
# from the host, not from Kali
Test-NetConnection <KALI> -Port 443`,
    alive: "A proxy is set, the browser can reach the internet, and Test-NetConnection to your Kali port fails.",
    dead: "No proxy, and the port test succeeds. The callback failed for another reason. Read the listener.",
    next: "Send the callback the way the browser does. A raw reverse shell to a blocked port will not start working if you rebuild it.",
  },
  {
    id: "ai-office",
    section: "Foothold",
    title: "The document is the start",
    look: "On this course the first code often runs because a person opened a document. Pursue means the expected child process started. A macro that is disabled never had a chance to be blocked by AMSI.",
    cmd: `# before you send it to the lab VM
# Word: File, Options, Trust Center, macro settings
# after it opens, on the VM
Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -ne 0 } | Select-Object Name, ProcessId, ParentProcessId`,
    alive: "Word, Excel, or Outlook is the parent of the process you meant to start.",
    dead: "Macros are disabled, or no child appears. The control never saw your code.",
    next: "Enable the lab setting the course told you to enable. Then identify the control that blocks the child, if one does.",
  },
  {
    id: "ai-script",
    section: "Foothold",
    title: "Script host, not a new exe",
    look: "cscript, wscript, and mshta are programs that are already on the machine. The course uses them when a new exe is the thing that gets blocked. The file you wrote is the argument, not the program that has to be allowed.",
    cmd: `Get-Command cscript, wscript, mshta | Select-Object Name, Source
# AppLocker, if you already saved the policy
Get-AppLockerPolicy -Effective | Test-AppLockerPolicy -Path C:\\Windows\\System32\\cscript.exe -User $env:USERNAME`,
    alive: "The host is allowed, and it starts. Your file is the argument it was given.",
    dead: "The host itself is denied by policy. Pick a different allowed host. Do not obfuscate a file the host never opened.",
    next: "If the host starts and then the script is blocked, that next error is AMSI or language mode. Name it.",
  },
  {
    id: "ai-csharp",
    section: "Run",
    title: "Compile on the lab box",
    look: "The course work is C#. Compile it on the machine that will run it, with the .NET Framework compiler that is already installed. A missing type is a missing assembly reference. It is not the control.",
    cmd: `C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe /out:C:\\Temp\\lab.exe C:\\Temp\\lab.cs
# if the error names a type you did not define
C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe /r:System.Management.Automation.dll /out:C:\\Temp\\lab.exe C:\\Temp\\lab.cs`,
    alive: "csc writes the exe and prints no error. file, or the VM, can start it far enough to hit the real control.",
    dead: "csc is not found, or the error is CS0246 for a type in a reference you forgot. Fix the build. Do not call that AppLocker.",
    next: "Run it once. Copy the first error that is not from csc.",
  },
  {
    id: "ai-inject",
    section: "Run",
    title: "Injection is three steps",
    look: "Injection puts your code inside a process the policy already allows. You are not starting a second exe. The three steps are allocate memory in that process, copy the code in, and start it. The proof is a callback from that process, not a new name in Task Manager.",
    cmd: `# name the three steps in your notes before you run
# 1. Which process is allowed, and its pid
Get-Process | Select-Object Id, ProcessName
# 2. Which step failed, copied from the exception
#    allocate, write, or start
# 3. The listener on Kali shows the callback from that process, or it does not`,
    alive: "The allowed process is the one that connected back. No new exe of yours is running.",
    dead: "A new exe of yours started, or the exception is on allocate and you started rewriting the shellcode. The step that failed is the bug.",
    next: "Fix the named step. A second shellcode format is for after the first format runs and the control still stops it.",
  },
  {
    id: "ai-whitelist",
    section: "Run",
    title: "A trusted binary loads your file",
    look: "When your exe is denied, an allowed Microsoft binary can still load a file you supply. InstallUtil, MSBuild, and the script hosts are that idea. The proof is the trusted process name, not a renamed copy of your exe.",
    cmd: `# denied: your exe. allowed: a Microsoft binary from the policy test
where.exe InstallUtil
where.exe MSBuild
Get-AppLockerPolicy -Effective | Test-AppLockerPolicy -Path C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\InstallUtil.exe -User $env:USERNAME`,
    alive: "The policy allows InstallUtil or MSBuild, denies your exe, and the callback parent is the allowed binary.",
    dead: "The trusted binary is also denied, or it starts and never loads your file. Read that error. Renaming your exe does not change the policy.",
    next: "Point the allowed binary at your file the way that binary expects. One attempt. Then read the new error.",
  },
  {
    id: "ai-creds",
    section: "Move",
    title: "Credentials after the foothold",
    look: "A shell on one lab workstation is the start of the chain. The next object is a credential, a ticket, or a token that reaches a second machine. Another evasion on the same host is not movement.",
    cmd: `whoami /all
cmdkey /list
klist
# only if you already have a reason to read a hive you copied off
# the OSCP desk has the secretsdump card`,
    alive: "A second username, a saved cmdkey, or a ticket for a host you have not touched.",
    dead: "whoami is the user you started as, cmdkey is empty, and klist has nothing you can reuse. Stop hunting hashes and check the shares.",
    next: "One credential, one target. The Kerberos Security desk has the builders if the hash needs cracking or a remote tool.",
  },
  {
    id: "ai-lateral",
    section: "Move",
    title: "Move with a credential you have",
    look: "Lateral movement here is the same idea as the other desk. You already have a password, a hash, or a ticket. The new part is that the tool you use has to be allowed on the far side as well.",
    cmd: `# from the foothold, one host from your notes
Test-NetConnection <other> -Port 445
Test-NetConnection <other> -Port 5985
# then the builder on the Kerberos Security desk: nxc, evil-winrm, or impacket`,
    alive: "The port is open and the credential is accepted. A session on the second host.",
    dead: "Access denied with a credential you have not proved, or the port is closed. Do not evade your way through a closed port.",
    next: "On the second host, start again at the control cards. The policy there is not the policy you already beat.",
  },
  {
    id: "ai-sql",
    section: "Move",
    title: "SQL is a hop, not a detour",
    look: "The course uses MSSQL when a chain reaches a database login. It is worth it when you have the login. It is not a thing to start because the workstation got hard.",
    cmd: `# the port, from the host that should be able to see it
Test-NetConnection <sql> -Port 1433
# then impacket-mssqlclient on the Kerberos Security desk, with the login you already have`,
    alive: "1433 answers and the login is accepted.",
    dead: "The port is closed, or the login fails. There is no SQL hop on this chain.",
    next: "Only if the server says you are privileged do you look at commands on the SQL host. Then name the control on that host.",
  },
  {
    id: "ai-chain",
    section: "Chain",
    title: "Write the chain as you go",
    look: "OSEP is graded on the path. A payload you cannot explain is a payload you cannot put in the report. Each hop is one sentence: what ran, what tried to stop it, what you changed, what the proof was.",
    cmd: `# one line per hop, in your notes
# host | what ran | control | change | proof
# WS01 | Word macro | AppLocker denied exe | InstallUtil | callback from InstallUtil`,
    alive: "You can read the list back and each line has a proof you saw.",
    dead: "The list says bypassed AV and does not name the control or the process.",
    next: "Keep the list next to the screenshots. The report is that list, written out.",
  },
  {
    id: "ai-stop",
    section: "Chain",
    title: "When to stop changing the payload",
    look: "A second encoding is useful only when the first one ran and the same control still stopped it. A new error means you are on a new card. Treating every failure as antivirus is how a lab day disappears.",
    cmd: `# stop if any of these is true
# the error text changed and you have not named the new control
# the file never executed because the parent never started
# you are editing shellcode and you do not know which of the three injection steps failed`,
    alive: "You stopped, named the new fact, and opened the matching card.",
    dead: "The payload is on its fourth encoding and the error is still the first error.",
    next: "Return to One control at a time. The chain card is where the day should end, not a folder of failed exes.",
  },
];
