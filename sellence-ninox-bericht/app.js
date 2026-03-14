const STORAGE_KEY = "sellenceNinoxButtonsV6";
const DRAWER_KEY = "ninoxCreatorOpen";
const buttons = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

let editIndex = null;

const buttonArea = document.getElementById("buttonArea");
const reportText = document.getElementById("reportText");
const btnText = document.getElementById("btnText");
const btnColor = document.getElementById("btnColor");
const btnLabel = document.getElementById("btnLabel");
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

function saveButtons(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
}

function updateStats(){
  buttonCount.textContent = `${buttons.length} Button${buttons.length === 1 ? "" : "s"}`;
  const lines = reportText.value.trim() ? reportText.value.trim().split("\n").length : 0;
  lineCount.textContent = `${lines} Zeile${lines === 1 ? "" : "n"}`;
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

function renderButtons(){
  buttonArea.innerHTML = "";
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

    cardBtn.addEventListener("click", () => addLine(item.text));

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
      moveButton(index, -1);
    });

    moveRightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveButton(index, 1);
    });

    buttonArea.appendChild(fragment);
  });

  updateStats();
}

function addLine(text){
  reportText.value += (reportText.value ? "\n" : "") + text;
  updateStats();
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

  if (!text){
    alert("Bitte einen Button-Text eingeben.");
    btnText.focus();
    return;
  }

  const payload = { text, color, label };

  if (editIndex !== null){
    buttons[editIndex] = payload;
  } else {
    buttons.unshift(payload);
  }

  saveButtons();
  renderButtons();
  resetEditor();
  closeDrawer();
}

function moveButton(index, direction){
  const target = index + direction;
  if (target < 0 || target >= buttons.length) return;
  [buttons[index], buttons[target]] = [buttons[target], buttons[index]];
  saveButtons();
  renderButtons();

  if (editIndex === index) editIndex = target;
  else if (editIndex === target) editIndex = index;
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
      const cleaned = data
        .filter(item => item && typeof item.text === "string")
        .map(item => ({
          text: item.text.trim(),
          label: typeof item.label === "string" ? item.label.trim() : "",
          color: typeof item.color === "string" ? item.color : "#5b8cff"
        }))
        .filter(item => item.text);

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
  if (!reportText.value.trim()) return;
  const lines = reportText.value.split("\n");
  lines.pop();
  reportText.value = lines.join("\n").trim();
  updateStats();
});
document.getElementById("clearReportBtn").addEventListener("click", () => {
  if (!reportText.value.trim()) return;
  if (confirm("Komplette Auswahl leeren?")) {
    reportText.value = "";
    updateStats();
  }
});
document.getElementById("exportBtn").addEventListener("click", exportButtons);
importInput.addEventListener("change", (event) => importButtons(event.target.files[0]));
toggleCreatorBtn.addEventListener("click", () => openDrawer());
closeCreatorBtn.addEventListener("click", () => {
  closeDrawer();
  resetEditor();
});

btnText.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") createOrUpdateButton();
});

if (localStorage.getItem(DRAWER_KEY) === "1") openDrawer();
else closeDrawer();

resetEditor();
renderButtons();
updateStats();
