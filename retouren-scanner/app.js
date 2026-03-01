(() => {
  'use strict';

  // ----------------------------
  // State / Storage
  // ----------------------------
  const STORAGE_KEY = 'retouren_price_scanner_v1';
  const MAX_PKG = 500.00;

  const $ = (id) => document.getElementById(id);
  const btnCam = $('btnCam');
  const btnTorch = $('btnTorch');
  const btnAdd = $('btnAdd');
  const btnClear = $('btnClear');
  const btnReset = $('btnReset');
  const btnExport = $('btnExport');
  const btnCopy = $('btnCopy');
  const btnPerm = $('btnPerm');

  const statusEl = $('status');
  const securePill = $('securePill');
  const noteEl = $('note');

  const videoWrap = $('videoWrap');
  const video = $('video');
  const canvas = $('canvas');
  const catOut = $('catOut');
  const priceOut = $('priceOut');
  const textOut = $('textOut');

  const pkgIndexEl = $('pkgIndex');
  const pkgSumEl = $('pkgSum');
  const grandSumEl = $('grandSum');
  const rowsEl = $('rows');

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const fmtEUR = (n) => round2(n).toFixed(2).replace('.', ',');

  function newPackage(){
    return { items: [] }; // each item: {cat, price, qty}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { packages:[newPackage()], activeIndex:0 };
      const s = JSON.parse(raw);
      if(!s || !Array.isArray(s.packages) || typeof s.activeIndex !== 'number') throw 0;
      if(!s.packages.length) s.packages = [newPackage()];
      if(s.activeIndex < 0 || s.activeIndex >= s.packages.length) s.activeIndex = s.packages.length - 1;
      return s;
    }catch{
      return { packages:[newPackage()], activeIndex:0 };
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  function getActivePkg(){
    return state.packages[state.activeIndex];
  }

  function pkgSum(pkg){
    return round2(pkg.items.reduce((a,it)=>a + (it.price * it.qty), 0));
  }

  function totalSum(){
    return round2(state.packages.reduce((a,p)=>a + pkgSum(p), 0));
  }

  function ensureNewPkgIfNeeded(){
    const sum = pkgSum(getActivePkg());
    if(sum >= MAX_PKG){
      state.packages.push(newPackage());
      state.activeIndex = state.packages.length - 1;
      saveState();
      render();
      setStatus('500 € erreicht – neues Paket gestartet.', 'ok');
    }
  }

  // ----------------------------
  // UI helpers
  // ----------------------------
  function setStatus(msg, kind=''){
    statusEl.textContent = msg;
    statusEl.style.color = '';
    if(kind === 'ok') statusEl.style.color = 'var(--ok)';
    if(kind === 'warn') statusEl.style.color = 'var(--warn)';
    if(kind === 'bad') statusEl.style.color = 'var(--bad)';
  }

  function showNote(html){
    noteEl.style.display = 'block';
    noteEl.innerHTML = html;
  }
  function hideNote(){
    noteEl.style.display = 'none';
    noteEl.innerHTML = '';
  }

  const isSecure = () => (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  securePill.textContent = isSecure() ? 'https' : 'kein https';
  securePill.style.borderColor = isSecure() ? 'rgba(48,209,88,.45)' : 'rgba(255,69,58,.55)';
  securePill.style.color = isSecure() ? 'rgba(238,243,255,.85)' : 'rgba(255,160,150,.95)';

  // ----------------------------
  // Camera (robust)
  // ----------------------------
  let stream = null;
  let track = null;
  let running = false;
  let rafId = null;

  async function stopCamera(){
    running = false;
    btnCam.textContent = 'Kamera starten';
    btnTorch.disabled = true;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if(stream){
      stream.getTracks().forEach(t => t.stop());
    }
    stream = null;
    track = null;
    video.srcObject = null;
    videoWrap.style.display = 'none';
    setStatus('Bereit.', '');
  }

  function niceErr(err){
    const name = err?.name || 'Error';
    if(name === 'NotAllowedError') return 'Kamera-Berechtigung abgelehnt. Bitte im Browser erlauben.';
    if(name === 'NotFoundError') return 'Keine Kamera gefunden.';
    if(name === 'NotReadableError') return 'Kamera ist belegt (z.B. durch eine andere App). Schließe andere Kamera-Apps.';
    if(name === 'OverconstrainedError') return 'Kamera-Parameter nicht unterstützt (Auflösung/FacingMode).';
    if(name === 'SecurityError') return 'Kamera braucht https (oder localhost).';
    return `${name}: ${err?.message || 'Unbekannter Fehler'}`;
  }

  async function tryGetUserMedia(constraintsList){
    let lastErr = null;
    for (const constraints of constraintsList){
      try{
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        return s;
      }catch(e){
        lastErr = e;
      }
    }
    throw lastErr || new Error('getUserMedia failed');
  }

  async function startCamera(){
    hideNote();

    if(running){
      await stopCamera();
      return;
    }

    if(!isSecure()){
      setStatus('Kamera blockiert (kein https).', 'bad');
      showNote('Öffne die App bitte über <b>https</b> (z.B. Vercel/GitHub Pages). Über <code>file://</code> oder unsicheres http funktioniert die Kamera nicht.');
      return;
    }

    if(!navigator.mediaDevices?.getUserMedia){
      setStatus('Kamera API nicht verfügbar.', 'bad');
      showNote('Dein Browser unterstützt <code>getUserMedia</code> nicht. Bitte Chrome/Edge oder aktuellen Safari nutzen.');
      return;
    }

    // Try multiple constraint sets (some devices reject ideal width/height)
    const constraintsList = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false },
    ];

    try{
      setStatus('Kamera wird gestartet…', '');
      stream = await tryGetUserMedia(constraintsList);
      video.srcObject = stream;

      // iOS Safari sometimes needs these attributes set before play
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');

      await video.play();

      // Keep reference for torch
      track = stream.getVideoTracks()[0] || null;
      await initTorchUI();

      videoWrap.style.display = 'block';
      running = true;
      btnCam.textContent = 'Stop';
      setStatus('Kamera aktiv – halte das Steuerband in die Box.', 'ok');

      // Start OCR loop
      startOcrLoop();

    }catch(err){
      await stopCamera();
      setStatus('Kamera konnte nicht starten.', 'bad');
      showNote(`<b>Fehler:</b> ${escapeHtml(niceErr(err))}<br><br>
        <b>Fixes:</b><ul>
          <li>Browser fragt nach Kamera → <b>Erlauben</b></li>
          <li>Andere Kamera-App schließen</li>
          <li>Seite neu laden</li>
          <li>Auf iPhone: unbedingt <b>https</b></li>
        </ul>`);
    }
  }

  async function initTorchUI(){
    btnTorch.disabled = true;
    btnTorch.textContent = 'Taschenlampe';
    if(!track) return;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const hasTorch = !!caps.torch;
    if(!hasTorch){
      btnTorch.disabled = true;
      return;
    }
    btnTorch.disabled = false;
  }

  let torchOn = false;
  btnTorch.addEventListener('click', async ()=>{
    if(!track) return;
    try{
      torchOn = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: torchOn }] });
      btnTorch.textContent = torchOn ? 'Taschenlampe: an' : 'Taschenlampe: aus';
    }catch{
      torchOn = false;
      btnTorch.textContent = 'Taschenlampe';
    }
  });

  btnCam.addEventListener('click', startCamera);

  btnPerm.addEventListener('click', async ()=>{
    hideNote();
    try{
      if(!isSecure()) throw Object.assign(new Error('no https'), { name:'SecurityError' });
      await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
      setStatus('Berechtigung ok. Du kannst die Kamera starten.', 'ok');
      showNote('Berechtigung ist da. Wenn Start trotzdem nicht geht: iPhone → Seite in Safari öffnen, nicht in eingebettetem Browser (z.B. Instagram).');
    }catch(err){
      setStatus('Berechtigungstest fehlgeschlagen.', 'bad');
      showNote(`<b>Fehler:</b> ${escapeHtml(niceErr(err))}`);
    }
  });

  // ----------------------------
  // OCR engine
  // ----------------------------

  const CAT_KEYWORDS = [
    { key: 'ZIGARETTEN', cat: 'ZIGARETTEN' },
    { key: 'FEINSCHNITT', cat: 'FEINSCHNITT' },
    { key: 'FREINSCHNITT', cat: 'FEINSCHNITT' },
    { key: 'CONSUMABLES', cat: 'CONSUMABLES' },
    { key: 'CONSUMABLE', cat: 'CONSUMABLES' },
  ];

  function normalizeText(s){
    return (s || '')
      .replace(/\s+/g,' ') 
      .replace(/[“”]/g,'"')
      .trim();
  }

  function parseCategory(text){
    const up = (text || '').toUpperCase();
    for(const k of CAT_KEYWORDS){
      if(up.includes(k.key)) return k.cat;
    }
    // If we see "ST." and a euro sign on tax band, assume cigarettes
    if(/\bST\.?\b/i.test(up) && /€/.test(up)) return 'ZIGARETTEN';
    return null;
  }

  function parsePrice(text){
    const t = (text || '')
      .replace(/O/g,'0')
      .replace(/I/g,'1')
      .replace(/l/g,'1');

    // common formats: "10,- €" "10,-€" "9,50 €" "12.00€"
    // capture near euro symbol
    const euroNear = t.match(/(\d{1,2})(?:[\.,](\d{2}))?\s*(?:,-)?\s*€/) || t.match(/€\s*(\d{1,2})(?:[\.,](\d{2}))?/);
    if(euroNear){
      const a = euroNear[1];
      const b = euroNear[2];
      const val = b ? Number(`${a}.${b}`) : Number(a);
      if(Number.isFinite(val) && val > 0 && val < 100) return round2(val);
    }

    // fallback: "10,-" without euro visible
    const dash = t.match(/\b(\d{1,2})\s*,-\b/);
    if(dash){
      const val = Number(dash[1]);
      if(Number.isFinite(val) && val > 0 && val < 100) return round2(val);
    }

    return null;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Prefer native TextDetector (fast, no downloads). Otherwise use Tesseract.
  let textDetector = null;
  if('TextDetector' in window){
    try{ textDetector = new TextDetector(); }catch{ textDetector = null; }
  }

  let tesseractReady = false;
  let tess = null; // { worker }
  let tessLoading = false;

  async function loadTesseract(){
    if(tesseractReady || tessLoading) return;
    tessLoading = true;

    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    try{
      setStatus('OCR wird geladen… (Fallback)', 'warn');
      // jsdelivr is often less blocked than unpkg
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      if(!window.Tesseract) throw new Error('Tesseract not found after load');
      const worker = await window.Tesseract.createWorker('deu');
      tess = { worker };
      tesseractReady = true;
      setStatus('OCR bereit.', 'ok');
      showNote('OCR-Fallback (Tesseract) ist geladen. Beim ersten Start kann das kurz dauern, danach ist es schneller.');
      setTimeout(hideNote, 2200);
    }catch(err){
      showNote('OCR konnte nicht geladen werden (CDN blockiert/offline). Wenn du willst, kann ich dir eine Version bauen, die Tesseract komplett lokal mitliefert (größere ZIP).');
    }finally{
      tessLoading = false;
    }
  }

  // ----------------------------
  // OCR Loop (crop + detect)
  // ----------------------------
  let lastHitAt = 0;
  let lastResult = { cat:null, price:null, text:'' };

  function resetDetection(){
    lastResult = { cat:null, price:null, text:'' };
    catOut.textContent = '–';
    priceOut.textContent = '–';
    textOut.textContent = '–';
    btnAdd.disabled = true;
  }

  btnClear.addEventListener('click', resetDetection);

  function startOcrLoop(){
    resetDetection();
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(ocrTick);
  }

  function getCropRect(vw, vh){
    // Crop the center box area (approx like the guide)
    const w = vw * 0.78;
    const h = vh * 0.28;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2.35;
    return { x, y, w, h };
  }

  function drawCropToCanvas(){
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if(!vw || !vh) return null;

    const r = getCropRect(vw, vh);
    const scale = 1.5; // mild upscaling helps OCR
    canvas.width = Math.floor(r.w * scale);
    canvas.height = Math.floor(r.h * scale);

    const ctx = canvas.getContext('2d', { willReadFrequently:true });

    // Improve contrast a bit by drawing + simple threshold later
    ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);

    // simple preprocessing: grayscale + contrast
    const img = ctx.getImageData(0,0,canvas.width, canvas.height);
    const d = img.data;
    for(let i=0;i<d.length;i+=4){
      const r0=d[i], g0=d[i+1], b0=d[i+2];
      let y = (0.299*r0 + 0.587*g0 + 0.114*b0);
      // contrast stretch
      y = (y - 128) * 1.35 + 128;
      if(y < 0) y=0; if(y>255) y=255;
      d[i]=d[i+1]=d[i+2]=y;
      d[i+3]=255;
    }
    ctx.putImageData(img,0,0);

    return canvas;
  }

  async function detectTextNative(){
    if(!textDetector) return '';
    const cnv = drawCropToCanvas();
    if(!cnv) return '';
    try{
      const bitmap = await createImageBitmap(cnv);
      const res = await textDetector.detect(bitmap);
      bitmap.close?.();
      const text = (res || []).map(r => r.rawValue).join(' ');
      return normalizeText(text);
    }catch{
      return '';
    }
  }

  async function detectTextTesseract(){
    const cnv = drawCropToCanvas();
    if(!cnv) return '';
    if(!tesseractReady){
      await loadTesseract();
      if(!tesseractReady) return '';
    }
    try{
      const { data } = await tess.worker.recognize(cnv);
      return normalizeText(data?.text || '');
    }catch{
      return '';
    }
  }

  let ocrBusy = false;
  async function ocrTick(){
    if(!running){
      return;
    }

    // throttle: no more than ~3 fps OCR
    const now = performance.now();
    if(!ocrBusy){
      ocrBusy = true;
      try{
        let text = '';
        if(textDetector){
          text = await detectTextNative();
        }else{
          // Try to lazily load tesseract after camera is running
          text = await detectTextTesseract();
        }

        if(text){
          const cat = parseCategory(text);
          const price = parsePrice(text);

          // Update UI if something looks plausible
          if(cat || price){
            lastResult = { cat: cat || lastResult.cat, price: (price ?? lastResult.price), text };
            catOut.textContent = lastResult.cat || '–';
            priceOut.textContent = (lastResult.price != null) ? `${fmtEUR(lastResult.price)} €` : '–';
            textOut.textContent = text;
          }

          // Enable add if both are present
          const canAdd = !!lastResult.cat && (lastResult.price != null);
          btnAdd.disabled = !canAdd;

          // Auto-add with cooldown (optional): if stable for > 800ms
          if(canAdd){
            if(now - lastHitAt > 1200){
              // do nothing auto; user presses button. (safer)
              lastHitAt = now;
            }
          }
        }
      }finally{
        ocrBusy = false;
      }
    }

    rafId = requestAnimationFrame(ocrTick);
  }

  // ----------------------------
  // Add to package
  // ----------------------------
  function addCurrentResult(){
    const cat = lastResult.cat;
    const price = lastResult.price;
    if(!cat || price == null) return;

    const pkg = getActivePkg();
    const existing = pkg.items.find(it => it.cat === cat && it.price === price);
    if(existing) existing.qty += 1;
    else pkg.items.push({ cat, price, qty: 1 });

    saveState();
    render();
    ensureNewPkgIfNeeded();
    setStatus('Hinzugefügt ✅', 'ok');

    // small cooldown to avoid double adds
    btnAdd.disabled = true;
    setTimeout(()=>{ btnAdd.disabled = !lastResult.cat || lastResult.price==null; }, 650);
  }

  btnAdd.addEventListener('click', addCurrentResult);

  btnReset.addEventListener('click', ()=>{
    if(confirm('Wirklich alles zurücksetzen?')){
      state = { packages:[newPackage()], activeIndex:0 };
      saveState();
      render();
      resetDetection();
      setStatus('Zurückgesetzt.', '');
    }
  });

  btnExport.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retouren_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  btnCopy.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setStatus('Export in Zwischenablage kopiert.', 'ok');
    }catch{
      setStatus('Kopieren nicht möglich (Browser-Rechte).', 'warn');
    }
  });

  // ----------------------------
  // Render
  // ----------------------------
  function render(){
    pkgIndexEl.textContent = String(state.activeIndex + 1);
    pkgSumEl.textContent = fmtEUR(pkgSum(getActivePkg()));
    grandSumEl.textContent = fmtEUR(totalSum());

    const pkg = getActivePkg();
    if(!pkg.items.length){
      rowsEl.innerHTML = `<tr><td colspan="4" class="muted">Noch nichts hinzugefügt.</td></tr>`;
      return;
    }

    const sorted = [...pkg.items].sort((a,b) => (b.price*b.qty) - (a.price*a.qty));
    rowsEl.innerHTML = sorted.map(it => {
      const sum = round2(it.price * it.qty);
      return `<tr>
        <td>${escapeHtml(it.cat)}</td>
        <td class="right">${fmtEUR(it.price)} €</td>
        <td class="right">${it.qty}</td>
        <td class="right"><b>${fmtEUR(sum)} €</b></td>
      </tr>`;
    }).join('');
  }

  render();

  // Stop camera when page hidden (iOS)
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden && running){
      stopCamera();
    }
  });

})();
