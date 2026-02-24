const LS_KEY = "sellence_ean_selected_v1";

const byId = (id) => document.getElementById(id);
const listEl = byId("list");
const searchEl = byId("search");
const selCountEl = byId("selCount");
const selSubEl = byId("selSub");
const countHintEl = byId("countHint");

// Marken-Rahmenfarben (bessere Unterscheidung)
const BRAND_COLORS = {
  "IQOS": "#0B2A5B",        // dunkelblau
  "TEREA": "#5BB8FF",       // hellblau
  "MB": "#5a0000",          // dunkelrot
  "LEVIA": "#7a3cff",       // violett
  "MB CRAFTED": "#FFD200",  // gelb
  "DELIA": "#FF3B30",       // rot
  "VEEV": "#FF8A00"         // orange
};

let selected = new Set();

function loadSelection(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const arr = JSON.parse(raw);
    if(Array.isArray(arr)) selected = new Set(arr);
  }catch(e){}
}

function saveSelection(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify([...selected]));
  }catch(e){}
}

function norm(s){ return (s||"").toLowerCase().trim(); }

function groupByBrand(items){
  const map = new Map();
  for(const it of items){
    if(!map.has(it.brand)) map.set(it.brand, []);
    map.get(it.brand).push(it);
  }
  return [...map.entries()].sort((a,b)=> a[0].localeCompare(b[0], "de"));
}

function makeCheckIcon(){
  return `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function itemKey(it){
  return it.ean; // unique enough for your use-case
}

function render(){
  const q = norm(searchEl.value);
  const filtered = PRODUCT_DATA.filter(it=>{
    if(!q) return true;
    const hay = `${it.brand} ${it.name} ${it.ean} ${(it.pack_ean||"")} ${it.pack||""}`.toLowerCase();
    return hay.includes(q);
  });

  const groups = groupByBrand(filtered);
  listEl.innerHTML = "";

  const total = PRODUCT_DATA.length;
  const shown = filtered.length;
  countHintEl.textContent = q ? `Treffer: ${shown} von ${total}` : `Produkte gesamt: ${total}`;

  for(const [brand, items] of groups){
    const section = document.createElement("section");
    section.className = "brand card";
    if(BRAND_COLORS[brand]) section.style.setProperty("--brandColor", BRAND_COLORS[brand]);

    const header = document.createElement("div");
    header.className = "brandHeader";

    const title = document.createElement("div");
    title.className = "brandTitle";
    title.textContent = brand;

    const actions = document.createElement("div");
    actions.className = "brandActions";

    const btnAll = document.createElement("button");
    btnAll.className = "btn ghost smallBtn";
    btnAll.type = "button";
    btnAll.textContent = "Alle";
    btnAll.addEventListener("click", ()=>{
      for(const it of items) selected.add(itemKey(it));
      saveSelection(); updateFooter(); render(); // re-render for selected styles
    });

    const btnNone = document.createElement("button");
    btnNone.className = "btn ghost smallBtn";
    btnNone.type = "button";
    btnNone.textContent = "Keine";
    btnNone.addEventListener("click", ()=>{
      for(const it of items) selected.delete(itemKey(it));
      saveSelection(); updateFooter(); render();
    });

    actions.append(btnAll, btnNone);
    header.append(title, actions);

    const grid = document.createElement("div");
    grid.className = "grid";

    for(const it of items){
      const card = document.createElement("div");
      card.className = "item";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", "false");

      const isSel = selected.has(itemKey(it));
      if(isSel) card.classList.add("selected");

      const thumb = document.createElement("div");
      thumb.className = "thumb";

      const meta = document.createElement("div");
      meta.className = "meta";

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = it.name;

      const ean = document.createElement("div");
      ean.className = "ean";
      ean.textContent = `Gebinde: ${it.ean}`;

      // optional: Packungs-EAN anzeigen (Gebinde bleibt immer die Haupt-EAN)
      if(it.pack_ean){
        const packEan = document.createElement("div");
        packEan.className = "subean";
        packEan.textContent = `Packung: ${it.pack_ean}`;
        meta.append(name, ean, packEan);
      }else{
        meta.append(name, ean);
      }

      const check = document.createElement("div");
      check.className = "check";
      check.innerHTML = makeCheckIcon();

      if(it.pack){
        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = it.pack;
        card.appendChild(badge);
      }

      function toggle(){
        const k = itemKey(it);
        if(selected.has(k)) selected.delete(k); else selected.add(k);
        saveSelection();
        updateFooter();
        render();
      }

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (e)=>{
        if(e.key==="Enter" || e.key===" "){
          e.preventDefault();
          toggle();
        }
      });

      card.append(thumb, meta, check);
      grid.appendChild(card);
    }

    section.append(header, grid);
    listEl.appendChild(section);
  }
}

function updateFooter(){
  const n = selected.size;
  selCountEl.textContent = `${n} ausgewählt`;
  const msg = n ? "Bereit für CSV‑Export (KataSymbol)" : "Wähle Produkte für den Export";
  selSubEl.textContent = msg;
  byId("exportBtn").disabled = n===0;
  byId("exportBtn").style.filter = n===0 ? "grayscale(1) opacity(.7)" : "none";
}

function showExportModal(){
  const modal = byId("exportModal");
  if(!modal){
    // Fallback: wenn Modal fehlt, exportiere Gebinde-EAN
    doExportCSV("gebinde");
    return;
  }
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");

  const first = byId("exportPackBtn") || byId("exportGebBtn");
  if(first) first.focus();
}

function hideExportModal(){
  const modal = byId("exportModal");
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

function doExportCSV(mode){
  const chosen = PRODUCT_DATA.filter(it => selected.has(itemKey(it)));

  // mode: "pack" => Packungs-EAN, sonst Gebinde-EAN
  let missingPack = 0;
  const lines = chosen.map(it => {
    let eanOut = it.ean; // Gebinde default
    if(mode === "pack"){
      if(it.pack_ean){
        eanOut = it.pack_ean;
      }else{
        missingPack += 1;
        eanOut = it.ean; // Fallback
      }
    }
    return `${it.name},${eanOut}`;
  });

  if(mode === "pack" && missingPack > 0){
    const ok = confirm(`${missingPack} Produkt(e) haben keine Packungs‑EAN in der Liste.\nDiese werden mit der Gebinde‑EAN exportiert.\n\nFortfahren?`);
    if(!ok) return;
  }

  // EXACT wie deine Suvan-Datei: keine Header, keine Quotes, CRLF
  const csv = lines.join("\r\n") + "\r\n";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0,10);
  const suffix = (mode === "pack") ? "PACKUNG" : "GEBINDE";
  a.download = `SELLENCE-EAN_${suffix}_${stamp}.csv`;

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV(){
  showExportModal();
}

function clearSelection(){
  selected = new Set();
  saveSelection();
  updateFooter();
  render();
}

function registerSW(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}

loadSelection();
updateFooter();
render();
registerSW();

byId("exportBtn").addEventListener("click", exportCSV);
byId("clearSel").addEventListener("click", clearSelection);

// Export-Modal Buttons
const packBtn = byId("exportPackBtn");
const gebBtn = byId("exportGebBtn");
const cancelBtn = byId("exportCancelBtn");
const modal = byId("exportModal");

if(packBtn){
  packBtn.addEventListener("click", ()=>{
    hideExportModal();
    doExportCSV("pack");
  });
}
if(gebBtn){
  gebBtn.addEventListener("click", ()=>{
    hideExportModal();
    doExportCSV("gebinde");
  });
}
if(cancelBtn){
  cancelBtn.addEventListener("click", hideExportModal);
}
if(modal){
  modal.addEventListener("click", (e)=>{
    const t = e.target;
    if(t && t.getAttribute && t.getAttribute("data-close")==="1"){
      hideExportModal();
    }
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") hideExportModal();
  });
}

searchEl.addEventListener("input", ()=>{
  render();
});
