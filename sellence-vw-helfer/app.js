/* SELLENCE • VW Helfer (v2)
   - calmer cards: compact preview + "Mehr" toggle
   - searchable tips
   - category chips
   - favorites + known (localStorage)
   - add custom tips (localStorage)
*/
const STORAGE = {
  fav: "svw_fav",
  known: "svw_known",
  custom: "svw_custom",
  expanded: "svw_expanded",
};

const BUILTIN = [
  {
    id: "camwash",
    tag: "Reinigung & Sicht",
    title: "Rückfahrkamera schnell sauber machen",
    how:
`1) Rückwärtsgang einlegen.
2) Heckscheiben-Wischwasser kurz aktivieren.
3) Kamera-Bild wird meist sofort klar(er).`,
    why: "Bei manchen Golf Variant sitzt eine kleine Waschdüse an/bei der Rückfahrkamera. Mega praktisch im Winter/bei Matsch.",
  },
  {
    id: "inf_reboot",
    tag: "Infotainment",
    title: "Infotainment Neustart",
    how:
`Power/Volume am Infotainment ca. 10 Sekunden gedrückt halten,
bis der Bildschirm neu startet.`,
    why: "Hilft oft bei Freeze, Bluetooth-Aussetzern oder wenn Touch/Musik hängt.",
  },
  {
    id: "tpms_set",
    tag: "Fahren & Assistenz",
    title: "Reifendruck speichern",
    how:
`Reifen auf korrekten Druck bringen.
Dann im Fahrzeug-Menü: CAR/Vehicle → Einstellungen → Reifen/TPMS → „Set“/„Speichern“.`,
    why: "Wenn du den Druck änderst (Winterräder, Nachpumpen), einmal speichern – dann stimmt die Überwachung wieder.",
  },
  {
    id: "mirror_dip",
    tag: "Komfort",
    title: "Spiegel senkt beim Rückwärtsfahren",
    how:
`Spiegelwahlschalter auf (R/Right) stellen.
Rückwärtsgang einlegen.
Beifahrerspiegel auf Wunschposition einstellen.
→ Danach klappt die Absenkung beim Rückwärtsfahren meist automatisch.`,
    why: "Perfekt, um Bordsteine zu vermeiden – besonders beim Einparken.",
  },
  {
    id: "wipers_service",
    tag: "Alltag",
    title: "Wischer-Serviceposition",
    how:
`Je nach Golf Variant gibt’s 2 Varianten:
A) Im Menü: Vehicle/Car → Außen → Wischer → „Serviceposition“ aktivieren.
B) Zündung aus → innerhalb weniger Sekunden den Wischerhebel kurz nach unten tippen/halten.`,
    why: "Für Wischerwechsel oder um Eis unter den Armen besser wegzubekommen.",
  },
  {
    id: "rearwiperreverse",
    tag: "Reinigung & Sicht",
    title: "Heckwischen beim einlegen in den Rückwärtsgang",
    how:
`Wenn der Frontwischer läuft und du in den Rückwärtsgang gehst:
→ macht der Heckwischer bei vielen Golf Variant einmal einen Wisch.`,
    why: "Bei Regen bekommst du beim Rangieren sofort wieder Sicht nach hinten.",
  },
  {
    id: "rear_wiper_setting",
    tag: "Reinigung & Sicht",
    title: "Rückwärts-Heckwischer an/aus",
    how:
`Im Fahrzeug-Menü (je nach Modell):
Car/Vehicle → Wischer → „Heckwischer in Rückwärtsgang“ / „Automatik bei Regen“.
Dort kannst du es aktivieren oder deaktivieren.`,
    why: "Wenn’s dich nervt oder im Winter zu viel schmiert: einfach aus.",
  },
  {
    id: "windows_remote",
    tag: "Komfort",
    title: "Fenster per Schlüssel öffnen oder schliessen",
    how:
`Unlock gedrückt halten → Fenster fahren runter.
Lock gedrückt halten → Fenster fahren hoch.
(Je nach Setup muss „Komfortöffnung“ aktiviert sein.)`,
    why: "Sommer-Tipp: Auto vor dem Einsteigen schnell „entlüften“.",
  },
  {
    id: "unlock_all",
    tag: "Alltag",
    title: "1× drücken = alle Türen aufschließen",
    how:
`Im Fahrzeug-Menü: Setup/Car → Türen → Entriegelung.
Dort kannst du oft wählen: 1× = Fahrertür oder 1× = alle Türen.`,
    why: "Je nach Alltag: schneller mit Einkauf – oder mehr Sicherheit, wenn nur Fahrertür auf geht.",
  },
  {
    id: "auto_hold",
    tag: "Fahren & Assistenz",
    title: "Auto Hold (Ampel-Hack)",
    how:
`Auto Hold einschalten (Taste beim Gangschalter).
An der Ampel: bremsen → Auto bleibt stehen, ohne dass du das Pedal halten musst.
Anfahren: Gas geben → löst automatisch.`,
    why: "Entspannter Stop-and-Go, besonders im Stadtverkehr oder am Berg.",
  },
  {
    id: "coming_home",
    tag: "Komfort",
    title: "Coming/Leaving Home",
    how:
`Licht auf AUTO.
Im Menü: Vehicle/Car → Licht → Coming Home / Leaving Home.
Zeit einstellen (z.B. 10–30 Sek.).`,
    why: "Beim Auf- und Abschließen wird dein Weg kurz ausgeleuchtet – gerade abends richtig angenehm.",
  },
];

function loadSet(key){
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function saveSet(key, set){
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

function loadArr(key){
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}
function saveArr(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}

function loadCustom(){ return loadArr(STORAGE.custom); }
function saveCustom(arr){ saveArr(STORAGE.custom, arr); }

const el = (id)=>document.getElementById(id);
const grid = el("grid");
const chipsEl = el("chips");
const qEl = el("q");
const clearQ = el("clearQ");
const countPill = el("countPill");
const toggleKnownBtn = el("toggleKnown");
const toggleFavBtn = el("toggleFav");

let fav = loadSet(STORAGE.fav);
let known = loadSet(STORAGE.known);
let expanded = loadSet(STORAGE.expanded);

let onlyUnknown = false;
let onlyFav = false;
let activeTag = "Alle";

function allTips(){
  const custom = loadCustom();
  return [...BUILTIN, ...custom];
}

function tags(tips){
  const set = new Set(tips.map(t=>t.tag));
  return ["Alle", ...Array.from(set).sort((a,b)=>a.localeCompare(b, "de"))];
}

function sanitize(str){
  return (str||"").toString().replace(/[<>]/g, "");
}

function matches(t, q){
  if(!q) return true;
  const hay = (t.title + " " + t.tag + " " + t.how + " " + (t.why||"")).toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderChips(){
  const t = allTips();
  const list = tags(t);
  chipsEl.innerHTML = "";
  for(const tag of list){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (tag===activeTag ? " active": "");
    b.textContent = tag;
    b.onclick = ()=>{ activeTag = tag; render(); };
    chipsEl.appendChild(b);
  }
}

function hasMoreText(t){
  // if content is long enough, show "Mehr" toggle
  const howLen = (t.how||"").split(/\r?\n/).join(" ").length;
  const whyLen = (t.why||"").split(/\r?\n/).join(" ").length;
  return (howLen > 140) || (whyLen > 110);
}

function makeBlock(label, text){
  const wrap = document.createElement("div");
  wrap.className = "block";
  const l = document.createElement("div");
  l.className = "blockLabel";
  l.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${label}</span>`;
  const body = document.createElement("div");
  body.className = label === "SO GEHT’S" ? "steps" : "why";
  body.textContent = text;
  wrap.appendChild(l);
  wrap.appendChild(body);
  return wrap;
}

function card(t){
  const isFav = fav.has(t.id);
  const isKnown = known.has(t.id);
  const isCustom = t.custom === true;
  const isExpanded = expanded.has(t.id);

  const root = document.createElement("article");
  root.className = "card";

  const inner = document.createElement("div");
  inner.className = "cardIn " + (isExpanded ? "" : "clamp");

  const top = document.createElement("div");
  top.className = "cardTop";

  const h = document.createElement("h3");
  h.className = "h";
  h.textContent = t.title;

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = t.tag;

  top.appendChild(h);
  top.appendChild(tag);

  inner.appendChild(top);

  // Blocks
  inner.appendChild(makeBlock("SO GEHT’S", t.how || ""));

  if(t.why && t.why.trim()){
    inner.appendChild(makeBlock("WARUM", t.why));
  }

  // "Mehr" toggle
  if(hasMoreText(t)){
    const moreRow = document.createElement("div");
    moreRow.className = "moreRow";
    const more = document.createElement("button");
    more.type = "button";
    more.className = "linkBtn";
    more.innerHTML = isExpanded ? `Weniger <span class="chev">▴</span>` : `Mehr <span class="chev">▾</span>`;
    more.onclick = ()=>{
      if(expanded.has(t.id)) expanded.delete(t.id); else expanded.add(t.id);
      saveSet(STORAGE.expanded, expanded);
      render();
    };
    moreRow.appendChild(more);
    inner.appendChild(moreRow);
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "btn" + (isFav ? " on": "");
  favBtn.textContent = isFav ? "★ Favorit" : "☆ Favorit";
  favBtn.onclick = ()=>{
    if(fav.has(t.id)) fav.delete(t.id); else fav.add(t.id);
    saveSet(STORAGE.fav, fav);
    render();
  };

  const knownBtn = document.createElement("button");
  knownBtn.type = "button";
  knownBtn.className = "btn" + (isKnown ? " on": "");
  knownBtn.textContent = isKnown ? "✓ Gesehen" : "Als gesehen";
  knownBtn.onclick = ()=>{
    if(known.has(t.id)) known.delete(t.id); else known.add(t.id);
    saveSet(STORAGE.known, known);
    render();
  };

  actions.appendChild(favBtn);
  actions.appendChild(knownBtn);

  if(isCustom){
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn danger";
    del.textContent = "Löschen";
    del.onclick = ()=>{
      const arr = loadCustom().filter(x=>x.id !== t.id);
      saveCustom(arr);
      expanded.delete(t.id);
      saveSet(STORAGE.expanded, expanded);
      renderChips();
      render();
    };
    actions.appendChild(del);
  }

  inner.appendChild(actions);
  root.appendChild(inner);
  return root;
}

function filtered(){
  const q = qEl.value.trim();
  let list = allTips();

  if(activeTag !== "Alle"){
    list = list.filter(t => t.tag === activeTag);
  }
  if(onlyUnknown){
    list = list.filter(t => !known.has(t.id));
  }
  if(onlyFav){
    list = list.filter(t => fav.has(t.id));
  }
  list = list.filter(t => matches(t, q));

  // stable sort: favorites first, then title
  list.sort((a,b)=>{
    const af = fav.has(a.id) ? 1 : 0;
    const bf = fav.has(b.id) ? 1 : 0;
    if(af !== bf) return bf - af;
    return a.title.localeCompare(b.title, "de");
  });

  return list;
}

function render(){
  const list = filtered();
  grid.innerHTML = "";
  for(const t of list){
    grid.appendChild(card(t));
  }
  countPill.textContent = `${list.length} Tipp${list.length===1?"":"s"}`;
}

function wire(){
  qEl.addEventListener("input", render);
  clearQ.addEventListener("click", ()=>{ qEl.value=""; qEl.focus(); render(); });

  toggleKnownBtn.addEventListener("click", ()=>{
    onlyUnknown = !onlyUnknown;
    toggleKnownBtn.classList.toggle("active", onlyUnknown);
    toggleKnownBtn.textContent = onlyUnknown ? "Nur unbekannt" : "Unbekannt";
    render();
  });

  toggleFavBtn.addEventListener("click", ()=>{
    onlyFav = !onlyFav;
    toggleFavBtn.classList.toggle("active", onlyFav);
    render();
  });

  // Modal
  const modal = el("modal");
  const openAdd = el("openAdd");
  const closeModal = el("closeModal");
  const addForm = el("addForm");
  const resetCustom = el("resetCustom");

  function showModal(on){
    modal.classList.toggle("show", on);
    modal.setAttribute("aria-hidden", on ? "false":"true");
    if(on){
      addForm.title?.focus?.();
    }
  }
  openAdd.addEventListener("click", ()=>{
    const pw = prompt("Master-Passwort für „+ Tipp“:");
    if(pw === null) return;
    if(pw.trim() !== "master"){
      alert("Falsches Passwort.");
      return;
    }
    showModal(true);
  });
  closeModal.addEventListener("click", ()=>showModal(false));
  modal.addEventListener("click", (e)=>{ if(e.target === modal) showModal(false); });
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && modal.classList.contains("show")) showModal(false); });

  addForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = new FormData(addForm);
    const title = sanitize(fd.get("title"));
    const tag = sanitize(fd.get("tag"));
    const how = sanitize(fd.get("how"));
    const why = sanitize(fd.get("why"));
    const id = "c_" + Math.random().toString(16).slice(2) + Date.now().toString(16);

    const item = { id, title, tag, how, why, custom:true };
    const arr = loadCustom();
    arr.push(item);
    saveCustom(arr);

    addForm.reset();
    showModal(false);
    renderChips();
    render();
  });

  resetCustom.addEventListener("click", ()=>{
    if(!confirm("Alle eigenen Tipps wirklich löschen?")) return;
    saveCustom([]);
    // also clear expanded for custom tips (simple reset)
    expanded = loadSet(STORAGE.expanded);
    renderChips();
    render();
  });
}

renderChips();
wire();
render();
