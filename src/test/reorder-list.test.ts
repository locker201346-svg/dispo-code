import { describe, expect, it } from "vitest";

import { ORDERS } from "@/data/dispo-data";
import { reorderListFor } from "@/lib/dispo";

describe("reorder list", () => {
  it("aggregates demand across open orders and adds a safety buffer", () => {
    const list = reorderListFor([], [ORDERS[3]!, ORDERS[8]!]);
    const accessPoints = list.find((item) => item.sku === "AP-01");

    expect(accessPoints).toMatchObject({
      stock: 2,
      openDemand: 3,
      projectedStock: -1,
      shortage: 1,
      minimumStock: 1,
      quantity: 2,
      orders: ["A-104", "A-109"],
      status: "fehlt",
    });
  });

  it("adds a low-stock item when remaining stock falls below its reorder point", () => {
    const order = {
      ...ORDERS[0]!,
      id: "LOW-STOCK",
      items: [{ sku: "NET-01", label: "Patchkabel", qty: 7 }],
    };

    expect(
      reorderListFor([order], [], [{ sku: "NET-01", label: "Patchkabel", stock: 8 }]),
    ).toMatchObject([
      {
        sku: "NET-01",
        projectedStock: 1,
        minimumStock: 2,
        shortage: 0,
        quantity: 1,
        status: "knapp",
      },
    ]);
  });

  it("includes unknown materials from orders as out-of-stock items", () => {
    const order = {
      ...ORDERS[0]!,
      id: "UNKNOWN-MATERIAL",
      items: [{ sku: "NEW-01", label: "Spezialkabel", qty: 2 }],
    };

    expect(reorderListFor([], [order], [])).toMatchObject([
      {
        sku: "NEW-01",
        stock: 0,
        openDemand: 2,
        projectedStock: -2,
        quantity: 3,
        status: "fehlt",
      },
    ]);
  });
});
