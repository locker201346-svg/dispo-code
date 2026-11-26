import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleMinus,
  CirclePlus,
  ClipboardList,
  Clock,
  Filter,
  LayoutGrid,
  MapPin,
  Navigation,
  PackageX,
  RotateCcw,
  Search,
  Sun,
  Truck,
  UserRound,
  Warehouse,
  Wrench,
} from "lucide-react";

import { INVENTORY, ORDERS, type Order } from "@/data/dispo-data";
import {
  demandFor,
  missingForOrder,
  shortagesFor,
  type Shortage,
} from "@/lib/dispo";
import { cn } from "@/lib/utils";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function DispoBoard() {
  const [plannedIds, setPlannedIds] = useState<string[]>([]);
  const [rejection, setRejection] = useState<{ order: Order; missing: Shortage[] } | null>(null);
  const [search, setSearch] = useState("");
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [employee, setEmployee] = useState("Mitarbeiter");
  const [activeNav, setActiveNav] = useState("Übersicht");

  const plannedOrders = useMemo(
    () => plannedIds.map((id) => ORDERS.find((order) => order.id === id)).filter((order): order is Order => Boolean(order)),
    [plannedIds],
  );
  const totalMinutes = plannedOrders.reduce((sum, order) => sum + order.minutes, 0);
  const demand = useMemo(() => demandFor(plannedOrders), [plannedOrders]);
  const shortages = useMemo(() => shortagesFor(plannedOrders), [plannedOrders]);
  const routeOrders = useMemo(
    () =>
      [...plannedOrders].sort((first, second) =>
        first.town.localeCompare(second.town, "de", { sensitivity: "base" }),
      ),
    [plannedOrders],
  );

  function planOrder(order: Order) {
    const missing = missingForOrder(order, plannedOrders);
    if (missing.length > 0) {
      setRejection({ order, missing });
      return;
    }
    setRejection(null);
    setPlannedIds((ids) => [...ids, order.id]);
  }

  function unplanOrder(id: string) {
    setRejection(null);
    setPlannedIds((ids) => ids.filter((plannedId) => plannedId !== id));
  }

  function resetAll() {
    setRejection(null);
    setPlannedIds([]);
  }

  const openOrders = ORDERS.filter((order) => !plannedIds.includes(order.id));
  const filteredOrders = openOrders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${order.id} ${order.title} ${order.client} ${order.town}`.toLowerCase().includes(query);
    const blocked = missingForOrder(order, plannedOrders).length > 0;
    return matchesSearch && (!showBlockedOnly || blocked);
  });

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-[#20272f] md:flex">
      <aside className="hidden w-[238px] shrink-0 flex-col bg-[#172532] px-3 py-5 text-white md:flex">
        <div className="flex items-center gap-3 px-3 pb-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e58b2a] text-[#172532]">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[16px] font-bold leading-none">ELEKTRO MEIER</div>
            <div className="mt-1 text-[10px] font-medium text-[#aebbc6]">Solar · Elektro · Service</div>
          </div>
        </div>
        <nav className="space-y-1">
          {[
            { label: "Übersicht", icon: LayoutGrid },
            { label: "Aufträge", icon: ClipboardList },
            { label: "Lager", icon: Warehouse },
            { label: "Mitarbeiter", icon: UserRound },
            { label: "Einsätze", icon: Truck },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                activeNav === label
                  ? "bg-[#294157] text-white"
                  : "text-[#b9c5cf] hover:bg-[#20384b] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-3 pb-1">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold">Elektro Meier · Aarau</p>
            <p className="mt-1 text-[11px] text-[#9eacb8]">Einsatzplanung aktiv</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="border-b border-[#dde2e7] bg-white">
          <div className="flex h-[72px] items-center px-5 sm:px-8">
            <div className="md:hidden">
              <div className="text-base font-bold text-[#172532]">ELEKTRO MEIER</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#87929c]">Betriebsplanung</div>
            </div>
            <nav className="ml-auto flex items-center gap-3">
              <button
                onClick={resetAll}
                className="hidden items-center gap-2 rounded-lg border border-[#dfe4e8] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#53616d] shadow-sm transition hover:bg-[#f7f8f9] sm:inline-flex"
              >
                <RotateCcw className="h-4 w-4" />
                Zurücksetzen
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1f3] text-sm font-bold text-[#53616d]">
                MH
              </div>
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#87929c]">
              Mittwoch, 25. November
            </p>
            <h1 className="text-[30px] font-bold tracking-[-0.035em] text-[#172532]">
              Tagesplanung
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center gap-2 rounded-lg border border-[#dde2e7] bg-white px-4 shadow-sm">
              <CalendarClock className="h-4 w-4 text-[#87929c]" />
              <span className="text-sm font-semibold">Heute</span>
            </div>
            <div className="flex h-11 items-center gap-2 rounded-lg bg-[#172532] px-4 text-sm text-white shadow-sm">
              <Clock className="h-4 w-4 text-[#dce2e7]" />
              <span className="font-bold">{formatMinutes(totalMinutes)}</span>
              <span className="text-[#bcc5cd]">geplant</span>
            </div>
          </div>
        </div>

        {rejection && (
          <div role="alert" className="mb-5 rounded-xl border border-[#efb7ad] bg-[#fff8f6] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fde3dc] text-[#bb452f]">
                <PackageX className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[#9d3827]">
                  Auftrag {rejection.order.id} kann nicht eingeplant werden
                </h2>
                <p className="mt-1 text-sm text-[#6f5a54]">
                  Für diesen Auftrag reicht der Lagerbestand nicht aus.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {rejection.missing.map((item) => (
                    <li key={item.sku} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#f1d9d2] bg-white px-3 py-2 text-sm">
                      <span className="font-mono text-xs font-semibold text-[#87929c]">{item.sku}</span>
                      <span className="font-medium text-[#35414b]">{item.label}</span>
                      <span className="ml-auto font-semibold text-[#bb452f]">{item.missing} Stück zu wenig</span>
                      <span className="text-[#87929c]">(benötigt {item.needed}, verfügbar {item.available})</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setRejection(null)} className="rounded-md px-2 py-1 text-sm text-[#87929c] hover:bg-[#fde3dc]" aria-label="Meldung schliessen">
                ✕
              </button>
            </div>
          </div>
        )}

        {shortages.length > 0 && (
          <div role="alert" className="mb-5 rounded-xl border border-[#efb7ad] bg-[#fff8f6] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#bb452f]" />
              <div>
                <h2 className="text-sm font-bold text-[#9d3827]">Achtung: Der Tagesplan übersteigt den Lagerbestand</h2>
                <ul className="mt-2 space-y-1 text-sm text-[#6f5a54]">
                  {shortages.map((shortage) => (
                    <li key={shortage.sku}>
                      {shortage.label} ({shortage.sku}): benötigt {shortage.needed}, auf Lager {shortage.available} –
                      <span className="font-semibold text-[#bb452f]"> {shortage.missing} zu wenig</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section aria-label="Offene Aufträge">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#87929c]" />
                <h2 className="text-[17px] font-bold text-[#26343f]">
                  Offene Aufträge
                  <span className="ml-2 text-sm font-medium text-[#87929c]">{openOrders.length}</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2aa]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Auftrag suchen"
                    className="h-10 w-[210px] rounded-lg border border-[#dde2e7] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9da7af] focus:border-[#aab5bd] focus:ring-2 focus:ring-[#e6eaed]"
                  />
                </label>
                <button
                  onClick={() => setShowBlockedOnly((value) => !value)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                    showBlockedOnly
                      ? "border-[#edc0b5] bg-[#fff5f2] text-[#b34732]"
                      : "border-[#dde2e7] bg-white text-[#65727d] hover:bg-[#f8f9fa]",
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Nur Engpässe</span>
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8dee3] bg-white p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-[#4f8061]" />
                <p className="mt-2 font-semibold text-[#26343f]">
                  {openOrders.length === 0 ? "Alle Aufträge sind eingeplant." : "Keine Aufträge gefunden."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredOrders.map((order) => {
                  const missing = missingForOrder(order, plannedOrders);
                  const blocked = missing.length > 0;
                  return (
                    <article key={order.id} className={cn(
                      "rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(23,37,50,0.04)] transition-shadow hover:shadow-[0_4px_14px_rgba(23,37,50,0.08)]",
                      blocked ? "border-[#edbdae]" : "border-[#dde2e7]",
                    )}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-[#edf1f3] px-2 py-1 font-mono text-[11px] font-bold text-[#53616d]">{order.id}</span>
                            <h3 className="text-[15px] font-bold text-[#26343f]">{order.title}</h3>
                          </div>
                          <p className="mt-1.5 text-sm text-[#7b8792]">
                            {order.client} · <MapPin className="mr-0.5 inline h-3.5 w-3.5" />
                            {order.street}, {order.town} · <Clock className="mr-0.5 inline h-3.5 w-3.5" />
                            {formatMinutes(order.minutes)}
                          </p>
                        </div>
                        <button
                          onClick={() => planOrder(order)}
                          className={cn(
                            "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors",
                            blocked
                              ? "border border-[#e8b8aa] bg-[#fff7f4] text-[#b34732]"
                              : "bg-[#172532] text-white hover:bg-[#263947]",
                          )}
                        >
                          <CirclePlus className="h-4 w-4" />
                          Einplanen
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {order.tasks.map((task) => (
                          <span key={task} className="inline-flex items-center gap-1 rounded-full bg-[#f0f3f4] px-2.5 py-1 text-xs font-medium text-[#65727d]">
                            <Wrench className="h-3 w-3" />
                            {task}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 border-t border-[#edf0f2] pt-3">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#98a2aa]">Benötigtes Material</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {order.items.map((item) => {
                            const isMissing = missing.some((shortage) => shortage.sku === item.sku);
                            return (
                              <li key={item.sku} className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-semibold",
                                isMissing ? "bg-[#fde9e4] text-[#b34732]" : "bg-[#edf1f3] text-[#65727d]",
                              )}>
                                {item.qty}× {item.label}
                              </li>
                            );
                          })}
                        </ul>
                        {blocked && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#b34732]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Nicht genügend Material auf Lager
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section aria-label="Tagesplan" className="overflow-hidden rounded-xl border border-[#dde2e7] bg-white">
              <div className="flex items-center justify-between border-b border-[#edf0f2] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-[#87929c]" />
                  <h2 className="text-[16px] font-bold text-[#26343f]">Tagesplan</h2>
                </div>
                <span className="rounded-full bg-[#edf1f3] px-2.5 py-1 text-xs font-bold text-[#65727d]">
                  {plannedOrders.length}/{ORDERS.length}
                </span>
              </div>
              <div className="p-3">
                {plannedOrders.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#dde2e7] p-5 text-center text-sm text-[#87929c]">
                    Noch keine Aufträge eingeplant
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {plannedOrders.map((order, index) => (
                      <li key={order.id} className="flex items-center gap-3 rounded-lg border border-[#e5e9ec] bg-[#fafbfb] px-3 py-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#172532] text-xs font-bold text-white">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#26343f]">{order.title}</p>
                          <p className="mt-0.5 text-xs text-[#87929c]">{order.id} · {order.town} · {formatMinutes(order.minutes)}</p>
                        </div>
                        <button
                          onClick={() => unplanOrder(order.id)}
                          className="shrink-0 rounded-md p-1.5 text-[#98a2aa] transition-colors hover:bg-[#fde9e4] hover:text-[#b34732]"
                          aria-label={`Auftrag ${order.id} aus dem Plan nehmen`}
                        >
                          <CircleMinus className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {plannedOrders.length > 0 && (
                <div className="border-t border-[#edf0f2] px-4 py-3 text-sm text-[#87929c]">
                  Gesamtdauer
                  <span className="float-right font-bold text-[#26343f]">{formatMinutes(totalMinutes)}</span>
                </div>
              )}
            </section>

            <section aria-label="Tagesroute" className="overflow-hidden rounded-xl border border-[#dde2e7] bg-white">
              <div className="border-b border-[#edf0f2] px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-[#87929c]" />
                    <h2 className="text-[16px] font-bold text-[#26343f]">Tagesroute</h2>
                  </div>
                  <span className="rounded-full bg-[#edf1f3] px-2.5 py-1 text-xs font-bold text-[#65727d]">
                    {routeOrders.length} Stops
                  </span>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#98a2aa]">
                    Mitarbeiter
                  </span>
                  <input
                    value={employee}
                    onChange={(event) => setEmployee(event.target.value)}
                    className="h-9 w-full rounded-lg border border-[#dde2e7] bg-[#fafbfb] px-3 text-sm font-semibold text-[#26343f] outline-none focus:border-[#aab5bd]"
                  />
                </label>
              </div>

              {routeOrders.length === 0 ? (
                <p className="p-5 text-center text-sm text-[#87929c]">
                  Aufträge einplanen, um die Route zu erstellen.
                </p>
              ) : (
                <ol className="p-3">
                  {routeOrders.map((order, index) => (
                    <li key={order.id} className="relative flex gap-3 pb-4 last:pb-1">
                      {index < routeOrders.length - 1 && (
                        <span className="absolute left-[13px] top-7 h-[calc(100%-18px)] w-px bg-[#dfe4e8]" />
                      )}
                      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#e58b2a] text-xs font-bold text-white shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 border-b border-[#edf0f2] pb-3 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[#26343f]">{order.title}</p>
                          <span className="shrink-0 text-xs font-semibold text-[#87929c]">
                            {formatMinutes(order.minutes)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#87929c]">
                          {order.street}, {order.town}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {routeOrders.length > 0 && (
                <div className="border-t border-[#edf0f2] px-4 py-3 text-sm text-[#87929c]">
                  Sortiert nach Ort
                  <span className="float-right font-bold text-[#26343f]">
                    {routeOrders.reduce((sum, order) => sum + order.minutes, 0) / 60} Std.
                  </span>
                </div>
              )}
            </section>

            <section aria-label="Materialbestand" className="overflow-hidden rounded-xl border border-[#dde2e7] bg-white">
              <div className="flex items-center justify-between border-b border-[#edf0f2] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-[#87929c]" />
                  <h2 className="text-[16px] font-bold text-[#26343f]">Materialbestand</h2>
                </div>
              </div>
              <ul className="divide-y divide-[#edf0f2] px-4">
                {INVENTORY.map((entry) => {
                  const used = demand.get(entry.sku) ?? 0;
                  const remaining = entry.stock - used;
                  const critical = remaining < 0;
                  const low = !critical && remaining === 0 && used > 0;
                  const pct = entry.stock > 0 ? Math.min((used / entry.stock) * 100, 100) : 0;
                  return (
                    <li key={entry.sku} className="py-3">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-semibold text-[#35414b]">
                          {entry.label} <span className="font-mono text-[10px] text-[#98a2aa]">{entry.sku}</span>
                        </span>
                        <span className={cn(
                          "font-bold",
                          critical ? "text-[#b34732]" : low ? "text-[#b36a20]" : "text-[#26343f]",
                        )}>
                          {critical ? `${Math.abs(remaining)} fehlend` : `${remaining} / ${entry.stock}`}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf0f2]">
                        <div
                          className={cn("h-full rounded-full transition-all", critical ? "bg-[#c85b44]" : low ? "bg-[#dda13f]" : "bg-[#6b9878]")}
                          style={{ width: `${critical ? 100 : pct}%` }}
                        />
                      </div>
                      {critical && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#b34732]">
                          <AlertTriangle className="h-3 w-3" />
                          Bedarf {used} übersteigt Bestand {entry.stock}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
        </div>
      </main>
    </div>
  );
}
