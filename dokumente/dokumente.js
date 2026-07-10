(() => {
  "use strict";

  try {
    if(localStorage.getItem("sellence_auth") !== "1"){
      location.replace("../index.html");
      return;
    }
  } catch {}

  const DATA_JSON = "../assets/dokumente/dateien.json";
  const DOCS_BASE = "../assets/dokumente/";
  const EXCLUDED = new Set(["dateien.json", "dateien.js", ".gitkeep"]);

  const TYPE_MAP = {
    pdf: { group: "PDF", label: "PDF", bg: "linear-gradient(135deg,#ff4f6d,#ff8a3d)", glow: "rgba(255,79,109,.14)" },
    doc: { group: "Office", label: "DOC", bg: "linear-gradient(135deg,#2878ff,#2fe4ff)", glow: "rgba(47,157,255,.14)" },
    docx:{ group: "Office", label: "DOCX",bg: "linear-gradient(135deg,#2878ff,#2fe4ff)", glow: "rgba(47,157,255,.14)" },
    xls: { group: "Office", label: "XLS", bg: "linear-gradient(135deg,#14b86b,#3df09f)", glow: "rgba(61,240,159,.13)" },
    xlsx:{ group: "Office", label: "XLSX",bg: "linear-gradient(135deg,#14b86b,#3df09f)", glow: "rgba(61,240,159,.13)" },
    csv: { group: "Office", label: "CSV", bg: "linear-gradient(135deg,#14b86b,#3df09f)", glow: "rgba(61,240,159,.13)" },
    ppt: { group: "Office", label: "PPT", bg: "linear-gradient(135deg,#ff6a2d,#ffd66b)", glow: "rgba(255,160,60,.14)" },
    pptx:{ group: "Office", label: "PPTX",bg: "linear-gradient(135deg,#ff6a2d,#ffd66b)", glow: "rgba(255,160,60,.14)" },
    jpg: { group: "Bilder", label: "JPG", bg: "linear-gradient(135deg,#a94fff,#ff4f9a)", glow: "rgba(210,79,255,.14)" },
    jpeg:{ group: "Bilder", label: "JPEG",bg: "linear-gradient(135deg,#a94fff,#ff4f9a)", glow: "rgba(210,79,255,.14)" },
    png: { group: "Bilder", label: "PNG", bg: "linear-gradient(135deg,#a94fff,#ff4f9a)", glow: "rgba(210,79,255,.14)" },
    webp:{ group: "Bilder", label: "WEBP",bg: "linear-gradient(135deg,#a94fff,#ff4f9a)", glow: "rgba(210,79,255,.14)" },
    gif: { group: "Bilder", label: "GIF", bg: "linear-gradient(135deg,#a94fff,#ff4f9a)", glow: "rgba(210,79,255,.14)" },
    svg: { group: "Bilder", label: "SVG", bg: "linear-gradient(135deg,#a94fff,#ff4f9a)", glow: "rgba(210,79,255,.14)" },
    zip: { group: "Archive",label: "ZIP", bg: "linear-gradient(135deg,#ffd66b,#a98438)", glow: "rgba(255,214,107,.14)" },
    rar: { group: "Archive",label: "RAR", bg: "linear-gradient(135deg,#ffd66b,#a98438)", glow: "rgba(255,214,107,.14)" },
    "7z":{ group: "Archive",label: "7Z",  bg: "linear-gradient(135deg,#ffd66b,#a98438)", glow: "rgba(255,214,107,.14)" },
    txt: { group: "Text", label: "TXT", bg: "linear-gradient(135deg,#7183a6,#c5d3e7)", glow: "rgba(174,193,220,.12)" },
    md:  { group: "Text", label: "MD",  bg: "linear-gradient(135deg,#7183a6,#c5d3e7)", glow: "rgba(174,193,220,.12)" }
  };

  const state = { documents: [], query: "", filter: "Alle" };
  const $ = id => document.getElementById(id);
  const grid = $("documentsGrid");
  const empty = $("documentsEmpty");
  const reloadButton = $("reloadDocuments");

  function safeString(value){ return typeof value === "string" ? value.trim() : ""; }
  function extensionOf(path){
    const clean = safeString(path).split(/[?#]/)[0];
    const name = clean.split("/").pop() || "";
    const idx = name.lastIndexOf(".");
    return idx > 0 ? name.slice(idx + 1).toLowerCase() : "";
  }
  function fileType(ext){
    return TYPE_MAP[ext] || { group: "Sonstige", label: (ext || "DATEI").toUpperCase(), bg: "linear-gradient(135deg,#6f57ff,#2fe4ff)", glow: "rgba(111,87,255,.13)" };
  }
  function validRelativePath(path){
    const normalized = safeString(path).replace(/\\/g, "/").replace(/^\.\//, "");
    if(!normalized || normalized.startsWith("/") || normalized.includes("../") || /^[a-z]+:/i.test(normalized)) return "";
    return normalized;
  }
  function fileUrl(path){
    return DOCS_BASE + validRelativePath(path).split("/").map(encodeURIComponent).join("/");
  }
  function formatBytes(bytes){
    const value = Number(bytes);
    if(!Number.isFinite(value) || value <= 0) return "Größe unbekannt";
    const units = ["B","KB","MB","GB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const number = value / Math.pow(1024, index);
    return `${number.toLocaleString("de-DE", { maximumFractionDigits: index === 0 ? 0 : 1 })} ${units[index]}`;
  }
  function formatDate(value){
    if(!value) return "Datum unbekannt";
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return "Datum unbekannt";
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function normalizeDocuments(input){
    if(!Array.isArray(input)) return [];
    const seen = new Set();
    return input.map(item => {
      const raw = typeof item === "string" ? { path: item } : (item || {});
      const path = validRelativePath(raw.path || raw.file || raw.name);
      if(!path) return null;
      const basename = path.split("/").pop();
      if(EXCLUDED.has(basename.toLowerCase()) || basename.startsWith(".")) return null;
      const key = path.toLowerCase();
      if(seen.has(key)) return null;
      seen.add(key);
      const ext = safeString(raw.extension).replace(/^\./, "").toLowerCase() || extensionOf(path);
      return {
        name: safeString(raw.name) || basename,
        path,
        extension: ext,
        size: Number(raw.size) || 0,
        modified: raw.modified || raw.lastModified || ""
      };
    }).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name, "de", { numeric: true, sensitivity: "base" }));
  }

  async function loadJsonManifest(){
    if(location.protocol === "file:") return null;
    const response = await fetch(`${DATA_JSON}?v=${Date.now()}`, { cache: "no-store" });
    if(!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    return response.json();
  }

  async function tryDirectoryListing(){
    if(location.protocol === "file:") return [];
    try{
      const response = await fetch(`${DOCS_BASE}?v=${Date.now()}`, { cache: "no-store" });
      if(!response.ok) return [];
      const contentType = response.headers.get("content-type") || "";
      if(!contentType.includes("text/html")) return [];
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      return [...doc.querySelectorAll("a[href]")].map(anchor => {
        const href = anchor.getAttribute("href") || "";
        if(!href || href === "../" || href.endsWith("/")) return null;
        try{
          const url = new URL(href, new URL(DOCS_BASE, location.href));
          const root = new URL(DOCS_BASE, location.href);
          if(url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return null;
          return { path: decodeURIComponent(url.pathname.slice(root.pathname.length)), name: decodeURIComponent(url.pathname.split("/").pop() || "") };
        }catch{ return null; }
      }).filter(Boolean);
    }catch{ return []; }
  }

  function createFilterButtons(){
    const groups = ["Alle", ...new Set(state.documents.map(doc => fileType(doc.extension).group))];
    const wrap = $("documentFilters");
    wrap.replaceChildren();
    groups.forEach(group => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filterBtn${state.filter === group ? " active" : ""}`;
      button.textContent = group;
      button.addEventListener("click", () => { state.filter = group; createFilterButtons(); render(); });
      wrap.appendChild(button);
    });
  }

  function filteredDocuments(){
    const query = state.query.toLocaleLowerCase("de");
    return state.documents.filter(doc => {
      const matchesFilter = state.filter === "Alle" || fileType(doc.extension).group === state.filter;
      const haystack = `${doc.name} ${doc.path} ${doc.extension}`.toLocaleLowerCase("de");
      return matchesFilter && (!query || haystack.includes(query));
    });
  }

  function createIconSvg(kind){
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", kind === "download"
      ? "M11 3a1 1 0 1 1 2 0v10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4l3.3 3.3V3ZM4 19a1 1 0 0 1 1 1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z"
      : "M13.2 5.3a1 1 0 0 1 1.4 0l6.1 6.1a1 1 0 0 1 0 1.4l-6.1 6.1a1 1 0 1 1-1.4-1.4l4.4-4.4H4a1 1 0 1 1 0-2h13.6l-4.4-4.4a1 1 0 0 1 0-1.4Z");
    svg.appendChild(path);
    return svg;
  }

  function createCard(doc){
    const type = fileType(doc.extension);
    const card = document.createElement("article");
    card.className = "docCard";
    card.style.setProperty("--docGlow", type.glow);

    const top = document.createElement("div");
    top.className = "docCard__top";
    const icon = document.createElement("div");
    icon.className = "docIcon";
    icon.style.setProperty("--docBg", type.bg);
    icon.textContent = type.label.slice(0, 5);
    const badge = document.createElement("span");
    badge.className = "docType";
    badge.textContent = type.group;
    top.append(icon, badge);

    const name = document.createElement("h2");
    name.className = "docCard__name";
    name.textContent = doc.name;
    const path = document.createElement("p");
    path.className = "docCard__path";
    path.textContent = doc.path.includes("/") ? doc.path.slice(0, doc.path.lastIndexOf("/")) : "Dokumentenordner";
    path.title = doc.path;

    const meta = document.createElement("div");
    meta.className = "docMeta";
    const size = document.createElement("span");
    size.textContent = formatBytes(doc.size);
    const date = document.createElement("span");
    date.textContent = formatDate(doc.modified);
    meta.append(size, date);

    const actions = document.createElement("div");
    actions.className = "docActions";
    const open = document.createElement("a");
    open.className = "docOpen";
    open.href = fileUrl(doc.path);
    open.target = "_blank";
    open.rel = "noopener";
    open.append(document.createTextNode("Öffnen"), createIconSvg("open"));
    const download = document.createElement("a");
    download.className = "docDownload";
    download.href = fileUrl(doc.path);
    download.download = doc.name;
    download.title = "Herunterladen";
    download.setAttribute("aria-label", `${doc.name} herunterladen`);
    download.appendChild(createIconSvg("download"));
    actions.append(open, download);

    card.append(top, name, path, meta, actions);
    return card;
  }

  function updateStats(){
    $("documentTotal").textContent = String(state.documents.length);
    $("documentSize").textContent = formatBytes(state.documents.reduce((sum, doc) => sum + (Number(doc.size) || 0), 0));
    $("documentTypes").textContent = String(new Set(state.documents.map(doc => doc.extension || "sonstige")).size);
  }

  function render(){
    const documents = filteredDocuments();
    grid.replaceChildren(...documents.map(createCard));
    const hasAny = state.documents.length > 0;
    const hasResults = documents.length > 0;
    grid.hidden = !hasResults;
    empty.hidden = hasResults;
    if(!hasResults){
      $("emptyTitle").textContent = hasAny ? "Keine Treffer gefunden" : "Noch keine Dokumente";
      $("emptyText").innerHTML = hasAny
        ? "Ändere den Suchbegriff oder wähle einen anderen Dateityp."
        : "Lege Dateien im Ordner <code>assets/dokumente</code> ab und starte anschließend <b>DOKUMENTE-AKTUALISIEREN.bat</b>.";
    }
    $("resultText").textContent = hasAny
      ? `${documents.length} von ${state.documents.length} ${state.documents.length === 1 ? "Dokument" : "Dokumenten"}`
      : "Der Dokumentenordner ist noch leer.";
  }

  async function loadDocuments(){
    reloadButton.classList.add("isLoading");
    reloadButton.disabled = true;
    let loaded = null;
    try{ loaded = await loadJsonManifest(); }catch{}
    if(!Array.isArray(loaded) || loaded.length === 0){
      const embedded = Array.isArray(window.SELLENCE_DOCUMENTS) ? window.SELLENCE_DOCUMENTS : [];
      loaded = embedded.length ? embedded : await tryDirectoryListing();
    }
    state.documents = normalizeDocuments(loaded);
    if(state.filter !== "Alle" && !state.documents.some(doc => fileType(doc.extension).group === state.filter)) state.filter = "Alle";
    createFilterButtons();
    updateStats();
    render();
    $("lastUpdated").textContent = `Stand ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    reloadButton.classList.remove("isLoading");
    reloadButton.disabled = false;
  }

  $("documentSearch").addEventListener("input", event => { state.query = event.target.value.trim(); render(); });
  reloadButton.addEventListener("click", loadDocuments);
  document.addEventListener("keydown", event => {
    if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"){
      event.preventDefault();
      $("documentSearch").focus();
    }
    if(event.key === "Escape" && document.activeElement === $("documentSearch")){
      $("documentSearch").value = "";
      state.query = "";
      render();
      $("documentSearch").blur();
    }
  });

  loadDocuments();
})();
