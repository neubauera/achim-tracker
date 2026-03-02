// Achim Tracker – offlinefähige Mini-App (PWA)
const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  bedPlan: "21:00", wakePlan: "06:00",
  em1Plan: "07:05", em2Plan: "16:05"
};

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
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function loadAll(){
  try { return JSON.parse(localStorage.getItem("achimTracker")||"{}"); }
  catch { return {}; }
}

function saveAll(db){
  localStorage.setItem("achimTracker", JSON.stringify(db));
}

function ensureDate(db, iso){
  if(!db[iso]){
    db[iso] = {
      ...DEFAULTS,
      date: iso,
      smokeWindows: SMOKE_WINDOWS.map(()=>({smoked:null, craving:null, trigger:"", tool:"", result:null, when:""})),
      cravingsOutside: [0,1,2].map(()=>({time:"", intensity:null, trigger:"", tool:"", smoked:null, result:null})),
      journal: JOURNAL_ITEMS.map(()=>false),
    };
  }
  return db[iso];
}

function buildSelect(options, value){
  const s = document.createElement("select");
  const o0 = document.createElement("option"); o0.value=""; o0.textContent="–"; s.appendChild(o0);
  options.forEach(v=>{ const o=document.createElement("option"); o.value=v; o.textContent=v; s.appendChild(o); });
  s.value = value || "";
  return s;
}

function renderSmoke(){
  const wrap = $("smokeWindows");
  wrap.innerHTML = "";
  SMOKE_WINDOWS.forEach((w,i)=>{
    const row = document.createElement("div");
    row.className = "row";
    row.style.marginBottom = "8px";

    const c1 = document.createElement("div"); c1.className="tiny";
    c1.innerHTML = `<label>Zeitfenster</label><input type="text" value="${w.label}" disabled>`;
    const c2 = document.createElement("div"); c2.className="tiny";
    c2.innerHTML = `<label>Geraucht?</label>
      <select id="smoked_${i}">
        <option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option>
      </select>`;
    const c3 = document.createElement("div"); c3.className="tiny";
    c3.innerHTML = `<label>Uhrzeit (wenn ja)</label><input id="when_${i}" type="time">`;
    const c4 = document.createElement("div"); c4.className="tiny";
    c4.innerHTML = `<label>Drang 0–10</label><input id="cr_${i}" type="number" min="0" max="10" step="1">`;

    const c5 = document.createElement("div"); c5.className="col";
    const trig = buildSelect(TRIGGERS, "");
    trig.id = `tr_${i}`;
    c5.appendChild(document.createElement("label")).textContent = "Trigger";
    c5.appendChild(trig);

    const c6 = document.createElement("div"); c6.className="col";
    const tool = buildSelect(TOOLS, "");
    tool.id = `tool_${i}`;
    c6.appendChild(document.createElement("label")).textContent = "Tool/Ersatz";
    c6.appendChild(tool);

    const c7 = document.createElement("div"); c7.className="tiny";
    c7.innerHTML = `<label>Ergebnis 0–10</label><input id="res_${i}" type="number" min="0" max="10" step="1">`;

    row.append(c1,c2,c3,c4,c5,c6,c7);
    wrap.appendChild(row);
  });
}

function renderCravingsOutside(){
  const wrap = $("cravingsOutside");
  wrap.innerHTML = "";
  for(let i=0;i<3;i++){
    const row = document.createElement("div");
    row.className="row";
    row.style.marginBottom="8px";

    const c1 = document.createElement("div"); c1.className="tiny";
    c1.innerHTML = `<label>Zeit</label><input id="co_time_${i}" type="time">`;
    const c2 = document.createElement("div"); c2.className="tiny";
    c2.innerHTML = `<label>Drang 0–10</label><input id="co_int_${i}" type="number" min="0" max="10" step="1">`;

    const c3 = document.createElement("div"); c3.className="col";
    const trig = buildSelect(TRIGGERS, ""); trig.id = `co_tr_${i}`;
    c3.appendChild(document.createElement("label")).textContent="Trigger";
    c3.appendChild(trig);

    const c4 = document.createElement("div"); c4.className="col";
    const tool = buildSelect(TOOLS, ""); tool.id = `co_tool_${i}`;
    c4.appendChild(document.createElement("label")).textContent="Tool";
    c4.appendChild(tool);

    const c5 = document.createElement("div"); c5.className="tiny";
    c5.innerHTML = `<label>Geraucht?</label>
      <select id="co_smoked_${i}">
        <option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option>
      </select>`;

    const c6 = document.createElement("div"); c6.className="tiny";
    c6.innerHTML = `<label>Ergebnis 0–10</label><input id="co_res_${i}" type="number" min="0" max="10" step="1">`;

    row.append(c1,c2,c3,c4,c5,c6);
    wrap.appendChild(row);
  }
}

function renderJournal(){
  const wrap = $("journalChecks");
  wrap.innerHTML = "";
  JOURNAL_ITEMS.forEach((txt,i)=>{
    const p = document.createElement("label");
    p.className = "pill";
    const cb = document.createElement("input");
    cb.type="checkbox";
    cb.id = `j_${i}`;
    p.appendChild(cb);
    const span = document.createElement("span");
    span.textContent = txt;
    p.appendChild(span);
    wrap.appendChild(p);
  });
}

function bindStatic(){
  $("btnToday").onclick = ()=> { $("date").value = todayISO(); loadToForm(); };
  $("btnPrev").onclick = ()=> shiftDate(-1);
  $("btnNext").onclick = ()=> shiftDate(1);
  $("btnSave").onclick = saveFromForm;

  $("btnExport").onclick = exportData;
  $("btnImport").onclick = ()=> $("filePicker").click();
  $("filePicker").addEventListener("change", importData);

  $("date").addEventListener("change", loadToForm);
}

function shiftDate(delta){
  const d = new Date($("date").value || todayISO());
  d.setDate(d.getDate()+delta);
  $("date").value = d.toISOString().slice(0,10);
  loadToForm();
}

function loadToForm(){
  const iso = $("date").value || todayISO();
  const db = loadAll();
  const rec = ensureDate(db, iso);
  saveAll(db);

  // map simple inputs
  const map = {
    bedPlan:"bedPlan", bedAct:"bedAct", wakePlan:"wakePlan", wakeAct:"wakeAct",
    nightTimes:"nightTimes", sleepQ:"sleepQ",
    tension:"tension", mood:"mood", alive:"alive", bodyLoc:"bodyLoc", state:"state",
    creaLust:"creaLust", creaEff:"creaEff",
    rosName:"rosName", rosTime:"rosTime", walkMin:"walkMin", kleinTake:"kleinTake",
    em1Plan:"em1Plan", em1Act:"em1Act", em1Txt:"em1Txt",
    em2Plan:"em2Plan", em2Act:"em2Act", em2Txt:"em2Txt",
    canUsed:"canUsed", canTime:"canTime", canDose:"canDose", canCalm:"canCalm",
    canAnx:"canAnx", canSleep:"canSleep", canInt:"canInt",
    regLine:"regLine", trigLine:"trigLine"
  };
  Object.entries(map).forEach(([k,id])=>{
    if($(id)) $(id).value = rec[k] ?? "";
  });

  // smoke windows
  rec.smokeWindows.forEach((w,i)=>{
    $("smoked_"+i).value = w.smoked ?? "";
    $("when_"+i).value = w.when ?? "";
    $("cr_"+i).value = w.craving ?? "";
    $("tr_"+i).value = w.trigger ?? "";
    $("tool_"+i).value = w.tool ?? "";
    $("res_"+i).value = w.result ?? "";
  });

  // cravings outside
  rec.cravingsOutside.forEach((w,i)=>{
    $("co_time_"+i).value = w.time ?? "";
    $("co_int_"+i).value = w.intensity ?? "";
    $("co_tr_"+i).value = w.trigger ?? "";
    $("co_tool_"+i).value = w.tool ?? "";
    $("co_smoked_"+i).value = w.smoked ?? "";
    $("co_res_"+i).value = w.result ?? "";
  });

  // journal
  rec.journal.forEach((v,i)=> { $("j_"+i).checked = !!v; });

  $("status").innerHTML = `<span class="ok">Geladen:</span> ${iso} (lokal gespeichert)`;
}

function saveFromForm(){
  const iso = $("date").value || todayISO();
  const db = loadAll();
  const rec = ensureDate(db, iso);

  const read = (id)=> $(id).value;
  // simple fields
  Object.assign(rec, {
    bedPlan: read("bedPlan"), bedAct: read("bedAct"),
    wakePlan: read("wakePlan"), wakeAct: read("wakeAct"),
    nightTimes: read("nightTimes"), sleepQ: read("sleepQ"),
    tension: read("tension"), mood: read("mood"), alive: read("alive"),
    bodyLoc: read("bodyLoc"), state: read("state"),
    creaLust: read("creaLust"), creaEff: read("creaEff"),
    rosName: read("rosName"), rosTime: read("rosTime"),
    walkMin: read("walkMin"), kleinTake: read("kleinTake"),
    em1Plan: read("em1Plan"), em1Act: read("em1Act"), em1Txt: read("em1Txt"),
    em2Plan: read("em2Plan"), em2Act: read("em2Act"), em2Txt: read("em2Txt"),
    canUsed: read("canUsed"), canTime: read("canTime"), canDose: read("canDose"),
    canCalm: read("canCalm"), canAnx: read("canAnx"), canSleep: read("canSleep"),
    canInt: read("canInt"),
    regLine: read("regLine"), trigLine: read("trigLine"),
    updatedAt: new Date().toISOString()
  });

  // smoke windows
  rec.smokeWindows = SMOKE_WINDOWS.map((_,i)=>({
    smoked: $("smoked_"+i).value,
    when: $("when_"+i).value,
    craving: $("cr_"+i).value,
    trigger: $("tr_"+i).value,
    tool: $("tool_"+i).value,
    result: $("res_"+i).value
  }));

  // cravings outside
  rec.cravingsOutside = [0,1,2].map(i=>({
    time: $("co_time_"+i).value,
    intensity: $("co_int_"+i).value,
    trigger: $("co_tr_"+i).value,
    tool: $("co_tool_"+i).value,
    smoked: $("co_smoked_"+i).value,
    result: $("co_res_"+i).value
  }));

  // journal
  rec.journal = JOURNAL_ITEMS.map((_,i)=> $("j_"+i).checked);

  db[iso] = rec;
  saveAll(db);
  $("status").innerHTML = `<span class="ok">Gespeichert:</span> ${iso} (${new Date().toLocaleTimeString()})`;
}

function exportData(){
  const db = loadAll();
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `achim-tracker-export-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(ev){
  const file = ev.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const imported = JSON.parse(reader.result);
      saveAll(imported);
      loadToForm();
      alert("Import ok.");
    }catch(e){
      alert("Import fehlgeschlagen: " + e);
    }
  };
  reader.readAsText(file);
}

// PWA service worker
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

// init UI
renderSmoke();
renderCravingsOutside();
renderJournal();
bindStatic();
$("date").value = todayISO();
loadToForm();
