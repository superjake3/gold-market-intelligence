# GOLD MARKET INTELLIGENCE

국제 금·원달러 환율·KRX 금시장 가격을 한곳에서 확인하는 독립형 개인 대시보드입니다.

## 배포
- GitHub Pages로 배포합니다.
- 저장소 Settings → Pages → Build and deployment에서 Source를 **GitHub Actions**로 설정합니다.
- `.github/workflows/pages.yml`이 main 브랜치 변경 시 사이트를 배포합니다.

## KRX 자동 수집
- 저장소 Settings → Secrets and variables → Actions → New repository secret
- Name: `KRX_AUTH_KEY`
- Value: KRX Open API에서 발급받은 인증키
- Actions 탭에서 **Update KRX Gold Market Price**를 선택해 Run workflow로 최초 실행할 수 있습니다.
- 평일 한국시간 16:10에 자동 실행되며, KRX 금시장 일별 종가를 가져옵니다.
- 최근 365거래일의 KRX 종가·국제 금·USD/KRW 환율을 `data/market-history.json`에 축적합니다.

## 데이터 범위 및 주의
- KRX는 실시간 호가가 아닌 거래소 일별 종가입니다.
- 국제 금과 환율은 XAUS 및 fxapi.app 공개 엔드포인트를 참고합니다. 두 데이터의 기준 시각은 KRX 종가와 다를 수 있습니다.
- 시장 노트는 산술적 변화 비교를 돕는 학습용 해석이며, 원인을 확정하거나 투자 신호를 제공하지 않습니다.
- KRX 인증키는 GitHub Secrets에만 저장하고 코드나 공개 파일에 입력하지 마세요.

## 홈 화면
Android Chrome에서 배포 주소를 열고 메뉴 → 홈 화면에 추가를 선택하면 PWA 형태로 사용할 수 있습니다.

## 제공처
- https://openapi.krx.co.kr/
- https://xaus.com/api/
- https://fxapi.app/
