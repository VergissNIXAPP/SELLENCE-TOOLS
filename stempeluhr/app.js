
const STORAGE_KEY = 'sellence_stempeluhr_v1';
const NAME_KEY = 'sellence_stempeluhr_name_v1';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function pad2(n){ return String(n).padStart(2,'0'); }
function fmtTime(d){ return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function fmtDateKey(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function parseDateKey(key){
  const [y,m,da] = key.split('-').map(n=>parseInt(n,10));
  return new Date(y, m-1, da);
}
function dayLabel(key){
  const d = parseDateKey(key);
  return d.toLocaleDateString('de-DE', { weekday:'short', year:'numeric', month:'2-digit', day:'2-digit' });
}
function msToHM(ms){
  const sign = ms < 0 ? '-' : '';
  ms = Math.abs(ms);
  const totalMin = Math.round(ms/60000);
  const h = Math.floor(totalMin/60);
  const m = totalMin % 60;
  return `${sign}${h}:${pad2(m)}`;
}
function hmToMinutes(hm){
  const [h,m] = hm.split(':').map(Number);
  return (h*60)+m;
}

// data model:
// { days: { 'YYYY-MM-DD': { in: number|null, out: number|null } } }
function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { days:{} };
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== 'object') return { days:{} };
    if(!parsed.days) parsed.days = {};
    return parsed;
  } catch {
    return { days:{} };
  }
}
function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getEmployeeName(){
  return (localStorage.getItem(NAME_KEY) || '').trim();
}
function setEmployeeName(name){
  localStorage.setItem(NAME_KEY, name.trim());
}

// Rules
const BREAK_MIN = 30;         // fixed break
const DAILY_TARGET_MIN = 8*60; // net
const WEEK_TARGET_MIN = 5*DAILY_TARGET_MIN; // Mon-Fri

function calcNetMinutesForDay(day){
  if(!day?.in || !day?.out) return 0;
  const durMin = Math.max(0, Math.round((day.out - day.in) / 60000));
  const net = Math.max(0, durMin - BREAK_MIN);
  return net;
}

function getWeekStart(date){
  // Monday as first day
  const d = new Date(date);
  const day = (d.getDay()+6)%7; // Mon=0...Sun=6
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - day);
  return d;
}
function isThursday(date){
  return date.getDay() === 4; // Thu
}

function getRangeKeys(data, mode, from, to){
  const keys = Object.keys(data.days || {});
  keys.sort();
  const now = new Date();

  if(mode === 'week'){
    const ws = getWeekStart(now);
    const we = new Date(ws); we.setDate(we.getDate()+7);
    return keys.filter(k => {
      const d = parseDateKey(k);
      return d >= ws && d < we;
    });
  }
  if(mode === 'month'){
    const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
    const m1 = new Date(now.getFullYear(), now.getMonth()+1, 1);
    return keys.filter(k => {
      const d = parseDateKey(k);
      return d >= m0 && d < m1;
    });
  }
  if(mode === 'custom' && from && to){
    const f = new Date(from);
    const t = new Date(to);
    f.setHours(0,0,0,0);
    t.setHours(23,59,59,999);
    return keys.filter(k => {
      const d = parseDateKey(k);
      return d >= f && d <= t;
    });
  }
  return keys;
}

function render(){
  const data = loadData();

  // name
  const currentName = getEmployeeName();
  if($('#employeeName').value.trim() === '' && currentName) {
    $('#employeeName').value = currentName;
  }

  // totals
  const allKeys = Object.keys(data.days).sort();
  let totalMin = 0;
  for(const k of allKeys){
    totalMin += calcNetMinutesForDay(data.days[k]);
  }
  $('#totalHours').textContent = `${Math.floor(totalMin/60)}:${pad2(totalMin%60)}`;

  // week total
  const now = new Date();
  const ws = getWeekStart(now);
  const we = new Date(ws); we.setDate(we.getDate()+7);
  let weekMin = 0;
  for(const k of allKeys){
    const d = parseDateKey(k);
    if(d >= ws && d < we) weekMin += calcNetMinutesForDay(data.days[k]);
  }
  $('#weekHours').textContent = `${Math.floor(weekMin/60)}:${pad2(weekMin%60)}`;

  // hint (Thursday)
  const hintEl = $('#hintCard');
  hintEl.classList.add('hidden');
  if(isThursday(now)){
    const remainingMin = Math.max(0, WEEK_TARGET_MIN - weekMin);
    const remH = Math.floor(remainingMin/60);
    const remM = remainingMin % 60;
    hintEl.innerHTML = `Hey 😊 Du hast diese Woche <b>${Math.floor(weekMin/60)}:${pad2(weekMin%60)}</b> gearbeitet. `
      + `Am Freitag brauchst du nur <b>${remH}:${pad2(remM)}</b>, dann sind deine Stunden voll 😉`;
    hintEl.classList.remove('hidden');
  }

  // list render by selected range
  const mode = $$('input[name="range"]').find(r=>r.checked)?.value || 'week';
  const from = $('#fromDate').value;
  const to = $('#toDate').value;
  const keys = getRangeKeys(data, mode, from, to);

  const tbody = $('#rows');
  tbody.innerHTML = '';

  if(keys.length === 0){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan='6' class='empty'>Noch keine Einträge in diesem Zeitraum.</td>`;
    tbody.appendChild(tr);
  } else {
    for(const k of keys){
      const day = data.days[k];
      const inStr = day.in ? fmtTime(new Date(day.in)) : '—';
      const outStr = day.out ? fmtTime(new Date(day.out)) : '—';
      const netMin = calcNetMinutesForDay(day);
      const netStr = netMin ? `${Math.floor(netMin/60)}:${pad2(netMin%60)}` : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dayLabel(k)}</td>
        <td>${inStr}</td>
        <td>${outStr}</td>
        <td>${day.in && day.out ? `${BREAK_MIN} min` : '—'}</td>
        <td><b>${netStr}</b></td>
        <td class='right'>
          <button class='mini' data-action='edit' data-key='${k}' title='Bearbeiten'>✎</button>
          <button class='mini danger' data-action='del' data-key='${k}' title='Löschen'>🗑</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  // button states for today
  const todayKey = fmtDateKey(new Date());
  const today = data.days[todayKey] || {in:null,out:null};
  $('#inBtn').disabled = !!today.in && !today.out;
  $('#outBtn').disabled = !today.in || !!today.out;

  // persistent clock state (clean, no popups)
  const stateEl = document.getElementById('clockState');
  if(stateEl){
    stateEl.classList.remove('on','off');
    if(today.in && !today.out){
      const since = fmtTime(new Date(today.in));
      stateEl.textContent = `Eingestempelt (seit ${since})`;
      stateEl.classList.add('on');
    } else {
      stateEl.textContent = 'Nicht eingestempelt';
      stateEl.classList.add('off');
    }
  }
}

function setStatus(text){
  const el = $('#statusLine');
  el.textContent = text || '';
  if(text){
    el.classList.add('show');
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(()=>{ el.classList.remove('show'); el.textContent=''; }, 2500);
  } else {
    el.classList.remove('show');
  }
}

function stampIn(){
  const data = loadData();
  const key = fmtDateKey(new Date());
  if(!data.days[key]) data.days[key] = {in:null,out:null};
  if(data.days[key].in && !data.days[key].out){
    setStatus('Du bist bereits eingestempelt.');
    return;
  }
  data.days[key].in = Date.now();
  data.days[key].out = null;
  saveData(data);
  setStatus('Eingestempelt ✅');
  render();
}

function stampOut(){
  const data = loadData();
  const key = fmtDateKey(new Date());
  if(!data.days[key]?.in){
    setStatus('Du bist noch nicht eingestempelt.');
    return;
  }
  if(data.days[key].out){
    setStatus('Du bist bereits ausgestempelt.');
    return;
  }
  data.days[key].out = Date.now();
  saveData(data);
  setStatus('Ausgestempelt ✅');
  render();
}

function exportCSV(){
  const name = ($('#employeeName').value || '').trim();
  if(name) setEmployeeName(name);

  const data = loadData();
  const mode = $$('input[name="range"]').find(r=>r.checked)?.value || 'week';
  const from = $('#fromDate').value;
  const to = $('#toDate').value;
  const keys = getRangeKeys(data, mode, from, to);
  keys.sort();

  const employee = name || getEmployeeName() || '—';

  // Header rows
  const lines = [];
  lines.push(`Mitarbeiter:;${employee}`);
  lines.push('Datum;Arbeitsstart;Arbeitsende;Pause (min);Netto (h:mm)');

  for(const k of keys){
    const day = data.days[k];
    const start = day?.in ? fmtTime(new Date(day.in)) : '';
    const end = day?.out ? fmtTime(new Date(day.out)) : '';
    const netMin = calcNetMinutesForDay(day);
    const net = netMin ? `${Math.floor(netMin/60)}:${pad2(netMin%60)}` : '';
    const pause = (day?.in && day?.out) ? String(BREAK_MIN) : '';
    const d = parseDateKey(k);
    const dateStr = d.toLocaleDateString('de-DE');
    lines.push(`${dateStr};${start};${end};${pause};${net}`);
  }

  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date();
  const fileStamp = `${stamp.getFullYear()}-${pad2(stamp.getMonth()+1)}-${pad2(stamp.getDate())}_${pad2(stamp.getHours())}${pad2(stamp.getMinutes())}`;
  a.href = url;
  a.download = `SELLENCE_Stempeluhr_${employee.replace(/\s+/g,'_')}_${mode}_${fileStamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus('Export erstellt ✅');
}

function deleteDay(key){
  const data = loadData();
  delete data.days[key];
  saveData(data);
  setStatus('Eintrag gelöscht');
  render();
}

function editDay(key){
  const data = loadData();
  const day = data.days[key] || {in:null,out:null};
  const d = parseDateKey(key);
  const nice = d.toLocaleDateString('de-DE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const startDefault = day.in ? fmtTime(new Date(day.in)) : '';
  const endDefault = day.out ? fmtTime(new Date(day.out)) : '';

  const start = prompt(`Startzeit (${nice})`, startDefault);
  if(start === null) return;
  const end = prompt(`Endzeit (${nice})`, endDefault);
  if(end === null) return;

  const [sh,sm] = start.split(':').map(Number);
  const [eh,em] = end.split(':').map(Number);
  if([sh,sm,eh,em].some(n=>Number.isNaN(n))){
    setStatus('Ungültige Zeit');
    return;
  }
  const inTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0, 0).getTime();
  const outTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0, 0).getTime();

  data.days[key] = { in: inTs, out: outTs };
  saveData(data);
  setStatus('Eintrag aktualisiert ✅');
  render();
}

function setup(){
  // initial name (prefill example, but keep stored value if present)
  try{
    const stored = getEmployeeName();
    if(stored){ $('#employeeName').value = stored; }
    else if(!$('#employeeName').value.trim()) { $('#employeeName').value = 'Andre Schorn'; }
  }catch(e){}

  // name field persistence
  $('#employeeName').addEventListener('change', (e)=>{
    const name = (e.target.value || '').trim();
    if(name) setEmployeeName(name);
  });

  $('#inBtn').addEventListener('click', stampIn);
  $('#outBtn').addEventListener('click', stampOut);

  // Clean UI: show/hide overview (table + export)
  const overview = $('#overviewCard');
  const toggleOverview = $('#toggleOverview');
  const setOverview = (open)=>{
    if(!overview) return;
    overview.classList.toggle('hidden', !open);
    toggleOverview.classList.toggle('active', !!open);
    if(open){
      // keep it smooth on mobile
      setTimeout(()=>overview.scrollIntoView({behavior:'smooth', block:'start'}), 50);
    }
  };
  setOverview(false);
  toggleOverview.addEventListener('click', ()=>{
    const isOpen = !overview.classList.contains('hidden');
    setOverview(!isOpen);
  });
  $('#exportBtn').addEventListener('click', exportCSV);

  // range controls
  $$('input[name="range"]').forEach(r=>r.addEventListener('change', ()=>{
    const mode = $$('input[name="range"]').find(x=>x.checked)?.value;
    const custom = $('#customRange');
    if(mode === 'custom') custom.classList.remove('hidden');
    else custom.classList.add('hidden');
    render();
  }));
  $('#fromDate').addEventListener('change', render);
  $('#toDate').addEventListener('change', render);

  // table actions
  $('#rows').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action;
    const key = btn.dataset.key;
    if(action === 'del') deleteDay(key);
    if(action === 'edit') editDay(key);
  });

  // menu sheet
  const menu = $('#menuSheet');
  const closeBtn = $('#closeMenu');
  const openMenu = ()=>{
    // Use the native [hidden] attribute (more reliable than class toggles in iOS PWAs)
    menu.hidden = false;
    menu.setAttribute('aria-hidden','false');
    document.body.classList.add('noScroll');
  };
  const closeMenu = ()=>{
    menu.hidden = true;
    menu.setAttribute('aria-hidden','true');
    document.body.classList.remove('noScroll');
  };
  $('#menuBtn').addEventListener('click', openMenu);

  // iOS/PWA: make closing bulletproof
  ['click','pointerup','touchend'].forEach(evt=>{
    closeBtn.addEventListener(evt, (e)=>{ e.preventDefault(); closeMenu(); }, {passive:false});
  });
  ['click','pointerup','touchend'].forEach(evt=>{
    // Close when tapping the dark backdrop (not when interacting with the card)
    menu.addEventListener(evt, (e)=>{
      if(e.target === menu){
        e.preventDefault();
        closeMenu();
      }
    }, {passive:false});
  });

  // extra-safe close (Escape key)
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeMenu();
  });

  $('#clearBtn').addEventListener('click', ()=>{
    if(confirm('Wirklich alle Stempelzeiten auf diesem Gerät löschen?')){
      localStorage.removeItem(STORAGE_KEY);
      setStatus('Alle Daten gelöscht');
      closeMenu();
      render();
    }
  });

  // default custom range: last 14 days
  const now = new Date();
  const to = fmtDateKey(now);
  const fromD = new Date(now);
  fromD.setDate(fromD.getDate()-13);
  const fromKey = fmtDateKey(fromD);
  $('#fromDate').value = fromKey;
  $('#toDate').value = to;

  render();
}

document.addEventListener('DOMContentLoaded', setup);
