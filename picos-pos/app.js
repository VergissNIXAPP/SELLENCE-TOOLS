/* Data generated from PICOS POS Rechner_2026.xlsx */
const DATA = {
  "MARKT": [
    {
      "category": "MARKT",
      "name": "Türsteller",
      "rate": 150.0
    },
    {
      "category": "MARKT",
      "name": "Distributionstool – S – 7 Böden (100%)",
      "rate": 400.0
    },
    {
      "category": "MARKT",
      "name": "Distributionstool – M – 5 Böden (70%)",
      "rate": 400.0
    },
    {
      "category": "MARKT",
      "name": "Distributionstool – 6 Böden (85%)",
      "rate": 500.0
    },
    {
      "category": "MARKT",
      "name": "Distributionstool – 7 Böden (100%)",
      "rate": 600.0
    },
    {
      "category": "MARKT",
      "name": "Distributionstool – LCD – nur bei Stromanschluss",
      "rate": 100.0
    }
  ],
  "KASSE": [
    {
      "category": "KASSE",
      "name": "SMT-Paket (SMT-84 Pappe; SMT-Streifen;SMT-Highlighter)",
      "rate": 120.0
    }
  ],
  "REGAL": [
    {
      "category": "REGAL",
      "name": "LCD Regal Highlighter inkl. Regalstreifen",
      "rate": 800.0
    },
    {
      "category": "REGAL",
      "name": "LCD Regal Display inkl. Regalstreifen",
      "rate": 1000.0
    }
  ],
  "THEKE": [
    {
      "category": "THEKE",
      "name": "LCD Thekendisplay",
      "rate": 500.0
    },
    {
      "category": "THEKE",
      "name": "Veev Thekendisplay",
      "rate": 150.0
    },
    {
      "category": "THEKE",
      "name": "Zahlteller",
      "rate": 50.0
    }
  ]
};

const stateKey = "sellence_picos_pos_state_v1";

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function clampInt(v, min, max) {
  v = Math.round(Number(v));
  if (!Number.isFinite(v)) v = min;
  return Math.max(min, Math.min(max, v));
}

function loadState() {
  try {
    const raw = localStorage.getItem(stateKey);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  } catch {
    return {};
  }
}

function saveState(s) {
  try {
    localStorage.setItem(stateKey, JSON.stringify(s));
  } catch {}
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => el.classList.remove("show"), 1800);
}

function makeId(cat, idx) {
  return `${cat}__${idx}`;
}

function computeTotals(model) {
  let total = 0;
  let count = 0;

  Object.keys(DATA).forEach(cat => {
    (DATA[cat] || []).forEach((it, idx) => {
      const id = makeId(cat, idx);
      const entry = model[id];
      if (entry?.checked) {
        const qty = clampInt(entry.qty ?? 1, 1, 999);
        total += (Number(it.rate) || 0) * qty;
        count += 1;
      }
    });
  });

  return { total, count };
}

function filteredData(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return DATA;

  const out = {};
  for (const cat of Object.keys(DATA)) {
    const arr = DATA[cat].filter(it => {
      const hay = `${cat} ${it.name} ${it.rate}`.toLowerCase();
      return hay.includes(q);
    });
    if (arr.length) out[cat] = arr;
  }
  return out;
}

function renderList(root, model, query) {
  const d = filteredData(query);
  root.innerHTML = "";

  const cats = Object.keys(d);
  if (!cats.length) {
    const empty = document.createElement("div");
    empty.className = "group";
    empty.innerHTML = `
      <div class="groupHeader" style="cursor:default">
        <div class="groupTitle">Keine Treffer</div>
        <div class="groupCount">0</div>
        <div class="chev" aria-hidden="true">›</div>
      </div>
      <div class="groupBody">
        <div style="padding:14px 10px; color:rgba(255,255,255,.70);">
          Keine Produkte gefunden. Suchbegriff ändern.
        </div>
      </div>`;
    root.appendChild(empty);
    return;
  }

  for (const cat of cats) {
    const group = document.createElement("section");
    group.className = "group";
    group.dataset.open = "true";

    const header = document.createElement("div");
    header.className = "groupHeader";
    header.innerHTML = `
      <div class="groupTitle">${cat}</div>
      <div class="groupCount">${d[cat].length} Positionen</div>
      <div class="chev" aria-hidden="true">›</div>
    `;
    header.addEventListener("click", () => {
      group.dataset.open = (group.dataset.open === "true") ? "false" : "true";
    });

    const body = document.createElement("div");
    body.className = "groupBody";

    d[cat].forEach((it, idx) => {
      // map idx back to original index (important when filtered)
      const origIdx = DATA[cat].indexOf(it);
      const id = makeId(cat, origIdx);

      const checked = !!model[id]?.checked;
      const qty = clampInt(model[id]?.qty ?? 1, 1, 999);

      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <label class="chk" title="Auswählen">
          <input type="checkbox" ${checked ? "checked" : ""} data-id="${id}" />
          <span class="mark" aria-hidden="true"></span>
        </label>

        <div class="itemMain">
          <div class="itemName">${it.name}</div>
          <div class="itemMeta">
            <span class="badge">€ p.a.: <strong>${eur(it.rate)}</strong></span>
          </div>
        </div>

        <div class="itemRight">
          <div class="money" data-sub="${id}">${checked ? eur((Number(it.rate)||0)*qty) : eur(0)}</div>
          <div class="qtyRow">
            <button class="qtyBtn" type="button" data-dec="${id}" ${checked ? "" : "disabled"}>-</button>
            <input class="qty" inputmode="numeric" pattern="[0-9]*" type="number" min="1" max="999"
              value="${qty}" data-qty="${id}" ${checked ? "" : "disabled"} />
            <button class="qtyBtn" type="button" data-inc="${id}" ${checked ? "" : "disabled"}>+</button>
          </div>
          <div class="submoney">${checked ? "Summe" : "nicht gewählt"}</div>
        </div>
      `;

      body.appendChild(item);
    });

    group.appendChild(header);
    group.appendChild(body);
    root.appendChild(group);
  }
}

function wireEvents(model) {
  const root = document.getElementById("listRoot");

  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t && t.matches('input[type="checkbox"][data-id]')) {
      const id = t.dataset.id;
      model[id] = model[id] || {};
      model[id].checked = t.checked;
      if (model[id].qty == null) model[id].qty = 1;
      saveState(model);
      updateUI(model);
    }
  });

  root.addEventListener("click", (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLElement)) return;

    const dec = btn.getAttribute("data-dec");
    const inc = btn.getAttribute("data-inc");

    if (dec || inc) {
      const id = dec || inc;
      model[id] = model[id] || {};
      const cur = clampInt(model[id].qty ?? 1, 1, 999);
      const next = clampInt(cur + (inc ? 1 : -1), 1, 999);
      model[id].qty = next;
      saveState(model);
      updateUI(model, true);
    }
  });

  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t && t.matches('input[type="number"][data-qty]')) {
      const id = t.dataset.qty;
      model[id] = model[id] || {};
      model[id].qty = clampInt(t.value, 1, 999);
      saveState(model);
      updateUI(model, true);
    }
  });
}

function updateUI(model, silent=false) {
  // update totals
  const totals = computeTotals(model);
  const totalStr = eur(totals.total);

  const gt1 = document.getElementById("grandTotal");
  const gt2 = document.getElementById("grandTotal2");
  if (gt1) gt1.textContent = totalStr;
  if (gt2) gt2.textContent = totalStr;

  const meta = document.getElementById("summaryMeta");
  if (meta) {
    meta.innerHTML = `
      <span class="pill">${totals.count} Positionen</span>
      <span class="pill">${totalStr}</span>
    `;
  }

  // update per item rows without full rerender
  Object.keys(DATA).forEach(cat => {
    DATA[cat].forEach((it, idx) => {
      const id = makeId(cat, idx);
      const entry = model[id];
      const checked = !!entry?.checked;
      const qty = clampInt(entry?.qty ?? 1, 1, 999);

      const subEl = document.querySelector(`[data-sub="${id}"]`);
      if (subEl) subEl.textContent = checked ? eur((Number(it.rate)||0)*qty) : eur(0);

      const qtyEl = document.querySelector(`[data-qty="${id}"]`);
      if (qtyEl) {
        qtyEl.disabled = !checked;
        if (String(qtyEl.value) !== String(qty)) qtyEl.value = qty;
      }

      const decBtn = document.querySelector(`[data-dec="${id}"]`);
      const incBtn = document.querySelector(`[data-inc="${id}"]`);
      if (decBtn) decBtn.toggleAttribute("disabled", !checked || qty <= 1);
      if (incBtn) incBtn.toggleAttribute("disabled", !checked);

      // update row checkbox state (if rerender happened)
      const cb = document.querySelector(`input[type="checkbox"][data-id="${id}"]`);
      if (cb && cb.checked !== checked) cb.checked = checked;
    });
  });

  if (!silent) {
    // small hint when user changes
  }
}

function buildCSV(model) {
  const lines = [];
  lines.push(["Bereich","Produkt","€ p.a./POSM","Menge","Summe"].join(";"));

  Object.keys(DATA).forEach(cat => {
    DATA[cat].forEach((it, idx) => {
      const id = makeId(cat, idx);
      const entry = model[id];
      if (!entry?.checked) return;
      const qty = clampInt(entry.qty ?? 1, 1, 999);
      const sum = (Number(it.rate)||0) * qty;

      lines.push([
        cat,
        it.name.replaceAll(";", ","),
        String(Number(it.rate)||0).replace(".", ","),
        String(qty),
        String(sum).replace(".", ",")
      ].join(";"));
    });
  });

  const totals = computeTotals(model);
  lines.push("");
  lines.push(["","GESAMT","","", String(totals.total).replace(".", ",")].join(";"));
  return lines.join("\n");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resetAll(model) {
  for (const k of Object.keys(model)) delete model[k];
  saveState(model);
}

(function init() {
  const model = loadState();

  const root = document.getElementById("listRoot");
  const search = document.getElementById("searchInput");
  const resetBtn = document.getElementById("resetBtn");
  const exportBtn = document.getElementById("exportBtn");

  const rerender = () => {
    renderList(root, model, search?.value || "");
    updateUI(model, true);
  };

  rerender();
  wireEvents(model);

  search?.addEventListener("input", () => {
    rerender();
    toast("Filter angewendet");
  });

  resetBtn?.addEventListener("click", () => {
    resetAll(model);
    rerender();
    toast("Zurückgesetzt");
  });

  exportBtn?.addEventListener("click", () => {
    const csv = buildCSV(model);
    download("SELLENCE-PICOS-POS-Auswahl.csv", csv);
    toast("CSV wurde exportiert");
  });

  // ensure totals on load
  updateUI(model, true);
})();
