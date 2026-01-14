#!/bin/bash

# 로그 모니터링 스크립트
# 에러 발생 시 즉시 알림

LOG_FILE="/tmp/trading-server.log"
LAST_CHECKED=$(date +%s)
ERROR_KEYWORDS=("ERROR" "error" "❌" "🚨" "CRITICAL" "Failed" "failed" "Exception" "EADDRINUSE" "ECONNREFUSED" "timeout" "TIMEOUT")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔍 로그 모니터링 시작..."
echo "📁 로그 파일: $LOG_FILE"
echo ""

while true; do
    # 최근 로그 확인 (마지막 체크 이후)
    CURRENT_TIME=$(date +%s)
    
    # 에러 키워드 검색
    ERRORS=$(tail -100 "$LOG_FILE" 2>/dev/null | grep -iE "$(IFS='|'; echo "${ERROR_KEYWORDS[*]}")" | tail -5)
    
    if [ ! -z "$ERRORS" ]; then
        echo ""
        echo "🚨🚨🚨 [$(date '+%Y-%m-%d %H:%M:%S')] 에러 감지! 🚨🚨🚨"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$ERRORS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    fi
    
    # 10초마다 체크
    sleep 10
done
