# GOLD MARKET INTELLIGENCE

국제 금 선물·원달러 환율·KRX 금시장 가격을 한곳에서 확인하는 독립형 개인 대시보드입니다.

## 배포
- GitHub Pages로 배포합니다.
- 저장소 Settings → Pages → Build and deployment에서 Source를 **GitHub Actions**로 설정합니다.
- `.github/workflows/pages.yml`이 main 브랜치 변경 시 사이트를 배포합니다.

## 실시간 시세
- 국제 금: 네이버 금융 `GCcv1`의 `closePrice`를 사용합니다. 이 지표는 국제 금 현물이 아닌 COMEX 금 선물입니다.
- 국내 금: 네이버 금융 `M04020000`의 `closePrice`를 사용합니다. 네이버 국내 금 페이지에 표시되는 KRX 금시장 시세입니다.
- 원/달러: 네이버 금융 `FX_USDKRW`의 `closePrice`를 사용합니다. 하나은행 고시환율이며 거래소 현물환율과 기준이 다릅니다.
- 앱은 60초마다 시세를 다시 조회합니다. 실제 갱신 시각은 각 응답의 `localTradedAt`을 표시합니다.
- 네이버 공개 API는 비공식 연동 경로이므로 응답 형식·접근 정책·호출 제한이 변경될 수 있습니다.

## KRX 일별 데이터 수집
- 저장소 Settings → Secrets and variables → Actions → New repository secret
- Name: `KRX_AUTH_KEY`
- Value: KRX Open API에서 발급받은 인증키
- 평일 한국시간 16:10에 KRX 금시장 일별 종가를 가져옵니다.
- 최근 365거래일의 KRX 종가·국제 금·USD/KRW 환율을 `data/market-history.json`에 축적합니다.
- 이 일별 자료는 실시간 가격판과 별도로 과거 추세 및 분석에 사용합니다.

## 데이터 범위 및 주의
- 실시간 가격판과 KRX 공식 일별 데이터는 목적이 다릅니다. 장 종료 또는 휴장 시 네이버의 최근 시세가 표시될 수 있습니다.
- 국제 금 선물·하나은행 고시환율·KRX 금시장 시세의 기준 시각이 다를 수 있으므로 국내 가격 차이는 참고 지표로 봐야 합니다.
- 시장 노트는 산술적 변화 비교를 돕는 학습용 해석이며, 원인을 확정하거나 투자 신호를 제공하지 않습니다.
- KRX 인증키는 GitHub Secrets에만 저장하고 코드나 공개 파일에 입력하지 마세요.

## 홈 화면
Android Chrome에서 배포 주소를 열고 메뉴 → 홈 화면에 추가를 선택하면 PWA 형태로 사용할 수 있습니다.

## 제공처
- 네이버 금융: https://stock.naver.com/marketindex/metals/GCcv1/price
- 네이버 국내 금: https://m.stock.naver.com/marketindex/metals/M04020000
- 네이버 환율: https://stock.naver.com/marketindex/exchange/FX_USDKRW
- KRX Open API: https://openapi.krx.co.kr/
