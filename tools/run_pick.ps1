# 에디터 픽 자동 생성: Claude Code를 대화 없이(-p) 실행해 오늘 호를 만들고 push 한다.
# 작업 스케줄러가 하루 6번 호출한다(tools\register_pick_task.ps1). 수동 실행: powershell -File tools\run_pick.ps1
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA "daily-news-pick"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("run-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".log")
$today = (Get-Date).ToString("yyyy-MM-dd")

# 환경 변수에 남은 API 키가 있으면 claude가 로그인 대신 그 키를 써서 실패하므로, 이 실행에서만 무시한다
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
Set-Location $root
$prompt = "Read tools/pick_prompt.md in this repository and follow it exactly. TODAY is $today (Asia/Seoul)."
$claude = Join-Path $env:USERPROFILE ".local\bin\claude.exe"
if (-not (Test-Path $claude)) { $claude = "claude" }

"[$(Get-Date -Format s)] 시작 TODAY=$today" | Out-File $log -Encoding utf8
# 긴 한글 프롬프트는 인자가 아니라 표준 입력으로 넘긴다(인자로 넘기면 따옴표·줄바꿈이 깨진다)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$tools = "WebSearch,Read,Write,Bash(python tools/fetch_news.py),Bash(python tools/add_edition.py --file .pick_tmp.json),Bash(rm .pick_tmp.json)"
$prompt | & $claude -p --permission-mode acceptEdits --allowedTools $tools 2>&1 | Out-File $log -Append -Encoding utf8
"[$(Get-Date -Format s)] 종료 exit=$LASTEXITCODE" | Out-File $log -Append -Encoding utf8
# 오래된 로그 정리(30개만 유지)
Get-ChildItem $logDir -Filter "run-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force
