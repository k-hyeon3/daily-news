# 바탕화면에 '하루 한 판 뉴스' 바로가기를 만든다. 주소창 없는 앱 창으로 열린다.
# 사용: powershell -ExecutionPolicy Bypass -File tools\make_shortcut.ps1
#       (주소를 바꾸려면 -Url "https://...", 로컬 서버로 열려면 -Url http://localhost:8787/)
param(
  [string]$Url = "https://k-hyeon3.github.io/daily-news/",
  [string]$Name = "하루 한 판 뉴스"
)

$root = Split-Path -Parent $PSScriptRoot
$icon = Join-Path $root "icons\icon.ico"

# Chrome을 먼저, 없으면 Edge를 쓴다(둘 다 --app 모드를 지원한다)
$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { Write-Error "Chrome 또는 Edge를 찾지 못했습니다."; exit 1 }

$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "$Name.lnk"

$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut($lnkPath)
$lnk.TargetPath = $browser
$lnk.Arguments = "--app=$Url"
$lnk.WorkingDirectory = Split-Path -Parent $browser
$lnk.IconLocation = "$icon,0"
$lnk.Description = $Name
$lnk.Save()

Write-Output "만들었습니다: $lnkPath"
Write-Output "브라우저: $browser"
Write-Output "주소: $Url"
