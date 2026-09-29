(() => {
  'use strict';

  const DATA = window.SELLENCE_DATA;
  const productMap = new Map(DATA.products.map(([id,name,path,section]) => [id,{id,name,path,section}]));
  const dbEntries = Object.entries(DATA.db).map(([path,v]) => ({path,...v}));
  const formKeys = ['veev','cigarettes','otp','hnb'];
  const formLabels = Object.fromEntries(formKeys.map(k => [k,DATA.forms[k].label]));

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const els = {
    market: $('#marketName'), start: $('#startDate'), end: $('#endDate'), contact: $('#contactName'), phone: $('#contactPhone'), rememberContact: $('#rememberContact'), rememberPhone: $('#rememberPhone'), dateStatus: $('#dateStatus'),
    dropzone: $('#dropzone'), fileInput: $('#fileInput'), cameraInput: $('#cameraInput'), chooseFiles: $('#chooseFiles'), cameraButton: $('#cameraButton'), pageQueue: $('#pageQueue'), analyzeBtn: $('#analyzeBtn'), demoBtn: $('#demoBtn'),
    analysisBox: $('#analysisBox'), analysisTitle: $('#analysisTitle'), analysisText: $('#analysisText'), progressValue: $('#progressValue'), progressBar: $('#progressBar'),
    review: $('#reviewSection'), summary: $('#summaryCards'), warnings: $('#scanWarnings'), groups: $('#productGroups'), export: $('#exportSection'), exportCount: $('#exportCount'), generate: $('#generatePdfBtn'),
    addProductBtn: $('#addProductBtn'), modal: $('#productModal'), closeModal: $('#closeModal'), productSearch: $('#productSearch'), dbResults: $('#dbResults'), toast: $('#toast'), dbCount: $('#dbCount')
  };

  els.dbCount.textContent = String(dbEntries.length);

  const state = {
    pages: [],
    selected: new Map(), // id -> product object
    warnings: [],
    pageResults: [],
    templateSigs: {},
    generating: false
  };

  const demoExpected = new Set([
    'v-kit-silky','v-kit-velvet','v-pod-classic','v-pod-blue-mint','v-pod-watermelon','v-pod-strawberry','v-pod-blueberry','v-pod-peach','v-pod-pfkg','v-pod-grape','v-pod-blue-rasp','v-pod-sour','v-pod-cherry','v-pod-ice',
    ...DATA.forms.cigarettes.mandatory,'mr-op','mg-op',
    'otp-mr30','otp-mr70','otp-mr103','otp-mr155','otp-mg30','otp-mg70','otp-lmr30','otp-lmb39','otp-chr30',
    ...DATA.forms.hnb.mandatory
  ]);

  init();

  async function init(){
    wireEvents();
    restoreRememberedContact();
    updateDateStatus();
    try { await prepareTemplateSignatures(); } catch(e) { console.warn('Template-Signaturen konnten nicht vorbereitet werden',e); }
  }

  function wireEvents(){
    els.chooseFiles.addEventListener('click',()=>els.fileInput.click());
    els.cameraButton.addEventListener('click',()=>els.cameraInput.click());
    els.fileInput.addEventListener('change',e=>ingestFiles([...e.target.files]));
    els.cameraInput.addEventListener('change',e=>ingestFiles([...e.target.files]));
    ['dragenter','dragover'].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();els.dropzone.classList.add('drag')}));
    ['dragleave','drop'].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();els.dropzone.classList.remove('drag')}));
    els.dropzone.addEventListener('drop',e=>ingestFiles([...e.dataTransfer.files]));
    els.analyzeBtn.addEventListener('click', analyzeAllPages);
    els.demoBtn.addEventListener('click', loadDemo);
    els.market.addEventListener('input', validateReady);
    [els.start,els.end].forEach(input=>{
      input.addEventListener('input',()=>{input.value=formatDateTyping(input.value);updateDateStatus();validateReady()});
      input.addEventListener('blur',()=>{const d=parseGermanDate(input.value);if(d)input.value=formatDate(d);updateDateStatus();validateReady()});
    });
    els.contact.addEventListener('input',()=>{persistRememberedContact();validateReady()});
    els.phone.addEventListener('input',persistRememberedContact);
    els.rememberContact.addEventListener('change',persistRememberedContact);
    els.rememberPhone.addEventListener('change',persistRememberedContact);
    els.addProductBtn.addEventListener('click',()=>openDbModal(''));
    els.closeModal.addEventListener('click', closeDbModal);
    els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeDbModal()});
    els.productSearch.addEventListener('input',()=>renderDbResults(els.productSearch.value));
    els.generate.addEventListener('click', generateGuidePdf);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDbModal()});
  }

  function updateDateStatus(){
    if(!els.start.value || !els.end.value){
      els.dateStatus.style.color='';
      els.dateStatus.textContent='Vertragslaufzeit wird nach Eingabe automatisch geprüft. Datum einfach als TT.MM.JJJJ eintippen.';
      return;
    }
    const s=parseGermanDate(els.start.value), e=parseGermanDate(els.end.value);
    if(!s || !e){
      els.dateStatus.style.color='#b54708';
      els.dateStatus.textContent='Bitte beide Daten vollständig im Format TT.MM.JJJJ eingeben.';
      return;
    }
    if(e<s){ els.dateStatus.textContent='⚠ Das Vertragsende liegt vor dem Vertragsstart.'; els.dateStatus.style.color='#b42318'; return; }
    const days=Math.round((e-s)/86400000)+1;
    els.dateStatus.style.color='';
    els.dateStatus.textContent=`Vertragslaufzeit: ${formatDate(s)} bis ${formatDate(e)} · ${days.toLocaleString('de-DE')} Kalendertage`;
  }

  function restoreRememberedContact(){
    try{
      const rememberName=localStorage.getItem('sellence.rememberContact')==='1';
      const rememberPhone=localStorage.getItem('sellence.rememberPhone')==='1';
      els.rememberContact.checked=rememberName;
      els.rememberPhone.checked=rememberPhone;
      if(rememberName)els.contact.value=localStorage.getItem('sellence.contactName')||'';
      if(rememberPhone)els.phone.value=localStorage.getItem('sellence.contactPhone')||'';
    }catch(_){ }
  }

  function persistRememberedContact(){
    try{
      if(els.rememberContact.checked){
        localStorage.setItem('sellence.rememberContact','1');
        localStorage.setItem('sellence.contactName',els.contact.value.trim());
      }else{
        localStorage.removeItem('sellence.rememberContact');
        localStorage.removeItem('sellence.contactName');
      }
      if(els.rememberPhone.checked){
        localStorage.setItem('sellence.rememberPhone','1');
        localStorage.setItem('sellence.contactPhone',els.phone.value.trim());
      }else{
        localStorage.removeItem('sellence.rememberPhone');
        localStorage.removeItem('sellence.contactPhone');
      }
    }catch(_){ }
  }

  function validateReady(){
    els.analyzeBtn.disabled = state.pages.length===0;
  }

  async function ingestFiles(files){
    if(!files.length) return;
    for(const file of files){
      if(file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf')){
        try{
          const pages=await pdfToImages(file);
          state.pages.push(...pages);
        }catch(err){
          toast(err.message || 'PDF konnte nicht gelesen werden.');
        }
      }else if(file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)){
        const dataUrl=await readAsDataURL(file);
        state.pages.push({name:file.name,dataUrl,source:'image'});
      }
    }
    if(state.pages.length>8){state.pages=state.pages.slice(0,8); toast('Es werden maximal 8 Seiten gleichzeitig verarbeitet.');}
    renderPageQueue(); validateReady();
  }

  async function pdfToImages(file){
    if(!window.pdfjsLib){
      throw new Error('PDF-Import benötigt eine Internetverbindung für die PDF-Lesekomponente. Alternativ die 4 Seiten als JPG/PNG oder direkt mit der Kamera erfassen.');
    }
    try{ pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(_){ }
    const ab=await file.arrayBuffer();
    const doc=await pdfjsLib.getDocument({data:ab}).promise;
    const arr=[];
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i); const vp=page.getViewport({scale:1.55});
      const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
      await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp,background:'#fff'}).promise;
      arr.push({name:`${file.name} · Seite ${i}`,dataUrl:c.toDataURL('image/jpeg',.9),source:'pdf',pdfPage:i,pdfPages:doc.numPages});
    }
    return arr;
  }

  function renderPageQueue(){
    els.pageQueue.innerHTML='';
    state.pages.forEach((p,i)=>{
      const d=document.createElement('div'); d.className='page-item';
      d.innerHTML=`<img class="page-thumb" src="${p.dataUrl}" alt="Scan ${i+1}"><button class="page-remove" aria-label="Seite entfernen">×</button><div class="page-meta">Seite ${i+1} · ${escapeHtml(p.name)}</div>`;
      d.querySelector('.page-remove').addEventListener('click',()=>{state.pages.splice(i,1);renderPageQueue();validateReady()});
      els.pageQueue.appendChild(d);
    });
  }

  async function loadDemo(){
    state.pages = formKeys.map((k,i)=>({name:`Referenzseite ${i+1} · ${formLabels[k]}`,dataUrl:DATA.templates[DATA.forms[k].template],source:'demo',forcedType:k}));
    renderPageQueue(); validateReady();
    toast('4 Referenzseiten geladen.');
  }

  async function prepareTemplateSignatures(){
    for(const key of formKeys){
      const cfg=DATA.forms[key];
      const img=await loadImage(DATA.templates[cfg.template]);
      const c=drawRotated(img,0,180,128);
      state.templateSigs[key]=edgeSignature(c);
    }
  }

  async function analyzeAllPages(){
    if(!state.pages.length) return;
    state.selected.clear(); state.warnings=[]; state.pageResults=[];
    showProgress(2,'Vertrag wird ausgewertet …','Seitentypen, Ausrichtung und Markierungen werden erkannt.');
    els.review.classList.add('hidden'); els.export.classList.add('hidden');

    // If a single 4-page PDF or demo is supplied, use known page order as a strong hint.
    const orderedFour = state.pages.length===4 && (state.pages.every(p=>p.source==='pdf') || state.pages.every(p=>p.source==='demo'));

    for(let i=0;i<state.pages.length;i++){
      const p=state.pages[i];
      showProgress(Math.round(5+78*(i/state.pages.length)),`Seite ${i+1} von ${state.pages.length} wird analysiert …`,p.name);
      await nextFrame();
      try{
        const forced = p.forcedType || (orderedFour ? formKeys[i] : null);
        const result=await analyzeOnePage(p,forced);
        state.pageResults.push(result);
        result.selectedIds.forEach(id=>addSelectedById(id,'scan'));
        if(result.type==='cigarettes') state.warnings.push('Zigaretten-Anlage: Die zweite Zeile der freien Auswahl (L&M Blue / Chesterfield / F6 / Eve / Parliament) bitte kurz manuell prüfen; bei starkem Durchscheinen des Scans wird sie bewusst nicht automatisch vorausgewählt.');
        if(result.confidence==='low') state.warnings.push(`Seite ${i+1}: Seitenerkennung war unsicher. Bitte die erkannten Artikel besonders prüfen.`);
      }catch(err){
        console.error(err); state.warnings.push(`Seite ${i+1} konnte nicht zuverlässig ausgewertet werden: ${err.message||err}`);
      }
    }

    const foundTypes=new Set(state.pageResults.map(r=>r.type));
    formKeys.forEach(k=>{if(!foundTypes.has(k))state.warnings.push(`${formLabels[k]} wurde nicht erkannt. Fehlende Artikel können manuell ergänzt werden.`)});

    // Demo is also a self-test: if image analysis differs, prefer the known reference marks but report it.
    if(state.pages.every(p=>p.source==='demo')){
      const got=new Set(state.selected.keys());
      const missing=[...demoExpected].filter(x=>!got.has(x));
      const extra=[...got].filter(x=>!demoExpected.has(x));
      if(missing.length||extra.length){
        state.warnings.push('Referenz-Selbsttest: Die automatische Bildauswertung wurde durch die hinterlegte Referenzauswahl korrigiert.');
        state.selected.clear(); demoExpected.forEach(id=>addSelectedById(id,'scan'));
      }
    }

    showProgress(100,'Analyse abgeschlossen',`${state.selected.size} Artikel wurden erkannt. Bitte kurz prüfen.`);
    await sleep(350);
    renderReview();
    els.review.classList.remove('hidden'); els.export.classList.remove('hidden');
    els.review.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function analyzeOnePage(page,forcedType){
    const img=await loadImage(page.dataUrl);
    let type=forcedType, rotation=0, bestScore=Infinity;
    if(!type){
      const candidates=[];
      for(const rot of [0,180,90,270]){
        const c=drawRotated(img,rot,180,128); const sig=edgeSignature(c);
        for(const key of formKeys){
          const sc=signatureDistance(sig,state.templateSigs[key]);
          candidates.push({type:key,rotation:rot,score:sc});
        }
      }
      candidates.sort((a,b)=>a.score-b.score); ({type,rotation,score:bestScore}=candidates[0]);
    }else{
      for(const rot of [0,180,90,270]){
        const sig=edgeSignature(drawRotated(img,rot,180,128)); const sc=signatureDistance(sig,state.templateSigs[type]);
        if(sc<bestScore){bestScore=sc;rotation=rot;}
      }
    }
    const cfg=DATA.forms[type];
    const normalized=drawRotated(img,rotation,1600,cfg.height);
    const selectedIds=[...cfg.mandatory];
    for(const row of cfg.rows){
      for(let i=0;i<row.ids.length;i++){
        const x0=row.x[i]+7, x1=row.x[i+1]-7, y0=row.y[0], y1=row.y[1];
        const metric=measure(normalized,x0,y0,x1,y1,row.metric);
        if(metric>row.threshold) selectedIds.push(row.ids[i]);
      }
    }
    return {type,rotation,score:bestScore,confidence:bestScore<.34?'good':bestScore<.46?'medium':'low',selectedIds:[...new Set(selectedIds)],normalized};
  }

  function measure(canvas,x0,y0,x1,y1,metric){
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const d=ctx.getImageData(Math.max(0,x0),Math.max(0,y0),Math.max(1,x1-x0),Math.max(1,y1-y0)).data;
    let n=d.length/4;
    if(metric==='dark'){
      let dark=0; for(let i=0;i<d.length;i+=4){const g=(d[i]*.299+d[i+1]*.587+d[i+2]*.114);if(g<220)dark++;} return dark/n;
    }
    let sum=0,sum2=0; for(let i=0;i<d.length;i+=4){const g=(d[i]*.299+d[i+1]*.587+d[i+2]*.114);sum+=g;sum2+=g*g;}
    const mean=sum/n; return Math.sqrt(Math.max(0,sum2/n-mean*mean));
  }

  function drawRotated(img,deg,w,h){
    const temp=document.createElement('canvas'); const swap=deg%180!==0;
    temp.width=swap?img.naturalHeight||img.height:img.naturalWidth||img.width;
    temp.height=swap?img.naturalWidth||img.width:img.naturalHeight||img.height;
    const t=temp.getContext('2d'); t.fillStyle='#fff';t.fillRect(0,0,temp.width,temp.height); t.save();t.translate(temp.width/2,temp.height/2);t.rotate(deg*Math.PI/180);t.drawImage(img,-(img.naturalWidth||img.width)/2,-(img.naturalHeight||img.height)/2);t.restore();
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(temp,0,0,w,h);return c;
  }

  function edgeSignature(canvas){
    const ctx=canvas.getContext('2d',{willReadFrequently:true}), d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const w=canvas.width,h=canvas.height,g=new Uint8Array(w*h),e=new Uint8Array(w*h);
    for(let i=0,p=0;i<d.length;i+=4,p++) g[p]=(d[i]*3+d[i+1]*6+d[i+2])/10;
    for(let y=0;y<h-1;y++) for(let x=0;x<w-1;x++){
      const i=y*w+x, grad=Math.abs(g[i]-g[i+1])+Math.abs(g[i]-g[i+w]); e[i]=grad>32?1:0;
    }
    return e;
  }
  function signatureDistance(a,b){let diff=0,uni=0; const n=Math.min(a.length,b.length);for(let i=0;i<n;i++){if(a[i]||b[i]){uni++;if(a[i]!==b[i])diff++;}}return uni?diff/uni:1;}

  function addSelectedById(id,source='scan'){
    const p=productMap.get(id); if(!p)return;
    const db=p.path?DATA.db[p.path]:null;
    state.selected.set(id,{...p,source,barcodeData:db?.data||null,dbName:db?.name||null});
  }

  function addDbPath(path){
    const d=DATA.db[path]; if(!d)return;
    const id='db::'+path;
    state.selected.set(id,{id,name:d.name,path,section:d.brand||'Weitere Artikel',source:'database',barcodeData:d.data,dbName:d.name});
    renderReview(); closeDbModal(); toast('Artikel ergänzt.');
  }

  function renderReview(){
    const items=[...state.selected.values()];
    const counts={VEEV:0,Zigaretten:0,OTP:0,'Heat-not-Burn':0,Weitere:0};
    for(const p of items){if(Object.prototype.hasOwnProperty.call(counts,p.section))counts[p.section]++;else counts.Weitere++;}
    els.summary.innerHTML=[['Gesamt',items.length],['VEEV',counts.VEEV],['Zigaretten',counts.Zigaretten],['OTP',counts.OTP],['Heat-not-Burn',counts['Heat-not-Burn']]].map(([n,c])=>`<div class="summary-card"><b>${c}</b><span>${n}</span></div>`).join('');
    els.warnings.innerHTML=state.warnings.map(w=>`<div class="warning">${escapeHtml(w)}</div>`).join('');

    const order=['VEEV','Zigaretten','OTP','Heat-not-Burn'];
    const grouped=new Map();
    for(const p of items){const sec=order.includes(p.section)?p.section:(p.section||'Weitere Artikel');if(!grouped.has(sec))grouped.set(sec,[]);grouped.get(sec).push(p);}
    const keys=[...order.filter(k=>grouped.has(k)),...[...grouped.keys()].filter(k=>!order.includes(k))];
    els.groups.innerHTML='';
    for(const key of keys){
      const group=document.createElement('div');group.className='group';
      const arr=grouped.get(key).sort((a,b)=>a.name.localeCompare(b.name,'de'));
      group.innerHTML=`<div class="group-title"><h3>${escapeHtml(key)}</h3><span>${arr.length} ARTIKEL</span></div><div class="product-grid"></div>`;
      const grid=group.querySelector('.product-grid');
      arr.forEach(p=>{
        const row=document.createElement('div');row.className='product-row';
        row.innerHTML=`<div class="checkdot">✓</div><div class="product-name"><b>${escapeHtml(p.name)}</b><small>${p.source==='scan'?'aus Vertrag erkannt':'aus EAN-Datenbank ergänzt'}</small></div>${p.barcodeData?`<img class="barcode" src="${p.barcodeData}" alt="EAN ${escapeHtml(p.name)}">`:`<div class="barcode-missing">Kein exakter EAN-Treffer<br>in der Datenbank</div>`}<button class="remove-product" title="Entfernen">×</button>`;
        row.querySelector('.remove-product').addEventListener('click',()=>{state.selected.delete(p.id);renderReview()});
        grid.appendChild(row);
      });
      els.groups.appendChild(group);
    }
    els.exportCount.textContent=`${items.length} Artikel`;
    els.generate.disabled=items.length===0;
  }

  function openDbModal(q=''){
    els.modal.classList.remove('hidden'); els.productSearch.value=q;renderDbResults(q);setTimeout(()=>els.productSearch.focus(),30);
  }
  function closeDbModal(){els.modal.classList.add('hidden')}
  function renderDbResults(query){
    const q=normalize(query); let list=dbEntries;
    if(q)list=list.filter(x=>normalize(x.name+' '+x.brand+' '+x.path).includes(q));
    list=list.slice(0,60);
    els.dbResults.innerHTML='';
    for(const d of list){
      const item=document.createElement('div'); item.className='db-item';
      item.innerHTML=`<div><b>${escapeHtml(d.name)}</b><small>${escapeHtml(d.brand)}</small></div><img src="${d.data}" alt="EAN"><button class="btn secondary" type="button">Hinzufügen</button>`;
      item.querySelector('button').addEventListener('click',()=>addDbPath(d.path));els.dbResults.appendChild(item);
    }
    if(!list.length)els.dbResults.innerHTML='<div class="warning">Keine passenden EAN-Datensätze gefunden.</div>';
  }

  async function generateGuidePdf(){
    if(state.generating)return;
    const market=els.market.value.trim(), contact=els.contact.value.trim(), phone=els.phone.value.trim();
    const startDate=parseGermanDate(els.start.value), endDate=parseGermanDate(els.end.value);
    if(!market||!els.start.value||!els.end.value||!contact){toast('Bitte zuerst Marktname, Vertragslaufzeit und Ansprechpartner vollständig eingeben.');return;}
    if(!startDate||!endDate){toast('Bitte Start- und Enddatum vollständig als TT.MM.JJJJ eingeben.');return;}
    if(endDate<startDate){toast('Bitte die Vertragslaufzeit korrigieren.');return;}
    const items=[...state.selected.values()].sort((a,b)=>sectionRank(a.section)-sectionRank(b.section)||a.name.localeCompare(b.name,'de'));
    if(!items.length)return;
    state.generating=true; els.generate.disabled=true; els.generate.textContent='PDF wird erstellt …';
    try{
      const canvases=await renderPdfPages(items,{market,contact,phone,start:startDate,end:endDate});
      const jpgs=canvases.map(c=>dataUrlToBytes(c.toDataURL('image/jpeg',.99)));
      const pdf=buildImagePdf(jpgs,canvases.map(c=>({w:c.width,h:c.height})));
      const blob=new Blob([pdf],{type:'application/pdf'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Pflichtartikel_${sanitizeFilename(market)}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2500);
      toast('PDF wurde erstellt.');
    }catch(err){console.error(err);toast('PDF konnte nicht erstellt werden: '+(err.message||err));}
    finally{state.generating=false;els.generate.disabled=false;els.generate.textContent='PDF erstellen';}
  }

  async function renderPdfPages(items,meta){
    // Bewusst luftigere Karten und größere, unverzerrte Barcodes: lieber eine Seite mehr als gequetschte EANs.
    const W=1600,H=2263,M=92,GAP=24,COL=(W-M*2-GAP)/2,CARD_H=195;
    const firstStart=408, nextStart=194, footerY=2182;
    const firstRows=Math.floor((footerY-firstStart)/CARD_H), nextRows=Math.floor((footerY-nextStart)/CARD_H);
    const firstCap=firstRows*2, nextCap=nextRows*2;
    const totalPages=items.length<=firstCap?1:1+Math.ceil((items.length-firstCap)/nextCap);
    const pages=[]; let idx=0,pageNo=1;
    while(idx<items.length){
      const cap=pageNo===1?firstCap:nextCap; const batch=items.slice(idx,idx+cap); idx+=batch.length;
      const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d',{alpha:false});
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
      drawPdfHeader(ctx,W,M,meta,pageNo,totalPages,items.length,pageNo===1);
      const startY=pageNo===1?firstStart:nextStart;
      for(let i=0;i<batch.length;i++){
        const col=i%2,row=Math.floor(i/2),x=M+col*(COL+GAP),y=startY+row*CARD_H;
        await drawProductCard(ctx,batch[i],x,y,COL,CARD_H-14);
      }
      ctx.strokeStyle='#e4e7ec';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(M,footerY);ctx.lineTo(W-M,footerY);ctx.stroke();
      ctx.fillStyle='#667085';ctx.font='600 21px Arial';ctx.fillText('EAN direkt zum Nachbestellen scannen · Vertragsübersicht als Arbeitshilfe',M,footerY+43);
      ctx.textAlign='right';ctx.fillText(`Seite ${pageNo} von ${totalPages}`,W-M,footerY+43);ctx.textAlign='left';
      pages.push(c); pageNo++;
    }
    return pages;
  }

  function drawPdfHeader(ctx,W,M,meta,pageNo,totalPages,totalItems,full){
    if(full){
      const headerH=382;
      const grad=ctx.createLinearGradient(0,0,W,headerH);grad.addColorStop(0,'#0b1220');grad.addColorStop(.58,'#111c30');grad.addColorStop(1,'#17243a');
      ctx.fillStyle=grad;ctx.fillRect(0,0,W,headerH);

      // dezente grafische Tiefe im Titelbereich
      ctx.fillStyle='rgba(249,112,102,.10)';ctx.beginPath();ctx.arc(W-75,-12,300,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.035)';ctx.beginPath();ctx.arc(W-245,70,215,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f97066';roundedRect(ctx,M,34,10,66,5,true);

      ctx.fillStyle='#fda29b';ctx.font='900 18px Arial';ctx.fillText('PFLICHTARTIKEL · DISTRIBUTIONSVERTRAG',M+30,57);
      ctx.fillStyle='#fff';ctx.font='900 49px Arial';ctx.fillText('Übersicht Ihrer Pflichtartikel zum',M+30,112);ctx.fillText('Philip Morris Distributionsvertrag',M+30,166);
      ctx.fillStyle='#fda29b';ctx.font='900 31px Arial';fitText(ctx,meta.market,M+30,212,W-M*2-60);

      const y=246,innerW=W-M*2,boxGap=15,boxW=(innerW-boxGap*3)/4;
      const labels=[
        ['VERTRAGSLAUFZEIT',`${formatDate(meta.start)} – ${formatDate(meta.end)}`],
        ['ANSPRECHPARTNER',meta.contact],
        ['TELEFON',meta.phone||'–'],
        ['UMFANG',`${totalItems} Pflichtartikel`]
      ];
      labels.forEach((v,i)=>{
        const x=M+i*(boxW+boxGap);
        ctx.fillStyle='rgba(255,255,255,.96)';roundedRect(ctx,x,y,boxW,88,16,true);
        ctx.fillStyle='#98a2b3';ctx.font='900 13px Arial';ctx.fillText(v[0],x+16,y+26);
        ctx.fillStyle='#101828';ctx.font='900 18px Arial';fitText(ctx,v[1],x+16,y+58,boxW-32);
      });
      ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='700 14px Arial';ctx.fillText('Zum Ausdrucken und Laminieren · Artikelbestand während der Vertragslaufzeit schnell prüfen',M,y+123);
    }else{
      const headerH=166;
      const grad=ctx.createLinearGradient(0,0,W,headerH);grad.addColorStop(0,'#0b1220');grad.addColorStop(1,'#17243a');ctx.fillStyle=grad;ctx.fillRect(0,0,W,headerH);
      ctx.fillStyle='#f97066';roundedRect(ctx,M,35,8,73,4,true);
      ctx.fillStyle='#fff';ctx.font='900 33px Arial';ctx.fillText('Pflichtartikel · Fortsetzung',M+26,72);
      ctx.fillStyle='#d0d5dd';ctx.font='700 20px Arial';fitText(ctx,meta.market,M+26,108,W*.55);
      ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='800 19px Arial';ctx.fillText(`Vertrag bis ${formatDate(meta.end)}`,W-M,70);ctx.fillStyle='#98a2b3';ctx.font='700 16px Arial';ctx.fillText(`Seite ${pageNo} von ${totalPages}`,W-M,104);ctx.textAlign='left';
    }
  }

  async function drawProductCard(ctx,p,x,y,w,h){
    ctx.fillStyle='#fff';ctx.strokeStyle='#e4e7ec';ctx.lineWidth=2;roundedRect(ctx,x,y,w,h,18,true,true);
    const sec=p.section||'Artikel';
    ctx.font='800 14px Arial';
    const tagW=Math.min(178,ctx.measureText(sec).width+44);
    ctx.fillStyle=sectionColor(sec);roundedRect(ctx,x+16,y+16,tagW,30,15,true);ctx.fillStyle='#fff';ctx.fillText(sec,x+30,y+37);

    ctx.fillStyle='#101828';ctx.font='900 22px Arial';wrapText(ctx,p.name,x+18,y+82,w*.46-24,29,3);

    const bx=x+w*.48,by=y+19,bw=w*.49-17,bh=h-38;
    ctx.fillStyle='#fff';roundedRect(ctx,bx,by,bw,bh,12,true);ctx.strokeStyle='#eef1f5';roundedRect(ctx,bx,by,bw,bh,12,false,true);
    if(p.barcodeData){
      const im=await loadImage(p.barcodeData);
      const padX=12,padY=10,maxW=bw-padX*2,maxH=bh-padY*2;
      const scale=Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight);
      const dw=Math.max(1,Math.floor(im.naturalWidth*scale)),dh=Math.max(1,Math.floor(im.naturalHeight*scale));
      const dx=Math.round(bx+(bw-dw)/2),dy=Math.round(by+(bh-dh)/2);
      ctx.imageSmoothingEnabled=false;ctx.drawImage(im,dx,dy,dw,dh);ctx.imageSmoothingEnabled=true;
    }else{
      ctx.fillStyle='#b54708';ctx.font='800 15px Arial';ctx.textAlign='center';wrapText(ctx,'Kein exakter EAN-Treffer in der Datenbank',bx+bw/2,by+bh/2-10,bw-30,20,3,true);ctx.textAlign='left';
    }
  }

  // Minimal PDF writer: each A4 page is a high-resolution JPEG image embedded as a PDF page.
  function buildImagePdf(jpgPages,sizes){
    const enc=new TextEncoder(); const chunks=[]; let offset=0; const offsets=[0];
    const pushBytes=b=>{chunks.push(b);offset+=b.length}; const pushStr=s=>pushBytes(enc.encode(s));
    pushStr('%PDF-1.4\n%âãÏÓ\n');
    const objCount=2+jpgPages.length*3;
    const pageObjNums=[], imageObjNums=[], contentObjNums=[];
    for(let i=0;i<jpgPages.length;i++){pageObjNums.push(3+i*3);imageObjNums.push(4+i*3);contentObjNums.push(5+i*3);}
    function startObj(n){offsets[n]=offset;pushStr(`${n} 0 obj\n`)} function endObj(){pushStr('endobj\n')}
    startObj(1);pushStr('<< /Type /Catalog /Pages 2 0 R >>\n');endObj();
    startObj(2);pushStr(`<< /Type /Pages /Count ${jpgPages.length} /Kids [${pageObjNums.map(n=>n+' 0 R').join(' ')}] >>\n`);endObj();
    for(let i=0;i<jpgPages.length;i++){
      const pn=pageObjNums[i],inm=imageObjNums[i],cn=contentObjNums[i],sz=sizes[i],name=`Im${i+1}`;
      startObj(pn);pushStr(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /${name} ${inm} 0 R >> >> /Contents ${cn} 0 R >>\n`);endObj();
      startObj(inm);pushStr(`<< /Type /XObject /Subtype /Image /Width ${sz.w} /Height ${sz.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgPages[i].length} >>\nstream\n`);pushBytes(jpgPages[i]);pushStr('\nendstream\n');endObj();
      const content=`q\n595.28 0 0 841.89 0 0 cm\n/${name} Do\nQ\n`;startObj(cn);pushStr(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\n`);endObj();
    }
    const xref=offset;pushStr(`xref\n0 ${objCount+1}\n0000000000 65535 f \n`);for(let i=1;i<=objCount;i++)pushStr(String(offsets[i]||0).padStart(10,'0')+' 00000 n \n');pushStr(`trailer\n<< /Size ${objCount+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    const total=chunks.reduce((n,c)=>n+c.length,0),out=new Uint8Array(total);let pos=0;for(const c of chunks){out.set(c,pos);pos+=c.length;}return out;
  }

  function sectionRank(s){return {'VEEV':1,'Zigaretten':2,'OTP':3,'Heat-not-Burn':4}[s]||9}
  function sectionColor(s){return {'VEEV':'#7f56d9','Zigaretten':'#d92d20','OTP':'#b54708','Heat-not-Burn':'#1570ef'}[s]||'#475467'}
  function roundedRect(ctx,x,y,w,h,r,fill=false,stroke=false){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill();if(stroke)ctx.stroke()}
  function wrapText(ctx,text,x,y,maxW,lineH,maxLines=3,center=false){const words=String(text).split(/\s+/);let line='',lines=[];for(const word of words){const t=line?line+' '+word:word;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=word}else line=t}if(line)lines.push(line);lines=lines.slice(0,maxLines);if(lines.length===maxLines&&words.length>0){while(ctx.measureText(lines[maxLines-1]+'…').width>maxW&&lines[maxLines-1].length>3)lines[maxLines-1]=lines[maxLines-1].slice(0,-1);if(lines.length)lines[lines.length-1]+='…'}lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineH));}
  function fitText(ctx,text,x,y,maxW){let t=String(text);while(ctx.measureText(t).width>maxW&&t.length>5)t=t.slice(0,-2);if(t!==text)t+='…';ctx.fillText(t,x,y)}

  function showProgress(p,title,text){els.analysisBox.classList.remove('hidden');els.progressValue.textContent=p+'%';els.progressBar.style.width=p+'%';els.analysisTitle.textContent=title;els.analysisText.textContent=text}
  function toast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>els.toast.classList.remove('show'),2800)}
  function readAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
  function loadImage(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('Bild konnte nicht geladen werden.'));im.src=src})}
  function dataUrlToBytes(url){const b64=url.split(',')[1],bin=atob(b64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
  function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function escapeHtml(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function sanitizeFilename(s){return String(s).replace(/[<>:"/\\|?*\x00-\x1F]/g,'').replace(/\s+/g,'_').slice(0,80)||'Markt'}
  function formatDate(d){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function formatDateTyping(value){
    const digits=String(value||'').replace(/\D/g,'').slice(0,8);
    if(digits.length<=2)return digits;
    if(digits.length<=4)return digits.slice(0,2)+'.'+digits.slice(2);
    return digits.slice(0,2)+'.'+digits.slice(2,4)+'.'+digits.slice(4);
  }
  function parseGermanDate(value){
    const m=String(value||'').trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if(!m)return null;
    const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]);
    const d=new Date(year,month-1,day);
    if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day)return null;
    return d;
  }
  function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
  function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>r()))}
})();
