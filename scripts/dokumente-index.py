#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS_ROOT = PROJECT_ROOT / "assets" / "dokumente"
EXCLUDED = {"dateien.json", "dateien.js", ".gitkeep", "Thumbs.db", ".DS_Store"}

DOCUMENTS_ROOT.mkdir(parents=True, exist_ok=True)
items = []
for file in sorted(DOCUMENTS_ROOT.rglob("*"), key=lambda p: str(p).lower()):
    if not file.is_file() or file.name in EXCLUDED:
        continue
    stat = file.stat()
    items.append({
        "name": file.name,
        "path": file.relative_to(DOCUMENTS_ROOT).as_posix(),
        "extension": file.suffix.lstrip(".").lower(),
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).astimezone().isoformat(timespec="seconds"),
    })

json_text = json.dumps(items, ensure_ascii=False, indent=2)
(DOCUMENTS_ROOT / "dateien.json").write_text(json_text + "\n", encoding="utf-8")
(DOCUMENTS_ROOT / "dateien.js").write_text(
    "window.SELLENCE_DOCUMENTS = " + json_text + ";\n", encoding="utf-8"
)
print(f"SELLENCE Dokumentenliste aktualisiert: {len(items)} Datei(en).")
