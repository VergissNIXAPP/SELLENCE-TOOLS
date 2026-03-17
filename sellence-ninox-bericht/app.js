const STORAGE_KEY = "sellenceNinoxButtonsV7";
const LEGACY_STORAGE_KEY = "sellenceNinoxButtonsV6";
const DRAWER_KEY = "ninoxCreatorOpen";
const ENTRIES_KEY = "ninoxReportEntriesV1";
const CATEGORIES = ["UMGESETZT", "NICHT UMGESETZT", "WEITERES VORGEHEN"];
const DEFAULT_CATEGORY = "UMGESETZT";

const storedButtons = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
const buttons = Array.isArray(storedButtons) ? storedButtons.map(normalizeButton).filter(Boolean) : [];
const reportEntries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || "[]").map(normalizeEntry).filter(Boolean);

let editIndex = null;

const buttonArea = document.getElementById("buttonArea");
const reportText = document.getElementById("reportText");
const btnText = document.getElementById("btnText");
const btnColor = document.getElementById("btnColor");
const btnLabel = document.getElementById("btnLabel");
const btnCategory = document.getElementById("btnCategory");
const buttonCount = document.getElementById("buttonCount");
const lineCount = document.getElementById("lineCount");
const template = document.getElementById("buttonTemplate");
const importInput = document.getElementById("importInput");
const toggleCreatorBtn = document.getElementById("toggleCreatorBtn");
const closeCreatorBtn = document.getElementById("closeCreatorBtn");
const creatorDrawer = document.getElementById("creatorDrawer");
const createBtn = document.getElementById("createBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const drawerTitle = document.getElementById("drawerTitle");
const freeEntryCategory = document.getElementById("freeEntryCategory");
const freeEntryText = document.getElementById("freeEntryText");
const addFreeEntryBtn = document.getElementById("addFreeEntryBtn");

function normalizeButton(item){
  if (!item || typeof item.text !== "string") return null;
  const text = item.text.trim();
  if (!text) return null;
  const category = CATEGORIES.includes(item.category) ? item.category : DEFAULT_CATEGORY;
  return {
    text,
    label: typeof item.label === "string" ? item.label.trim() : "",
    color: typeof item.color === "string" ? item.color : "#5b8cff",
    category
  };
}

function normalizeEntry(item){
  if (!item || typeof item.text !== "string") return null;
  const text = item.text.trim();
  if (!text) return null;
  return {
    text,
    category: CATEGORIES.includes(item.category) ? item.category : DEFAULT_CATEGORY
  };
}

function saveButtons(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
}

function saveEntries(){
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(reportEntries));
}

function updateStats(){
  buttonCount.textContent = `${buttons.length} Button${buttons.length === 1 ? "" : "s"}`;
  lineCount.textContent = `${reportEntries.length} Eintrag${reportEntries.length === 1 ? "" : "e"}`;
}

function shadeColor(hex, percent){
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return "#" + (b | (g << 8) | (r << 16)).toString(16).padStart(6, "0");
}

function buildCategorySection(category){
  const wrap = document.createElement("section");
  wrap.className = "button-category";
  wrap.dataset.category = category;

  const header = document.createElement("div");
  header.className = "category-head";
  header.innerHTML = `<h3>${category}</h3><span class="category-count">0 Buttons</span>`;

  const grid = document.createElement("div");
  grid.className = "buttons-grid";
  grid.dataset.gridCategory = category;

  wrap.append(header, grid);
  return wrap;
}

function renderButtons(){
  buttonArea.innerHTML = "";
  const grids = {};

  CATEGORIES.forEach((category) => {
    const section = buildCategorySection(category);
    buttonArea.appendChild(section);
    grids[category] = section.querySelector(".buttons-grid");
  });

  buttons.forEach((item, index) => {
    const fragment = template.content.cloneNode(true);
    const cardBtn = fragment.querySelector(".smart-button");
    const label = fragment.querySelector(".smart-label");
    const deleteBtn = fragment.querySelector(".delete-btn");
    const editBtn = fragment.querySelector(".edit-btn");
    const moveLeftBtn = fragment.querySelector(".move-left-btn");
    const moveRightBtn = fragment.querySelector(".move-right-btn");

    cardBtn.style.background = `linear-gradient(135deg, ${item.color}, ${shadeColor(item.color, -20)})`;
    cardBtn.textContent = item.label || item.text;
    label.textContent = item.text;

    cardBtn.addEventListener("click", () => addEntry(item.text, item.category));

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Diesen Button wirklich löschen?")) {
        buttons.splice(index, 1);
        saveButtons();
        renderButtons();
        if (editIndex === index) resetEditor();
      }
    });

    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startEdit(index);
    });

    moveLeftBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveWithinCategory(index, -1);
    });

    moveRightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveWithinCategory(index, 1);
    });

    grids[item.category].appendChild(fragment);
  });

  document.querySelectorAll(".button-category").forEach((section) => {
    const category = section.dataset.category;
    const count = buttons.filter(btn => btn.category === category).length;
    section.querySelector(".category-count").textContent = `${count} Button${count === 1 ? "" : "s"}`;
  });

  updateStats();
}

function renderReport(){
  const chunks = [];

  CATEGORIES.forEach((category) => {
    const entries = reportEntries.filter(entry => entry.category === category);
    if (!entries.length) return;
    chunks.push(`${category}:`);
    entries.forEach(entry => chunks.push(`- ${entry.text}`));
    chunks.push("");
  });

  reportText.value = chunks.join("\n").trim();
  updateStats();
}

function addEntry(text, category){
  const entry = normalizeEntry({ text, category });
  if (!entry) return;
  reportEntries.push(entry);
  saveEntries();
  renderReport();
}

function addFreeEntry(){
  const text = freeEntryText.value.trim();
  if (!text) {
    alert("Bitte zuerst einen freien Zusatz eingeben.");
    freeEntryText.focus();
    return;
  }

  addEntry(text, freeEntryCategory.value);
  freeEntryText.value = "";
  freeEntryText.focus();
}

function openDrawer(){
  creatorDrawer.classList.remove("hidden");
  localStorage.setItem(DRAWER_KEY, "1");
}

function closeDrawer(){
  creatorDrawer.classList.add("hidden");
  localStorage.setItem(DRAWER_KEY, "0");
}

function resetEditor(){
  editIndex = null;
  btnText.value = "";
  btnLabel.value = "";
  btnColor.value = "#5b8cff";
  btnCategory.value = DEFAULT_CATEGORY;
  createBtn.textContent = "+ Button hinzufügen";
  drawerTitle.textContent = "Neuen Bericht-Button anlegen";
  cancelEditBtn.classList.add("hidden");
}

function startEdit(index){
  const item = buttons[index];
  editIndex = index;
  btnText.value = item.text;
  btnLabel.value = item.label || "";
  btnColor.value = item.color || "#5b8cff";
  btnCategory.value = item.category || DEFAULT_CATEGORY;
  createBtn.textContent = "Änderungen speichern";
  drawerTitle.textContent = "Button bearbeiten";
  cancelEditBtn.classList.remove("hidden");
  openDrawer();
  btnText.focus();
}

function createOrUpdateButton(){
  const text = btnText.value.trim();
  const color = btnColor.value;
  const label = btnLabel.value.trim();
  const category = btnCategory.value;

  if (!text){
    alert("Bitte einen Button-Text eingeben.");
    btnText.focus();
    return;
  }

  const payload = normalizeButton({ text, color, label, category });

  if (editIndex !== null){
    buttons[editIndex] = payload;
  } else {
    const insertIndex = findInsertIndexForCategory(category);
    buttons.splice(insertIndex, 0, payload);
  }

  saveButtons();
  renderButtons();
  resetEditor();
  closeDrawer();
}

function findInsertIndexForCategory(category){
  const lastIndex = buttons.map(btn => btn.category).lastIndexOf(category);
  return lastIndex === -1 ? buttons.length : lastIndex + 1;
}

function moveWithinCategory(index, direction){
  const category = buttons[index]?.category;
  if (!category) return;
  const sameCategoryIndexes = buttons
    .map((btn, idx) => ({ category: btn.category, idx }))
    .filter(item => item.category === category)
    .map(item => item.idx);

  const position = sameCategoryIndexes.indexOf(index);
  const targetPosition = position + direction;
  if (position === -1 || targetPosition < 0 || targetPosition >= sameCategoryIndexes.length) return;

  const targetIndex = sameCategoryIndexes[targetPosition];
  [buttons[index], buttons[targetIndex]] = [buttons[targetIndex], buttons[index]];
  saveButtons();
  renderButtons();

  if (editIndex === index) editIndex = targetIndex;
  else if (editIndex === targetIndex) editIndex = index;
}

function copyReport(){
  if (!reportText.value.trim()){
    alert("Deine Auswahl ist noch leer.");
    return;
  }

  navigator.clipboard.writeText(reportText.value).then(() => {
    alert("Bericht kopiert. Jetzt in Ninox einfügen.");
  }).catch(() => {
    alert("Kopieren hat nicht geklappt. Bitte manuell kopieren.");
  });
}

function exportButtons(){
  const blob = new Blob([JSON.stringify(buttons, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ninox-bericht-buttons-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importButtons(file){
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("Ungültiges Format");
      const cleaned = data.map(normalizeButton).filter(Boolean);

      buttons.length = 0;
      buttons.push(...cleaned);
      saveButtons();
      renderButtons();
      resetEditor();
      alert("Buttons erfolgreich importiert.");
    } catch (e) {
      alert("Import fehlgeschlagen. Bitte eine gültige JSON-Datei verwenden.");
    }
  };
  reader.readAsText(file);
}

createBtn.addEventListener("click", createOrUpdateButton);
cancelEditBtn.addEventListener("click", resetEditor);
document.getElementById("finishBtn").addEventListener("click", copyReport);
document.getElementById("undoBtn").addEventListener("click", () => {
  if (!reportEntries.length) return;
  reportEntries.pop();
  saveEntries();
  renderReport();
});
document.getElementById("clearReportBtn").addEventListener("click", () => {
  if (!reportEntries.length) return;
  if (confirm("Komplette Auswahl leeren?")) {
    reportEntries.length = 0;
    saveEntries();
    renderReport();
  }
});
document.getElementById("exportBtn").addEventListener("click", exportButtons);
importInput.addEventListener("change", (event) => importButtons(event.target.files[0]));
toggleCreatorBtn.addEventListener("click", () => openDrawer());
closeCreatorBtn.addEventListener("click", () => {
  closeDrawer();
  resetEditor();
});
addFreeEntryBtn.addEventListener("click", addFreeEntry);

btnText.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") createOrUpdateButton();
});
freeEntryText.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") addFreeEntry();
});

if (localStorage.getItem(DRAWER_KEY) === "1") openDrawer();
else closeDrawer();

resetEditor();
renderButtons();
renderReport();
updateStats();
