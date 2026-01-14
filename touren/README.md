# SELLENCE-TOURENPLANER (SAP) – OSRM v1 (kostenlos)
## Start
Lokal:
python -m http.server 8080

## Workflow
1) Excel importieren
2) (einmalig) Geocoding, damit lat/lng gespeichert werden
3) SAP suchen -> Marker -> "In Route +"
4) Optimieren (OSRM Trip, echte Straßenroute)
5) Planen -> Google Maps öffnet sich mit allen Stops

## Hinweise
- OSRM Public Server ist kostenlos, aber nicht garantiert (best effort).
- Google Maps wird nur per Link geöffnet (keine kostenpflichtige API).
