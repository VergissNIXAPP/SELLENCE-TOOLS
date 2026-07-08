const LS_KEY = "sellence_ean_selected_v3";
const BRAND_ORDER_KEY = "sellence_ean_group_order_v2";

const byId = (id) => document.getElementById(id);
const listEl = byId("list");
const searchEl = byId("search");
const selCountEl = byId("selCount");
const selSubEl = byId("selSub");
const countHintEl = byId("countHint");
const heroProductsEl = byId("heroProducts");
const heroBrandsEl = byId("heroBrands");

// Gruppen-/Marken-Rahmenfarben
const BRAND_COLORS = {
  "TEREA": "#5BB8FF",
  "DELIA": "#FF3B30",
  "LEVIA": "#7a3cff",
  "VEEV": "#FF8A00",
  "IQOS": "#0B2A5B",
  "MB CRAFTED": "#FFD200",
  "MB RED": "#7c1010",
  "MB GOLD": "#d6b85a",
  "MB MIX": "#b60d2b",
  "MB SONSTIGE": "#8ea1c4",
  "L&M RED": "#c4004a",
  "L&M BLUE": "#3f69b5",
  "CHESTERFIELD ORIGINAL": "#b30424",
  "CHESTERFIELD BLUE": "#3f6fb7",
  "F6 - PARLIAMENT - EVE": "#3aa2df"
};

const GROUP_ORDER_DEFAULT = [
  "TEREA",
  "DELIA",
  "LEVIA",
  "VEEV",
  "IQOS",
  "MB CRAFTED",
  "MB RED",
  "MB GOLD",
  "MB MIX",
  "MB SONSTIGE",
  "L&M RED",
  "L&M BLUE",
  "CHESTERFIELD ORIGINAL",
  "CHESTERFIELD BLUE",
  "F6 - PARLIAMENT - EVE"
];


function normalizePackGebinde(it){
  const e = String(it?.ean || "");
  const p = String(it?.pack_ean || "");
  const looksSwapped =
    e.length === 13 &&
    p.length === 13 &&
    e.startsWith("4023500") &&
    p.startsWith("4023500") &&
    e[7] === "7" &&
    p[7] === "0";

  if(looksSwapped){
    const tmp = it.ean;
    it.ean = it.pack_ean;
    it.pack_ean = tmp;
  }

  return it;
}

if(Array.isArray(PRODUCT_DATA)){
  PRODUCT_DATA.forEach(normalizePackGebinde);
}



function slugifyName(name){
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

function classifyGroup(it){
  const name = (it.name || "").toUpperCase();
  const brand = (it.brand || "").toUpperCase();

  if(brand === "TEREA") return "TEREA";
  if(brand === "DELIA") return "DELIA";
  if(brand === "LEVIA") return "LEVIA";
  if(brand === "VEEV" || brand === "VEEV ONE" || brand === "VEEV NOW ULTRA") return "VEEV";
  if(brand === "IQOS") return "IQOS";

  if(name.startsWith("MB CRAFTED") || brand === "MB CRAFTED" || (brand === "MARLBORO" && name.startsWith("CRAFTED"))) return "MB CRAFTED";
  if(name.startsWith("MB RED")) return "MB RED";
  if(name.startsWith("MB GOLD")) return "MB GOLD";
  if(name.startsWith("MB MIX")) return "MB MIX";
  if(name.startsWith("MB ")) return "MB SONSTIGE";

  if(name.startsWith("L&M RED") || name.startsWith("L&M SIMPLY RED")) return "L&M RED";
  if(name.startsWith("L&M BLUE") || name.startsWith("L&M SIMPLY BLUE")) return "L&M BLUE";

  if(name.startsWith("CHESTERFIELD ORIGINAL")) return "CHESTERFIELD ORIGINAL";
  if(name.startsWith("CHESTERFIELD BLUE")) return "CHESTERFIELD BLUE";

  if(brand === "F6" || brand === "PARLIAMENT" || brand === "EVE") return "F6 - PARLIAMENT - EVE";

  return it.brand || "SONSTIGE";
}

function groupByBrand(items){
  const map = new Map();
  for(const it of items){
    const group = classifyGroup(it);
    if(!map.has(group)) map.set(group, []);
    map.get(group).push(it);
  }
  return sortBrandEntries([...map.entries()]);
}

function getAllBrands(){
  const groups = [...new Set(PRODUCT_DATA.map(it=>classifyGroup(it)))];
  return GROUP_ORDER_DEFAULT.filter(g=>groups.includes(g)).concat(groups.filter(g=>!GROUP_ORDER_DEFAULT.includes(g)).sort((a,b)=>a.localeCompare(b,"de")));
}

function loadBrandOrder(){
  try{
    const raw = localStorage.getItem(BRAND_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const all = getAllBrands();
    if(!Array.isArray(parsed) || parsed.length===0) return all;
    // ensure includes all brands and no duplicates
    const set = new Set();
    const clean = [];
    for(const b of parsed){
      if(typeof b === "string" && all.includes(b) && !set.has(b)){
        set.add(b); clean.push(b);
      }
    }
    for(const b of all){ if(!set.has(b)) clean.push(b); }
    return clean;
  }catch(_){
    return getAllBrands();
  }
}

function saveBrandOrder(order){
  localStorage.setItem(BRAND_ORDER_KEY, JSON.stringify(order));
}

function sortBrandEntries(entries){
  const order = loadBrandOrder();
  const idx = new Map(order.map((b,i)=>[b,i]));
  return entries.sort((a,b)=>{
    const ia = idx.has(a[0]) ? idx.get(a[0]) : 1e9;
    const ib = idx.has(b[0]) ? idx.get(b[0]) : 1e9;
    if(ia !== ib) return ia-ib;
    return a[0].localeCompare(b[0], "de");
  });
}

// Brand-Order Modal
function showBrandModal(){
  const modal = byId("brandModal");
  if(!modal) return;
  renderBrandOrderList();
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

function hideBrandModal(){
  const modal = byId("brandModal");
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

function renderBrandOrderList(){
  const host = byId("brandOrderList");
  if(!host) return;
  const order = loadBrandOrder();
  host.innerHTML = "";

  order.forEach((brand, i)=>{
    const row = document.createElement("div");
    row.className = "brandOrderRow";

    const name = document.createElement("div");
    name.className = "brandOrderName";
    name.textContent = brand;

    const btns = document.createElement("div");
    btns.className = "brandOrderBtns";

    const up = document.createElement("button");
    up.className = "brandArrowBtn";
    up.type = "button";
    up.textContent = "↑";
    up.disabled = i===0;
    up.addEventListener("click", ()=>{
      const cur = loadBrandOrder();
      if(i===0) return;
      [cur[i-1], cur[i]] = [cur[i], cur[i-1]];
      saveBrandOrder(cur);
      render();
      renderBrandOrderList();
    });

    const down = document.createElement("button");
    down.className = "brandArrowBtn";
    down.type = "button";
    down.textContent = "↓";
    down.disabled = i===order.length-1;
    down.addEventListener("click", ()=>{
      const cur = loadBrandOrder();
      if(i===cur.length-1) return;
      [cur[i+1], cur[i]] = [cur[i], cur[i+1]];
      saveBrandOrder(cur);
      render();
      renderBrandOrderList();
    });

    btns.append(up, down);
    row.append(name, btns);
    host.append(row);
  });
}


function makeCheckIcon(){
  return `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function itemKey(it){
  return `${it.name}__${it.ean}__${it.pack_ean||""}`;
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

      const imageSlug = slugifyName(it.name);
      const thumbImg = document.createElement("img");
      thumbImg.className = "thumbImg";
      thumbImg.src = it.image || `assets/thumbs/${imageSlug}.png`;
      thumbImg.alt = "";
      thumbImg.loading = "lazy";
      thumbImg.addEventListener("error", ()=>{ thumbImg.remove(); }, { once:true });
      thumb.appendChild(thumbImg);

      const meta = document.createElement("div");
      meta.className = "meta";

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = it.name;

      const ean = document.createElement("div");
      ean.className = "ean";
      ean.textContent = `Packung: ${it.ean}`;

      if(it.pack_ean){
        const packEan = document.createElement("div");
        packEan.className = "subean";
        packEan.textContent = `Gebinde: ${it.pack_ean}`;
        meta.append(name, ean, packEan);
        if(it.pack || it.gebinde){ const detail=document.createElement("div"); detail.className="prodDetail"; detail.textContent=[it.pack?`Packung: ${it.pack}`:"", it.gebinde?`Gebinde: ${it.gebinde}`:""].filter(Boolean).join(" · "); meta.append(detail); }
      }else{
        meta.append(name, ean);
        if(it.pack || it.gebinde){ const detail=document.createElement("div"); detail.className="prodDetail"; detail.textContent=[it.pack?`Packung: ${it.pack}`:"", it.gebinde?`Gebinde: ${it.gebinde}`:""].filter(Boolean).join(" · "); meta.append(detail); }
      }

      const check = document.createElement("div");
      check.className = "check";
      check.innerHTML = makeCheckIcon();

      // Packungsanzeige entfernt

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

  // mode: "pack" => Packungs-EAN (it.ean), sonst Gebinde-EAN (it.pack_ean)
  let missingGebinde = 0;
  const lines = chosen.map(it => {
    let eanOut = it.ean; // Packungs-EAN default
    if(mode !== "pack"){
      if(it.pack_ean){
        eanOut = it.pack_ean;
      }else{
        missingGebinde += 1;
        eanOut = it.ean; // Fallback auf Packungs-EAN
      }
    }
    return `${it.name},${eanOut}`;
  });

  if(mode !== "pack" && missingGebinde > 0){
    const ok = confirm(`${missingGebinde} Produkt(e) haben keine Gebinde‑EAN in der Liste.
Diese werden mit der Packungs‑EAN exportiert.

Fortfahren?`);
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



function showGuideModal(){
  const modal = byId("guideModal");
  const video = byId("guideVideo");
  if(!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  if(video){
    video.load();
    const p = video.play();
    if(p && typeof p.catch === "function") p.catch(()=>{});
  }
}

function hideGuideModal(){
  const modal = byId("guideModal");
  const video = byId("guideVideo");
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  if(video){
    video.pause();
  }
}

loadSelection();
if(heroProductsEl) heroProductsEl.textContent = PRODUCT_DATA.length;
if(heroBrandsEl) heroBrandsEl.textContent = getAllBrands().length;
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


// Brand-Order Modal Buttons
const brandBtn = byId("brandOrderBtn");
const brandCloseBtn = byId("brandCloseBtn");
const brandResetBtn = byId("brandResetBtn");
const brandModal = byId("brandModal");

if(brandBtn){
  brandBtn.addEventListener("click", showBrandModal);
}
if(brandCloseBtn){
  brandCloseBtn.addEventListener("click", ()=>{
    hideBrandModal();
    render(); // refresh list with new order
  });
}
if(brandResetBtn){
  brandResetBtn.addEventListener("click", ()=>{
    try{ localStorage.removeItem(BRAND_ORDER_KEY); }catch(_){}
    renderBrandOrderList();
    render();
  });
}
if(brandModal){
  brandModal.addEventListener("click", (e)=>{
    const t = e.target;
    if(t && t.getAttribute && t.getAttribute("data-close")==="1"){
      hideBrandModal();
      render();
    }
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape"){
      hideBrandModal();
      render();
    }
  });
}

searchEl.addEventListener("input", ()=>{
  render();
});


const guideBtn = byId("guideBtn");
const guideModal = byId("guideModal");
const guideCloseBtn = byId("guideCloseBtn");

if(guideBtn){
  guideBtn.addEventListener("click", showGuideModal);
}
if(guideCloseBtn){
  guideCloseBtn.addEventListener("click", hideGuideModal);
}
if(guideModal){
  guideModal.addEventListener("click", (e)=>{
    const t = e.target;
    if(t && t.getAttribute && t.getAttribute("data-close")==="1") hideGuideModal();
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") hideGuideModal();
  });
}
