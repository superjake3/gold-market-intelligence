const HISTORY_URL = "./data/market-history.json";
const nf = (n, d=2) => Number.isFinite(Number(n)) ? new Intl.NumberFormat("ko-KR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(n)) : "—";
const pct = n => Number.isFinite(n) ? (n>0?"+":"")+n.toFixed(2)+"%" : "—";
const money = n => Number.isFinite(n) ? nf(n,0)+"원" : "—";
const changePct = (a,b) => Number.isFinite(a)&&Number.isFinite(b)&&b!==0 ? (a/b-1)*100 : null;
const el = id => document.getElementById(id);
let historyRows = [];
let economicIndicatorsCache = null;
function periodChange(key, days) {
  if (!historyRows.length) return null;
  const latest = historyRows[historyRows.length-1], target = historyRows[Math.max(0, historyRows.length-1-days)];
  if (!latest || !target || latest[key] == null || target[key] == null) return null;
  return changePct(Number(latest[key]), Number(target[key]));
}
function renderPeriod(id, value) {
  const node=el(id); if(!node)return;
  node.textContent=pct(value); node.className="insight-change "+(value>0?"up":value<0?"down":"flat");
}
function renderHistoryChart() {
  const svg=el("historyChart"); if(!svg)return;
  const rows=historyRows.filter(r=>Number.isFinite(Number(r.krx_krw_g))).slice(-30);
  if(rows.length<2){svg.innerHTML='<text x="360" y="105" fill="#9aa99e" text-anchor="middle" font-size="13">KRX 일별 데이터가 쌓이면 30일 추이를 보여줍니다.</text>';return;}
  const vals=rows.map(r=>Number(r.krx_krw_g)),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
  const x=i=>26+i/(rows.length-1)*668,y=v=>180-(v-min)/span*140;
  const path=vals.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ");
  const area=path+" L "+x(vals.length-1)+",190 L 26,190 Z";
  svg.innerHTML='<defs><linearGradient id="historyFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b9a0d8" stop-opacity=".3"/><stop offset="1" stop-color="#b9a0d8" stop-opacity="0"/></linearGradient></defs><line x1="26" y1="40" x2="694" y2="40" stroke="#2b3a30"/><line x1="26" y1="110" x2="694" y2="110" stroke="#2b3a30"/><line x1="26" y1="190" x2="694" y2="190" stroke="#2b3a30"/><path d="'+area+'" fill="url(#historyFill)"/><path d="'+path+'" fill="none" stroke="#b9a0d8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="26" y="20" fill="#9aa99e" font-size="11">'+nf(max,0)+'원</text><text x="694" y="20" fill="#9aa99e" font-size="11" text-anchor="end">'+nf(min,0)+'원</text><text x="26" y="210" fill="#9aa99e" font-size="10">'+rows[0].base_date+'</text><text x="694" y="210" fill="#9aa99e" font-size="10" text-anchor="end">'+rows[rows.length-1].base_date+'</text>';
}
function renderDailyLesson() {
  const box=el("dailyLesson"); if(!box)return;
  if(historyRows.length<2){box.textContent="서로 다른 거래일의 데이터가 2개 이상 쌓이면 국제 금과 환율이 국내 금 가격에 미친 영향을 비교해 드립니다.";return;}
  const a=historyRows[historyRows.length-2],b=historyRows[historyRows.length-1];
  const g=changePct(b.gold_usd_oz,a.gold_usd_oz),f=changePct(b.usdkrw,a.usdkrw);
  const k=changePct(b.krx_krw_g,a.krx_krw_g),s=changePct(b.spot_krw_g,a.spot_krw_g);
  const gapA=a.krx_krw_g!=null&&a.spot_krw_g!=null?Number(a.krx_krw_g)-Number(a.spot_krw_g):null,gapB=b.krx_krw_g!=null&&b.spot_krw_g!=null?Number(b.krx_krw_g)-Number(b.spot_krw_g):null;
  const gapMove=gapA!==null&&gapB!==null?gapB-gapA:null,lines=[];
  if(g!==null&&f!==null){
    if(g*f<0) lines.push("국제 금과 환율이 반대 방향으로 움직여 서로의 영향을 일부 상쇄했습니다.");
    else if(Math.abs(g)>Math.abs(f)) lines.push("원화 기준 국제 금 가격 변화에서는 국제 금 가격의 움직임이 환율보다 크게 작용했습니다.");
    else lines.push("원화 기준 국제 금 가격 변화에서는 환율의 움직임이 국제 금 가격보다 크게 작용했습니다.");
  } else lines.push("국제 금 또는 환율의 비교 데이터가 부족해 요인 분석을 보류합니다.");
  if(k!==null&&s!==null){
    const residual=k-s; lines.push("KRX 금 가격 "+pct(k)+", 국제 환산 기준가 "+pct(s)+"로 움직였습니다.");
    if(Math.abs(residual)>0.15) lines.push("두 변화의 차이는 약 "+pct(residual)+"p입니다. 국내 수급·기준 시각 차이·시장 구조의 영향을 추가로 살펴볼 만합니다.");
    else lines.push("두 가격의 일간 움직임은 대체로 비슷했습니다.");
  } else lines.push("KRX 종가와 국제 환산가의 일간 비교는 데이터가 더 쌓인 뒤 가능합니다.");
  if(gapMove!==null) lines.push("국내 가격 차이는 전일 대비 "+money(gapMove)+" 변화했습니다.");
  box.innerHTML=lines.map(t=>'<p>'+t+'</p>').join("");
}
async function loadMarketHistory(){
  try{const response=await fetch(HISTORY_URL+"?v="+Date.now(),{cache:"no-store"});if(!response.ok)throw Error("history not ready");const data=await response.json();historyRows=Array.isArray(data.records)?data.records:[];}catch(e){historyRows=[];}
  renderPeriod("krx7d",periodChange("krx_krw_g",7));renderPeriod("krx30d",periodChange("krx_krw_g",30));
  renderPeriod("spot7d",periodChange("spot_krw_g",7));renderPeriod("fx7d",periodChange("usdkrw",7));
  if(el("historyCount"))el("historyCount").textContent=historyRows.length+"거래일 축적";
  if(el("historyLatest"))el("historyLatest").textContent=historyRows.length?historyRows[historyRows.length-1].base_date+" 기준":"데이터 대기 중";
  renderHistoryChart();renderDailyLesson();if(economicIndicatorsCache)renderMacroGoldComparison(economicIndicatorsCache);
}
document.addEventListener("DOMContentLoaded",loadMarketHistory);


// Macroeconomic indicators
const ECONOMIC_URL = "./data/economic-indicators.json";
const economicLabels = {
  us_10y_yield:"미국 10년물 국채금리",
  us_10y_real_yield:"미국 10년물 실질금리",
  usd_broad_index:"미국 달러 종합지수",
  us_cpi:"미국 소비자물가지수",
  kr_base_rate:"한국은행 기준금리",
  kr_cpi:"한국 소비자물가지수"
};
const economicFmt = (value, unit) => {
  const n=Number(value);
  if(!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ko-KR",{maximumFractionDigits:unit==="%"?2:unit==="지수"?2:4,minimumFractionDigits:unit==="%"?2:0}).format(n)+(unit==="%"?"%":"");
};
function economicDate(value){
  if(!value)return "기준일 미상";
  const s=String(value);
  if(/^\d{6}$/.test(s))return s.slice(0,4)+"년 "+Number(s.slice(4,6))+"월";
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.replace(/-/g,".");
  return s;
}
function drawEconomicChart(id, observations){
  const svg=el("econ-chart-"+id);if(!svg)return;
  const rows=(Array.isArray(observations)?observations:[]).filter(o=>Number.isFinite(Number(o.value))).slice(-90);
  if(rows.length<2){svg.innerHTML='<text x="320" y="78" fill="#9aa99e" text-anchor="middle" font-size="13">추세 데이터가 부족합니다.</text>';return;}
  const vals=rows.map(o=>Number(o.value)),min=Math.min(...vals),max=Math.max(...vals),span=max-min||Math.max(Math.abs(max)*.02,1);
  const x=i=>18+i/(rows.length-1)*604,y=v=>119-(v-min)/span*94;
  const path=vals.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ");
  const area=path+" L "+x(vals.length-1)+",126 L 18,126 Z";
  const first=economicDate(rows[0].date),last=economicDate(rows[rows.length-1].date);
  svg.innerHTML='<line x1="18" y1="25" x2="622" y2="25" stroke="#2b3a30"/><line x1="18" y1="72" x2="622" y2="72" stroke="#2b3a30"/><line x1="18" y1="126" x2="622" y2="126" stroke="#2b3a30"/><path d="'+area+'" fill="#d9b66c" fill-opacity=".10"/><path d="'+path+'" fill="none" stroke="#d9b66c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="18" y="14" fill="#9aa99e" font-size="10">'+nf(max,2)+'</text><text x="622" y="14" fill="#9aa99e" font-size="10" text-anchor="end">'+nf(min,2)+'</text><text x="18" y="145" fill="#9aa99e" font-size="10">'+first+'</text><text x="622" y="145" fill="#9aa99e" font-size="10" text-anchor="end">'+last+'</text>';
}
function renderEconomicReading(indicators){
  const box=el("economicReading");if(!box)return;
  const real=indicators.us_10y_real_yield,nominal=indicators.us_10y_yield,dollar=indicators.usd_broad_index,usCpi=indicators.us_cpi,krRate=indicators.kr_base_rate,krCpi=indicators.kr_cpi;
  const delta=x=>x?.latest&&x?.previous?Number(x.latest.value)-Number(x.previous.value):null;
  const lines=[];
  if(real?.latest&&real?.previous){
    const d=delta(real);lines.push("미국 실질금리는 직전 관측치보다 "+(d>0?"상승":d<0?"하락":"변화 없음")+"했습니다. 실질금리 상승은 일반적으로 이자를 지급하지 않는 금의 보유 기회비용을 높일 수 있습니다.");
  }
  if(dollar?.latest&&dollar?.previous){
    const d=delta(dollar);lines.push("달러 종합지수는 직전 관측치보다 "+(d>0?"강해졌습니다":d<0?"약해졌습니다":"변화가 없습니다")+". 달러 강세는 다른 통화권 투자자의 금 매입 부담을 높일 수 있습니다.");
  }
  if(usCpi?.latest&&usCpi?.previous){
    const d=delta(usCpi);lines.push("미국 CPI 지수는 직전 발표치 대비 "+(d>0?"상승":d<0?"하락":"보합")+"했습니다. 물가 흐름은 금리 기대와 실질금리를 통해 금 시장에 간접적으로 영향을 줄 수 있습니다.");
  }
  if(krRate?.latest&&krCpi?.latest)lines.push("한국 기준금리 "+economicFmt(krRate.latest.value,"%")+", 한국 CPI "+economicFmt(krCpi.latest.value,"지수")+"입니다. 국내 금 가격을 볼 때 원화 환율과 함께 국내 통화정책·물가 흐름도 참고할 수 있습니다.");
  if(nominal?.latest&&real?.latest)lines.push("명목금리와 실질금리는 서로 다른 지표입니다. 두 수치의 차이를 단순히 기대 인플레이션으로 단정하지 말고 물가연동채권 시장의 특성도 함께 고려해야 합니다.");
  box.innerHTML=lines.map(t=>"<p>"+t+"</p>").join("")||"경제 지표 데이터가 충분하지 않습니다.";
}
async function loadEconomicIndicators(){
  const stamp=el("economicUpdated");
  try{
    const response=await fetch(ECONOMIC_URL+"?v="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw Error("HTTP "+response.status);
    const data=await response.json(),indicators=data.indicators||{};economicIndicatorsCache=indicators;
    if(!Object.keys(indicators).length)throw Error("지표 데이터가 비어 있습니다.");
    for(const [id,item] of Object.entries(indicators)){
      const latest=item.latest||item.observations?.at(-1),previous=item.previous;
      const value=el("econ-"+id),meta=el("econ-meta-"+id);
      if(value)value.textContent=economicFmt(latest?.value,item.unit);
      if(meta){
        let comparison="직전 관측치 없음";
        if(latest&&previous){
          const diff=Number(latest.value)-Number(previous.value);
          comparison="직전 "+economicFmt(previous.value,item.unit)+" · "+(diff>0?"+":"")+economicFmt(diff,item.unit)+" 변화";
        }
        meta.textContent=economicDate(latest?.date)+" 기준 · "+comparison;
      }
      drawEconomicChart(id,item.observations||[]);
    }
    if(stamp)stamp.textContent="수집 "+(data.fetched_at?localTime(data.fetched_at):"시각 미상");
    renderEconomicReading(indicators);renderMacroGoldComparison(indicators);
  }catch(error){
    if(stamp)stamp.textContent="데이터 연결 실패";
    const box=el("economicReading");if(box)box.textContent="경제 지표를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";
    console.error("Economic indicators:",error);
  }
}
document.addEventListener("DOMContentLoaded",loadEconomicIndicators);


function pearsonCorrelation(xs,ys){
  if(xs.length!==ys.length||xs.length<4)return null;
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;
  let numerator=0,dx=0,dy=0;
  for(let i=0;i<xs.length;i++){const x=xs[i]-mx,y=ys[i]-my;numerator+=x*y;dx+=x*x;dy+=y*y;}
  return dx&&dy?numerator/Math.sqrt(dx*dy):null;
}
function correlationLabel(value){
  if(value===null)return "표본 부족";
  const strength=Math.abs(value)>=0.7?"강한":Math.abs(value)>=0.4?"중간 정도의":"약한";
  return strength+(value>0?" 양(+)의 동행":" 음(-)의 동행")+" · "+value.toFixed(2);
}
function renderMacroGoldComparison(indicators){
  const real=indicators?.us_10y_real_yield?.observations||[];
  const dollar=indicators?.usd_broad_index?.observations||[];
  const toMap=rows=>new Map(rows.map(o=>[String(o.date||"").replace(/-/g,"").slice(0,8),Number(o.value)]).filter(([d,v])=>/^\\d{8}$/.test(d)&&Number.isFinite(v)));
  const realMap=toMap(real),dollarMap=toMap(dollar);
  const paired=historyRows.map(row=>{
    const date=String(row.base_date||"").replace(/-/g,"").slice(0,8);
    const gold=Number(row.gold_usd_oz),r=realMap.get(date),d=dollarMap.get(date);
    return {date,gold,real:r,dollar:d};
  }).filter(p=>/^\\d{8}$/.test(p.date)&&Number.isFinite(p.gold)&&Number.isFinite(p.real)&&Number.isFinite(p.dollar)).sort((a,b)=>a.date.localeCompare(b.date));
  const fmtDate=s=>s?s.slice(0,4)+"."+s.slice(4,6)+"."+s.slice(6,8):"";
  const fmtReturn=v=>v===null?"자료 부족":pct(v);
  const fmtBp=v=>v===null?"자료 부족":(v>0?"+":"")+v.toFixed(1)+"bp";
  const renderPeriod=(id,days)=>{
    const node=el(id);if(!node)return;
    if(paired.length<2){node.innerHTML="<p>국제 금·실질금리·달러 지수의 관측일이 일치하는 데이터가 2개 이상 필요합니다.</p><p class='macro-muted'>현재 일치 관측일: "+paired.length+"일</p>";return;}
    const latestDate=paired[paired.length-1].date;
    const cutoff=new Date(Date.UTC(Number(latestDate.slice(0,4)),Number(latestDate.slice(4,6))-1,Number(latestDate.slice(6,8))-days));
    const cutoffKey=cutoff.toISOString().slice(0,10).replace(/-/g,"");
    const rows=paired.filter(p=>p.date>=cutoffKey);
    if(rows.length<2){node.innerHTML="<p>최근 "+days+"일 구간의 일치 관측치가 아직 부족합니다.</p><p class='macro-muted'>현재 일치 관측일: "+rows.length+"일</p>";return;}
    const first=rows[0],last=rows[rows.length-1];
    const goldChange=changePct(last.gold,first.gold);
    const realBp=(last.real-first.real)*100;
    const dollarChange=changePct(last.dollar,first.dollar);
    const goldReturns=[],realMoves=[],dollarReturns=[];
    for(let i=1;i<rows.length;i++){
      goldReturns.push(changePct(rows[i].gold,rows[i-1].gold));
      realMoves.push(rows[i].real-rows[i-1].real);
      dollarReturns.push(changePct(rows[i].dollar,rows[i-1].dollar));
    }
    const corrReal=pearsonCorrelation(goldReturns,realMoves);
    const corrDollar=pearsonCorrelation(goldReturns,dollarReturns);
    node.innerHTML=
      "<div class='macro-date-range'>"+fmtDate(first.date)+" — "+fmtDate(last.date)+" · 일치 관측 "+rows.length+"일</div>"+
      "<div class='macro-metrics'>"+
      "<div><span>국제 금</span><strong>"+fmtReturn(goldChange)+"</strong></div>"+
      "<div><span>미국 실질금리</span><strong>"+fmtBp(realBp)+"</strong></div>"+
      "<div><span>달러 종합지수</span><strong>"+fmtReturn(dollarChange)+"</strong></div>"+
      "</div>"+
      "<div class='macro-correlation'><span>금 ↔ 실질금리</span><strong>"+correlationLabel(corrReal)+"</strong></div>"+
      "<div class='macro-correlation'><span>금 ↔ 달러 지수</span><strong>"+correlationLabel(corrDollar)+"</strong></div>"+
      "<div class='macro-muted'>상관계수 계산에 사용한 일간 변화 쌍: "+Math.max(0,rows.length-1)+"개 · 표본이 적으면 값의 변동성이 큽니다.</div>";
  };
  renderPeriod("macroCompare7",7);
  renderPeriod("macroCompare30",30);
}
