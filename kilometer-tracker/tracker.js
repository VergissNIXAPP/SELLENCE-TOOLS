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
  const MAX_POINTS_PER_DAY = 4500;
  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];

  const ROUTE_ACTIVE_ID = "__active__";
  const TILE_SIZE = 256;
  const TILE_ENDPOINT = "https://tile.openstreetmap.org";
  const CAR_TYPES = [
    { id: "compact", name: "City Compact", subtitle: "klein & wendig", emoji: "🚗", color: "#39ddff", accent: "#d9fbff", variant: "compact" },
    { id: "sedan", name: "Business Limousine", subtitle: "klassisch & elegant", emoji: "🚘", color: "#3b82f6", accent: "#d7e9ff", variant: "sedan" },
    { id: "sport", name: "Sportwagen", subtitle: "flach & dynamisch", emoji: "🏎️", color: "#ff4d6d", accent: "#ffe0e6", variant: "sport" },
    { id: "suv", name: "Premium SUV", subtitle: "hoch & kraftvoll", emoji: "🚙", color: "#57f287", accent: "#e4ffe9", variant: "suv" },
    { id: "van", name: "Außendienst Van", subtitle: "viel Platz", emoji: "🚐", color: "#8b5cf6", accent: "#efe7ff", variant: "van" },
    { id: "pickup", name: "Pickup", subtitle: "robust & markant", emoji: "🛻", color: "#ffae42", accent: "#fff0d2", variant: "pickup" },
    { id: "electric", name: "E-Performance", subtitle: "elektrisch", emoji: "⚡", color: "#a6ff3f", accent: "#f1ffd9", variant: "electric" },
    { id: "taxi", name: "City Taxi", subtitle: "auffällig gelb", emoji: "🚕", color: "#ffd83d", accent: "#fff6bd", variant: "taxi" },
    { id: "wagon", name: "Kombi", subtitle: "Business Touring", emoji: "🚗", color: "#00c2a8", accent: "#d6fff9", variant: "wagon" },
    { id: "luxury", name: "Luxury Black", subtitle: "edel & dunkel", emoji: "◆", color: "#202938", accent: "#f4f7fb", variant: "luxury" }
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
  let routeSelection = active ? ROUTE_ACTIVE_ID : "";
  let selectedCarId = String(profile?.carId || "sedan");
  let routeMapState = { zoom: null, centerX: null, centerY: null, autoFit: true, dragging: false, pointerId: null, lastX: 0, lastY: 0 };
  let routeRenderFrame = null;
  let routeResizeObserver = null;
  let videoJob = null;
  let lastVideoUrl = null;
  const tileCache = new Map();

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
    profile.carId = CAR_TYPES.some(car => car.id === profile.carId) ? profile.carId : "sedan";
    selectedCarId = profile.carId;
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
    d.points = Array.isArray(d.points) ? d.points.map(point => ({
      lat: Number(point.lat),
      lon: Number(point.lon),
      accuracy: Number(point.accuracy) || 0,
      speed: Number.isFinite(Number(point.speed)) ? Number(point.speed) : null,
      heading: Number.isFinite(Number(point.heading)) ? Number(point.heading) : null,
      at: Number(point.at) || d.startedAt
    })).filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon)) : [];
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

      const shouldStore = distanceM >= 8 || (p.at - previous.at) >= 15000 || active.points.length < 2;
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
    if (routeSelection === ROUTE_ACTIVE_ID) {
      const routePoints = validRoutePoints(active);
      $("routeKmText").textContent = fmtKm(totalKm(active));
      $("routePointsText").textContent = routePoints.length.toLocaleString("de-DE");
      $("routeDurationText").textContent = durationText(Date.now() - active.startedAt);
      $("routeStopsText").textContent = String(active.stops?.length || 0);
      $("routePointPill").textContent = routePoints.length ? `${routePoints.length.toLocaleString("de-DE")} GPS-Punkte` : "Noch keine Route";
      $("mapEmpty").hidden = routePoints.length > 0;
      $("createRouteVideoBtn").disabled = routePoints.length < 2 || !!videoJob;
      if (routeMapState.autoFit || routePoints.length < 3) routeMapState.autoFit = true;
      scheduleRouteMapRender();
    }
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


  function validRoutePoints(day) {
    return (day?.points || []).filter(point => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))).map(point => ({ ...point, lat: Number(point.lat), lon: Number(point.lon) }));
  }

  function currentRouteDay() {
    if (routeSelection === ROUTE_ACTIVE_ID) return active;
    return days.find(day => day.id === routeSelection) || null;
  }

  function ensureRouteSelection() {
    const available = [];
    if (active) available.push({ id: ROUTE_ACTIVE_ID, day: active, label: `LIVE · ${fmtDate(active.startedAt)} · ${active.name || "Aktive Fahrt"}` });
    days.forEach(day => available.push({ id: day.id, day, label: `${fmtDate(day.startedAt)} · ${day.name || "Ohne Name"} · ${fmtKm(totalKm(day))}` }));
    if (!available.some(item => item.id === routeSelection)) routeSelection = available[0]?.id || "";
    return available;
  }

  function renderRouteStudio(forceFit = false) {
    const options = ensureRouteSelection();
    const select = $("routeDaySelect");
    const previous = select.value;
    select.innerHTML = options.length
      ? options.map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.label)}</option>`).join("")
      : `<option value="">Noch keine Fahrt vorhanden</option>`;
    select.value = routeSelection || previous || "";
    $("showActiveRouteBtn").disabled = !active;

    const day = currentRouteDay();
    const points = validRoutePoints(day);
    $("routeKmText").textContent = day ? fmtKm(totalKm(day)) : "0,00 km";
    $("routePointsText").textContent = points.length.toLocaleString("de-DE");
    $("routeDurationText").textContent = day ? durationText((day.endedAt || Date.now()) - day.startedAt) : "00:00:00";
    $("routeStopsText").textContent = String(day?.stops?.length || 0);
    $("routePointPill").textContent = points.length ? `${points.length.toLocaleString("de-DE")} GPS-Punkte` : "Noch keine Route";
    $("mapEmpty").hidden = points.length > 0;
    $("createRouteVideoBtn").disabled = points.length < 2 || !!videoJob;
    if (forceFit) routeMapState.autoFit = true;
    scheduleRouteMapRender();
  }

  function selectRouteDay(id, scrollIntoView = false) {
    routeSelection = id;
    routeMapState.autoFit = true;
    renderRouteStudio(true);
    if (scrollIntoView) $("routeStudio").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCarChooser() {
    if (!CAR_TYPES.some(car => car.id === selectedCarId)) selectedCarId = "sedan";
    $("carChooser").innerHTML = CAR_TYPES.map(car => `<button class="carOption${car.id === selectedCarId ? " selected" : ""}" type="button" role="radio" aria-checked="${car.id === selectedCarId}" data-car-id="${car.id}">
      <span class="carThumb" style="color:${car.color}">${car.emoji}</span>
      <span class="carMeta"><strong>${escapeHtml(car.name)}</strong><span>${escapeHtml(car.subtitle)}</span></span>
    </button>`).join("");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lonToWorldX(lon, zoom) {
    return ((Number(lon) + 180) / 360) * TILE_SIZE * (2 ** zoom);
  }

  function latToWorldY(lat, zoom) {
    const limited = clamp(Number(lat), -85.05112878, 85.05112878);
    const rad = limited * Math.PI / 180;
    return (1 - Math.log(Math.tan(rad) + (1 / Math.cos(rad))) / Math.PI) / 2 * TILE_SIZE * (2 ** zoom);
  }

  function routeViewFor(points, width, height, padding = 70) {
    if (!points.length) return { zoom: 5, centerX: lonToWorldX(10.4, 5), centerY: latToWorldY(51.1, 5) };
    if (points.length === 1) return { zoom: 16, centerX: lonToWorldX(points[0].lon, 16), centerY: latToWorldY(points[0].lat, 16) };
    const usableWidth = Math.max(120, width - padding * 2);
    const usableHeight = Math.max(120, height - padding * 2);
    let selected = null;
    for (let zoom = 18; zoom >= 3; zoom -= 1) {
      const xs = points.map(point => lonToWorldX(point.lon, zoom));
      const ys = points.map(point => latToWorldY(point.lat, zoom));
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      if ((maxX - minX) <= usableWidth && (maxY - minY) <= usableHeight) {
        selected = { zoom, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
        break;
      }
    }
    return selected || { zoom: 3, centerX: lonToWorldX(points[0].lon, 3), centerY: latToWorldY(points[0].lat, 3) };
  }

  function resizeRouteCanvas() {
    const canvas = $("routeMapCanvas");
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      scheduleRouteMapRender();
    }
  }

  function scheduleRouteMapRender() {
    if (routeRenderFrame) return;
    routeRenderFrame = requestAnimationFrame(() => {
      routeRenderFrame = null;
      renderRouteMap();
    });
  }

  function normalizedTileX(x, zoom) {
    const count = 2 ** zoom;
    return ((x % count) + count) % count;
  }

  function tileEntry(zoom, rawX, y) {
    const x = normalizedTileX(rawX, zoom);
    const max = 2 ** zoom;
    if (y < 0 || y >= max) return null;
    const key = `${zoom}/${x}/${y}`;
    if (tileCache.has(key)) return tileCache.get(key);
    const entry = { key, status: "loading", image: null, promise: null };
    entry.promise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`${TILE_ENDPOINT}/${zoom}/${x}/${y}.png`, { mode: "cors", cache: "force-cache", signal: controller.signal });
        if (!response.ok) throw new Error(`Kartenkachel ${response.status}`);
        const blob = await response.blob();
        if ("createImageBitmap" in window) {
          entry.image = await createImageBitmap(blob);
        } else {
          entry.image = await new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const image = new Image();
            image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
            image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht geladen werden")); };
            image.src = url;
          });
        }
        entry.status = "ready";
      } catch (error) {
        entry.status = "error";
        entry.error = error;
      } finally {
        clearTimeout(timer);
        scheduleRouteMapRender();
      }
      return entry;
    })();
    tileCache.set(key, entry);
    if (tileCache.size > 240) {
      const removable = [...tileCache.keys()].slice(0, tileCache.size - 200);
      removable.forEach(oldKey => tileCache.delete(oldKey));
    }
    return entry;
  }

  function visibleTiles(view, width, height, margin = 1) {
    const left = view.centerX - width / 2;
    const top = view.centerY - height / 2;
    const minX = Math.floor(left / TILE_SIZE) - margin;
    const maxX = Math.floor((left + width) / TILE_SIZE) + margin;
    const minY = Math.floor(top / TILE_SIZE) - margin;
    const maxY = Math.floor((top + height) / TILE_SIZE) + margin;
    const result = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) result.push({ x, y, dx: x * TILE_SIZE - left, dy: y * TILE_SIZE - top });
    }
    return result;
  }

  function drawFallbackMap(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#07182a");
    gradient.addColorStop(1, "#020914");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.strokeStyle = "rgba(82,180,242,.10)";
    ctx.lineWidth = 1;
    for (let x = -height; x < width + height; x += 68) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + height, height); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(87,242,135,.07)";
    for (let y = 25; y < height; y += 85) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(width * .28, y - 35, width * .72, y + 38, width, y - 5); ctx.stroke();
    }
    ctx.restore();
  }

  function drawMapLayer(ctx, view, width, height, loadMissing = true) {
    drawFallbackMap(ctx, width, height);
    const tiles = visibleTiles(view, width, height, 1);
    let drawn = 0;
    for (const tile of tiles) {
      const entry = loadMissing ? tileEntry(view.zoom, tile.x, tile.y) : tileCache.get(`${view.zoom}/${normalizedTileX(tile.x, view.zoom)}/${tile.y}`);
      if (entry?.status === "ready" && entry.image) {
        ctx.drawImage(entry.image, Math.round(tile.dx), Math.round(tile.dy), TILE_SIZE + 1, TILE_SIZE + 1);
        drawn += 1;
      } else {
        ctx.fillStyle = "rgba(15,35,55,.28)";
        ctx.fillRect(tile.dx, tile.dy, TILE_SIZE, TILE_SIZE);
      }
    }
    ctx.fillStyle = drawn ? "rgba(2,10,20,.32)" : "rgba(2,10,20,.08)";
    ctx.fillRect(0, 0, width, height);
    return tiles;
  }

  function projectRoute(points, view, width, height) {
    return points.map(point => ({
      x: lonToWorldX(point.lon, view.zoom) - view.centerX + width / 2,
      y: latToWorldY(point.lat, view.zoom) - view.centerY + height / 2,
      source: point
    }));
  }

  function strokeRoute(ctx, coords, progress = 1, lineWidth = 5) {
    if (coords.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i += 1) ctx.lineTo(coords[i].x, coords[i].y);
    ctx.strokeStyle = "rgba(0,5,12,.80)";
    ctx.lineWidth = lineWidth + 8;
    ctx.stroke();
    ctx.strokeStyle = "rgba(210,230,246,.34)";
    ctx.lineWidth = lineWidth + 2;
    ctx.stroke();
    ctx.restore();

    const geometry = routeGeometry(coords);
    const target = geometry.total * clamp(progress, 0, 1);
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width || 1000, ctx.canvas.height || 600);
    gradient.addColorStop(0, "#2f83ff");
    gradient.addColorStop(.55, "#39ddff");
    gradient.addColorStop(1, "#75f66a");
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    let travelled = 0;
    for (let i = 1; i < coords.length; i += 1) {
      const previous = coords[i - 1];
      const current = coords[i];
      const segment = Math.hypot(current.x - previous.x, current.y - previous.y);
      if (travelled + segment <= target) {
        ctx.lineTo(current.x, current.y);
        travelled += segment;
      } else {
        const remaining = Math.max(0, target - travelled);
        const part = segment ? remaining / segment : 0;
        ctx.lineTo(previous.x + (current.x - previous.x) * part, previous.y + (current.y - previous.y) * part);
        break;
      }
    }
    ctx.shadowColor = "rgba(57,221,255,.75)";
    ctx.shadowBlur = lineWidth * 2.4;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  function routeGeometry(coords) {
    const cumulative = [0];
    let total = 0;
    for (let i = 1; i < coords.length; i += 1) {
      total += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
      cumulative.push(total);
    }
    return { coords, cumulative, total };
  }

  function geometryPointAt(geometry, progress) {
    if (!geometry.coords.length) return null;
    if (geometry.coords.length === 1 || geometry.total <= 0) return { ...geometry.coords[0], angle: 0 };
    const distance = clamp(progress, 0, 1) * geometry.total;
    let index = 1;
    while (index < geometry.cumulative.length && geometry.cumulative[index] < distance) index += 1;
    index = Math.min(index, geometry.coords.length - 1);
    const previous = geometry.coords[index - 1];
    const current = geometry.coords[index];
    const startDistance = geometry.cumulative[index - 1];
    const segment = Math.max(.001, geometry.cumulative[index] - startDistance);
    const ratio = clamp((distance - startDistance) / segment, 0, 1);
    return {
      x: previous.x + (current.x - previous.x) * ratio,
      y: previous.y + (current.y - previous.y) * ratio,
      angle: Math.atan2(current.y - previous.y, current.x - previous.x) + Math.PI / 2
    };
  }

  function drawRouteMarker(ctx, x, y, color, label, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * scale;
    ctx.fillStyle = "rgba(2,9,18,.92)";
    ctx.beginPath();ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2);ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();ctx.arc(0, 0, 6 * scale, 0, Math.PI * 2);ctx.fill();
    if (label) {
      ctx.shadowBlur = 0;
      ctx.font = `800 ${9 * scale}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(label, 0, -15 * scale);
    }
    ctx.restore();
  }

  function drawStopMarkers(ctx, day, view, width, height, scale = 1) {
    for (const stop of day?.stops || []) {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) continue;
      const x = lonToWorldX(stop.lon, view.zoom) - view.centerX + width / 2;
      const y = latToWorldY(stop.lat, view.zoom) - view.centerY + height / 2;
      if (x < -20 || y < -20 || x > width + 20 || y > height + 20) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(7,18,31,.94)";
      ctx.strokeStyle = "#ffcf55";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();ctx.arc(0, 0, 7 * scale, 0, Math.PI * 2);ctx.fill();ctx.stroke();
      ctx.fillStyle = "#ffcf55";
      ctx.beginPath();ctx.arc(0, 0, 2.2 * scale, 0, Math.PI * 2);ctx.fill();
      ctx.restore();
    }
  }

  function drawCarShape(ctx, x, y, angle, car, scale = 1) {
    const variant = car?.variant || "sedan";
    const dimensions = {
      compact: [31, 58], sedan: [34, 70], sport: [33, 75], suv: [39, 72], van: [41, 83], pickup: [40, 80], electric: [35, 72], taxi: [35, 70], wagon: [36, 77], luxury: [37, 75]
    }[variant] || [34, 70];
    const w = dimensions[0] * scale;
    const h = dimensions[1] * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 14 * scale;
    ctx.shadowOffsetY = 8 * scale;
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.beginPath();ctx.ellipse(0, 5 * scale, w * .58, h * .48, 0, 0, Math.PI * 2);ctx.fill();
    ctx.shadowColor = car.color;
    ctx.shadowBlur = 12 * scale;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = car.color;
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.beginPath();
    if (variant === "sport") {
      ctx.moveTo(0, -h / 2);ctx.lineTo(w * .42, -h * .29);ctx.lineTo(w / 2, h * .28);ctx.lineTo(w * .33, h / 2);ctx.lineTo(-w * .33, h / 2);ctx.lineTo(-w / 2, h * .28);ctx.lineTo(-w * .42, -h * .29);ctx.closePath();
    } else if (variant === "pickup") {
      ctx.roundRect(-w / 2, -h / 2, w, h, 8 * scale);
    } else {
      ctx.roundRect(-w / 2, -h / 2, w, h, (variant === "van" ? 7 : 12) * scale);
    }
    ctx.fill();ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = variant === "luxury" ? "#6f829a" : "#153b5a";
    if (variant === "pickup") {
      ctx.fillRect(-w * .38, h * .08, w * .76, h * .32);
      ctx.strokeStyle = "rgba(255,255,255,.35)";ctx.strokeRect(-w * .38, h * .08, w * .76, h * .32);
      ctx.roundRect(-w * .35, -h * .34, w * .7, h * .27, 5 * scale);ctx.fill();
    } else if (variant === "van") {
      ctx.roundRect(-w * .34, -h * .35, w * .68, h * .3, 4 * scale);ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.22)";ctx.fillRect(-w * .38, h * .05, w * .76, 2 * scale);
    } else {
      ctx.beginPath();
      ctx.moveTo(-w * .32, -h * .26);ctx.lineTo(w * .32, -h * .26);ctx.lineTo(w * .39, h * .05);ctx.lineTo(-w * .39, h * .05);ctx.closePath();ctx.fill();
      ctx.fillStyle = "rgba(7,23,38,.88)";ctx.roundRect(-w * .31, h * .12, w * .62, h * .19, 4 * scale);ctx.fill();
    }
    ctx.fillStyle = car.accent;
    ctx.globalAlpha = .9;
    ctx.fillRect(-w * .31, -h * .47, w * .18, 3 * scale);ctx.fillRect(w * .13, -h * .47, w * .18, 3 * scale);
    ctx.fillStyle = "#ff526f";ctx.fillRect(-w * .31, h * .42, w * .18, 3 * scale);ctx.fillRect(w * .13, h * .42, w * .18, 3 * scale);
    if (variant === "taxi") {
      ctx.globalAlpha = 1;ctx.fillStyle = "#111";ctx.fillRect(-w * .34, -2 * scale, w * .68, 4 * scale);
      ctx.fillStyle = "#fff";ctx.font = `900 ${7 * scale}px system-ui`;ctx.textAlign = "center";ctx.fillText("TAXI", 0, 2 * scale);
    }
    if (variant === "electric") {
      ctx.globalAlpha = 1;ctx.fillStyle = "#122517";ctx.font = `900 ${15 * scale}px system-ui`;ctx.textAlign = "center";ctx.fillText("⚡", 0, 5 * scale);
    }
    ctx.restore();
  }

  function renderRouteMap() {
    const canvas = $("routeMapCanvas");
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    resizeRouteCanvas();
    const dpr = canvas.width / rect.width;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const day = currentRouteDay();
    const points = validRoutePoints(day);
    if (!points.length) {
      drawFallbackMap(ctx, rect.width, rect.height);
      return;
    }
    if (routeMapState.autoFit || routeMapState.zoom === null || routeMapState.centerX === null) {
      Object.assign(routeMapState, routeViewFor(points, rect.width, rect.height, 65), { autoFit: false });
    }
    const view = { zoom: routeMapState.zoom, centerX: routeMapState.centerX, centerY: routeMapState.centerY };
    drawMapLayer(ctx, view, rect.width, rect.height, true);
    const coords = projectRoute(points, view, rect.width, rect.height);
    strokeRoute(ctx, coords, 1, 5);
    drawStopMarkers(ctx, day, view, rect.width, rect.height, 1);
    drawRouteMarker(ctx, coords[0].x, coords[0].y, "#57f287", "START");
    drawRouteMarker(ctx, coords.at(-1).x, coords.at(-1).y, "#ff6079", "ZIEL");
    if (routeSelection === ROUTE_ACTIVE_ID && coords.length) {
      const car = CAR_TYPES.find(item => item.id === selectedCarId) || CAR_TYPES[1];
      const last = coords.at(-1);
      const prev = coords.at(-2) || last;
      drawCarShape(ctx, last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x) + Math.PI / 2, car, .62);
    }
  }

  function changeMapZoom(delta) {
    const oldZoom = routeMapState.zoom;
    if (oldZoom === null) return;
    const newZoom = clamp(oldZoom + delta, 3, 19);
    if (newZoom === oldZoom) return;
    const factor = 2 ** (newZoom - oldZoom);
    routeMapState.centerX *= factor;
    routeMapState.centerY *= factor;
    routeMapState.zoom = newZoom;
    routeMapState.autoFit = false;
    scheduleRouteMapRender();
  }

  function setupRouteMapInteraction() {
    const canvas = $("routeMapCanvas");
    canvas.addEventListener("pointerdown", event => {
      if (!validRoutePoints(currentRouteDay()).length) return;
      routeMapState.dragging = true;
      routeMapState.pointerId = event.pointerId;
      routeMapState.lastX = event.clientX;
      routeMapState.lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener("pointermove", event => {
      if (!routeMapState.dragging || event.pointerId !== routeMapState.pointerId) return;
      const dx = event.clientX - routeMapState.lastX;
      const dy = event.clientY - routeMapState.lastY;
      routeMapState.lastX = event.clientX;
      routeMapState.lastY = event.clientY;
      routeMapState.centerX -= dx;
      routeMapState.centerY -= dy;
      routeMapState.autoFit = false;
      scheduleRouteMapRender();
    });
    const finishDrag = event => {
      if (event.pointerId !== routeMapState.pointerId) return;
      routeMapState.dragging = false;
      routeMapState.pointerId = null;
    };
    canvas.addEventListener("pointerup", finishDrag);
    canvas.addEventListener("pointercancel", finishDrag);
    canvas.addEventListener("wheel", event => {
      event.preventDefault();
      changeMapZoom(event.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    $("mapZoomIn").addEventListener("click", () => changeMapZoom(1));
    $("mapZoomOut").addEventListener("click", () => changeMapZoom(-1));
    if ("ResizeObserver" in window) {
      routeResizeObserver = new ResizeObserver(() => resizeRouteCanvas());
      routeResizeObserver.observe($("routeMapWrap"));
    } else {
      window.addEventListener("resize", resizeRouteCanvas);
    }
  }

  function chooseVideoMime() {
    if (!("MediaRecorder" in window)) return null;
    const candidates = [
      { mime: "video/webm;codecs=vp9", ext: "webm" },
      { mime: "video/webm;codecs=vp8", ext: "webm" },
      { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
      { mime: "video/webm", ext: "webm" }
    ];
    return candidates.find(item => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(item.mime)) || { mime: "", ext: "webm" };
  }

  function videoDimensions(format) {
    if (format === "portrait") return { width: 720, height: 1280 };
    if (format === "square") return { width: 900, height: 900 };
    return { width: 1280, height: 720 };
  }

  function setVideoProgress(percent, text) {
    const value = clamp(Math.round(percent), 0, 100);
    $("videoProgress").hidden = false;
    $("videoProgressBar").style.width = `${value}%`;
    $("videoProgressPercent").textContent = `${value}%`;
    if (text) $("videoProgressText").textContent = text;
  }

  async function preloadVideoTiles(view, width, height) {
    const tiles = visibleTiles(view, width, height, 1);
    const entries = tiles.map(tile => tileEntry(view.zoom, tile.x, tile.y)).filter(Boolean);
    let completed = 0;
    await Promise.all(entries.map(entry => entry.promise.finally(() => {
      completed += 1;
      setVideoProgress(4 + (completed / Math.max(1, entries.length)) * 12, "Kartenmaterial wird geladen …");
    })));
  }

  function drawVideoOverlay(ctx, day, width, height, progress, elapsed, totalDuration) {
    const pad = Math.max(24, width * .035);
    const compact = width < height;
    const titleSize = compact ? 27 : 31;
    ctx.save();
    const topGradient = ctx.createLinearGradient(0, 0, 0, compact ? 180 : 130);
    topGradient.addColorStop(0, "rgba(2,8,18,.92)");
    topGradient.addColorStop(1, "rgba(2,8,18,0)");
    ctx.fillStyle = topGradient;ctx.fillRect(0, 0, width, compact ? 200 : 150);
    const bottomGradient = ctx.createLinearGradient(0, height - 160, 0, height);
    bottomGradient.addColorStop(0, "rgba(2,8,18,0)");bottomGradient.addColorStop(1, "rgba(2,8,18,.94)");
    ctx.fillStyle = bottomGradient;ctx.fillRect(0, height - 175, width, 175);

    ctx.fillStyle = "#fff";ctx.font = `950 ${titleSize}px system-ui`;ctx.textAlign = "left";ctx.fillText("SELLENCE", pad, pad + titleSize);
    ctx.fillStyle = "#39ddff";ctx.font = `850 ${compact ? 14 : 15}px system-ui`;ctx.fillText("KILOMETER-TRACKER · ROUTE REPLAY", pad, pad + titleSize + 24);
    ctx.textAlign = "right";ctx.fillStyle = "#dceafb";ctx.font = `800 ${compact ? 14 : 16}px system-ui`;ctx.fillText(fmtDate(day.startedAt), width - pad, pad + titleSize);
    ctx.fillStyle = "#9fb3c9";ctx.font = `600 ${compact ? 11 : 13}px system-ui`;ctx.fillText(day.name || "Fahrt", width - pad, pad + titleSize + 22);

    const barY = height - (compact ? 72 : 58);
    ctx.fillStyle = "rgba(255,255,255,.16)";ctx.roundRect(pad, barY, width - pad * 2, 8, 4);ctx.fill();
    const barGradient = ctx.createLinearGradient(pad, 0, width - pad, 0);barGradient.addColorStop(0, "#2f83ff");barGradient.addColorStop(.55, "#39ddff");barGradient.addColorStop(1, "#75f66a");
    ctx.fillStyle = barGradient;ctx.roundRect(pad, barY, (width - pad * 2) * progress, 8, 4);ctx.fill();
    ctx.textAlign = "left";ctx.fillStyle = "#fff";ctx.font = `900 ${compact ? 20 : 22}px system-ui`;ctx.fillText(fmtKm(totalKm(day)), pad, barY - 14);
    ctx.textAlign = "right";ctx.fillStyle = "#b5c7da";ctx.font = `700 ${compact ? 12 : 13}px system-ui`;ctx.fillText(`${Math.max(0, Math.ceil((totalDuration - elapsed) / 1000))} s`, width - pad, barY - 15);
    ctx.fillStyle = "rgba(2,8,18,.72)";ctx.font = `600 ${compact ? 9 : 10}px system-ui`;ctx.fillText("© OpenStreetMap-Mitwirkende", width - pad, height - 13);
    ctx.restore();
  }

  function drawVideoFrame(ctx, baseCanvas, day, geometry, car, width, height, elapsed, totalDuration) {
    const intro = 750;
    const outro = 850;
    const driveDuration = Math.max(1000, totalDuration - intro - outro);
    const progress = clamp((elapsed - intro) / driveDuration, 0, 1);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(baseCanvas, 0, 0);
    strokeRoute(ctx, geometry.coords, progress, Math.max(6, width / 180));
    const location = geometryPointAt(geometry, progress);
    if (location) {
      ctx.save();
      ctx.fillStyle = "rgba(57,221,255,.12)";ctx.beginPath();ctx.arc(location.x, location.y, Math.max(36, width / 24), 0, Math.PI * 2);ctx.fill();
      ctx.restore();
      drawCarShape(ctx, location.x, location.y, location.angle, car, Math.max(.9, width / 1050));
    }
    drawVideoOverlay(ctx, day, width, height, progress, elapsed, totalDuration);
    if (elapsed < intro) {
      const alpha = 1 - elapsed / intro;
      ctx.save();ctx.fillStyle = `rgba(2,8,18,${.45 * alpha})`;ctx.fillRect(0, 0, width, height);ctx.restore();
    }
    if (elapsed > totalDuration - outro) {
      const alpha = clamp((elapsed - (totalDuration - outro)) / outro, 0, 1);
      ctx.save();ctx.fillStyle = `rgba(2,8,18,${.45 * alpha})`;ctx.fillRect(0, 0, width, height);ctx.restore();
    }
  }

  async function createRouteVideo() {
    const day = currentRouteDay();
    const points = validRoutePoints(day);
    if (!day || points.length < 2) return showToast("Keine Route", "Für ein Fahrvideo werden mindestens zwei GPS-Punkte benötigt.");
    const mime = chooseVideoMime();
    if (!mime || !("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
      return showToast("Video nicht unterstützt", "Bitte nutze einen aktuellen Chrome-, Edge-, Firefox- oder Safari-Browser.");
    }
    if (videoJob) return;
    const durationSeconds = clamp(parseInt($("videoDurationSelect").value, 10) || 15, 5, 60);
    const format = $("videoFormatSelect").value;
    const { width, height } = videoDimensions(format);
    const car = CAR_TYPES.find(item => item.id === selectedCarId) || CAR_TYPES[1];
    const canvas = document.createElement("canvas");
    canvas.width = width;canvas.height = height;
    canvas.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;pointer-events:none";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const baseCanvas = document.createElement("canvas");baseCanvas.width = width;baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext("2d");
    const view = routeViewFor(points, width, height, format === "portrait" ? 145 : 105);
    videoJob = { cancelled: false, canvas, recorder: null, frame: null };
    $("createRouteVideoBtn").disabled = true;
    $("cancelRouteVideoBtn").hidden = false;
    $("videoResult").hidden = true;
    setVideoProgress(2, "Video wird vorbereitet …");

    try {
      await preloadVideoTiles(view, width, height);
      if (videoJob.cancelled) throw new Error("cancelled");
      drawMapLayer(baseCtx, view, width, height, false);
      const coords = projectRoute(points, view, width, height);
      drawStopMarkers(baseCtx, day, view, width, height, Math.max(1, width / 1100));
      drawRouteMarker(baseCtx, coords[0].x, coords[0].y, "#57f287", "START", Math.max(1, width / 1100));
      drawRouteMarker(baseCtx, coords.at(-1).x, coords.at(-1).y, "#ff6079", "ZIEL", Math.max(1, width / 1100));
      const geometry = routeGeometry(coords);
      const stream = canvas.captureStream(30);
      const chunks = [];
      const options = mime.mime ? { mimeType: mime.mime, videoBitsPerSecond: format === "portrait" ? 7000000 : 8500000 } : { videoBitsPerSecond: 8000000 };
      const recorder = new MediaRecorder(stream, options);
      videoJob.recorder = recorder;
      recorder.addEventListener("dataavailable", event => { if (event.data?.size) chunks.push(event.data); });
      const stopped = new Promise(resolve => recorder.addEventListener("stop", resolve, { once: true }));
      recorder.start(250);
      const totalDuration = durationSeconds * 1000;
      const started = performance.now();
      await new Promise(resolve => {
        const frame = now => {
          const elapsed = Math.min(totalDuration, now - started);
          drawVideoFrame(ctx, baseCanvas, day, geometry, car, width, height, elapsed, totalDuration);
          setVideoProgress(18 + (elapsed / totalDuration) * 80, "Auto fährt deine Route ab …");
          if (videoJob?.cancelled || elapsed >= totalDuration) return resolve();
          videoJob.frame = requestAnimationFrame(frame);
        };
        videoJob.frame = requestAnimationFrame(frame);
      });
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      stream.getTracks().forEach(track => track.stop());
      if (videoJob.cancelled) throw new Error("cancelled");
      const blob = new Blob(chunks, { type: recorder.mimeType || mime.mime || "video/webm" });
      if (!blob.size) throw new Error("Leere Videodatei");
      if (lastVideoUrl) URL.revokeObjectURL(lastVideoUrl);
      lastVideoUrl = URL.createObjectURL(blob);
      const preview = $("routeVideoPreview");
      preview.src = lastVideoUrl;
      const download = $("routeVideoDownload");
      download.href = lastVideoUrl;
      download.download = `SELLENCE-Route-${dateOnly(day.startedAt)}-${sanitizeFile(day.name || "Fahrt")}.${mime.ext}`;
      download.textContent = `Video herunterladen (${mime.ext.toUpperCase()})`;
      $("videoResult").hidden = false;
      setVideoProgress(100, "Fahrvideo ist fertig");
      showToast("Fahrvideo erstellt", "Du kannst das Video jetzt ansehen und herunterladen.");
      preview.play().catch(() => {});
    } catch (error) {
      if (String(error?.message) === "cancelled") showToast("Video abgebrochen", "Die Videoerstellung wurde beendet.");
      else {
        console.error(error);
        showToast("Video fehlgeschlagen", "Das Fahrvideo konnte auf diesem Gerät nicht erstellt werden.");
      }
      $("videoProgress").hidden = true;
    } finally {
      if (videoJob?.frame) cancelAnimationFrame(videoJob.frame);
      if (videoJob?.recorder?.state && videoJob.recorder.state !== "inactive") {
        try { videoJob.recorder.stop(); } catch {}
      }
      canvas.remove();
      videoJob = null;
      $("cancelRouteVideoBtn").hidden = true;
      renderRouteStudio();
    }
  }

  function cancelRouteVideo() {
    if (!videoJob) return;
    videoJob.cancelled = true;
  }

  function render() {
    $("userName").value = active?.name || profile.name || "";
    renderStatus();
    renderLiveMetrics();
    renderStationary();
    renderLiveTimeline();
    renderOverview();
    renderRouteStudio();
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
      <td><div class="rowActions"><button class="tableBtn routeBtn" data-route-day="${day.id}" type="button">Karte</button><button class="tableBtn" data-edit-day="${day.id}" type="button">Bearbeiten</button></div></td>
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
      version: 2,
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
      const routeButton = event.target.closest("[data-route-day]");
      if (routeButton) { selectRouteDay(routeButton.dataset.routeDay, true); return; }
      const button = event.target.closest("[data-edit-day]");
      if (button) openEdit(button.dataset.editDay, false);
    });
    $("routeDaySelect").addEventListener("change", event => selectRouteDay(event.target.value, false));
    $("showActiveRouteBtn").addEventListener("click", () => active && selectRouteDay(ROUTE_ACTIVE_ID, true));
    $("centerRouteBtn").addEventListener("click", () => { routeMapState.autoFit = true; scheduleRouteMapRender(); });
    $("carChooser").addEventListener("click", event => {
      const button = event.target.closest("[data-car-id]");
      if (!button) return;
      selectedCarId = button.dataset.carId;
      profile.carId = selectedCarId;
      persistAll();
      renderCarChooser();
      scheduleRouteMapRender();
    });
    $("createRouteVideoBtn").addEventListener("click", createRouteVideo);
    $("cancelRouteVideoBtn").addEventListener("click", cancelRouteVideo);
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
    renderCarChooser();
    setupRouteMapInteraction();
    setCurrentMonth();
    const secureNotice = $("secureNotice");
    if (secureNotice) secureNotice.hidden = window.isSecureContext || location.hostname === "localhost";
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
