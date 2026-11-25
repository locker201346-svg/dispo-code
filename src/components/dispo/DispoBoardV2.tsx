/**
 * Dispo – Version 2
 *
 * Neu gegenüber Version 1 (DispoBoard.tsx bleibt unverändert erhalten):
 * - Kennzahlen-Leiste (eingeplant, Auslastung Arbeitstag, Engpässe, Lager)
 * - Zeitplan mit Uhrzeiten inkl. Fahrzeit, Reihenfolge per Pfeil änderbar
 * - «Automatisch einplanen»: plant alle Aufträge ein, für die Material reicht
 * - Filter Alle / Planbar / Engpässe
 * - Einkaufsliste: welches Material für blockierte Aufträge fehlt
 * - Einsätze mit Routenkarte (OpenStreetMap, Strecke über OSRM)
 * - Klickbares Menü: Übersicht, Aufträge (Tabelle), Lager, Mitarbeiter, Einsätze
 * - Hell/Dunkel-Modus
 * - Plan wird im Browser gespeichert und bleibt nach dem Neuladen erhalten
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleMinus,
  CirclePlus,
  ClipboardList,
  Clock,
  Gauge,
  History,
  LayoutGrid,
  MapPin,
  Moon,
  PackageX,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Sun,
  Truck,
  UserRound,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";

import { INVENTORY, ORDERS, type Order } from "@/data/dispo-data";
import { demandFor, missingForOrder, shortagesFor, type Shortage } from "@/lib/dispo";
import { cn } from "@/lib/utils";
import { ORDER_GEO } from "@/data/dispo-geo";
import { RouteMap, type MapStop } from "@/components/dispo/RouteMap";

const DAY_START = 7 * 60 + 30; // 07:30
const DAY_END = 16 * 60 + 30; // 16:30
const TRAVEL_MINUTES = 15; // Fahrzeit zwischen zwei Einsätzen
const STORAGE_KEY = "dispo-v2-plan";
const THEME_KEY = "dispo-v2-theme";

type Filter = "alle" | "planbar" | "engpass";
type View = "Übersicht" | "Aufträge" | "Lager" | "Mitarbeiter" | "Einsätze";

const NAV: { label: View; icon: typeof LayoutGrid }[] = [
  { label: "Übersicht", icon: LayoutGrid },
  { label: "Aufträge", icon: ClipboardList },
  { label: "Lager", icon: Warehouse },
  { label: "Mitarbeiter", icon: UserRound },
  { label: "Einsätze", icon: Truck },
];

const VIEW_TITLES: Record<View, string> = {
  Übersicht: "Tagesplanung",
  Aufträge: "Alle Aufträge",
  Lager: "Lager & Material",
  Mitarbeiter: "Mitarbeiter",
  Einsätze: "Einsätze heute",
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function clock(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Speichern nicht möglich (z. B. privates Fenster) – App funktioniert trotzdem */
  }
}

interface DispoBoardV2Props {
  /** Link zur alten Version (in der App "/", in der Standalone-Datei "dispo.html"). */
  v1Href?: string;
}

export function DispoBoardV2({ v1Href = "/" }: DispoBoardV2Props) {
  const [plannedIds, setPlannedIds] = useState<string[]>([]);
  const [rejection, setRejection] = useState<{ order: Order; missing: Shortage[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [view, setView] = useState<View>("Übersicht");
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Gespeicherten Plan und Farbmodus erst nach dem ersten Rendern laden (SSR-sicher).
  useEffect(() => {
    const saved = readStorage(STORAGE_KEY);
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          setPlannedIds(ids.filter((id) => ORDERS.some((order) => order.id === id)));
        }
      } catch {
        /* ungültige Daten ignorieren */
      }
    }
    setDark(readStorage(THEME_KEY) === "dark");
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeStorage(STORAGE_KEY, JSON.stringify(plannedIds));
  }, [plannedIds, loaded]);

  useEffect(() => {
    if (loaded) writeStorage(THEME_KEY, dark ? "dark" : "light");
  }, [dark, loaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const plannedOrders = useMemo(
    () =>
      plannedIds
        .map((id) => ORDERS.find((order) => order.id === id))
        .filter((order): order is Order => Boolean(order)),
    [plannedIds],
  );
  const demand = useMemo(() => demandFor(plannedOrders), [plannedOrders]);
  const shortages = useMemo(() => shortagesFor(plannedOrders), [plannedOrders]);

  // Zeitplan: Startzeit jedes Einsatzes inkl. Fahrzeit davor
  const schedule = useMemo(() => {
    let cursor = DAY_START;
    return plannedOrders.map((order, index) => {
      if (index > 0) cursor += TRAVEL_MINUTES;
      const start = cursor;
      cursor += order.minutes;
      return { order, start, end: cursor };
    });
  }, [plannedOrders]);
  // Stopps für die Karte (nur Aufträge mit Koordinaten)
  const mapStops = useMemo<MapStop[]>(
    () =>
      schedule.flatMap(({ order, start, end }) => {
        const geo = ORDER_GEO[order.id];
        if (!geo) return [];
        return [
          {
            id: order.id,
            title: order.title,
            client: order.client,
            address: `${order.street}, ${order.town}`,
            lat: geo.lat,
            lng: geo.lng,
            approx: geo.approx ?? false,
            time: `${clock(start)} – ${clock(end)}`,
          },
        ];
      }),
    [schedule],
  );
  const workMinutes = plannedOrders.reduce((sum, order) => sum + order.minutes, 0);
  const dayEnd = schedule.at(-1)?.end ?? DAY_START;
  const usedMinutes = dayEnd - DAY_START;
  const capacity = DAY_END - DAY_START;
  const overtime = dayEnd > DAY_END;
  const capacityPct = Math.min((usedMinutes / capacity) * 100, 100);

  const openOrders = ORDERS.filter((order) => !plannedIds.includes(order.id));
  const missingByOrder = useMemo(
    () => new Map(openOrders.map((order) => [order.id, missingForOrder(order, plannedOrders)])),
    [openOrders, plannedOrders],
  );
  const blockedCount = openOrders.filter((o) => (missingByOrder.get(o.id)?.length ?? 0) > 0).length;
  const plannableCount = openOrders.length - blockedCount;

  const filteredOrders = openOrders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${order.id} ${order.title} ${order.client} ${order.town}`.toLowerCase().includes(query);
    const blocked = (missingByOrder.get(order.id)?.length ?? 0) > 0;
    if (filter === "planbar" && blocked) return false;
    if (filter === "engpass" && !blocked) return false;
    return matchesSearch;
  });

  // Einkaufsliste: grösste Fehlmenge je Artikel über alle blockierten Aufträge
  const shoppingList = useMemo(() => {
    const list = new Map<string, { label: string; missing: number; orders: string[] }>();
    for (const order of openOrders) {
      for (const item of missingByOrder.get(order.id) ?? []) {
        const entry = list.get(item.sku) ?? { label: item.label, missing: 0, orders: [] };
        entry.missing = Math.max(entry.missing, item.missing);
        entry.orders.push(order.id);
        list.set(item.sku, entry);
      }
    }
    return [...list.entries()].map(([sku, entry]) => ({ sku, ...entry }));
  }, [openOrders, missingByOrder]);

  const totalStock = INVENTORY.reduce((sum, entry) => sum + entry.stock, 0);
  const totalUsed = INVENTORY.reduce(
    (sum, entry) => sum + Math.min(demand.get(entry.sku) ?? 0, entry.stock),
    0,
  );

  function planOrder(order: Order) {
    const missing = missingForOrder(order, plannedOrders);
    if (missing.length > 0) {
      setRejection({ order, missing });
      return;
    }
    setRejection(null);
    setPlannedIds((ids) => [...ids, order.id]);
    setToast(`${order.id} «${order.title}» eingeplant`);
  }

  function unplanOrder(id: string) {
    setRejection(null);
    setPlannedIds((ids) => ids.filter((plannedId) => plannedId !== id));
  }

  function moveOrder(index: number, direction: -1 | 1) {
    setPlannedIds((ids) => {
      const target = index + direction;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  }

  function autoPlan() {
    setRejection(null);
    const planned = [...plannedOrders];
    let added = 0;
    for (const order of ORDERS) {
      if (planned.some((p) => p.id === order.id)) continue;
      if (missingForOrder(order, planned).length === 0) {
        planned.push(order);
        added++;
      }
    }
    setPlannedIds(planned.map((order) => order.id));
    setToast(
      added > 0
        ? `${added} Auftrag${added === 1 ? "" : "e"} automatisch eingeplant`
        : "Kein weiterer Auftrag planbar – Material fehlt",
    );
  }

  function resetAll() {
    setRejection(null);
    setPlannedIds([]);
    setToast("Plan zurückgesetzt");
  }

  const kpis = [
    {
      label: "Eingeplant",
      value: `${plannedOrders.length}/${ORDERS.length}`,
      hint: `${plannableCount} weitere planbar`,
      icon: ClipboardList,
      tone: "neutral" as const,
    },
    {
      label: "Arbeitstag",
      value: formatMinutes(workMinutes),
      hint: overtime
        ? `Überzeit bis ${clock(dayEnd)}`
        : schedule.length > 0
          ? `fertig ca. ${clock(dayEnd)}`
          : `${clock(DAY_START)} – ${clock(DAY_END)}`,
      icon: Gauge,
      tone: overtime ? ("warn" as const) : ("neutral" as const),
    },
    {
      label: "Engpässe",
      value: String(blockedCount),
      hint: blockedCount === 1 ? "Auftrag blockiert" : "Aufträge blockiert",
      icon: PackageX,
      tone: blockedCount > 0 ? ("bad" as const) : ("good" as const),
    },
    {
      label: "Lager belegt",
      value: `${Math.round((totalUsed / Math.max(totalStock, 1)) * 100)} %`,
      hint: `${totalUsed} von ${totalStock} Teilen`,
      icon: Boxes,
      tone: "neutral" as const,
    },
  ];

  const scheduleCard = (
    <section
      aria-label="Tagesplan"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-[16px] font-bold">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          Zeitplan
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
          {plannedOrders.length}/{ORDERS.length}
        </span>
      </div>
      <div className="p-3">
        {schedule.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Noch keine Aufträge eingeplant.
            <br />
            Klicke auf «Einplanen» oder «Automatisch einplanen».
          </div>
        ) : (
          <ol className="relative">
            {schedule.map(({ order, start, end }, index) => {
              const late = end > DAY_END;
              return (
                <li key={order.id} className="relative flex gap-3 pb-1">
                  <div className="flex w-12 shrink-0 flex-col items-end pt-2.5 text-xs tabular-nums">
                    <span className="font-bold">{clock(start)}</span>
                    <span className="text-muted-foreground">{clock(end)}</span>
                  </div>
                  <div className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-3 h-3 w-3 rounded-full ring-4 ring-card",
                        late ? "bg-warning" : "bg-brand",
                      )}
                    />
                    {index < schedule.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="mb-2 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{order.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {order.id} · {order.town} · {formatMinutes(order.minutes)}
                        </p>
                        {late && (
                          <p className="mt-1 text-[11px] font-semibold text-warning">
                            nach Feierabend
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          onClick={() => moveOrder(index, -1)}
                          disabled={index === 0}
                          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-25"
                          aria-label={`${order.id} früher`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveOrder(index, 1)}
                          disabled={index === schedule.length - 1}
                          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-25"
                          aria-label={`${order.id} später`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => unplanOrder(order.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Auftrag ${order.id} aus dem Plan nehmen`}
                        >
                          <CircleMinus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {schedule.length > 0 && (
        <div className="space-y-1 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <div className="flex justify-between">
            Arbeitszeit{" "}
            <span className="font-bold text-foreground">{formatMinutes(workMinutes)}</span>
          </div>
          <div className="flex justify-between">
            Fahrzeit ({TRAVEL_MINUTES} min je Wechsel)
            <span className="font-bold text-foreground">
              {formatMinutes((schedule.length - 1) * TRAVEL_MINUTES)}
            </span>
          </div>
          <div className="flex justify-between">
            Fertig um
            <span className={cn("font-bold", overtime ? "text-warning" : "text-foreground")}>
              {clock(dayEnd)}
            </span>
          </div>
        </div>
      )}
    </section>
  );

  const shoppingCard = (
    <section
      aria-label="Einkaufsliste"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
        <ShoppingCart className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-[16px] font-bold">Nachbestellen</h2>
      </div>
      <ul className="divide-y divide-border px-4">
        {shoppingList.map((item) => (
          <li key={item.sku} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">
                {item.label}{" "}
                <span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span>
              </p>
              <p className="text-xs text-muted-foreground">für {item.orders.join(", ")}</p>
            </div>
            <span className="shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
              +{item.missing}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );

  const inventoryCard = (
    <section
      aria-label="Materialbestand"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
        <Boxes className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-[16px] font-bold">Materialbestand</h2>
      </div>
      <ul className="divide-y divide-border px-4">
        {INVENTORY.map((entry) => {
          const used = demand.get(entry.sku) ?? 0;
          const remaining = entry.stock - used;
          const critical = remaining < 0;
          const empty = !critical && remaining === 0 && used > 0;
          const pct = entry.stock > 0 ? Math.min((used / entry.stock) * 100, 100) : 0;
          return (
            <li key={entry.sku} className="py-3">
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold">
                  {entry.label}{" "}
                  <span className="font-mono text-[10px] text-muted-foreground">{entry.sku}</span>
                </span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    critical ? "text-destructive" : empty ? "text-warning" : "",
                  )}
                >
                  {critical
                    ? `${Math.abs(remaining)} fehlend`
                    : `${remaining} / ${entry.stock} frei`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    critical ? "bg-destructive" : empty ? "bg-warning" : "bg-success",
                  )}
                  style={{ width: `${critical ? 100 : pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const openDemand = demandFor(openOrders);

  // Status eines Auftrags für die Ansicht «Aufträge»
  function statusOf(order: Order) {
    const slot = schedule.find((entry) => entry.order.id === order.id);
    if (slot)
      return { kind: "geplant" as const, text: `${clock(slot.start)} – ${clock(slot.end)}` };
    if ((missingByOrder.get(order.id)?.length ?? 0) > 0)
      return { kind: "engpass" as const, text: "Material fehlt" };
    return { kind: "planbar" as const, text: "Planbar" };
  }

  return (
    <div className={cn(dark && "dark")}>
      <div className="min-h-screen bg-surface text-foreground md:flex">
        {/* Seitenleiste */}
        <aside className="hidden w-[238px] shrink-0 flex-col bg-[oklch(0.25_0.04_245)] px-3 py-5 text-white md:flex">
          <div className="flex items-center gap-3 px-3 pb-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_6px_18px_-6px_var(--brand)]">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[16px] font-bold leading-none">ELEKTRO MEIER</div>
              <div className="mt-1 text-[10px] font-medium text-white/60">
                Solar · Elektro · Service
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setView(label)}
                aria-current={view === label ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                  view === label
                    ? "bg-white/12 text-white"
                    : "text-white/60 hover:bg-white/6 hover:text-white",
                )}
              >
                <Icon className={cn("h-4 w-4", view === label && "text-brand")} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3 px-3 pb-1">
            <a
              href={v1Href}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <History className="h-3.5 w-3.5" />
              Zur alten Version 1
            </a>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold">Elektro Meier · Aarau</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Einsatzplanung aktiv · v2
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Kopfzeile */}
          <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex h-[68px] items-center gap-3 px-5 sm:px-8">
              <div className="md:hidden">
                <div className="text-base font-bold">ELEKTRO MEIER</div>
                <a
                  href={v1Href}
                  className="text-[11px] font-semibold text-muted-foreground underline"
                >
                  Zur Version 1
                </a>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={autoPlan}
                  disabled={plannableCount === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-bold text-brand-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Automatisch einplanen</span>
                </button>
                <button
                  onClick={resetAll}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                  aria-label="Plan zurücksetzen"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden lg:inline">Zurücksetzen</span>
                </button>
                <button
                  onClick={() => setDark((value) => !value)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted"
                  aria-label={dark ? "Hellen Modus aktivieren" : "Dunklen Modus aktivieren"}
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  MH
                </div>
              </div>
            </div>
          </header>

          {/* Menü für schmale Bildschirme */}
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 md:hidden">
            {NAV.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setView(label)}
                aria-current={view === label ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  view === label ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Mittwoch, 25. November
                </p>
                <h1 className="text-[30px] font-bold tracking-[-0.035em]">{VIEW_TITLES[view]}</h1>
              </div>
              <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-bold text-foreground">
                Version 2
              </span>
            </div>

            {/* Kennzahlen */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        tone === "bad" && "bg-destructive/12 text-destructive",
                        tone === "warn" && "bg-warning/18 text-warning",
                        tone === "good" && "bg-success/12 text-success",
                        tone === "neutral" && "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
                  <div
                    className={cn(
                      "mt-0.5 text-xs",
                      tone === "bad"
                        ? "text-destructive"
                        : tone === "warn"
                          ? "text-warning"
                          : "text-muted-foreground",
                    )}
                  >
                    {hint}
                  </div>
                  {label === "Arbeitstag" && (
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          overtime ? "bg-warning" : "bg-brand",
                        )}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {rejection && (
              <div
                role="alert"
                className="mb-5 animate-in fade-in slide-in-from-top-2 rounded-xl border border-destructive/30 bg-destructive/6 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-destructive">
                    <PackageX className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-destructive">
                      Auftrag {rejection.order.id} kann nicht eingeplant werden
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Für diesen Auftrag reicht der Lagerbestand nicht aus.
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {rejection.missing.map((item) => (
                        <li
                          key={item.sku}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-destructive/20 bg-card px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {item.sku}
                          </span>
                          <span className="font-medium">{item.label}</span>
                          <span className="ml-auto font-semibold text-destructive">
                            {item.missing} Stück zu wenig
                          </span>
                          <span className="text-muted-foreground">
                            (benötigt {item.needed}, verfügbar {item.available})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => setRejection(null)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10"
                    aria-label="Meldung schliessen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {shortages.length > 0 && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-destructive/30 bg-destructive/6 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <h2 className="text-sm font-bold text-destructive">
                      Achtung: Der Tagesplan übersteigt den Lagerbestand
                    </h2>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {shortages.map((shortage) => (
                        <li key={shortage.sku}>
                          {shortage.label} ({shortage.sku}): benötigt {shortage.needed}, auf Lager{" "}
                          {shortage.available} –
                          <span className="font-semibold text-destructive">
                            {" "}
                            {shortage.missing} zu wenig
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {view === "Übersicht" && (
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                {/* Offene Aufträge */}
                <section aria-label="Offene Aufträge">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-[17px] font-bold">
                      <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      Offene Aufträge
                      <span className="text-sm font-medium text-muted-foreground">
                        {openOrders.length}
                      </span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative block">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Auftrag suchen"
                          className="h-10 w-[190px] rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
                        />
                      </label>
                      <div
                        className="flex h-10 rounded-lg border border-border bg-card p-1"
                        role="tablist"
                      >
                        {(
                          [
                            ["alle", "Alle", openOrders.length],
                            ["planbar", "Planbar", plannableCount],
                            ["engpass", "Engpässe", blockedCount],
                          ] as const
                        ).map(([key, label, count]) => (
                          <button
                            key={key}
                            role="tab"
                            aria-selected={filter === key}
                            onClick={() => setFilter(key)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition",
                              filter === key
                                ? key === "engpass"
                                  ? "bg-destructive/12 text-destructive"
                                  : "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {label}
                            <span className="tabular-nums opacity-70">{count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                      <CheckCircle2 className="mx-auto h-9 w-9 text-success" />
                      <p className="mt-2 font-semibold">
                        {openOrders.length === 0
                          ? "Alle Aufträge sind eingeplant."
                          : "Keine Aufträge gefunden."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 2xl:grid-cols-2">
                      {filteredOrders.map((order) => {
                        const missing = missingByOrder.get(order.id) ?? [];
                        const blocked = missing.length > 0;
                        return (
                          <article
                            key={order.id}
                            className={cn(
                              "group relative overflow-hidden rounded-xl border bg-card p-4 pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]",
                              blocked ? "border-destructive/30" : "border-border",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute inset-y-0 left-0 w-1",
                                blocked ? "bg-destructive" : "bg-success",
                              )}
                              aria-hidden
                            />
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                                    {order.id}
                                  </span>
                                  <h3 className="text-[15px] font-bold">{order.title}</h3>
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                                  <span>{order.client}</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {order.town}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatMinutes(order.minutes)}
                                  </span>
                                </p>
                              </div>
                              <button
                                onClick={() => planOrder(order)}
                                className={cn(
                                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition",
                                  blocked
                                    ? "border border-destructive/35 bg-destructive/6 text-destructive"
                                    : "bg-primary text-primary-foreground hover:opacity-90",
                                )}
                              >
                                <CirclePlus className="h-4 w-4" />
                                Einplanen
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {order.tasks.map((task) => (
                                <span
                                  key={task}
                                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                >
                                  <Wrench className="h-3 w-3" />
                                  {task}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 border-t border-border pt-3">
                              <ul className="flex flex-wrap gap-1.5">
                                {order.items.map((item) => {
                                  const isMissing = missing.some(
                                    (shortage) => shortage.sku === item.sku,
                                  );
                                  return (
                                    <li
                                      key={item.sku}
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold",
                                        isMissing
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-success/10 text-success",
                                      )}
                                    >
                                      {isMissing ? (
                                        <AlertTriangle className="h-3 w-3" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3" />
                                      )}
                                      {item.qty}× {item.label}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <aside className="space-y-6">
                  {scheduleCard}
                  {shoppingList.length > 0 && shoppingCard}
                  {inventoryCard}
                </aside>
              </div>
            )}

            {view === "Aufträge" && (
              <section
                aria-label="Alle Aufträge"
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Auftrag</th>
                        <th className="px-4 py-3">Kunde / Ort</th>
                        <th className="px-4 py-3">Dauer</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ORDERS.map((order) => {
                        const status = statusOf(order);
                        return (
                          <tr key={order.id} className="align-top transition hover:bg-muted/40">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-muted-foreground">
                                {order.id}
                              </span>
                              <p className="font-semibold">{order.title}</p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {order.client}
                              <br />
                              {order.street}, {order.town}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatMinutes(order.minutes)}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {order.items.map((item) => `${item.qty}× ${item.label}`).join(", ")}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
                                  status.kind === "geplant" && "bg-brand/15 text-foreground",
                                  status.kind === "planbar" && "bg-success/12 text-success",
                                  status.kind === "engpass" && "bg-destructive/10 text-destructive",
                                )}
                              >
                                {status.text}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {status.kind === "geplant" ? (
                                <button
                                  onClick={() => unplanOrder(order.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <CircleMinus className="h-3.5 w-3.5" />
                                  Entfernen
                                </button>
                              ) : (
                                <button
                                  onClick={() => planOrder(order)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                                    status.kind === "engpass"
                                      ? "border border-destructive/35 bg-destructive/6 text-destructive"
                                      : "bg-primary text-primary-foreground hover:opacity-90",
                                  )}
                                >
                                  <CirclePlus className="h-3.5 w-3.5" />
                                  Einplanen
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {view === "Lager" && (
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                <section
                  aria-label="Lagerübersicht"
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Artikel</th>
                          <th className="px-4 py-3 text-right">Bestand</th>
                          <th className="px-4 py-3 text-right">Verplant</th>
                          <th className="px-4 py-3 text-right">Frei</th>
                          <th className="px-4 py-3 text-right">Bedarf offene Aufträge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {INVENTORY.map((entry) => {
                          const used = demand.get(entry.sku) ?? 0;
                          const free = entry.stock - used;
                          const openNeed = openDemand.get(entry.sku) ?? 0;
                          return (
                            <tr key={entry.sku} className="transition hover:bg-muted/40">
                              <td className="px-4 py-3">
                                <p className="font-semibold">{entry.label}</p>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {entry.sku}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">{entry.stock}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{used}</td>
                              <td
                                className={cn(
                                  "px-4 py-3 text-right font-bold tabular-nums",
                                  free < 0
                                    ? "text-destructive"
                                    : free === 0
                                      ? "text-warning"
                                      : "text-success",
                                )}
                              >
                                {free}
                              </td>
                              <td
                                className={cn(
                                  "px-4 py-3 text-right tabular-nums",
                                  openNeed > Math.max(free, 0) && "font-bold text-destructive",
                                )}
                              >
                                {openNeed}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
                <div className="space-y-6">
                  {shoppingList.length > 0 ? (
                    shoppingCard
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                      <p className="mt-2 font-semibold">
                        Für alle offenen Aufträge ist genug Material da.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === "Einsätze" && (
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                <RouteMap stops={mapStops} />
                {scheduleCard}
              </div>
            )}

            {view === "Mitarbeiter" && (
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-lg font-bold">Noch keine Mitarbeiter erfasst</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Sobald Mitarbeiterdaten vorhanden sind, können Einsätze hier Personen zugeteilt
                  werden.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Kurze Bestätigung unten rechts */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex animate-in fade-in slide-in-from-bottom-2 items-center gap-2 rounded-lg bg-[oklch(0.25_0.04_245)] px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </div>
  );
}
