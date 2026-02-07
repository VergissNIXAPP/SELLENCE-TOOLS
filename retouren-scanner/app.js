(function(){
  const STORAGE_KEY = "retouren_scanner_state_v2_iosfix";
  const MAX_PKG = 500.00;
  const MIN_PKG = 200.00;

  // Embedded DB (placeholder) – you can replace with your full extracted DB later
  const EMBEDDED_DB = {
  "42463627": {
    "name": "MARLBORO RED",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463160": {
    "name": "MARLBORO RED",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463610": {
    "name": "RED OP XL-BOX",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42463221": {
    "name": "MARLBORO RED",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463481": {
    "name": "MARLBORO RED",
    "price": 15.0,
    "cat": "Zigaretten"
  },
  "42463184": {
    "name": "RED OP 7XL-BOX",
    "price": 20.0,
    "cat": "Zigaretten"
  },
  "42435327": {
    "name": "OP 9XL-BOX",
    "price": 30.0,
    "cat": "Zigaretten"
  },
  "42463603": {
    "name": "RED LONG OP-BOX",
    "price": 9.1,
    "cat": "Zigaretten"
  },
  "42463573": {
    "name": "MARLBORO MIX",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463528": {
    "name": "MARLBORO MIX",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42463252": {
    "name": "MIX OP 2XL-BOX",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463597": {
    "name": "MARLBORO GOLD",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463177": {
    "name": "MARLBORO GOLD",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463580": {
    "name": "GOLD OP XL-BOX",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42463214": {
    "name": "MARLBORO GOLD",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463498": {
    "name": "MARLBORO GOLD",
    "price": 15.0,
    "cat": "Zigaretten"
  },
  "42463153": {
    "name": "GOLD OP 7XL-BOX",
    "price": 20.0,
    "cat": "Zigaretten"
  },
  "42463566": {
    "name": "GOLD LONG OP-BOX",
    "price": 9.1,
    "cat": "Zigaretten"
  },
  "42463511": {
    "name": "MARLBORO WHITE",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463559": {
    "name": "WHITE OP-BOX",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463535": {
    "name": "MARLBORO SIMPLY",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463542": {
    "name": "SIMPLY BLUE OP-BOX",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42046448": {
    "name": "CRAFTED RED OP-BOX",
    "price": 8.0,
    "cat": "Zigaretten"
  },
  "42466147": {
    "name": "CRAFTED RED OP 2XL-BOX",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42493006": {
    "name": "CRAFTED RED OP 7XL-BOX",
    "price": 20.0,
    "cat": "Zigaretten"
  },
  "42046431": {
    "name": "CRAFTED GOLD OP-BOX",
    "price": 8.0,
    "cat": "Zigaretten"
  },
  "42466154": {
    "name": "CRAFTED GOLD OP 2XL-BOX",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42493150": {
    "name": "CRAFTED GOLD OP 7XL-BOX",
    "price": 20.0,
    "cat": "Zigaretten"
  },
  "42463115": {
    "name": "RED LABEL OP 2XL-BOX",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463467": {
    "name": "L&M RED",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42463146": {
    "name": "L&M RED",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42463351": {
    "name": "L&M RED",
    "price": 21.0,
    "cat": "Zigaretten"
  },
  "42463085": {
    "name": "RED LABEL OP 7XL-BOX",
    "price": 21.0,
    "cat": "Zigaretten"
  },
  "42463337": {
    "name": "RED LABEL OP 9XL-BOX",
    "price": 28.0,
    "cat": "Zigaretten"
  },
  "42463450": {
    "name": "RED LABEL LONG OP-BOX",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42463443": {
    "name": "L&M BLUE",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42463139": {
    "name": "L&M BLUE",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42463122": {
    "name": "BLUE LABEL OP 2XL-BOX",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463108": {
    "name": "L&M BLUE",
    "price": 15.0,
    "cat": "Zigaretten"
  },
  "42463344": {
    "name": "BLUE LABEL OP 7XL-BOX",
    "price": 21.0,
    "cat": "Zigaretten"
  },
  "42463436": {
    "name": "SIMPLYBLUE OP-BOX",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42463429": {
    "name": "L&M",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42463269": {
    "name": "CHESTERFIELD",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42466741": {
    "name": "CHESTERFIELD",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42466529": {
    "name": "ORIGINAL OP 2XL-BOX",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42466758": {
    "name": "BLUE OP 2XL-BOX",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463276": {
    "name": "CHESTERFIELD BLUE",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42466543": {
    "name": "CHESTERFIELD BLUE",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42466581": {
    "name": "BLUE OP 4XL-BOX",
    "price": 15.0,
    "cat": "Zigaretten"
  },
  "42465966": {
    "name": "PARLIAMENT NIGHT",
    "price": 9.3,
    "cat": "Zigaretten"
  },
  "42465997": {
    "name": "NIGHT BLUE LONG OP-BOX",
    "price": 9.0,
    "cat": "Zigaretten"
  },
  "42463092": {
    "name": "OP 2XL-BOX",
    "price": 12.0,
    "cat": "Zigaretten"
  },
  "42463306": {
    "name": "f6 ORIGINAL OP",
    "price": 8.6,
    "cat": "Zigaretten"
  },
  "42463078": {
    "name": "f6 ORIGINAL OP",
    "price": 10.0,
    "cat": "Zigaretten"
  },
  "42463320": {
    "name": "OP 7XL-BOX",
    "price": 21.0,
    "cat": "Zigaretten"
  },
  "42463313": {
    "name": "BLUE OP 7XL-BOX",
    "price": 21.0,
    "cat": "Zigaretten"
  },
  "42463061": {
    "name": "f6 BLUE",
    "price": 10.0,
    "cat": "Zigaretten"
  }
};

  function newPackage(){ return { items: {} }; } // ean -> {qty}
  function round2(x){ return Math.round((x + Number.EPSILON) * 100) / 100; }
  function fmtEUR(x){ return (x ?? 0).toLocaleString("de-DE",{minimumFractionDigits:2, maximumFractionDigits:2}); }
  function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function loadState(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  let state = loadState() || { db: EMBEDDED_DB, packages:[newPackage()], activeIndex:0 };

  // UI
  const eanInput = document.getElementById("eanInput");
  const addBtn = document.getElementById("addBtn");
  const camBtn = document.getElementById("camBtn");
  const resetBtn = document.getElementById("resetBtn");
  const forceNextBtn = document.getElementById("forceNextBtn");
  const finishBtn = document.getElementById("finishBtn");

  const pkgIdx = document.getElementById("pkgIdx");
  const pkgSum = document.getElementById("pkgSum");
  const grandSum = document.getElementById("grandSum");
  const statusText = document.getElementById("statusText");
  const hint = document.getElementById("hint");

  const pkgTable = document.getElementById("pkgTable");
  const dbTable = document.getElementById("dbTable");

  const videoWrap = document.getElementById("videoWrap");
  const video = document.getElementById("video");
  const cameraNote = document.getElementById("cameraNote");

  function setStatus(text, tone){
    statusText.textContent = text;
    statusText.className = "status" + (tone ? (" " + tone) : "");
  }

  function getActivePkg(){ return state.packages[state.activeIndex]; }

  function currentPackageSum(){
    const pkg = getActivePkg();
    let sum = 0;
    for(const [ean,row] of Object.entries(pkg.items)){
      const prod = state.db[ean];
      sum += (row.qty||0) * (prod?.price||0);
    }
    return round2(sum);
  }
  function totalSum(){
    let sum = 0;
    for(const pkg of state.packages){
      for(const [ean,row] of Object.entries(pkg.items)){
        const prod = state.db[ean];
        sum += (row.qty||0) * (prod?.price||0);
      }
    }
    return round2(sum);
  }

  function startNextPackage(message){
    state.packages.push(newPackage());
    state.activeIndex = state.packages.length - 1;
    saveState();
    render();
    setStatus(message || "Neues Paket gestartet.", "warn");
  }

  function addScan(eanRaw){
    hint.textContent = "";
    if(!eanRaw) return;
    const ean = (String(eanRaw).match(/\d+/g)||[]).join("");
    eanInput.value = "";

    if(ean.length < 8){
      setStatus("EAN zu kurz – nochmal scannen.", "bad");
      return;
    }

    const prod = state.db[ean];
    if(!prod){
      setStatus("EAN nicht in DB (wird trotzdem aufgenommen).", "warn");
      hint.textContent = "Unbekannte EAN: " + ean;
    }

    const price = prod?.price ?? 0;
    const nextSum = round2(currentPackageSum() + price);
    if(nextSum > MAX_PKG){
      startNextPackage("Max 500 € würde überschritten → neues Paket.");
    }

    const pkg = getActivePkg();
    pkg.items[ean] = pkg.items[ean] || { qty: 0 };
    pkg.items[ean].qty += 1;

    saveState();
    render();

    const sum = currentPackageSum();
    if(sum >= MAX_PKG){
      setStatus("Paket max (500 €).", "ok");
    } else if(sum >= MIN_PKG){
      setStatus("Paket ok (≥200 €). " + fmtEUR(sum) + " €", "ok");
    } else {
      setStatus("Scannen… " + fmtEUR(sum) + " € (Ziel ≥200 €)", "");
    }
  }

  // Events
  eanInput.addEventListener("keydown",(e)=>{
    if(e.key === "Enter"){ e.preventDefault(); addScan(eanInput.value.trim()); }
  });
  addBtn.addEventListener("click", ()=> addScan(eanInput.value.trim()));
  resetBtn.addEventListener("click", ()=>{
    if(confirm("Wirklich zurücksetzen?")){
      state = { db: state.db || EMBEDDED_DB, packages:[newPackage()], activeIndex:0 };
      saveState(); render(); setStatus("Bereit", "");
    }
  });
  forceNextBtn.addEventListener("click", ()=> startNextPackage("Manuell neues Paket gestartet."));
  finishBtn.addEventListener("click", ()=>{
    const sum = currentPackageSum();
    if(sum < MIN_PKG) setStatus("Noch unter 200 € (" + fmtEUR(sum) + " €).", "warn");
    else setStatus("Paket ist ok (≥200 €).", "ok");
  });

  // Camera
  let scanning = false;
  let stream = null;
  let detector = null;
  let rafId = null;

  function isSecureContextForCamera(){
    // iOS requires https for getUserMedia (except localhost in some cases).
    const proto = location.protocol;
    const host = location.hostname;
    if(proto === "https:") return true;
    if(host === "localhost" || host === "127.0.0.1") return true;
    return false;
  }

  camBtn.addEventListener("click", async ()=>{
    if(scanning){ stopCamera(); return; }

    // Show helpful note if not secure context
    if(!isSecureContextForCamera()){
      cameraNote.style.display = "block";
      cameraNote.innerHTML = "Auf iPhone/iPad wird die Kamera im Browser nur über <b>https</b> freigeschaltet. Bitte die App über GitHub Pages oder Vercel öffnen (nicht als Datei).";
      setStatus("Kamera blockiert (kein https).", "warn");
      return;
    } else {
      cameraNote.style.display = "none";
    }

    if(!navigator.mediaDevices?.getUserMedia){
      setStatus("Kamera API nicht verfügbar.", "bad");
      return;
    }

    // Prefer BarcodeDetector when available
    if(!("BarcodeDetector" in window)){
      setStatus("BarcodeDetector fehlt in diesem Browser. (iOS Chrome/Safari je nach Version).", "warn");
      cameraNote.style.display = "block";
      cameraNote.innerHTML = "Wenn dein iPhone-Browser keinen BarcodeDetector unterstützt, brauchen wir eine Decoder-Library (z.B. QuaggaJS). Sag kurz deine iOS-Version, dann baue ich den Fallback ein.";
      return;
    }

    try{
      detector = new BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128"] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio:false });
      video.srcObject = stream;
      await video.play();
      videoWrap.style.display = "block";
      scanning = true;
      camBtn.textContent = "Stop";
      setStatus("Kamera aktiv – EAN ins Bild halten.", "");
      tick();
    }catch(err){
      setStatus("Kamera konnte nicht gestartet werden (Berechtigung?).", "bad");
      stopCamera();
    }
  });

  async function tick(){
    if(!scanning) return;
    try{
      const res = await detector.detect(video);
      if(res && res.length){
        addScan(res[0].rawValue || "");
        await new Promise(r=>setTimeout(r, 220));
      }
    }catch{}
    rafId = requestAnimationFrame(tick);
  }

  function stopCamera(){
    scanning = false;
    camBtn.textContent = "Kamera";
    videoWrap.style.display = "none";
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if(stream){
      stream.getTracks().forEach(t=>t.stop());
    }
    stream = null;
    detector = null;
    setStatus("Bereit", "");
  }

  function render(){
    pkgIdx.textContent = String(state.activeIndex + 1);
    pkgSum.textContent = fmtEUR(currentPackageSum());
    grandSum.textContent = fmtEUR(totalSum());

    const pkg = getActivePkg();
    const rows = Object.entries(pkg.items).map(([ean,row])=>{
      const prod = state.db[ean];
      const name = prod?.name ?? "Unbekannt";
      const price = prod?.price ?? 0;
      const qty = row.qty || 0;
      const line = round2(qty * price);
      return {ean, name, price, qty, line, cat: prod?.cat ?? "-"};
    }).sort((a,b)=> b.line - a.line);

    pkgTable.innerHTML = rows.length ? rows.map(r=>`
      <tr>
        <td><div style="font-weight:750;">${escapeHtml(r.name)}</div><div class="muted" style="text-align:left;">Kategorie: ${escapeHtml(r.cat)}</div></td>
        <td class="right">${escapeHtml(r.ean)}</td>
        <td class="right">${r.qty}</td>
        <td class="right">${fmtEUR(r.price)}</td>
        <td class="right"><b>${fmtEUR(r.line)}</b></td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="muted">Noch nichts gescannt.</td></tr>`;

    const dbRows = Object.entries(state.db).map(([ean,p])=>({ean, ...p}))
      .sort((a,b)=> (a.name||"").localeCompare(b.name||"","de"));
    dbTable.innerHTML = dbRows.length ? dbRows.slice(0,120).map(p=>`
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td class="right">${escapeHtml(p.ean)}</td>
        <td class="right">${fmtEUR(p.price)}</td>
        <td class="right">${escapeHtml(p.cat)}</td>
      </tr>
    `).join("") : `<tr><td colspan="4" class="muted">Keine Daten.</td></tr>`;
  }

  render();

  // PWA SW only on https/localhost
  if(("serviceWorker" in navigator) && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname==="127.0.0.1")){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
})();