(()=> {
const fmt=(n,d=0)=>n==null?"—":new Intl.NumberFormat("ko-KR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
const money=(n)=>n==null?"—":fmt(n)+"원";
const signed=(x)=>x==null?"기록 없음":(x.percent>0?"+":"")+fmt(x.percent,2)+"%";
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
function ensurePanel(){
 if(document.getElementById("notionManualPanel"))return;
 const section=el("section");section.id="notionManualPanel";section.style.cssText="margin:14px 0 26px;display:grid;gap:10px";
 const head=el("div");head.append(el("div","eyebrow","MANUAL NOTION ENTRIES"),el("h2","", "내가 입력한 시장 기록"));
 const stamp=el("div","panel-note","Notion 데이터 연결을 기다리는 중");stamp.id="notionSyncStamp";
 const table=el("div","panel");table.style.overflowX="auto";
 const t=el("table");t.id="notionHistoryTable";t.style.cssText="width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap";
 table.append(t);section.append(head,stamp,table);
 const grid=document.getElementById("compactView");if(grid&&grid.parentNode)grid.parentNode.insertBefore(section,grid.nextSibling);else document.querySelector("main")?.append(section);
}
function setCard(selector,value,detail){const card=document.querySelector(selector);if(!card)return;const main=card.querySelector(".price-main");const sub=card.querySelector(".subline");if(main)main.textContent=value;if(sub)sub.textContent=detail}
function render(data){
 const latest=data.latest||{},changes=data.changes||{};
 setCard(".gold-card",latest.gold_usd_oz==null?"—":"$"+fmt(latest.gold_usd_oz,2), "내 수동 입력 · 이전 기록 대비 "+signed(changes.gold_usd_oz));
 setCard(".fx-card",latest.usdkrw==null?"—":fmt(latest.usdkrw,2), "내 수동 입력 · 이전 기록 대비 "+signed(changes.usdkrw));
 setCard(".domestic-card",money(latest.gold_krw_g), "내 수동 입력 · 이전 기록 대비 "+signed(changes.gold_krw_g));
 const stamp=document.getElementById("notionSyncStamp");
 if(stamp)stamp.textContent="원본: 🌱 한 줄 일기 · 최근 동기화 "+new Date(data.fetched_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"});
 const table=document.getElementById("notionHistoryTable");if(!table)return;
 table.replaceChildren();
 const headers=["날짜","USD/KRW","국제 금 (USD/oz)","국내 금 (원/g)"];
 const thead=el("thead"),tr=el("tr");headers.forEach(h=>{const th=el("th","",h);th.style.cssText="text-align:right;padding:9px 7px;color:#9aa99e;border-bottom:1px solid #2b3a30";if(h==="날짜")th.style.textAlign="left";tr.append(th)});thead.append(tr);table.append(thead);
 const tbody=el("tbody");
 (data.history||[]).forEach(r=>{const row=el("tr");[r.date, r.usdkrw==null?"—":fmt(r.usdkrw,2),r.gold_usd_oz==null?"—":"$"+fmt(r.gold_usd_oz,2),r.gold_krw_g==null?"—":fmt(r.gold_krw_g)].forEach((v,i)=>{const td=el("td","",v);td.style.cssText="padding:10px 7px;text-align:right;border-bottom:1px solid #26342b;font-variant-numeric:tabular-nums";if(i===0){td.style.textAlign="left";td.style.color="#d9b66c"}row.append(td)});tbody.append(row)});
 table.append(tbody);
}
async function sync(){
 ensurePanel();
 try{const r=await fetch("./data/notion-market.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const data=await r.json();if(!data.latest)throw Error("Notion에 가격이 입력된 기록이 없습니다.");render(data)}
 catch(e){const s=document.getElementById("notionSyncStamp");if(s)s.textContent="Notion 연결 설정 대기 중 · "+e.message}
}
sync();setInterval(sync,60000);
})();