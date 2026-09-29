SELLENCE-VERTRAGSLEITFADEN-CREATOR
==================================

Start:
1. index.html im Browser öffnen.
2. Marktname, Vertragsstart, Vertragsende, Ansprechpartner und optional Telefonnummer eingeben. Das Datum kann direkt als TT.MM.JJJJ getippt werden.
3. Die vier DIS-Vertragsseiten als JPG/PNG/WebP oder per Kamera erfassen.
4. "Seiten analysieren" klicken.
5. Erkannte Artikel prüfen und bei Bedarf über die EAN-Datenbank ergänzen/entfernen.
6. "PDF erstellen" erzeugt eine druckfertige A4-PDF mit groß dargestellten, unverzerrten und scanbaren EAN-Barcodes.

Wichtig:
- Die Markierungserkennung ist auf die 4 bereitgestellten DIS-Anlagen abgestimmt:
  VEEV, NBL Zigarette, Other Tobacco Products (OTP), Heat-not-Burn.
- Die Pflichtblöcke der Zigaretten- und Heat-not-Burn-Anlage werden entsprechend der Vorlage als Pflichtartikel übernommen. Freie Auswahl wird anhand der handschriftlichen Markierungen erkannt.
- Bei Kameraaufnahmen: komplette Seite, möglichst gerade und ohne harte Schatten aufnehmen. Die Ergebnisliste vor dem PDF-Export kurz prüfen.
- JPG/PNG/Kamera funktionieren vollständig lokal/offline.
- Für direkten PDF-Import wird PDF.js über cdnjs geladen; dafür ist beim Import eine Internetverbindung nötig. Alternativ die PDF-Seiten als Bilder exportieren oder mit der Kamera erfassen.
- Die EAN-Datenbank ist im Programm eingebettet (260 Barcode-Datensätze). Für ältere Vertragspositionen ohne exakten aktuellen Treffer zeigt das Programm einen Prüfhinweis an.
- Ansprechpartner und Telefonnummer können über die jeweiligen „Merken“-Haken lokal im Browser gespeichert werden.

Hinweis zur PDF:
Die erzeugte PDF ist als Markt-Arbeitshilfe gedacht und ersetzt nicht den Originalvertrag.


UPDATE 24.09.2026 - EAN-DATENBANK
--------------------------------
Die EAN-Datenbank wurde anhand der mitgelieferten offiziellen Sortimentsübersichten aktualisiert.
Aktuelle Datensätze enthalten getrennte Packungs-EAN und Gebinde-EAN. Im Export kann die gewünschte Variante ausgewählt werden.
Hat ein Artikel laut Sortimentsübersicht keine Gebinde-EAN (z. B. einzelne Geräte/Boxen), nutzt der Export die vorhandene EAN und kennzeichnet sie als Ersatz.
Die aus den PDFs sauber ausgeschnittenen Barcode-Dateien liegen zusätzlich unter database/ean/current_2026/.
