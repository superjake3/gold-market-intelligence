const $=id=>document.getElementById(id), OUNCE_GRAM=31.1034768;
const fmt=(n,d=0)=>Number.isFinite(n)?new Intl.NumberFormat("ko-KR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(n):"—";
const KRW=n=>Number.isFinite(n)?fmt(n)+"원":"—", USD=n=>Number.isFinite(n)?"$"+fmt(n,2):"—";
const priceNum=v=>{const n=Number(String(v??"").replace(/,/g,"").trim());return Number.isFinite(n)&&n>0?n:null};
let market={goldUsdOz:null,fx:null,goldTime:null,fxTime:null,krxGold:null,krxDate:null,krxUpdated:null,krxLiveGold:null,krxLiveTime:null,krxLiveStatus:null,goldSource:"",fxSource:""},chartPoints=[],deferredInstall=null;
async function fetchJSON(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{signal:c.signal,cache:"no-store",headers:{"Accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}}
function localTime(v){if(!v)return"시간 정보 없음";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"})}
function setStatus(s,ok=true){$("connectionStatus").textContent="● "+s;$("connectionStatus").style.color=ok?"var(--green)":"var(--red)"}
async function loadLiveMarket(){const d=await fetchJSON("./data/live-market.json?ts="+Date.now());const gold=priceNum(d.international_gold?.closePrice),fx=priceNum(d.usdkrw?.closePrice),krx=priceNum(d.domestic_gold?.closePrice);if(!gold||!fx||!krx)throw Error("중계된 네이버 시세 데이터가 불완전합니다.");market.goldUsdOz=gold;market.goldTime=d.international_gold.localTradedAt||d.fetched_at||null;market.fx=fx;market.fxTime=d.usdkrw.localTradedAt||d.fetched_at||null;market.fxSource="네이버 하나은행";market.krxLiveGold=krx;market.krxLiveTime=d.domestic_gold.localTradedAt||d.fetched_at||null;market.krxLiveStatus=d.domestic_gold.marketStatus||null;market.goldSource="네이버";market.goldMarketStatus=d.international_gold?.marketStatus||null;market.liveFetchedAt=d.fetched_at||null}
async function loadKrxGold(){const d=await fetchJSON("./data/krx-gold.json");const n=priceNum(d.price_krw_g);if(!n)throw Error("KRX 일별 금 가격 데이터가 아직 준비되지 않았습니다.");market.krxGold=n;market.krxDate=d.base_date||null;market.krxUpdated=d.fetched_at||null}
function render(){const gold=market.goldUsdOz,fx=market.fx,spot=gold&&fx?gold*fx/OUNCE_GRAM:null,krx=market.krxLiveGold??market.krxGold,live=market.krxLiveGold!==null; $("goldUsd").textContent=USD(gold);$("goldUsdGram").textContent=USD(gold/OUNCE_GRAM);$("goldTime").textContent=localTime(market.goldTime);$("convertedGoldTop").textContent=KRW(spot);const quoteTimes=[market.goldTime,market.fxTime].filter(Boolean).map(v=>new Date(v)).filter(d=>!Number.isNaN(d.getTime()));$("convertedGoldTime").textContent=quoteTimes.length?localTime(new Date(Math.min(...quoteTimes.map(d=>d.getTime()))).toISOString()):"시간 정보 없음";$("fxRate").textContent=fx?fmt(fx,2):"—";$("fxTime").textContent=localTime(market.fxTime);$("domesticGold").textContent=KRW(krx);$("krxDateLabel").textContent=live?(market.krxLiveStatus==="OPEN"?"실시간 ":"최근 시세 ")+localTime(market.krxLiveTime):(market.krxDate?market.krxDate+" 기준 · 일별 종가":"데이터 대기 중");$("krxSourceLabel").textContent=live?(market.krxLiveStatus==="OPEN"?"NAVER · LIVE KRX":"NAVER · LAST QUOTE"):"KRX DAILY CLOSE";$("convertedGold").textContent=KRW(spot);$("goldDon").textContent=KRW(spot*3.75);$("krxDetailValue").textContent=KRW(krx);$("krxDetailDate").textContent=live?(market.krxLiveStatus==="OPEN"?"네이버 KRX 실시간 체결 기준 · ":"네이버 KRX 최근 시세 · ")+localTime(market.krxLiveTime):(market.krxDate?market.krxDate+" 종가":"데이터 대기 중");if(krx&&spot){const gap=krx-spot,p=gap/spot*100;$("premium").textContent=(gap>0?"+":"")+fmt(gap)+"원/g";$("premiumRate").textContent=(p>0?"+":"")+p.toFixed(2)+"%";$("premium").style.color=gap>0?"var(--red)":gap<0?"var(--green)":"var(--text)";$("premiumRate").style.color=gap>0?"var(--red)":gap<0?"var(--green)":"var(--text)";$("gapCaption").textContent=live?"네이버 KRX 시세와 국제 금 환산가 비교":"KRX 일별 종가와 국제 금 환산가 비교 · 기준 시각 상이"}else{$("premium").textContent="—";$("premiumRate").textContent="—";$("gapCaption").textContent="금 가격 데이터를 불러오는 중입니다"}const fetchedAt=market.liveFetchedAt?new Date(market.liveFetchedAt):null;const fetchedAge=fetchedAt&&!Number.isNaN(fetchedAt.getTime())?Date.now()-fetchedAt.getTime():Infinity;const goldAt=market.goldTime?new Date(market.goldTime):null;const goldAge=goldAt&&!Number.isNaN(goldAt.getTime())?Date.now()-goldAt.getTime():Infinity;const quoteDelayed=market.goldMarketStatus==="OPEN"&&goldAge>10*60*1000;const dataDelayed=fetchedAge>10*60*1000;$("lastUpdated").textContent="수집 "+localTime(market.liveFetchedAt)+"\n국제 금 시세 "+localTime(market.goldTime)+" · 환율 "+localTime(market.fxTime);$("lastUpdated").dataset.delay=dataDelayed?"collection":quoteDelayed?"quote":"ok"}
function drawChart(){const svg=$("goldChart"),p=chartPoints.slice(-120);if(p.length<2){svg.innerHTML='<text x="360" y="110" fill="#9aa99e" text-anchor="middle" font-size="13">앱을 켜 둔 동안 가격 기록을 모읍니다.</text>';return}const a=p.map(x=>x.v),lo=Math.min(...a),hi=Math.max(...a),span=hi-lo||1,x=i=>24+i/(p.length-1)*672,y=v=>185-(v-lo)/span*145,path=p.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(v.v).toFixed(1)).join(" "),area=path+" L "+x(p.length-1)+",190 L 24,190 Z";svg.innerHTML='<defs><linearGradient id="fillGold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d9b66c" stop-opacity=".28"/><stop offset="1" stop-color="#d9b66c" stop-opacity="0"/></linearGradient></defs><line x1="24" y1="40" x2="696" y2="40" stroke="#2b3a30"/><line x1="24" y1="112" x2="696" y2="112" stroke="#2b3a30"/><line x1="24" y1="190" x2="696" y2="190" stroke="#2b3a30"/><path d="'+area+'" fill="url(#fillGold)"/><path d="'+path+'" fill="none" stroke="#d9b66c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="24" y="18" fill="#9aa99e" font-size="11">'+fmt(hi,2)+'</text><text x="696" y="18" fill="#9aa99e" font-size="11" text-anchor="end">'+fmt(lo,2)+'</text>'}
function savePoint(){if(market.goldUsdOz){chartPoints.push({t:Date.now(),v:market.goldUsdOz});chartPoints=chartPoints.slice(-720);localStorage.setItem("goldChartPoints",JSON.stringify(chartPoints));drawChart()}}
async function triggerLiveCollection(previousFetchedAt){
  let endpoint=localStorage.getItem("goldRefreshEndpoint")||"";
  if(!endpoint){
    endpoint=prompt("Cloudflare Worker 주소를 입력해 주세요.\n예: https://gold-market-refresh.계정명.workers.dev");
    if(!endpoint)return false;
    endpoint=endpoint.trim().replace(/\/$/,"");
    try{const u=new URL(endpoint);if(u.protocol!=="https:")throw Error("HTTPS 주소가 필요합니다.");}catch{throw Error("올바른 HTTPS Worker 주소를 입력해 주세요.");}
    localStorage.setItem("goldRefreshEndpoint",endpoint);
  }
  let secret=localStorage.getItem("goldRefreshSecret")||"";
  if(!secret){
    secret=prompt("Cloudflare Worker에 등록한 REFRESH_SECRET을 입력해 주세요.\n이 값은 현재 브라우저에만 저장됩니다.");
    if(!secret)return false;
    secret=secret.trim();
    if(!secret)throw Error("새로고침 인증키가 비어 있습니다.");
    localStorage.setItem("goldRefreshSecret",secret);
  }
  const response=await fetch(endpoint,{method:"POST",mode:"cors",cache:"no-store",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},body:"{}"});
  let result={};
  try{result=await response.json()}catch{}
  if(!response.ok)throw Error(result.error||("수집 요청 실패 (HTTP "+response.status+")"));
  const started=Date.now(),limit=180000;
  $("refreshBtn").textContent="새 시세 수집 중…";
  setStatus("새 시세 수집 중 · 완료 대기",true);
  while(Date.now()-started<limit){
    await new Promise(resolve=>setTimeout(resolve,5000));
    try{
      await loadLiveMarket();
      const next=market.liveFetchedAt?new Date(market.liveFetchedAt).getTime():0;
      if(next>previousFetchedAt){
        await Promise.allSettled([loadKrxGold()]);
        return true;
      }
    }catch{}
  }
  throw Error("수집 요청은 접수됐지만 3분 안에 새 데이터가 확인되지 않았습니다. 잠시 후 다시 확인해 주세요.");
}
async function refresh(requestFresh=false){
  const button=$("refreshBtn"),originalText="새 시세 수집 ↻";
  if(button.disabled)return;
  button.disabled=true;
  setStatus(requestFresh?"새 시세 수집 요청 중":"시세 데이터 확인 중");
  let liveOk=false;
  try{
    const initial=await Promise.allSettled([loadLiveMarket(),loadKrxGold()]);
    liveOk=initial[0].status==="fulfilled";
    render();savePoint();
    if(requestFresh){
      const previous=market.liveFetchedAt?new Date(market.liveFetchedAt).getTime():0;
      const completed=await triggerLiveCollection(previous);
      if(completed){
        render();savePoint();
        setStatus("새 시세 수집 및 화면 갱신 완료",true);
      }
    }
    const fetchedAt=market.liveFetchedAt?new Date(market.liveFetchedAt):null;
    const fetchedAge=fetchedAt&&!Number.isNaN(fetchedAt.getTime())?Date.now()-fetchedAt.getTime():Infinity;
    const goldAt=market.goldTime?new Date(market.goldTime):null;
    const goldAge=goldAt&&!Number.isNaN(goldAt.getTime())?Date.now()-goldAt.getTime():Infinity;
    const collectionDelayed=fetchedAge>10*60*1000;
    const quoteDelayed=market.goldMarketStatus==="OPEN"&&goldAge>10*60*1000;
    if(!requestFresh)setStatus(!liveOk?"시세 데이터 연결 실패":collectionDelayed?"데이터 수집 지연":quoteDelayed?"국제 금 시세 지연":"시세 데이터 연결 정상",liveOk&&!collectionDelayed&&!quoteDelayed);
  }catch(error){
    setStatus(error.message||"새 시세 수집 실패",false);
  }finally{
    button.textContent=originalText;
    button.disabled=false;
  }
}
buttonRefreshSetup();
function buttonRefreshSetup(){$("refreshBtn").addEventListener("click",()=>refresh(true));}$("detailBtn").addEventListener("click",()=>{$("compactView").hidden=true;$("toolbar").hidden=true;$("detailView").hidden=false;render();drawChart()});$("backBtn").addEventListener("click",()=>{$("compactView").hidden=false;$("toolbar").hidden=false;$("detailView").hidden=true});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false});$("installBtn").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true});
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));try{chartPoints=JSON.parse(localStorage.getItem("goldChartPoints")||"[]")}catch{chartPoints=[]}refresh(false);
setInterval(()=>{if(!$("refreshBtn").disabled)refresh(false)},30000);