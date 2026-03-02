const APP_VERSION="v5.0 (compact + dynamic)";
const $=(id)=>document.getElementById(id);

const DEFAULTS={bedPlan:"21:00",wakePlan:"06:00",em1Plan:"07:05",em2Plan:"16:05"};
const NS_STATES=["Verbunden/Sicher","Anspannung/Alarm","Shutdown/Leer","Mischung/Wechsel","Leere","Enge","Unruhe"];
const BODY_PARTS=["Brust","Bauch","Kiefer","Nacken","Schultern","Hals","Rücken","Becken","Beine","Kopf","Sonstiges"];
const BODY_OTHER=["Zunge","Augen","Stirn","Magen","Herzraum","Hände","Füße","Zwerchfell"];
const TRIGGERS=["Morgen","Nach Essen","Abend","Stress","Langweile","Gewohnheit","Sozial","Unruhe","Leere","Traurigkeit","Ärger","Sonstiges"];
const TOOLS=["Wasser + 10 Ausatmungen","2–5 Min Gehen","Dehnen/Wärme","Dusche","Tee","Kaugummi/Bonbon","Mini‑EM 2 Min","Ablenkung 5 Min","Snack/Protein","Sonstiges"];
const EM_PROMPTS=[
  "Da ist [Körperempfindung]… (ohne Geschichte).",
  "Das Nervensystem zeigt gerade [Alarm/Shutdown/Weite]…",
  "Ein Teil will [Nähe/Distanz/Entladung]…",
  "Widerstand gegen [Empfindung] ist da…",
  "Wenn ich nichts löse, nur wahrnehme: …",
  "Mini‑Wahrheit jetzt: …"
];
const JOURNAL_ITEMS=[
  "Angst/Unruhe","Ärger/Wut","Traurigkeit","Scham","Leere","Überforderung",
  "Ruhe","Freude","Verbundenheit","Klarheit",
  "Bedürfnis: Ruhe","Bedürfnis: Kontakt","Bedürfnis: Bewegung","Bedürfnis: Essen/Trinken","Bedürfnis: Sicherheit",
  "Trigger: Morgen","Trigger: nach Essen","Trigger: Abend","Trigger: Einsamkeit","Trigger: Druck/Leistung"
];

function todayISO(){const d=new Date();const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function nowHHMM(){return new Date().toTimeString().slice(0,5);}
function loadAll(){try{return JSON.parse(localStorage.getItem("achimTracker")||"{}");}catch{return {};}}
function saveAll(db){localStorage.setItem("achimTracker",JSON.stringify(db));}
function ensureDate(db,iso){
  if(!db[iso]){
    db[iso]={...DEFAULTS,date:iso,bedAct:"",wakeAct:"",
      night:[], sleepQ:"",tension:"",mood:"",alive:"",
      body:[], ns:[], creaLust:"",creaEff:"",
      rosName:"",rosTime:"",walkMin:"",kleinTake:"",
      em1Act:"",em1Txt:"",em2Act:"",em2Txt:"",
      smoke:[],
      canUsed:"",canTime:"",canDose:"",canCalm:"",canAnx:"",canSleep:"",canInt:"",
      journal:JOURNAL_ITEMS.map(()=>({on:false,note:""})),
      notes:[],
      regLine:"",trigLine:"",
      updatedAt:""
    };
  }
  return db[iso];
}
function setStatus(rec){
  const upd=rec.updatedAt?new Date(rec.updatedAt).toLocaleString():"–";
  $("status").innerHTML=`<span style="color:#5eead4;font-weight:700;">Geladen</span>: ${rec.date} · zuletzt: ${upd}`;
  $("ver").textContent="Version: "+APP_VERSION;
  $("modalVer").textContent="Version: "+APP_VERSION;
}
function updateTodayTag(){ $("todayTag").style.display = ($("date").value===todayISO()) ? "inline-flex" : "none"; }
function fillNumeric(id,val){
  const s=$(id); if(!s) return;
  s.innerHTML='<option value="">–</option>'+Array.from({length:11},(_,i)=>`<option value="${i}">${i}</option>`).join("");
  s.value=val||"";
}
function fillSelect(id,opts,val){
  const s=$(id); if(!s) return;
  s.innerHTML='<option value="">–</option>'+opts.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("");
  s.value=val||"";
}
function esc(x){return String(x||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));}
function openModal(open){$("modalBack").style.display=open?"flex":"none";}
function jumpTo(sel){
  const el=document.querySelector(sel); if(!el) return;
  el.scrollIntoView({behavior:"smooth",block:"start"});
  el.classList.add("highlight"); setTimeout(()=>el.classList.remove("highlight"),1200);
  history.replaceState(null,"",`${location.pathname}${location.search}${sel}`);
}
function renderNight(rec){
  const host=$("nightList"); host.innerHTML="";
  if(!rec.night.length){host.innerHTML='<div class="sub">Keine Perioden eingetragen.</div>'; return;}
  rec.night.forEach((p,idx)=>{
    const row=document.createElement("div"); row.className="row";
    row.innerHTML=`<div class="tiny"><label>von</label><input type="time" id="nf_${idx}"></div>
                   <div class="tiny"><label>bis</label><input type="time" id="nt_${idx}"></div>
                   <div class="tiny" style="align-self:flex-end;"><button id="nd_${idx}">Löschen</button></div>`;
    host.appendChild(row);
    setTimeout(()=>{
      $(`nf_${idx}`).value=p.from||""; $(`nt_${idx}`).value=p.to||"";
      const persist=()=>{p.from=$(`nf_${idx}`).value;p.to=$(`nt_${idx}`).value;saveRec(rec);};
      $(`nf_${idx}`).addEventListener("change",persist); $(`nt_${idx}`).addEventListener("change",persist);
      $(`nd_${idx}`).onclick=()=>{rec.night.splice(idx,1);saveRec(rec);renderNight(rec);};
    },0);
  });
}
function renderBody(rec){
  const host=$("bodyList"); host.innerHTML="";
  if(!rec.body.length){host.innerHTML='<div class="sub">Noch keine Körperstellen gewählt.</div>'; return;}
  rec.body.forEach((b,idx)=>{
    const row=document.createElement("div"); row.className="row";
    row.innerHTML=`<div class="col">
        <label>${idx+1}.</label>
        <select id="bs_${idx}"></select>
        <div id="bo_wrap_${idx}" class="hidden" style="margin-top:8px;">
          <label>Sonstiges</label><select id="bo_${idx}"></select>
        </div>
      </div>
      <div class="tiny" style="align-self:flex-end;"><button id="bd_${idx}">Löschen</button></div>`;
    host.appendChild(row);
    setTimeout(()=>{
      fillSelect(`bs_${idx}`,BODY_PARTS,b.part||"");
      fillSelect(`bo_${idx}`,BODY_OTHER,b.other||"");
      const wrap=$(`bo_wrap_${idx}`);
      const toggle=()=>wrap.classList.toggle("hidden",$(`bs_${idx}`).value!=="Sonstiges");
      toggle();
      $(`bs_${idx}`).addEventListener("change",()=>{b.part=$(`bs_${idx}`).value;toggle();saveRec(rec);});
      $(`bo_${idx}`).addEventListener("change",()=>{b.other=$(`bo_${idx}`).value;saveRec(rec);});
      $(`bd_${idx}`).onclick=()=>{rec.body.splice(idx,1);saveRec(rec);renderBody(rec);};
    },0);
  });
}
function renderNS(rec){
  const host=$("nsList"); host.innerHTML="";
  NS_STATES.forEach((s,i)=>{
    const lab=document.createElement("label"); lab.className="pill";
    lab.innerHTML=`<input type="checkbox" id="ns_${i}"><span>${esc(s)}</span>`;
    host.appendChild(lab);
    setTimeout(()=>{
      $(`ns_${i}`).checked=rec.ns.includes(s);
      $(`ns_${i}`).addEventListener("change",()=>{
        if($(`ns_${i}`).checked && !rec.ns.includes(s)) rec.ns.push(s);
        if(!$(`ns_${i}`).checked) rec.ns=rec.ns.filter(x=>x!==s);
        saveRec(rec);
      });
    },0);
  });
}
function renderSmoke(rec){
  const host=$("smokeList"); host.innerHTML="";
  if(!rec.smoke.length){host.innerHTML='<div class="sub">Noch keine Rauchfenster.</div>'; return;}
  rec.smoke.sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  rec.smoke.forEach((w,idx)=>{
    const det=document.createElement("details"); det.open=idx===0;
    det.innerHTML=`<summary><div class="sumLeft"><strong>${esc(w.time||"Zeit")}</strong><span class="sumMeta">Rauchfenster</span></div><span class="chip">kurz</span></summary>
      <div style="margin-top:10px;">
        <div class="row">
          <div class="tiny"><label>Zeit</label><input id="st_${idx}" type="time"></div>
          <div class="tiny"><label>Geraucht?</label><select id="ss_${idx}"><option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option></select></div>
          <div class="tiny"><label>Drang</label><select id="sc_${idx}"></select></div>
          <div class="tiny" style="align-self:flex-end;"><button id="sd_${idx}">Löschen</button></div>
        </div>
        <div class="row" style="margin-top:10px;">
          <div class="col">
            <label>Trigger</label><select id="str_${idx}"></select>
            <div id="stro_${idx}" class="hidden" style="margin-top:8px;"><label>Trigger (Sonstiges)</label><input id="stroi_${idx}" type="text"></div>
          </div>
          <div class="col">
            <label>Tool</label><select id="stl_${idx}"></select>
            <div id="stlo_${idx}" class="hidden" style="margin-top:8px;"><label>Tool (Sonstiges)</label><input id="stloi_${idx}" type="text"></div>
          </div>
          <div class="tiny"><label>Ergebnis</label><select id="sr_${idx}"></select></div>
        </div>
      </div>`;
    host.appendChild(det);
    setTimeout(()=>{
      $(`st_${idx}`).value=w.time||"";
      $(`ss_${idx}`).value=w.smoked||"";
      fillNumeric(`sc_${idx}`,w.craving||"");
      fillSelect(`str_${idx}`,TRIGGERS,w.trigger||"");
      $(`stroi_${idx}`).value=w.triggerOther||"";
      fillSelect(`stl_${idx}`,TOOLS,w.tool||"");
      $(`stloi_${idx}`).value=w.toolOther||"";
      fillNumeric(`sr_${idx}`,w.result||"");

      const toggleO=(sel,wrap)=>$(wrap).classList.toggle("hidden",$(sel).value!=="Sonstiges");
      const persist=()=>{
        w.time=$(`st_${idx}`).value;
        w.smoked=$(`ss_${idx}`).value;
        w.craving=$(`sc_${idx}`).value;
        w.trigger=$(`str_${idx}`).value;
        w.triggerOther=$(`stroi_${idx}`).value;
        w.tool=$(`stl_${idx}`).value;
        w.toolOther=$(`stloi_${idx}`).value;
        w.result=$(`sr_${idx}`).value;
        saveRec(rec);
      };
      ["st_","ss_","sc_","str_","stroi_","stl_","stloi_","sr_"].forEach(p=>{
        const el=$(p+idx); if(el){ el.addEventListener("change",persist); el.addEventListener("input",persist); }
      });
      $(`str_${idx}`).addEventListener("change",()=>{toggleO(`str_${idx}`,`stro_${idx}`);persist();});
      $(`stl_${idx}`).addEventListener("change",()=>{toggleO(`stl_${idx}`,`stlo_${idx}`);persist();});
      toggleO(`str_${idx}`,`stro_${idx}`); toggleO(`stl_${idx}`,`stlo_${idx}`);
      $(`sd_${idx}`).onclick=()=>{rec.smoke.splice(idx,1);saveRec(rec);renderSmoke(rec);};
    },0);
  });
}
function renderJournal(rec){
  const host=$("journalChips"); host.innerHTML="";
  rec.journal.forEach((j,i)=>{
    const wrap=document.createElement("div"); wrap.style.marginBottom="10px";
    wrap.innerHTML=`<label class="pill"><input type="checkbox" id="j_${i}"><span>${esc(JOURNAL_ITEMS[i])}</span></label>
      <div id="jnw_${i}" class="${j.on?'':'hidden'}" style="margin-top:8px;">
        <label>Mini‑Notiz</label><input id="jni_${i}" type="text" placeholder="1 Satz reicht">
      </div>`;
    host.appendChild(wrap);
    setTimeout(()=>{
      $(`j_${i}`).checked=!!j.on;
      $(`jni_${i}`).value=j.note||"";
      $(`j_${i}`).addEventListener("change",()=>{j.on=$(`j_${i}`).checked; $(`jnw_${i}`).classList.toggle("hidden",!j.on); saveRec(rec);});
      $(`jni_${i}`).addEventListener("input",()=>{j.note=$(`jni_${i}`).value; saveRec(rec);});
    },0);
  });
}
function renderNotes(rec){
  const el=$("noteList");
  if(!rec.notes.length){el.textContent="Noch keine Notizen."; return;}
  el.innerHTML=rec.notes.slice().sort((a,b)=>(a.time||"").localeCompare(b.time||""))
    .map(n=>`<div style="margin:8px 0;"><strong>${esc(n.time)}</strong> · ${esc(n.title)}<div class="sub">${esc(n.text)}</div></div>`).join("");
}
function saveRec(rec){
  const db=loadAll();
  rec.updatedAt=new Date().toISOString();
  db[rec.date]=rec; saveAll(db);
  setStatus(rec);
}
function loadToForm(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db,iso); saveAll(db);
  updateTodayTag(); setStatus(rec);

  $("bedPlan").value=rec.bedPlan||DEFAULTS.bedPlan;
  $("bedAct").value=rec.bedAct||"";
  $("wakePlan").value=rec.wakePlan||DEFAULTS.wakePlan;
  $("wakeAct").value=rec.wakeAct||"";

  renderNight(rec); renderBody(rec); renderNS(rec); renderSmoke(rec); renderJournal(rec); renderNotes(rec);

  ["sleepQ","tension","mood","alive","creaLust","creaEff","canCalm","canAnx","canSleep"].forEach(id=>fillNumeric(id,rec[id]));
  $("rosName").value=rec.rosName||""; $("rosTime").value=rec.rosTime||""; $("walkMin").value=rec.walkMin||""; $("kleinTake").value=rec.kleinTake||"";
  fillSelect("emPrompt1",EM_PROMPTS,""); fillSelect("emPrompt2",EM_PROMPTS,"");
  $("em1Plan").value=rec.em1Plan||DEFAULTS.em1Plan; $("em1Act").value=rec.em1Act||""; $("em1Txt").value=rec.em1Txt||"";
  $("em2Plan").value=rec.em2Plan||DEFAULTS.em2Plan; $("em2Act").value=rec.em2Act||""; $("em2Txt").value=rec.em2Txt||"";
  $("canUsed").value=rec.canUsed||""; $("canTime").value=rec.canTime||""; $("canDose").value=rec.canDose||"";
  $("canInt").value=rec.canInt||"";
  $("regLine").value=rec.regLine||""; $("trigLine").value=rec.trigLine||"";
  handleDeepLink();
}
function saveFromForm(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db,iso);
  rec.bedPlan=$("bedPlan").value; rec.bedAct=$("bedAct").value; rec.wakePlan=$("wakePlan").value; rec.wakeAct=$("wakeAct").value;
  ["sleepQ","tension","mood","alive","creaLust","creaEff"].forEach(id=>rec[id]=$(id).value);
  rec.rosName=$("rosName").value; rec.rosTime=$("rosTime").value; rec.walkMin=$("walkMin").value; rec.kleinTake=$("kleinTake").value;
  rec.em1Plan=$("em1Plan").value; rec.em1Act=$("em1Act").value; rec.em1Txt=$("em1Txt").value;
  rec.em2Plan=$("em2Plan").value; rec.em2Act=$("em2Act").value; rec.em2Txt=$("em2Txt").value;
  rec.canUsed=$("canUsed").value; rec.canTime=$("canTime").value; rec.canDose=$("canDose").value;
  ["canCalm","canAnx","canSleep"].forEach(id=>rec[id]=$(id).value);
  rec.canInt=$("canInt").value;
  rec.regLine=$("regLine").value; rec.trigLine=$("trigLine").value;
  // persist night/body (smoke/journal persist live)
  rec.night=rec.night.map((p,idx)=>({from:$(`nf_${idx}`)?.value||p.from||"",to:$(`nt_${idx}`)?.value||p.to||""}));
  rec.body=rec.body.map((b,idx)=>({part:$(`bs_${idx}`)?.value||b.part||"",other:$(`bo_${idx}`)?.value||b.other||""}));
  rec.updatedAt=new Date().toISOString(); db[iso]=rec; saveAll(db); setStatus(rec);
}
function exportData(){
  const db=loadAll(); const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`achim-tracker-export-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function importData(ev){
  const file=ev.target.files?.[0]; if(!file) return;
  const r=new FileReader();
  r.onload=()=>{try{saveAll(JSON.parse(r.result)); loadToForm(); alert("Import ok.");}catch(e){alert("Import fehlgeschlagen: "+e);} };
  r.readAsText(file);
}
function handleDeepLink(){
  const params=new URLSearchParams(location.search);
  const d=params.get("date"); if(d && $("date").value!==d) $("date").value=d;
  const hash=location.hash||""; if(!hash) return;
  setTimeout(()=>jumpTo(hash),80);
}
function shiftDate(delta){
  const d=new Date($("date").value||todayISO()); d.setDate(d.getDate()+delta);
  $("date").value=d.toISOString().slice(0,10); loadToForm();
}
function addNight(){
  const db=loadAll(); const rec=ensureDate(db,$("date").value||todayISO());
  rec.night.push({from:"",to:""}); saveRec(rec); renderNight(rec);
}
function addBody(){
  const db=loadAll(); const rec=ensureDate(db,$("date").value||todayISO());
  if(rec.body.length>=6){alert("Max 6 Körperstellen."); return;}
  rec.body.push({part:"",other:""}); saveRec(rec); renderBody(rec);
}
function addSmoke(){
  const db=loadAll(); const rec=ensureDate(db,$("date").value||todayISO());
  rec.smoke.push({time:nowHHMM(),smoked:"",craving:"",trigger:"",triggerOther:"",tool:"",toolOther:"",result:""}); saveRec(rec); renderSmoke(rec);
}
function showNoteForm(show){$("noteForm").classList.toggle("hidden",!show);}
function addNote(){
  const db=loadAll(); const rec=ensureDate(db,$("date").value||todayISO());
  const time=$("noteTime").value||nowHHMM(); const title=$("noteTitle").value||"Notiz"; const text=$("noteText").value||"";
  if(!title.trim() && !text.trim()) return;
  rec.notes.push({time,title,text});
  $("noteTime").value=""; $("noteTitle").value=""; $("noteText").value="";
  showNoteForm(false); saveRec(rec); renderNotes(rec);
}
function bind(){
  $("btnLinks").onclick=()=>$("qlBar").classList.toggle("hidden");
  document.querySelectorAll(".qlBtn").forEach(b=>b.addEventListener("click",()=>{jumpTo(b.getAttribute("data-jump")); $("qlBar").classList.add("hidden");}));
  $("btnSettings").onclick=()=>openModal(true);
  $("btnCloseModal").onclick=()=>openModal(false);
  $("modalBack").addEventListener("click",(e)=>{if(e.target.id==="modalBack") openModal(false);});
  $("btnExport").onclick=exportData;
  $("btnImport").onclick=()=>$("filePicker").click();
  $("filePicker").addEventListener("change",importData);

  $("btnToday").onclick=()=>{$("date").value=todayISO(); loadToForm();};
  $("date").addEventListener("change",loadToForm);
  $("btnPrev").onclick=()=>shiftDate(-1);
  $("btnNext").onclick=()=>shiftDate(1);
  $("btnSave").onclick=saveFromForm;

  $("btnAddNight").onclick=addNight;
  $("btnAddBody").onclick=addBody;
  $("btnAddSmoke").onclick=addSmoke;

  $("btnShowNote").onclick=()=>showNoteForm(true);
  $("btnCancelNote").onclick=()=>showNoteForm(false);
  $("btnAddNote").onclick=addNote;

  $("emPrompt1").addEventListener("change",()=>{if($("emPrompt1").value) $("em1Txt").placeholder=$("emPrompt1").value;});
  $("emPrompt2").addEventListener("change",()=>{if($("emPrompt2").value) $("em2Txt").placeholder=$("emPrompt2").value;});

  setInterval(updateTodayTag,30000);
}
function init(){
  $("date").value=todayISO();
  bind();
  loadToForm();
}
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
init();
