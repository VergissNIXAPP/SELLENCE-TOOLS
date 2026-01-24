/* SELLENCE-TOURENPLANER (SAP) – OSRM v1 (kostenlos) */
const $ = (id)=>document.getElementById(id);

const STORE = {
  markets: "sellence_sap_markets_osrm_v1",
  route: "sellence_sap_route_osrm_v1",
  myPos: "sellence_sap_mypos_osrm_v1",
  lastLinks: "sellence_sap_lastlinks_osrm_v1",
  history: "sellence_sap_tour_history_v1",
  navPlan: "sellence_sap_navplan_v1",
  navIdx: "sellence_sap_navidx_v1",
};

const OSRM_BASE = "https://router.project-osrm.org";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Märkte, die im Tourenplaner ignoriert werden sollen
// (Case-insensitive, Treffer per "includes")
const IGNORE_MARKETS = [
  "rossmann",
  "aldi",
  "lidl",
  "netto",
  "penny",
];


// Hamburger menu
(function(){
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("menuPanel");
  if(!btn || !panel) return;
  const close = ()=>{ panel.classList.remove("open"); panel.setAttribute("aria-hidden","true"); };
  const toggle = ()=>{
    const open = panel.classList.toggle("open");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  };
  btn.addEventListener("click", (e)=>{ e.stopPropagation(); toggle(); });
  panel.addEventListener("click",(e)=>{ e.stopPropagation(); });
  document.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });
})();


// Share (AirDrop / iOS Share Sheet via Web Share API)
(function(){
  const btn = document.getElementById("shareBtn");
  if(!btn) return;

  function buildShareText(){
    const ordered = routeIds
      .map(id=>markets.find(m=>m.id===id))
      .filter(Boolean);

    if(!ordered.length) return "Noch keine Route geplant.";
    return ordered.map((m,i)=>{
      const addr = marketAddr(m);
      const sap = m.sap ? ` (SAP ${m.sap})` : "";
      return `${i+1}. ${m.name}${sap}${addr?` – ${addr}`:""}`;
    }).join("\n");
  }

  function buildShareFile(){
    const ordered = routeIds
      .map(id=>markets.find(m=>m.id===id))
      .filter(Boolean)
      .map(m=>({
        id: m.id,
        name: m.name,
        sap: m.sap || "",
        anschrift: m.anschrift || "",
        plz: m.plz || "",
        ort: m.ort || "",
        lat: m.lat ?? null,
        lng: m.lng ?? null,
      }));

    const payload = {
      app: "SELLENCE-TOURENPLANER",
      createdAt: new Date().toISOString(),
      route: ordered
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    return new File([blob], "sellence-tourenplan.json", {type:"application/json"});
  }

  async function copy(text){
    try{
      await navigator.clipboard.writeText(text);
      alert("Link kopiert ✅");
    }catch(e){
      prompt("Kopieren:", text);
    }
  }

  btn.addEventListener("click", async ()=>{
    const url = location.href;
    const title = "SELLENCE Tourenplaner – Route";
    const text = buildShareText();

    // Prefer sharing a small JSON export too (works great with AirDrop into Files/Notes/WhatsApp)
    const file = buildShareFile();
    const payloadWithFile = { title, text, url, files:[file] };
    const payloadNoFile = { title, text, url };

    if(navigator.share){
      try{
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share(payloadWithFile);
        }else{
          await navigator.share(payloadNoFile);
        }
      }catch(err){
        // user canceled or share failed – silently ignore
        console.warn(err);
      }
      return;
    }

    // Fallback: copy link
    await copy(url);
  });
})();


// Add-market modal helpers
function setAddMarketStatus(msg=""){
  const el = document.getElementById("addMarketStatus");
  if(!el) return;
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
}
function openAddMarketModal(){
  const modal = document.getElementById("addMarketModal");
  if(!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  setAddMarketStatus("");
  (document.getElementById("amName"))?.focus();
}
function closeAddMarketModal(){
  const modal = document.getElementById("addMarketModal");
  if(!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  setAddMarketStatus("");
}

// Wire modal UI
(function(){
  const btnOpen = document.getElementById("btnAddMarket");
  const modal = document.getElementById("addMarketModal");
  if(btnOpen && modal){
    btnOpen.addEventListener("click", ()=>{
      // close hamburger menu if open
      document.getElementById("menuPanel")?.classList.remove("open");
      document.getElementById("menuPanel")?.setAttribute("aria-hidden","true");
      // reset fields
      (document.getElementById("amName")).value = "";
      (document.getElementById("amAddr")).value = "";
      (document.getElementById("amSap")).value = "";
      openAddMarketModal();
    });
  }

  document.getElementById("btnAddMarketClose")?.addEventListener("click", closeAddMarketModal);
  document.getElementById("btnAddMarketCancel")?.addEventListener("click", closeAddMarketModal);
  modal?.addEventListener("click", (e)=>{ if(e.target === modal) closeAddMarketModal(); });
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeAddMarketModal(); });
})();

function load(key, fallback){
  try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch{return fallback;}
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function uid(){ return (crypto?.randomUUID?.() || ("id_"+Math.random().toString(16).slice(2)+Date.now())); }
function toNum(v){ const n=parseFloat(String(v??"").replace(",", ".")); return Number.isFinite(n)?n:null; }
function isNum(n){ return Number.isFinite(n); }
function escapeHTML(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function formatKm(km){ return Number.isFinite(km)?km.toFixed(1).replace(".", ","):"—"; }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

let markets = load(STORE.markets, []);
let routeIds = load(STORE.route, []);
let myPos = load(STORE.myPos, null); // {lat,lng}
let lastLinks = load(STORE.lastLinks, []);
let navPlan = load(STORE.navPlan, []); // ordered points for stop-by-stop navigation
let navIdx = load(STORE.navIdx, 0);

function setStartEnabled(on){
  const b = document.getElementById("btnStartMaps");
  if(!b) return;
  b.disabled = !on;
}

function setStatus(msg=""){
  const el = document.getElementById("status");
  if(!el) return;
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
}

// ---------- Stop-by-stop Navigation ----------
function isReturnStop(p){ return !!p?.__return; }

function pointTitle(p){
  if(!p) return "—";
  if(isReturnStop(p)) return "🏠 Rückfahrt / Zuhause";
  return p.name || p.title || p.market || "Markt";
}
function pointAddress(p){
  if(!p) return "—";
  if(isReturnStop(p)) return "Zum Startpunkt zurück";
  // Support app's market fields (anschrift/plz/ort)
  if(p.anschrift || p.plz || p.ort){
    const parts=[];
    if(p.anschrift) parts.push(String(p.anschrift).trim());
    const line2=[p.plz, p.ort].filter(Boolean).join(" ").trim();
    if(line2) parts.push(line2);
    if(parts.length) return parts.join(", ");
  }
  // Prefer structured fields
  const parts = [];
  if(p.street) parts.push(p.street);
  if(p.zip || p.city){
    const zc = [p.zip, p.city].filter(Boolean).join(" ");
    if(zc) parts.push(zc);
  }
  if(parts.length) return parts.join(", ");
  // Fallback to any free-text address
  return p.address || p.addr || "";
}

function mapsLinkForPoint(p){
  if(!p) return null;
  const params = new URLSearchParams();
  params.set("api","1");
  params.set("travelmode","driving");
  const dest = (isNum(p.lat) && isNum(p.lng)) ? `${p.lat},${p.lng}` : (pointAddress(p) || p.name || "");
  if(!dest) return null;
  params.set("destination", dest);
  // origin intentionally omitted -> Google uses current location
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function showNavCard(show){
  const card = document.getElementById("navCard");
  if(!card) return;
  card.hidden = !show;
}

function renderNav(){
  const titleEl = document.getElementById("navTitle");
  const addrEl  = document.getElementById("navAddr");
  const counterEl = document.getElementById("navCounter");
  const btnPrev = document.getElementById("btnPrevStop");
  const btnArr = document.getElementById("btnArrived");
  const btnNext = document.getElementById("btnNextStop");
  const btnOpen = document.getElementById("btnOpenMaps");

  const pts = Array.isArray(navPlan) ? navPlan : [];
  const total = pts.length;

  if(!total){
    showNavCard(false);
    return;
  }

  navIdx = Math.max(0, Math.min(navIdx || 0, total-1));
  const p = pts[navIdx];

  if(titleEl) titleEl.textContent = pointTitle(p);
  if(addrEl)  addrEl.textContent  = pointAddress(p);
  if(counterEl) counterEl.textContent = `${navIdx+1} / ${total}`;

  if(btnPrev) btnPrev.disabled = (navIdx<=0);
  if(btnArr) btnArr.disabled = (navIdx>=total-1);
  if(btnNext) btnNext.disabled = (navIdx>=total-1);

  const link = mapsLinkForPoint(p);
  if(btnOpen){
    btnOpen.disabled = !link;
    btnOpen.dataset.href = link || "";
  }

  showNavCard(true);
}

// "So funktioniert's" collapse
(function(){
  const btn = document.getElementById("btnHow");
  const panel = document.getElementById("howPanel");
  if(!btn || !panel) return;
  const sync = ()=>{ btn.textContent = panel.hidden ? "So funktioniert’s" : "So funktioniert’s ausblenden"; };
  btn.addEventListener("click", ()=>{ panel.hidden = !panel.hidden; sync(); });
  sync();
})();

// Return-to-start checkbox hint
(function(){
  const chk = document.getElementById("chkReturn");
  const hint = document.getElementById("returnHint");
  if(!chk || !hint) return;
  const sync = ()=>{
    hint.style.display = chk.checked ? "block" : "none";
  };
  chk.addEventListener("change", sync);
  sync();
})();

function marketAddr(m){
  const parts=[];
  if(m.anschrift) parts.push(m.anschrift.trim());
  const line2=[m.plz, m.ort].filter(Boolean).join(" ").trim();
  if(line2) parts.push(line2);
  return parts.join(", ");
}

function normalizeHeader(h){
  return String(h||"").trim().replace(/\s+/g," ").replace(/\u00A0/g," ").toLowerCase();
}

function extractFromRow(row){
  const keys=Object.keys(row);
  const pick=(alts)=>{
    const k=keys.find(k0=>alts.includes(normalizeHeader(k0)));
    return k?row[k]:null;
  };
  const sap = pick(["sap-nr.","sap-nr", "sap nr.", "sap nr", "sap"]);
  const name = pick(["name des händlers", "händlername", "name"]);
  const anschrift = pick(["anschrift", "straße", "strasse"]);
  const plz = pick(["plz"]);
  const ort = pick(["ort"]);
  const ninox = pick(["ninox-id","ninox id"]);
  const lat = toNum(pick(["lat","latitude","breite"]));
  const lng = toNum(pick(["lng","lon","longitude","länge","laenge"]));
  if(!sap && !name) return null;
  return {
    id: uid(),
    sap: String(sap??"").trim(),
    ninox: String(ninox??"").trim(),
    name: String(name??"").trim(),
    anschrift: String(anschrift??"").trim(),
    plz: String(plz??"").trim(),
    ort: String(ort??"").trim(),
    lat: isNum(lat)?lat:null,
    lng: isNum(lng)?lng:null
  };
}

function mergeMarkets(imported){
  const bySap=new Map(markets.filter(m=>m.sap).map(m=>[m.sap,m]));
  const byKey=new Map(markets.map(m=>[(`${m.name}|${marketAddr(m)}`).toLowerCase(),m]));
  let added=0, updated=0;
  for(const m of imported){
    const existing = (m.sap && bySap.get(m.sap)) || byKey.get((`${m.name}|${marketAddr(m)}`).toLowerCase());
    if(existing){
      existing.ninox = m.ninox || existing.ninox;
      existing.name = m.name || existing.name;
      existing.anschrift = m.anschrift || existing.anschrift;
      existing.plz = m.plz || existing.plz;
      existing.ort = m.ort || existing.ort;
      if(!isNum(existing.lat) && isNum(m.lat)) existing.lat=m.lat;
      if(!isNum(existing.lng) && isNum(m.lng)) existing.lng=m.lng;
      updated++;
    } else {
      markets.push(m);
      added++;
    }
  }
  save(STORE.markets, markets);
  return {added, updated};
}

// ---------- Map (Leaflet) ----------
let map=null, layer=null, myMarker=null, routeLine=null;

function initMap(){
  if(map) return;
  map = L.map("map",{zoomControl:true, preferCanvas:true}).setView([54.78, 9.43], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19, attribution:"&copy; OpenStreetMap"}).addTo(map);
  layer = L.layerGroup().addTo(map);
  renderMarkers();
}

function setMyMarker(){
  if(!map || !myPos) return;
  if(myMarker) myMarker.setLatLng([myPos.lat,myPos.lng]);
  else{
    myMarker = L.circleMarker([myPos.lat,myPos.lng],{radius:10,weight:2,color:"#1E8BFF",fillColor:"#1E8BFF",fillOpacity:0.9}).addTo(map);
    myMarker.bindPopup("<b>Du bist hier</b>");
  }
}

function clearRouteLine(){
  if(routeLine){ routeLine.remove(); routeLine=null; }
}
function deleteMarket(id){
  const m = markets.find(x=>x.id===id);
  if(!m) return;
  // remove from route as well
  routeIds = routeIds.filter(x=>x!==id);
  markets = markets.filter(x=>x.id!==id);
  save(STORE.markets, markets);
  save(STORE.route, routeIds);
  // invalidate previous Google Maps links
  lastLinks = [];
  save(STORE.lastLinks, lastLinks);
  navPlan = [];
  save(STORE.navPlan, navPlan);
  navIdx = 0;
  save(STORE.navIdx, navIdx);
  showNavCard(false);
  clearRouteLine();
  renderRoute();
  renderMarkers();
  setStartEnabled(false);
  try{ map?.closePopup(); }catch(e){}
}

function attachLongPressDelete(marker, market){
  let t = null;
  let fired = false;
  const start = ()=>{
    fired = false;
    clearTimeout(t);
    t = setTimeout(()=>{
      fired = true;
      const name = market.name || 'Markt';
      if(confirm(`${name}\n\nDauerhaft loeschen?`)){
        deleteMarket(market.id);
      }
    }, 650);
  };
  const cancel = ()=>{
    clearTimeout(t);
    t = null;
  };

  // Mobile/PWA: long press usually triggers 'contextmenu' too
  marker.on('contextmenu', ()=>{
    const name = market.name || 'Markt';
    if(confirm(`${name}\n\nDauerhaft loeschen?`)){
      deleteMarket(market.id);
    }
  });

  marker.on('mousedown', start);
  marker.on('touchstart', start);
  marker.on('mouseup', cancel);
  marker.on('touchend', cancel);
  marker.on('mouseout', cancel);
  marker.on('touchcancel', cancel);
  marker.on('mousemove', ()=>{ if(t && !fired){} });
}


function renderMarkers(highlightId=null){
  if(!layer) return;
  layer.clearLayers();
  const pts = markets.filter(m=>isNum(m.lat)&&isNum(m.lng));
  pts.forEach(m=>{
    const inRoute = routeIds.includes(m.id);
    const isHi = highlightId && m.id===highlightId;
    const color = isHi ? "#FFD250" : (inRoute ? "#31E7A6" : "rgba(255,255,255,.82)");
    const fill = isHi ? "#FFD250" : (inRoute ? "#31E7A6" : "#5B2EFF");
    const marker=L.circleMarker([m.lat,m.lng],{radius:isHi?11:9,weight:2,opacity:1,fillOpacity:0.85,color,fillColor:fill}).addTo(layer);
    attachLongPressDelete(marker, m);
    const addr = marketAddr(m);
    const popup=document.createElement("div");
    popup.className = "popupCard";
    popup.innerHTML=`
      <div class="popupTitle">${escapeHTML(m.name||"")}</div>
      <div class="popupAddr">${escapeHTML(addr)}</div>
      <div class="popupMeta"><b>SAP:</b> ${escapeHTML(m.sap||"—")}</div>
      <div class="popupActions">
        <button class="btn primary" id="add_${m.id}" style="padding:8px 10px;border-radius:12px">${inRoute?"In Route ✓":"In Route +"}</button>
        <a class="btn" style="padding:8px 10px;border-radius:12px;text-decoration:none" target="_blank" rel="noreferrer"
           href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}">Google</a>
      </div>`;
    marker.bindPopup(popup);
    marker.on("popupopen", ()=>{
      setTimeout(()=>{
        popup.querySelector(`#add_${CSS.escape(m.id)}`)?.addEventListener("click", ()=>{
          toggleRoute(m.id);
          renderRoute();
          renderMarkers(m.id);
        });
      },0);
    });
  });
  setMyMarker();
}

function fitAll(){
  if(!map) return;
  const pts = markets.filter(m=>isNum(m.lat)&&isNum(m.lng));
  if(!pts.length){ map.setView([54.78, 9.43], 9); return; }
  const bounds = L.latLngBounds(pts.map(m=>[m.lat,m.lng]));
  if(myPos) bounds.extend([myPos.lat,myPos.lng]);
  map.fitBounds(bounds.pad(0.2));
}

// ---------- Route ----------
function toggleRoute(id){
  if(routeIds.includes(id)) routeIds = routeIds.filter(x=>x!==id);
  else routeIds.push(id);
  save(STORE.route, routeIds);
  // Any change invalidates previous Google Maps links
  lastLinks = [];
  save(STORE.lastLinks, lastLinks);
  navPlan = [];
  save(STORE.navPlan, navPlan);
  navIdx = 0;
  save(STORE.navIdx, navIdx);
  showNavCard(false);
  setStartEnabled(false);
  clearRouteLine();
}

function routePoints(){
  return routeIds.map(id=>markets.find(m=>m.id===id)).filter(Boolean);
}

function renderRoute(km=null){
  const pts=routePoints();
  $("kStops").textContent=String(pts.length);
  $("kKm").textContent = km!==null ? formatKm(km) : "—";
  $("routeList").innerHTML = pts.map((m,idx)=>{
    const hasGeo=isNum(m.lat)&&isNum(m.lng);
    return `<div class="item">
      <div class="meta">
        <div class="title">${idx+1}. ${escapeHTML(m.name||"")}</div>
        <div class="sub">${escapeHTML(marketAddr(m))}</div>
        <div class="badges">
          <span class="badge">${escapeHTML(m.sap||"SAP?")}</span>
          <span class="badge ${hasGeo?"ok":"warn"}">${hasGeo?"Geo ✓":"Geo fehlt"}</span>
        </div>
      </div>
      <div class="actions-mini">
        <button class="btn danger" data-del="${m.id}">Entfernen</button>
      </div>
    </div>`;
  }).join("") || `<div class="muted tiny">Noch keine Stops. SAP suchen → Marker anklicken → „In Route +“.</div>`;

  $("routeList").querySelectorAll("button[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id=b.dataset.del;
      routeIds=routeIds.filter(x=>x!==id);
      save(STORE.route, routeIds);
      clearRouteLine();
      renderRoute();
      renderMarkers();
    });
  });
}

// ---------- Search ----------
function findBySAP(sap){
  const s=String(sap||"").trim();
  if(!s) return null;
  return markets.find(m=>String(m.sap||"").trim()===s) || null;
}
function parseSapList(input){
  const raw = String(input||"").trim();
  if(!raw) return [];
  // split by comma, semicolon, whitespace, or newlines
  return raw
    .split(/[\s,;\n\r\t]+/g)
    .map(s=>s.trim())
    .filter(Boolean);
}

function addMarketsToRouteBySap(saps){
  const missing = [];
  let added = 0;
  let already = 0;
  const foundIds = [];

  for(const sap of saps){
    const m = findBySAP(sap);
    if(!m){ missing.push(sap); continue; }
    foundIds.push(m.id);
    if(routeIds.includes(m.id)){ already++; continue; }
    routeIds.push(m.id);
    added++;
  }

  save(STORE.route, routeIds);
  clearRouteLine();
  renderRoute();
  renderMarkers();

  // focus first found marker if possible
  const first = markets.find(x=>x.id===foundIds[0]);
  if(first && isNum(first.lat) && isNum(first.lng)){
    map.setView([first.lat, first.lng], Math.max(map.getZoom(), 14));
    renderMarkers(first.id);
  }

  return {added, already, missing};
}

$("btnFind").addEventListener("click", ()=>{
  const raw = $("sapSearch").value;
  const saps = parseSapList(raw);
  if(!saps.length){
    alert("Bitte SAP‑Nummer(n) eingeben.");
    return;
  }

  // Bulk mode
  if(saps.length > 1){
    const res = addMarketsToRouteBySap(saps);
    const lines = [
      `Übernommen ✅`,
      `Neu in Planung: ${res.added}`,
      `Schon drin: ${res.already}`,
    ];
    if(res.missing.length) lines.push(`Nicht gefunden: ${res.missing.slice(0,12).join(", ")}${res.missing.length>12?" …":""}`);
    alert(lines.join("\n"));
    return;
  }

  // Single SAP: direkt in Planung + auf Karte zentrieren
  const sap = saps[0];
  const m = findBySAP(sap);
  if(!m){ alert("SAP-Nr. nicht gefunden."); return; }
  if(!routeIds.includes(m.id)){
    routeIds.push(m.id);
    save(STORE.route, routeIds);
    clearRouteLine();
    renderRoute();
  }
  // focus / highlight marker
  if(isNum(m.lat)&&isNum(m.lng)){
    map.setView([m.lat,m.lng], Math.max(map.getZoom(), 14));
    renderMarkers(m.id);
  } else {
    renderMarkers();
  }
});
$("sapSearch").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); $("btnFind").click(); } });
$("btnFit").addEventListener("click", ()=>fitAll());

// ---------- Import Excel ----------
$("btnImport").addEventListener("click", ()=>$("fileInput").click());
$("fileInput").addEventListener("change", async (e)=>{
  const file=e.target.files?.[0];
  if(!file) return;
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:"array"});
    const sheetName=wb.SheetNames[0];
    const ws=wb.Sheets[sheetName];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
    const imported=[];
    for(const r of rows){
      const m=extractFromRow(r);
      if(!m || !(m.sap || m.name)) continue;

      // Regel: Bestimmte Märkte ignorieren
      const hay = `${m.name} ${m.anschrift} ${m.ort}`.toLowerCase();
      if(IGNORE_MARKETS.some(x => hay.includes(x))) continue;

      imported.push(m);
    }
    if(!imported.length){ alert("Keine passenden Zeilen gefunden."); return; }
    const res=mergeMarkets(imported);
    $("marketCount").textContent=String(markets.length);
    initMap();
    clearRouteLine();
    renderRoute();
    renderMarkers();
    fitAll();
    alert(`Import fertig.\nNeu: ${res.added}\nAktualisiert: ${res.updated}\nGesamt: ${markets.length}`);
  } catch(err){
    console.error(err);
    alert("Import fehlgeschlagen. Bitte prüfe die Datei.");
  } finally { e.target.value=""; }
});

// ---------- Clear all ----------
$("btnClearAll").addEventListener("click", ()=>{
  if(!confirm("Wirklich ALLES löschen? (Märkte, Koordinaten, Route)")) return;
  markets=[]; routeIds=[]; myPos=null;
  lastLinks=[];
  localStorage.removeItem(STORE.markets);
  localStorage.removeItem(STORE.route);
  localStorage.removeItem(STORE.myPos);
  localStorage.removeItem(STORE.lastLinks);
  $("marketCount").textContent="0";
  clearRouteLine();
  renderRoute();
  renderMarkers();
  setStartEnabled(false);
  alert("Gelöscht.");
});

async function getMyPosIfPossible(){
  if(!navigator.geolocation) return null;
  return new Promise((resolve)=>{
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const p={lat:pos.coords.latitude, lng:pos.coords.longitude};
        resolve(p);
      },
      ()=>resolve(null),
      {enableHighAccuracy:true, timeout:10000}
    );
  });
}

// ---------- Geocoding (Nominatim) ----------
async function nominatimGeocode(q){
  const url = `${NOMINATIM}?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {headers:{"Accept":"application/json"}});
  if(!res.ok) return null;
  const js = await res.json();
  if(!js?.length) return null;
  const lat=toNum(js[0].lat), lng=toNum(js[0].lon);
  if(!isNum(lat)||!isNum(lng)) return null;
  return {lat,lng};
}

// ---------- Add market (manual) ----------
function parseAddrForFields(addrInput){
  const raw = String(addrInput||"").trim();
  if(!raw) return {anschrift:"", plz:"", ort:""};
  // Try: "Street 1, 12345 City" or "Street 1 12345 City"
  let anschrift = raw;
  let plz = "", ort = "";
  const parts = raw.split(",").map(s=>s.trim()).filter(Boolean);
  if(parts.length>=2){
    anschrift = parts[0];
    const rest = parts.slice(1).join(" ").trim();
    const m = rest.match(/\b(\d{5})\s+(.+)$/);
    if(m){ plz = m[1]; ort = m[2].trim(); }
    else ort = rest;
    return {anschrift, plz, ort};
  }
  const m = raw.match(/^(.*)\b(\d{5})\s+(.+)$/);
  if(m){
    anschrift = m[1].trim().replace(/,\s*$/," ").trim();
    plz = m[2];
    ort = m[3].trim();
  }
  return {anschrift, plz, ort};
}

document.getElementById("btnAddMarketSave")?.addEventListener("click", async ()=>{
  const name = String(document.getElementById("amName")?.value||"").trim();
  const addr = String(document.getElementById("amAddr")?.value||"").trim();
  const sap = String(document.getElementById("amSap")?.value||"").trim();

  if(!name || !addr || !sap){
    setAddMarketStatus("Bitte Marktname, Adresse und SAP‑Nummer ausfüllen.");
    return;
  }
  const hay = `${name} ${addr}`.toLowerCase();
  if(IGNORE_MARKETS.some(x => hay.includes(x))){
    setAddMarketStatus("Diese Märkte werden automatisch ignoriert: Rossmann, Aldi, Lidl, Netto, Penny.");
    return;
  }

  setAddMarketStatus("Speichere & geocode …");
  const {anschrift, plz, ort} = parseAddrForFields(addr);

  // Update existing by SAP if present, else create new
  let m = markets.find(x=>String(x.sap||"").trim() === sap);
  if(!m){
    m = { id: uid(), sap, ninox:"", name, anschrift, plz, ort, lat:null, lng:null };
    markets.push(m);
  } else {
    m.name = name;
    m.anschrift = anschrift;
    m.plz = plz;
    m.ort = ort;
    m.lat = null;
    m.lng = null;
  }

  try{
    const geo = await nominatimGeocode(`${addr}, Deutschland`);
    if(geo){ m.lat = geo.lat; m.lng = geo.lng; }
    save(STORE.markets, markets);
    document.getElementById("marketCount").textContent = String(markets.length);
    initMap();
    renderMarkers(m.id);
    fitAll();
    setAddMarketStatus(geo ? "Gespeichert ✓" : "Gespeichert – Geo nicht gefunden (bitte Adresse prüfen)." );
    // close after a short, subtle delay
    setTimeout(closeAddMarketModal, 550);
  } catch(err){
    console.error(err);
    setAddMarketStatus("Speichern fehlgeschlagen. Bitte erneut versuchen.");
  }
});

$("btnGeocode").addEventListener("click", async ()=>{
  if(!markets.length){ alert("Bitte erst Excel importieren."); return; }
  const missing = markets.filter(m=>!(isNum(m.lat)&&isNum(m.lng)));
  if(!missing.length){ alert("Alle Märkte haben schon Koordinaten."); return; }
  const ok=confirm(`Es fehlen Koordinaten bei ${missing.length} Märkten.\nGeocoding startet jetzt (mit Pausen).\nWeiter?`);
  if(!ok) return;
  $("btnGeocode").disabled=true;
  let found=0;
  for(let i=0;i<missing.length;i++){
    const m=missing[i];
    const q=`${marketAddr(m)}, Deutschland`;
    const geo=await nominatimGeocode(q);
    if(geo){ m.lat=geo.lat; m.lng=geo.lng; found++; save(STORE.markets, markets); }
    if((i+1)%10===0) renderMarkers();
    await sleep(1100); // polite delay
  }
  save(STORE.markets, markets);
  $("btnGeocode").disabled=false;
  renderMarkers();
  fitAll();
  alert(`Geotagging fertig.\nGefunden: ${found}/${missing.length}\nNicht gefunden: ${missing.length-found}\n\nTipp: Danach „Aktualisieren“ drücken.`);
});

// ---------- OSRM Optimize ----------
function coordStr(lat,lng){ return `${lng.toFixed(6)},${lat.toFixed(6)}`; } // OSRM expects lon,lat

async function osrmTrip(coords, sourceFirst=true, roundtrip=false){
  const coordPart = coords.map(c=>coordStr(c.lat,c.lng)).join(";");
  const url = `${OSRM_BASE}/trip/v1/driving/${coordPart}?source=${sourceFirst?"first":"any"}&roundtrip=${roundtrip?"true":"false"}&overview=full&geometries=geojson&steps=false&annotations=false`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("OSRM HTTP "+res.status);
  const js = await res.json();
  if(js.code !== "Ok") throw new Error(js.code || "OSRM error");
  return js;
}

function drawGeoJsonLine(geo){
  clearRouteLine();
  if(!geo?.coordinates?.length) return;
  const latlngs = geo.coordinates.map(([lng,lat])=>[lat,lng]);
  routeLine = L.polyline(latlngs, {weight:6, opacity:0.85}).addTo(map);
}

async function optimizeWithOSRM(){
  clearRouteLine();
  const pts=routePoints();
  if(pts.length<2){ throw new Error("Mindestens 2 Stops in der Route."); }
  const missing = pts.filter(m=>!(isNum(m.lat)&&isNum(m.lng)));
  if(missing.length){
    throw new Error("Einige Stops haben keine Koordinaten. Bitte erst Geocoding durchführen.");
  }

  // refresh start location right before planning (iPhone WebApp friendly)
  const fresh = await getMyPosIfPossible();
  if(fresh){
    myPos = fresh;
    save(STORE.myPos, myPos);
  }

  const useStart = myPos && isNum(myPos.lat)&&isNum(myPos.lng);

  // optional: include return trip back to the start point (only possible if we have a start location)
  const chk = document.getElementById("chkReturn");
  const includeReturn = !!(chk && chk.checked);
  const roundtrip = includeReturn && useStart;

  const coords = (useStart ? [{lat:myPos.lat,lng:myPos.lng, __start:true}] : []).concat(
    pts.map(m=>({lat:m.lat,lng:m.lng, id:m.id}))
  );

  const js = await osrmTrip(coords, useStart, roundtrip);
  const trip = js.trips?.[0];
  const wps = js.waypoints || [];
  const ordered = wps
    .map((w, idx)=>({idx, order:w.waypoint_index}))
    .sort((a,b)=>a.order-b.order)
    .map(x=>coords[x.idx]);

  const orderedMarketIds = ordered.filter(o=>!o.__start).map(o=>o.id);
  routeIds = orderedMarketIds;
  save(STORE.route, routeIds);

  const km = (trip?.distance ?? 0) / 1000;
  renderRoute(km);
  renderMarkers();
  drawGeoJsonLine(trip?.geometry);
  if(routeLine) map.fitBounds(routeLine.getBounds().pad(0.15));

  return {km, trip};
}

// ---------- Plan (Google Maps Export) ----------
function buildMapsLinks(points, start){
  const maxStopsPerLink=20;
  if(!points.length) return [];
  const links=[];
  let origin = start && isNum(start.lat)&&isNum(start.lng) ? `${start.lat},${start.lng}` : marketAddr(points[0]);
  let i = (start?0:1);
  while(i<points.length){
    const chunk=points.slice(i, i+maxStopsPerLink);
    const destination=chunk[chunk.length-1];
    const waypoints=chunk.slice(0,-1).map(p=>{
      if(isNum(p.lat)&&isNum(p.lng)) return `${p.lat},${p.lng}`;
      return marketAddr(p);
    });
    const params=new URLSearchParams();
    params.set("api","1");
    params.set("origin", origin);
    params.set("destination", isNum(destination.lat)&&isNum(destination.lng)?`${destination.lat},${destination.lng}`:marketAddr(destination));
    params.set("travelmode","driving");
    if(waypoints.length) params.set("waypoints", waypoints.join("|"));
    links.push(`https://www.google.com/maps/dir/?${params.toString()}`);
    origin = isNum(destination.lat)&&isNum(destination.lng)?`${destination.lat},${destination.lng}`:marketAddr(destination);
    i += chunk.length;
  }
  return links;
}

// ---------- Finalize (auto: current location + OSRM + ready for Maps) ----------
const __btnFinalize = document.getElementById("btnFinalize");
if(__btnFinalize){
  __btnFinalize.addEventListener("click", async ()=>{
    setStatus("Plane Route …");
    setStartEnabled(false);
    __btnFinalize.disabled = true;
    try{
      await optimizeWithOSRM();

      const pts = routePoints();

      // Optional: add return to start for Google Maps export (if enabled + start position known)
      const chk = document.getElementById("chkReturn");
      const includeReturn = !!(chk && chk.checked);
      const ptsForMaps = (includeReturn && myPos && isNum(myPos.lat) && isNum(myPos.lng))
        ? pts.concat([{lat:myPos.lat, lng:myPos.lng, __return:true}])
        : pts;

      // Stop-für-Stop: wir speichern die geplante Reihenfolge als Punkte
      navPlan = ptsForMaps;
      save(STORE.navPlan, navPlan);
      navIdx = 0;
      save(STORE.navIdx, navIdx);
      // legacy: invalidate old multi-stop links
      lastLinks = [];
      save(STORE.lastLinks, lastLinks);

      setStartEnabled(true);
      setStatus("Bereit: Kilometer berechnet. Du kannst jetzt „Starten (Stop für Stop)“ drücken.");
    } catch(err){
      console.error(err);
      setStatus(err?.message || "Planung fehlgeschlagen.");
    } finally {
      __btnFinalize.disabled = false;
    }
  });
}

// ---------- Start (Stop-by-stop) ----------
const __btnStart = document.getElementById("btnStartMaps");
if(__btnStart){
  __btnStart.addEventListener("click", ()=>{
    // Speichere Tour (Datum/Uhrzeit + Stops + km)
    try{ recordTourStart(); }catch(e){}

    const pts = Array.isArray(navPlan) ? navPlan : [];
    if(!pts.length){
      setStatus("Bitte zuerst „Planung fertigstellen“ drücken.");
      return;
    }
    navIdx = 0;
    save(STORE.navIdx, navIdx);
    renderNav();
    setStatus("Stop 1 ist bereit. Tippe auf „Öffnen in Google Maps“ (oder wechsel mit Zurück/Weiter).");
  });
}

// ---------- Navigation buttons ----------
document.getElementById("btnOpenMaps")?.addEventListener("click", ()=>{
  const href = document.getElementById("btnOpenMaps")?.dataset?.href;
  if(href) window.open(href, "_blank");
});
document.getElementById("btnPrevStop")?.addEventListener("click", ()=>{
  const pts = Array.isArray(navPlan) ? navPlan : [];
  if(!pts.length) return;
  navIdx = Math.max(0, (navIdx||0) - 1);
  save(STORE.navIdx, navIdx);
  renderNav();
});

document.getElementById("btnArrived")?.addEventListener("click", ()=>{
  const pts = Array.isArray(navPlan) ? navPlan : [];
  if(!pts.length) return;
  if((navIdx||0) >= pts.length-1){
    setStatus("Letzter Stopp erreicht ✅");
    renderNav();
    return;
  }
  navIdx = Math.min(pts.length-1, (navIdx||0) + 1);
  save(STORE.navIdx, navIdx);
  renderNav();
  setStatus(`Nächster Stopp bereit: ${pointTitle(pts[navIdx])}`);
});
document.getElementById("btnNextStop")?.addEventListener("click", ()=>{
  const pts = Array.isArray(navPlan) ? navPlan : [];
  if(!pts.length) return;
  navIdx = Math.min(pts.length-1, (navIdx||0) + 1);
  save(STORE.navIdx, navIdx);
  renderNav();
});

// ---------- Reload ----------
$("btnReload")?.addEventListener("click", ()=>location.reload());


// ---------- Route reset (only planned route, keep markets) ----------
function resetRouteOnly(){
  routeIds = [];
  save(STORE.route, routeIds);
  lastLinks = [];
  save(STORE.lastLinks, lastLinks);
  navPlan = [];
  save(STORE.navPlan, navPlan);
  navIdx = 0;
  save(STORE.navIdx, navIdx);
  showNavCard(false);
  setStartEnabled(false);
  clearRouteLine();
  renderRoute();
  renderMarkers();
}
const __btnReset = document.getElementById("btnResetRoute");
if(__btnReset){
  __btnReset.addEventListener("click", ()=>{
    if(!routeIds.length) return;
    setStatus("");
    resetRouteOnly();
    setStatus("Route zurückgesetzt.");
  });
}

// ---------- init ----------
$("marketCount").textContent = String(markets.length);
setStartEnabled(Array.isArray(navPlan) && navPlan.length>0);
initMap();
renderRoute();
renderMarkers();
fitAll();

setStartEnabled(Array.isArray(navPlan) && navPlan.length>0);

setStartEnabled(Array.isArray(navPlan) && navPlan.length>0);

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

document.addEventListener("DOMContentLoaded",()=>{
 if(localStorage.getItem("introSeen")){
  const o=document.getElementById("introOverlay");
  if(o) o.style.display="none";
 }
});
function closeIntro(){
 localStorage.setItem("introSeen","true");
 const o=document.getElementById("introOverlay");
 const v=document.getElementById("introVideo");
 if(v) v.pause();
 if(o) o.style.display="none";
}

function closeIntro(){
  localStorage.setItem("introSeen","true");
  const o=document.getElementById("introOverlay");
  const v=document.getElementById("introVideo");
  if(v) v.pause();
  if(o){
    o.classList.add("fade-out");
    setTimeout(()=>{ o.style.display="none"; },400);
  }
}


// ---------- Tour Historie ----------
function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDateTime(iso){
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDate(iso){
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
}
function isoDateLocal(d){
  // yyyy-mm-dd in local time
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth()+1);
  const da = pad2(dt.getDate());
  return `${y}-${m}-${da}`;
}
function loadHistory(){
  return load(STORE.history, []);
}
function saveHistory(arr){
  save(STORE.history, arr);
}
function getLastPlannedKm(){
  // UI shows last planned km in #kKm; parse safely
  const el = document.getElementById("kKm");
  if(!el) return null;
  const t = (el.textContent||"").replace(",",".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function recordTourStart(){
  const pts = routePoints();
  if(!pts.length) return;

  const nowIso = new Date().toISOString();
  const km = getLastPlannedKm();

  const tour = {
    id: "t_" + Math.random().toString(36).slice(2,10) + "_" + Date.now(),
    startedAt: nowIso,
    plannedKm: km,
    stops: pts.map((m,idx)=>({
      idx: idx+1,
      id: m.id || "",
      name: m.name || "",
      sap: m.sap || "",
      anschrift: m.anschrift || "",
      plz: m.plz || "",
      ort: m.ort || "",
      lat: m.lat ?? null,
      lng: m.lng ?? null,
    })),
  };

  const hist = loadHistory();
  hist.unshift(tour);
  saveHistory(hist);
  renderHistory();
}

function historyRange(){
  const fromEl = document.getElementById("hFrom");
  const toEl = document.getElementById("hTo");
  const from = fromEl?.value ? new Date(fromEl.value+"T00:00:00") : null;
  const to = toEl?.value ? new Date(toEl.value+"T23:59:59") : null;
  return {from,to};
}
function filterHistory(hist){
  const {from,to}=historyRange();
  return hist.filter(t=>{
    const d = new Date(t.startedAt);
    if(from && d < from) return false;
    if(to && d > to) return false;
    return true;
  });
}
function sumKm(hist){
  return hist.reduce((acc,t)=> acc + (Number.isFinite(t.plannedKm)?t.plannedKm:0), 0);
}

function renderHistory(){
  const list = document.getElementById("historyList");
  const hKm = document.getElementById("hKm");
  const hTours = document.getElementById("hTours");
  if(!list || !hKm || !hTours) return;

  const all = loadHistory();
  const filtered = filterHistory(all);

  hTours.textContent = String(filtered.length);
  const km = sumKm(filtered);
  hKm.textContent = filtered.length ? formatKm(km) : "—";

  if(!filtered.length){
    list.innerHTML = `<div class="muted">Noch keine Tour gespeichert. Sobald du auf „Starten“ drückst, landet sie hier.</div>`;
    return;
  }

  list.innerHTML = filtered.map(t=>{
    const badgeKm = Number.isFinite(t.plannedKm) ? `${formatKm(t.plannedKm)} km` : "km —";
    const badgeStops = `${(t.stops||[]).length} Stop(s)`;
    const rows = (t.stops||[]).map(s=>`
      <tr>
        <td>${s.idx}</td>
        <td>${escapeHTML(s.name)}</td>
        <td>${escapeHTML([s.plz,s.ort].filter(Boolean).join(" "))}</td>
        <td>${escapeHTML(s.anschrift||"")}</td>
      </tr>
    `).join("");

    return `
      <div class="h-tour">
        <div class="top">
          <div class="meta">
            <span class="h-badge">🕒 ${fmtDateTime(t.startedAt)}</span>
            <span class="h-badge">🧭 ${badgeKm}</span>
            <span class="h-badge">📍 ${badgeStops}</span>
          </div>
        </div>
        <table class="h-table">
          <thead><tr><th>#</th><th>Markt</th><th>Ort</th><th>Anschrift</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join("");
}

function exportHistoryCsv(){
  const all = loadHistory();
  const filtered = filterHistory(all);
  if(!filtered.length){
    setStatus("Keine Touren im gewählten Zeitraum.");
    return;
  }
  const rows = [];
  filtered.forEach(t=>{
    const started = t.startedAt;
    const date = fmtDate(started);
    const time = fmtDateTime(started).split(" ")[1] || "";
    const km = Number.isFinite(t.plannedKm) ? t.plannedKm : "";
    (t.stops||[]).forEach(s=>{
      rows.push({
        tour_started_at: started,
        tour_date: date,
        tour_time: time,
        tour_planned_km: km,
        stop_index: s.idx,
        market_name: s.name || "",
        plz: s.plz || "",
        ort: s.ort || "",
        anschrift: s.anschrift || "",
        sap: s.sap || "",
      });
    });
  });

  const headers = Object.keys(rows[0]);
  const esc = (v)=>{
    const s = String(v ?? "");
    if(/[",\n;]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map(r=>headers.map(h=>esc(r[h])).join(";"))
  ].join("\n");

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  a.href = URL.createObjectURL(blob);
  a.download = `sellence-touren-historie_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus("CSV export erstellt.");
}

function printHistory(){
  const all = loadHistory();
  const filtered = filterHistory(all);
  if(!filtered.length){
    setStatus("Keine Touren im gewählten Zeitraum.");
    return;
  }
  const km = sumKm(filtered);
  const {from,to}=historyRange();
  const rangeLabel = `${from?isoDateLocal(from):"—"} bis ${to?isoDateLocal(to):"—"}`;

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <title>SELLENCE Tour‑Historie</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:20px}
      h1{margin:0 0 6px 0}
      .muted{color:#555}
      .sum{margin:14px 0 18px 0}
      table{width:100%; border-collapse:collapse; margin:8px 0 18px 0}
      th,td{border:1px solid #ccc; padding:6px 8px; text-align:left; vertical-align:top; font-size:12px}
      th{background:#f3f3f3}
      .tour{margin-top:14px}
    </style>
  </head>
  <body>
    <h1>SELLENCE Tour‑Historie</h1>
    <div class="muted">Zeitraum: ${rangeLabel}</div>
    <div class="sum"><b>Gefahrene Kilometer:</b> ${Number.isFinite(km)?km.toFixed(1).replace(".",","):"—"} &nbsp; | &nbsp; <b>Touren:</b> ${filtered.length}</div>
    ${filtered.map(t=>`
      <div class="tour">
        <div><b>Tour:</b> ${fmtDateTime(t.startedAt)} &nbsp; | &nbsp; <b>km:</b> ${Number.isFinite(t.plannedKm)?t.plannedKm.toFixed(1).replace(".",","):"—"} &nbsp; | &nbsp; <b>Stops:</b> ${(t.stops||[]).length}</div>
        <table>
          <thead><tr><th>#</th><th>Markt</th><th>PLZ/Ort</th><th>Anschrift</th></tr></thead>
          <tbody>
            ${(t.stops||[]).map(s=>`
              <tr><td>${s.idx}</td><td>${(s.name||"").replace(/</g,"&lt;")}</td><td>${[s.plz,s.ort].filter(Boolean).join(" ")}</td><td>${(s.anschrift||"").replace(/</g,"&lt;")}</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `).join("")}
    <script>window.print();</script>
  </body>
  </html>`;
  const w = window.open("", "_blank");
  if(!w){ setStatus("Popup blockiert – bitte Popups erlauben."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function initHistoryUI(){
  const card = document.getElementById("historyCard");
  if(!card) return;

  const fromEl = document.getElementById("hFrom");
  const toEl = document.getElementById("hTo");

  // Default: last 30 days
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate()-30);
  if(fromEl && !fromEl.value) fromEl.value = isoDateLocal(from);
  if(toEl && !toEl.value) toEl.value = isoDateLocal(to);

  const rer = ()=>renderHistory();
  fromEl?.addEventListener("change", rer);
  toEl?.addEventListener("change", rer);

  document.getElementById("btnRangeToday")?.addEventListener("click", ()=>{
    const d = new Date();
    fromEl.value = isoDateLocal(d);
    toEl.value = isoDateLocal(d);
    renderHistory();
  });
  document.getElementById("btnRangeWeek")?.addEventListener("click", ()=>{
    const d = new Date();
    const start = new Date(d);
    start.setDate(d.getDate()-6);
    fromEl.value = isoDateLocal(start);
    toEl.value = isoDateLocal(d);
    renderHistory();
  });
  document.getElementById("btnRangeMonth")?.addEventListener("click", ()=>{
    const d = new Date();
    const start = new Date(d);
    start.setMonth(d.getMonth()-1);
    fromEl.value = isoDateLocal(start);
    toEl.value = isoDateLocal(d);
    renderHistory();
  });

  document.getElementById("btnExportCsv")?.addEventListener("click", exportHistoryCsv);
  document.getElementById("btnPrintHistory")?.addEventListener("click", printHistory);
  document.getElementById("btnClearHistory")?.addEventListener("click", ()=>{
    if(confirm("Historie wirklich löschen? (Nur auf diesem Gerät)")){
      saveHistory([]);
      renderHistory();
      setStatus("Historie gelöscht.");
    }
  });

  renderHistory();
}

document.addEventListener("DOMContentLoaded", initHistoryUI);


/* Fahrdaten Drawer (Menüeintrag) */
document.addEventListener("DOMContentLoaded", ()=>{
  const btn = document.getElementById("btnFahrdaten");
  const drawer = document.getElementById("fahrdatenDrawer");
  const close = document.getElementById("closeFahrdaten");
  const body = document.getElementById("fahrdatenBody");
  const history = document.getElementById("historyCard");

  // Existing menu elements
  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");

  // Move history card into drawer (keeps all functionality)
  if(history && body && !body.contains(history)){
    body.appendChild(history);
  }

  const openDrawer = ()=>{
    if(!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden","false");
    // close the small menu panel
    if(menuPanel){
      menuPanel.classList.remove("open");
      menuPanel.setAttribute("aria-hidden","true");
    }
  };
  const closeDrawer = ()=>{
    if(!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden","true");
  };

  btn?.addEventListener("click", openDrawer);
  close?.addEventListener("click", closeDrawer);

  // Close drawer on ESC
  document.addEventListener("keydown", (e)=>{
    if(e.key==="Escape") closeDrawer();
  });
});
