const STORAGE_KEY = "sellence_vr_state_v3_perspective";
const PHOTO_META_KEY = "sellence_vr_photo_meta_v3_perspective";

const MODULES = [
  {
    id: "tuersteller",
    name: "Türsteller",
    category: "MARKT",
    placement: "Eingangsbereich",
    dimensions: "42 × 42 × 130 cm",
    stageAsset: "assets/catalog/tuersteller.png?v=20260411hq",
    thumb: "assets/catalog/tuersteller_thumb.png?v=20260411hq",
    defaultWidth: 0.16,
    rateType: "fixed",
    rate: 150,
    rateLabel: "PICOS POS Rechner",
  },
  {
    id: "veev_raumtool",
    name: "VEEV Raumtool",
    category: "MARKT",
    placement: "Innenraum",
    dimensions: "42 × 50 × 185 cm",
    stageAsset: "assets/catalog/veev_raumtool.png?v=20260411hq",
    thumb: "assets/catalog/veev_raumtool_thumb.png?v=20260411hq",
    defaultWidth: 0.17,
    rateType: "options",
    rateOptions: [
      { value: "s", label: "Distributionstool S – 7 Böden", rate: 400 },
      { value: "m", label: "Distributionstool M – 5 Böden", rate: 400 },
      { value: "6", label: "Distributionstool – 6 Böden", rate: 500 },
      { value: "7", label: "Distributionstool – 7 Böden", rate: 600 },
    ],
    extraOption: { key: "lcdAddon", label: "LCD-Topper zusätzlich", rate: 100 },
    rateLabel: "PICOS POS Rechner",
  },
  {
    id: "smt",
    name: "SMT",
    category: "KASSE",
    placement: "Smokythek",
    dimensions: "verschieden",
    stageAsset: "assets/catalog/smt.png?v=20260411hq",
    thumb: "assets/catalog/smt_thumb.png?v=20260411hq",
    defaultWidth: 0.14,
    rateType: "fixed",
    rate: 120,
    rateLabel: "SMT-Paket",
  },
  {
    id: "zahlteller",
    name: "Zahlteller",
    category: "THEKE",
    placement: "Kassentheke",
    dimensions: "32 × 20 × 3 cm",
    stageAsset: "assets/catalog/zahlteller.png?v=20260411hq",
    thumb: "assets/catalog/zahlteller_thumb.png?v=20260411hq",
    defaultWidth: 0.12,
    rateType: "fixed",
    rate: 50,
    rateLabel: "PICOS POS Rechner",
  },
  {
    id: "lcd_theke",
    name: "LCD Thekendisplay",
    category: "THEKE",
    placement: "Kassentheke",
    dimensions: "27 × 52 cm",
    stageAsset: "assets/catalog/lcd_theke.png?v=20260411hq",
    thumb: "assets/catalog/lcd_theke_thumb.png?v=20260411hq",
    defaultWidth: 0.14,
    rateType: "fixed",
    rate: 500,
    rateLabel: "PICOS POS Rechner",
  },
  {
    id: "veev_theke",
    name: "VEEV Thekentool",
    category: "THEKE",
    placement: "Auf der Theke",
    dimensions: "32,5 × 20 × 53 cm",
    stageAsset: "assets/catalog/veev_theke.png?v=20260411hq",
    thumb: "assets/catalog/veev_theke_thumb.png?v=20260411hq",
    defaultWidth: 0.14,
    rateType: "fixed",
    rate: 150,
    rateLabel: "VEEV Thekendisplay",
  },
  {
    id: "veev_grabgo",
    name: "VEEV Grab & Go Display",
    category: "THEKE",
    placement: "Auf der Theke",
    dimensions: "28 × 18,7 × 23,3–35,6 cm",
    stageAsset: "assets/catalog/veev_grabgo.png?v=20260411hq",
    thumb: "assets/catalog/veev_grabgo_thumb.png?v=20260411hq",
    defaultWidth: 0.14,
    rateType: "manualDefault",
    rate: 0,
    warning: "Im importierten PICOS POS Rechner wurde keine direkte Provision für Grab & Go gefunden. Du kannst hier manuell einen Wert eintragen.",
    rateLabel: "manuell",
  },
  {
    id: "lcd_regal",
    name: "LCD Regaldisplay",
    category: "REGAL",
    placement: "Im Tabakregal",
    dimensions: "72,7 × 42,5 × 6,5 cm",
    stageAsset: "assets/catalog/lcd_regal.png?v=20260411hq",
    thumb: "assets/catalog/lcd_regal_thumb.png?v=20260411hq",
    defaultWidth: 0.2,
    rateType: "fixed",
    rate: 1000,
    rateLabel: "inkl. Regalstreifen",
  },
  {
    id: "lcd_regal_highlighter",
    name: "LCD Regal Highlighter",
    category: "REGAL",
    placement: "Im Tabakregal",
    dimensions: "70,8 × 25,1 × 7 cm",
    stageAsset: "assets/catalog/lcd_regal_highlighter.png?v=20260411hq",
    thumb: "assets/catalog/lcd_regal_highlighter_thumb.png?v=20260411hq",
    defaultWidth: 0.22,
    rateType: "fixed",
    rate: 800,
    rateLabel: "inkl. Regalstreifen",
  },
];

const moduleMap = new Map(MODULES.map((module) => [module.id, module]));
const assetSizeMap = new Map();

const state = {
  overlays: [],
  selectedId: null,
  search: "",
  showGrid: false,
  photo: null,
  photoName: "",
  photoAspect: 16 / 9,
};

const dom = {};

let dragState = null;
let toastTimer = null;

function init() {
  cacheDom();
  bindEvents();
  preloadAssetSizes();
  restoreState();
  render();
  registerServiceWorker();
}

function cacheDom() {
  dom.photoInput = document.getElementById("photoInput");
  dom.projectInput = document.getElementById("projectInput");
  dom.catalogSearch = document.getElementById("catalogSearch");
  dom.catalogList = document.getElementById("catalogList");
  dom.stage = document.getElementById("stage");
  dom.stageSizer = document.getElementById("stageSizer");
  dom.stagePlaceholder = document.getElementById("stagePlaceholder");
  dom.photoLayer = document.getElementById("photoLayer");
  dom.gridLayer = document.getElementById("gridLayer");
  dom.overlayLayer = document.getElementById("overlayLayer");
  dom.grandTotal = document.getElementById("grandTotal");
  dom.summaryMeta = document.getElementById("summaryMeta");
  dom.selectedTag = document.getElementById("selectedTag");
  dom.inspector = document.getElementById("inspector");
  dom.summaryLines = document.getElementById("summaryLines");
  dom.lineCountTag = document.getElementById("lineCountTag");
  dom.toast = document.getElementById("toast");
  dom.toggleGridBtn = document.getElementById("toggleGridBtn");
  dom.centerSelectedBtn = document.getElementById("centerSelectedBtn");
  dom.duplicateBtn = document.getElementById("duplicateBtn");
  dom.deleteBtn = document.getElementById("deleteBtn");
  dom.exportPngBtn = document.getElementById("exportPngBtn");
  dom.exportProjectBtn = document.getElementById("exportProjectBtn");
  dom.resetBtn = document.getElementById("resetBtn");
}

function bindEvents() {
  dom.photoInput?.addEventListener("change", onPhotoSelected);
  dom.projectInput?.addEventListener("change", onProjectImported);
  dom.catalogSearch?.addEventListener("input", () => {
    state.search = dom.catalogSearch.value.trim().toLowerCase();
    persistState();
    renderCatalog();
  });

  dom.toggleGridBtn?.addEventListener("click", () => {
    state.showGrid = !state.showGrid;
    persistState();
    renderStage();
    showToast(state.showGrid ? "Raster aktiviert" : "Raster ausgeblendet");
  });

  dom.centerSelectedBtn?.addEventListener("click", centerSelected);
  dom.duplicateBtn?.addEventListener("click", duplicateSelected);
  dom.deleteBtn?.addEventListener("click", deleteSelected);
  dom.exportPngBtn?.addEventListener("click", exportStageAsPng);
  dom.exportProjectBtn?.addEventListener("click", exportProject);
  dom.resetBtn?.addEventListener("click", resetProject);

  dom.overlayLayer?.addEventListener("pointerdown", onStagePointerDown);
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("pointercancel", onWindowPointerUp);

  window.addEventListener("keydown", (event) => {
    if (isEditingField(document.activeElement)) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      if (state.selectedId) {
        deleteSelected();
      }
    }
    if (event.key === "Escape") {
      state.selectedId = null;
      persistState();
      renderStage();
      renderInspector();
    }
  });
}

function preloadAssetSizes() {
  MODULES.forEach((module) => {
    const img = new Image();
    img.onload = () => {
      assetSizeMap.set(module.id, {
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1,
      });
      if (state.overlays.some((overlay) => overlay.moduleId === module.id)) {
        renderStage();
      }
    };
    img.src = module.stageAsset;
  });
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.overlays = Array.isArray(parsed?.overlays) ? parsed.overlays.map(normalizeOverlay) : [];
      state.selectedId = parsed?.selectedId || null;
      state.search = typeof parsed?.search === "string" ? parsed.search : "";
      state.showGrid = Boolean(parsed?.showGrid);
      dom.catalogSearch.value = state.search;
    }
    const rawPhotoMeta = localStorage.getItem(PHOTO_META_KEY);
    if (rawPhotoMeta) {
      const parsed = JSON.parse(rawPhotoMeta);
      if (typeof parsed?.photoAspect === "number" && Number.isFinite(parsed.photoAspect)) {
        state.photoAspect = parsed.photoAspect;
      }
    }
  } catch (error) {
    console.warn("State konnte nicht geladen werden", error);
  }
}

function persistState() {
  const persistable = {
    overlays: state.overlays,
    selectedId: state.selectedId,
    search: state.search,
    showGrid: state.showGrid,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  localStorage.setItem(PHOTO_META_KEY, JSON.stringify({ photoAspect: state.photoAspect }));
}

function eur(value) {
  return Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 1800);
}

function getModule(moduleId) {
  return moduleMap.get(moduleId) || null;
}

function getSelectedOverlay() {
  return state.overlays.find((overlay) => overlay.id === state.selectedId) || null;
}

function createOverlay(moduleId) {
  const module = getModule(moduleId);
  if (!module) return null;

  const overlay = normalizeOverlay({
    id: crypto.randomUUID(),
    moduleId,
    x: 0.5,
    y: 0.56,
    width: module.defaultWidth,
    rotation: 0,
    yaw: 0,
    tilt: 0,
    opacity: 1,
    qty: 1,
    z: Date.now(),
    rateSelection: module.rateOptions?.[0]?.value ?? null,
    manualRateEnabled: module.rateType === "manualDefault",
    manualRate: module.rateType === "manualDefault" ? module.rate : 0,
    extras: {},
  });

  if (module.extraOption?.key) {
    overlay.extras[module.extraOption.key] = false;
  }

  return overlay;
}

function addModule(moduleId) {
  const overlay = createOverlay(moduleId);
  if (!overlay) return;
  state.overlays.push(overlay);
  state.selectedId = overlay.id;
  persistState();
  render();
  showToast(`${getModule(moduleId)?.name || "Modul"} hinzugefügt`);
}

function duplicateSelected() {
  const selected = getSelectedOverlay();
  if (!selected) {
    showToast("Bitte erst ein Modul markieren");
    return;
  }
  const copy = normalizeOverlay(structuredClone(selected));
  copy.id = crypto.randomUUID();
  copy.x = clamp(selected.x + 0.04, 0.08, 0.92);
  copy.y = clamp(selected.y + 0.04, 0.08, 0.92);
  copy.z = Date.now();
  state.overlays.push(copy);
  state.selectedId = copy.id;
  persistState();
  render();
  showToast("Modul dupliziert");
}

function centerSelected() {
  const selected = getSelectedOverlay();
  if (!selected) {
    showToast("Bitte erst ein Modul markieren");
    return;
  }
  selected.x = 0.5;
  selected.y = 0.56;
  bringOverlayToFront(selected.id);
  persistState();
  renderStage();
  renderInspector();
  renderSummary();
  showToast("Modul zentriert");
}

function deleteSelected() {
  if (!state.selectedId) {
    showToast("Bitte erst ein Modul markieren");
    return;
  }
  const before = state.overlays.length;
  state.overlays = state.overlays.filter((overlay) => overlay.id !== state.selectedId);
  if (state.overlays.length === before) return;
  state.selectedId = null;
  persistState();
  render();
  showToast("Modul gelöscht");
}

function bringOverlayToFront(overlayId) {
  const overlay = state.overlays.find((item) => item.id === overlayId);
  if (!overlay) return;
  overlay.z = Date.now();
}

function render() {
  renderCatalog();
  renderStage();
  renderInspector();
  renderSummary();
}

function renderCatalog() {
  if (!dom.catalogList) return;
  const query = state.search;
  const filteredModules = MODULES.filter((module) => {
    if (!query) return true;
    const haystack = `${module.name} ${module.category} ${module.placement}`.toLowerCase();
    return haystack.includes(query);
  });

  dom.catalogList.innerHTML = "";

  if (!filteredModules.length) {
    dom.catalogList.innerHTML = `<div class="emptyStateSmall"><p>Keine Module gefunden.</p></div>`;
    return;
  }

  filteredModules.forEach((module) => {
    const card = document.createElement("article");
    card.className = "catalogCard";
    const ratePreview = getModuleBaseRateLabel(module);
    card.innerHTML = `
      <div class="catalogCardTop">
        <img src="${module.thumb}" alt="${module.name}" loading="lazy" />
      </div>
      <div class="catalogCardBody">
        <div class="infoRow">
          <h3>${module.name}</h3>
          <span class="pill subtle">${module.category}</span>
        </div>
        <div class="catalogMeta">${module.placement} · ${module.dimensions}</div>
        <div class="catalogFooter">
          <div class="moduleInfo">${ratePreview}</div>
          <button class="btn btnSmall btnPrimary" data-add="${module.id}">Einbauen</button>
        </div>
      </div>
    `;
    card.querySelector("[data-add]")?.addEventListener("click", () => addModule(module.id));
    dom.catalogList.appendChild(card);
  });
}

function getModuleBaseRateLabel(module) {
  if (module.rateType === "fixed") {
    return `Provision: ${eur(module.rate)}`;
  }
  if (module.rateType === "options") {
    const min = Math.min(...module.rateOptions.map((option) => option.rate));
    const max = Math.max(...module.rateOptions.map((option) => option.rate));
    return `Provision: ${eur(min)} – ${eur(max)}`;
  }
  return "Provision manuell";
}

function renderStage() {
  if (!dom.stage || !dom.photoLayer || !dom.overlayLayer || !dom.gridLayer || !dom.stagePlaceholder) return;

  dom.stage.style.aspectRatio = String(state.photoAspect || 16 / 9);

  if (state.photo) {
    dom.photoLayer.src = state.photo;
    dom.photoLayer.classList.remove("hidden");
    dom.stagePlaceholder.classList.add("hidden");
  } else {
    dom.photoLayer.classList.add("hidden");
    dom.stagePlaceholder.classList.remove("hidden");
  }

  dom.gridLayer.classList.toggle("hidden", !state.showGrid);
  dom.overlayLayer.innerHTML = "";

  const overlays = [...state.overlays].sort((a, b) => a.z - b.z);
  overlays.forEach((overlay) => {
    const module = getModule(overlay.moduleId);
    if (!module) return;
    const aspect = getOverlayAspect(module.id);
    const item = document.createElement("div");
    item.className = `overlayItem${overlay.id === state.selectedId ? " selected" : ""}`;
    item.dataset.id = overlay.id;
    item.style.left = `${overlay.x * 100}%`;
    item.style.top = `${overlay.y * 100}%`;
    item.style.width = `${overlay.width * 100}%`;
    item.style.height = `calc(${overlay.width * 100}% / ${aspect})`;
    item.style.opacity = String(clamp(overlay.opacity, 0.15, 1));
    item.style.transform = `translate(-50%, -50%) rotate(${overlay.rotation}deg)`;
    item.style.zIndex = String(Math.floor(overlay.z));

    const button = document.createElement("button");
    button.type = "button";
    button.className = `overlayButton${isBackFacing(overlay) ? " backFacing" : ""}`;
    button.dataset.action = "select-drag";
    button.dataset.id = overlay.id;
    button.innerHTML = `
      <div class="overlayVisual" style="--yaw:${normalizeSignedDegrees(overlay.yaw)}deg; --tilt:${clamp(Number(overlay.tilt) || 0, -70, 70)}deg;">
        <img class="overlayFace overlayFaceFront" src="${module.stageAsset}" alt="${module.name}" draggable="false" />
        <img class="overlayFace overlayFaceBack" src="${module.stageAsset}" alt="" aria-hidden="true" draggable="false" />
      </div>
      <span class="overlayBadge">${module.name}${getViewBadgeSuffix(overlay)}</span>
    `;

    item.appendChild(button);

    if (overlay.id === state.selectedId) {
      const rotateHandle = document.createElement("button");
      rotateHandle.type = "button";
      rotateHandle.className = "overlayHandle overlayHandleRotate";
      rotateHandle.dataset.action = "rotate";
      rotateHandle.dataset.id = overlay.id;
      rotateHandle.setAttribute("aria-label", "360 Grad drehen");
      rotateHandle.innerHTML = `<span>↻</span>`;
      item.appendChild(rotateHandle);

      const resizeHandle = document.createElement("button");
      resizeHandle.type = "button";
      resizeHandle.className = "overlayHandle overlayHandleResize";
      resizeHandle.dataset.action = "resize";
      resizeHandle.dataset.id = overlay.id;
      resizeHandle.setAttribute("aria-label", "Größe anpassen");
      item.appendChild(resizeHandle);
    }

    dom.overlayLayer.appendChild(item);
  });

  dom.toggleGridBtn.textContent = state.showGrid ? "Raster aus" : "Raster";
}

function renderInspector() {
  const selected = getSelectedOverlay();
  const module = selected ? getModule(selected.moduleId) : null;

  if (!dom.inspector || !dom.selectedTag) return;

  if (!selected || !module) {
    dom.selectedTag.textContent = "nichts markiert";
    dom.inspector.className = "inspector emptyStateSmall";
    dom.inspector.innerHTML = `<p>Tippe im Bild auf ein platziertes Modul, um Größe, Z-Drehung, Front-/Rückansicht, Kippung, Transparenz und Provision anzupassen.</p>`;
    return;
  }

  dom.selectedTag.textContent = module.name;
  dom.inspector.className = "inspector";

  const currentRate = getOverlayRate(selected, module);
  const rateMarkup = buildRateMarkup(selected, module);
  const warningMarkup = module.warning ? `<div class="infoCard warning">${module.warning}</div>` : "";
  const extraMarkup = module.extraOption
    ? `
      <div class="infoCard">
        <div class="toggleRow">
          <div>
            <strong>${module.extraOption.label}</strong>
            <div class="summaryNote">+ ${eur(module.extraOption.rate)}</div>
          </div>
          <label>
            <input type="checkbox" data-field="extra:${module.extraOption.key}" ${selected.extras?.[module.extraOption.key] ? "checked" : ""} />
          </label>
        </div>
      </div>`
    : "";

  dom.inspector.innerHTML = `
    <div class="infoCard">
      <div class="infoRow">
        <div>
          <strong>${module.name}</strong>
          <div class="summaryNote">${module.category} · ${module.placement}</div>
        </div>
        <div class="moneyStrong">${eur(currentRate.total)}</div>
      </div>
      <div class="summaryNote" style="margin-top: 8px;">${module.dimensions}</div>
    </div>

    <div class="fieldGroup">
      <div class="fieldGrid">
        <div class="field">
          <label>Menge</label>
          <div class="qtyRow">
            <div class="qtyCtrl">
              <button class="qtyBtn" type="button" data-qty="-1">−</button>
              <input class="qtyInput" type="number" min="1" max="99" step="1" value="${selected.qty}" data-field="qty" />
              <button class="qtyBtn" type="button" data-qty="1">+</button>
            </div>
          </div>
        </div>
        <div class="field">
          <label>Provision je Modul</label>
          <input type="text" value="${eur(currentRate.single)}" disabled />
        </div>
      </div>

      <div class="field">
        <label>Größe <span class="rangeValue">${Math.round(selected.width * 100)}%</span></label>
        <div class="rangeWrap">
          <input type="range" min="6" max="40" step="1" value="${Math.round(selected.width * 100)}" data-field="width" />
        </div>
      </div>

      <div class="field">
        <label>Drehung auf dem Boden <span class="rangeValue">${Math.round(normalizeRotation(selected.rotation))}°</span></label>
        <div class="rangeWrap">
          <input type="range" min="0" max="360" step="1" value="${Math.round(normalizeRotation(selected.rotation))}" data-field="rotation" />
        </div>
        <div class="nudgeRow">
          <button class="miniBtn" type="button" data-rotate="-15">−15°</button>
          <button class="miniBtn" type="button" data-rotate="-1">−1°</button>
          <button class="miniBtn" type="button" data-rotate="1">+1°</button>
          <button class="miniBtn" type="button" data-rotate="15">+15°</button>
        </div>
      </div>

      <div class="field">
        <label>Ansicht Vorder-/Rückseite <span class="rangeValue">${getViewLabel(selected.yaw)} · ${Math.round(normalizeRotation(selected.yaw))}°</span></label>
        <div class="rangeWrap">
          <input type="range" min="0" max="360" step="1" value="${Math.round(normalizeRotation(selected.yaw))}" data-field="yaw" />
        </div>
        <div class="presetRow">
          <button class="miniBtn" type="button" data-yaw-preset="0">Vorne</button>
          <button class="miniBtn" type="button" data-yaw-preset="90">Rechts</button>
          <button class="miniBtn" type="button" data-yaw-preset="180">Hinten</button>
          <button class="miniBtn" type="button" data-yaw-preset="270">Links</button>
        </div>
      </div>

      <div class="field">
        <label>Kippung oben/unten <span class="rangeValue">${Math.round(Number(selected.tilt) || 0)}°</span></label>
        <div class="rangeWrap">
          <input type="range" min="-70" max="70" step="1" value="${Math.round(Number(selected.tilt) || 0)}" data-field="tilt" />
        </div>
        <div class="nudgeRow">
          <button class="miniBtn" type="button" data-tilt="-10">−10°</button>
          <button class="miniBtn" type="button" data-tilt="-1">−1°</button>
          <button class="miniBtn" type="button" data-tilt="1">+1°</button>
          <button class="miniBtn" type="button" data-tilt="10">+10°</button>
        </div>
      </div>

      <div class="field">
        <label>Transparenz <span class="rangeValue">${Math.round(selected.opacity * 100)}%</span></label>
        <div class="rangeWrap">
          <input type="range" min="20" max="100" step="1" value="${Math.round(selected.opacity * 100)}" data-field="opacity" />
        </div>
      </div>
    </div>

    ${rateMarkup}
    ${extraMarkup}
    ${warningMarkup}
  `;

  dom.inspector.querySelectorAll("[data-field]").forEach((element) => {
    element.addEventListener("input", onInspectorFieldInput);
    element.addEventListener("change", onInspectorFieldInput);
  });

  dom.inspector.querySelectorAll("[data-qty]").forEach((element) => {
    element.addEventListener("click", onQtyButtonClick);
  });

  dom.inspector.querySelectorAll("[data-rotate]").forEach((element) => {
    element.addEventListener("click", onRotateButtonClick);
  });

  dom.inspector.querySelectorAll("[data-yaw-preset]").forEach((element) => {
    element.addEventListener("click", onYawPresetClick);
  });

  dom.inspector.querySelectorAll("[data-tilt]").forEach((element) => {
    element.addEventListener("click", onTiltButtonClick);
  });
}

function buildRateMarkup(overlay, module) {
  const manualToggle = `
    <div class="infoCard">
      <div class="toggleRow">
        <div>
          <strong>Eigene Provision verwenden</strong>
          <div class="summaryNote">Auto-Wert aus dem PICOS POS Rechner bei Bedarf überschreiben</div>
        </div>
        <label>
          <input type="checkbox" data-field="manualRateEnabled" ${overlay.manualRateEnabled ? "checked" : ""} />
        </label>
      </div>
      <div class="field" style="margin-top: 12px;">
        <label>Manuelle Provision je Modul</label>
        <input type="number" min="0" step="0.01" value="${Number(overlay.manualRate || 0)}" data-field="manualRate" ${overlay.manualRateEnabled ? "" : "disabled"} />
      </div>
    </div>
  `;

  if (module.rateType === "fixed") {
    return `
      <div class="infoCard">
        <div class="infoRow">
          <div>
            <strong>Auto-Provision</strong>
            <div class="summaryNote">${module.rateLabel}</div>
          </div>
          <div class="moneyStrong">${eur(module.rate)}</div>
        </div>
      </div>
      ${manualToggle}
    `;
  }

  if (module.rateType === "options") {
    const optionsMarkup = module.rateOptions
      .map((option) => `
        <option value="${option.value}" ${overlay.rateSelection === option.value ? "selected" : ""}>
          ${option.label} · ${eur(option.rate)}
        </option>
      `)
      .join("");

    return `
      <div class="infoCard">
        <div class="field">
          <label>Auto-Provision auswählen</label>
          <select data-field="rateSelection">${optionsMarkup}</select>
        </div>
      </div>
      ${manualToggle}
    `;
  }

  return manualToggle;
}

function renderSummary() {
  if (!dom.summaryLines || !dom.grandTotal || !dom.summaryMeta || !dom.lineCountTag) return;

  const sorted = [...state.overlays].sort((a, b) => b.z - a.z);
  const total = sorted.reduce((sum, overlay) => {
    const module = getModule(overlay.moduleId);
    if (!module) return sum;
    return sum + getOverlayRate(overlay, module).total;
  }, 0);

  dom.grandTotal.textContent = eur(total);
  dom.summaryMeta.innerHTML = `
    <span class="pill">${state.overlays.length} Module</span>
    <span class="pill">${eur(total)}</span>
  `;
  dom.lineCountTag.textContent = `${state.overlays.length} Positionen`;

  if (!sorted.length) {
    dom.summaryLines.className = "summaryLines emptyStateSmall";
    dom.summaryLines.innerHTML = `<p>Noch keine Module platziert.</p>`;
    return;
  }

  dom.summaryLines.className = "summaryLines";
  dom.summaryLines.innerHTML = "";

  sorted.forEach((overlay) => {
    const module = getModule(overlay.moduleId);
    if (!module) return;
    const rateInfo = getOverlayRate(overlay, module);
    const line = document.createElement("button");
    line.type = "button";
    line.className = "summaryLine";
    line.innerHTML = `
      <div class="summaryLineMeta">
        <strong>${module.name}</strong>
        <span class="summaryNote">${module.category} · Menge ${overlay.qty}${rateInfo.manual ? " · manuell" : ""}</span>
      </div>
      <div class="moneyStrong">${eur(rateInfo.total)}</div>
    `;
    line.addEventListener("click", () => {
      state.selectedId = overlay.id;
      bringOverlayToFront(overlay.id);
      persistState();
      renderStage();
      renderInspector();
      renderSummary();
    });
    dom.summaryLines.appendChild(line);
  });
}

function getOverlayAspect(moduleId) {
  const size = assetSizeMap.get(moduleId);
  if (!size || !size.width || !size.height) {
    return 1;
  }
  return size.width / size.height;
}

function getOverlayRate(overlay, module) {
  if (overlay.manualRateEnabled) {
    const manualValue = sanitizeNumber(overlay.manualRate, 0);
    return {
      single: manualValue,
      total: manualValue * sanitizeInt(overlay.qty, 1),
      manual: true,
    };
  }

  let single = 0;

  if (module.rateType === "fixed") {
    single = module.rate;
  } else if (module.rateType === "options") {
    const selectedOption = module.rateOptions.find((option) => option.value === overlay.rateSelection) || module.rateOptions[0];
    single = selectedOption?.rate || 0;
  } else {
    single = module.rate || 0;
  }

  if (module.extraOption?.key && overlay.extras?.[module.extraOption.key]) {
    single += module.extraOption.rate;
  }

  return {
    single,
    total: single * sanitizeInt(overlay.qty, 1),
    manual: false,
  };
}

function onInspectorFieldInput(event) {
  const selected = getSelectedOverlay();
  if (!selected) return;

  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  const field = target.dataset.field;
  if (!field) return;

  if (field === "qty") {
    selected.qty = sanitizeInt(target.value, 1, 99);
    target.value = String(selected.qty);
  }

  if (field === "width") {
    selected.width = clamp(Number(target.value) / 100, 0.06, 0.4);
  }

  if (field === "rotation") {
    selected.rotation = clamp(Number(target.value), 0, 360);
  }

  if (field === "yaw") {
    selected.yaw = clamp(Number(target.value), 0, 360);
  }

  if (field === "tilt") {
    selected.tilt = clamp(Number(target.value), -70, 70);
  }

  if (field === "opacity") {
    selected.opacity = clamp(Number(target.value) / 100, 0.2, 1);
  }

  if (field === "rateSelection" && target instanceof HTMLSelectElement) {
    selected.rateSelection = target.value;
  }

  if (field === "manualRateEnabled" && target instanceof HTMLInputElement) {
    selected.manualRateEnabled = target.checked;
  }

  if (field === "manualRate") {
    selected.manualRate = sanitizeNumber(target.value, 0);
  }

  if (field.startsWith("extra:") && target instanceof HTMLInputElement) {
    const extraKey = field.split(":")[1];
    selected.extras = selected.extras || {};
    selected.extras[extraKey] = target.checked;
  }

  persistState();
  renderStage();
  renderInspector();
  renderSummary();
}

function onQtyButtonClick(event) {
  const selected = getSelectedOverlay();
  if (!selected) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const delta = sanitizeInt(target.dataset.qty, 0);
  selected.qty = clamp(sanitizeInt(selected.qty, 1) + delta, 1, 99);
  persistState();
  renderInspector();
  renderSummary();
}

function onRotateButtonClick(event) {
  const selected = getSelectedOverlay();
  if (!selected) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const delta = Number(target.dataset.rotate || 0);
  selected.rotation = normalizeRotation(selected.rotation + delta);
  persistState();
  renderStage();
  renderInspector();
  renderSummary();
}

function onYawPresetClick(event) {
  const selected = getSelectedOverlay();
  if (!selected) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  selected.yaw = normalizeRotation(Number(target.dataset.yawPreset || 0));
  persistState();
  renderStage();
  renderInspector();
  renderSummary();
}

function onTiltButtonClick(event) {
  const selected = getSelectedOverlay();
  if (!selected) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const delta = Number(target.dataset.tilt || 0);
  selected.tilt = clamp((Number(selected.tilt) || 0) + delta, -70, 70);
  persistState();
  renderStage();
  renderInspector();
  renderSummary();
}

function onStagePointerDown(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const actionTarget = target.closest("[data-action]");
  if (!(actionTarget instanceof HTMLElement)) return;

  const overlayId = actionTarget.dataset.id;
  if (!overlayId) return;

  const overlay = state.overlays.find((item) => item.id === overlayId);
  if (!overlay) return;

  state.selectedId = overlayId;
  bringOverlayToFront(overlayId);
  persistState();
  renderStage();
  renderInspector();
  renderSummary();

  const action = actionTarget.dataset.action;
  const stageRect = dom.stage.getBoundingClientRect();

  if (action === "select-drag") {
    dragState = {
      type: "drag",
      pointerId: event.pointerId,
      overlayId,
      startX: event.clientX,
      startY: event.clientY,
      originalX: overlay.x,
      originalY: overlay.y,
      stageRect,
    };
  }

  if (action === "resize") {
    dragState = {
      type: "resize",
      pointerId: event.pointerId,
      overlayId,
      startX: event.clientX,
      originalWidth: overlay.width,
      stageRect,
    };
  }

  if (action === "rotate") {
    const centerX = stageRect.left + overlay.x * stageRect.width;
    const centerY = stageRect.top + overlay.y * stageRect.height;
    dragState = {
      type: "rotate",
      pointerId: event.pointerId,
      overlayId,
      centerX,
      centerY,
      startAngle: getPointerAngle(event.clientX, event.clientY, centerX, centerY),
      originalRotation: normalizeRotation(overlay.rotation),
    };
  }

  event.preventDefault();
}

function onWindowPointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const overlay = state.overlays.find((item) => item.id === dragState.overlayId);
  if (!overlay) return;

  if (dragState.type === "drag") {
    const dx = (event.clientX - dragState.startX) / dragState.stageRect.width;
    const dy = (event.clientY - dragState.startY) / dragState.stageRect.height;
    overlay.x = clamp(dragState.originalX + dx, 0.02, 0.98);
    overlay.y = clamp(dragState.originalY + dy, 0.02, 0.98);
  }

  if (dragState.type === "resize") {
    const dx = (event.clientX - dragState.startX) / dragState.stageRect.width;
    overlay.width = clamp(dragState.originalWidth + dx, 0.06, 0.4);
  }

  if (dragState.type === "rotate") {
    const currentAngle = getPointerAngle(event.clientX, event.clientY, dragState.centerX, dragState.centerY);
    const delta = getShortestAngleDelta(dragState.startAngle, currentAngle);
    overlay.rotation = normalizeRotation(dragState.originalRotation + delta);
  }

  renderStage();
  renderInspector();
  renderSummary();
}

function onWindowPointerUp(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  dragState = null;
  persistState();
}

function onPhotoSelected(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== "string") return;
    state.photo = result;
    state.photoName = file.name;
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth && probe.naturalHeight) {
        state.photoAspect = probe.naturalWidth / probe.naturalHeight;
      }
      persistState();
      renderStage();
      showToast("Foto geladen");
    };
    probe.src = result;
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function exportProject() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    photoIncluded: false,
    photoName: state.photoName || "",
    photoAspect: state.photoAspect,
    overlays: state.overlays,
  };
  downloadFile(
    `SELLENCE-VR-Projekt-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
  showToast("Projekt exportiert");
}

function onProjectImported(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      if (!Array.isArray(parsed.overlays)) {
        throw new Error("Ungültiges Projektformat");
      }
      state.overlays = parsed.overlays.map(normalizeOverlay);
      state.selectedId = state.overlays[0]?.id || null;
      if (typeof parsed.photoAspect === "number" && Number.isFinite(parsed.photoAspect)) {
        state.photoAspect = parsed.photoAspect;
      }
      persistState();
      render();
      showToast("Projekt importiert");
    } catch (error) {
      console.error(error);
      showToast("Projekt konnte nicht importiert werden");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

function resetProject() {
  const confirmed = window.confirm("Alles zurücksetzen? Das aktuelle Marktfoto und alle platzierten Module werden entfernt.");
  if (!confirmed) return;

  state.overlays = [];
  state.selectedId = null;
  state.photo = null;
  state.photoName = "";
  state.photoAspect = 16 / 9;
  persistState();
  render();
  showToast("Projekt zurückgesetzt");
}

async function exportStageAsPng() {
  try {
    const canvas = await buildExportCanvas();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("PNG konnte nicht erzeugt werden");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SELLENCE-VR-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("PNG exportiert");
    }, "image/png");
  } catch (error) {
    console.error(error);
    showToast("PNG Export fehlgeschlagen");
  }
}

async function buildExportCanvas() {
  const stageRect = dom.stage.getBoundingClientRect();
  const width = Math.max(1280, Math.round((state.photo ? 1 : 1) * stageRect.width * 2));
  const height = Math.max(720, Math.round(width / (state.photoAspect || 16 / 9)));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  if (state.photo) {
    const base = await loadImage(state.photo);
    ctx.drawImage(base, 0, 0, width, height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a1520");
    gradient.addColorStop(1, "#121d2c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const ordered = [...state.overlays].sort((a, b) => a.z - b.z);
  for (const overlay of ordered) {
    const module = getModule(overlay.moduleId);
    if (!module) continue;
    const image = await loadImage(module.stageAsset);
    const aspect = (image.naturalWidth || image.width || 1) / (image.naturalHeight || image.height || 1);
    const drawWidth = overlay.width * width;
    const drawHeight = drawWidth / aspect;
    const centerX = overlay.x * width;
    const centerY = overlay.y * height;
    const yawRad = (normalizeRotation(overlay.yaw) * Math.PI) / 180;
    const tiltRad = ((Number(overlay.tilt) || 0) * Math.PI) / 180;
    const rawScaleX = Math.cos(yawRad);
    const rawScaleY = Math.cos(tiltRad);
    const scaleX = Math.sign(rawScaleX || 1) * Math.max(0.08, Math.abs(rawScaleX));
    const scaleY = Math.max(0.18, Math.abs(rawScaleY));
    const skewX = Math.sin(yawRad) * 0.12;
    const skewY = -Math.sin(tiltRad) * 0.08;

    ctx.save();
    ctx.globalAlpha = clamp(overlay.opacity, 0.15, 1);
    ctx.translate(centerX, centerY);
    ctx.rotate((overlay.rotation * Math.PI) / 180);
    ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0);
    ctx.filter = isBackFacing(overlay) ? "brightness(0.82) saturate(0.78)" : "none";
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  drawSummaryCard(ctx, width, height);

  return canvas;
}

function drawSummaryCard(ctx, width, height) {
  const total = state.overlays.reduce((sum, overlay) => {
    const module = getModule(overlay.moduleId);
    if (!module) return sum;
    return sum + getOverlayRate(overlay, module).total;
  }, 0);

  const cardWidth = Math.min(width * 0.28, 460);
  const cardHeight = 122;
  const x = width - cardWidth - 24;
  const y = 24;

  ctx.save();
  ctx.fillStyle = "rgba(6, 14, 22, 0.82)";
  roundRect(ctx, x, y, cardWidth, cardHeight, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  ctx.fillStyle = "rgba(170, 195, 216, 0.92)";
  ctx.font = "500 20px Inter, Arial, sans-serif";
  ctx.fillText("Händler-Provision", x + 22, y + 34);

  ctx.fillStyle = "#f2f8ff";
  ctx.font = "700 36px Inter, Arial, sans-serif";
  ctx.fillText(eur(total), x + 22, y + 82);

  ctx.fillStyle = "rgba(42, 218, 222, 1)";
  ctx.font = "600 18px Inter, Arial, sans-serif";
  ctx.fillText(`${state.overlays.length} Module platziert`, x + 22, y + 108);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function sanitizeInt(value, fallback = 1, max = Number.POSITIVE_INFINITY) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOverlay(rawOverlay) {
  const overlay = rawOverlay && typeof rawOverlay === "object" ? rawOverlay : {};
  return {
    ...overlay,
    x: clamp(sanitizeNumber(overlay.x, 0.5), 0.02, 0.98),
    y: clamp(sanitizeNumber(overlay.y, 0.56), 0.02, 0.98),
    width: clamp(sanitizeNumber(overlay.width, 0.16), 0.06, 0.4),
    rotation: normalizeRotation(overlay.rotation),
    yaw: normalizeRotation(overlay.yaw),
    tilt: clamp(sanitizeNumber(overlay.tilt, 0), -70, 70),
    opacity: clamp(sanitizeNumber(overlay.opacity, 1), 0.15, 1),
    qty: sanitizeInt(overlay.qty, 1, 99),
    z: sanitizeNumber(overlay.z, Date.now()),
    extras: overlay.extras && typeof overlay.extras === "object" ? overlay.extras : {},
  };
}

function normalizeSignedDegrees(value) {
  const normalized = normalizeRotation(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function isBackFacing(overlay) {
  const yaw = normalizeRotation(overlay?.yaw || 0);
  return yaw > 90 && yaw < 270;
}

function getViewLabel(yaw) {
  const normalized = normalizeRotation(yaw || 0);
  if (normalized >= 315 || normalized < 45) return "Vorne";
  if (normalized >= 45 && normalized < 135) return "Rechts";
  if (normalized >= 135 && normalized < 225) return "Hinten";
  return "Links";
}

function getViewBadgeSuffix(overlay) {
  const label = getViewLabel(overlay?.yaw || 0);
  return label === "Vorne" ? "" : ` · ${label}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRotation(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const normalized = ((numeric % 360) + 360) % 360;
  return normalized === 0 && Math.abs(numeric) > 0 ? 360 : normalized;
}

function getPointerAngle(clientX, clientY, centerX, centerY) {
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
}

function getShortestAngleDelta(startAngle, currentAngle) {
  let delta = currentAngle - startAngle;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function isEditingField(element) {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((error) => {
        console.warn("Service Worker konnte nicht registriert werden", error);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
