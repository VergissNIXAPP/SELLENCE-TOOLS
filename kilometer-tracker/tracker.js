(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const STORAGE = {
    profile: "sellence_km_profile_v1",
    days: "sellence_km_days_v1",
    active: "sellence_km_active_v1",
    cache: "sellence_km_market_cache_v1"
  };
  const STOP_DELAY_MS = 10 * 60 * 1000;
  const STATIONARY_RADIUS_M = 80;
  const LEAVE_RADIUS_M = 125;
  const MIN_DISTANCE_M = 8;
  const MAX_ACCURACY_M = 120;
  const MAX_SPEED_KMH = 190;
  const MAX_POINTS_PER_DAY = 3500;
  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];

  let profile = load(STORAGE.profile, { name: "" });
  let days = load(STORAGE.days, []);
  let active = load(STORAGE.active, null);
  let marketCache = load(STORAGE.cache, {});
  let watchId = null;
  let wakeLock = null;
  let timerId = null;
  let stationary = null;
  let lastLivePosition = null;
  let deferredInstall = null;
  let editingRef = null;
  let lookupBusy = false;
  let toastTimer = null;

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { console.warn(err); }
  }

  function uid() {
    return crypto?.randomUUID?.() || `km_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function round(value, digits = 3) {
    const p = 10 ** digits;
    return Math.round((Number(value) || 0) * p) / p;
  }

  function parseNumber(value, fallback = 0) {
    const n = Number(String(value ?? "").trim().replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }

  function fmtKm(value) {
    return `${(Number(value) || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
  }

  function fmtDate(value) {
    if (!value) return "–";
    return new Date(value).toLocaleDateString("de-DE");
  }

  function fmtTime(value) {
    if (!value) return "–";
    return new Date(value).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDateTimeLocal(value) {
    if (!value) return "";
    const d = new Date(value);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function dateOnly(value) {
    const d = new Date(value || Date.now());
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function durationText(ms) {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
  }

  function shortDuration(ms) {
    const totalMin = Math.max(0, Math.round((ms || 0) / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? `${h} Std. ${m} Min.` : `${m} Min.`;
  }

  function totalKm(day) {
    if (Number.isFinite(Number(day.manualTotalKm)) && day.manualTotalKm !== null && day.manualTotalKm !== "") {
      return Math.max(0, Number(day.manualTotalKm));
    }
    return Math.max(0, (Number(day.gpsKm) || 0) + (Number(day.adjustmentKm) || 0));
  }

  function haversine(a, b) {
    if (!a || !b) return 0;
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function showToast(title, text) {
    $("toastTitle").textContent = title;
    $("toastText").textContent = text;
    $("toast").setAttribute("aria-hidden", "false");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").setAttribute("aria-hidden", "true"), 3300);
  }

  function persistAll() {
    save(STORAGE.profile, profile);
    save(STORAGE.days, days);
    if (active) {
      save(STORAGE.active, active);
    } else {
      try { localStorage.removeItem(STORAGE.active); } catch (err) { console.warn(err); }
    }
    save(STORAGE.cache, marketCache);
  }

  function normalizeLoadedData() {
    if (!Array.isArray(days)) days = [];
    days = days.filter(Boolean).map(normalizeDay);
    if (active) active = normalizeDay(active, true);
    if (!profile || typeof profile !== "object") profile = { name: "" };
    profile.name = String(profile.name || "");
  }

  function normalizeDay(day, isActive = false) {
    const d = { ...day };
    d.id = d.id || uid();
    d.name = String(d.name || profile?.name || "");
    d.startedAt = Number(d.startedAt) || Date.now();
    d.endedAt = d.endedAt ? Number(d.endedAt) : null;
    d.gpsKm = Number(d.gpsKm) || 0;
    d.adjustmentKm = Number(d.adjustmentKm) || 0;
    d.manualTotalKm = d.manualTotalKm === null || d.manualTotalKm === "" || d.manualTotalKm === undefined ? null : Number(d.manualTotalKm);
    d.points = Array.isArray(d.points) ? d.points : [];
    d.stops = Array.isArray(d.stops) ? d.stops.map(stop => ({
      id: stop.id || uid(),
      name: String(stop.name || "Unbekannter Standort"),
      chain: String(stop.chain || ""),
      source: stop.source || "manual",
      lat: Number(stop.lat),
      lon: Number(stop.lon),
      arrival: Number(stop.arrival) || d.startedAt,
      departure: stop.departure ? Number(stop.departure) : null,
      address: String(stop.address || ""),
      confidence: String(stop.confidence || "")
    })) : [];
    d.notes = String(d.notes || "");
    d.status = isActive ? "active" : "finished";
    return d;
  }

  function startTracking() {
    const name = $("userName").value.trim();
    if (!name) {
      showToast("Name fehlt", "Bitte zuerst den Namen des Nutzers eintragen.");
      $("userName").focus();
      return;
    }
    if (!navigator.geolocation) {
      showToast("GPS nicht verfügbar", "Dieser Browser unterstützt keine Standorterfassung.");
      return;
    }
    profile.name = name;
    save(STORAGE.profile, profile);

    if (!active) {
      active = normalizeDay({
        id: uid(),
        name,
        startedAt: Date.now(),
        endedAt: null,
        gpsKm: 0,
        adjustmentKm: 0,
        manualTotalKm: null,
        points: [],
        stops: [],
        notes: "",
        status: "active",
        startLocation: null,
        endLocation: null,
        rejectedPoints: 0
      }, true);
      stationary = null;
      lastLivePosition = null;
    } else {
      active.name = name;
    }

    if (watchId !== null) return;
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 20000
    });
    requestWakeLock();
    startTimer();
    persistAll();
    render();
    showToast("Tracking gestartet", "Der Arbeitstag läuft. Bitte die App möglichst geöffnet lassen.");
  }

  function stopTracking() {
    if (!active) return;
    const ok = confirm("Arbeitstag wirklich beenden und als abgeschlossen speichern?");
    if (!ok) return;
    stopGpsWatch();
    const now = Date.now();
    closeOpenStop(now);
    active.endedAt = now;
    active.status = "finished";
    active.endLocation = lastLivePosition ? { lat: lastLivePosition.lat, lon: lastLivePosition.lon } : active.endLocation || null;
    active.name = $("userName").value.trim() || active.name || profile.name;
    days.unshift(normalizeDay(active));
    active = null;
    stationary = null;
    lastLivePosition = null;
    persistAll();
    render();
    showToast("Feierabend gespeichert", "Der Arbeitstag wurde in die Übersicht übernommen.");
  }

  function stopGpsWatch() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    releaseWakeLock();
  }

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (err) {
      console.warn("Wake Lock nicht verfügbar", err);
    }
  }

  async function releaseWakeLock() {
    try { await wakeLock?.release?.(); } catch {}
    wakeLock = null;
  }

  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (active && stationary && !stationary.activeStopId && Date.now() - stationary.startedAt >= STOP_DELAY_MS) {
        createAutomaticStop(stationary);
      }
      renderLiveMetrics();
      renderStationary();
    }, 1000);
  }

  function onPosition(position) {
    if (!active) return;
    const p = {
      lat: Number(position.coords.latitude),
      lon: Number(position.coords.longitude),
      accuracy: Number(position.coords.accuracy) || 999,
      speed: Number.isFinite(position.coords.speed) ? Number(position.coords.speed) : null,
      heading: Number.isFinite(position.coords.heading) ? Number(position.coords.heading) : null,
      at: Number(position.timestamp) || Date.now()
    };
    lastLivePosition = p;
    if (!active.startLocation) active.startLocation = { lat: p.lat, lon: p.lon };
    active.endLocation = { lat: p.lat, lon: p.lon };

    const previous = active.points[active.points.length - 1] || null;
    const acceptableAccuracy = p.accuracy <= MAX_ACCURACY_M;

    if (!previous) {
      active.points.push(p);
    } else if (acceptableAccuracy) {
      const distanceM = haversine(previous, p);
      const seconds = Math.max(1, (p.at - previous.at) / 1000);
      const computedSpeed = (distanceM / seconds) * 3.6;
      const sensorSpeed = p.speed === null ? null : p.speed * 3.6;
      const speedKmh = sensorSpeed !== null && sensorSpeed >= 0 ? Math.max(sensorSpeed, computedSpeed) : computedSpeed;
      const jitterThreshold = Math.max(MIN_DISTANCE_M, Math.min(28, (previous.accuracy + p.accuracy) * 0.12));
      const plausible = speedKmh <= MAX_SPEED_KMH && distanceM <= 12000;

      if (plausible && distanceM >= jitterThreshold) {
        active.gpsKm = round(active.gpsKm + distanceM / 1000, 4);
      } else if (!plausible) {
        active.rejectedPoints = (active.rejectedPoints || 0) + 1;
      }

      const shouldStore = distanceM >= 15 || (p.at - previous.at) >= 30000 || active.points.length < 2;
      if (shouldStore) active.points.push(p);
    } else {
      active.rejectedPoints = (active.rejectedPoints || 0) + 1;
    }

    if (active.points.length > MAX_POINTS_PER_DAY) {
      active.points = active.points.filter((_, idx) => idx % 2 === 0);
    }

    updateStationary(p);
    persistAll();
    renderLiveMetrics();
    renderStatus();
  }

  function onPositionError(error) {
    const messages = {
      1: "Standortzugriff wurde verweigert. Bitte GPS-Berechtigung im Browser erlauben.",
      2: "Standort ist momentan nicht verfügbar.",
      3: "Die Standortabfrage hat zu lange gedauert. Die App versucht es weiter."
    };
    showToast("GPS-Hinweis", messages[error.code] || "Standort konnte nicht gelesen werden.");
    if (error.code === 1) {
      stopGpsWatch();
      render();
    } else {
      renderStatus("GPS sucht …");
    }
  }

  function updateStationary(point) {
    if (!active || point.accuracy > MAX_ACCURACY_M) return;
    if (!stationary) {
      stationary = {
        anchor: { lat: point.lat, lon: point.lon },
        startedAt: point.at,
        lastAt: point.at,
        activeStopId: null,
        moveCount: 0
      };
      return;
    }

    const distance = haversine(stationary.anchor, point);
    const insideRadius = distance <= Math.max(STATIONARY_RADIUS_M, point.accuracy * 1.25);

    if (insideRadius) {
      stationary.lastAt = point.at;
      stationary.moveCount = 0;
      if (!stationary.activeStopId && point.at - stationary.startedAt >= STOP_DELAY_MS) {
        createAutomaticStop(stationary);
      }
      if (stationary.activeStopId) {
        const stop = active.stops.find(item => item.id === stationary.activeStopId);
        if (stop) stop.departure = null;
      }
      return;
    }

    if (stationary.activeStopId && distance >= Math.max(LEAVE_RADIUS_M, point.accuracy * 1.5)) {
      stationary.moveCount += 1;
      if (stationary.moveCount >= 2) {
        const stop = active.stops.find(item => item.id === stationary.activeStopId);
        if (stop) stop.departure = stationary.lastAt || point.at;
        stationary = {
          anchor: { lat: point.lat, lon: point.lon },
          startedAt: point.at,
          lastAt: point.at,
          activeStopId: null,
          moveCount: 0
        };
      }
      return;
    }

    if (!stationary.activeStopId) {
      stationary = {
        anchor: { lat: point.lat, lon: point.lon },
        startedAt: point.at,
        lastAt: point.at,
        activeStopId: null,
        moveCount: 0
      };
    }
  }

  function closeOpenStop(at) {
    if (!active) return;
    const open = active.stops.find(stop => !stop.departure);
    if (open) open.departure = at;
  }

  async function createAutomaticStop(candidate) {
    if (!active || candidate.activeStopId) return;
    const duplicate = active.stops.find(stop => {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return false;
      const near = haversine({ lat: stop.lat, lon: stop.lon }, candidate.anchor) < 120;
      const recent = Math.abs((stop.arrival || 0) - candidate.startedAt) < 30 * 60 * 1000;
      return near && recent;
    });
    if (duplicate) {
      candidate.activeStopId = duplicate.id;
      duplicate.departure = null;
      return;
    }

    const stop = {
      id: uid(),
      name: "Standort wird erkannt …",
      chain: "",
      source: "auto",
      lat: candidate.anchor.lat,
      lon: candidate.anchor.lon,
      arrival: candidate.startedAt,
      departure: null,
      address: "",
      confidence: ""
    };
    active.stops.push(stop);
    candidate.activeStopId = stop.id;
    persistAll();
    renderLiveTimeline();

    if (lookupBusy) {
      stop.name = "Automatisch erkannter Stopp";
      persistAll();
      renderLiveTimeline();
      return;
    }

    lookupBusy = true;
    try {
      const market = await lookupNearbyMarket(stop.lat, stop.lon);
      if (market) {
        stop.name = market.name;
        stop.chain = market.chain;
        stop.address = market.address;
        stop.confidence = `${Math.round(market.distance)} m entfernt`;
        showToast("Markt erkannt", `${market.name} wurde automatisch als Stopp übernommen.`);
      } else {
        stop.name = "Automatisch erkannter Stopp";
        stop.confidence = "Kein passender Markt in OpenStreetMap gefunden";
      }
    } catch (err) {
      console.warn(err);
      stop.name = "Automatisch erkannter Stopp";
      stop.confidence = "Marktsuche nicht erreichbar";
    } finally {
      lookupBusy = false;
      persistAll();
      renderLiveTimeline();
    }
  }

  function cacheKey(lat, lon) {
    return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  }

  async function lookupNearbyMarket(lat, lon) {
    const key = cacheKey(lat, lon);
    const cached = marketCache[key];
    if (cached && Date.now() - cached.cachedAt < 30 * 24 * 60 * 60 * 1000) return cached.value;

    const regex = "rewe|edeka|famila|markant|globus|nah.?(&|und).?frisch|citti";
    const query = `[out:json][timeout:14];(nwr(around:320,${lat},${lon})[\"shop\"~\"supermarket|convenience|department_store|mall\"];nwr(around:320,${lat},${lon})[\"name\"~\"${regex}\",i];nwr(around:320,${lat},${lon})[\"brand\"~\"${regex}\",i];);out center tags;`;
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: `data=${encodeURIComponent(query)}`
        });
        if (!response.ok) throw new Error(`Overpass ${response.status}`);
        const data = await response.json();
        const candidates = (data.elements || []).map(element => {
          const tags = element.tags || {};
          const elLat = Number(element.lat ?? element.center?.lat);
          const elLon = Number(element.lon ?? element.center?.lon);
          const rawName = String(tags.name || tags.brand || tags.operator || "").trim();
          if (!rawName || !Number.isFinite(elLat) || !Number.isFinite(elLon)) return null;
          const chain = detectChain(`${rawName} ${tags.brand || ""} ${tags.operator || ""}`);
          const distance = haversine({ lat, lon }, { lat: elLat, lon: elLon });
          const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
          const score = (chain ? 1000 : 0) + (tags.shop === "supermarket" ? 150 : 0) - distance;
          return { name: rawName, chain, distance, address, score };
        }).filter(Boolean).filter(item => item.chain && item.distance <= 320).sort((a, b) => b.score - a.score);

        const value = candidates[0] || null;
        marketCache[key] = { cachedAt: Date.now(), value };
        save(STORAGE.cache, marketCache);
        return value;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Marktsuche fehlgeschlagen");
  }

  function detectChain(text) {
    const value = String(text || "").toLowerCase();
    if (/\brewe\b/.test(value)) return "REWE";
    if (/edeka/.test(value)) return "EDEKA";
    if (/famila/.test(value)) return "famila";
    if (/markant/.test(value)) return "Markant";
    if (/globus/.test(value)) return "Globus";
    if (/nah\s*[&+]\s*frisch|nah\s+und\s+frisch/.test(value)) return "Nah & Frisch";
    if (/citti/.test(value)) return "CITTI";
    return "";
  }

  function addManualStop() {
    if (!active) return;
    const now = Date.now();
    active.stops.push({
      id: uid(),
      name: "Manueller Stopp",
      chain: "",
      source: "manual",
      lat: lastLivePosition?.lat ?? NaN,
      lon: lastLivePosition?.lon ?? NaN,
      arrival: now,
      departure: now,
      address: "",
      confidence: ""
    });
    persistAll();
    renderLiveTimeline();
    openEdit(active.id, true);
  }

  function render() {
    $("userName").value = active?.name || profile.name || "";
    renderStatus();
    renderLiveMetrics();
    renderStationary();
    renderLiveTimeline();
    renderOverview();
    const canTrack = !!active;
    $("startBtn").disabled = watchId !== null;
    $("startBtn").innerHTML = active && watchId === null ? "<span>▶</span> Tracking fortsetzen" : "<span>▶</span> Arbeitstag starten";
    $("stopBtn").disabled = !canTrack;
    $("editActiveBtn").disabled = !canTrack;
    $("addStopBtn").disabled = !canTrack;
  }

  function renderStatus(forcedText = "") {
    const isLive = watchId !== null;
    $("pulseDot").classList.toggle("live", isLive);
    $("gpsPill").classList.toggle("live", isLive);
    $("gpsPill").textContent = isLive ? "GPS aktiv" : active ? "Pausiert" : "GPS aus";
    $("trackingState").textContent = forcedText || (isLive ? "Tracking läuft" : active ? "Tracking pausiert" : "Bereit");
    $("trackingSub").textContent = active ? `Gestartet ${fmtTime(active.startedAt)} · ${active.name || "ohne Name"}` : "Noch kein aktiver Arbeitstag";
    $("accuracyText").textContent = lastLivePosition ? `± ${Math.round(lastLivePosition.accuracy)} m` : "–";
  }

  function renderLiveMetrics() {
    const km = active ? totalKm(active) : 0;
    $("liveKm").textContent = fmtKm(km);
    $("gpsKm").textContent = fmtKm(active?.gpsKm || 0);
    $("adjustmentKm").textContent = fmtKm(active?.adjustmentKm || 0);
    $("liveStops").textContent = String(active?.stops?.length || 0);
    $("liveDuration").textContent = active ? durationText((active.endedAt || Date.now()) - active.startedAt) : "00:00:00";
  }

  function renderStationary() {
    if (!active || !stationary) {
      $("stationaryText").textContent = "Noch kein Standort-Stopp erkannt";
      $("stationaryTime").textContent = "00:00";
      $("stationaryBar").style.width = "0%";
      $("stationaryPill").textContent = active ? "In Bewegung" : "Bereit";
      return;
    }
    const elapsed = Math.max(0, Date.now() - stationary.startedAt);
    const progress = Math.min(100, elapsed / STOP_DELAY_MS * 100);
    $("stationaryTime").textContent = durationText(elapsed).slice(3);
    $("stationaryBar").style.width = `${progress}%`;
    if (stationary.activeStopId) {
      $("stationaryText").textContent = "Stopp aktiv – Abfahrt wird automatisch erkannt";
      $("stationaryPill").textContent = "Stopp erkannt";
    } else {
      $("stationaryText").textContent = progress > 5 ? "Aufenthalt wird geprüft" : "Standortbeobachtung aktiv";
      $("stationaryPill").textContent = progress > 5 ? "Aufenthalt" : "In Bewegung";
    }
  }

  function renderLiveTimeline() {
    const root = $("liveTimeline");
    const stops = active?.stops || [];
    if (!stops.length) {
      root.innerHTML = `<div class="emptyState"><span>◎</span><strong>Noch keine Stopps</strong><p>Automatisch erkannte und manuell eingetragene Stopps erscheinen hier.</p></div>`;
      return;
    }
    root.innerHTML = [...stops].sort((a, b) => b.arrival - a.arrival).map(stop => {
      const isOpen = !stop.departure;
      const duration = (stop.departure || Date.now()) - stop.arrival;
      const meta = [stop.chain, stop.address, stop.confidence].filter(Boolean).join(" · ");
      return `<div class="timelineItem${isOpen ? " active" : ""}">
        <div class="timelineDot"></div>
        <div><strong>${escapeHtml(stop.name)}</strong><span>${escapeHtml(meta || (stop.source === "auto" ? "Automatisch erkannt" : "Manuell eingetragen"))}</span></div>
        <time>${fmtTime(stop.arrival)}${isOpen ? " – jetzt" : ` – ${fmtTime(stop.departure)}`}<br>${shortDuration(duration)}</time>
      </div>`;
    }).join("");
  }

  function filteredDays() {
    const from = $("fromDate").value ? new Date(`${$("fromDate").value}T00:00:00`).getTime() : -Infinity;
    const to = $("toDate").value ? new Date(`${$("toDate").value}T23:59:59.999`).getTime() : Infinity;
    return days.filter(day => day.startedAt >= from && day.startedAt <= to).sort((a, b) => b.startedAt - a.startedAt);
  }

  function renderOverview() {
    const list = filteredDays();
    const sumKm = list.reduce((sum, day) => sum + totalKm(day), 0);
    const stopCount = list.reduce((sum, day) => sum + (day.stops?.length || 0), 0);
    $("periodKm").textContent = fmtKm(sumKm);
    $("periodDays").textContent = String(list.length);
    $("periodStops").textContent = String(stopCount);
    $("periodAverage").textContent = fmtKm(list.length ? sumKm / list.length : 0);

    const body = $("daysBody");
    if (!list.length) {
      body.innerHTML = `<tr><td class="emptyRow" colspan="8">Für den gewählten Zeitraum sind noch keine abgeschlossenen Arbeitstage gespeichert.</td></tr>`;
      return;
    }
    body.innerHTML = list.map(day => `<tr>
      <td><strong>${fmtDate(day.startedAt)}</strong></td>
      <td>${escapeHtml(day.name || "–")}</td>
      <td>${fmtTime(day.startedAt)} – ${fmtTime(day.endedAt)}<br><small>${shortDuration((day.endedAt || day.startedAt) - day.startedAt)}</small></td>
      <td class="num">${day.stops?.length || 0}</td>
      <td class="num">${fmtKm(day.gpsKm)}</td>
      <td class="num">${fmtSignedKm(day.adjustmentKm)}</td>
      <td class="num"><strong>${fmtKm(totalKm(day))}</strong></td>
      <td><div class="rowActions"><button class="tableBtn" data-edit-day="${day.id}" type="button">Bearbeiten</button></div></td>
    </tr>`).join("");
  }

  function fmtSignedKm(value) {
    const n = Number(value) || 0;
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
  }

  function openEdit(id, isActive = false) {
    const target = isActive ? active : days.find(day => day.id === id);
    if (!target) return;
    editingRef = { id: target.id, isActive };
    $("editTitle").textContent = isActive ? "Aktueller Arbeitstag" : `Arbeitstag ${fmtDate(target.startedAt)}`;
    $("editName").value = target.name || "";
    $("editDate").value = dateOnly(target.startedAt);
    $("editStart").value = fmtDateTimeLocal(target.startedAt);
    $("editEnd").value = fmtDateTimeLocal(target.endedAt);
    $("editGpsKm").value = `${round(target.gpsKm, 2).toFixed(2).replace(".", ",")} km`;
    $("editAdjustment").value = round(target.adjustmentKm, 2);
    $("editManualTotal").value = target.manualTotalKm === null || target.manualTotalKm === undefined ? "" : round(target.manualTotalKm, 2);
    $("editNotes").value = target.notes || "";
    $("deleteDayBtn").style.display = isActive ? "none" : "inline-flex";
    renderEditStops(target.stops || []);
    $("editModal").setAttribute("aria-hidden", "false");
  }

  function closeEdit() {
    $("editModal").setAttribute("aria-hidden", "true");
    editingRef = null;
  }

  function currentEditingDay() {
    if (!editingRef) return null;
    return editingRef.isActive ? active : days.find(day => day.id === editingRef.id);
  }

  function renderEditStops(stops) {
    const root = $("editStops");
    if (!stops.length) {
      root.innerHTML = `<div class="emptyState"><strong>Keine Stopps vorhanden</strong><p>Du kannst einen Stopp manuell hinzufügen.</p></div>`;
      return;
    }
    root.innerHTML = stops.map(stop => `<div class="editStop" data-stop-id="${stop.id}">
      <label>Markt / Bezeichnung<input class="field stopName" value="${escapeAttr(stop.name)}"></label>
      <label>Ankunft<input class="field stopArrival" type="datetime-local" value="${fmtDateTimeLocal(stop.arrival)}"></label>
      <label>Abfahrt<input class="field stopDeparture" type="datetime-local" value="${fmtDateTimeLocal(stop.departure)}"></label>
      <button class="removeStop" type="button" title="Stopp löschen">✕</button>
    </div>`).join("");
  }

  function addStopToEditor() {
    const day = currentEditingDay();
    if (!day) return;
    const at = day.endedAt || Date.now();
    day.stops.push({ id: uid(), name: "Neuer Stopp", chain: "", source: "manual", lat: NaN, lon: NaN, arrival: at, departure: at, address: "", confidence: "" });
    renderEditStops(day.stops);
  }

  function syncStopInputs(day) {
    const rows = [...$("editStops").querySelectorAll(".editStop")];
    for (const row of rows) {
      const stop = day.stops.find(item => item.id === row.dataset.stopId);
      if (!stop) continue;
      stop.name = row.querySelector(".stopName").value.trim() || "Unbenannter Stopp";
      const arrival = new Date(row.querySelector(".stopArrival").value).getTime();
      const departureValue = row.querySelector(".stopDeparture").value;
      const departure = departureValue ? new Date(departureValue).getTime() : null;
      if (Number.isFinite(arrival)) stop.arrival = arrival;
      stop.departure = Number.isFinite(departure) ? departure : null;
    }
  }

  function saveEdit() {
    const day = currentEditingDay();
    if (!day) return;
    syncStopInputs(day);
    day.name = $("editName").value.trim() || day.name || profile.name;
    const selectedDate = $("editDate").value;
    const startRaw = $("editStart").value;
    const endRaw = $("editEnd").value;
    const startTime = startRaw.includes("T") ? startRaw.split("T")[1] : "00:00";
    const endTime = endRaw.includes("T") ? endRaw.split("T")[1] : "";
    const start = new Date(`${selectedDate || startRaw.split("T")[0]}T${startTime}`).getTime();
    const end = endTime ? new Date(`${selectedDate || endRaw.split("T")[0]}T${endTime}`).getTime() : null;
    if (Number.isFinite(start)) day.startedAt = start;
    day.endedAt = Number.isFinite(end) ? end : null;
    day.adjustmentKm = round(parseNumber($("editAdjustment").value, 0), 2);
    const manualValue = $("editManualTotal").value.trim();
    day.manualTotalKm = manualValue === "" ? null : Math.max(0, round(parseNumber(manualValue, 0), 2));
    day.notes = $("editNotes").value.trim();
    if (editingRef.isActive) active = normalizeDay(day, true);
    else days = days.map(item => item.id === day.id ? normalizeDay(day) : item);
    persistAll();
    closeEdit();
    render();
    showToast("Änderungen gespeichert", "Kilometer, Zeiten und Stopps wurden aktualisiert.");
  }

  function deleteEditingDay() {
    if (!editingRef || editingRef.isActive) return;
    if (!confirm("Diesen Arbeitstag mit allen Stopps wirklich löschen?")) return;
    days = days.filter(day => day.id !== editingRef.id);
    persistAll();
    closeEdit();
    render();
    showToast("Tag gelöscht", "Der Arbeitstag wurde entfernt.");
  }

  function setCurrentMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    $("fromDate").value = dateOnly(first);
    $("toDate").value = dateOnly(now);
    renderOverview();
  }

  function setAllTime() {
    if (!days.length) {
      $("fromDate").value = "";
      $("toDate").value = "";
    } else {
      const sorted = [...days].sort((a, b) => a.startedAt - b.startedAt);
      $("fromDate").value = dateOnly(sorted[0].startedAt);
      $("toDate").value = dateOnly(sorted[sorted.length - 1].startedAt);
    }
    renderOverview();
  }

  function exportCsv() {
    const list = filteredDays();
    if (!list.length) return showToast("Kein Export", "Im gewählten Zeitraum sind keine Daten vorhanden.");
    const rows = [["Datum", "Nutzer", "Start", "Ende", "Dauer", "Stopps", "GPS km", "Korrektur km", "Gesamt km", "Notiz"]];
    list.slice().reverse().forEach(day => rows.push([
      fmtDate(day.startedAt), day.name || "", fmtTime(day.startedAt), fmtTime(day.endedAt), shortDuration((day.endedAt || day.startedAt) - day.startedAt),
      day.stops?.length || 0, round(day.gpsKm, 2).toFixed(2).replace(".", ","), round(day.adjustmentKm, 2).toFixed(2).replace(".", ","), round(totalKm(day), 2).toFixed(2).replace(".", ","), day.notes || ""
    ]));
    const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `SELLENCE-Kilometer-${rangeFileName()}.csv`);
  }

  function exportPdf() {
    const list = filteredDays().slice().reverse();
    if (!list.length) return showToast("Kein Export", "Im gewählten Zeitraum sind keine Daten vorhanden.");
    try {
      const profileName = profile.name || list[0]?.name || "Nutzer";
      const blob = createSellencePdf(list, profileName, rangeLabel());
      downloadBlob(blob, `SELLENCE-Kilometer-${sanitizeFile(profileName)}-${rangeFileName()}.pdf`);
      showToast("PDF erstellt", "Die Fahrtenübersicht wurde als PDF heruntergeladen.");
    } catch (err) {
      console.error(err);
      showToast("PDF fehlgeschlagen", "Der PDF-Export konnte nicht erstellt werden.");
    }
  }

  function createSellencePdf(list, profileName, periodLabel) {
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 40;
    const pages = [];
    let page = null;
    let cursor = 0;

    const addPage = (continuation = false) => {
      page = [];
      pages.push(page);
      cursor = 42;
      if (continuation) {
        pdfFillRect(page, 0, 0, PAGE_W, 38, [7, 16, 34]);
        pdfText(page, MARGIN, 24, "SELLENCE KILOMETER-TRACKER · FORTSETZUNG", 11, "F2", [255, 255, 255]);
        cursor = 55;
      }
    };
    const ensure = height => {
      if (cursor + height > PAGE_H - 38) addPage(true);
    };
    const rowLine = (y, color = [222, 228, 238]) => pdfLine(page, MARGIN, y, PAGE_W - MARGIN, y, color, 0.5);

    addPage(false);
    pdfFillRect(page, 0, 0, PAGE_W, 112, [7, 16, 34]);
    pdfFillRect(page, 0, 105, PAGE_W, 7, [47, 228, 255]);
    pdfText(page, MARGIN, 37, "SELLENCE", 25, "F2", [255, 255, 255]);
    pdfText(page, MARGIN, 58, "KILOMETER-TRACKER · FAHRTENÜBERSICHT", 11, "F2", [190, 218, 255]);
    pdfText(page, MARGIN, 82, `Nutzer: ${profileName}`, 9.5, "F1", [255, 255, 255]);
    pdfText(page, 300, 82, `Zeitraum: ${periodLabel}`, 9.5, "F1", [255, 255, 255]);

    const periodKm = list.reduce((sum, day) => sum + totalKm(day), 0);
    const periodStops = list.reduce((sum, day) => sum + (day.stops?.length || 0), 0);
    cursor = 134;
    const summary = [
      ["GESAMTKILOMETER", fmtKm(periodKm)],
      ["ARBEITSTAGE", String(list.length)],
      ["STOPPS", String(periodStops)],
      ["Ø PRO TAG", fmtKm(list.length ? periodKm / list.length : 0)]
    ];
    summary.forEach((item, index) => {
      const x = MARGIN + index * 129;
      pdfFillRect(page, x, cursor, 117, 50, index % 2 ? [245, 248, 252] : [239, 244, 250]);
      pdfText(page, x + 9, cursor + 15, item[0], 6.8, "F2", [91, 105, 126]);
      pdfText(page, x + 9, cursor + 36, item[1], 13, "F2", [20, 31, 49]);
    });
    cursor += 72;

    pdfText(page, MARGIN, cursor, "ARBEITSTAGE", 12, "F2", [20, 31, 49]);
    cursor += 16;
    const dayCols = [MARGIN, 94, 210, 321, 365, 424, 488];
    pdfFillRect(page, MARGIN, cursor, PAGE_W - MARGIN * 2, 22, [113, 70, 210]);
    ["Datum", "Nutzer", "Zeitraum", "Stopps", "GPS", "Korr.", "Gesamt"].forEach((text, i) => pdfText(page, dayCols[i] + 4, cursor + 14, text, 7, "F2", [255, 255, 255]));
    cursor += 22;

    list.forEach((day, index) => {
      ensure(27);
      if (cursor < 70) {
        pdfFillRect(page, MARGIN, cursor, PAGE_W - MARGIN * 2, 22, [113, 70, 210]);
        ["Datum", "Nutzer", "Zeitraum", "Stopps", "GPS", "Korr.", "Gesamt"].forEach((text, i) => pdfText(page, dayCols[i] + 4, cursor + 14, text, 7, "F2", [255, 255, 255]));
        cursor += 22;
      }
      if (index % 2) pdfFillRect(page, MARGIN, cursor, PAGE_W - MARGIN * 2, 24, [247, 249, 252]);
      const values = [
        fmtDate(day.startedAt),
        pdfTrim(day.name || "–", 20),
        `${fmtTime(day.startedAt)} - ${fmtTime(day.endedAt)}`,
        String(day.stops?.length || 0),
        fmtKm(day.gpsKm),
        fmtSignedKm(day.adjustmentKm),
        fmtKm(totalKm(day))
      ];
      values.forEach((text, i) => pdfText(page, dayCols[i] + 4, cursor + 15, text, i === 1 ? 7.2 : 7, i === 6 ? "F2" : "F1", [35, 46, 64]));
      cursor += 24;
      rowLine(cursor);
    });

    cursor += 24;
    ensure(60);
    pdfText(page, MARGIN, cursor, "STOPPS IM ZEITRAUM", 12, "F2", [20, 31, 49]);
    cursor += 16;
    const stopCols = [MARGIN, 88, 165, 350, 424, 490];
    const stopHeader = () => {
      pdfFillRect(page, MARGIN, cursor, PAGE_W - MARGIN * 2, 22, [22, 174, 192]);
      ["Datum", "Nutzer", "Markt / Stopp", "Zeit", "Dauer", "Quelle"].forEach((text, i) => pdfText(page, stopCols[i] + 4, cursor + 14, text, 7, "F2", [255, 255, 255]));
      cursor += 22;
    };
    stopHeader();
    let stopIndex = 0;
    list.forEach(day => {
      (day.stops || []).forEach(stop => {
        ensure(27);
        if (cursor < 70) stopHeader();
        if (stopIndex % 2) pdfFillRect(page, MARGIN, cursor, PAGE_W - MARGIN * 2, 24, [246, 250, 251]);
        const values = [
          fmtDate(day.startedAt),
          pdfTrim(day.name || "–", 14),
          pdfTrim(stop.name || "Unbekannter Stopp", 32),
          `${fmtTime(stop.arrival)} - ${fmtTime(stop.departure)}`,
          shortDuration((stop.departure || stop.arrival) - stop.arrival),
          stop.source === "auto" ? "Automatisch" : "Manuell"
        ];
        values.forEach((text, i) => pdfText(page, stopCols[i] + 4, cursor + 15, text, 6.8, i === 2 ? "F2" : "F1", [35, 46, 64]));
        cursor += 24;
        rowLine(cursor);
        stopIndex += 1;
      });
    });
    if (!stopIndex) {
      pdfText(page, MARGIN + 6, cursor + 16, "Keine Stopps im gewählten Zeitraum.", 8, "F1", [91, 105, 126]);
      cursor += 25;
    }

    ensure(58);
    cursor += 18;
    pdfLine(page, MARGIN, cursor, PAGE_W - MARGIN, cursor, [210, 218, 230], 0.6);
    cursor += 16;
    pdfText(page, MARGIN, cursor, "Hinweis: GPS-Werte können technisch von Tachometer- oder Navigationswerten abweichen. Manuelle Korrekturen sind separat ausgewiesen.", 7.2, "F1", [91, 105, 126]);
    pdfText(page, MARGIN, cursor + 14, `Erstellt am ${new Date().toLocaleString("de-DE")} · SELLENCE Kilometer-Tracker`, 7.2, "F1", [91, 105, 126]);

    pages.forEach((commands, i) => {
      pdfText(commands, PAGE_W - MARGIN, PAGE_H - 18, `Seite ${i + 1} / ${pages.length}`, 7, "F1", [110, 120, 136], "right");
    });
    return buildPdfBlob(pages, PAGE_W, PAGE_H);
  }

  function pdfTrim(value, max) {
    const text = String(value || "");
    return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
  }

  function pdfText(page, x, top, text, size = 10, font = "F1", color = [0, 0, 0], align = "left") {
    const safe = pdfLiteral(String(text ?? ""));
    let tx = x;
    if (align === "right") tx = x - Math.min(220, String(text).length * size * 0.48);
    page.push(`BT /${font} ${size} Tf ${pdfRgb(color)} rg 1 0 0 1 ${tx.toFixed(2)} ${(841.89 - top).toFixed(2)} Tm (${safe}) Tj ET`);
  }

  function pdfFillRect(page, x, top, width, height, color) {
    page.push(`${pdfRgb(color)} rg ${x.toFixed(2)} ${(841.89 - top - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
  }

  function pdfLine(page, x1, top1, x2, top2, color, width = 1) {
    page.push(`${pdfRgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${(841.89 - top1).toFixed(2)} m ${x2.toFixed(2)} ${(841.89 - top2).toFixed(2)} l S`);
  }

  function pdfRgb(color) {
    return color.map(value => (Math.max(0, Math.min(255, value)) / 255).toFixed(3)).join(" ");
  }

  function pdfLiteral(value) {
    const map = { "€": 128, "‚": 130, "„": 132, "…": 133, "†": 134, "‡": 135, "‰": 137, "Š": 138, "‹": 139, "Œ": 140, "Ž": 142, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "™": 153, "š": 154, "›": 155, "œ": 156, "ž": 158, "Ÿ": 159 };
    let out = "";
    for (const char of String(value)) {
      let code = map[char];
      if (code === undefined) {
        const cp = char.codePointAt(0);
        code = cp <= 255 ? cp : 63;
      }
      const byte = String.fromCharCode(code);
      out += byte === "\\" ? "\\\\" : byte === "(" ? "\\(" : byte === ")" ? "\\)" : byte;
    }
    return out;
  }

  function buildPdfBlob(pages, pageWidth, pageHeight) {
    const objects = [null, "", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
    const pageIds = [];
    pages.forEach(commands => {
      const stream = commands.join("\n") + "\n";
      const contentId = objects.length;
      objects.push(`<< /Length ${binaryLength(stream)} >>\nstream\n${stream}endstream`);
      const pageId = objects.length;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    });
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n%âãÏÓ\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = binaryLength(pdf);
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = binaryLength(pdf);
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([binaryStringToBytes(pdf)], { type: "application/pdf" });
  }

  function binaryLength(value) {
    return String(value).length;
  }

  function binaryStringToBytes(value) {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 255;
    return bytes;
  }

  function rangeLabel() {
    const from = $("fromDate").value ? new Date(`${$("fromDate").value}T00:00:00`) : null;
    const to = $("toDate").value ? new Date(`${$("toDate").value}T00:00:00`) : null;
    if (from && to) return `${from.toLocaleDateString("de-DE")} bis ${to.toLocaleDateString("de-DE")}`;
    return "Gesamter Zeitraum";
  }

  function rangeFileName() {
    return `${$("fromDate").value || "Start"}_bis_${$("toDate").value || "Heute"}`;
  }

  function sanitizeFile(value) {
    return String(value || "Nutzer").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "Nutzer";
  }

  function backupData() {
    const payload = {
      app: "SELLENCE-KILOMETER-TRACKER",
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      days,
      active
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `SELLENCE-Kilometer-Backup-${dateOnly(Date.now())}.json`);
  }

  async function importData(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (payload.app !== "SELLENCE-KILOMETER-TRACKER" || !Array.isArray(payload.days)) throw new Error("Ungültige Datei");
      const ok = confirm("Backup importieren? Bestehende abgeschlossene Tage mit gleicher ID werden überschrieben.");
      if (!ok) return;
      const map = new Map(days.map(day => [day.id, day]));
      payload.days.map(day => normalizeDay(day)).forEach(day => map.set(day.id, day));
      days = [...map.values()].sort((a, b) => b.startedAt - a.startedAt);
      if (payload.profile?.name) profile.name = String(payload.profile.name);
      persistAll();
      render();
      showToast("Backup importiert", `${payload.days.length} Arbeitstage wurden verarbeitet.`);
    } catch (err) {
      showToast("Import fehlgeschlagen", "Die gewählte Datei ist kein gültiges Kilometer-Tracker-Backup.");
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function setupEvents() {
    $("saveNameBtn").addEventListener("click", () => {
      profile.name = $("userName").value.trim();
      if (active) active.name = profile.name;
      persistAll();
      showToast("Name gespeichert", profile.name ? `${profile.name} wird für neue Tage und PDF-Exporte verwendet.` : "Der Name wurde geleert.");
    });
    $("startBtn").addEventListener("click", startTracking);
    $("stopBtn").addEventListener("click", stopTracking);
    $("editActiveBtn").addEventListener("click", () => active && openEdit(active.id, true));
    $("addStopBtn").addEventListener("click", addManualStop);
    $("pdfBtn").addEventListener("click", exportPdf);
    $("csvBtn").addEventListener("click", exportCsv);
    $("backupBtn").addEventListener("click", backupData);
    $("importInput").addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) importData(file);
      event.target.value = "";
    });
    $("fromDate").addEventListener("change", renderOverview);
    $("toDate").addEventListener("change", renderOverview);
    $("currentMonthBtn").addEventListener("click", setCurrentMonth);
    $("allTimeBtn").addEventListener("click", setAllTime);
    $("daysBody").addEventListener("click", event => {
      const button = event.target.closest("[data-edit-day]");
      if (button) openEdit(button.dataset.editDay, false);
    });
    $("closeEditBtn").addEventListener("click", closeEdit);
    $("cancelEditBtn").addEventListener("click", closeEdit);
    $("saveEditBtn").addEventListener("click", saveEdit);
    $("deleteDayBtn").addEventListener("click", deleteEditingDay);
    $("modalAddStopBtn").addEventListener("click", addStopToEditor);
    $("editStops").addEventListener("click", event => {
      const button = event.target.closest(".removeStop");
      if (!button) return;
      const day = currentEditingDay();
      const row = button.closest(".editStop");
      if (!day || !row) return;
      day.stops = day.stops.filter(stop => stop.id !== row.dataset.stopId);
      renderEditStops(day.stops);
    });
    $("editModal").addEventListener("click", event => {
      if (event.target.dataset.closeModal) closeEdit();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && $("editModal").getAttribute("aria-hidden") === "false") closeEdit();
    });

    document.addEventListener("visibilitychange", async () => {
      const hidden = document.visibilityState !== "visible";
      $("backgroundNotice").hidden = !(hidden && !!active);
      if (!hidden && active && watchId !== null && !wakeLock) await requestWakeLock();
    });

    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredInstall = event;
      $("installBtn").hidden = false;
    });
    $("installBtn").addEventListener("click", async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      $("installBtn").hidden = true;
    });
  }

  function setupApp() {
    normalizeLoadedData();
    setupEvents();
    setCurrentMonth();
    $("secureNotice").hidden = window.isSecureContext || location.hostname === "localhost";
    if (active) {
      showToast("Offener Arbeitstag gefunden", "Tippe auf „Tracking fortsetzen“, damit die GPS-Erfassung weiterläuft.");
      startTimer();
    }
    render();
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
    }
  }

  setupApp();
})();
