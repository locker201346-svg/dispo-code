import { INVENTORY, ORDERS, type Order } from "@/data/dispo-data";

export interface Shortage {
  sku: string;
  label: string;
  needed: number;
  available: number;
  missing: number;
}

export function stockFor(sku: string): number {
  return INVENTORY.find((entry) => entry.sku === sku)?.stock ?? 0;
}

/** Aggregierter Materialbedarf einer Liste von Aufträgen. */
export function demandFor(orders: Order[]): Map<string, number> {
  const demand = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      demand.set(item.sku, (demand.get(item.sku) ?? 0) + item.qty);
    }
  }
  return demand;
}

/** Fehlmengen: Bedarf grösser als Lagerbestand. */
export function shortagesFor(orders: Order[]): Shortage[] {
  const demand = demandFor(orders);
  const shortages: Shortage[] = [];
  for (const [sku, needed] of demand) {
    const available = stockFor(sku);
    if (needed > available) {
      const label =
        orders.flatMap((o) => o.items).find((i) => i.sku === sku)?.label ??
        INVENTORY.find((e) => e.sku === sku)?.label ??
        sku;
      shortages.push({ sku, label, needed, available, missing: needed - available });
    }
  }
  return shortages;
}

/**
 * Prüft, ob ein Auftrag zusätzlich zu den bereits eingeplanten Aufträgen
 * mit dem Restbestand auskommt. Gibt die fehlenden Positionen zurück.
 */
export function missingForOrder(order: Order, planned: Order[]): Shortage[] {
  const used = demandFor(planned);
  const missing: Shortage[] = [];
  for (const item of order.items) {
    const remaining = stockFor(item.sku) - (used.get(item.sku) ?? 0);
    if (item.qty > remaining) {
      missing.push({
        sku: item.sku,
        label: item.label,
        needed: item.qty,
        available: Math.max(remaining, 0),
        missing: item.qty - Math.max(remaining, 0),
      });
    }
  }
  return missing;
}

export function orderById(id: string): Order | undefined {
  return ORDERS.find((order) => order.id === id);
}
