# 수동 시세 새로고침 설정

대시보드의 새로고침 버튼은 Cloudflare Worker를 통해 GitHub Actions의 `Update Live Market Quotes` workflow를 실행합니다. GitHub 토큰은 브라우저에 저장하지 않고 Worker Secret에만 보관합니다.

## 1. GitHub Fine-grained token 만들기
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
2. Resource owner: `superjake3`
3. Repository access: Only select repositories → `gold-market-intelligence`
4. Repository permissions: **Actions: Read and write**
5. 토큰을 생성하고 안전한 곳에 복사합니다. 이 토큰을 대시보드나 채팅에 입력하지 마세요.

## 2. Cloudflare Worker 만들기
1. Cloudflare Dashboard → Workers & Pages → Create → Create Worker
2. Worker 이름을 예를 들어 `gold-market-refresh`로 정하고 생성합니다.
3. Edit code를 열고 이 저장소의 `cloudflare/market-refresh-worker.js` 전체 내용을 붙여넣고 Deploy합니다.
4. Worker → Settings → Variables and Secrets에서 다음 두 항목을 **Secret**으로 등록합니다.
   - `GITHUB_TOKEN`: 1단계에서 만든 Fine-grained token
   - `REFRESH_KEY`: 직접 만든 긴 임의 문자열(최소 32자 권장). GitHub 토큰과 다른 값이어야 합니다.
5. `workers.dev` 주소가 활성화되어 있는지 확인합니다. 주소 예: `https://gold-market-refresh.<계정>.workers.dev`

Worker의 허용 Origin 기본값은 `https://superjake3.github.io`입니다. GitHub Pages 주소의 도메인이 다르면 Worker Secret/Variable이 아니라 일반 Variable `ALLOWED_ORIGIN`에 실제 사이트 Origin(경로 제외)을 등록하세요.

## 3. 대시보드 연결
1. GitHub Pages 배포가 끝난 뒤 대시보드를 새로 엽니다.
2. 상단 **시세 새로고침** 버튼을 누릅니다.
3. 처음 한 번 Worker 주소와 2단계에서 설정한 `REFRESH_KEY`를 입력합니다. 브라우저의 해당 사이트 저장소에만 보관됩니다.
4. 버튼이 수집을 요청하고, 새 `data/live-market.json`이 배포되면 화면에 반영합니다.

## 동작 방식
대시보드 → Cloudflare Worker → GitHub Actions 수동 실행 → 네이버 공개 시세 수집 → `data/live-market.json` 커밋 → GitHub Pages 배포 → 대시보드 반영.

자동 예약 수집은 비활성화되어 있습니다. 기존 네이버 수집 로직은 변경하지 않았습니다.
