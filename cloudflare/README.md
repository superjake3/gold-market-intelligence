# Cloudflare Worker (legacy)

현재 금 시세 대시보드는 Cloudflare Worker를 사용하지 않습니다. 새로고침 버튼은 GitHub에 저장된 `data/live-market.json`을 다시 불러오기만 하며, 시세 수집은 GitHub Actions가 1시간 간격으로 자동 실행합니다.

이 디렉터리의 Worker 코드는 이전 수동 수집 방식의 참고용으로 남겨 둔 것입니다. 현재 운영을 위해 배포하거나 설정할 필요가 없습니다.
