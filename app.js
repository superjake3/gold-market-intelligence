const $=id=>document.getElementById(id), OUNCE_GRAM=31.1034768;
const fmt=(n,d=0)=>Number.isFinite(n)?new Intl.NumberFormat("ko-KR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(n):"—";
const KRW=n=>Number.isFinite(n)?fmt(n)+"원":"—", USD=n=>Number.isFinite(n)?"$"+fmt(n,2):"—";
const priceNum=v=>{const n=Number(String(v??"").replace(/,/g,"").trim());return Number.isFinite(n)&&n>0?n:null};
let market={goldUsdOz:null,fx:null,goldTime:null,fxTime:null,krxGold:null,krxDate:null,krxUpdated:null,krxLiveGold:null,krxLiveTime:null,krxLiveStatus:null,goldSource:"",fxSource:""},chartPoints=[],deferredInstall=null;
async function fetchJSON(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{signal:c.signal,cache:"no-store",headers:{"Accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}}
function localTime(v){if(!v)return"시간 정보 없음";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"})}
function setStatus(s,ok=true){$("connectionStatus").textContent="● "+s;$("connectionStatus").style.color=ok?"var(--green)":"var(--red)"}
async function loadLiveMarket(){const d=await fetchJSON("./data/live-market.json?ts="+Date.now());let loaded=0;const gold=priceNum(d.international_gold?.closePrice),fx=priceNum(d.usdkrw?.closePrice),krx=priceNum(d.domestic_gold?.closePrice);if(gold){market.goldUsdOz=gold;market.goldTime=d.international_gold.localTradedAt||d.international_gold.fetchedAt||d.fetched_at||null;market.goldMarketStatus=d.international_gold.marketStatus||null;loaded++}if(fx){market.fx=fx;market.fxTime=d.usdkrw.localTradedAt||d.usdkrw.fetchedAt||d.fetched_at||null;market.fxSource="네이버 하나은행";loaded++}if(krx){market.krxLiveGold=krx;market.krxLiveTime=d.domestic_gold.localTradedAt||d.domestic_gold.fetchedAt||d.fetched_at||null;market.krxLiveStatus=d.domestic_gold.marketStatus||null;loaded++}market.goldSource="네이버";market.liveFetchedAt=d.fetched_at||null;market.liveErrors=d.errors||{};if(!loaded)throw Error("사용 가능한 시세 데이터가 없습니다.")}
async function loadKrxGold(){const d=await fetchJSON("./data/krx-gold.json");const n=priceNum(d.price_krw_g);if(!n)throw Error("KRX 일별 금 가격 데이터가 아직 준비되지 않았습니다.");market.krxGold=n;market.krxDate=d.base_date||null;market.krxUpdated=d.fetched_at||null}
function render(){
  const gold=market.goldUsdOz,fx=market.fx,spot=gold&&fx?gold*fx/OUNCE_GRAM:null,krx=market.krxLiveGold??market.krxGold,live=market.krxLiveGold!==null;
  $("goldUsd").textContent=USD(gold);
  $("fxRate").textContent=fx?fmt(fx,2):"—";
  $("domesticGold").textContent=KRW(krx);
  $("convertedGold").textContent=KRW(spot);
  $("goldDon").textContent=KRW(spot*3.75);
  $("krxDetailValue").textContent=KRW(krx);
  $("krxDetailDate").textContent=live?(market.krxLiveStatus==="OPEN"?"네이버 KRX 최근 거래 기준 · ":"네이버 KRX 최근 시세 · ")+localTime(market.krxLiveTime):(market.krxDate?market.krxDate+" 종가":"데이터 대기 중");
  if(krx&&spot){
    const gap=krx-spot,p=gap/spot*100;
    $("premium").textContent=(gap>0?"+":"")+fmt(gap)+"원/g";
    $("premiumRate").textContent=(p>0?"+":"")+p.toFixed(2)+"%";
    $("premium").style.color=gap>0?"var(--red)":gap<0?"var(--green)":"var(--text)";
    $("premiumRate").style.color=gap>0?"var(--red)":gap<0?"var(--green)":"var(--text)";
    $("gapCaption").textContent=live?"국내 금 시세와 국제 금 원화 환산가 비교":"KRX 일별 종가와 국제 금 환산가 비교 · 기준 시각 상이";
  }else{
    $("premium").textContent="—";$("premiumRate").textContent="—";$("gapCaption").textContent="금 가격 데이터를 불러오는 중입니다";
  }
  const fetchedAt=market.liveFetchedAt?new Date(market.liveFetchedAt):null;
  const fetchedAge=fetchedAt&&!Number.isNaN(fetchedAt.getTime())?Date.now()-fetchedAt.getTime():Infinity;
  const stamp=fetchedAt&&!Number.isNaN(fetchedAt.getTime())?fetchedAt.toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"시간 정보 없음";
  $("lastUpdated").textContent="마지막 확인 · "+stamp;
  $("lastUpdated").dataset.delay=fetchedAge>75*60*1000?"collection":"ok";
}
function drawChart(){const svg=$("goldChart"),p=chartPoints.slice(-120);if(p.length<2){svg.innerHTML='<text x="360" y="110" fill="#9aa99e" text-anchor="middle" font-size="13">앱을 켜 둔 동안 가격 기록을 모읍니다.</text>';return}const a=p.map(x=>x.v),lo=Math.min(...a),hi=Math.max(...a),span=hi-lo||1,x=i=>24+i/(p.length-1)*672,y=v=>185-(v-lo)/span*145,path=p.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(v.v).toFixed(1)).join(" "),area=path+" L "+x(p.length-1)+",190 L 24,190 Z";svg.innerHTML='<defs><linearGradient id="fillGold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d9b66c" stop-opacity=".28"/><stop offset="1" stop-color="#d9b66c" stop-opacity="0"/></linearGradient></defs><line x1="24" y1="40" x2="696" y2="40" stroke="#2b3a30"/><line x1="24" y1="112" x2="696" y2="112" stroke="#2b3a30"/><line x1="24" y1="190" x2="696" y2="190" stroke="#2b3a30"/><path d="'+area+'" fill="url(#fillGold)"/><path d="'+path+'" fill="none" stroke="#d9b66c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="24" y="18" fill="#9aa99e" font-size="11">'+fmt(hi,2)+'</text><text x="696" y="18" fill="#9aa99e" font-size="11" text-anchor="end">'+fmt(lo,2)+'</text>'}
function savePoint(){if(market.goldUsdOz){chartPoints.push({t:Date.now(),v:market.goldUsdOz});chartPoints=chartPoints.slice(-720);localStorage.setItem("goldChartPoints",JSON.stringify(chartPoints));drawChart()}}
async function refreshSavedData(){
  const results=await Promise.allSettled([loadLiveMarket(),loadKrxGold()]);
  const liveOk=results[0].status==="fulfilled";
  render();
  if(liveOk){
    savePoint();
    const partialErrors=Object.keys(market.liveErrors||{}).length>0;
    setStatus(partialErrors?"일부 시세 갱신 지연":"저장된 최신 시세 표시",!partialErrors);
  }else{
    setStatus("저장된 시세를 불러오지 못했습니다",false);
  }
}
async function refresh(){
  const button=$("refreshBtn");
  if(button.disabled)return;
  button.disabled=true;
  button.textContent="저장된 시세 확인 중…";
  setStatus("GitHub에 저장된 최신 시세 불러오는 중");
  try{
    await refreshSavedData();
  }catch(error){
    setStatus(error.message||"저장된 시세를 불러오지 못했습니다",false);
  }finally{
    button.textContent="시세 새로고침 ↻";
    button.disabled=false;
  }
}
$("refreshBtn").addEventListener("click",refresh);$("detailBtn").addEventListener("click",()=>{$("compactView").hidden=true;$("toolbar").hidden=true;$("detailView").hidden=false;render();drawChart()});$("backBtn").addEventListener("click",()=>{$("compactView").hidden=false;$("toolbar").hidden=false;$("detailView").hidden=true});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false});$("installBtn").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true});
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));try{chartPoints=JSON.parse(localStorage.getItem("goldChartPoints")||"[]")}catch{chartPoints=[]}refreshSavedData();