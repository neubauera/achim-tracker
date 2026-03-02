const APP_VERSION = "v4.0 (layout+notes)";
const $ = (id) => document.getElementById(id);

const DEFAULTS = { bedPlan:"21:00", wakePlan:"06:00", em1Plan:"07:05", em2Plan:"16:05" };
const BODY_PARTS = ["Brust","Bauch","Kiefer","Nacken","Schultern","Hals","Rücken","Becken","Beine","Kopf","Unklar"];
const SMOKE_WINDOWS = [
  {id:1, label:"07:30–07:45"},
  {id:2, label:"10:00–10:15"},
  {id:3, label:"12:30–12:45"},
  {id:4, label:"15:00–15:15"},
  {id:5, label:"17:30–17:45"},
  {id:6, label:"19:30–19:45"},
];
const TRIGGERS = ["Morgen","Nach Essen","Abend","Stress","Langweile","Gewohnheit","Sozial","Unruhe","Leere","Traurigkeit","Ärger","Sonstiges"];
const TOOLS = ["Wasser+10 Ausatmungen","2–5 Min Gehen","Dehnen/Wärme","Dusche","Tee","Kaugummi/Bonbon","Mini‑EM 2 Min","Ablenkung 5 Min","Snack/Protein","Sonstiges"];
const EM_PROMPTS = [
  "Jetzt spüre ich… (Körper) · Ich brauche…",
  "Was ist gerade am präsentesten?",
  "Wenn ich 1% ehrlicher wäre, würde ich sagen…",
  "Wo im Körper ist das am stärksten?",
  "Welcher Wunsch steckt darunter?",
  "Welche Grenze braucht es gerade?",
  "Was wäre jetzt der kleinste sichere Schritt (ohne Druck)?"
];
const JOURNAL_ITEMS = [
  "Angst/Unruhe","Ärger/Wut","Traurigkeit","Scham","Leere","Überforderung",
  "Ruhe","Freude","Verbundenheit","Klarheit",
  "Bedürfnis: Ruhe","Bedürfnis: Kontakt","Bedürfnis: Bewegung","Bedürfnis: Essen/Trinken","Bedürfnis: Sicherheit",
  "Trigger: Morgen","Trigger: nach Essen","Trigger: Abend","Trigger: Einsamkeit","Trigger: Druck/Leistung"
];

function todayISO(){ const d=new Date(); const p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function loadAll(){ try{return JSON.parse(localStorage.getItem("achimTracker")||"{}");}catch{return {};} }
function saveAll(db){ localStorage.setItem("achimTracker", JSON.stringify(db)); }

function ensureDate(db, iso){
  if(!db[iso]){
    db[iso] = {
      ...DEFAULTS, date: iso,
      bodyRank1:"", bodyRank2:"", bodyRank3:"",
      bodyExtras: BODY_PARTS.reduce((o,k)=> (o[k]=false,o), {}),
      state:"", stateDetail:"",
      smoke: SMOKE_WINDOWS.reduce((o,w)=> (o[w.id]={smoked:"", when:"", craving:"", trigger:"", triggerOther:"", tool:"", toolOther:"", result:""}, o), {}),
      journal: JOURNAL_ITEMS.map(()=>({checked:false, note:""})),
      notes: [],
      updatedAt:""
    };
  }
  return db[iso];
}

function optList(select, options){
  select.innerHTML = "";
  const o0=document.createElement("option"); o0.value=""; o0.textContent="–"; select.appendChild(o0);
  options.forEach(v=>{const o=document.createElement("option"); o.value=v; o.textContent=v; select.appendChild(o);});
}
function buildSelect(options, value){ const s=document.createElement("select"); optList(s, options); s.value=value||""; return s; }
function toggleOther(val, wrapId){ const el=$(wrapId); if(!el) return; (val==="Sonstiges") ? el.classList.remove("hidden") : el.classList.add("hidden"); }

function renderBodySelectors(){
  ["bodyRank1","bodyRank2","bodyRank3"].forEach(id=> optList($(id), BODY_PARTS));
  const wrap = $("bodyExtras"); wrap.innerHTML = "";
  BODY_PARTS.forEach((p,i)=>{
    const lab=document.createElement("label"); lab.className="pill";
    const cb=document.createElement("input"); cb.type="checkbox"; cb.id=`bextra_${i}`;
    lab.appendChild(cb); const sp=document.createElement("span"); sp.textContent=p; lab.appendChild(sp);
    wrap.appendChild(lab);
  });
}

function renderSmokeCards(){
  const container = $("smokeCards"); container.innerHTML = "";
  SMOKE_WINDOWS.forEach(w=>{
    const card = document.createElement("div");
    card.className="card"; card.id = `smoke-${w.id}`;
    card.innerHTML = `
      <div class="sectionTitle"><h2>Rauchfenster ${w.id} – ${w.label}</h2><span class="chip">optional</span></div>
      <div class="hint">Du darfst 1 rauchen. Du musst nicht. Wenn nein: Tool 2–3 Min, dann neu entscheiden.</div>
      <div class="divider"></div>
      <details open>
        <summary><div class="sumLeft"><strong>Ausfüllen</strong><span class="sumMeta">Fenster ${w.id}</span></div><span class="chip">kurz</span></summary>
        <div class="row" style="margin-top:10px;">
          <div class="tiny"><label>Geraucht?</label><select id="smoked_${w.id}"><option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option></select></div>
          <div class="tiny"><label>Uhrzeit (wenn ja)</label><input id="when_${w.id}" type="time"></div>
          <div class="tiny"><label>Rauchdrang (0–10)</label><input id="cr_${w.id}" type="number" min="0" max="10" step="1"></div>

          <div class="col">
            <label>Trigger</label>
            <div class="row">
              <div class="col" id="tr_wrap_${w.id}" style="flex:1 1 200px"></div>
              <div class="col hidden" id="tr_other_wrap_${w.id}" style="flex:1 1 220px">
                <label class="subtle">Wenn Sonstiges:</label>
                <input id="tr_other_${w.id}" type="text" placeholder="Trigger (frei)">
              </div>
            </div>
          </div>

          <div class="col">
            <label>Tool/Ersatz</label>
            <div class="row">
              <div class="col" id="tool_wrap_${w.id}" style="flex:1 1 200px"></div>
              <div class="col hidden" id="tool_other_wrap_${w.id}" style="flex:1 1 220px">
                <label class="subtle">Wenn Sonstiges:</label>
                <input id="tool_other_${w.id}" type="text" placeholder="Tool (frei)">
              </div>
            </div>
          </div>

          <div class="tiny"><label>Ergebnis (0–10)</label><input id="res_${w.id}" type="number" min="0" max="10" step="1"></div>
        </div>
      </details>
    `;
    container.appendChild(card);

    const trigSel = buildSelect(TRIGGERS, ""); trigSel.id = `tr_${w.id}`; $("tr_wrap_"+w.id).appendChild(trigSel);
    const toolSel = buildSelect(TOOLS, ""); toolSel.id = `tool_${w.id}`; $("tool_wrap_"+w.id).appendChild(toolSel);

    trigSel.addEventListener("change", ()=> toggleOther(trigSel.value, `tr_other_wrap_${w.id}`));
    toolSel.addEventListener("change", ()=> toggleOther(toolSel.value, `tool_other_wrap_${w.id}`));
  });
}

function renderJournal(){
  const wrap=$("journalChecks"); wrap.innerHTML="";
  JOURNAL_ITEMS.forEach((txt,i)=>{
    const box=document.createElement("details"); box.open = i<3; box.id = `j_${i}`;
    const sum=document.createElement("summary");
    sum.innerHTML = `<div class="sumLeft"><strong>${txt}</strong><span class="sumMeta">anklicken → optional Notiz</span></div><span class="chip">optional</span>`;
    box.appendChild(sum);

    const row=document.createElement("div"); row.className="row"; row.style.marginTop="10px";
    const c1=document.createElement("div"); c1.className="tiny";
    c1.innerHTML = `<label>Ankreuzen</label><select id="j_chk_${i}"><option value="no">Nein</option><option value="yes">Ja</option></select>`;
    const c2=document.createElement("div"); c2.className="col hidden"; c2.id = `j_note_wrap_${i}`;
    c2.innerHTML = `<label>Notiz (optional)</label><input id="j_note_${i}" type="text" placeholder="1 Satz reicht">`;
    row.append(c1,c2); box.appendChild(row); wrap.appendChild(box);

    $("j_chk_"+i).addEventListener("change", (e)=>{
      const on = e.target.value==="yes";
      const nw = $("j_note_wrap_"+i);
      if(on) nw.classList.remove("hidden"); else nw.classList.add("hidden");
    });
  });
}

function renderEmPrompts(){
  ["emPrompt1","emPrompt2"].forEach(id=>{
    const sel = $(id);
    sel.innerHTML = "";
    const o0=document.createElement("option"); o0.value=""; o0.textContent="–"; sel.appendChild(o0);
    EM_PROMPTS.forEach(p=>{const o=document.createElement("option"); o.value=p; o.textContent=p; sel.appendChild(o);});
  });
  $("emPrompt1").addEventListener("change", ()=> { if($("emPrompt1").value) $("em1Txt").placeholder = $("emPrompt1").value; });
  $("emPrompt2").addEventListener("change", ()=> { if($("emPrompt2").value) $("em2Txt").placeholder = $("emPrompt2").value; });
}

function jumpTo(hash){
  const el=document.querySelector(hash); if(!el) return;
  el.scrollIntoView({behavior:"smooth", block:"start"});
  el.classList.add("highlight"); setTimeout(()=>el.classList.remove("highlight"), 1200);
  history.replaceState(null,"",`${location.pathname}${location.search}${hash}`);
}

function autoHideLinks(forceHide=false){
  const t = $("timeline"); const btn = $("toggleLinks");
  if(forceHide){ t.classList.add("hidden"); btn.textContent="Einblenden"; return; }
  if(t.classList.contains("hidden")){ t.classList.remove("hidden"); btn.textContent="Ausblenden"; }
  else { t.classList.add("hidden"); btn.textContent="Einblenden"; }
}

function bindTimeline(){
  document.querySelectorAll(".tlbtn").forEach(b=>{
    b.addEventListener("click", ()=>{
      const target=b.getAttribute("data-jump"); if(target) jumpTo(target);
      setTimeout(()=> autoHideLinks(true), 200);
    });
  });
}

function shiftDate(delta){
  const d=new Date($("date").value||todayISO()); d.setDate(d.getDate()+delta);
  $("date").value=d.toISOString().slice(0,10); loadToForm();
}

function renderNotes(notes){
  const el = $("noteList");
  if(!notes.length){ el.textContent = "Noch keine Notizen."; return; }
  el.innerHTML = notes.map(n=>`<div style="margin:8px 0;"><strong>${escapeHtml(n.time)}</strong> · ${escapeHtml(n.title)}<div class="subtle">${escapeHtml(n.text)}</div></div>`).join("");
}
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

function addNote(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db, iso);

  const t = $("noteTime").value || new Date().toTimeString().slice(0,5);
  const title = $("noteTitle").value || "Notiz";
  const text = $("noteText").value || "";
  if(!text.trim() && !title.trim()) return;

  rec.notes = rec.notes || [];
  rec.notes.unshift({time:t, title, text});
  rec.updatedAt = new Date().toISOString();
  db[iso]=rec; saveAll(db);

  $("noteTime").value=""; $("noteTitle").value=""; $("noteText").value="";
  renderNotes(rec.notes);
  $("status").innerHTML = `<span style="color:#5eead4;font-weight:600;">Gespeichert:</span> ${iso} · ${new Date().toLocaleTimeString()}`;
}

function loadToForm(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db, iso); saveAll(db);

  const fields = ["bedPlan","bedAct","wakePlan","wakeAct","nightTimes","sleepQ","tension","mood","alive","creaLust","creaEff",
                  "rosName","rosTime","walkMin","kleinTake","em1Plan","em1Act","em1Txt","em2Plan","em2Act","em2Txt",
                  "canUsed","canTime","canDose","canCalm","canAnx","canSleep","canInt","regLine","trigLine"];
  fields.forEach(k=>{ if($(k)) $(k).value = rec[k] ?? ""; });

  $("bodyRank1").value = rec.bodyRank1 || ""; $("bodyRank2").value = rec.bodyRank2 || ""; $("bodyRank3").value = rec.bodyRank3 || "";
  BODY_PARTS.forEach((p,i)=>{ $("bextra_"+i).checked = !!rec.bodyExtras?.[p]; });

  $("state").value = rec.state || ""; $("stateDetail").value = rec.stateDetail || "";
  if($("state").value==="mix") $("stateDetailWrap").classList.remove("hidden"); else $("stateDetailWrap").classList.add("hidden");

  SMOKE_WINDOWS.forEach(w=>{
    const s = rec.smoke[w.id] || {};
    $("smoked_"+w.id).value = s.smoked || ""; $("when_"+w.id).value = s.when || ""; $("cr_"+w.id).value = s.craving || "";
    $("tr_"+w.id).value = s.trigger || ""; $("tr_other_"+w.id).value = s.triggerOther || ""; toggleOther($("tr_"+w.id).value, "tr_other_wrap_"+w.id);
    $("tool_"+w.id).value = s.tool || ""; $("tool_other_"+w.id).value = s.toolOther || ""; toggleOther($("tool_"+w.id).value, "tool_other_wrap_"+w.id);
    $("res_"+w.id).value = s.result || "";
  });

  rec.journal.forEach((j,i)=>{
    $("j_chk_"+i).value = j.checked ? "yes" : "no";
    $("j_note_"+i).value = j.note || "";
    const nw = $("j_note_wrap_"+i);
    if(j.checked) nw.classList.remove("hidden"); else nw.classList.add("hidden");
  });

  renderNotes(rec.notes || []);

  const upd = rec.updatedAt ? new Date(rec.updatedAt).toLocaleString() : "–";
  $("status").innerHTML = `<span style="color:#5eead4;font-weight:600;">Geladen:</span> ${iso} · zuletzt: ${upd}`;
  $("ver").textContent = "Version: " + APP_VERSION;

  handleDeepLink();
}

function saveFromForm(){
  const iso=$("date").value||todayISO();
  const db=loadAll(); const rec=ensureDate(db, iso);
  const read=(id)=>$(id).value;

  ["bedPlan","bedAct","wakePlan","wakeAct","nightTimes","sleepQ","tension","mood","alive","creaLust","creaEff",
   "rosName","rosTime","walkMin","kleinTake","em1Plan","em1Act","em1Txt","em2Plan","em2Act","em2Txt",
   "canUsed","canTime","canDose","canCalm","canAnx","canSleep","canInt","regLine","trigLine"
  ].forEach(k=> rec[k]=read(k));

  rec.bodyRank1=read("bodyRank1"); rec.bodyRank2=read("bodyRank2"); rec.bodyRank3=read("bodyRank3");
  rec.bodyExtras={}; BODY_PARTS.forEach((p,i)=> rec.bodyExtras[p] = $("bextra_"+i).checked);

  rec.state=read("state"); rec.stateDetail=read("stateDetail");

  SMOKE_WINDOWS.forEach(w=>{
    rec.smoke[w.id] = {
      smoked: read("smoked_"+w.id),
      when: read("when_"+w.id),
      craving: read("cr_"+w.id),
      trigger: read("tr_"+w.id),
      triggerOther: read("tr_other_"+w.id),
      tool: read("tool_"+w.id),
      toolOther: read("tool_other_"+w.id),
      result: read("res_"+w.id)
    };
  });

  rec.journal = JOURNAL_ITEMS.map((_,i)=>({
    checked: read("j_chk_"+i)==="yes",
    note: read("j_note_"+i)
  }));

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

function handleDeepLink(){
  const params=new URLSearchParams(location.search);
  const d=params.get("date"); if(d && $("date").value!==d) $("date").value=d;
  const hash=location.hash||""; if(!hash) return;
  const target=document.querySelector(hash);
  if(target){ setTimeout(()=> jumpTo(hash), 80); }
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

  $("toggleLinks").onclick = ()=> autoHideLinks(false);
  $("state").addEventListener("change", ()=> { ($("state").value==="mix") ? $("stateDetailWrap").classList.remove("hidden") : $("stateDetailWrap").classList.add("hidden"); });

  $("btnAddNote").onclick = addNote;
}

function init(){
  renderBodySelectors();
  renderSmokeCards();
  renderJournal();
  renderEmPrompts();
  bindTimeline();
  bindStatic();
  $("date").value=todayISO();
  loadToForm();
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(()=>{}); }
init();
