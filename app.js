const APP_VERSION = "v3.0 (cache-fix)";
const $ = (id) => document.getElementById(id);

const DEFAULTS = { bedPlan:"21:00", wakePlan:"06:00", em1Plan:"07:05", em2Plan:"16:05" };
const SMOKE_WINDOWS = [
  {label:"07:30–07:45"}, {label:"10:00–10:15"}, {label:"12:30–12:45"},
  {label:"15:00–15:15"}, {label:"17:30–17:45"}, {label:"19:30–19:45"},
];
const TRIGGERS = ["Morgen","Nach Essen","Abend","Stress","Langweile","Gewohnheit","Sozial","Unruhe","Leere","Traurigkeit","Ärger","Sonstiges"];
const TOOLS = ["Wasser+10 Ausatmungen","2–5 Min Gehen","Dehnen/Wärme","Dusche","Tee","Kaugummi/Bonbon","Mini‑EM 2 Min","Ablenkung 5 Min","Snack/Protein","Sonstiges"];
const JOURNAL_ITEMS = [
  "Angst/Unruhe","Ärger/Wut","Traurigkeit","Scham","Leere","Überforderung",
  "Ruhe","Freude","Verbundenheit","Klarheit",
  "Bedürfnis: Ruhe","Bedürfnis: Kontakt","Bedürfnis: Bewegung","Bedürfnis: Essen/Trinken","Bedürfnis: Sicherheit",
  "Trigger: Morgen","Trigger: nach Essen","Trigger: Abend","Trigger: Einsamkeit","Trigger: Druck/Leistung"
];

function todayISO(){
  const d=new Date(); const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function loadAll(){ try{return JSON.parse(localStorage.getItem("achimTracker")||"{}");}catch{return {};} }
function saveAll(db){ localStorage.setItem("achimTracker", JSON.stringify(db)); }

function ensureDate(db, iso){
  if(!db[iso]){
    db[iso] = {
      ...DEFAULTS, date: iso,
      smokeWindows: SMOKE_WINDOWS.map(()=>({smoked:"", when:"", craving:"", trigger:"", tool:"", result:""})),
      cravingsOutside: [0,1,2].map(()=>({time:"", intensity:"", trigger:"", tool:"", smoked:"", result:""})),
      journal: JOURNAL_ITEMS.map(()=>false),
      updatedAt: ""
    };
  }
  return db[iso];
}
function buildSelect(options, value){
  const s=document.createElement("select");
  const o0=document.createElement("option"); o0.value=""; o0.textContent="–"; s.appendChild(o0);
  options.forEach(v=>{const o=document.createElement("option"); o.value=v; o.textContent=v; s.appendChild(o);});
  s.value=value||"";
  return s;
}
function renderSmoke(){
  const wrap=$("smokeWindows"); wrap.innerHTML="";
  SMOKE_WINDOWS.forEach((w,i)=>{
    const box=document.createElement("details"); box.open=i===0; box.id=`smoke-${i+1}`;
    const sum=document.createElement("summary");
    sum.innerHTML=`<div class="sumLeft"><strong>${w.label}</strong><span class="sumMeta">Fenster ${i+1}</span></div><span class="chip">Ausfüllen</span>`;
    box.appendChild(sum);

    const row=document.createElement("div"); row.className="row"; row.style.marginTop="10px";

    const c2=document.createElement("div"); c2.className="tiny";
    c2.innerHTML=`<label>Geraucht?</label><select id="smoked_${i}"><option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option></select>`;
    const c3=document.createElement("div"); c3.className="tiny";
    c3.innerHTML=`<label>Uhrzeit (wenn ja)</label><input id="when_${i}" type="time">`;
    const c4=document.createElement("div"); c4.className="tiny";
    c4.innerHTML=`<label>Drang 0–10</label><input id="cr_${i}" type="number" min="0" max="10" step="1">`;

    const c5=document.createElement("div"); c5.className="col";
    const trig=buildSelect(TRIGGERS,""); trig.id=`tr_${i}`;
    c5.appendChild(document.createElement("label")).textContent="Trigger"; c5.appendChild(trig);

    const c6=document.createElement("div"); c6.className="col";
    const tool=buildSelect(TOOLS,""); tool.id=`tool_${i}`;
    c6.appendChild(document.createElement("label")).textContent="Tool/Ersatz"; c6.appendChild(tool);

    const c7=document.createElement("div"); c7.className="tiny";
    c7.innerHTML=`<label>Ergebnis 0–10</label><input id="res_${i}" type="number" min="0" max="10" step="1">`;

    row.append(c2,c3,c4,c5,c6,c7); box.appendChild(row); wrap.appendChild(box);
  });
}
function renderCravingsOutside(){
  const wrap=$("cravingsOutside"); wrap.innerHTML="";
  for(let i=0;i<3;i++){
    const box=document.createElement("details"); box.open=i===0; box.id=`craving-${i+1}`;
    const sum=document.createElement("summary");
    sum.innerHTML=`<div class="sumLeft"><strong>Craving ${i+1}</strong><span class="sumMeta">außerhalb Fenster</span></div><span class="chip">optional</span>`;
    box.appendChild(sum);

    const row=document.createElement("div"); row.className="row"; row.style.marginTop="10px";
    const c1=document.createElement("div"); c1.className="tiny";
    c1.innerHTML=`<label>Zeit</label><input id="co_time_${i}" type="time">`;
    const c2=document.createElement("div"); c2.className="tiny";
    c2.innerHTML=`<label>Drang 0–10</label><input id="co_int_${i}" type="number" min="0" max="10" step="1">`;

    const c3=document.createElement("div"); c3.className="col";
    const trig=buildSelect(TRIGGERS,""); trig.id=`co_tr_${i}`;
    c3.appendChild(document.createElement("label")).textContent="Trigger"; c3.appendChild(trig);

    const c4=document.createElement("div"); c4.className="col";
    const tool=buildSelect(TOOLS,""); tool.id=`co_tool_${i}`;
    c4.appendChild(document.createElement("label")).textContent="Tool"; c4.appendChild(tool);

    const c5=document.createElement("div"); c5.className="tiny";
    c5.innerHTML=`<label>Geraucht?</label><select id="co_smoked_${i}"><option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option></select>`;
    const c6=document.createElement("div"); c6.className="tiny";
    c6.innerHTML=`<label>Ergebnis 0–10</label><input id="co_res_${i}" type="number" min="0" max="10" step="1">`;

    row.append(c1,c2,c3,c4,c5,c6); box.appendChild(row); wrap.appendChild(box);
  }
}
function renderJournal(){
  const wrap=$("journalChecks"); wrap.innerHTML="";
  JOURNAL_ITEMS.forEach((txt,i)=>{
    const p=document.createElement("label"); p.className="pill";
    const cb=document.createElement("input"); cb.type="checkbox"; cb.id=`j_${i}`;
    p.appendChild(cb); const span=document.createElement("span"); span.textContent=txt; p.appendChild(span);
    wrap.appendChild(p);
  });
}
function bindTimeline(){
  document.querySelectorAll(".tlbtn").forEach(b=>{
    b.addEventListener("click", ()=> jumpTo(b.getAttribute("data-jump")));
  });
}
function jumpTo(hash){
  const el=document.querySelector(hash); if(!el) return;
  el.scrollIntoView({behavior:"smooth", block:"start"});
  el.classList.add("highlight"); setTimeout(()=>el.classList.remove("highlight"), 1200);
  history.replaceState(null,"",`${location.pathname}${location.search}${hash}`);
}
function bindStatic(){
  $("btnToday").onclick=()=>{ $("date").value=todayISO(); loadToForm(); };
  $("btnPrev").onclick=()=>shiftDate(-1);
  $("btnNext").onclick=()=>shiftDate(1);
  $("btnSave").onclick=saveFromForm;

  $("btnExport").onclick=exportData;
  $("btnImport").onclick=()=> $("filePicker").click();
  $("filePicker").addEventListener("change", importData);

  $("date").addEventListener("change", loadToForm);
  window.addEventListener("hashchange", ()=> handleDeepLink());
}
function shiftDate(delta){
  const d=new Date($("date").value||todayISO()); d.setDate(d.getDate()+delta);
  $("date").value=d.toISOString().slice(0,10); loadToForm();
}
function loadToForm(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db, iso); saveAll(db);

  const map=["bedPlan","bedAct","wakePlan","wakeAct","nightTimes","sleepQ","tension","mood","alive","bodyLoc","state","creaLust","creaEff",
    "rosName","rosTime","walkMin","kleinTake","em1Plan","em1Act","em1Txt","em2Plan","em2Act","em2Txt","canUsed","canTime","canDose","canCalm","canAnx","canSleep","canInt","regLine","trigLine"];
  map.forEach(k=>{ if($(k)) $(k).value = rec[k] ?? ""; });

  rec.smokeWindows.forEach((w,i)=>{
    $("smoked_"+i).value=w.smoked||""; $("when_"+i).value=w.when||""; $("cr_"+i).value=w.craving||"";
    $("tr_"+i).value=w.trigger||""; $("tool_"+i).value=w.tool||""; $("res_"+i).value=w.result||"";
  });
  rec.cravingsOutside.forEach((w,i)=>{
    $("co_time_"+i).value=w.time||""; $("co_int_"+i).value=w.intensity||"";
    $("co_tr_"+i).value=w.trigger||""; $("co_tool_"+i).value=w.tool||"";
    $("co_smoked_"+i).value=w.smoked||""; $("co_res_"+i).value=w.result||"";
  });
  rec.journal.forEach((v,i)=>{ $("j_"+i).checked = !!v; });

  const upd = rec.updatedAt ? new Date(rec.updatedAt).toLocaleString() : "–";
  $("status").innerHTML = `<span style="color:#5eead4;font-weight:600;">Geladen:</span> ${iso} · zuletzt: ${upd}`;
  $("ver").textContent = "Version: " + APP_VERSION;

  handleDeepLink(true);
}
function saveFromForm(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db, iso);
  const read=(id)=>$(id).value;
  ["bedPlan","bedAct","wakePlan","wakeAct","nightTimes","sleepQ","tension","mood","alive","bodyLoc","state","creaLust","creaEff",
   "rosName","rosTime","walkMin","kleinTake","em1Plan","em1Act","em1Txt","em2Plan","em2Act","em2Txt","canUsed","canTime","canDose","canCalm","canAnx","canSleep","canInt","regLine","trigLine"
  ].forEach(k=>rec[k]=read(k));
  rec.smokeWindows = SMOKE_WINDOWS.map((_,i)=>({
    smoked:$("smoked_"+i).value, when:$("when_"+i).value, craving:$("cr_"+i).value,
    trigger:$("tr_"+i).value, tool:$("tool_"+i).value, result:$("res_"+i).value
  }));
  rec.cravingsOutside = [0,1,2].map(i=>({
    time:$("co_time_"+i).value, intensity:$("co_int_"+i).value, trigger:$("co_tr_"+i).value,
    tool:$("co_tool_"+i).value, smoked:$("co_smoked_"+i).value, result:$("co_res_"+i).value
  }));
  rec.journal = JOURNAL_ITEMS.map((_,i)=>$("j_"+i).checked);
  rec.updatedAt = new Date().toISOString();
  db[iso]=rec; saveAll(db);
  $("status").innerHTML = `<span style="color:#5eead4;font-weight:600;">Gespeichert:</span> ${iso} · ${new Date().toLocaleTimeString()}`;
}
function exportData(){
  const db=loadAll(); const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`achim-tracker-export-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function importData(ev){
  const file=ev.target.files?.[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ try{ saveAll(JSON.parse(reader.result)); loadToForm(); alert("Import ok."); }catch(e){ alert("Import fehlgeschlagen: "+e); } };
  reader.readAsText(file);
}
function handleDeepLink(onLoad=false){
  const params=new URLSearchParams(location.search);
  const d=params.get("date");
  if(d && $("date").value!==d){
    $("date").value=d; if(!onLoad) loadToForm();
  }
  const hash=location.hash||""; if(!hash) return;
  const target=document.querySelector(hash);
  if(target){
    if(target.tagName.toLowerCase()==="details") target.open=true;
    setTimeout(()=>{target.scrollIntoView({behavior:"smooth",block:"start"}); target.classList.add("highlight"); setTimeout(()=>target.classList.remove("highlight"),1200);},80);
  }
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(()=>{}); }

renderSmoke(); renderCravingsOutside(); renderJournal(); bindTimeline(); bindStatic();
$("date").value=todayISO(); loadToForm();
