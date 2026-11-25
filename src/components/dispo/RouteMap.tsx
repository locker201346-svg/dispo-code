/**
 * Karte mit der Tagesroute (OpenStreetMap + Leaflet).
 * Route: Betrieb → Einsätze in Plan-Reihenfolge → zurück zum Betrieb.
 * Die Strecke kommt vom öffentlichen OSRM-Routendienst; ist er nicht erreichbar,
 * werden die Orte mit gestrichelten Luftlinien verbunden.
 */
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Flag, MapPinned, TriangleAlert } from "lucide-react";

import { DEPOT } from "@/data/dispo-geo";

export interface MapStop {
  id: string;
  title: string;
  client: string;
  address: string;
  lat: number;
  lng: number;
  approx?: boolean;
  time: string;
}

interface Leg {
  distance: number; // Meter
  duration: number; // Sekunden
}

type RouteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; legs: Leg[] }
  | { status: "offline" };

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving/";
const BASEMAP_KEY = "dispo-v2-basemap";

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const SWISSTOPO_ATTR = '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>';
const CARTO_ATTR = `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

/** Verfügbares Kartenmaterial (alle frei nutzbar, ohne Anmeldung). */
const BASEMAPS: {
  name: string;
  url: string;
  attribution: string;
  maxNativeZoom?: number;
  /** Kachel der nächsthöheren Zoomstufe halb so gross anzeigen (kleinere Schrift). */
  finer?: boolean;
}[] = [
  {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
  },
  {
    name: "swisstopo Landeskarte",
    url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
    attribution: SWISSTOPO_ATTR,
    maxNativeZoom: 18,
    finer: true,
  },
  {
    name: "swisstopo Luftbild",
    url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg",
    attribution: SWISSTOPO_ATTR,
  },
  {
    name: "CARTO hell",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: CARTO_ATTR,
  },
  {
    name: "CARTO dunkel",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: CARTO_ATTR,
  },
];

function readBasemap(): string {
  try {
    return window.localStorage.getItem(BASEMAP_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveBasemap(name: string) {
  try {
    window.localStorage.setItem(BASEMAP_KEY, name);
  } catch {
    /* nicht speicherbar – egal */
  }
}

function km(meters: number) {
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function mins(seconds: number) {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function pin(label: string, color: string, dashed = false) {
  return `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${color};color:#fff;font:700 13px system-ui,sans-serif;border:3px ${dashed ? "dashed" : "solid"} #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)">${label}</div>`;
}

export function RouteMap({ stops }: { stops: MapStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<RouteState>({ status: "idle" });

  // Karte einmalig anlegen (Leaflet erst im Browser laden)
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [DEPOT.lat, DEPOT.lng],
        12,
      );
      // Kartenmaterial zum Umschalten (oben rechts in der Karte)
      const layers = Object.fromEntries(
        BASEMAPS.map((b) => [
          b.name,
          L.tileLayer(b.url, {
            maxZoom: 19,
            maxNativeZoom: b.maxNativeZoom ?? 19,
            ...(b.finer && { tileSize: 128, zoomOffset: 1 }),
            subdomains: "abcd",
            attribution: b.attribution,
          }),
        ]),
      );
      const savedName = readBasemap();
      const initial = layers[savedName] ?? layers["OpenStreetMap"];
      initial?.addTo(map);
      L.control.layers(layers, undefined, { position: "topright" }).addTo(map);
      map.on("baselayerchange", (event) => saveBasemap(event.name));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Marker und Route bei jeder Planänderung neu zeichnen
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;

    layer.clearLayers();
    const points: [number, number][] = [
      [DEPOT.lat, DEPOT.lng],
      ...stops.map((s): [number, number] => [s.lat, s.lng]),
    ];

    L.marker([DEPOT.lat, DEPOT.lng], {
      icon: L.divIcon({ html: pin("⌂", "#1f2f3d"), className: "", iconSize: [30, 30] }),
      zIndexOffset: 1000,
    })
      .bindPopup(`<b>Start / Ziel</b><br>${escapeHtml(DEPOT.label)}`)
      .addTo(layer);

    stops.forEach((stop, index) => {
      L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          html: pin(String(index + 1), "#e08a2c", stop.approx),
          className: "",
          iconSize: [30, 30],
        }),
      })
        .bindPopup(
          `<b>${index + 1}. ${escapeHtml(stop.title)}</b><br>${escapeHtml(stop.client)}<br>${escapeHtml(stop.address)}<br><b>${escapeHtml(stop.time)}</b>` +
            (stop.approx ? `<br><i>Lage ungefähr (Ortsmitte)</i>` : ""),
        )
        .addTo(layer);
    });

    if (stops.length === 0) {
      map.setView([DEPOT.lat, DEPOT.lng], 12);
      setRoute({ status: "idle" });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });

    // Rundtour inkl. Rückfahrt zum Betrieb
    const tour = [...points, [DEPOT.lat, DEPOT.lng] as [number, number]];
    const controller = new AbortController();
    setRoute({ status: "loading" });
    fetch(
      `${OSRM_URL}${tour.map(([lat, lng]) => `${lng},${lat}`).join(";")}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        const r = data?.routes?.[0];
        if (!r) throw new Error("keine Route");
        const line = (r.geometry.coordinates as [number, number][]).map(
          ([lng, lat]): [number, number] => [lat, lng],
        );
        L.polyline(line, { color: "#ffffff", weight: 8, opacity: 0.9 }).addTo(layer);
        L.polyline(line, { color: "#e08a2c", weight: 5 }).addTo(layer);
        setRoute({
          status: "ok",
          legs: r.legs.map((l: Leg) => ({ distance: l.distance, duration: l.duration })),
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn("Route nicht verfügbar:", error);
        L.polyline(tour, { color: "#e08a2c", weight: 3, dashArray: "6 8" }).addTo(layer);
        setRoute({ status: "offline" });
      });
    return () => controller.abort();
  }, [stops, ready]);

  const legs = route.status === "ok" ? route.legs : [];
  const totalDistance = legs.reduce((s, l) => s + l.distance, 0);
  const totalDuration = legs.reduce((s, l) => s + l.duration, 0);
  const returnLeg = legs[stops.length];

  return (
    <section
      aria-label="Routenkarte"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-[16px] font-bold">
          <MapPinned className="h-5 w-5 text-muted-foreground" />
          Route
        </h2>
        {route.status === "ok" && (
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Car className="h-4 w-4 text-muted-foreground" />
            {km(totalDistance)} · {mins(totalDuration)} Fahrt
          </span>
        )}
        {route.status === "loading" && (
          <span className="text-xs text-muted-foreground">Route wird berechnet …</span>
        )}
      </div>

      <div className="relative isolate">
        <div ref={containerRef} className="h-[420px] w-full bg-muted lg:h-[520px]" />
        {stops.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] mx-auto w-fit rounded-lg bg-card/95 px-4 py-2 text-sm font-semibold shadow">
            Noch keine Einsätze eingeplant
          </div>
        )}
      </div>

      {route.status === "offline" && (
        <p className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <TriangleAlert className="h-3.5 w-3.5 text-warning" />
          Routendienst nicht erreichbar – Orte sind mit Luftlinie verbunden.
        </p>
      )}

      {stops.length > 0 && (
        <ol className="divide-y divide-border border-t border-border text-sm">
          <li className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1f2f3d] text-xs text-white">
              ⌂
            </span>
            <span className="flex-1 font-semibold">{DEPOT.label}</span>
            <span className="text-xs text-muted-foreground">Start</span>
          </li>
          {stops.map((stop, index) => (
            <li key={stop.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {stop.client}{" "}
                  <span className="font-normal text-muted-foreground">· {stop.time}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {stop.address}
                  {stop.approx && " (Lage ungefähr)"}
                </p>
              </div>
              {legs[index] && (
                <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {km(legs[index].distance)}
                  <br />
                  {mins(legs[index].duration)}
                </span>
              )}
            </li>
          ))}
          <li className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1f2f3d] text-white">
              <Flag className="h-3 w-3" />
            </span>
            <span className="flex-1 font-semibold">Rückfahrt zum Betrieb</span>
            {returnLeg && (
              <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {km(returnLeg.distance)}
                <br />
                {mins(returnLeg.duration)}
              </span>
            )}
          </li>
        </ol>
      )}
    </section>
  );
}
