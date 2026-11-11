# Dashboard refresh bridge (Cloudflare Workers)

이 Worker는 공개 GitHub Pages 대시보드에서 보낸 인증된 요청을 GitHub Actions의 `workflow_dispatch`로 전달합니다. GitHub 토큰은 Worker Secret에만 저장하며 브라우저 코드에는 넣지 않습니다.

## 1. Cloudflare Worker 생성

1. Cloudflare 대시보드 → Workers & Pages → Create → Worker를 만듭니다.
2. 이름은 예를 들어 `gold-market-refresh`로 지정합니다.
3. 배포 후 Edit code에서 이 폴더의 `worker.js` 전체를 붙여넣고 Deploy합니다.

## 2. Worker Secrets 설정

Worker → Settings → Variables and Secrets에서 아래 두 항목을 **Secret**으로 추가합니다.

- `GITHUB_TOKEN`: 이 저장소만 접근하도록 만든 GitHub Fine-grained Personal Access Token. Repository access는 `Only select repositories` → `gold-market-intelligence`, Repository permissions는 `Actions: Read and write`만 필요합니다. Contents 권한은 필요하지 않습니다.
- `REFRESH_SECRET`: 충분히 길고 추측하기 어려운 별도 비밀번호. GitHub 토큰과 같은 값을 쓰지 마세요.

토큰이나 비밀번호를 채팅, 저장소 파일, 프론트엔드 코드에 붙여넣지 마세요.

## 3. 대시보드 연결

Worker가 배포되면 `https://<worker-name>.<your-account-subdomain>.workers.dev` 형태의 URL이 생깁니다. 이 URL을 대시보드 설정에 연결하고, `REFRESH_SECRET` 값은 대시보드에서 최초 1회 입력해 브라우저에 저장하도록 구성합니다.

## 동작

대시보드 버튼 → Worker 인증 → GitHub Actions workflow_dispatch → 네이버 시세 수집 → `data/live-market.json` 갱신 → 대시보드가 새 JSON을 확인해 가격을 갱신합니다.

현재 Worker는 대시보드의 정확한 Origin(`https://superjake3.github.io`)만 허용합니다. Worker URL을 얻은 뒤 프론트엔드 연결을 마쳐야 버튼 기능이 완성됩니다.
