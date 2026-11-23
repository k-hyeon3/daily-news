# 에디터 픽 자동 생성을 Windows 작업 스케줄러에 등록한다(하루 6번: 07:10부터 3시간 간격).
# PC가 꺼져 있어 놓친 실행은 켜진 뒤 바로 실행된다. 해제: Unregister-ScheduledTask -TaskName "DailyNews-EditorPick" -Confirm:$false
$name = "DailyNews-EditorPick"
$script = Join-Path $PSScriptRoot "run_pick.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$triggers = @("07:10", "10:10", "13:10", "16:10", "19:10", "22:10") | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $triggers -Settings $settings -Description "하루 한 판 뉴스 에디터 픽을 Claude Code로 생성해 push" -Force | Out-Null
Get-ScheduledTask -TaskName $name | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
