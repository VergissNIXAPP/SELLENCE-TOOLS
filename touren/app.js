/* SELLENCE-TOURENPLANER (SAP) – OSRM v1 (kostenlos) */
const $ = (id)=>document.getElementById(id);

const STORE = {
  markets: "sellence_sap_markets_osrm_v1",
  route: "sellence_sap_route_osrm_v1",
  myPos: "sellence_sap_mypos_osrm_v1",
};

const OSRM_BASE = "https://router.project-osrm.org";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";


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
    const addr = marketAddr(m);
    const popup=document.createElement("div");
    popup.innerHTML=`
      <div style="font-weight:900;margin-bottom:4px">${escapeHTML(m.name||"")}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.70);margin-bottom:6px">${escapeHTML(addr)}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.70);margin-bottom:10px"><b>SAP:</b> ${escapeHTML(m.sap||"—")}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
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
  }).join("") || `<div class="muted tiny">Noch keine Stops. SAP suchen → „In Route +“.</div>`;

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
$("btnFind").addEventListener("click", ()=>{
  const m=findBySAP($("sapSearch").value);
  if(!m){ alert("SAP-Nr. nicht gefunden."); return; }
  if(isNum(m.lat)&&isNum(m.lng)){
    map.setView([m.lat,m.lng], Math.max(map.getZoom(), 14));
    renderMarkers(m.id);
  } else {
    if(confirm(`Markt gefunden:\n${m.name}\n${marketAddr(m)}\n\nIn Route aufnehmen?`)){
      toggleRoute(m.id);
      renderRoute();
      renderMarkers();
    }
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
      if(m && (m.sap || m.name)) imported.push(m);
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
  localStorage.removeItem(STORE.markets);
  localStorage.removeItem(STORE.route);
  localStorage.removeItem(STORE.myPos);
  $("marketCount").textContent="0";
  clearRouteLine();
  renderRoute();
  renderMarkers();
  alert("Gelöscht.");
});

// ---------- My location ----------
$("btnMyPos").addEventListener("click", ()=>{
  if(!navigator.geolocation){ alert("Geolocation nicht verfügbar."); return; }
  navigator.geolocation.getCurrentPosition((pos)=>{
    myPos={lat:pos.coords.latitude, lng:pos.coords.longitude};
    save(STORE.myPos, myPos);
    setMyMarker();
    map.setView([myPos.lat,myPos.lng], Math.max(map.getZoom(), 12));
    renderMarkers();
  }, ()=>alert("Standort nicht verfügbar (Berechtigung?)."), {enableHighAccuracy:true, timeout:10000});
});

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

async function osrmTrip(coords, sourceFirst=true){
  const coordPart = coords.map(c=>coordStr(c.lat,c.lng)).join(";");
  const url = `${OSRM_BASE}/trip/v1/driving/${coordPart}?source=${sourceFirst?"first":"any"}&roundtrip=false&overview=full&geometries=geojson&steps=false&annotations=false`;
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

$("btnOptimize").addEventListener("click", async ()=>{
  clearRouteLine();
  const pts=routePoints();
  if(pts.length<2){ alert("Mindestens 2 Stops in der Route."); return; }
  const missing = pts.filter(m=>!(isNum(m.lat)&&isNum(m.lng)));
  if(missing.length){
    alert("Einige Stops haben keine Koordinaten. Bitte erst Geocoding durchführen.");
    return;
  }

  const useStart = myPos && isNum(myPos.lat)&&isNum(myPos.lng);
  // Build coordinates for OSRM: if start exists, include it first, then all stops
  const coords = (useStart ? [{lat:myPos.lat,lng:myPos.lng, __start:true}] : []).concat(
    pts.map(m=>({lat:m.lat,lng:m.lng, id:m.id}))
  );

  $("btnOptimize").disabled=true;
  try{
    const js = await osrmTrip(coords, useStart);
    const trip = js.trips?.[0];
    const wps = js.waypoints || [];
    // waypoint index mapping:
    // Each waypoint has waypoint_index = position in the trip geometry order for input coord
    // We sort by waypoint_index to get visited order.
    const ordered = wps
      .map((w, idx)=>({idx, order:w.waypoint_index}))
      .sort((a,b)=>a.order-b.order)
      .map(x=>coords[x.idx]);

    // ordered includes start if provided. We want routeIds only for markets (exclude start).
    const orderedMarketIds = ordered.filter(o=>!o.__start).map(o=>o.id);

    routeIds = orderedMarketIds;
    save(STORE.route, routeIds);

    const km = (trip?.distance ?? 0) / 1000;
    renderRoute(km);
    renderMarkers();
    drawGeoJsonLine(trip?.geometry);
    // fit bounds to route
    if(routeLine) map.fitBounds(routeLine.getBounds().pad(0.15));

    alert("Route optimiert (OSRM – echte Straßenroute). Jetzt „Planen“ drücken.");
  } catch(err){
    console.error(err);
    renderRoute(); // keep list
    alert("OSRM Optimierung fehlgeschlagen (Server evtl. kurz down). Du kannst trotzdem „Planen“ nutzen.");
  } finally {
    $("btnOptimize").disabled=false;
  }
});

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

$("btnPlan").addEventListener("click", ()=>{
  const pts=routePoints();
  if(!pts.length){ alert("Keine Stops in der Route."); return; }
  const links = buildMapsLinks(pts, myPos);
  if(!links.length){ alert("Konnte keinen Maps-Link bauen."); return; }
  if(links.length===1){
    window.open(links[0], "_blank");
    return;
  }
  alert(`Viele Stops – Google Maps wird in ${links.length} Teile aufgeteilt.\nÖffne Teil 1, dann Teil 2, ...`);
  window.open(links[0], "_blank");
  const rest = links.slice(1).map((u,i)=>`Teil ${i+2}: ${u}`).join("\n");
  navigator.clipboard?.writeText(rest).catch(()=>{});
});


// ---------- Reload ----------
$("btnReload")?.addEventListener("click", ()=>location.reload());


// ---------- Route reset (only planned route, keep markets) ----------
function resetRouteOnly(){
  routeIds = [];
  save(STORE.route, routeIds);
  clearRouteLine();
  renderRoute();
  renderMarkers();
}
const __btnReset = document.getElementById("btnResetRoute");
if(__btnReset){
  __btnReset.addEventListener("click", ()=>{
    if(!routeIds.length){ alert("Route ist schon leer."); return; }
    if(!confirm("Nur die geplante Tagesroute zurücksetzen? (Märkte bleiben gespeichert)")) return;
    resetRouteOnly();
  });
}

// ---------- init ----------
$("marketCount").textContent = String(markets.length);
initMap();
renderRoute();
renderMarkers();
fitAll();

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
