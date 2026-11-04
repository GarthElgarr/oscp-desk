export const AI_WHY: Record<string, string> = {
  "ai-order": `The four lines are notes, not commands. PEN-300 fails when the payload changes before the block is named. The first line is the parent that actually ran your code. The second line is the error, copied, not paraphrased. The third line is one control. The fourth line is one change. A new error after that change is a new control, and you start the list again.`,

  "ai-lab": `The two comments are the check. The course VPN range is the scope. An address outside it is not a harder lab. This desk does not decide that for you. You do, before the file is sent.`,

  "ai-defender": `Get-MpComputerStatus reads Defender's own state. RealTimeProtectionEnabled True means files are scanned as they land. IoavProtectionEnabled is the scan of downloads. Get-MpThreatDetection is the history. A file that vanishes and a row in that list is Defender, even if you expected AppLocker. RealTimeProtectionEnabled False means you are not evading anything. Use the file and move on.`,

  "ai-amsi": `The sentence about malicious content is AMSI inside the script host. The script was read and refused before it ran. That is different from Defender deleting an exe, and different from Constrained Language, which lets the script start and then blocks a call. AMServiceEnabled True supports the reading. A normal exception, a missing cmdlet, or access denied is your code. Do not bypass a bug.`,

  "ai-applocker": `Get-AppLockerPolicy -Effective is the policy that applies to you, including local and domain rules. -Xml writes it so you can read the rules later. Test-AppLockerPolicy asks that policy about one file. Denied on your exe and Allowed on a Microsoft binary is the setup for a trusted-binary card. The AppLocker event log is the confirmation. An empty policy and a program that starts means this control is absent.`,

  "ai-clm": `LanguageMode is a property of the session you are in. ConstrainedLanguage is the lockdown. FullLanguage is a normal session. A failure that names the language mode, or refuses Add-Type and .NET method calls, belongs on this card. A failure that says malicious content belongs on the AMSI card. They are often both present, and the error text says which one you just hit.`,

  "ai-proxy": `netsh winhttp show proxy is the proxy WinHTTP clients use. The registry values are the Internet Settings proxy, which is what a browser and many user programs use. ProxyEnable 1 and a ProxyServer means traffic is expected to go there. Test-NetConnection from the lab host to your Kali port is the raw path. The browser working and that test failing is the control. Rebuilding the shell does not open the port.`,

  "ai-office": `The process list is how you prove the document ran. ParentProcessId points at Word, Excel, or Outlook when the macro or the embedded object started your child. No child, and a Trust Center that has macros disabled, means the payload was never submitted to AMSI or AppLocker. Fix the lab setting the course named. Then look at the child.`,

  "ai-script": `Get-Command confirms the host exists and shows its path. Test-AppLockerPolicy on that path tells you if the host is allowed to start. The file you wrote is an argument. If the host is denied, obfuscating the argument does nothing. If the host starts and the script is then blocked, the new error is the next control.`,

  "ai-csharp": `csc.exe is the compiler that ships with the .NET Framework. The path is the 64-bit one. /out is the exe. /r adds a reference when the error is CS0246 and the type lives in an assembly you did not name. A clean compile only means the file was built. The first run is what meets the control. Compile on the lab machine so you are not also guessing about a Kali cross-compile.`,

  "ai-inject": `The three steps are the whole idea. Allocate asks the allowed process for memory. Write copies your code into that memory. Start makes the process run it. The callback then comes from that process, which is why Task Manager does not show your exe. An exception on allocate is not a shellcode problem. A new exe of yours means you did not inject. You started a program, and you are back on the AppLocker card.`,

  "ai-whitelist": `where.exe finds InstallUtil and MSBuild. Test-AppLockerPolicy on InstallUtil tells you the policy's answer. Allowed, while your exe is denied, is pursue. The callback or the process list must show that binary as the parent. A renamed exe is still your exe. The policy hashes or paths the file. It does not care what you called it.`,

  "ai-creds": `whoami /all shows the user and the privileges of this shell. cmdkey /list shows saved passwords Windows will try for you. klist shows Kerberos tickets in this session. A second name, a saved target, or a ticket you did not request is the hop. Empty output is a stop on this card. Shares and configs are the next place, not a deeper hash hunt with nothing to crack.`,

  "ai-lateral": `Test-NetConnection checks one port from the host that already has the session. 445 is SMB. 5985 is WinRM. The builders on the other desk run the tool once the port and the credential are real. Access denied on an unproven password is not a control to evade. A closed port is not a payload problem. The second host has its own policy. Start at the control cards again.`,

  "ai-sql": `1433 is the SQL port. Test-NetConnection from the machine that should see it is the check. The login you use is one you already have. The other desk builds mssqlclient. A failed login or a closed port ends the card. Commands on the SQL server come only after the server has accepted a privileged login, and the host you land on is a new control problem.`,

  "ai-chain": `The comment is the report row. Host is the machine. What ran is the parent or the binary the policy allowed. Control is the named block. Change is the one thing you did. Proof is the callback, the screenshot, or the new shell. A row without a proof does not go in the report. OSEP reads this path. A list of tool names does not explain it.`,

  "ai-stop": `The three comments are the brakes. A changed error is a new card. A parent that never started means the payload was never tested. An injection you cannot split into allocate, write, and start is not ready to rebuild. The fourth encoding of the same file, against the same sentence, is the dead case.`,
};
