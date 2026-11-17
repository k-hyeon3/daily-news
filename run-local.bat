@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] 최신 뉴스 수집 중... (실패해도 기존 data\news.json으로 계속 진행)
python tools\fetch_news.py
echo.
echo [2/2] 로컬 서버 시작: http://localhost:8787/
start "" http://localhost:8787/
python -m http.server 8787
